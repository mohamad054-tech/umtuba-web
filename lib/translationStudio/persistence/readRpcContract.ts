/**
 * Translation Studio Read Snapshot RPC V1 — contract + response parse.
 */

export const TRANSLATION_STUDIO_READ_RPC_V1 = {
  readSnapshot: "translation_studio_read_snapshot",
  migration: "20260913_translation_studio_read_snapshot_rpc_v1.sql",
} as const;

export type TranslationStudioReadSnapshotOptions = {
  /** Unsupported — RPC fail-closes if true. */
  prune_missing?: boolean;
};

/** Normalized remote snapshot (schemaVersion=1). */
export type TranslationStudioReadSnapshotV1 = {
  schemaVersion: 1;
  languages: Array<{
    code: string;
    name: string;
    nativeName: string;
    direction: string;
    enabled: boolean;
  }>;
  namespaces: Array<{
    stable_id: string;
    id?: string;
    name: string;
    description: string;
  }>;
  keys: Array<{
    stable_id: string;
    id?: string;
    namespaceStableId: string | null;
    key: string;
    sourceText: string;
    description?: string | null;
  }>;
  suggestions: Array<{
    stable_id: string;
    id?: string;
    keyStableId: string | null;
    valueStableId: string | null;
    sourceText: string;
    targetLanguage: string;
    candidateText: string;
    status: string;
    createdAt?: string;
    createdBy?: string | null;
  }>;
  values: Array<{
    stable_id: string;
    id?: string;
    keyStableId: string | null;
    language: string;
    value: string;
    status: string;
    version: number;
    suggestion_stable_id: string | null;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string | null;
    updatedBy?: string | null;
    approvedBy?: string | null;
  }>;
  versions: Array<{
    stable_id: string;
    id?: string;
    valueStableId: string | null;
    keyStableId: string | null;
    language: string;
    value: string;
    status: string;
    version: number;
    changedBy?: string | null;
    changeAction?: string;
    changeNote?: string | null;
    createdAt?: string;
  }>;
  memory: Array<{
    stable_id: string;
    id?: string;
    sourceFingerprint: string;
    sourceText: string;
    language: string;
    translatedText: string;
    status: string;
    namespaceStableId: string | null;
    createdAt?: string;
    createdBy?: string | null;
  }>;
  terminology: Array<{
    stable_id: string;
    id?: string;
    term: string;
    definition: string;
    notes?: string | null;
    status: string;
    translations: unknown;
  }>;
  auditLog: Array<{
    stable_id: string;
    id?: string;
    entityType: string;
    entityId: string;
    action: string;
    actorId: string | null;
    actor_kind: string | null;
    actor_ref: string | null;
    detail: Record<string, unknown>;
    createdAt?: string;
  }>;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireArray(
  obj: Record<string, unknown>,
  key: string
): unknown[] {
  const v = obj[key];
  if (!Array.isArray(v)) {
    throw new Error(`Invalid read snapshot: ${key} must be an array`);
  }
  return v;
}

/**
 * Fail-closed parse of translation_studio_read_snapshot JSON result.
 */
export function parseTranslationStudioReadSnapshot(
  raw: unknown
): TranslationStudioReadSnapshotV1 {
  if (!isPlainObject(raw)) {
    throw new Error("Invalid read snapshot: object required");
  }
  if (raw.schemaVersion !== 1) {
    throw new Error("Invalid read snapshot: schemaVersion must be 1");
  }
  return {
    schemaVersion: 1,
    languages: requireArray(raw, "languages") as TranslationStudioReadSnapshotV1["languages"],
    namespaces: requireArray(raw, "namespaces") as TranslationStudioReadSnapshotV1["namespaces"],
    keys: requireArray(raw, "keys") as TranslationStudioReadSnapshotV1["keys"],
    suggestions: requireArray(raw, "suggestions") as TranslationStudioReadSnapshotV1["suggestions"],
    values: requireArray(raw, "values") as TranslationStudioReadSnapshotV1["values"],
    versions: requireArray(raw, "versions") as TranslationStudioReadSnapshotV1["versions"],
    memory: requireArray(raw, "memory") as TranslationStudioReadSnapshotV1["memory"],
    terminology: requireArray(raw, "terminology") as TranslationStudioReadSnapshotV1["terminology"],
    auditLog: requireArray(raw, "auditLog") as TranslationStudioReadSnapshotV1["auditLog"],
  };
}
