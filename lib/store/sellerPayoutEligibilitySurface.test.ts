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
const PAGE = "app/seller/store/page.tsx";
const INSIGHTS = "app/components/store/SellerDashboardInsights.tsx";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function eligibility(
  overrides: Partial<SellerPayoutEligibility> = {}
): SellerPayoutEligibility {
  return {
    storeId: "11111111-1111-4111-8111-111111111111",
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
    storeId: "11111111-1111-4111-8111-111111111111",
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

describe("Seller Payout Eligibility Surface V1 — files", () => {
  it("ships documentation and seller store wiring", () => {
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(existsSync(join(ROOT, COMPONENT))).toBe(true);
    expect(read(PAGE)).toMatch(/fetchMySellerPayoutEligibility/);
    expect(read(PAGE)).toMatch(/buildSellerPayoutEligibilitySurface/);
    expect(read(INSIGHTS)).toMatch(/SellerPayoutEligibility/);
    expect(read(COMPONENT)).toMatch(/Payout eligibility/);
  });
});

describe("Seller Payout Eligibility Surface V1 — projection", () => {
  it("eligible seller state renders correctly", () => {
    const surface = buildSellerPayoutEligibilitySurface({
      storeId: "11111111-1111-4111-8111-111111111111",
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
  });

  it("no settled payable balance state", () => {
    const surface = buildSellerPayoutEligibilitySurface({
      storeId: "11111111-1111-4111-8111-111111111111",
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

  it("bank rails disabled state is always honest", () => {
    const surface = buildSellerPayoutEligibilitySurface({
      storeId: "11111111-1111-4111-8111-111111111111",
      eligibility: eligibility(),
    });
    expect(surface.bankRailsDisabled).toBe(true);
    expect(surface.highlights).toContain("bank_rails_disabled");
    expect(surface.actionButtonsEnabled).toBe(false);
    expect(eligibilitySurfaceHasActionButtons(surface)).toBe(false);

    const inconsistent = buildSellerPayoutEligibilitySurface({
      storeId: "11111111-1111-4111-8111-111111111111",
      eligibility: eligibility({ bankPayoutsEnabled: true }),
    });
    expect(inconsistent.overallState).toBe("unavailable");
  });

  it("payout reads unavailable state", () => {
    const surface = buildSellerPayoutEligibilitySurface({
      storeId: "11111111-1111-4111-8111-111111111111",
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
    expect(
      assertEligibilityBelongsToStore(
        foreign,
        "11111111-1111-4111-8111-111111111111"
      ).ok
    ).toBe(false);
    const surface = buildSellerPayoutEligibilitySurface({
      storeId: "11111111-1111-4111-8111-111111111111",
      eligibility: foreign,
    });
    expect(surface.overallState).toBe("unauthorized");
    expect(surface.currencyBuckets).toHaveLength(0);

    const auth = buildSellerPayoutEligibilitySurface({
      storeId: "11111111-1111-4111-8111-111111111111",
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
      storeId: "11111111-1111-4111-8111-111111111111",
      eligibility: eligibility(),
      summary: summary(),
    });
    expect(surface.currencyBuckets).toHaveLength(2);
    expect(surface.releaseCurrencyCount).toBe(1);
  });

  it("no sensitive fields rendered", () => {
    const surface = buildSellerPayoutEligibilitySurface({
      storeId: "11111111-1111-4111-8111-111111111111",
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
  it("component has no action buttons while rails disabled", () => {
    const src = read(COMPONENT);
    expect(src).toMatch(/Payout eligibility/);
    expect(src).toMatch(/No withdraw or bank-connect actions/);
    expect(src).toMatch(/role="status"/);
    expect(src).not.toMatch(/<button/i);
    expect(src).not.toMatch(/apply_store_payout_event/);
    expect(src).not.toMatch(/ueos_journal|request_fingerprint|beneficiary/i);
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
