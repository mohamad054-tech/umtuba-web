/**
 * Injected transport for Translation Studio read snapshot RPC.
 * Authenticated server-side cookie/JWT client only — never service_role.
 */

import {
  TRANSLATION_STUDIO_READ_RPC_V1,
  parseTranslationStudioReadSnapshot,
  type TranslationStudioReadSnapshotOptions,
  type TranslationStudioReadSnapshotV1,
} from "./readRpcContract";
import type { TranslationStudioRpcClient } from "./writeRpcTransport";

export type TranslationStudioReadRpcTransport = {
  readSnapshot(
    options?: TranslationStudioReadSnapshotOptions
  ): Promise<TranslationStudioReadSnapshotV1>;
};

export function createSupabaseReadRpcTransport(
  supabase: TranslationStudioRpcClient
): TranslationStudioReadRpcTransport {
  return {
    async readSnapshot(options = {}) {
      const { data, error } = await supabase.rpc(
        TRANSLATION_STUDIO_READ_RPC_V1.readSnapshot,
        {
          p_options: {
            ...(options.prune_missing === true
              ? { prune_missing: true }
              : {}),
          },
        }
      );
      if (error) {
        throw new Error(
          `translation_studio_read_snapshot failed: ${error.message}`
        );
      }
      try {
        return parseTranslationStudioReadSnapshot(data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Invalid read snapshot response";
        throw new Error(`Studio DB read failed (response): ${message}`);
      }
    },
  };
}
