/**
 * Commerce Partial Refund Path V1 — foundation contracts.
 * Calculation / validation only. No commit, Stripe, settlement unwind, or payout.
 */

export const PARTIAL_REFUND_PATH_ID =
  "commerce.payments.partial_refund_path_v1" as const;

export const PARTIAL_REFUND_PATH_VERSION =
  "commerce-partial-refund-path-foundation-v1" as const;

/** Client/intent may only select lines + quantities — never money. */
export type PartialRefundLineIntent = {
  orderItemId: string;
  requestedQuantity: number;
};

/**
 * Trusted stored order-line facts (from orders/order_items + capture context).
 * Never accept client money fields into this shape without re-deriving server-side.
 */
export type TrustedPartialRefundLineFact = {
  orderItemId: string;
  orderId: string;
  storeId: string;
  purchasedQuantity: number;
  /** Immutable unit price from order_items.unit_price_minor. */
  unitPriceMinor: number;
  /** Must equal unitPriceMinor * purchasedQuantity. */
  totalPriceMinor: number;
  currency: string;
};

export type TrustedPartialRefundCaptureFact = {
  storeId: string;
  orderId: string;
  paymentAttemptId: string;
  captureEventId: string;
  /** Full trusted capture amount (payment outcome / attempt agreement). */
  captureAmountMinor: number;
  currency: string;
};

/**
 * Prior committed partial/full refunds against the same capture/order.
 * Until a durable line ledger exists, callers must supply this from trusted stores.
 * Foundation does not invent settlement/commission unwind from these totals.
 */
export type TrustedPartialRefundPriorAccounting = {
  /** Sum of previously committed refund money (minor) for this capture/order. */
  priorRefundedAmountMinor: number;
  /** Per-line previously committed refunded quantities. */
  priorRefundedQuantityByLineId: Readonly<Record<string, number>>;
};

export type PartialRefundFailureCode =
  | "malformed_id"
  | "malformed_quantity"
  | "unknown_line"
  | "duplicate_line"
  | "zero_quantity"
  | "negative_quantity"
  | "over_quantity"
  | "over_refund"
  | "currency_mismatch"
  | "inconsistent_line_math"
  | "inconsistent_prior_accounting"
  | "empty_selection"
  | "client_money_rejected"
  | "unsupported_commit"
  | "unsupported_settlement_unwind"
  | "unsupported_entitlement_adjustment"
  | "unsupported_restock";

export type PartialRefundComputedLine = {
  orderItemId: string;
  requestedQuantity: number;
  remainingQuantityBefore: number;
  remainingQuantityAfter: number;
  /** Deterministic: unitPriceMinor * requestedQuantity. */
  refundAmountMinor: number;
  currency: string;
};

export type PartialRefundCalculationSuccess = {
  ok: true;
  capability: typeof PARTIAL_REFUND_PATH_ID;
  version: typeof PARTIAL_REFUND_PATH_VERSION;
  storeId: string;
  orderId: string;
  paymentAttemptId: string;
  captureEventId: string;
  currency: string;
  captureAmountMinor: number;
  priorRefundedAmountMinor: number;
  remainingRefundableAmountMinor: number;
  computedRefundAmountMinor: number;
  remainingRefundableAmountAfterMinor: number;
  lines: PartialRefundComputedLine[];
  /** True when selection refunds every remaining unit on every line and remaining money. */
  isFullRemainingCaptureRefund: boolean;
  /** Stable fingerprint of trusted inputs + intent (idempotency contract). */
  calculationFingerprint: string;
  ownership: PartialRefundCapabilityOwnership;
};

export type PartialRefundCalculationFailure = {
  ok: false;
  capability: typeof PARTIAL_REFUND_PATH_ID;
  version: typeof PARTIAL_REFUND_PATH_VERSION;
  code: PartialRefundFailureCode;
  message: string;
  ownership: PartialRefundCapabilityOwnership;
};

export type PartialRefundCalculationResult =
  | PartialRefundCalculationSuccess
  | PartialRefundCalculationFailure;

export type PartialRefundCapabilityOwnership = {
  ownsPartialRefundCalculation: true;
  /** Durable commit / Sync refund / ops execution — not in this foundation. */
  ownsPartialRefundCommit: false;
  ownsPartialRefundRestock: false;
  ownsPartialEntitlementAdjustment: false;
  ownsPartialSettlementUnwind: false;
  ownsPartialCommissionUnwind: false;
  note: string;
};
