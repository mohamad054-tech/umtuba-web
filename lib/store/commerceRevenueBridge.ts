/**
 * Commerce Revenue Ledger Bridge Foundation V1
 *
 * Bridges confirmed Commerce order/payment facts into the shared financial
 * foundation (UEOS + Payment Outcome Sync + Merchant Settlement).
 *
 * Architecture invariants:
 * - Order ≠ Payment ≠ Revenue recognition ≠ Settlement ≠ Payout
 * - Gross order value ≠ merchant earnings
 * - Client money is never authoritative
 * - No Commerce-only ledger / wallet / balance / payout engine
 * - Commission is not fabricated when no trusted policy exists
 * - Seller payout balance visibility (v1) may surface trusted read-model
 *   available/in-transit/completed minors; bank payout execution stays disabled
 */

import {
  STORE_PAYMENT_OUTCOMES,
  STORE_PAYMENT_SYNC_RPC,
  type StorePaymentOutcome,
} from "./paymentOutcomeSync";
import {
  STORE_SETTLEMENT_ACTIONS,
  STORE_SETTLEMENT_RPC,
  type StoreSettlementAction,
} from "./settlementFoundation";
import {
  COMMISSION_POLICY_FOUNDATION_ID,
  calculateCommissionSplit,
  merchandiseNetBasisMinor,
  selectCommissionPolicy,
  type CommissionCalculationResult,
  type CommissionPolicyContract,
} from "./commissionPolicyFoundation";
import {
  classifyTradingPaymentState,
  clientSuppliedMoneyFieldPresent,
  computeExclusiveTaxOrderGrandTotalMinor,
} from "./tradingContracts";
import { isValidCurrencyCode, normalizeCurrencyCode } from "./money";
import { buildMarketplaceRevenueBridgeProvenance } from "./marketplaceSupplierSeller";
import type { OrderStatus, PaymentStatus } from "./types";
import {
  SELLER_PAYOUT_READ_MODEL_ID,
  fetchMySellerPayoutEligibility,
  fetchMySellerPayoutSummary,
  type SellerPayoutEligibility,
  type SellerPayoutSummary,
} from "./sellerPayoutReadModel";
import type { SupabaseClient } from "@supabase/supabase-js";

export const COMMERCE_REVENUE_BRIDGE_VERSION = 1 as const;
export const COMMERCE_REVENUE_BRIDGE_SOURCE_DOMAIN = "commerce" as const;
export const COMMERCE_PAYOUT_BALANCE_VISIBILITY_ID =
  "commerce.revenue.payout_balance_visibility_v1" as const;

export const COMMERCE_FINANCIAL_EVENT_TYPES = [
  "order_confirmed_unpaid",
  "payment_authorized",
  "payment_captured",
  "payment_failed",
  "payment_refunded",
  "order_cancelled_unpaid",
  "order_cancelled_paid_reversal_required",
  "unsupported_payment_state",
] as const;
export type CommerceFinancialEventType =
  (typeof COMMERCE_FINANCIAL_EVENT_TYPES)[number];

/**
 * Eligibility for shared-ledger posting (not seller-available funds).
 * Settlement release / payout remain separate and intentionally withheld.
 */
export const COMMERCE_FINANCIAL_ELIGIBILITY = [
  /** Confirmed order, payment still pending — recordable as pending, not settlement. */
  "pending_payment",
  /** Authorized — preserve classification; no available funds. */
  "authorized_status_only",
  /** Paid/captured — eligible for Sync capture + optional Settlement allocate. */
  "eligible_for_capture_posting",
  /** Failed payment — never seller-available. */
  "excluded_failed_payment",
  /** Unpaid cancel — no seller earnings. */
  "no_seller_earnings",
  /** Paid cancel/refund path — requires compensating Sync refund / settlement reverse. */
  "requires_reversal_or_refund",
  /** Unknown / inconsistent — fail closed. */
  "fail_closed_unknown",
] as const;
export type CommerceFinancialEligibility =
  (typeof COMMERCE_FINANCIAL_ELIGIBILITY)[number];

export type CommerceCommissionDecomposition =
  | {
      /** No trusted active commission policy for this event. */
      policyStatus: "not_configured";
      policyCode: null;
      policyVersion: null;
      platformCommissionMinor: null;
      merchantAmountMinor: null;
      supplierAmountMinor: null;
      affiliateAmountMinor: null;
      partnerAmountMinor: null;
      basisMinor: null;
      calculationFingerprint: null;
      message: string;
    }
  | {
      /** Trusted policy applied via Commission Policy Foundation. */
      policyStatus: "applied";
      policyCode: string;
      policyVersion: number;
      platformCommissionMinor: number;
      merchantAmountMinor: number;
      supplierAmountMinor: number;
      affiliateAmountMinor: number;
      partnerAmountMinor: number;
      basisMinor: number;
      calculationFingerprint: string;
      message: string;
    };

