/**
 * Provider execution status transitions.
 * uncertain → succeeded|failed only via recovery (never auto-compensate).
 */

import type { PartialRefundProviderExecutionStatus } from "./types";

export const PARTIAL_REFUND_PROVIDER_EXECUTION_TRANSITIONS: Record<
  PartialRefundProviderExecutionStatus,
  readonly PartialRefundProviderExecutionStatus[]
> = {
  planned: ["executing", "failed"],
  executing: ["succeeded", "failed", "uncertain"],
  uncertain: ["succeeded", "failed", "uncertain"],
  succeeded: ["succeeded"],
  failed: ["failed"],
};

export function canTransitionPartialRefundProviderExecution(
  from: PartialRefundProviderExecutionStatus,
  to: PartialRefundProviderExecutionStatus
): boolean {
  if (from === to) return true;
  return (
    PARTIAL_REFUND_PROVIDER_EXECUTION_TRANSITIONS[from]?.includes(to) ?? false
  );
}

export function isTerminalProviderExecutionStatus(
  status: PartialRefundProviderExecutionStatus
): boolean {
  return status === "succeeded" || status === "failed";
}

export function isUncertainProviderExecutionStatus(
  status: PartialRefundProviderExecutionStatus
): boolean {
  return status === "uncertain";
}
