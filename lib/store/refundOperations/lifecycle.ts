import type { RefundOperationStatus } from "./types";

const ALLOWED: Record<RefundOperationStatus, readonly RefundOperationStatus[]> =
  {
    requested: ["under_review", "rejected", "cancelled"],
    under_review: ["approved", "rejected", "cancelled"],
    approved: ["processing", "cancelled"],
    processing: ["completed", "failed"],
    failed: ["processing"],
    rejected: [],
    completed: [],
    cancelled: [],
  };

export function isRefundOperationStatus(
  value: string
): value is RefundOperationStatus {
  return Object.prototype.hasOwnProperty.call(ALLOWED, value);
}

export function refundOpsTransitionAllowed(
  from: RefundOperationStatus,
  to: RefundOperationStatus
): boolean {
  return ALLOWED[from].includes(to);
}

export function assertRefundOpsTransition(
  from: RefundOperationStatus,
  to: RefundOperationStatus
): { ok: true } | { ok: false; message: string } {
  if (!refundOpsTransitionAllowed(from, to)) {
    return {
      ok: false,
      message: `Illegal refund status transition: ${from} → ${to}.`,
    };
  }
  return { ok: true };
}

export function isTerminalRefundStatus(status: RefundOperationStatus): boolean {
  return (
    status === "rejected" || status === "completed" || status === "cancelled"
  );
}

export function isActiveRefundStatus(status: RefundOperationStatus): boolean {
  return (
    status === "requested" ||
    status === "under_review" ||
    status === "approved" ||
    status === "processing"
  );
}