export const COMMISSION_DECOMPOSITION_UNAVAILABLE: Extract<
  CommerceCommissionDecomposition,
  { policyStatus: "not_configured" }
> = {
  policyStatus: "not_configured",
  policyCode: null,
  policyVersion: null,
  platformCommissionMinor: null,
  merchantAmountMinor: null,
  supplierAmountMinor: null,
  affiliateAmountMinor: null,
  partnerAmountMinor: null,
  basisMinor: null,
  calculationFingerprint: null,
  message:
    "Settlement decomposition unavailable — no trusted commission policy is configured. Gross Commerce facts are recorded; merchant share is not assumed.",
};

/** Canonical Commerce financial event — derived from trusted order snapshots only. */
export type CommerceFinancialEvent = {
  version: typeof COMMERCE_REVENUE_BRIDGE_VERSION;
  sourceDomain: typeof COMMERCE_REVENUE_BRIDGE_SOURCE_DOMAIN;
  sourceEventType: CommerceFinancialEventType;
  /** Stable idempotency identity for this bridge event. */
  sourceEventId: string;
  idempotencyKey: string;
  orderId: string;
  storeId: string;
  /** Buyer id only when financially required — optional and minimized. */
  buyerUserId: string | null;
  currency: string;
  grossItemAmountMinor: number;
  discountAmountMinor: number;
  taxAmountMinor: number;
  deliveryAmountMinor: number;
  grandTotalMinor: number;
  paymentStatus: string;
  orderStatus: string;
  paymentClassification: ReturnType<typeof classifyTradingPaymentState>;
  financialEligibility: CommerceFinancialEligibility;
  occurredAt: string;
  paymentAttemptId: string | null;
  commission: CommerceCommissionDecomposition;
  /** Marketplace provenance — never invents commission or earnings. */
  marketplace: {
    sellerStoreId: string;
    supplierStoreId: string | null;
    listingId: string | null;
    marketplaceSourceType: "owned" | "supplier_listing" | null;
    settlementDecomposition: "unavailable";
  };
};

export type CommerceOrderMoneySnapshot = {
  orderId: string;
  storeId: string;
  buyerUserId?: string | null;
  currency: string;
  subtotalMinor: number;
  discountTotalMinor: number;
  taxTotalMinor: number;
  shippingTotalMinor: number;
  grandTotalMinor: number;
  paymentStatus: PaymentStatus | string;
  orderStatus: OrderStatus | string;
  occurredAt: string;
  paymentAttemptId?: string | null;
  supplierStoreId?: string | null;
  sellerListingId?: string | null;
  marketplaceSourceType?: "owned" | "supplier_listing" | null;
};

export type CommerceRevenueBridgePostingPlan = {
  sync: {
    rpc: typeof STORE_PAYMENT_SYNC_RPC;
    paymentAttemptId: string;
    outcome: StorePaymentOutcome;
    eventKey: string;
    correlationId: string;
  } | null;
  settlement: {
    rpc: typeof STORE_SETTLEMENT_RPC;
    action: StoreSettlementAction;
    eventKey: string;
    correlationId: string;
    paymentAttemptId: string;
    /** Amount/currency must match capture — never from client. */
    amountFromOrderOnly: true;
  } | null;
  willPostLedger: boolean;
  reason: string;
};

export type CommerceRevenueBridgeResult = {
  ok: boolean;
  event: CommerceFinancialEvent | null;
  plan: CommerceRevenueBridgePostingPlan | null;
  postingStatus:
    | "not_attempted"
    | "planned_only"
    | "sync_replayed"
    | "sync_posted"
    | "settlement_planned"
    | "failed"
    | "rejected";
  message: string;
  reconciliationIssues: CommerceRevenueReconciliationIssue[];
};

export type CommerceRevenueReconciliationIssueCode =
  | "confirmed_paid_without_financial_event"
  | "duplicate_source_event"
  | "order_unresolvable"
  | "currency_mismatch"
  | "amount_mismatch"
  | "unsupported_payment_state"
  | "missing_commission_policy"
  | "bridge_failure_review_required"
  | "missing_money_snapshot"
  | "missing_payment_attempt"
  | "client_money_rejected"
  | "unauthorized"
  | "ledger_posting_requires_service_role";

export type CommerceRevenueReconciliationIssue = {
  code: CommerceRevenueReconciliationIssueCode;
  severity: "info" | "warning" | "error";
  message: string;
  orderId?: string;
  storeId?: string;
  sourceEventId?: string;
};

/** Seller-facing honest visibility — never invents balances/payouts. */
export type CommerceRevenueBridgePayoutCurrencyBalance = {
  currency: string;
  availablePayoutMinor: number;
  inTransitMinor: number;
  completedMinor: number;
};

