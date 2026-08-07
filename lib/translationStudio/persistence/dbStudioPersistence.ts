/**
 * DB Studio persistence adapter V1 (+ remote read adapter).
 *
 * Write path: PersistedStudioState → RPC snapshot → translation_studio_upsert_snapshot.
 * Read path:  translation_studio_read_snapshot → PersistedStudioState via loadAsync().
 *
 * Sync StudioPersistencePort.load/save remain fail-closed (RPC is async).
 * JSON workflow stays the runtime authority — this adapter is injectable only.
 * Does not enable dual_read / db_primary.
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
import type { TranslationStudioReadRpcTransport } from "./readRpcTransport";
import type { TranslationStudioReadSnapshotOptions } from "./readRpcContract";
import { fromTranslationStudioReadSnapshot } from "./fromTranslationStudioReadSnapshot";
import { classifyStudioShadowError } from "./shadowErrorClassification";

export type StudioDbReadErrorCategory =
  | "auth"
  | "transport"
  | "rpc"
  | "invalid_response"
  | "unsupported_sync_load"
  | "missing_read_transport";

export class StudioDbReadError extends Error {
  readonly code = "STUDIO_DB_READ_ERROR" as const;
  readonly category: StudioDbReadErrorCategory;
  constructor(category: StudioDbReadErrorCategory, message: string) {
    super(message);
    this.name = "StudioDbReadError";
    this.category = category;
  }
}

/** @deprecated Prefer StudioDbSyncLoadUnsupportedError — sync load remains unsupported. */
export class StudioDbLoadUnsupportedError extends Error {
  readonly code = "STUDIO_DB_LOAD_UNSUPPORTED" as const;
  constructor(
    message = "DB Studio persistence sync load is unsupported; use loadAsync()"
  ) {
    super(message);
    this.name = "StudioDbLoadUnsupportedError";
  }
}

export class StudioDbSyncLoadUnsupportedError extends StudioDbReadError {
  constructor(
    message = "DB Studio persistence requires loadAsync(); sync load is unsupported"
  ) {
    super("unsupported_sync_load", message);
    this.name = "StudioDbSyncLoadUnsupportedError";
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
  /** True — remote read is available via loadAsync when readTransport is injected. */
  readonly loadSupported: true;
  /** Sync load remains unsupported (RPC is async). */
  readonly syncLoadSupported: false;
  readonly asyncLoadSupported: true;
  /** Sync save is intentionally unsupported (RPC is async). */
  readonly syncSaveSupported: false;
  loadAsync(
    options?: TranslationStudioReadSnapshotOptions
  ): Promise<PersistedStudioState>;
  saveAsync(
    state: PersistedStudioState,
    options?: TranslationStudioUpsertSnapshotOptions
  ): Promise<TranslationStudioUpsertSnapshotResult>;
};

export type CreateDbStudioPersistenceOptions = {
  /** Write RPC transport (required for saveAsync). */
  transport: TranslationStudioWriteRpcTransport;
  /**
   * Explicit read RPC transport for loadAsync.
   * Prefer injection over globals; request-scoped authenticated client only.
   */
  readTransport?: TranslationStudioReadRpcTransport;
  /** Default RPC options merged under each saveAsync call. */
  defaultOptions?: TranslationStudioUpsertSnapshotOptions;
};

function classifyReadFailure(err: unknown): StudioDbReadError {
  if (err instanceof StudioDbReadError) return err;
  const classified = classifyStudioShadowError(err);
  const message =
    err instanceof Error ? err.message : "Unknown Studio DB read error";
  const lower = message.toLowerCase();
  if (
    lower.includes("invalid read snapshot") ||
    lower.includes("studio db read failed (response)") ||
    classified.category === "invalid_response"
  ) {
    return new StudioDbReadError("invalid_response", message);
  }
  if (classified.category === "auth") {
    return new StudioDbReadError("auth", message);
  }
  if (
    classified.category === "rpc" ||
    lower.includes("translation_studio_read_snapshot failed")
  ) {
    return new StudioDbReadError("rpc", message);
  }
  return new StudioDbReadError("transport", message);
}

export function createDbStudioPersistence(
  options: CreateDbStudioPersistenceOptions
): DbStudioPersistence {
  const { transport, readTransport, defaultOptions } = options;

  return {
    kind: "db",
    loadSupported: true,
    syncLoadSupported: false,
    asyncLoadSupported: true,
    syncSaveSupported: false,

    load(): PersistedStudioState | null {
      throw new StudioDbSyncLoadUnsupportedError();
    },

    save(_state: PersistedStudioState): void {
      throw new StudioDbSyncSaveUnsupportedError();
    },

    async loadAsync(
      callOptions?: TranslationStudioReadSnapshotOptions
    ): Promise<PersistedStudioState> {
      if (!readTransport) {
        throw new StudioDbReadError(
          "missing_read_transport",
          "DB Studio persistence loadAsync requires an injected readTransport"
        );
      }
      let remote;
      try {
        remote = await readTransport.readSnapshot(callOptions);
      } catch (err) {
        throw classifyReadFailure(err);
      }
      try {
        return fromTranslationStudioReadSnapshot(remote);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Invalid read snapshot mapping";
        throw new StudioDbReadError("invalid_response", message);
      }
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
