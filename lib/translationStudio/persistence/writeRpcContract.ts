/**
 * Translation Studio Write RPC V1 — contract constants (no runtime wiring yet).
 */

export const TRANSLATION_STUDIO_WRITE_RPC_V1 = {
  upsertSnapshot: "translation_studio_upsert_snapshot",
  migration:
    "20260912_translation_studio_write_rpc_v1.sql",
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
