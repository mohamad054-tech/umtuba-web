import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type {
  SellerPayoutEligibility,
  SellerPayoutSummary,
} from "./sellerPayoutReadModel";
import {
  SELLER_PAYOUT_ELIGIBILITY_SURFACE_ID,
  assertEligibilityBelongsToStore,
  buildSellerPayoutEligibilitySurface,
  eligibilitySurfaceHasActionButtons,
  mapEligibilityReasonToSellerCopy,
  projectEligibilityCurrencyBuckets,
} from "./sellerPayoutEligibilitySurface";

const ROOT = process.cwd();
const DOC =
  "docs/store/implementation/SELLER_PAYOUT_ELIGIBILITY_SURFACE_V1.md";
const COMPONENT = "app/components/store/SellerPayoutEligibility.tsx";
const DEST_FORM = "app/components/store/SellerPayoutDestinationForm.tsx";
const REQUEST_BTN = "app/components/store/SellerPayoutRequestButton.tsx";
const PAGE = "app/seller/store/page.tsx";
const INSIGHTS = "app/components/store/SellerDashboardInsights.tsx";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

const STORE = "11111111-1111-4111-8111-111111111111";
const ATTEMPT = "33333333-3333-4333-8333-333333333333";
const ORDER = "22222222-2222-4222-8222-222222222222";
const DEST = "66666666-6666-4666-8666-666666666666";

function eligibility(
  overrides: Partial<SellerPayoutEligibility> = {}
): SellerPayoutEligibility {
  return {
    storeId: STORE,
    eligibleForBalanceRead: true,
    hasAvailableForPayout: true,
    availableCaptureCount: 2,
    inTransitCaptureCount: 0,
    releaseCurrencyCount: 1,
    bankPayoutsEnabled: false,
    reasons: [],
    capability: "commerce.settlement.seller_payout_read_model_v1",
    ...overrides,
  };
}

function summary(
  overrides: Partial<SellerPayoutSummary> = {}
): SellerPayoutSummary {
  return {
    storeId: STORE,
    byCurrency: [
      {
        currency: "USD",
        availableMinor: 1500,
        inTransitMinor: 0,
        completedMinor: 500,
        availableCount: 2,
        inTransitCount: 0,
        completedCount: 1,
      },
      {
        currency: "ZAR",
        availableMinor: 2500,
        inTransitMinor: 100,
        completedMinor: 0,
        availableCount: 1,
        inTransitCount: 1,
        completedCount: 0,
      },
    ],
    failedEventCount: 0,
    bankPayoutsEnabled: false,
    capability: "commerce.settlement.seller_payout_read_model_v1",
    ...overrides,
  };
}

const verifiedDest = {
  id: DEST,
  providerId: "manual_ops_live",
  currency: "USD",
  displayLabel: "Ops clearing •••• 42",
  verificationState: "verified",
  isActive: true,
};

const availableCapture = {
  paymentAttemptId: ATTEMPT,
  orderId: ORDER,
  amountMinor: 1500,
  currency: "USD",
  settlementState: "RELEASED",
  payoutStatus: "available",
  payoutState: "NONE",
};

describe("Seller Payout Eligibility Surface V1 — files", () => {
  it("ships documentation and seller store wiring", () => {
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(existsSync(join(ROOT, COMPONENT))).toBe(true);
    expect(existsSync(join(ROOT, DEST_FORM))).toBe(true);
    expect(existsSync(join(ROOT, REQUEST_BTN))).toBe(true);
    expect(read(PAGE)).toMatch(/fetchMySellerPayoutEligibility/);
    expect(read(PAGE)).toMatch(/buildSellerPayoutEligibilitySurface/);
    expect(read(PAGE)).toMatch(/listMyStorePayoutDestinations/);
    expect(read(INSIGHTS)).toMatch(/SellerPayoutEligibility/);
    expect(read(COMPONENT)).toMatch(/Payout eligibility/);
  });
});

