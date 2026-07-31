/**
 * Seller Payout Eligibility Surface V1.
 * Seller-facing view-model over trusted payout eligibility (+ optional balance buckets).
 * Read-only. No writes, bank rails, client money, or client-authored flags.
 */

import { SELLER_PAYOUT_READ_MODEL_ID } from "./sellerPayoutReadModel";
import type {
  SellerPayoutEligibility,
  SellerPayoutSummary,
} from "./sellerPayoutReadModel";
import { formatTrustedMoney } from "./tradingContracts";

export const SELLER_PAYOUT_ELIGIBILITY_SURFACE_ID =
  "commerce.settlement.seller_payout_eligibility_surface_v1" as const;

/** Trusted reason codes from `get_my_seller_payout_eligibility`. */
export const SELLER_PAYOUT_ELIGIBILITY_REASON_CODES = [
  "no_available_settled_balance",
  "has_in_transit_payouts",
] as const;
export type SellerPayoutEligibilityReasonCode =
  (typeof SELLER_PAYOUT_ELIGIBILITY_REASON_CODES)[number];

const SAFE_REASON_COPY: Record<SellerPayoutEligibilityReasonCode, string> = {
  no_available_settled_balance:
    "No settled payable balance is currently available for payout.",
  has_in_transit_payouts:
    "Some funds are still in transit from a prior payout booking.",
};

const SENSITIVE_RENDER_PATTERNS = [
  /request_fingerprint/i,
  /fingerprint_alg/i,
  /ueos_journal/i,
  /journal_entry/i,
  /policy_id/i,
  /bank_account/i,
  /beneficiary/i,
  /\brail\b/i,
  /provider_reference/i,
  /provider_payload/i,
  /metadata/i,
] as const;

export type SellerPayoutEligibilityOverallState =
  | "ready"
  | "unavailable"
  | "unauthorized";

export type SellerPayoutEligibilityHighlight =
  | "eligible_balance_available"
  | "no_settled_payable_balance"
  | "bank_rails_disabled"
  | "payout_reads_unavailable"
  | "unauthorized";

export type SellerPayoutEligibilityCurrencyView = {
  currency: string;
  availableLabel: string;
  availableMinor: number;
  inTransitMinor: number;
  completedMinor: number;
};

