/**
 * Cancellation Stock Release & Safety Audit V1.
 * Contract guards for unpaid cancel → reserved release only.
 * Paid/authorized unwind must use Full Order Refund + restock Runtime.
 * Does not own purchase decrement or refund restock apply paths.
 */

export const CANCELLATION_STOCK_RELEASE_SAFETY_ID =
  "commerce.inventory.cancellation_stock_release_safety_audit_v1" as const;

/** Reservation statuses that cancel/expiry may release (never consumed). */
export const CANCELLATION_RELEASABLE_RESERVATION_STATUSES = [
  "active",
  "pending_capture",
] as const;

/** Payment states that must NOT cancel via reservation release. */
export const CANCELLATION_STOCK_BLOCKED_PAYMENT_STATUSES = [
  "paid",
  "authorized",
] as const;

export type CancellationStockBlockedPaymentStatus =
  (typeof CANCELLATION_STOCK_BLOCKED_PAYMENT_STATUSES)[number];

export function isCancellationStockBlockedPaymentStatus(
  value: unknown
): value is CancellationStockBlockedPaymentStatus {
  return (
    typeof value === "string" &&
    (CANCELLATION_STOCK_BLOCKED_PAYMENT_STATUSES as readonly string[]).includes(
      value
    )
  );
}

/**
 * Seller/admin cancel of paid/authorized orders is forbidden.
 * Money unwind + finite on_hand return = trusted Sync refunded + restock RPC.
 */
export function assertSellerCancelAllowedForStockSafety(input: {
  paymentStatus: unknown;
  hasConsumedReservations?: boolean;
}): { ok: true } | { ok: false; code: string; message: string } {
  if (isCancellationStockBlockedPaymentStatus(input.paymentStatus)) {
    return {
      ok: false,
      code: "paid_cancel_forbidden",
      message:
        "Cannot cancel a paid or authorized order; use full-order refund path.",
    };
  }
  if (input.hasConsumedReservations === true) {
    return {
      ok: false,
      code: "consumed_reservations",
      message:
        "Cannot cancel an order with consumed inventory reservations.",
    };
  }
  return { ok: true };
}

export function cancellationStockReleaseSafetyScope(): {
  id: typeof CANCELLATION_STOCK_RELEASE_SAFETY_ID;
  releaseAdjustsReservedOnly: true;
  releaseNeverIncrementsOnHand: true;
  ownsCancellationRestock: false;
  paidCancelRequiresRefundPath: true;
  releasableReservationStatuses: typeof CANCELLATION_RELEASABLE_RESERVATION_STATUSES;
  blockedPaymentStatuses: typeof CANCELLATION_STOCK_BLOCKED_PAYMENT_STATUSES;
  migration: "20260895_store_cancellation_stock_release_safety_v1.sql";
} {
  return {
    id: CANCELLATION_STOCK_RELEASE_SAFETY_ID,
    releaseAdjustsReservedOnly: true,
    releaseNeverIncrementsOnHand: true,
    ownsCancellationRestock: false,
    paidCancelRequiresRefundPath: true,
    releasableReservationStatuses: CANCELLATION_RELEASABLE_RESERVATION_STATUSES,
    blockedPaymentStatuses: CANCELLATION_STOCK_BLOCKED_PAYMENT_STATUSES,
    migration: "20260895_store_cancellation_stock_release_safety_v1.sql",
  };
}
