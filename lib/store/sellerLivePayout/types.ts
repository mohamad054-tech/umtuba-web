/**
 * Seller Live Payout Provider V1 — shared types (Slice S1).
 * Contracts only. No provider execution, migrations, or UI.
 */

export const SELLER_LIVE_PAYOUT_PROVIDER_VERSION =
  "commerce-seller-live-payout-provider-v1" as const;

/** Explicit acknowledgment required before live seller payouts may run. */
export const SELLER_LIVE_PAYOUT_PRODUCTION_GATE_ACK_VALUE =
  "I_UNDERSTAND_LIVE_SELLER_PAYOUTS_MOVE_REAL_MONEY" as const;

/**
 * Test-only escape hatch for unit fixtures. Never use for real payouts.
 * Does not enable live payouts without the other gate checks.
 */
export const SELLER_LIVE_PAYOUT_NON_PRODUCTION_FIXTURE_TOKEN =
  "commerce-seller-live-payout-provider-fixture-v1" as const;

/**
 * Live-capable provider ids for V1 architecture.
 * `manual_ops_live` is the V1 target; `stripe_connect` is reserved for a later slice.
 */
export const SELLER_LIVE_PAYOUT_PROVIDER_IDS = [
  "manual_ops_live",
  "stripe_connect",
] as const;

export type SellerLivePayoutProviderId =
  (typeof SELLER_LIVE_PAYOUT_PROVIDER_IDS)[number];

/** V1 default / only enabled live provider when gate is satisfied. */
export const SELLER_LIVE_PAYOUT_V1_PROVIDER_ID =
  "manual_ops_live" as const satisfies SellerLivePayoutProviderId;

export type SellerLivePayoutExecutionStatus =
  | "planned"
  | "awaiting_attestation"
  | "provider_submitted"
  | "succeeded"
  | "failed"
  | "uncertain"
  | "suppressed";

export type SellerLivePayoutTransferStatus =
  | "pending"
  | "succeeded"
  | "failed"
  | "uncertain";

export type SellerLivePayoutDestinationVerificationState =
  | "unverified"
  | "pending_review"
  | "verified"
  | "rejected"
  | "suspended";

export type SellerLivePayoutFailureCode =
  | "gate_incomplete"
  | "provider_disabled"
  | "provider_forbidden"
  | "account_unverified"
  | "ineligible_balance"
  | "duplicate_request"
  | "invalid_amount"
  | "currency_mismatch"
  | "attestation_required"
  | "provider_rejected"
  | "execution_uncertain"
  | "terminal_completed"
  | "destination_invalid"
  | "idempotency_conflict"
  | "booking_failed"
  | "confirm_pending";

/**
 * Orchestrator phase (S4). Not a second payout ledger state machine —
 * ledger remains NONE | IN_TRANSIT | COMPLETED via foundation booking helpers.
 */
export type SellerLivePayoutOrchestrationPhase =
  | "awaiting_attestation"
  | "failed"
  | "uncertain"
  | "completed"
  | "succeeded_pending_confirm"
  | "blocked"
  | "terminal_completed";

export type SellerLivePayoutTransferInput = {
  storeId: string;
  captureEventId: string;
  executionId: string;
  amountMinor: number;
  currency: string;
  /** Server-derived provider idempotency key — never a client money field. */
  idempotencyKey: string;
  destinationId: string;
};

export type SellerLivePayoutTransferResult = {
  status: SellerLivePayoutTransferStatus;
  /** Provider or ops reference — never a secret. */
  providerRef: string | null;
  failureCode: SellerLivePayoutFailureCode | null;
  note: string;
};