describe("Seller Payout Eligibility Surface V1 — projection", () => {
  it("eligible seller state renders correctly", () => {
    const surface = buildSellerPayoutEligibilitySurface({
      storeId: STORE,
      eligibility: eligibility(),
      summary: summary(),
    });
    expect(surface.overallState).toBe("ready");
    expect(surface.eligibleBalanceAvailable).toBe(true);
    expect(surface.balanceVisibilityAvailable).toBe(true);
    expect(surface.highlights).toContain("eligible_balance_available");
    expect(surface.highlights).toContain("bank_rails_disabled");
    expect(surface.bankRailsDisabled).toBe(true);
    expect(surface.payoutExecutionEnabled).toBe(false);
    expect(surface.actionButtonsEnabled).toBe(false);
  });

  it("no settled payable balance state", () => {
    const surface = buildSellerPayoutEligibilitySurface({
      storeId: STORE,
      eligibility: eligibility({
        hasAvailableForPayout: false,
        availableCaptureCount: 0,
        reasons: ["no_available_settled_balance"],
      }),
    });
    expect(surface.overallState).toBe("ready");
    expect(surface.eligibleBalanceAvailable).toBe(false);
    expect(surface.highlights).toContain("no_settled_payable_balance");
    expect(surface.reasonLines[0]).toMatch(/No settled payable balance/i);
    expect(mapEligibilityReasonToSellerCopy("no_available_settled_balance")).toMatch(
      /settled/i
    );
  });

  it("bank rails / live gate OFF keeps request disabled with honest messaging", () => {
    const surface = buildSellerPayoutEligibilitySurface({
      storeId: STORE,
      eligibility: eligibility(),
    });
    expect(surface.bankRailsDisabled).toBe(true);
    expect(surface.highlights).toContain("bank_rails_disabled");
    expect(surface.highlights).toContain("live_payout_gate_off");
    expect(surface.actionButtonsEnabled).toBe(false);
    expect(eligibilitySurfaceHasActionButtons(surface)).toBe(false);
    expect(surface.livePayoutBlockReason).toMatch(/disabled|incomplete/i);

    const inconsistent = buildSellerPayoutEligibilitySurface({
      storeId: STORE,
      eligibility: eligibility({ bankPayoutsEnabled: true }),
    });
    expect(inconsistent.overallState).toBe("unavailable");
  });

  it("gate ready + verified destination + eligible capture enables request", () => {
    const surface = buildSellerPayoutEligibilitySurface({
      storeId: STORE,
      eligibility: eligibility(),
      summary: summary(),
      live: {
        gateReady: true,
        providerEnabled: true,
        destinations: [verifiedDest],
        captures: [availableCapture],
      },
    });
    expect(surface.payoutExecutionEnabled).toBe(true);
    expect(surface.hasVerifiedActiveDestination).toBe(true);
    expect(surface.requestCandidates).toHaveLength(1);
    expect(surface.requestPayoutAllowed).toBe(true);
    expect(surface.actionButtonsEnabled).toBe(true);
    expect(eligibilitySurfaceHasActionButtons(surface)).toBe(true);
    expect(surface.highlights).toContain("live_payout_ready");
    expect(surface.verifiedDestinationId).toBe(DEST);
  });

  it("missing verified destination blocks request", () => {
    const pending = buildSellerPayoutEligibilitySurface({
      storeId: STORE,
      eligibility: eligibility(),
      live: {
        gateReady: true,
        providerEnabled: true,
        destinations: [
          {
            ...verifiedDest,
            verificationState: "pending_review",
          },
        ],
        captures: [availableCapture],
      },
    });
    expect(pending.requestPayoutAllowed).toBe(false);
    expect(pending.highlights).toContain("destination_unverified");
    expect(pending.livePayoutBlockReason).toMatch(/pending review/i);

    const missing = buildSellerPayoutEligibilitySurface({
      storeId: STORE,
      eligibility: eligibility(),
      live: {
        gateReady: true,
        providerEnabled: true,
        destinations: [],
        captures: [availableCapture],
      },
    });
    expect(missing.highlights).toContain("destination_missing");
    expect(missing.requestPayoutAllowed).toBe(false);
  });

  it("in-transit and completed captures are not request candidates", () => {
    const surface = buildSellerPayoutEligibilitySurface({
      storeId: STORE,
      eligibility: eligibility({
        hasAvailableForPayout: false,
        availableCaptureCount: 0,
        inTransitCaptureCount: 1,
      }),
      live: {
        gateReady: true,
        providerEnabled: true,
        destinations: [verifiedDest],
        captures: [
          {
            ...availableCapture,
            payoutStatus: "in_transit",
            payoutState: "IN_TRANSIT",
          },
          {
            ...availableCapture,
            paymentAttemptId: "44444444-4444-4444-8444-444444444444",
            payoutStatus: "completed",
            payoutState: "COMPLETED",
          },
        ],
      },
    });
    expect(surface.requestCandidates).toHaveLength(0);
    expect(surface.requestPayoutAllowed).toBe(false);
    expect(surface.highlights).toContain("payout_in_transit");
  });

  it("failed capture may return to available when read model says available", () => {
    const surface = buildSellerPayoutEligibilitySurface({
      storeId: STORE,
      eligibility: eligibility(),
      live: {
        gateReady: true,
        providerEnabled: true,
        destinations: [verifiedDest],
        captures: [
          {
            ...availableCapture,
            payoutStatus: "available",
            payoutState: "NONE",
          },
        ],
      },
    });
    expect(surface.requestCandidates).toHaveLength(1);
    expect(surface.requestPayoutAllowed).toBe(true);
  });

  it("payout reads unavailable state", () => {
    const surface = buildSellerPayoutEligibilitySurface({
      storeId: STORE,
      eligibility: null,
      unavailable: true,
      errorMessage:
        "Seller payout read model is unavailable until the migration is applied.",
    });
    expect(surface.overallState).toBe("unavailable");
    expect(surface.highlights).toContain("payout_reads_unavailable");
    expect(surface.balanceVisibilityAvailable).toBe(false);
  });

  it("unauthorized / foreign store fails closed", () => {
    const foreign = eligibility({
      storeId: "99999999-9999-4999-8999-999999999999",
    });
    expect(assertEligibilityBelongsToStore(foreign, STORE).ok).toBe(false);
    const surface = buildSellerPayoutEligibilitySurface({
      storeId: STORE,
      eligibility: foreign,
    });
    expect(surface.overallState).toBe("unauthorized");
    expect(surface.currencyBuckets).toHaveLength(0);

    const auth = buildSellerPayoutEligibilitySurface({
      storeId: STORE,
      eligibility: null,
      unauthorized: true,
      errorMessage: "You cannot view payouts for this store.",
    });
    expect(auth.overallState).toBe("unauthorized");
    expect(auth.highlights).toContain("unauthorized");
  });

  it("per-currency eligibility remains separated", () => {
    const buckets = projectEligibilityCurrencyBuckets(summary());
    expect(buckets.map((b) => b.currency)).toEqual(["USD", "ZAR"]);
    expect(buckets[0].availableMinor).toBe(1500);
    expect(buckets[1].availableMinor).toBe(2500);
    expect(buckets[0].availableLabel).toMatch(/15\.00|USD|US\$/);

    const surface = buildSellerPayoutEligibilitySurface({
      storeId: STORE,
      eligibility: eligibility(),
      summary: summary(),
    });
    expect(surface.currencyBuckets).toHaveLength(2);
    expect(surface.releaseCurrencyCount).toBe(1);
  });

  it("no sensitive fields rendered", () => {
    const surface = buildSellerPayoutEligibilitySurface({
      storeId: STORE,
      eligibility: eligibility({
        reasons: ["has_in_transit_payouts"],
      }),
      summary: summary(),
    });
    const blob = JSON.stringify(surface);
    expect(blob).not.toMatch(/ueos_journal/i);
    expect(blob).not.toMatch(/request_fingerprint/i);
    expect(blob).not.toMatch(/bank_account/i);
    expect(blob).not.toMatch(/beneficiary/i);
    expect(surface.reasonLines[0]).toMatch(/in transit/i);
    expect(mapEligibilityReasonToSellerCopy("secret_internal_rule")).toBeNull();
  });
});