export type CommerceRevenueBridgePayoutBalances = {
  /** True when balances are backed by Seller Payout Read Model RPCs. */
  balanceVisibilityEnabled: boolean;
  source: typeof SELLER_PAYOUT_READ_MODEL_ID | "unavailable";
  byCurrency: CommerceRevenueBridgePayoutCurrencyBalance[];
  failedEventCount: number;
  hasAvailableForPayout: boolean;
};

export type CommerceRevenueBridgeSellerVisibility = {
  financialLedgerConnected: boolean;
  paidOrderValueRecordedHint: string;
  settlementStatus: "pending" | "not_enabled" | "decomposition_unavailable";
  settlementDecompositionUnavailable: boolean;
  /** Bank/rail execution — remains false until rails exist. */
  payoutsEnabled: boolean;
  /** True when settled payout balances are visible from trusted reads. */
  balanceVisibilityEnabled: boolean;
  payoutBalances: CommerceRevenueBridgePayoutBalances | null;
  /** Explicit withhold list for UI honesty. */
  withheldUnsupportedValues: readonly string[];
  summaryLines: string[];
  capability: typeof COMMERCE_PAYOUT_BALANCE_VISIBILITY_ID;
};

/** Always withheld — never invent commission/net/reserve/payout schedule. */
export const BRIDGE_ALWAYS_WITHHELD_SELLER_VALUES = [
  "net_earnings",
  "commission",
  "reserve",
  "payout_date",
] as const;

/**
 * Historic withhold list (pre balance-visibility). Kept for compatibility
 * assertions when trusted payout reads are unavailable.
 */
export const BRIDGE_WITHHELD_SELLER_VALUES = [
  "available_payout",
  "net_earnings",
  "seller_balance",
  "commission",
  "reserve",
  "payout_date",
] as const;

/** When balance visibility is on, only non-payout-balance fields stay withheld. */
export const BRIDGE_WITHHELD_WHEN_BALANCE_VISIBLE = [
  ...BRIDGE_ALWAYS_WITHHELD_SELLER_VALUES,
] as const;

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isNonNegInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/**
 * Reject any client-authored money on bridge invocation.
 * Callers must pass only identifiers; amounts reload from order snapshots.
 */
export function rejectClientBridgeMoneyFields(input: Record<string, unknown>): {
  ok: true;
} | { ok: false; message: string; issue: CommerceRevenueReconciliationIssue } {
  for (const key of Object.keys(input)) {
    if (
      /minor|amount|total|price|commission|balance|payout/i.test(key) &&
      clientSuppliedMoneyFieldPresent(input[key])
    ) {
      return {
        ok: false,
        message: "Client must not supply money fields to the revenue bridge.",
        issue: {
          code: "client_money_rejected",
          severity: "error",
          message: `Rejected client money field: ${key}`,
        },
      };
    }
  }
  return { ok: true };
}

export function validateCommerceOrderMoneySnapshot(
  input: CommerceOrderMoneySnapshot
):
  | { ok: true; currency: string; grandTotalMinor: number }
  | { ok: false; message: string; issue: CommerceRevenueReconciliationIssue } {
  if (!input.orderId || !isUuid(input.orderId)) {
    return {
      ok: false,
      message: "Order id is invalid.",
      issue: {
        code: "order_unresolvable",
        severity: "error",
        message: "Order id missing or invalid.",
        orderId: input.orderId,
      },
    };
  }
  if (!input.storeId || !isUuid(input.storeId)) {
    return {
      ok: false,
      message: "Store id is invalid.",
      issue: {
        code: "order_unresolvable",
        severity: "error",
        message: "Store id missing or invalid.",
        orderId: input.orderId,
        storeId: input.storeId,
      },
    };
  }

  const currency = normalizeCurrencyCode(input.currency);
  if (!currency || !isValidCurrencyCode(currency)) {
    return {
      ok: false,
      message: "Order currency is invalid.",
      issue: {
        code: "currency_mismatch",
        severity: "error",
        message: "Currency missing or unsupported.",
        orderId: input.orderId,
        storeId: input.storeId,
      },
    };
  }

  if (
    !isNonNegInt(input.subtotalMinor) ||
    !isNonNegInt(input.discountTotalMinor) ||
    !isNonNegInt(input.taxTotalMinor) ||
    !isNonNegInt(input.shippingTotalMinor) ||
    !isNonNegInt(input.grandTotalMinor)
  ) {
    return {
      ok: false,
      message: "Order money snapshot is incomplete.",
      issue: {
        code: "missing_money_snapshot",
        severity: "error",
        message: "One or more money fields are missing or non-integer.",
        orderId: input.orderId,
        storeId: input.storeId,
      },
    };
  }

  if (input.discountTotalMinor > input.subtotalMinor) {
    return {
      ok: false,
      message: "Discount exceeds subtotal.",
      issue: {
        code: "amount_mismatch",
        severity: "error",
        message: "Discount cannot exceed subtotal.",
        orderId: input.orderId,
        storeId: input.storeId,
      },
    };
  }

  const expected = computeExclusiveTaxOrderGrandTotalMinor({
    subtotalMinor: input.subtotalMinor,
    discountTotalMinor: input.discountTotalMinor,
    taxTotalMinor: input.taxTotalMinor,
    shippingTotalMinor: input.shippingTotalMinor,
  });
  if (expected !== input.grandTotalMinor) {
    return {
      ok: false,
      message: "Order grand total does not match money components.",
      issue: {
        code: "amount_mismatch",
        severity: "error",
        message: `Expected grand total ${expected}, got ${input.grandTotalMinor}.`,
        orderId: input.orderId,
        storeId: input.storeId,
      },
    };
  }

  return { ok: true, currency, grandTotalMinor: input.grandTotalMinor };
}

