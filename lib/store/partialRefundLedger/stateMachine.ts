/**
 * Explicit ledger commit state machine.
 * planned -> committing -> committed | failed
 * failed -> committing (retry)
 * committed -> compensated (accounting-only unwind)
 * No other transitions.
 */

import type {
  PartialRefundLedgerFailureCode,
  PartialRefundLedgerState,
} from "./types";

export type LedgerTransition =
  | { from: "planned"; to: "committing" }
  | { from: "committing"; to: "committed" }
  | { from: "committing"; to: "failed" }
  | { from: "failed"; to: "committing" }
  | { from: "committed"; to: "compensated" };

const ALLOWED: ReadonlyArray<readonly [PartialRefundLedgerState, PartialRefundLedgerState]> =
  [
    ["planned", "committing"],
    ["committing", "committed"],
    ["committing", "failed"],
    ["failed", "committing"],
    ["committed", "compensated"],
  ];

export function canTransitionPartialRefundLedgerState(
  from: PartialRefundLedgerState,
  to: PartialRefundLedgerState
): boolean {
  return ALLOWED.some(([a, b]) => a === from && b === to);
}

export function assertPartialRefundLedgerTransition(
  from: PartialRefundLedgerState,
  to: PartialRefundLedgerState
):
  | { ok: true }
  | { ok: false; code: PartialRefundLedgerFailureCode; message: string } {
  if (canTransitionPartialRefundLedgerState(from, to)) {
    return { ok: true };
  }
  return {
    ok: false,
    code: "unsupported_transition",
    message: `Unsupported ledger transition ${from} → ${to}.`,
  };
}

/** Retry is allowed only from failed → committing. */
export function isPartialRefundLedgerRetryAllowed(
  status: PartialRefundLedgerState
): boolean {
  return status === "failed";
}
