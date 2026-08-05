/**
 * Seller Payout Eligibility Surface V1 (+ Live Payout Provider V1 S7).
 * Seller-facing view-model over trusted payout eligibility (+ optional balance buckets).
 * Live request/destination controls are gated; no client money authority.
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
  | "unauthorized"
  | "live_payout_gate_off"
  | "live_payout_ready"
  | "destination_missing"
  | "destination_unverified"
  | "payout_in_transit"
  | "payout_completed_readonly";

export type SellerPayoutEligibilityCurrencyView = {
  currency: string;
  availableLabel: string;
  availableMinor: number;
  inTransitMinor: number;
  completedMinor: number;
};

/** Safe request candidate — identifiers + server-formatted display only. */
export type SellerLivePayoutRequestCandidateView = {
  paymentAttemptId: string;
  orderId: string;
  amountLabel: string;
  currency: string;
  payoutStatus: "available" | "in_transit" | "completed";
};

export type SellerPayoutDestinationSurfaceView = {
  id: string;
  providerId: string;
  currency: string;
  displayLabel: string;
  verificationState: string;
  isActive: boolean;
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
  /** Traditional bank rails remain disabled in V1. */
  bankRailsDisabled: boolean;
  /** True when live gate + V1 provider are ready for execution path. */
  payoutExecutionEnabled: boolean;
  highlights: SellerPayoutEligibilityHighlight[];
  reasonLines: string[];
  trustedReasonCodes: string[];
  currencyBuckets: SellerPayoutEligibilityCurrencyView[];
  availableCaptureCount: number;
  inTransitCaptureCount: number;
  releaseCurrencyCount: number;
  /** True only when a Request Payout control may be offered. */
  actionButtonsEnabled: boolean;
  livePayoutGateReady: boolean;
  livePayoutProviderEnabled: boolean;
  hasVerifiedActiveDestination: boolean;
  requestPayoutAllowed: boolean;
  livePayoutBlockReason: string | null;
  verifiedDestinationId: string | null;
  destinations: SellerPayoutDestinationSurfaceView[];
  requestCandidates: SellerLivePayoutRequestCandidateView[];
};