export type SellerPayoutEligibilitySurfaceView = {
  capability: typeof SELLER_PAYOUT_ELIGIBILITY_SURFACE_ID;
  source: typeof SELLER_PAYOUT_READ_MODEL_ID;
  storeId: string;
  overallState: SellerPayoutEligibilityOverallState;
  message: string | null;
  /** Balance visibility / eligibility read succeeded and is trusted. */
  balanceVisibilityAvailable: boolean;
  eligibleBalanceAvailable: boolean;
  bankRailsDisabled: true;
  payoutExecutionEnabled: false;
  highlights: SellerPayoutEligibilityHighlight[];
  reasonLines: string[];
  trustedReasonCodes: string[];
  currencyBuckets: SellerPayoutEligibilityCurrencyView[];
  availableCaptureCount: number;
  inTransitCaptureCount: number;
  releaseCurrencyCount: number;
  actionButtonsEnabled: false;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export function mapEligibilityReasonToSellerCopy(
  code: string
): string | null {
  if (
    (SELLER_PAYOUT_ELIGIBILITY_REASON_CODES as readonly string[]).includes(code)
  ) {
    return SAFE_REASON_COPY[code as SellerPayoutEligibilityReasonCode];
  }
  // Unknown codes: fail closed — do not echo raw/internal strings.
  return null;
}

export function assertEligibilityBelongsToStore(
  eligibility: SellerPayoutEligibility,
  storeId: string
): { ok: true } | { ok: false; message: string } {
  if (!storeId || !isUuid(storeId)) {
    return { ok: false, message: "Store is invalid." };
  }
  if (eligibility.storeId !== storeId) {
    return {
      ok: false,
      message: "Payout eligibility does not belong to this store.",
    };
  }
  return { ok: true };
}

export function projectEligibilityCurrencyBuckets(
  summary: SellerPayoutSummary | null | undefined
): SellerPayoutEligibilityCurrencyView[] {
  if (!summary) return [];
  return summary.byCurrency.map((b) => ({
    currency: b.currency.toUpperCase(),
    availableLabel: formatTrustedMoney(b.availableMinor, b.currency),
    availableMinor: b.availableMinor,
    inTransitMinor: b.inTransitMinor,
    completedMinor: b.completedMinor,
  }));
}

function surfaceContainsSensitiveFields(
  view: SellerPayoutEligibilitySurfaceView
): boolean {
  const blob = JSON.stringify(view);
  return SENSITIVE_RENDER_PATTERNS.some((re) => re.test(blob));
}

/**
 * Fail-closed eligibility surface. Never trusts client money or client flags.
 */
export function buildSellerPayoutEligibilitySurface(input: {
  storeId: string;
  eligibility: SellerPayoutEligibility | null;
  summary?: SellerPayoutSummary | null;
  unavailable?: boolean;
  unauthorized?: boolean;
  errorMessage?: string | null;
}): SellerPayoutEligibilitySurfaceView {
  const base = {
    capability: SELLER_PAYOUT_ELIGIBILITY_SURFACE_ID,
    source: SELLER_PAYOUT_READ_MODEL_ID,
    storeId: input.storeId,
    bankRailsDisabled: true as const,
    payoutExecutionEnabled: false as const,
    actionButtonsEnabled: false as const,
  };

  if (input.unauthorized) {
    return {
      ...base,
      overallState: "unauthorized",
      message:
        input.errorMessage?.trim() ||
        "You cannot view payout eligibility for this store.",
      balanceVisibilityAvailable: false,
      eligibleBalanceAvailable: false,
      highlights: ["unauthorized", "bank_rails_disabled"],
      reasonLines: [],
      trustedReasonCodes: [],
      currencyBuckets: [],
      availableCaptureCount: 0,
      inTransitCaptureCount: 0,
      releaseCurrencyCount: 0,
    };
  }

  if (input.unavailable || !input.eligibility) {
    return {
      ...base,
      overallState: "unavailable",
      message:
        input.errorMessage?.trim() ||
        "Payout eligibility is unavailable until trusted payout reads succeed.",
      balanceVisibilityAvailable: false,
      eligibleBalanceAvailable: false,
      highlights: ["payout_reads_unavailable", "bank_rails_disabled"],
      reasonLines: [],
      trustedReasonCodes: [],
      currencyBuckets: [],
      availableCaptureCount: 0,
      inTransitCaptureCount: 0,
      releaseCurrencyCount: 0,
    };
  }

  const ownership = assertEligibilityBelongsToStore(
    input.eligibility,
    input.storeId
  );
  if (!ownership.ok) {
    return {
      ...base,
      overallState: "unauthorized",
      message: ownership.message,
      balanceVisibilityAvailable: false,
      eligibleBalanceAvailable: false,
      highlights: ["unauthorized", "bank_rails_disabled"],
      reasonLines: [],
      trustedReasonCodes: [],
      currencyBuckets: [],
      availableCaptureCount: 0,
      inTransitCaptureCount: 0,
      releaseCurrencyCount: 0,
    };
  }

  // V1 contract: bank rails must remain disabled. Inconsistent payload → fail closed.
  if (input.eligibility.bankPayoutsEnabled) {
    return {
      ...base,
      overallState: "unavailable",
      message: "Payout eligibility payload is inconsistent.",
      balanceVisibilityAvailable: false,
      eligibleBalanceAvailable: false,
      highlights: ["payout_reads_unavailable", "bank_rails_disabled"],
      reasonLines: [],
      trustedReasonCodes: [],
      currencyBuckets: [],
      availableCaptureCount: 0,
      inTransitCaptureCount: 0,
      releaseCurrencyCount: 0,
    };
  }

  if (input.summary && input.summary.storeId !== input.storeId) {
    return {
      ...base,
      overallState: "unauthorized",
      message: "Payout summary does not belong to this store.",
      balanceVisibilityAvailable: false,
      eligibleBalanceAvailable: false,
      highlights: ["unauthorized", "bank_rails_disabled"],
      reasonLines: [],
      trustedReasonCodes: [],
      currencyBuckets: [],
      availableCaptureCount: 0,
      inTransitCaptureCount: 0,
      releaseCurrencyCount: 0,
    };
  }

  const trustedReasonCodes = input.eligibility.reasons.filter(Boolean);
  const reasonLines = trustedReasonCodes
    .map(mapEligibilityReasonToSellerCopy)
    .filter((line): line is string => Boolean(line));

  const balanceVisibilityAvailable = Boolean(
    input.eligibility.eligibleForBalanceRead
  );
  const eligibleBalanceAvailable = Boolean(
    input.eligibility.hasAvailableForPayout
  );

  const highlights: SellerPayoutEligibilityHighlight[] = [
    "bank_rails_disabled",
  ];
  if (eligibleBalanceAvailable) {
    highlights.unshift("eligible_balance_available");
  } else {
    highlights.unshift("no_settled_payable_balance");
  }

  const view: SellerPayoutEligibilitySurfaceView = {
    ...base,
    overallState: "ready",
    message: null,
    balanceVisibilityAvailable,
    eligibleBalanceAvailable,
    highlights,
    reasonLines,
    trustedReasonCodes,
    currencyBuckets: projectEligibilityCurrencyBuckets(input.summary),
    availableCaptureCount: input.eligibility.availableCaptureCount,
    inTransitCaptureCount: input.eligibility.inTransitCaptureCount,
    releaseCurrencyCount: input.eligibility.releaseCurrencyCount,
  };

  if (surfaceContainsSensitiveFields(view)) {
    return {
      ...base,
      overallState: "unavailable",
      message: "Payout eligibility payload is unsafe.",
      balanceVisibilityAvailable: false,
      eligibleBalanceAvailable: false,
      highlights: ["payout_reads_unavailable", "bank_rails_disabled"],
      reasonLines: [],
      trustedReasonCodes: [],
      currencyBuckets: [],
      availableCaptureCount: 0,
      inTransitCaptureCount: 0,
      releaseCurrencyCount: 0,
    };
  }

  return view;
}

export function eligibilitySurfaceHasActionButtons(
  view: SellerPayoutEligibilitySurfaceView
): boolean {
  // V1: action buttons are hard-disabled while bank rails remain off.
  void view;
  return false;
}
