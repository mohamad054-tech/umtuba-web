/**
 * Injected transport for Translation Studio write RPC.
 * Callers supply an authenticated server-side Supabase client (cookie/JWT).
 * Never constructs a service-role client.
 */

import {
  TRANSLATION_STUDIO_WRITE_RPC_V1,
  type TranslationStudioUpsertSnapshotOptions,
} from "./writeRpcContract";
import type { TranslationStudioWriteSnapshotV1 } from "./writeRpcSnapshot";

export type TranslationStudioWriteRpcTransport = {
  upsertSnapshot(
    snapshot: TranslationStudioWriteSnapshotV1,
    options?: TranslationStudioUpsertSnapshotOptions
  ): Promise<unknown>;
};

/** Minimal rpc surface — avoids coupling tests to Postgrest builder types. */
export type TranslationStudioRpcClient = {
  rpc(
    fn: string,
    args?: Record<string, unknown>
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

/**
 * Wrap a trusted server Supabase client as write-RPC transport.
 * Uses `.rpc(translation_studio_upsert_snapshot)` only — no table APIs.
 */
export function createSupabaseWriteRpcTransport(
  supabase: TranslationStudioRpcClient
): TranslationStudioWriteRpcTransport {
  return {
    async upsertSnapshot(snapshot, options = {}) {
      const { data, error } = await supabase.rpc(
        TRANSLATION_STUDIO_WRITE_RPC_V1.upsertSnapshot,
        {
          p_snapshot: snapshot,
          p_options: {
            dry_run: options.dry_run === true,
            ...(options.prune_missing === true
              ? { prune_missing: true }
              : {}),
          },
        }
      );
      if (error) {
        throw new Error(
          `translation_studio_upsert_snapshot failed: ${error.message}`
        );
      }
      return data;
    },
  };
}