export function resolveCommerceFinancialEligibility(input: {
  paymentStatus: string;
  orderStatus: string;
}): {
  eligibility: CommerceFinancialEligibility;
  sourceEventType: CommerceFinancialEventType;
  syncOutcome: StorePaymentOutcome | null;
} {
  const paymentStatus = String(input.paymentStatus);
  const orderStatus = String(input.orderStatus);
  const knownPayments = [
    "pending",
    "authorized",
    "paid",
    "failed",
    "refunded",
    "cancelled",
  ];

  if (!knownPayments.includes(paymentStatus)) {
    return {
      eligibility: "fail_closed_unknown",
      sourceEventType: "unsupported_payment_state",
      syncOutcome: null,
    };
  }

  if (orderStatus === "cancelled" && paymentStatus === "pending") {
    return {
      eligibility: "no_seller_earnings",
      sourceEventType: "order_cancelled_unpaid",
      syncOutcome: "cancelled",
    };
  }

  if (
    orderStatus === "cancelled" &&
    (paymentStatus === "paid" || paymentStatus === "refunded")
  ) {
    return {
      eligibility: "requires_reversal_or_refund",
      sourceEventType: "order_cancelled_paid_reversal_required",
      syncOutcome: paymentStatus === "refunded" ? "refunded" : null,
    };
  }

  if (paymentStatus === "failed") {
    return {
      eligibility: "excluded_failed_payment",
      sourceEventType: "payment_failed",
      syncOutcome: "failed",
    };
  }

  if (paymentStatus === "refunded") {
    return {
      eligibility: "requires_reversal_or_refund",
      sourceEventType: "payment_refunded",
      syncOutcome: "refunded",
    };
  }

  if (paymentStatus === "paid") {
    return {
      eligibility: "eligible_for_capture_posting",
      sourceEventType: "payment_captured",
      syncOutcome: "captured",
    };
  }

  if (paymentStatus === "authorized") {
    return {
      eligibility: "authorized_status_only",
      sourceEventType: "payment_authorized",
      syncOutcome: "authorized",
    };
  }

  return {
    eligibility: "pending_payment",
    sourceEventType: "order_confirmed_unpaid",
    syncOutcome: null,
  };
}

export function mapCommissionCalculationToBridgeDecomposition(
  calc: CommissionCalculationResult
): Extract<CommerceCommissionDecomposition, { policyStatus: "applied" }> {
  return {
    policyStatus: "applied",
    policyCode: calc.policyCode,
    policyVersion: calc.policyVersion,
    platformCommissionMinor: calc.platformCommissionMinor,
    merchantAmountMinor: calc.sellerAmountMinor,
    supplierAmountMinor: calc.supplierAmountMinor,
    affiliateAmountMinor: calc.affiliateAmountMinor,
    partnerAmountMinor: calc.partnerAmountMinor,
    basisMinor: calc.basisMinor,
    calculationFingerprint: calc.calculationFingerprint,
    message: `Trusted commission policy ${calc.policyCode}@v${calc.policyVersion} applied (${COMMISSION_POLICY_FOUNDATION_ID}). Settlement capture amounts remain unchanged.`,
  };
}

export function resolveCommissionForOrderSnapshot(input: {
  snapshot: CommerceOrderMoneySnapshot;
  policies?: CommissionPolicyContract[] | null;
}): CommerceCommissionDecomposition {
  const policies = input.policies ?? [];
  if (policies.length === 0) {
    return COMMISSION_DECOMPOSITION_UNAVAILABLE;
  }

  const currency = normalizeCurrencyCode(input.snapshot.currency);
  if (!currency) {
    return COMMISSION_DECOMPOSITION_UNAVAILABLE;
  }

  const selected = selectCommissionPolicy({
    policies,
    currency,
    at: input.snapshot.occurredAt,
  });
  if (!selected.ok) {
    return COMMISSION_DECOMPOSITION_UNAVAILABLE;
  }

  const basisMinor =
    selected.policy.basisKind === "merchandise_net"
      ? merchandiseNetBasisMinor({
          subtotalMinor: input.snapshot.subtotalMinor,
          discountTotalMinor: input.snapshot.discountTotalMinor,
        })
      : input.snapshot.grandTotalMinor;

  if (basisMinor == null || !Number.isInteger(input.snapshot.grandTotalMinor)) {
    return COMMISSION_DECOMPOSITION_UNAVAILABLE;
  }

  const calc = calculateCommissionSplit({
    policy: selected.policy,
    basisMinor,
    currency,
  });
  if (!calc.ok) {
    return COMMISSION_DECOMPOSITION_UNAVAILABLE;
  }
  return mapCommissionCalculationToBridgeDecomposition(calc);
}

