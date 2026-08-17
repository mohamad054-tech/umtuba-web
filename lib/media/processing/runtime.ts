/**
 * Worker Runtime + Job Dispatcher — domain-agnostic orchestration.
 */

import type { MediaProcessor } from "./processor";
import { getMediaProcessor } from "./processorRegistry";
import { createTempWorkspace } from "./adapters/storageAdapter";
import {
  acquireMediaWorkerLock,
  assertMediaWorkFreeSpace,
  resolveMediaWorkRoot,
  type MediaWorkerLock,
} from "./adapters/mediaWorkIsolation";
import { createMediaLogger } from "./logging";
import {
  metricJobCompleted,
  metricJobFailed,
  metricJobStarted,
  metricRetry,
} from "./metrics";
import { assertProgressTransition } from "./progress";
import { classifyFailureKind, decideRetry } from "./retryPolicy";
import type {
  MediaJobRef,
  MediaProcessorKind,
  MediaProgressState,
} from "./types";

const log = createMediaLogger("media-runtime");

export type RuntimeOptions = {
  /** Idle poll interval when no job claimed. */
  idlePollMs?: number;
  /** Run a single claim/execute cycle then stop. */
  once?: boolean;
  /** Optional override for sleep (tests). */
  sleep?: (ms: number) => Promise<void>;
};

export type DispatchResult =
  | { ok: true; jobId: string; state: "ready" | "not_required" }
  | { ok: false; jobId?: string; errorCode: string; retryable: boolean }
  | { ok: true; idle: true };

export class MediaWorkerRuntime {
  private shuttingDown = false;
  private active = false;
  private abort: AbortController | null = null;

  constructor(
    private readonly processorKind: MediaProcessorKind,
    private readonly options: RuntimeOptions = {}
  ) {}

  get isShuttingDown(): boolean {
    return this.shuttingDown;
  }

  requestShutdown(): void {
    this.shuttingDown = true;
    this.abort?.abort();
    log("shutdown_requested", { processorKind: this.processorKind });
  }

  resolveProcessor():
    | { ok: true; processor: MediaProcessor }
    | { ok: false; message: string } {
    return getMediaProcessor(this.processorKind);
  }

  async dispatchOnce(): Promise<DispatchResult> {
    const resolved = this.resolveProcessor();
    if (!resolved.ok) {
      return { ok: false, errorCode: "unsupported_processor", retryable: false };
    }
    const processor = resolved.processor;
    let lock: MediaWorkerLock | null = null;
    if (processor.kind === "ugc_video") {
      const root = resolveMediaWorkRoot();
      const space = await assertMediaWorkFreeSpace(root);
      if (!space.ok) {
        log("isolation_blocked", { processorKind: processor.kind, code: space.code });
        return { ok: false, errorCode: space.code, retryable: true };
      }
      const locked = acquireMediaWorkerLock(root);
      if (!locked.ok) {
        log("isolation_blocked", { processorKind: processor.kind, code: locked.code });
        return { ok: false, errorCode: locked.code, retryable: true };
      }
      lock = locked.lock;
    }
    try {
      const job = await processor.claim();
      if (!job) {
        return { ok: true, idle: true };
      }
      return await this.runJob(processor, job);
    } finally {
      lock?.release();
    }
  }

