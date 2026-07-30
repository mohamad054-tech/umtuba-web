/**
 * Idempotent App Shell catalog ingestion into Translation Studio state.
 */

import { MESSAGE_CATALOGS } from "../../i18n/messages/catalogs";
import { enMessages } from "../../i18n/messages/en";
import type { TranslationKey } from "../../i18n/messages/types";
import { listStudioLanguages } from "../languages";
import { sourceFingerprint } from "../normalize";
import { seedUmtubaTerminology } from "../terminology";
import type {
  AuditLogEntry,
  PersistedStudioState,
  StudioLanguageCode,
  StudioNamespace,
  StudioTranslationKey,
  StudioTranslationValue,
  TranslationMemoryEntry,
  TranslationValueStatus,
} from "../types";
import {
  APP_SHELL_NAMESPACES,
  isAppShellCatalogKey,
  namespaceOfKey,
  stableAppShellKeyId,
  stableAppShellNamespaceId,
  stableAppShellValueId,
} from "./appShellInventory";

export type IngestStatusCounts = Record<
  StudioLanguageCode,
  Partial<Record<TranslationValueStatus, number>>
>;

export type AppShellIngestionReport = {
  ingestedKeys: string[];
  keyCount: number;
  valueCount: number;
  createdKeys: number;
  updatedKeys: number;
  unchangedKeys: number;
  staleSourceKeys: string[];
  statusCounts: IngestStatusCounts;
  memorySeeded: number;
  memoryReused: number;
  idempotent: boolean;
};

export type IngestAppShellOptions = {
  now?: string;
  actorId?: string;
};

function emptyStatusCounts(): IngestStatusCounts {
  const out = {} as IngestStatusCounts;
  for (const lang of listStudioLanguages()) {
    out[lang.code] = {};
  }
  return out;
}

function bump(
  counts: IngestStatusCounts,
  language: StudioLanguageCode,
  status: TranslationValueStatus
): void {
  const row = counts[language] ?? (counts[language] = {});
  row[status] = (row[status] ?? 0) + 1;
}

/**
 * Classify imported catalog values.
 * - EN: approved source
 * - AR: approved when non-empty and not English leakage; else needs_review/missing
 * - FR/ES/DE/PT: never auto-approved (fallback EN stays needs_review)
 */
export function classifyImportedValueStatus(input: {
  language: StudioLanguageCode;
  sourceText: string;
  catalogValue: string;
}): TranslationValueStatus {
  const raw = input.catalogValue.trim();
  const source = input.sourceText.trim();
  if (!raw) return "missing";
  if (input.language === "en") return "approved";
  if (input.language === "ar") {
    if (raw === source) return "needs_review";
    return "approved";
  }
  // Non-source locales: visible but not falsely approved
  return "needs_review";
}

function listAppShellKeys(): TranslationKey[] {
  return (Object.keys(enMessages) as TranslationKey[]).filter((key) =>
    isAppShellCatalogKey(key)
  );
}

function ensureBaseState(
  existing: PersistedStudioState | null,
  now: string
): PersistedStudioState {
  if (existing) {
    return {
      ...existing,
      languages: listStudioLanguages(),
      terminology:
        existing.terminology.length > 0
          ? existing.terminology
          : seedUmtubaTerminology(),
    };
  }
  return {
    schemaVersion: 1,
    updatedAt: now,
    languages: listStudioLanguages(),
    namespaces: [],
    keys: [],
    values: [],
    memory: [],
    terminology: seedUmtubaTerminology(),
    suggestions: [],
    versions: [],
    auditLog: [],
  };
}

function upsertMemory(
  memory: TranslationMemoryEntry[],
  input: {
    sourceText: string;
    language: StudioLanguageCode;
    translatedText: string;
    namespaceId: string;
    now: string;
    actorId: string;
  }
): { memory: TranslationMemoryEntry[]; seeded: boolean; reused: boolean } {
  const fp = sourceFingerprint(input.sourceText);
  const idx = memory.findIndex(
    (m) => m.sourceFingerprint === fp && m.language === input.language
  );
  if (idx >= 0) {
    const prev = memory[idx]!;
    const next = [...memory];
    next[idx] = {
      ...prev,
      sourceText: input.sourceText,
      translatedText: input.translatedText,
      namespaceId: input.namespaceId,
      status: "approved",
      createdAt: input.now,
      createdBy: input.actorId,
    };
    return { memory: next, seeded: false, reused: true };
  }
  return {
    memory: [
      ...memory,
      {
        id: `tm_appshell_${fp.slice(0, 12)}_${input.language}`,
        sourceFingerprint: fp,
        sourceText: input.sourceText,
        language: input.language,
        translatedText: input.translatedText,
        status: "approved",
        namespaceId: input.namespaceId,
        createdAt: input.now,
        createdBy: input.actorId,
      },
    ],
    seeded: true,
    reused: false,
  };
}

/**
 * Ingest App Shell catalogs into studio state. Safe to re-run (idempotent).
 */
