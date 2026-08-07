/**
 * Map translation_studio_read_snapshot → PersistedStudioState.
 *
 * - Runtime ids = remote stable_id (not diagnostic UUID `id` columns).
 * - Languages keyed by code.
 * - Smoke / stale extras are preserved faithfully (no filtering here).
 * - UUID-only entity actor columns: UUID → string, null → null (never invent system:seed).
 * - Audit actors reconstructed from actor_kind / actor_ref / actorId.
 */

import type {
  AuditLogEntry,
  PersistedStudioState,
  StudioLanguage,
  StudioLanguageCode,
  StudioNamespace,
  StudioTranslationKey,
  StudioTranslationValue,
  TerminologyEntry,
  TerminologyStatus,
  TranslationMemoryEntry,
  TranslationSuggestion,
  TranslationValueStatus,
  TranslationVersionRecord,
} from "../types";
import type { TranslationStudioReadSnapshotV1 } from "./readRpcContract";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MISSING_TIMESTAMP = "1970-01-01T00:00:00.000Z";

/**
 * Quality is not returned by read RPC V1. Provide a deterministic placeholder
 * so PersistedStudioState remains well-typed. Dual_read must not treat this as
 * authoritative AI metadata.
 */
export const REMOTE_READ_SUGGESTION_QUALITY_PLACEHOLDER = {
  confidence: 0,
  reusedFromMemory: false,
  terminologyHits: [] as string[],
  terminologyConflicts: [] as [],
  providerVia: "stub" as const,
  notes: "remote_read_adapter_v1: suggestion quality absent from read RPC",
};

