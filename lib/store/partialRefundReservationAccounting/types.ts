/**
 * Read-only review types for partial-refund reservation accounting.
 * Committed reservation ≠ completed money refund.
 */

export type PartialRefundAccountingReadStatus =
  | "ok"
  | "unauthorized"
  | "not_found"
  | "validation_failed"
  | "unsupported"
  | "inconsistent_accounting";

export type PartialRefundAccountingNonEvents = {
  providerRefundExecuted: false;
  moneyMoved: false;
  stockRestocked: false;
  entitlementAdjusted: false;
  settlementUnwound: false;
  commissionUnwound: false;
  compensationCompleted: false;
  reservationCreated: false;
  reservationCancelled: false;
};

export const ACCOUNTING_READ_NON_EVENTS: PartialRefundAccountingNonEvents = {
  providerRefundExecuted: false,
  moneyMoved: false,
  stockRestocked: false,
  entitlementAdjusted: false,
  settlementUnwound: false,
  commissionUnwound: false,
  compensationCompleted: false,
  reservationCreated: false,
  reservationCancelled: false,
};

export type PartialRefundAccountingLineReview = {
  orderItemId: string;
  titleSnapshot: string;
  purchasedQuantity: number;
  /** Sum of committed reserved qty for this line (DB-owned aggregate). */
  committedReservedQuantity: number;
  remainingReservableQuantity: number;
};

export type PartialRefundAccountingCommittedView = {
  ledgerId: string;
  status: string;
  currency: string;
  reservedAmountMinor: number;
  calculationFingerprint: string;
  idempotencyKey: string;
  lines: readonly {
    orderItemId: string;
    requestedQuantity: number;
    reservedAmountMinor: number;
  }[];
  createdAtIso: string;
  updatedAtIso: string;
};

export type PartialRefundAccountingReviewModel = {
  storeId: string;
  orderId: string;
  paymentAttemptId: string;
  captureEventId: string;
  currency: string;
  /** Trusted capture amount (attempt/order/capture agreement). */
  captureAmountMinor: number;
  /**
   * DB-owned sum of committed reservation amounts.
   * Zero when no capture-accounting row exists yet.
   */
  committedReservationAmountMinor: number;
  remainingReservableAmountMinor: number;
  /** Optimistic concurrency token; read-only metadata. */
  accountingVersion: number;
  /** True when a durable capture-accounting row exists. */
  captureAccountingPresent: boolean;
  lines: readonly PartialRefundAccountingLineReview[];
  committedReservations: readonly PartialRefundAccountingCommittedView[];
  warning: "ledger_reservation_only_no_provider_refund_or_money_movement";
};
