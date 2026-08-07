/**
 * DB Studio persistence adapter foundation V1.
 *
 * Write path: PersistedStudioState → RPC snapshot → translation_studio_upsert_snapshot.
 * Read path: unsupported (no complete remote fetch contract) — JSON remains load owner.
 *
 * Not wired into createDefaultStudioPersistence. Injectable for tests / future
 * shadow dual-write. Sync StudioPersistencePort.save/load fail closed.
 */

import type { PersistedStudioState } from "../types";
import type { StudioPersistencePort } from "./studioPersistencePort";
import {
  parseTranslationStudioUpsertSnapshotResult,
  type TranslationStudioUpsertSnapshotOptions,
  type TranslationStudioUpsertSnapshotResult,
} from "./writeRpcContract";
import { toTranslationStudioWriteSnapshot } from "./writeRpcSnapshot";
import type { TranslationStudioWriteRpcTransport } from "./writeRpcTransport";

export class StudioDbLoadUnsupportedError extends Error {
  readonly code = "STUDIO_DB_LOAD_UNSUPPORTED" as const;
  constructor(message = "DB Studio persistence load is unsupported in V1") {
    super(message);
    this.name = "StudioDbLoadUnsupportedError";
  }
}

export class StudioDbSyncSaveUnsupportedError extends Error {
  readonly code = "STUDIO_DB_SYNC_SAVE_UNSUPPORTED" as const;
  constructor(
    message = "DB Studio persistence requires saveAsync(); sync save is unsupported"
  ) {
    super(message);
    this.name = "StudioDbSyncSaveUnsupportedError";
  }
}

export type DbStudioPersistence = StudioPersistencePort & {
  readonly kind: "db";
  /** Always false until a fetch RPC exists. */
  readonly loadSupported: false;
  /** Sync save is intentionally unsupported (RPC is async). */
  readonly syncSaveSupported: false;
  saveAsync(
    state: PersistedStudioState,
    options?: TranslationStudioUpsertSnapshotOptions
  ): Promise<TranslationStudioUpsertSnapshotResult>;
};

export type CreateDbStudioPersistenceOptions = {
  transport: TranslationStudioWriteRpcTransport;
  /** Default RPC options merged under each saveAsync call. */
  defaultOptions?: TranslationStudioUpsertSnapshotOptions;
};

export function createDbStudioPersistence(
  options: CreateDbStudioPersistenceOptions
): DbStudioPersistence {
  const { transport, defaultOptions } = options;

  return {
    kind: "db",
    loadSupported: false,
    syncSaveSupported: false,

    load(): PersistedStudioState | null {
      throw new StudioDbLoadUnsupportedError(
        "DB Studio persistence has no remote read contract in V1; use JSON load."
      );
    },

    save(_state: PersistedStudioState): void {
      throw new StudioDbSyncSaveUnsupportedError();
    },

    async saveAsync(
      state: PersistedStudioState,
      callOptions?: TranslationStudioUpsertSnapshotOptions
    ): Promise<TranslationStudioUpsertSnapshotResult> {
      const snapshot = toTranslationStudioWriteSnapshot(state);
      const rpcOptions: TranslationStudioUpsertSnapshotOptions = {
        ...defaultOptions,
        ...callOptions,
      };
      let raw: unknown;
      try {
        raw = await transport.upsertSnapshot(snapshot, rpcOptions);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown write RPC transport error";
        throw new Error(`Studio DB save failed (transport): ${message}`);
      }
      try {
        return parseTranslationStudioUpsertSnapshotResult(raw);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Invalid write RPC response";
        throw new Error(`Studio DB save failed (response): ${message}`);
      }
    },
  };
}