export function buildCommerceFinancialIdempotencyKey(input: {
  orderId: string;
  sourceEventType: CommerceFinancialEventType;
  paymentAttemptId?: string | null;
}): { sourceEventId: string; idempotencyKey: string } {
  const attempt = input.paymentAttemptId?.trim() || "none";
  const sourceEventId = [
    "commerce",
    `v${COMMERCE_REVENUE_BRIDGE_VERSION}`,
    input.sourceEventType,
    input.orderId,
    attempt,
  ].join(":");
  return { sourceEventId, idempotencyKey: sourceEventId };
}

export function buildCommerceFinancialEvent(
  snapshot: CommerceOrderMoneySnapshot,
  options?: { commissionPolicies?: CommissionPolicyContract[] | null }
):
  | { ok: true; event: CommerceFinancialEvent }
  | {
      ok: false;
      message: string;
      issue: CommerceRevenueReconciliationIssue;
    } {
  const validated = validateCommerceOrderMoneySnapshot(snapshot);
  if (!validated.ok) return validated;

  const { eligibility, sourceEventType } = resolveCommerceFinancialEligibility({
    paymentStatus: snapshot.paymentStatus,
    orderStatus: snapshot.orderStatus,
  });

  const paymentClassification = classifyTradingPaymentState({
    paymentStatus: snapshot.paymentStatus,
    status: snapshot.orderStatus,
  });

  const { sourceEventId, idempotencyKey } = buildCommerceFinancialIdempotencyKey(
    {
      orderId: snapshot.orderId,
      sourceEventType,
      paymentAttemptId: snapshot.paymentAttemptId,
    }
  );

  const commission = resolveCommissionForOrderSnapshot({
    snapshot,
    policies: options?.commissionPolicies,
  });

  const event: CommerceFinancialEvent = {
    version: COMMERCE_REVENUE_BRIDGE_VERSION,
    sourceDomain: COMMERCE_REVENUE_BRIDGE_SOURCE_DOMAIN,
    sourceEventType,
    sourceEventId,
    idempotencyKey,
    orderId: snapshot.orderId,
    storeId: snapshot.storeId,
    buyerUserId: snapshot.buyerUserId ?? null,
    currency: validated.currency,
    grossItemAmountMinor: snapshot.subtotalMinor,
    discountAmountMinor: snapshot.discountTotalMinor,
    taxAmountMinor: snapshot.taxTotalMinor,
    deliveryAmountMinor: snapshot.shippingTotalMinor,
    grandTotalMinor: validated.grandTotalMinor,
    paymentStatus: String(snapshot.paymentStatus),
    orderStatus: String(snapshot.orderStatus),
    paymentClassification,
    financialEligibility: eligibility,
    occurredAt: snapshot.occurredAt,
    paymentAttemptId: snapshot.paymentAttemptId ?? null,
    commission,
    marketplace: buildMarketplaceRevenueBridgeProvenance({
      sellerStoreId: snapshot.storeId,
      supplierStoreId: snapshot.supplierStoreId,
      listingId: snapshot.sellerListingId,
      marketplaceSourceType: snapshot.marketplaceSourceType,
    }),
  };

  return { ok: true, event };
}

/**
 * Plan Sync / Settlement posting against existing shared RPCs.
 * Does not invent commission or release to payable (payouts not enabled).
 */