function byId<T extends { id: string }>(a: T, b: T): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function byCode(a: StudioLanguage, b: StudioLanguage): number {
  return a.code < b.code ? -1 : a.code > b.code ? 1 : 0;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/** UUID-only DB actor columns: never invent system refs. */
export function mapRemoteUuidActorField(
  remote: string | null | undefined
): string | null {
  if (remote == null || remote === "") return null;
  if (isUuid(remote)) return remote.toLowerCase();
  return null;
}

/**
 * Reconstruct PersistedStudioState.auditLog.actorId from remote audit columns.
 * - user + UUID actorId → UUID
 * - system/import/ai + actor_ref → logical ref
 * - otherwise null (do not fabricate)
 */
export function mapRemoteAuditActorId(input: {
  actorId: string | null;
  actor_kind: string | null;
  actor_ref: string | null;
}): string | null {
  const kind = (input.actor_kind ?? "").toLowerCase() || "system";
  if (kind === "user") {
    if (isUuid(input.actorId)) return String(input.actorId).toLowerCase();
    return null;
  }
  if (input.actor_ref != null && String(input.actor_ref).length > 0) {
    return String(input.actor_ref);
  }
  if (input.actorId != null && !isUuid(input.actorId) && input.actorId !== "") {
    return String(input.actorId);
  }
  return null;
}

function requireStableId(row: { stable_id?: unknown }, label: string): string {
  const id = row.stable_id;
  if (typeof id !== "string" || id.length === 0) {
    throw new Error(`Invalid read snapshot: ${label}.stable_id required`);
  }
  return id;
}

function ts(value: string | undefined, fallback = MISSING_TIMESTAMP): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function asLanguageCode(raw: string): StudioLanguageCode {
  return raw as StudioLanguageCode;
}

function asDirection(raw: string): "ltr" | "rtl" {
  return raw === "rtl" ? "rtl" : "ltr";
}

function collectTimestamps(remote: TranslationStudioReadSnapshotV1): string[] {
  const out: string[] = [];
  const push = (v?: string) => {
    if (typeof v === "string" && v.length > 0) out.push(v);
  };
  for (const s of remote.suggestions) push(s.createdAt);
  for (const v of remote.values) {
    push(v.createdAt);
    push(v.updatedAt);
  }
  for (const x of remote.versions) push(x.createdAt);
  for (const m of remote.memory) push(m.createdAt);
  for (const a of remote.auditLog) push(a.createdAt);
  return out;
}

/**
 * Convert a parsed remote read snapshot into PersistedStudioState.
 * Does not filter smoke residue. Diagnostic UUID `id` fields are ignored.
 */
export function fromTranslationStudioReadSnapshot(
  remote: TranslationStudioReadSnapshotV1
): PersistedStudioState {
  if (remote.schemaVersion !== 1) {
    throw new Error(
      `Unsupported read snapshot schemaVersion: ${String(
        (remote as { schemaVersion?: unknown }).schemaVersion
      )}`
    );
  }

  const languages: StudioLanguage[] = remote.languages
    .map((l) => ({
      code: asLanguageCode(l.code),
      name: l.name,
      nativeName: l.nativeName,
      direction: asDirection(l.direction),
      enabled: Boolean(l.enabled),
    }))
    .sort(byCode);

  const namespaces: StudioNamespace[] = remote.namespaces
    .map((n) => ({
      id: requireStableId(n, "namespace"),
      name: n.name,
      description: n.description ?? "",
    }))
    .sort(byId);

  const keys: StudioTranslationKey[] = remote.keys
    .map((k) => {
      const id = requireStableId(k, "key");
      if (k.namespaceStableId == null || k.namespaceStableId === "") {
        throw new Error(
          `Invalid read snapshot: key ${id} missing namespaceStableId`
        );
      }
      const row: StudioTranslationKey = {
        id,
        namespaceId: k.namespaceStableId,
        key: k.key,
        sourceText: k.sourceText,
      };
      if (k.description != null && k.description !== "") {
        row.description = k.description;
      }
      return row;
    })
    .sort(byId);

  const suggestions: TranslationSuggestion[] = remote.suggestions
    .map((s) => ({
      id: requireStableId(s, "suggestion"),
      keyId: s.keyStableId,
      valueId: s.valueStableId,
      sourceText: s.sourceText,
      targetLanguage: asLanguageCode(s.targetLanguage),
      candidateText: s.candidateText,
      quality: { ...REMOTE_READ_SUGGESTION_QUALITY_PLACEHOLDER },
      status: s.status as TranslationSuggestion["status"],
      createdAt: ts(s.createdAt),
      createdBy: mapRemoteUuidActorField(s.createdBy),
    }))
    .sort(byId);

  const values: StudioTranslationValue[] = remote.values
    .map((v) => {
      const id = requireStableId(v, "value");
      if (v.keyStableId == null || v.keyStableId === "") {
        throw new Error(`Invalid read snapshot: value ${id} missing keyStableId`);
      }
      return {
        id,
        keyId: v.keyStableId,
        language: asLanguageCode(v.language),
        value: v.value,
        status: v.status as TranslationValueStatus,
        createdAt: ts(v.createdAt),
        updatedAt: ts(v.updatedAt, ts(v.createdAt)),
        createdBy: mapRemoteUuidActorField(v.createdBy),
        updatedBy: mapRemoteUuidActorField(v.updatedBy),
        approvedBy: mapRemoteUuidActorField(v.approvedBy),
        suggestionId: v.suggestion_stable_id,
        version: v.version,
      };
    })
    .sort(byId);

  const versions: TranslationVersionRecord[] = remote.versions
    .map((x) => {
      const id = requireStableId(x, "version");
      if (x.valueStableId == null || x.valueStableId === "") {
        throw new Error(
          `Invalid read snapshot: version ${id} missing valueStableId`
        );
      }
      if (x.keyStableId == null || x.keyStableId === "") {
        throw new Error(
          `Invalid read snapshot: version ${id} missing keyStableId`
        );
      }
      return {
        id,
        valueId: x.valueStableId,
        keyId: x.keyStableId,
        language: asLanguageCode(x.language),
        value: x.value,
        status: x.status as TranslationValueStatus,
        version: x.version,
        changedBy: mapRemoteUuidActorField(x.changedBy),
        changeAction: x.changeAction ?? "unknown",
        changeNote: x.changeNote ?? null,
        createdAt: ts(x.createdAt),
      };
    })
    .sort(byId);

  const memory: TranslationMemoryEntry[] = remote.memory
    .map((m) => ({
      id: requireStableId(m, "memory"),
      sourceFingerprint: m.sourceFingerprint,
      sourceText: m.sourceText,
      language: asLanguageCode(m.language),
      translatedText: m.translatedText,
      status: "approved" as const,
      namespaceId: m.namespaceStableId,
      createdAt: ts(m.createdAt),
      createdBy: mapRemoteUuidActorField(m.createdBy),
    }))
    .sort(byId);

  const terminology: TerminologyEntry[] = remote.terminology
    .map((t) => {
      const translations =
        t.translations &&
        typeof t.translations === "object" &&
        !Array.isArray(t.translations)
          ? (t.translations as TerminologyEntry["translations"])
          : {};
      const row: TerminologyEntry = {
        id: requireStableId(t, "terminology"),
        term: t.term,
        definition: t.definition,
        status: t.status as TerminologyStatus,
        translations,
      };
      if (t.notes != null && t.notes !== "") {
        row.notes = t.notes;
      }
      return row;
    })
    .sort(byId);

  const auditLog: AuditLogEntry[] = remote.auditLog
    .map((a) => ({
      id: requireStableId(a, "audit"),
      entityType: a.entityType as AuditLogEntry["entityType"],
      entityId: a.entityId,
      action: a.action,
      actorId: mapRemoteAuditActorId({
        actorId: a.actorId,
        actor_kind: a.actor_kind,
        actor_ref: a.actor_ref,
      }),
      detail:
        a.detail && typeof a.detail === "object" && !Array.isArray(a.detail)
          ? a.detail
          : {},
      createdAt: ts(a.createdAt),
    }))
    .sort(byId);

  const stamps = collectTimestamps(remote).sort();
  const updatedAt =
    stamps.length > 0 ? stamps[stamps.length - 1]! : MISSING_TIMESTAMP;

  return {
    schemaVersion: 1,
    updatedAt,
    languages,
    namespaces,
    keys,
    suggestions,
    values,
    versions,
    memory,
    terminology,
    auditLog,
  };
}
