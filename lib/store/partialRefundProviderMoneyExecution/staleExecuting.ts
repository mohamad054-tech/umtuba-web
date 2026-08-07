/**
 * Stale executing classification for crash-window recovery.
 * Deterministic threshold; no blind submit.
 */

import type { PartialRefundProviderExecutionRecord } from "./types";

/** Default: 60s after started_at (or created_at if started missing). */
export const PARTIAL_REFUND_PROVIDER_STALE_EXECUTING_MS = 60_000 as const;

export function isStaleExecutingProviderExecution(
  execution: PartialRefundProviderExecutionRecord,
  nowMs: number = Date.now(),
  staleAfterMs: number = PARTIAL_REFUND_PROVIDER_STALE_EXECUTING_MS
): boolean {
  if (execution.status !== "executing") return false;
  const anchor = execution.startedAtIso ?? execution.createdAtIso;
  const t = Date.parse(anchor);
  if (!Number.isFinite(t)) return true;
  return nowMs - t >= staleAfterMs;
}

export function isRecoveryEligibleProviderExecution(
  execution: PartialRefundProviderExecutionRecord,
  nowMs: number = Date.now(),
  staleAfterMs: number = PARTIAL_REFUND_PROVIDER_STALE_EXECUTING_MS
): boolean {
  if (execution.status === "uncertain") return true;
  if (execution.status === "executing") {
    return isStaleExecutingProviderExecution(execution, nowMs, staleAfterMs);
  }
  return false;
}