export function planCommerceRevenueBridgePosting(
  event: CommerceFinancialEvent,
  options?: { allocateSettlement?: boolean }
): CommerceRevenueBridgePostingPlan {
  const allocateSettlement = options?.allocateSettlement === true;
  const correlationId = `corr:${event.idempotencyKey}`;

  if (event.financialEligibility === "fail_closed_unknown") {
    return {
      sync: null,
      settlement: null,
      willPostLedger: false,
      reason: "Unknown payment state — fail closed; no ledger posting.",
    };
  }

  if (event.financialEligibility === "excluded_failed_payment") {
    return {
      sync: null,
      settlement: null,
      willPostLedger: false,
      reason: "Failed payment is excluded from seller-available funds.",
    };
  }

  if (event.financialEligibility === "no_seller_earnings") {
    return {
      sync: null,
      settlement: null,
      willPostLedger: false,
      reason: "Unpaid cancellation produces no seller earnings.",
    };
  }

  if (event.financialEligibility === "pending_payment") {
    return {
      sync: null,
      settlement: null,
      willPostLedger: false,
      reason:
        "Order confirmed with payment pending — financial event is pending, not settlement-eligible.",
    };
  }

  if (event.financialEligibility === "authorized_status_only") {
    if (!event.paymentAttemptId) {
      return {
        sync: null,
        settlement: null,
        willPostLedger: false,
        reason: "Authorized payment lacks payment attempt id — status only.",
      };
    }
    return {
      sync: {
        rpc: STORE_PAYMENT_SYNC_RPC,
        paymentAttemptId: event.paymentAttemptId,
        outcome: "authorized",
        eventKey: event.idempotencyKey,
        correlationId,
      },
      settlement: null,
      willPostLedger: true,
      reason:
        "Authorized outcome may be recorded as status-only Sync (no available funds).",
    };
  }

  if (event.financialEligibility === "requires_reversal_or_refund") {
    if (
      !event.paymentAttemptId ||
      event.sourceEventType !== "payment_refunded"
    ) {
      return {
        sync: null,
        settlement: null,
        willPostLedger: false,
        reason:
          "Paid cancellation/refund requires compensating Sync refund and/or settlement reverse — not deletion. Attempt or refund provenance missing.",
      };
    }
    return {
      sync: {
        rpc: STORE_PAYMENT_SYNC_RPC,
        paymentAttemptId: event.paymentAttemptId,
        outcome: "refunded",
        eventKey: event.idempotencyKey,
        correlationId,
      },
      settlement: null,
      willPostLedger: true,
      reason:
        "Refund Sync posting reverses capture hold. Settlement reverse must be planned separately when allocation exists.",
    };
  }

  if (!event.paymentAttemptId) {
    return {
      sync: null,
      settlement: null,
      willPostLedger: false,
      reason:
        "Paid order is eligible for capture posting but payment attempt id is missing.",
    };
  }

  const settlement = allocateSettlement
    ? {
        rpc: STORE_SETTLEMENT_RPC,
        action: "allocate" as const,
        eventKey: `${event.idempotencyKey}:allocate`,
        correlationId,
        paymentAttemptId: event.paymentAttemptId,
        amountFromOrderOnly: true as const,
      }
    : null;

  return {
    sync: {
      rpc: STORE_PAYMENT_SYNC_RPC,
      paymentAttemptId: event.paymentAttemptId,
      outcome: "captured",
      eventKey: event.idempotencyKey,
      correlationId,
    },
    settlement,
    willPostLedger: true,
    reason: allocateSettlement
      ? "Capture Sync + Settlement allocate planned. Commission decomposition unavailable; release/payout not enabled."
      : "Capture Sync planned. Settlement allocate deferred; payouts not enabled.",
  };
}

export function mapTrustedPayoutSummaryToBridgeBalances(
  summary: SellerPayoutSummary,
  eligibility?: SellerPayoutEligibility | null
): CommerceRevenueBridgePayoutBalances {
  return {
    balanceVisibilityEnabled: true,
    source: SELLER_PAYOUT_READ_MODEL_ID,
    byCurrency: summary.byCurrency.map((b) => ({
      currency: b.currency,
      availablePayoutMinor: b.availableMinor,
      inTransitMinor: b.inTransitMinor,
      completedMinor: b.completedMinor,
    })),
    failedEventCount: summary.failedEventCount,
    hasAvailableForPayout: Boolean(eligibility?.hasAvailableForPayout),
  };
}

function formatMinorHint(amount: number, currency: string): string {
  return `${amount} ${currency} minor`;
}

