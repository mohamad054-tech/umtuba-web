/**
 * Shadow dual-write Studio persistence V1.
 *
 * - JSON load/save remain synchronous and authoritative.
 * - After JSON save succeeds, enqueue async DB shadow write (non-blocking).
 * - DB failure never fails the caller.
 * - DB is append/upsert-only (no prune); stale remote rows may remain if JSON
 *   removes entities — DB is not authoritative in V1.
 *
 * Transport is resolved at enqueue time from request scope (ALS or injected
 * getTransport) and captured on the job — never stored on the process singleton.
 */

import type { PersistedStudioState } from "../types";
import { createDbStudioPersistence } from "./dbStudioPersistence";
import type { StudioPersistencePort } from "./studioPersistencePort";
import {
  consoleStudioShadowObserver,
  noopStudioShadowObserver,
  type StudioShadowObserver,
} from "./shadowObserver";
import {
  createStudioShadowWriteQueue,
  type StudioShadowIdleDrainResult,
} from "./shadowWriteQueue";
import { getStudioShadowWriteTransport } from "./shadowWriteContext";
import type { TranslationStudioWriteRpcTransport } from "./writeRpcTransport";

export type ShadowDualWriteStudioPersistence = StudioPersistencePort & {
  readonly kind: "shadow_dual_write";
  /** Test helper. */
  whenShadowIdle(): Promise<void>;
  /**
   * Bounded drain for controlled smoke / tests only.
   * Does not alter synchronous save semantics.
   */
  whenShadowIdleBounded(
    timeoutMs: number
  ): Promise<StudioShadowIdleDrainResult>;
  readonly lastShadowSeq: number;
};

export type CreateShadowDualWriteStudioPersistenceOptions = {
  json: StudioPersistencePort;
  /**
   * Resolve request-scoped authenticated transport at enqueue time.
   * Defaults to ALS getStudioShadowWriteTransport().
   */
  getTransport?: () => TranslationStudioWriteRpcTransport | null;
  observer?: StudioShadowObserver;
  maxRetries?: number;
  timeoutMs?: number;
  retryDelayMs?: number;
  now?: () => number;
  delay?: (ms: number) => Promise<void>;
  /** Use console observer instead of no-op when observer omitted. */
  logToConsole?: boolean;
};

export function createShadowDualWriteStudioPersistence(
  options: CreateShadowDualWriteStudioPersistenceOptions
): ShadowDualWriteStudioPersistence {
  const getTransport =
    options.getTransport ?? (() => getStudioShadowWriteTransport());
  const observer =
    options.observer ??
    (options.logToConsole
      ? consoleStudioShadowObserver
      : noopStudioShadowObserver);

  const queue = createStudioShadowWriteQueue({
    observer,
    maxRetries: options.maxRetries,
    timeoutMs: options.timeoutMs,
    retryDelayMs: options.retryDelayMs,
    now: options.now,
    delay: options.delay,
    write: async (state, transport) => {
      const db = createDbStudioPersistence({
        transport,
        defaultOptions: { dry_run: false, prune_missing: false },
      });
      return db.saveAsync(state, { dry_run: false, prune_missing: false });
    },
  });

  return {
    kind: "shadow_dual_write",
    load() {
      return options.json.load();
    },
    save(state) {
      // A. JSON authoritative first
      options.json.save(state);
      // C. Shadow only after JSON success; capture transport now
      const transport = getTransport();
      if (!transport) {
        queue.skipNoTransport();
        return;
      }
      queue.enqueue(state, transport);
    },
    whenShadowIdle() {
      return queue.whenIdle();
    },
    whenShadowIdleBounded(timeoutMs: number) {
      return queue.whenIdleBounded(timeoutMs);
    },
    get lastShadowSeq() {
      return queue.lastSeq;
    },
  };
}
