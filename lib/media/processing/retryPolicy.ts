/**
 * Retry policy — no new scheduler; decides eligibility + backoff delay only.
 */

import type { MediaFailureKind } from "./types";

export type RetryDecision = {
  retryable: boolean;
  delayMs: number;
  reason: string;
};

export type RetryPolicyInput = {
  attemptCount: number;
  maxAttempts: number;
  failureKind: MediaFailureKind;
  baseDelayMs?: number;
  maxDelayMs?: number;
};

const PERMANENT_CODES = new Set([
  "article_missing",
  "invalid_job",
  "unsupported_processor",
  "ffmpeg_missing_font",
]);

export function classifyFailureKind(errorCode: string): MediaFailureKind {
  const code = errorCode.trim().toLowerCase();
  if (PERMANENT_CODES.has(code)) return "permanent";
  if (code === "ffmpeg_missing") return "permanent";
  return "retryable";
}

/**
 * Exponential backoff: base * 2^(attempt-1), capped.
 * attemptCount is the count AFTER the failed attempt (1-based attempts used).
 */
export function decideRetry(input: RetryPolicyInput): RetryDecision {
  const base = input.baseDelayMs ?? 2000;
  const maxDelay = input.maxDelayMs ?? 60_000;

  if (input.failureKind === "permanent") {
    return { retryable: false, delayMs: 0, reason: "permanent_failure" };
  }
  if (input.attemptCount >= input.maxAttempts) {
    return { retryable: false, delayMs: 0, reason: "max_attempts" };
  }

  const exp = Math.max(0, input.attemptCount - 1);
  const delayMs = Math.min(maxDelay, base * 2 ** exp);
  return { retryable: true, delayMs, reason: "retryable_failure" };
}