export function buildSellerRevenueBridgeVisibility(input?: {
  hasPaidOrdersInWindow?: boolean;
  /** Trusted payout summary — never client-authored money. */
  payoutSummary?: SellerPayoutSummary | null;
  payoutEligibility?: SellerPayoutEligibility | null;
  /** True when read-model RPC failed / unavailable (fail closed on balances). */
  payoutReadUnavailable?: boolean;
}): CommerceRevenueBridgeSellerVisibility {
  const hasPaid = Boolean(input?.hasPaidOrdersInWindow);
  const summary = input?.payoutSummary ?? null;
  const eligibility = input?.payoutEligibility ?? null;
  const readUnavailable = Boolean(input?.payoutReadUnavailable);

  const balances =
    !readUnavailable && summary
      ? mapTrustedPayoutSummaryToBridgeBalances(summary, eligibility)
      : null;

  const balanceVisibilityEnabled = Boolean(balances?.balanceVisibilityEnabled);

  const withheld = balanceVisibilityEnabled
    ? BRIDGE_WITHHELD_WHEN_BALANCE_VISIBLE
    : BRIDGE_WITHHELD_SELLER_VALUES;

  const summaryLines: string[] = [
    "Financial ledger connected (UEOS + Payment Outcome Sync + Settlement foundations).",
    hasPaid
      ? "Paid order value recorded from immutable order money snapshots."
      : "Paid order value will appear when trusted paid orders exist.",
    "Settlement decomposition unavailable — no trusted commission policy.",
    "Bank payout rails are not enabled (payoutsEnabled=false).",
  ];

  if (balanceVisibilityEnabled && balances) {
    summaryLines.push(
      "Settled payout balances are visible from the Seller Payout Read Model (trusted server reads)."
    );
    if (balances.byCurrency.length === 0) {
      summaryLines.push(
        "No RELEASED settled captures currently project available, in-transit, or completed payout balances."
      );
    } else {
      for (const row of balances.byCurrency) {
        summaryLines.push(
          `${row.currency}: available ${formatMinorHint(row.availablePayoutMinor, row.currency)}; in-transit ${formatMinorHint(row.inTransitMinor, row.currency)}; completed ${formatMinorHint(row.completedMinor, row.currency)}.`
        );
      }
    }
    if (balances.failedEventCount > 0) {
      summaryLines.push(
        `Recorded payout fail events: ${balances.failedEventCount} (funds return to available when fail completes).`
      );
    }
  } else if (readUnavailable) {
    summaryLines.push(
      "Payout balance visibility unavailable — trusted payout read model did not return (fail closed)."
    );
  } else {
    summaryLines.push(
      "Settlement pending — merchant escrow/payable posting is not auto-released to payouts."
    );
    summaryLines.push("Payout balance fields remain withheld until trusted payout reads are supplied.");
  }

  return {
    financialLedgerConnected: true,
    paidOrderValueRecordedHint: hasPaid
      ? "Paid order value is recorded from trusted order snapshots (payment_status = paid)."
      : "No paid orders in the current window — paid order value remains zero until trusted paid snapshots exist.",
    settlementStatus: "decomposition_unavailable",
    settlementDecompositionUnavailable: true,
    payoutsEnabled: false,
    balanceVisibilityEnabled,
    payoutBalances: balances,
    withheldUnsupportedValues: withheld,
    summaryLines,
    capability: COMMERCE_PAYOUT_BALANCE_VISIBILITY_ID,
  };
}

/**
 * Server-side loader: owner/manager payout reads → Revenue Bridge visibility.
 * Never accepts client money. Fail closed → balances withheld.
 */
export async function loadSellerRevenueBridgeVisibility(
  supabase: SupabaseClient,
  storeId: string,
  options?: { hasPaidOrdersInWindow?: boolean }
): Promise<CommerceRevenueBridgeSellerVisibility> {
  const moneyGate = rejectClientBridgeMoneyFields({ store_id: storeId });
  if (!moneyGate.ok) {
    return buildSellerRevenueBridgeVisibility({
      hasPaidOrdersInWindow: options?.hasPaidOrdersInWindow,
      payoutReadUnavailable: true,
    });
  }

  const [summaryRes, eligibilityRes] = await Promise.all([
    fetchMySellerPayoutSummary(supabase, storeId),
    fetchMySellerPayoutEligibility(supabase, storeId),
  ]);

  if (!summaryRes.ok || !eligibilityRes.ok) {
    return buildSellerRevenueBridgeVisibility({
      hasPaidOrdersInWindow: options?.hasPaidOrdersInWindow,
      payoutReadUnavailable: true,
    });
  }

  if (summaryRes.data.bankPayoutsEnabled || eligibilityRes.data.bankPayoutsEnabled) {
    // Defense in depth: read model must keep bank rails disabled.
    return buildSellerRevenueBridgeVisibility({
      hasPaidOrdersInWindow: options?.hasPaidOrdersInWindow,
      payoutReadUnavailable: true,
    });
  }

  return buildSellerRevenueBridgeVisibility({
    hasPaidOrdersInWindow: options?.hasPaidOrdersInWindow,
    payoutSummary: summaryRes.data,
    payoutEligibility: eligibilityRes.data,
  });
}

export type AdminCommerceBridgeStatusRow = {
  label: string;
  value: string;
};

/** Bounded admin/ops visibility — no secrets, no fabricated balances. */
export function buildAdminCommerceBridgeStatus(): AdminCommerceBridgeStatusRow[] {
  return [
    { label: "Bridge", value: "Commerce Revenue Ledger Bridge Foundation V1" },
    { label: "Source domain", value: COMMERCE_REVENUE_BRIDGE_SOURCE_DOMAIN },
    { label: "Version", value: String(COMMERCE_REVENUE_BRIDGE_VERSION) },
    {
      label: "Ledger path",
      value: `${STORE_PAYMENT_SYNC_RPC} → ${STORE_SETTLEMENT_RPC} → UEOS`,
    },
    {
      label: "Commission policy",
      value:
        "foundation available (commerce.revenue.commission_policy_foundation_v1); no active policy seed — merchant share not assumed until activated",
    },
    {
      label: "Payouts (bank rails)",
      value: "not_enabled",
    },
    {
      label: "Payout balance visibility",
      value: "via Seller Payout Read Model (execution still disabled)",
    },
    {
      label: "Posting privilege",
      value: "service_role only (existing Sync/Settlement EXECUTE grants)",
    },
    {
      label: "Historical backfill",
      value: "disabled — dry-run diagnostics only; no automatic backfill",
    },
  ];
}

