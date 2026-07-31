/**
 * Commerce Seller Payout Rails V1 — contracts + mock execution only.
 * No Stripe Connect, Wise, PayPal, bank API, or real money movement.
 */

export const SELLER_PAYOUT_RAILS_VERSION =
  "commerce-seller-payout-rails-v1" as const;

export const PAYOUT_PROVIDER_IDS = ["mock_clearing", "manual_ops"] as const;
export type PayoutProviderId = (typeof PAYOUT_PROVIDER_IDS)[number];

export const PAYOUT_METHOD_KINDS = [
  "mock_wallet",
  "manual_clearing",
  "bank_transfer_deferred",
] as const;
export type PayoutMethodKind = (typeof PAYOUT_METHOD_KINDS)[number];

export type PayoutAccountVerificationState =
  | "unverified"
  | "pending_review"
  | "verified"
  | "rejected"
  | "suspended";

export type PayoutRequestStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "batched"
  | "executing"
  | "completed"
  | "failed"
  | "cancelled";

export type PayoutBatchStatus =
  | "open"
  | "locked"
  | "executing"
  | "completed"
  | "failed"
  | "cancelled";

export type PayoutExecutionStatus =
  | "planned"
  | "mock_succeeded"
  | "mock_failed"
  | "suppressed";

export type PayoutFailureCode =
  | "account_unverified"
  | "ineligible_balance"
  | "provider_disabled"
  | "bank_rails_disabled"
  | "duplicate_request"
  | "batch_locked"
  | "mock_provider_rejected"
  | "invalid_amount"
  | "currency_mismatch";

/** Provider capability contract — never performs network I/O. */
export type PayoutProviderContract = {
  providerId: PayoutProviderId;
  displayName: string;
  enabled: boolean;
  supportsLiveTransfer: false;
  supportsMockExecution: boolean;
  supportedMethods: PayoutMethodKind[];
  notes: string;
};

export type PayoutMethodContract = {
  methodId: string;
  kind: PayoutMethodKind;
  providerId: PayoutProviderId;
  displayName: string;
  requiresVerifiedAccount: boolean;
  liveTransferEnabled: false;
  mockOnly: true;
};

export type PayoutFailureContract = {
  code: PayoutFailureCode;
  retryable: boolean;
  userSafeMessage: string;
};

export type SellerPayoutAccount = {
  accountId: string;
  storeId: string;
  sellerUserId: string;
  providerId: PayoutProviderId;
  methodKind: PayoutMethodKind;
  verificationState: PayoutAccountVerificationState;
  /** Masked descriptor only — never full account numbers. */
  displayLabel: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
};

export type PayoutEligibility = {
  storeId: string;
  currency: string;
  availableMinor: number;
  blockedMinor: number;
  pendingMinor: number;
  eligible: boolean;
  bankRailsEnabled: false;
  reasons: string[];
  accountId: string | null;
  accountVerificationState: PayoutAccountVerificationState | null;
};

export type SellerPayoutRequest = {
  requestId: string;
  storeId: string;
  sellerUserId: string;
  accountId: string;
  currency: string;
  amountMinor: number;
  status: PayoutRequestStatus;
  batchId: string | null;
  failureCode: PayoutFailureCode | null;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
};

export type SellerPayoutBatch = {
  batchId: string;
  providerId: PayoutProviderId;
  currency: string;
  status: PayoutBatchStatus;
  requestIds: string[];
  totalAmountMinor: number;
  createdAt: string;
  updatedAt: string;
  lockedAt: string | null;
};

export type SellerPayoutExecution = {
  executionId: string;
  batchId: string;
  requestId: string;
  providerId: PayoutProviderId;
  status: PayoutExecutionStatus;
  /** Always mock — never a real provider reference. */
  mockProviderReference: string;
  failureCode: PayoutFailureCode | null;
  executedAt: string;
  note: string;
};

export type SellerPayoutHistoryEntry = {
  historyId: string;
  storeId: string;
  requestId: string;
  batchId: string | null;
  executionId: string | null;
  currency: string;
  amountMinor: number;
  status: PayoutRequestStatus | PayoutExecutionStatus;
  occurredAt: string;
  summary: string;
};