export function ingestAppShellCatalog(
  existing: PersistedStudioState | null = null,
  options: IngestAppShellOptions = {}
): { state: PersistedStudioState; report: AppShellIngestionReport } {
  const now = options.now ?? new Date().toISOString();
  const actorId = options.actorId ?? "system:app_shell_ingestion";
  const state = ensureBaseState(existing, now);
  const languages = listStudioLanguages();
  const catalogKeys = listAppShellKeys();

  const namespacesByName = new Map(
    state.namespaces.map((n) => [n.name, n] as const)
  );

  // Keep non–App Shell keys/values; App Shell rows are rebuilt with stable IDs.
  const retainedKeys = state.keys.filter((k) => !isAppShellCatalogKey(k.key));
  const retainedKeyIds = new Set(retainedKeys.map((k) => k.id));
  const retainedValues = state.values.filter((v) =>
    retainedKeyIds.has(v.keyId)
  );

  const keysByCatalogKey = new Map(
    state.keys
      .filter((k) => isAppShellCatalogKey(k.key))
      .map((k) => [k.key, k] as const)
  );
  const valuesById = new Map(
    retainedValues.map((v) => [v.id, v] as const)
  );
  // Index previous App Shell values by stable id for merge/versioning
  for (const key of state.keys) {
    if (!isAppShellCatalogKey(key.key)) continue;
    for (const lang of languages) {
      const stableId = stableAppShellValueId(key.key, lang.code);
      const previous =
        state.values.find(
          (v) =>
            v.id === stableId ||
            (v.keyId === key.id && v.language === lang.code)
        ) ?? null;
      if (previous) valuesById.set(stableId, { ...previous, id: stableId });
    }
  }

  let createdKeys = 0;
  let updatedKeys = 0;
  let unchangedKeys = 0;
  const staleSourceKeys: string[] = [];
  const statusCounts = emptyStatusCounts();
  let memorySeeded = 0;
  let memoryReused = 0;
  let memory = [...state.memory];
  const auditLog: AuditLogEntry[] = [...state.auditLog];
  const versions = [...state.versions];

  for (const ns of APP_SHELL_NAMESPACES) {
    if (!namespacesByName.has(ns)) {
      const created: StudioNamespace = {
        id: stableAppShellNamespaceId(ns),
        name: ns,
        description: `App Shell namespace for ${ns}.* keys`,
      };
      namespacesByName.set(ns, created);
    }
  }

  for (const key of catalogKeys) {
    const ns = namespaceOfKey(key);
    const namespaceId = stableAppShellNamespaceId(ns);
    const keyId = stableAppShellKeyId(key);
    const sourceText = enMessages[key];
    const prev = keysByCatalogKey.get(key);
    let studioKey: StudioTranslationKey;
    let sourceChanged = false;

    if (!prev) {
      studioKey = {
        id: keyId,
        namespaceId,
        key,
        sourceText,
        description: `App Shell catalog key ${key}`,
      };
      keysByCatalogKey.set(key, studioKey);
      createdKeys += 1;
    } else {
      sourceChanged = prev.sourceText.trim() !== sourceText.trim();
      studioKey = {
        ...prev,
        id: keyId,
        namespaceId,
        key,
        sourceText,
        description: prev.description ?? `App Shell catalog key ${key}`,
      };
      keysByCatalogKey.set(key, studioKey);
      if (sourceChanged) {
        staleSourceKeys.push(key);
        updatedKeys += 1;
      } else {
        unchangedKeys += 1;
      }
    }

    for (const lang of languages) {
      const valueId = stableAppShellValueId(key, lang.code);
      const catalogValue = MESSAGE_CATALOGS[lang.code][key] ?? "";
      let status = classifyImportedValueStatus({
        language: lang.code,
        sourceText,
        catalogValue,
      });
      if (sourceChanged && lang.code !== "en" && status !== "missing") {
        status = "needs_review";
      }

      const previous = valuesById.get(valueId);
      const nextValue: StudioTranslationValue = {
        id: valueId,
        keyId,
        language: lang.code,
        value: catalogValue,
        status,
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
        createdBy: previous?.createdBy ?? actorId,
        updatedBy: actorId,
        approvedBy: status === "approved" ? actorId : null,
        suggestionId: previous?.suggestionId ?? null,
        version: previous
          ? previous.value !== catalogValue ||
            previous.status !== status ||
            sourceChanged
            ? previous.version + 1
            : previous.version
          : 1,
      };
      valuesById.set(valueId, nextValue);
      bump(statusCounts, lang.code, status);

      if (
        status === "approved" &&
        lang.code === "ar" &&
        catalogValue.trim()
      ) {
        const mem = upsertMemory(memory, {
          sourceText,
          language: "ar",
          translatedText: catalogValue,
          namespaceId,
          now,
          actorId,
        });
        memory = mem.memory;
        if (mem.seeded) memorySeeded += 1;
        if (mem.reused) memoryReused += 1;
      }
    }
  }

  const keys = [
    ...retainedKeys,
    ...keysByCatalogKey.values(),
  ].sort((a, b) => a.key.localeCompare(b.key));
  const values = [...valuesById.values()];
  const namespaces = [...namespacesByName.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  auditLog.unshift({
    id: `audit_appshell_ingest_${now}`,
    entityType: "translation_value",
    entityId: "app_shell_catalog",
    action: "ingest_app_shell_catalog",
    actorId,
    detail: {
      keyCount: catalogKeys.length,
      createdKeys,
      updatedKeys,
      staleSourceKeys,
      memorySeeded,
      memoryReused,
    },
    createdAt: now,
  });

  const nextState: PersistedStudioState = {
    ...state,
    updatedAt: now,
    namespaces,
    keys,
    values,
    memory,
    versions,
    auditLog,
  };

  const report: AppShellIngestionReport = {
    ingestedKeys: catalogKeys.slice().sort(),
    keyCount: catalogKeys.length,
    valueCount: catalogKeys.length * languages.length,
    createdKeys,
    updatedKeys,
    unchangedKeys,
    staleSourceKeys,
    statusCounts,
    memorySeeded,
    memoryReused,
    idempotent: createdKeys === 0 && staleSourceKeys.length === 0,
  };

  return { state: nextState, report };
}