/**
 * Pure reconciliation diagnostic against provided trusted facts.
 * Does not query private ledger tables (FORCE RLS / service_role).
 */
export function diagnoseCommerceRevenueBridge(input: {
  orders: Array<{
    orderId: string;
    storeId: string;
    paymentStatus: string;
    orderStatus: string;
    currency: string;
    grandTotalMinor: number;
    hasCaptureFinancialEvent?: boolean;
    captureAmountMinor?: number | null;
    captureCurrency?: string | null;
  }>;
}): CommerceRevenueReconciliationIssue[] {
  const issues: CommerceRevenueReconciliationIssue[] = [];
  issues.push({
    code: "missing_commission_policy",
    severity: "info",
    message: COMMISSION_DECOMPOSITION_UNAVAILABLE.message,
  });

  for (const order of input.orders) {
    const eligibility = resolveCommerceFinancialEligibility({
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
    });

    if (eligibility.eligibility === "fail_closed_unknown") {
      issues.push({
        code: "unsupported_payment_state",
        severity: "error",
        message: `Unsupported payment state '${order.paymentStatus}'.`,
        orderId: order.orderId,
        storeId: order.storeId,
      });
      continue;
    }

    if (
      eligibility.eligibility === "eligible_for_capture_posting" &&
      !order.hasCaptureFinancialEvent
    ) {
      issues.push({
        code: "confirmed_paid_without_financial_event",
        severity: "warning",
        message:
          "Paid order has no recorded capture financial event — bridge posting may be required (manual/service-role).",
        orderId: order.orderId,
        storeId: order.storeId,
      });
    }

    if (
      order.hasCaptureFinancialEvent &&
      order.captureAmountMinor != null &&
      order.captureAmountMinor !== order.grandTotalMinor
    ) {
      issues.push({
        code: "amount_mismatch",
        severity: "error",
        message: "Capture event amount does not match order grand total.",
        orderId: order.orderId,
        storeId: order.storeId,
      });
    }

    if (
      order.hasCaptureFinancialEvent &&
      order.captureCurrency &&
      normalizeCurrencyCode(order.captureCurrency) !==
        normalizeCurrencyCode(order.currency)
    ) {
      issues.push({
        code: "currency_mismatch",
        severity: "error",
        message: "Capture event currency does not match order currency.",
        orderId: order.orderId,
        storeId: order.storeId,
      });
    }
  }

  return issues;
}

/** Dry-run historical eligibility — never posts or invents money. */
export function dryRunHistoricalBridgeEligibility(
  orders: CommerceOrderMoneySnapshot[]
): {
  eligibleForCapturePosting: number;
  pendingPayment: number;
  excludedFailed: number;
  requiresReversal: number;
  failClosed: number;
  noSellerEarnings: number;
  issues: CommerceRevenueReconciliationIssue[];
} {
  let eligibleForCapturePosting = 0;
  let pendingPayment = 0;
  let excludedFailed = 0;
  let requiresReversal = 0;
  let failClosed = 0;
  let noSellerEarnings = 0;
  const issues: CommerceRevenueReconciliationIssue[] = [];

  for (const order of orders) {
    const built = buildCommerceFinancialEvent(order);
    if (!built.ok) {
      issues.push(built.issue);
      failClosed += 1;
      continue;
    }
    switch (built.event.financialEligibility) {
      case "eligible_for_capture_posting":
        eligibleForCapturePosting += 1;
        break;
      case "pending_payment":
      case "authorized_status_only":
        pendingPayment += 1;
        break;
      case "excluded_failed_payment":
        excludedFailed += 1;
        break;
      case "requires_reversal_or_refund":
        requiresReversal += 1;
        break;
      case "no_seller_earnings":
        noSellerEarnings += 1;
        break;
      default:
        failClosed += 1;
    }
  }

  issues.push({
    code: "bridge_failure_review_required",
    severity: "info",
    message:
      "Historical dry-run complete. Automatic backfill is disabled — run an explicit controlled backfill task later.",
  });

  return {
    eligibleForCapturePosting,
    pendingPayment,
    excludedFailed,
    requiresReversal,
    failClosed,
    noSellerEarnings,
    issues,
  };
}

export function assertStorePaymentOutcome(
  value: string
): value is StorePaymentOutcome {
  return (STORE_PAYMENT_OUTCOMES as readonly string[]).includes(value);
}

export function assertStoreSettlementAction(
  value: string
): value is StoreSettlementAction {
  return (STORE_SETTLEMENT_ACTIONS as readonly string[]).includes(value);
}
