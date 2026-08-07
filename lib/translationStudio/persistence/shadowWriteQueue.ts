/**
 * Single-flight shadow write queue with coalescing + bounded retry/timeout.
 *
 * Semantics:
 * - At most one in-flight RPC per queue instance.
 * - At most one pending snapshot (latest wins; older pending superseded).
 * - In-flight RPC is never cancelled; after it finishes, latest pending runs.
 * - save_seq is monotonic per queue instance.
 */

import type { PersistedStudioState } from "../types";
import type { TranslationStudioUpsertSnapshotResult } from "./writeRpcContract";
import type { TranslationStudioWriteRpcTransport } from "./writeRpcTransport";
import {
  classifyStudioShadowError,
  isRetryableStudioShadowCategory,
} from "./shadowErrorClassification";
import {
  countStudioShadowEntities,
  type StudioShadowObserver,
  noopStudioShadowObserver,
} from "./shadowObserver";

export type ShadowDbWriter = (
  state: PersistedStudioState,
  transport: TranslationStudioWriteRpcTransport
) => Promise<TranslationStudioUpsertSnapshotResult>;

export type StudioShadowWriteQueueOptions = {
  write: ShadowDbWriter;
  observer?: StudioShadowObserver;
  /** Max retries after the first attempt (default 2 → 3 attempts total). */
  maxRetries?: number;
  /** Per-attempt timeout ms (default 15000). */
  timeoutMs?: number;
  /** Delay between retries ms (default 100). */
  retryDelayMs?: number;
  /** Optional clock for tests. */
  now?: () => number;
  /** Optional delay impl for tests. */
  delay?: (ms: number) => Promise<void>;
};

export type StudioShadowIdleDrainResult = "idle" | "timeout";

/** Optional correlation metadata attached at enqueue time (for journal). */
export type StudioShadowJobMeta = {
  snapshot_hash?: string;
  correlation_id?: string;
};

export type StudioShadowWriteQueue = {
  /**
   * Enqueue after authoritative JSON save.
   * Transport is captured now (request-scoped) — not re-read later.
   */
  enqueue(
    state: PersistedStudioState,
    transport: TranslationStudioWriteRpcTransport,
    meta?: StudioShadowJobMeta
  ): number;
  /**
   * Reserve a save_seq and emit skipped (no DB call).
   * Used when request-scoped transport is missing.
   */
  skipNoTransport(meta?: StudioShadowJobMeta): number;
  /** Test helper: wait until idle (no in-flight / pending). */
  whenIdle(): Promise<void>;
  /**
   * Bounded idle wait for controlled smoke / tests.
   * Does not block ordinary save callers; never throws on timeout.
   */
  whenIdleBounded(timeoutMs: number): Promise<StudioShadowIdleDrainResult>;
  /** Current monotonic sequence (last assigned). */
  readonly lastSeq: number;
};

type Job = {
  save_seq: number;
  state: PersistedStudioState;
  transport: TranslationStudioWriteRpcTransport;
  meta?: StudioShadowJobMeta;
};

function freezeState(state: PersistedStudioState): PersistedStudioState {
  return JSON.parse(JSON.stringify(state)) as PersistedStudioState;
}

function defaultDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`Shadow write timed out after ${timeoutMs}ms`);
      (err as { code?: string }).code = "TIMEOUT";
      reject(err);
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function createStudioShadowWriteQueue(
  options: StudioShadowWriteQueueOptions
): StudioShadowWriteQueue {
  const observer = options.observer ?? noopStudioShadowObserver;
  const maxRetries = options.maxRetries ?? 2;
  const timeoutMs = options.timeoutMs ?? 15_000;
  const retryDelayMs = options.retryDelayMs ?? 100;
  const now = options.now ?? (() => Date.now());
  const delay = options.delay ?? defaultDelay;

  let lastSeq = 0;
  let inFlight: Job | null = null;
  let pending: Job | null = null;
  let chain: Promise<void> = Promise.resolve();
  const idleWaiters: Array<() => void> = [];

  function notifyIdle() {
    if (inFlight || pending) return;
    while (idleWaiters.length > 0) {
      idleWaiters.shift()?.();
    }
  }

  function pump(): void {
    chain = chain
      .then(async () => {
        while (true) {
          const job = pending;
          pending = null;
          if (!job) {
            inFlight = null;
            notifyIdle();
            return;
          }
          inFlight = job;
          await runJob(job);
          inFlight = null;
        }
      })
      .catch(() => {
        // runJob handles failures; keep chain alive
        inFlight = null;
        notifyIdle();
      });
  }

  async function runJob(job: Job): Promise<void> {
    const counts = countStudioShadowEntities(job.state);
    let attempt = 0;
    const maxAttempts = maxRetries + 1;
    const metaFields = {
      snapshot_hash: job.meta?.snapshot_hash,
      correlation_id: job.meta?.correlation_id,
    };

    while (attempt < maxAttempts) {
      attempt += 1;
      observer.onEvent({
        type: "started",
        save_seq: job.save_seq,
        attempt,
        entity_counts: counts,
        ...metaFields,
      });
      const startedAt = now();
      try {
        const result = await withTimeout(
          options.write(job.state, job.transport),
          timeoutMs
        );
        observer.onEvent({
          type: "succeeded",
          save_seq: job.save_seq,
          attempt,
          duration_ms: Math.max(0, now() - startedAt),
          inserted: result.inserted,
          updated: result.updated,
          skipped: result.skipped,
          ...metaFields,
        });
        return;
      } catch (err) {
        const { category, message } = classifyStudioShadowError(err);
        const duration_ms = Math.max(0, now() - startedAt);
        const canRetry =
          isRetryableStudioShadowCategory(category) && attempt < maxAttempts;
        if (canRetry) {
          observer.onEvent({
            type: "retry",
            save_seq: job.save_seq,
            attempt,
            category,
            message,
            ...metaFields,
          });
          await delay(retryDelayMs);
          continue;
        }
        observer.onEvent({
          type: "failed",
          save_seq: job.save_seq,
          attempt,
          duration_ms,
          category,
          message,
          ...metaFields,
        });
        return;
      }
    }
  }

  return {
    get lastSeq() {
      return lastSeq;
    },
    skipNoTransport(meta) {
      lastSeq += 1;
      const save_seq = lastSeq;
      observer.onEvent({
        type: "skipped",
        save_seq,
        reason: "no_request_transport",
        category: "unavailable",
        snapshot_hash: meta?.snapshot_hash,
        correlation_id: meta?.correlation_id,
      });
      return save_seq;
    },
    enqueue(state, transport, meta) {
      lastSeq += 1;
      const save_seq = lastSeq;
      const job: Job = {
        save_seq,
        state: freezeState(state),
        transport,
        meta,
      };
      observer.onEvent({
        type: "queued",
        save_seq,
        entity_counts: countStudioShadowEntities(job.state),
        snapshot_hash: meta?.snapshot_hash,
        correlation_id: meta?.correlation_id,
      });

      if (!inFlight && !pending) {
        pending = job;
        pump();
        return save_seq;
      }

      if (pending) {
        observer.onEvent({
          type: "superseded",
          save_seq: pending.save_seq,
          superseded_by: save_seq,
          snapshot_hash: pending.meta?.snapshot_hash,
          correlation_id: pending.meta?.correlation_id,
        });
      }
      pending = job;
      if (!inFlight) {
        pump();
      }
      return save_seq;
    },
    whenIdle() {
      if (!inFlight && !pending) return Promise.resolve();
      return new Promise<void>((resolve) => {
        idleWaiters.push(resolve);
      });
    },
    whenIdleBounded(timeoutMs: number) {
      const ms = Number.isFinite(timeoutMs) ? Math.max(0, timeoutMs) : 0;
      if (!inFlight && !pending) {
        return Promise.resolve("idle" as const);
      }
      return new Promise<StudioShadowIdleDrainResult>((resolve) => {
        let settled = false;
        const onIdle = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve("idle");
        };
        const timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          const idx = idleWaiters.indexOf(onIdle);
          if (idx >= 0) idleWaiters.splice(idx, 1);
          resolve("timeout");
        }, ms);
        idleWaiters.push(onIdle);
      });
    },
  };
}
