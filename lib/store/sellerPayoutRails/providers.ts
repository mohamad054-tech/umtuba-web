import type {
  PayoutFailureContract,
  PayoutFailureCode,
  PayoutMethodContract,
  PayoutProviderContract,
} from "./types";

export const PAYOUT_PROVIDER_CONTRACTS: PayoutProviderContract[] = [
  {
    providerId: "mock_clearing",
    displayName: "Mock Clearing Rail",
    enabled: true,
    supportsLiveTransfer: false,
    supportsMockExecution: true,
    supportedMethods: ["mock_wallet", "manual_clearing"],
    notes: "V1 mock provider only. Never moves real funds.",
  },
  {
    providerId: "manual_ops",
    displayName: "Manual Ops Clearing",
    enabled: true,
    supportsLiveTransfer: false,
    supportsMockExecution: true,
    supportedMethods: ["manual_clearing", "bank_transfer_deferred"],
    notes: "Ops bookkeeping rail. Bank transfer remains deferred/disabled.",
  },
];

export const PAYOUT_METHOD_CONTRACTS: PayoutMethodContract[] = [
  {
    methodId: "method.mock_wallet.v1",
    kind: "mock_wallet",
    providerId: "mock_clearing",
    displayName: "Mock Wallet",
    requiresVerifiedAccount: true,
    liveTransferEnabled: false,
    mockOnly: true,
  },
  {
    methodId: "method.manual_clearing.v1",
    kind: "manual_clearing",
    providerId: "manual_ops",
    displayName: "Manual Clearing",
    requiresVerifiedAccount: true,
    liveTransferEnabled: false,
    mockOnly: true,
  },
  {
    methodId: "method.bank_transfer_deferred.v1",
    kind: "bank_transfer_deferred",
    providerId: "manual_ops",
    displayName: "Bank Transfer (Deferred)",
    requiresVerifiedAccount: true,
    liveTransferEnabled: false,
    mockOnly: true,
  },
];

export const PAYOUT_FAILURE_CONTRACTS: Record<
  PayoutFailureCode,
  PayoutFailureContract
> = {
  account_unverified: {
    code: "account_unverified",
    retryable: true,
    userSafeMessage: "Payout account is not verified.",
  },
  ineligible_balance: {
    code: "ineligible_balance",
    retryable: true,
    userSafeMessage: "Available balance is insufficient or blocked.",
  },
  provider_disabled: {
    code: "provider_disabled",
    retryable: false,
    userSafeMessage: "Selected payout provider is disabled.",
  },
  bank_rails_disabled: {
    code: "bank_rails_disabled",
    retryable: false,
    userSafeMessage: "Live bank payout rails are disabled in V1.",
  },
  duplicate_request: {
    code: "duplicate_request",
    retryable: false,
    userSafeMessage: "A payout request with this key already exists.",
  },
  batch_locked: {
    code: "batch_locked",
    retryable: false,
    userSafeMessage: "This payout batch is locked.",
  },
  mock_provider_rejected: {
    code: "mock_provider_rejected",
    retryable: true,
    userSafeMessage: "Mock provider rejected the execution.",
  },
  invalid_amount: {
    code: "invalid_amount",
    retryable: false,
    userSafeMessage: "Payout amount is invalid.",
  },
  currency_mismatch: {
    code: "currency_mismatch",
    retryable: false,
    userSafeMessage: "Currency does not match the payout account.",
  },
};

export function getPayoutProviderContract(
  providerId: string
): PayoutProviderContract | null {
  return (
    PAYOUT_PROVIDER_CONTRACTS.find((p) => p.providerId === providerId) ?? null
  );
}

export function getPayoutMethodContract(
  methodId: string
): PayoutMethodContract | null {
  return PAYOUT_METHOD_CONTRACTS.find((m) => m.methodId === methodId) ?? null;
}

export function assertNoLivePayoutTransfer(providerId: string): void {
  const provider = getPayoutProviderContract(providerId);
  if (!provider || provider.supportsLiveTransfer !== false) {
    throw new Error("Live payout transfers are not allowed.");
  }
  if (providerId.includes("stripe") || providerId.includes("wise") || providerId.includes("paypal")) {
    throw new Error("External live payout providers are forbidden in V1.");
  }
}
