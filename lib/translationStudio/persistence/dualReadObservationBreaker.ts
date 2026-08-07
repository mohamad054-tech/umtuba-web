/**
 * Dual-read observation circuit breaker V1.
 * Governs automatic dual-read observation ONLY — never JSON authority or shadow writes.
 * Process-local state; resets on process restart.
 */

import type { DualReadCompareResult } from "./dualReadCompare";
import { hasActionableDualReadDrift } from "./dualReadCompare";

export type DualReadObservationBreakerState = "CLOSED" | "OPEN";

export type DualReadObservationBreakerReason =
  | "auth"
  | "invalid_response"
  | "field_mismatch"
  | "missing_remote"
  | "transport_consecutive"
  | "transport_session"
  | "rpc_consecutive"
  | "rpc_session"
  | "timeout_consecutive"
  | "timeout_session"
  | "manual_open"
  | null;

export type DualReadObservationBreakerSnapshot = {
  state: DualReadObservationBreakerState;
  reason: DualReadObservationBreakerReason;
  opened_at: string | null;
  consecutive_failures: number;
  session_failures: number;
  last_success_at: string | null;
};

const TRANSPORTISH = new Set(["transport", "rpc", "timeout"]);

type BreakerInternal = {
  state: DualReadObservationBreakerState;
  reason: DualReadObservationBreakerReason;
  opened_at: string | null;
  consecutive_failures: number;
  session_failures: number;
  last_success_at: string | null;
};

function createClosed(): BreakerInternal {
  return {
    state: "CLOSED",
    reason: null,
    opened_at: null,
    consecutive_failures: 0,
    session_failures: 0,
    last_success_at: null,
  };
}

/** Process-local singleton (resets on restart). */
let breaker: BreakerInternal = createClosed();

/** Test/injectable clock. */
let nowIso: () => string = () => new Date().toISOString();

export function getDualReadObservationBreaker(): DualReadObservationBreakerSnapshot {
  return { ...breaker };
}

export function isDualReadObservationBreakerOpen(): boolean {
  return breaker.state === "OPEN";
}

/**
 * Reset breaker to CLOSED. Process restart also resets.
 * Named explicit reset for admin/tests — does not auto-close after failures.
 */
export function resetDualReadObservationBreaker(): DualReadObservationBreakerSnapshot {
  breaker = createClosed();
  return getDualReadObservationBreaker();
}

/** Test-only: replace clock / force state. */
export function __setDualReadObservationBreakerForTests(
  partial?: Partial<BreakerInternal> | null,
  clock?: () => string
): void {
  if (clock) nowIso = clock;
  if (partial === null) {
    breaker = createClosed();
    return;
  }
  if (partial) {
    breaker = { ...breaker, ...partial };
  }
}

function open(
  reason: Exclude<DualReadObservationBreakerReason, null>
): DualReadObservationBreakerSnapshot {
  if (breaker.state !== "OPEN") {
    breaker.state = "OPEN";
    breaker.reason = reason;
    breaker.opened_at = nowIso();
  } else if (!breaker.reason) {
    breaker.reason = reason;
  }
  return getDualReadObservationBreaker();
}

/**
 * Record a dual-read observation result into the breaker.
 * Returns whether the breaker opened on this event.
 */
export function recordDualReadObservationResult(
  result: DualReadCompareResult
): { opened: boolean; snapshot: DualReadObservationBreakerSnapshot } {
  if (breaker.state === "OPEN") {
    return { opened: false, snapshot: getDualReadObservationBreaker() };
  }

  if (result.status === "IN_SYNC" || result.status === "TRANSIENT_LAG") {
    breaker.consecutive_failures = 0;
    breaker.last_success_at = nowIso();
    return { opened: false, snapshot: getDualReadObservationBreaker() };
  }

  if (result.status === "STALE_DISCARDED") {
    // Not a remote failure — do not trip breaker; do not count as success either.
    return { opened: false, snapshot: getDualReadObservationBreaker() };
  }

  if (result.status === "REMOTE_READ_UNAVAILABLE") {
    // Missing transport on auto path — skip, do not open.
    return { opened: false, snapshot: getDualReadObservationBreaker() };
  }

  if (result.status === "DRIFT_DETECTED") {
    const report = result.report;
    const actionable =
      report != null ? hasActionableDualReadDrift(report) : true;
    if (actionable) {
      const hasMissing = (result.counts.missing_remote ?? 0) > 0;
      const reason: Exclude<DualReadObservationBreakerReason, null> = hasMissing
        ? "missing_remote"
        : "field_mismatch";
      open(reason);
      return { opened: true, snapshot: getDualReadObservationBreaker() };
    }
    breaker.consecutive_failures = 0;
    breaker.last_success_at = nowIso();
    return { opened: false, snapshot: getDualReadObservationBreaker() };
  }

  if (result.status === "REMOTE_READ_FAILED") {
    const cat = result.category;
    if (cat === "auth") {
      open("auth");
      return { opened: true, snapshot: getDualReadObservationBreaker() };
    }
    if (cat === "invalid_response") {
      open("invalid_response");
      return { opened: true, snapshot: getDualReadObservationBreaker() };
    }
    if (cat && TRANSPORTISH.has(cat)) {
      breaker.consecutive_failures += 1;
      breaker.session_failures += 1;
      if (breaker.consecutive_failures >= 2) {
        open(
          cat === "timeout"
            ? "timeout_consecutive"
            : cat === "rpc"
              ? "rpc_consecutive"
              : "transport_consecutive"
        );
        return { opened: true, snapshot: getDualReadObservationBreaker() };
      }
      if (breaker.session_failures >= 3) {
        open(
          cat === "timeout"
            ? "timeout_session"
            : cat === "rpc"
              ? "rpc_session"
              : "transport_session"
        );
        return { opened: true, snapshot: getDualReadObservationBreaker() };
      }
      return { opened: false, snapshot: getDualReadObservationBreaker() };
    }
    // Unknown category on failed — treat like transport
    breaker.consecutive_failures += 1;
    breaker.session_failures += 1;
    if (breaker.consecutive_failures >= 2 || breaker.session_failures >= 3) {
      open("transport_consecutive");
      return { opened: true, snapshot: getDualReadObservationBreaker() };
    }
  }

  return { opened: false, snapshot: getDualReadObservationBreaker() };
}
