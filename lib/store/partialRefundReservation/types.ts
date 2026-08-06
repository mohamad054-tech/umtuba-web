/**
 * Stable action result codes for reservation-only wiring.
 */

export type PartialRefundReservationActionStatus =
  | "reservation_committed"
  | "reservation_replayed"
  | "validation_failed"
  | "stale_version"
  | "idempotency_conflict"
  | "unauthorized"
  | "not_found"
  | "unsupported";

export type PartialRefundReservationLineIntentInput = {
  orderItemId: string;
  requestedQuantity: number;
};

export type PartialRefundReservationSafeCommitView = {
  ledgerId: string;
  storeId: string;
  orderId: string;
  captureEventId: string;
  status: string;
  currency: string;
  /** Trusted reserved amount — not a completed money refund. */
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

export type PartialRefundReservationNonEvents = {
  providerRefundExecuted: false;
  moneyMoved: false;
  stockRestocked: false;
  entitlementAdjusted: false;
  settlementUnwound: false;
  commissionUnwound: false;
  compensationCompleted: false;
};

export const RESERVATION_NON_EVENTS: PartialRefundReservationNonEvents = {
  providerRefundExecuted: false,
  moneyMoved: false,
  stockRestocked: false,
  entitlementAdjusted: false,
  settlementUnwound: false,
  commissionUnwound: false,
  compensationCompleted: false,
};
