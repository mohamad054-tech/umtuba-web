/**
 * Idempotent Learning platform UI catalog ingestion.
 * Does not ingest course content, video, audio, or subtitles.
 */

import { LEARNING_MESSAGE_CATALOGS } from "../../i18n/messages/learning/catalogs";
import { learningEnMessages } from "../../i18n/messages/learning/en";
import type { LearningTranslationKey } from "../../i18n/messages/learning/types";
import { createTranslationIntelligenceService } from "../intelligence/service";
import { createProvenance, createUsageRights } from "../intelligence/provenance";
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
import { classifyImportedValueStatus } from "./ingestAppShellCatalog";
import {
  LEARNING_AREA_NAMESPACES,
  isLearningCatalogKey,
  learningNamespaceOfKey,
  stableLearningKeyId,
  stableLearningNamespaceId,
  stableLearningValueId,
} from "./learningInventory";
import { mergeLearningTerminology } from "./learningTerminology";

export type LearningIngestionReport = {
  ingestedKeys: string[];
  keyCount: number;
  valueCount: number;
  createdKeys: number;
  updatedKeys: number;
  unchangedKeys: number;
  staleSourceKeys: string[];
  statusCounts: Record<
    StudioLanguageCode,
    Partial<Record<TranslationValueStatus, number>>
  >;
  memorySeeded: number;
  memoryReused: number;
  intelligenceRecorded: number;
  idempotent: boolean;
};

function emptyStatusCounts() {
  const out = {} as LearningIngestionReport["statusCounts"];
  for (const lang of listStudioLanguages()) out[lang.code] = {};
  return out;
}

function bump(
  counts: LearningIngestionReport["statusCounts"],
  language: StudioLanguageCode,
  status: TranslationValueStatus
) {
  const row = counts[language] ?? (counts[language] = {});
  row[status] = (row[status] ?? 0) + 1;
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
    const next = [...memory];
    next[idx] = {
      ...next[idx]!,
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
        id: `tm_learning_${fp.slice(0, 12)}_${input.language}`,
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

export function ingestLearningCatalog(
  existing: PersistedStudioState | null = null,
  options: {
    now?: string;
    actorId?: string;
    recordIntelligence?: boolean;
    ephemeralIntelligence?: boolean;
  } = {}
): { state: PersistedStudioState; report: LearningIngestionReport } {
  const now = options.now ?? new Date().toISOString();
  const actorId = options.actorId ?? "system:learning_ingestion";
  const recordIntelligence = options.recordIntelligence !== false;

  const base: PersistedStudioState = existing ?? {
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

  const state: PersistedStudioState = {
    ...base,
    languages: listStudioLanguages(),
    terminology: mergeLearningTerminology(
      base.terminology.length > 0 ? base.terminology : seedUmtubaTerminology()
    ),
  };

  const languages = listStudioLanguages();
  const catalogKeys = Object.keys(
    learningEnMessages
  ) as LearningTranslationKey[];

  const namespacesByName = new Map(
    state.namespaces.map((n) => [n.name, n] as const)
  );
  const retainedKeys = state.keys.filter((k) => !isLearningCatalogKey(k.key));
  const retainedKeyIds = new Set(retainedKeys.map((k) => k.id));
  const retainedValues = state.values.filter((v) =>
    retainedKeyIds.has(v.keyId)
  );

  const keysByCatalogKey = new Map(
    state.keys
      .filter((k) => isLearningCatalogKey(k.key))
      .map((k) => [k.key, k] as const)
  );
  const valuesById = new Map(retainedValues.map((v) => [v.id, v] as const));
  for (const key of state.keys) {
    if (!isLearningCatalogKey(key.key)) continue;
    for (const lang of languages) {
      const stableId = stableLearningValueId(key.key, lang.code);
      const previous =
        state.values.find(
          (v) =>
            v.id === stableId ||
            (v.keyId === key.id && v.language === lang.code)
        ) ?? null;
      if (previous) valuesById.set(stableId, { ...previous, id: stableId });
    }
  }

  for (const ns of LEARNING_AREA_NAMESPACES) {
    if (!namespacesByName.has(ns)) {
      const created: StudioNamespace = {
        id: stableLearningNamespaceId(ns),
        name: ns,
        description: `Learning platform UI namespace for ${ns}.*`,
      };
      namespacesByName.set(ns, created);
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
  let intelligenceRecorded = 0;
  const auditLog: AuditLogEntry[] = [...state.auditLog];

  const intel =
    recordIntelligence && options.ephemeralIntelligence !== false
      ? createTranslationIntelligenceService({
          ephemeral: options.ephemeralIntelligence ?? true,
        })
      : recordIntelligence
        ? createTranslationIntelligenceService({ ephemeral: false })
        : null;

  for (const key of catalogKeys) {
    const ns = learningNamespaceOfKey(key);
    const namespaceId = stableLearningNamespaceId(ns);
    const keyId = stableLearningKeyId(key);
    const sourceText = learningEnMessages[key];
    const prev = keysByCatalogKey.get(key);
    let sourceChanged = false;

    if (!prev) {
      keysByCatalogKey.set(key, {
        id: keyId,
        namespaceId,
        key,
        sourceText,
        description: `Learning platform UI key ${key}`,
      });
      createdKeys += 1;
    } else {
      sourceChanged = prev.sourceText.trim() !== sourceText.trim();
      keysByCatalogKey.set(key, {
        ...prev,
        id: keyId,
        namespaceId,
        key,
        sourceText,
        description: prev.description ?? `Learning platform UI key ${key}`,
      });
      if (sourceChanged) {
        staleSourceKeys.push(key);
        updatedKeys += 1;
      } else unchangedKeys += 1;
    }

    for (const lang of languages) {
      const valueId = stableLearningValueId(key, lang.code);
      const catalogValue = LEARNING_MESSAGE_CATALOGS[lang.code][key] ?? "";
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

      if (status === "approved" && lang.code === "ar" && catalogValue.trim()) {
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

      if (intel && status === "approved" && catalogValue.trim()) {
        const recorded = intel.recordApprovedTranslation({
          approvedValueId: valueId,
          approvedVersion: nextValue.version,
          sourceText,
          approvedTargetText: catalogValue,
          sourceLocale: "en",
          targetLocale: lang.code,
          namespaceId,
          domain: "learning",
          contentType: "ui_text",
          styleProfileId: "learning_educational",
          terminologyRefs: [],
          provenance: createProvenance({
            type: "human_authored",
            originalSourceOwnership: "umtuba_internal",
          }),
          usageRights: createUsageRights({
            status: "owned_internal",
            permissionReuseInternally: true,
            permissionModelCustomization: true,
          }),
          trustLevel: "trusted_approved",
          sensitivity: "internal",
          now,
        });
        if (recorded) intelligenceRecorded += 1;
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
    id: `audit_learning_ingest_${now}`,
    entityType: "translation_value",
    entityId: "learning_catalog",
    action: "ingest_learning_catalog",
    actorId,
    detail: {
      keyCount: catalogKeys.length,
      createdKeys,
      updatedKeys,
      staleSourceKeys,
      memorySeeded,
      intelligenceRecorded,
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
    auditLog,
  };

  return {
    state: nextState,
    report: {
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
      intelligenceRecorded,
      idempotent: createdKeys === 0 && staleSourceKeys.length === 0,
    },
  };
}