  async runJob(
    processor: MediaProcessor,
    job: MediaJobRef
  ): Promise<DispatchResult> {
    const started = Date.now();
    metricJobStarted();
    this.active = true;
    this.abort = new AbortController();
    const workspace = await createTempWorkspace(`umtuba-${processor.kind}-`);
    let progress: MediaProgressState = "claimed";

    const reportProgress = (state: MediaProgressState, detail?: string) => {
      const gate = assertProgressTransition(progress, state);
      if (!gate.ok) {
        log("invalid_progress", {
          jobId: job.jobId,
          from: progress,
          to: state,
          detail,
        });
        return;
      }
      progress = state;
      log("progress", {
        jobId: job.jobId,
        processorKind: processor.kind,
        state,
        detail,
      });
    };

    const ctx = {
      signal: this.abort.signal,
      workDir: workspace.workDir,
      attemptCount: job.attemptCount,
      reportProgress,
      log: (event: string, fields?: Record<string, unknown>) =>
        log(event, { jobId: job.jobId, processorKind: processor.kind, ...fields }),
    };

    log("processor_start", {
      jobId: job.jobId,
      processorKind: processor.kind,
      attempt: job.attemptCount,
    });

    try {
      const validated = await processor.validate(job);
      if (!validated.ok) {
        const kind = classifyFailureKind(validated.code);
        await processor.fail(job, { code: validated.code, kind }, ctx);
        metricJobFailed(Date.now() - started);
        return {
          ok: false,
          jobId: job.jobId,
          errorCode: validated.code,
          retryable: kind === "retryable",
        };
      }

      reportProgress("processing");
      const executed = await processor.execute(job, ctx);
      if (!executed.ok) {
        const kind = executed.error.kind;
        await processor.fail(job, executed.error, ctx);
        if (
          kind === "retryable" &&
          processor.isRetryEligible(job, executed.error.code)
        ) {
          metricRetry();
          const decision = decideRetry({
            attemptCount: job.attemptCount,
            maxAttempts: processor.maxAttempts,
            failureKind: kind,
          });
          log("retry_decision", {
            jobId: job.jobId,
            ...decision,
            errorCode: executed.error.code,
          });
        }
        metricJobFailed(Date.now() - started);
        log("processor_end", {
          jobId: job.jobId,
          ok: false,
          durationMs: Date.now() - started,
          errorCode: executed.error.code,
        });
        return {
          ok: false,
          jobId: job.jobId,
          errorCode: executed.error.code,
          retryable: kind === "retryable",
        };
      }

      if (executed.state === "ready" || executed.state === "not_required") {
        reportProgress("finalizing");
        const finalized = await processor.finalize(job, ctx);
        if (!finalized.ok) {
          await processor.fail(job, finalized.error, ctx);
          metricJobFailed(Date.now() - started);
          return {
            ok: false,
            jobId: job.jobId,
            errorCode: finalized.error.code,
            retryable: finalized.error.kind === "retryable",
          };
        }
        reportProgress("ready");
        metricJobCompleted(Date.now() - started);
        log("processor_end", {
          jobId: job.jobId,
          ok: true,
          durationMs: Date.now() - started,
          state: finalized.state,
        });
        return { ok: true, jobId: job.jobId, state: finalized.state };
      }

      metricJobCompleted(Date.now() - started);
      return { ok: true, jobId: job.jobId, state: "ready" };
    } catch (error) {
      const code = "processing_failed";
      await processor
        .fail(job, { code, kind: "retryable" }, ctx)
        .catch(() => undefined);
      metricJobFailed(Date.now() - started);
      log("processor_end", {
        jobId: job.jobId,
        ok: false,
        durationMs: Date.now() - started,
        errorCode: code,
        message: error instanceof Error ? error.message.slice(0, 120) : "error",
      });
      return {
        ok: false,
        jobId: job.jobId,
        errorCode: code,
        retryable: true,
      };
    } finally {
      await processor.cleanup(job, workspace.workDir).catch(() => undefined);
      await workspace.cleanup();
      this.active = false;
      this.abort = null;
    }
  }

  async loop(): Promise<void> {
    const idleMs = this.options.idlePollMs ?? 3000;
    const sleep =
      this.options.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));

    log("runtime_started", {
      processorKind: this.processorKind,
      once: Boolean(this.options.once),
    });

    while (!this.shuttingDown) {
      const result = await this.dispatchOnce();
      if (this.options.once) break;
      if ("idle" in result && result.idle) {
        await sleep(idleMs);
      }
    }

    log("runtime_stopped", {
      processorKind: this.processorKind,
      active: this.active,
    });
  }
}

export function createMediaWorkerRuntime(
  kind: MediaProcessorKind,
  options?: RuntimeOptions
): MediaWorkerRuntime {
  return new MediaWorkerRuntime(kind, options);
}