export type SellerLivePayoutSurfaceContext = {
  gateReady: boolean;
  providerEnabled: boolean;
  destinations?: SellerPayoutDestinationSurfaceView[];
  /**
   * Trusted capture rows from seller payout read model.
   * Only available RELEASED captures become request candidates.
   */
  captures?: Array<{
    paymentAttemptId: string;
    orderId: string;
    amountMinor: number;
    currency: string;
    settlementState: string;
    payoutStatus: string;
    payoutState?: string;
  }>;
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

function emptyLiveFields(): Pick<
  SellerPayoutEligibilitySurfaceView,
  | "livePayoutGateReady"
  | "livePayoutProviderEnabled"
  | "hasVerifiedActiveDestination"
  | "requestPayoutAllowed"
  | "livePayoutBlockReason"
  | "verifiedDestinationId"
  | "destinations"
  | "requestCandidates"
  | "payoutExecutionEnabled"
  | "actionButtonsEnabled"
  | "bankRailsDisabled"
> {
  return {
    bankRailsDisabled: true,
    payoutExecutionEnabled: false,
    actionButtonsEnabled: false,
    livePayoutGateReady: false,
    livePayoutProviderEnabled: false,
    hasVerifiedActiveDestination: false,
    requestPayoutAllowed: false,
    livePayoutBlockReason: null,
    verifiedDestinationId: null,
    destinations: [],
    requestCandidates: [],
  };
}

function projectRequestCandidates(
  captures: NonNullable<SellerLivePayoutSurfaceContext["captures"]>
): SellerLivePayoutRequestCandidateView[] {
  const out: SellerLivePayoutRequestCandidateView[] = [];
  for (const c of captures) {
    if (!isUuid(c.paymentAttemptId) || !isUuid(c.orderId)) continue;
    const status =
      c.payoutStatus === "in_transit" ||
      c.payoutStatus === "completed" ||
      c.payoutStatus === "available"
        ? c.payoutStatus
        : c.payoutState === "IN_TRANSIT"
          ? "in_transit"
          : c.payoutState === "COMPLETED"
            ? "completed"
            : "available";
    // Only available RELEASED captures are requestable.
    if (status !== "available") continue;
    if (String(c.settlementState).toUpperCase() !== "RELEASED") continue;
    out.push({
      paymentAttemptId: c.paymentAttemptId,
      orderId: c.orderId,
      amountLabel: formatTrustedMoney(c.amountMinor, c.currency),
      currency: String(c.currency).toUpperCase(),
      payoutStatus: "available",
    });
  }
  return out;
}

function resolveLivePayoutFields(
  live: SellerLivePayoutSurfaceContext | undefined,
  eligibilityReady: boolean,
  eligibleBalanceAvailable: boolean
): ReturnType<typeof emptyLiveFields> & {
  highlights: SellerPayoutEligibilityHighlight[];
} {
  const destinations = (live?.destinations ?? []).map((d) => ({
    id: d.id,
    providerId: d.providerId,
    currency: d.currency,
    displayLabel: d.displayLabel,
    verificationState: d.verificationState,
    isActive: d.isActive,
  }));
  const verified = destinations.find(
    (d) => d.verificationState === "verified" && d.isActive
  );
  const gateReady = Boolean(live?.gateReady);
  const providerEnabled = Boolean(live?.providerEnabled);
  const payoutExecutionEnabled = gateReady && providerEnabled;
  const candidates = projectRequestCandidates(live?.captures ?? []);
  const hasVerifiedActiveDestination = Boolean(verified);
  const hasEligibleCapture = candidates.length > 0;

  const highlights: SellerPayoutEligibilityHighlight[] = [];
  let livePayoutBlockReason: string | null = null;

  if (!payoutExecutionEnabled) {
    highlights.push("live_payout_gate_off");
    highlights.push("bank_rails_disabled");
    livePayoutBlockReason = !gateReady
      ? "Live payouts are disabled or the production gate is incomplete."
      : "Live payout provider is not enabled.";
  } else {
    highlights.push("live_payout_ready");
    if (!hasVerifiedActiveDestination) {
      if (destinations.length === 0) {
        highlights.push("destination_missing");
        livePayoutBlockReason =
          "Add a masked payout destination and wait for platform verification.";
      } else {
        highlights.push("destination_unverified");
        livePayoutBlockReason =
          "Destination is pending review or inactive — payout request is unavailable.";
      }
    } else if (!eligibleBalanceAvailable || !hasEligibleCapture) {
      livePayoutBlockReason =
        "No eligible RELEASED capture is available for payout.";
    }
  }

  const requestPayoutAllowed =
    eligibilityReady &&
    payoutExecutionEnabled &&
    hasVerifiedActiveDestination &&
    eligibleBalanceAvailable &&
    hasEligibleCapture;

  return {
    bankRailsDisabled: true,
    payoutExecutionEnabled,
    actionButtonsEnabled: requestPayoutAllowed,
    livePayoutGateReady: gateReady,
    livePayoutProviderEnabled: providerEnabled,
    hasVerifiedActiveDestination,
    requestPayoutAllowed,
    livePayoutBlockReason: requestPayoutAllowed ? null : livePayoutBlockReason,
    verifiedDestinationId: verified?.id ?? null,
    destinations,
    requestCandidates: candidates,
    highlights,
  };
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
  live?: SellerLivePayoutSurfaceContext;
}): SellerPayoutEligibilitySurfaceView {
  const liveEmpty = emptyLiveFields();
  const base = {
    capability: SELLER_PAYOUT_ELIGIBILITY_SURFACE_ID,
    source: SELLER_PAYOUT_READ_MODEL_ID,
    storeId: input.storeId,
    ...liveEmpty,
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

  // Foundation bank rails flag must stay false. Inconsistent payload → fail closed.
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

  const liveFields = resolveLivePayoutFields(
    input.live,
    true,
    eligibleBalanceAvailable
  );

  const highlights: SellerPayoutEligibilityHighlight[] = [
    ...liveFields.highlights,
  ];
  if (eligibleBalanceAvailable) {
    highlights.unshift("eligible_balance_available");
  } else {
    highlights.unshift("no_settled_payable_balance");
  }
  if (input.eligibility.inTransitCaptureCount > 0) {
    highlights.push("payout_in_transit");
  }

  const view: SellerPayoutEligibilitySurfaceView = {
    capability: SELLER_PAYOUT_ELIGIBILITY_SURFACE_ID,
    source: SELLER_PAYOUT_READ_MODEL_ID,
    storeId: input.storeId,
    overallState: "ready",
    message: null,
    balanceVisibilityAvailable,
    eligibleBalanceAvailable,
    bankRailsDisabled: liveFields.bankRailsDisabled,
    payoutExecutionEnabled: liveFields.payoutExecutionEnabled,
    highlights: Array.from(new Set(highlights)),
    reasonLines,
    trustedReasonCodes,
    currencyBuckets: projectEligibilityCurrencyBuckets(input.summary),
    availableCaptureCount: input.eligibility.availableCaptureCount,
    inTransitCaptureCount: input.eligibility.inTransitCaptureCount,
    releaseCurrencyCount: input.eligibility.releaseCurrencyCount,
    actionButtonsEnabled: liveFields.actionButtonsEnabled,
    livePayoutGateReady: liveFields.livePayoutGateReady,
    livePayoutProviderEnabled: liveFields.livePayoutProviderEnabled,
    hasVerifiedActiveDestination: liveFields.hasVerifiedActiveDestination,
    requestPayoutAllowed: liveFields.requestPayoutAllowed,
    livePayoutBlockReason: liveFields.livePayoutBlockReason,
    verifiedDestinationId: liveFields.verifiedDestinationId,
    destinations: liveFields.destinations,
    requestCandidates: liveFields.requestCandidates,
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
  return Boolean(view.actionButtonsEnabled && view.requestPayoutAllowed);
}
