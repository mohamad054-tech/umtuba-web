/**
 * Commerce Partial Refund Durable Ledger & Commit Boundary V1 — contracts.
 *
 * Owns durable ledger domain + commit *boundary* state machine only.
 * Does NOT execute provider refunds, settlement/commission unwind, restock, or entitlement.
 */

export const PARTIAL_REFUND_LEDGER_ID =
  "commerce.payments.partial_refund_ledger_commit_boundary_v1" as const;

export const PARTIAL_REFUND_LEDGER_VERSION =
  "commerce-partial-refund-ledger-commit-boundary-v1" as const;

/** Explicit ledger commit states — no hidden states. */
export const PARTIAL_REFUND_LEDGER_STATES = [
  "planned",
  "committing",
  "committed",
  "failed",
] as const;

export type PartialRefundLedgerState =
  (typeof PARTIAL_REFUND_LEDGER_STATES)[number];

export type PartialRefundLedgerLineRecord = {
  orderItemId: string;
  requestedQuantity: number;
  /** Trusted computed amount (unitPriceMinor × qty) — never client money. */
  refundAmountMinor: number;
};

export type PartialRefundLedgerCommitRecord = {
  ledgerId: string;
  storeId: string;
  orderId: string;
  paymentAttemptId: string;
  captureEventId: string;
  currency: string;
  /** Trusted computed refund total for this ledger entry. */
  refundAmountMinor: number;
  captureAmountMinor: number;
  calculationFingerprint: string;
  idempotencyKey: string;
  status: PartialRefundLedgerState;
  lines: readonly PartialRefundLedgerLineRecord[];
  /** Optimistic concurrency token observed when planned / last mutated. */
  accountingVersion: number;
  attemptCount: number;
  failureCode: PartialRefundLedgerFailureCode | null;
  failureMessageSafe: string | null;
  createdAtIso: string;
  updatedAtIso: string;
};

export type PartialRefundCaptureAccountingSnapshot = {
  storeId: string;
  orderId: string;
  paymentAttemptId: string;
  captureEventId: string;
  currency: string;
  captureAmountMinor: number;
  /** Sum of refund_amount_minor for status=committed only. */
  committedRefundAmountMinor: number;
  /** Per-line sum of requested_quantity for committed entries. */
  committedQuantityByLineId: Readonly<Record<string, number>>;
  accountingVersion: number;
};

export type PartialRefundLedgerFailureCode =
  | "duplicate_ledger_id"
  | "duplicate_commit"
  | "duplicate_idempotency_key"
  | "unknown_refund"
  | "currency_mismatch"
  | "negative_amount"
  | "zero_amount"
  | "over_refund"
  | "over_quantity"
  | "missing_capture"
  | "missing_order_item"
  | "missing_ownership"
  | "concurrent_conflict"
  | "stale_version"
  | "unsupported_runtime"
  | "unsupported_transition"
  | "invalid_state"
  | "malformed_id"
  | "malformed_idempotency_key"
  | "empty_lines"
  | "inconsistent_line_math";

export type PartialRefundLedgerCapabilityOwnership = {
  /** Durable ledger domain + validation. */
  ownsPartialRefundLedgerDomain: true;
  /** planned→committing→committed|failed boundary (ledger reservation). */
  ownsPartialRefundCommitBoundary: true;
  /** Provider / Sync money movement — still unsupported. */
  ownsPartialRefundMoneyExecution: false;
  ownsPartialRefundProviderRefund: false;
  ownsPartialRefundRestock: false;
  ownsPartialEntitlementAdjustment: false;
  ownsPartialSettlementUnwind: false;
  ownsPartialCommissionUnwind: false;
  note: string;
};

export type PartialRefundLedgerResult<T> =
  | {
      ok: true;
      capability: typeof PARTIAL_REFUND_LEDGER_ID;
      version: typeof PARTIAL_REFUND_LEDGER_VERSION;
      ownership: PartialRefundLedgerCapabilityOwnership;
      value: T;
    }
  | {
      ok: false;
      capability: typeof PARTIAL_REFUND_LEDGER_ID;
      version: typeof PARTIAL_REFUND_LEDGER_VERSION;
      ownership: PartialRefundLedgerCapabilityOwnership;
      code: PartialRefundLedgerFailureCode;
      message: string;
    };

/** Trusted plan input derived from calculatePartialRefundPlan success (no client money). */
export type PartialRefundLedgerPlanInput = {
  ledgerId: string;
  idempotencyKey: string;
  storeId: string;
  orderId: string;
  paymentAttemptId: string;
  captureEventId: string;
  currency: string;
  captureAmountMinor: number;
  refundAmountMinor: number;
  calculationFingerprint: string;
  lines: readonly PartialRefundLedgerLineRecord[];
  /** Observed capture accounting version at plan time (optimistic lock). */
  expectedAccountingVersion: number;
};
