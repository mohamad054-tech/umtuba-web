/**
 * Media Processor contract — implement per domain without touching Runtime.
 */

import type {
  MediaJobRef,
  MediaProcessResult,
  MediaProcessorKind,
  MediaProgressState,
} from "./types";

export type ProcessorContext = {
  signal: AbortSignal;
  workDir: string;
  attemptCount: number;
  reportProgress: (state: MediaProgressState, detail?: string) => void;
  log: (event: string, fields?: Record<string, unknown>) => void;
};

export type MediaProcessor = {
  readonly kind: MediaProcessorKind;
  /** Max attempts before permanent failure (processor-specific ceiling). */
  readonly maxAttempts: number;
  validate(job: MediaJobRef): Promise<{ ok: true } | { ok: false; code: string }>;
  claim(): Promise<MediaJobRef | null>;
  execute(job: MediaJobRef, ctx: ProcessorContext): Promise<MediaProcessResult>;
  finalize(job: MediaJobRef, ctx: ProcessorContext): Promise<MediaProcessResult>;
  fail(
    job: MediaJobRef,
    error: { code: string; kind: "retryable" | "permanent" },
    ctx: ProcessorContext
  ): Promise<void>;
  isRetryEligible(job: MediaJobRef, errorCode: string): boolean;
  cleanup(job: MediaJobRef, workDir: string): Promise<void>;
};
