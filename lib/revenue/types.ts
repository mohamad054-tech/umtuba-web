/**
 * Unified Revenue Platform Foundation V1 — shared contracts.
 * Cross-product financial reference for UMTUBA. No UI. No DB. No PSP.
 *
 * Related (do not replace):
 * - lib/wallet — UM Points presentation wallet
 * - lib/store/settlementFoundation — Commerce merchant settlement
 * - lib/store/payments — Commerce payment attempt abstraction
 * - lib/ads/platform/billing — Ads billing evaluation (non-authoritative V1)
 */

export const REVENUE_PLATFORM_VERSION = "v1" as const;

export const REVENUE_CURRENCIES = ["USD", "EUR", "GBP", "SAR", "AED", "EGP"] as const;
export type RevenueCurrency = (typeof REVENUE_CURRENCIES)[number];

/** Integer minor units only — never floats for money. */
export type RevenueMoney = {
  currency: RevenueCurrency;
  amountMinor: number;
};

export const REVENUE_SOURCE_IDS = [
  "commerce",
  "learning",
  "games",
  "ads",
  "live",
  "tips",
  "gifts",
  "subscriptions",
  "ai",
  "future",
] as const;
export type RevenueSourceId = (typeof REVENUE_SOURCE_IDS)[number];

export const REVENUE_CONSUMER_IDS = [
  "user",
  "creator",
  "seller",
  "supplier",
  "platform",
  "affiliate",
  "advertiser",
] as const;
export type RevenueConsumerId = (typeof REVENUE_CONSUMER_IDS)[number];

export const REVENUE_EVENT_TYPES = [
  "payment_received",
  "payment_failed",
  "payout_requested",
  "payout_completed",
  "commission_created",
  "refund_requested",
  "refund_completed",
  "wallet_credit",
  "wallet_debit",
] as const;
export type RevenueEventType = (typeof REVENUE_EVENT_TYPES)[number];

export const REVENUE_TRANSACTION_KINDS = [
  "payment",
  "payout",
  "commission",
  "fee",
  "refund",
  "adjustment",
  "settlement",
  "wallet_transfer",
  "earning",
  "revenue_share",
] as const;
export type RevenueTransactionKind = (typeof REVENUE_TRANSACTION_KINDS)[number];

export const REVENUE_TRANSACTION_STATUSES = [
  "proposed",
  "posted",
  "failed",
  "reversed",
] as const;
export type RevenueTransactionStatus =
  (typeof REVENUE_TRANSACTION_STATUSES)[number];

export const REVENUE_LEDGER_ENTRY_SIDES = ["debit", "credit"] as const;
export type RevenueLedgerEntrySide =
  (typeof REVENUE_LEDGER_ENTRY_SIDES)[number];

export const REVENUE_ACCOUNT_KINDS = [
  "wallet_available",
  "wallet_pending",
  "escrow",
  "payable",
  "receivable",
  "platform_revenue",
  "platform_liability",
  "fees",
  "commissions",
] as const;
export type RevenueAccountKind = (typeof REVENUE_ACCOUNT_KINDS)[number];

export type RevenueAccountRef = {
  accountId: string;
  ownerConsumerId: RevenueConsumerId;
  ownerSubjectId: string;
  accountKind: RevenueAccountKind;
  currency: RevenueCurrency;
};

export type RevenueWallet = {
  walletId: string;
  ownerConsumerId: RevenueConsumerId;
  ownerSubjectId: string;
  currency: RevenueCurrency;
  /** Derived display fields — never mutate directly; post ledger entries. */
  availableMinor: number;
  pendingMinor: number;
  createdAt: string;
  updatedAt: string;
};

export type RevenueLedgerEntry = {
  entryId: string;
  ledgerId: string;
  transactionId: string;
  accountId: string;
  side: RevenueLedgerEntrySide;
  amountMinor: number;
  currency: RevenueCurrency;
  /** Immutable once posted. */
  postedAt: string;
  memo: string | null;
};

export type RevenueTransaction = {
  transactionId: string;
  kind: RevenueTransactionKind;
  status: RevenueTransactionStatus;
  sourceId: RevenueSourceId;
  money: RevenueMoney;
  /** Party that pays / is charged when applicable. */
  fromConsumerId: RevenueConsumerId | null;
  fromSubjectId: string | null;
  /** Party that receives when applicable. */
  toConsumerId: RevenueConsumerId | null;
  toSubjectId: string | null;
  externalRef: string | null;
  createdAt: string;
  postedAt: string | null;
};

export type RevenueEvent = {
  eventId: string;
  eventType: RevenueEventType;
  sourceId: RevenueSourceId;
  transactionId: string | null;
  walletId: string | null;
  money: RevenueMoney | null;
  occurredAt: string;
  /** Bounded metadata — never secrets / provider payloads. */
  metadata: Record<string, string | number | boolean | null>;
};

export type RevenueSourceDefinition = {
  sourceId: RevenueSourceId;
  label: string;
  description: string;
  enabled: boolean;
};

export type RevenueConsumerDefinition = {
  consumerId: RevenueConsumerId;
  label: string;
  description: string;
  canHoldWallet: boolean;
  canReceivePayout: boolean;
  enabled: boolean;
};

/**
 * Reserved payment-rail hooks — noop / null in V1.
 */
export type RevenueProviderHooks = {
  stripe?: (input: unknown) => unknown | null;
  paypal?: (input: unknown) => unknown | null;
  apple?: (input: unknown) => unknown | null;
  google?: (input: unknown) => unknown | null;
  crypto?: (input: unknown) => unknown | null;
  bankTransfer?: (input: unknown) => unknown | null;
};

export type RevenueBillingHooks = {
  onInvoiceDraft?: (input: unknown) => unknown | null;
  onSubscriptionCycle?: (input: unknown) => unknown | null;
  onTaxEstimate?: (input: unknown) => unknown | null;
};

export function createNoopRevenueProviderHooks(): RevenueProviderHooks {
  return {
    stripe: () => null,
    paypal: () => null,
    apple: () => null,
    google: () => null,
    crypto: () => null,
    bankTransfer: () => null,
  };
}

export function createNoopRevenueBillingHooks(): RevenueBillingHooks {
  return {
    onInvoiceDraft: () => null,
    onSubscriptionCycle: () => null,
    onTaxEstimate: () => null,
  };
}
