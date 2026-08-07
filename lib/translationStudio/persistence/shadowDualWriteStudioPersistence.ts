/**
 * Shadow dual-write Studio persistence V1.
 *
 * - JSON load/save remain synchronous and authoritative.
 * - After JSON save succeeds, enqueue async DB shadow write (non-blocking).
 * - DB failure never fails the caller.
 * - Optional local reconciliation journal records outcomes (non-fatal).
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
import { fingerprintStudioSnapshot } from "./snapshotFingerprint";
import {
  composeStudioShadowObservers,
  createJournalingShadowObserver,
  createShadowReconciliationJournal,
  type ShadowReconciliationJournal,
} from "./shadowReconciliationJournal";

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
  /**
   * Enable local reconciliation journal (default false; runtime factory opts in).
   */
  enableReconciliationJournal?: boolean;
  /** Journal data dir / path overrides (tests). */
  journalDataDir?: string;
  journalFilePath?: string;
  journal?: ShadowReconciliationJournal;
  /** Optional correlation id factory (no secrets). */
  correlationId?: () => string | undefined;
};

export function createShadowDualWriteStudioPersistence(
  options: CreateShadowDualWriteStudioPersistenceOptions
): ShadowDualWriteStudioPersistence {
  const getTransport =
    options.getTransport ?? (() => getStudioShadowWriteTransport());

  const metaBySeq = new Map<
    number,
    { snapshot_hash: string; correlation_id?: string }
  >();

  const enableJournal = options.enableReconciliationJournal === true;
  const journal =
    options.journal ??
    (enableJournal
      ? createShadowReconciliationJournal({
          dataDir: options.journalDataDir,
          filePath: options.journalFilePath,
        })
      : null);

  const baseObserver =
    options.observer ??
    (options.logToConsole
      ? consoleStudioShadowObserver
      : noopStudioShadowObserver);

  const journalObserver = journal
    ? createJournalingShadowObserver({
        journal,
        getMeta: (save_seq) => metaBySeq.get(save_seq) ?? null,
        onJournalError: (err) => {
          console.warn(
            "[translation-studio-shadow-journal]",
            err instanceof Error ? err.message : "journal_error"
          );
        },
      })
    : null;

  const observer = composeStudioShadowObservers(baseObserver, journalObserver);

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

      let snapshot_hash = "";
      try {
        snapshot_hash = fingerprintStudioSnapshot(state);
      } catch {
        snapshot_hash = "fingerprint_failed";
      }
      const correlation_id = options.correlationId?.();
      const meta = { snapshot_hash, correlation_id };

      // C. Shadow only after JSON success; capture transport now
      const transport = getTransport();
      if (!transport) {
        // Reserve seq first so journal getMeta sees hash even if event races
        const provisionalSeq = queue.lastSeq + 1;
        metaBySeq.set(provisionalSeq, meta);
        const seq = queue.skipNoTransport(meta);
        if (seq !== provisionalSeq) metaBySeq.set(seq, meta);
        return;
      }
      const provisionalSeq = queue.lastSeq + 1;
      metaBySeq.set(provisionalSeq, meta);
      const seq = queue.enqueue(state, transport, meta);
      if (seq !== provisionalSeq) metaBySeq.set(seq, meta);
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
