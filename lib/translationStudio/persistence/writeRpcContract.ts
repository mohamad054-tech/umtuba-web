/**
 * Translation Studio Write RPC V1 — contract constants + response validation.
 */

export const TRANSLATION_STUDIO_WRITE_RPC_V1 = {
  upsertSnapshot: "translation_studio_upsert_snapshot",
  migration: "20260912_translation_studio_write_rpc_v1.sql",
} as const;

export type TranslationStudioUpsertSnapshotOptions = {
  dry_run?: boolean;
  /** Unsupported in v1 — RPC fail-closes if true. */
  prune_missing?: boolean;
};

export type TranslationStudioUpsertSnapshotResult = {
  ok: true;
  dry_run: boolean;
  schema_version: 1;
  inserted: number;
  updated: number;
  skipped: number;
  prune_missing: false;
  caller_user_id: string;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireNumber(obj: Record<string, unknown>, key: string): number {
  const v = obj[key];
  if (typeof v !== "number" || !Number.isFinite(v)) {
    throw new Error(`Invalid RPC response: ${key} must be a finite number`);
  }
  return v;
}

/**
 * Fail-closed parse of translation_studio_upsert_snapshot JSON result.
 */
export function parseTranslationStudioUpsertSnapshotResult(
  raw: unknown
): TranslationStudioUpsertSnapshotResult {
  if (!isPlainObject(raw)) {
    throw new Error("Invalid RPC response: object required");
  }
  if (raw.ok !== true) {
    throw new Error("Invalid RPC response: ok must be true");
  }
  if (raw.schema_version !== 1) {
    throw new Error("Invalid RPC response: schema_version must be 1");
  }
  if (typeof raw.dry_run !== "boolean") {
    throw new Error("Invalid RPC response: dry_run must be boolean");
  }
  if (raw.prune_missing !== false) {
    throw new Error("Invalid RPC response: prune_missing must be false");
  }
  if (typeof raw.caller_user_id !== "string" || raw.caller_user_id.length < 1) {
    throw new Error("Invalid RPC response: caller_user_id required");
  }
  return {
    ok: true,
    dry_run: raw.dry_run,
    schema_version: 1,
    inserted: requireNumber(raw, "inserted"),
    updated: requireNumber(raw, "updated"),
    skipped: requireNumber(raw, "skipped"),
    prune_missing: false,
    caller_user_id: raw.caller_user_id,
  };
}