describe("Seller Payout Eligibility Surface V1 — UI contracts", () => {
  it("component wires destination/request only through approved actions", () => {
    const src = read(COMPONENT);
    const dest = read(DEST_FORM);
    const req = read(REQUEST_BTN);
    expect(src).toMatch(/Payout eligibility/);
    expect(src).toMatch(/canManagePayouts/);
    expect(src).toMatch(/SellerPayoutDestinationForm/);
    expect(src).toMatch(/SellerPayoutRequestButton/);
    expect(src).toMatch(/data-live-payout-disabled-message="honest"/);
    expect(src).not.toMatch(/apply_store_payout_event/);
    expect(src).not.toMatch(/ueos_journal|request_fingerprint|beneficiary/i);
    expect(dest).toMatch(/upsertSellerPayoutDestinationAction/);
    expect(dest).toMatch(/cannot self-verify/i);
    expect(dest).not.toMatch(/data-destination-field="verification/);
    expect(dest).not.toMatch(/verification_state\s*:/);
    expect(dest).not.toMatch(/amountMinor|settlement_amount|commission/);
    expect(req).toMatch(/requestSellerLivePayoutAction/);
    expect(req).not.toMatch(/amountMinor|fee:|commission|settlement_amount/);
    expect(req).not.toMatch(/orchestrateSellerLivePayout|submitPayoutBooking/);
  });

  it("documents capability and boundaries", () => {
    const doc = read(DOC);
    expect(doc).toMatch(
      /commerce\.settlement\.seller_payout_eligibility_surface_v1/
    );
    expect(doc).toMatch(/get_my_seller_payout_eligibility/);
    expect(doc).toMatch(/20260882/);
    expect(doc).toMatch(/bank_payouts_enabled|bank rails/i);
    expect(doc).toMatch(/Dashboard/i);
    expect(doc).toMatch(/no new migration|None\./i);
    expect(SELLER_PAYOUT_ELIGIBILITY_SURFACE_ID).toBe(
      "commerce.settlement.seller_payout_eligibility_surface_v1"
    );
  });
});
