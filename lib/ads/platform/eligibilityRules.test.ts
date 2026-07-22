import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ADS_DELIVERY_ENABLED } from "../constants";
import {
  ADS_DELIVERY_ENGINE_CONTRACT_VERSION,
  type AdsDeliveryRequest,
} from "./deliveryContracts";
import {
  ADS_ELIGIBILITY_ACTIVE_STATUS,
  ADS_ELIGIBILITY_DELIVERY_FLAG_KEY,
  ADS_ELIGIBILITY_RULE_ORDER,
  evaluateAdsCandidateEligibility,
  evaluateScheduleWindow,
  matchesCountryTargeting,
  matchesLanguageTargeting,
  type AdsEligibilityCandidateState,
} from "./eligibilityRules";
import {
  ADS_PLACEMENT_REGISTRY,
  validateAdsPlacementRegistry,
} from "./placementRegistry";

const NOW = "2026-07-22T12:00:00.000Z";

function baseRequest(
  overrides: Partial<AdsDeliveryRequest> = {}
): AdsDeliveryRequest {
  return {
    contractVersion: ADS_DELIVERY_ENGINE_CONTRACT_VERSION,
    placementId: "WATCH_FEED",
    candidates: [
      {
        candidateId: "candidate-1",
        campaignId: "campaign-1",
        adSetId: "ad-set-1",
        adId: "ad-1",
        creativeId: "creative-1",
      },
    ],
    viewer: { opaqueViewerId: "viewer-opaque-1" },
    geo: { countryCode: "US" },
    languageCode: "en-US",
    deviceClass: "mobile",
    featureFlags: {
      [ADS_ELIGIBILITY_DELIVERY_FLAG_KEY]: true,
      ADS_PLACEMENT_WATCH_FEED_ENABLED: true,
    },
    currentTimestamp: NOW,
    ...overrides,
  };
}

function baseCandidate(
  overrides: Partial<AdsEligibilityCandidateState> = {}
): AdsEligibilityCandidateState {
  return {
    candidateId: "candidate-1",
    campaignId: "campaign-1",
    adSetId: "ad-set-1",
    adId: "ad-1",
    creativeId: "creative-1",
    placementId: "WATCH_FEED",
    campaignStatus: ADS_ELIGIBILITY_ACTIVE_STATUS,
    adSetStatus: ADS_ELIGIBILITY_ACTIVE_STATUS,
    adStatus: ADS_ELIGIBILITY_ACTIVE_STATUS,
    campaignStartsAt: "2026-07-01T00:00:00.000Z",
    campaignEndsAt: "2026-08-01T00:00:00.000Z",
    adSetStartsAt: "2026-07-01T00:00:00.000Z",
    adSetEndsAt: "2026-08-01T00:00:00.000Z",
    budgetExhausted: false,
    creativePresent: true,
    creativeApproved: true,
    policyBlocked: false,
    targetedCountryCodes: ["US", "CA"],
    targetedLanguageCodes: ["en"],
    audienceMatched: true,
    ...overrides,
  };
}

describe("Ads Eligibility Rules Foundation V1", () => {
  it("marks an otherwise valid candidate eligible with productionEnabled false", () => {
    const result = evaluateAdsCandidateEligibility(
      baseRequest(),
      baseCandidate()
    );
    expect(result).toEqual({
      contractVersion: ADS_DELIVERY_ENGINE_CONTRACT_VERSION,
      candidateId: "candidate-1",
      eligible: true,
      exclusionReason: null,
      matchedRule: null,
      productionEnabled: false,
    });
  });

  it("excludes when delivery is disabled", () => {
    const result = evaluateAdsCandidateEligibility(
      baseRequest({
        featureFlags: {
          ADS_DELIVERY_ENABLED: false,
          ADS_PLACEMENT_WATCH_FEED_ENABLED: true,
        },
      }),
      baseCandidate()
    );
    expect(result.eligible).toBe(false);
    expect(result.exclusionReason).toBe("delivery_disabled");
    expect(result.matchedRule).toBe("delivery_disabled");
    expect(result.productionEnabled).toBe(false);
  });

  it("excludes when placement is disabled", () => {
    const result = evaluateAdsCandidateEligibility(
      baseRequest({
        featureFlags: {
          ADS_DELIVERY_ENABLED: true,
          ADS_PLACEMENT_WATCH_FEED_ENABLED: false,
        },
      }),
      baseCandidate()
    );
    expect(result.exclusionReason).toBe("placement_disabled");
    expect(result.matchedRule).toBe("placement_disabled");
  });

  it("excludes on placement mismatch", () => {
    const result = evaluateAdsCandidateEligibility(
      baseRequest(),
      baseCandidate({ placementId: "DISCOVER_FEED" })
    );
    expect(result.exclusionReason).toBe("placement_mismatch");
    expect(result.matchedRule).toBe("placement_mismatch");
  });

  it("excludes paused campaigns", () => {
    const result = evaluateAdsCandidateEligibility(
      baseRequest(),
      baseCandidate({ campaignStatus: "paused" })
    );
    expect(result.exclusionReason).toBe("campaign_paused");
    expect(result.matchedRule).toBe("campaign_status_not_active");
  });

  it("excludes inactive ad sets", () => {
    const result = evaluateAdsCandidateEligibility(
      baseRequest(),
      baseCandidate({ adSetStatus: "paused" })
    );
    expect(result.exclusionReason).toBe("ad_set_inactive");
    expect(result.matchedRule).toBe("ad_set_status_not_active");
  });

  it("excludes inactive ads", () => {
    const result = evaluateAdsCandidateEligibility(
      baseRequest(),
      baseCandidate({ adStatus: "draft" })
    );
    expect(result.exclusionReason).toBe("ad_inactive");
    expect(result.matchedRule).toBe("ad_status_not_active");
  });

  it("excludes campaigns that have not started", () => {
    const result = evaluateAdsCandidateEligibility(
      baseRequest(),
      baseCandidate({ campaignStartsAt: "2026-07-23T00:00:00.000Z" })
    );
    expect(result.exclusionReason).toBe("campaign_not_started");
    expect(result.matchedRule).toBe("campaign_not_started");
  });

  it("excludes expired campaigns (end exclusive)", () => {
    const atEnd = evaluateAdsCandidateEligibility(
      baseRequest({ currentTimestamp: "2026-08-01T00:00:00.000Z" }),
      baseCandidate({
        campaignEndsAt: "2026-08-01T00:00:00.000Z",
      })
    );
    expect(atEnd.exclusionReason).toBe("campaign_expired");

    const afterEnd = evaluateAdsCandidateEligibility(
      baseRequest({ currentTimestamp: "2026-08-01T00:00:01.000Z" }),
      baseCandidate({ campaignEndsAt: "2026-08-01T00:00:00.000Z" })
    );
    expect(afterEnd.exclusionReason).toBe("campaign_expired");
  });

  it("excludes ad sets that have not started", () => {
    const result = evaluateAdsCandidateEligibility(
      baseRequest(),
      baseCandidate({ adSetStartsAt: "2026-07-30T00:00:00.000Z" })
    );
    expect(result.exclusionReason).toBe("ad_set_not_started");
  });

  it("excludes expired ad sets", () => {
    const result = evaluateAdsCandidateEligibility(
      baseRequest({ currentTimestamp: "2026-08-01T00:00:00.000Z" }),
      baseCandidate({
        campaignEndsAt: null,
        adSetEndsAt: "2026-08-01T00:00:00.000Z",
      })
    );
    expect(result.exclusionReason).toBe("ad_set_expired");
  });

  it("excludes budget-exhausted candidates", () => {
    const result = evaluateAdsCandidateEligibility(
      baseRequest(),
      baseCandidate({ budgetExhausted: true })
    );
    expect(result.exclusionReason).toBe("budget_exhausted");
  });

  it("excludes when creative is missing", () => {
    const result = evaluateAdsCandidateEligibility(
      baseRequest(),
      baseCandidate({ creativePresent: false })
    );
    expect(result.exclusionReason).toBe("creative_missing");
  });

  it("excludes unapproved creatives", () => {
    const result = evaluateAdsCandidateEligibility(
      baseRequest(),
      baseCandidate({ creativeApproved: false })
    );
    expect(result.exclusionReason).toBe("creative_not_approved");
  });

  it("excludes policy-blocked candidates", () => {
    const result = evaluateAdsCandidateEligibility(
      baseRequest(),
      baseCandidate({ policyBlocked: true })
    );
    expect(result.exclusionReason).toBe("policy_blocked");
  });

  it("excludes on country mismatch and accepts country match", () => {
    const mismatch = evaluateAdsCandidateEligibility(
      baseRequest({ geo: { countryCode: "DE" } }),
      baseCandidate({ targetedCountryCodes: ["US", "CA"] })
    );
    expect(mismatch.exclusionReason).toBe("geo_mismatch");

    const match = evaluateAdsCandidateEligibility(
      baseRequest({ geo: { countryCode: "CA" } }),
      baseCandidate({ targetedCountryCodes: ["us", "ca"] })
    );
    expect(match.eligible).toBe(true);

    const unrestricted = evaluateAdsCandidateEligibility(
      baseRequest({ geo: { countryCode: "JP" } }),
      baseCandidate({ targetedCountryCodes: [] })
    );
    expect(unrestricted.eligible).toBe(true);
  });

  it("excludes on language mismatch and supports base-language match", () => {
    const mismatch = evaluateAdsCandidateEligibility(
      baseRequest({ languageCode: "fr-FR" }),
      baseCandidate({ targetedLanguageCodes: ["en"] })
    );
    expect(mismatch.exclusionReason).toBe("language_mismatch");

    const baseMatch = evaluateAdsCandidateEligibility(
      baseRequest({ languageCode: "en-US" }),
      baseCandidate({ targetedLanguageCodes: ["en"] })
    );
    expect(baseMatch.eligible).toBe(true);

    const exactRegion = evaluateAdsCandidateEligibility(
      baseRequest({ languageCode: "en-US" }),
      baseCandidate({ targetedLanguageCodes: ["en-GB"] })
    );
    expect(exactRegion.exclusionReason).toBe("language_mismatch");

    expect(matchesLanguageTargeting("en-US", ["en"])).toBe(true);
    expect(matchesLanguageTargeting("en-US", ["en-US"])).toBe(true);
    expect(matchesLanguageTargeting("en-US", ["en-GB"])).toBe(false);
    expect(matchesLanguageTargeting("en-US", [])).toBe(true);
  });

  it("excludes on audience mismatch", () => {
    const result = evaluateAdsCandidateEligibility(
      baseRequest(),
      baseCandidate({ audienceMatched: false })
    );
    expect(result.exclusionReason).toBe("audience_mismatch");
  });

  it("fails closed when required candidate state is missing", () => {
    const result = evaluateAdsCandidateEligibility(
      baseRequest(),
      {
        ...baseCandidate(),
        audienceMatched: undefined,
      } as unknown as AdsEligibilityCandidateState
    );
    expect(result.eligible).toBe(false);
    expect(result.exclusionReason).toBe("unknown");
    expect(result.matchedRule).toBeNull();
    expect(result.productionEnabled).toBe(false);
  });

  it("fails closed on unknown statuses", () => {
    const campaign = evaluateAdsCandidateEligibility(
      baseRequest(),
      baseCandidate({ campaignStatus: "mysterious" })
    );
    expect(campaign.exclusionReason).toBe("campaign_paused");

    const adSet = evaluateAdsCandidateEligibility(
      baseRequest(),
      baseCandidate({ adSetStatus: "weird" })
    );
    expect(adSet.exclusionReason).toBe("ad_set_inactive");

    const ad = evaluateAdsCandidateEligibility(
      baseRequest(),
      baseCandidate({ adStatus: "???" })
    );
    expect(ad.exclusionReason).toBe("ad_inactive");
  });

  it("fails closed on invalid timestamps", () => {
    const badRequestTs = evaluateAdsCandidateEligibility(
      baseRequest({ currentTimestamp: "not-a-time" }),
      baseCandidate()
    );
    expect(badRequestTs.eligible).toBe(false);
    expect(badRequestTs.exclusionReason).toBe("unknown");

    const badStart = evaluateAdsCandidateEligibility(
      baseRequest(),
      baseCandidate({ campaignStartsAt: "yesterday" })
    );
    expect(badStart.exclusionReason).toBe("unknown");

    expect(evaluateScheduleWindow(NOW, "bad", null)).toBe("invalid");
    expect(evaluateScheduleWindow(NOW, "2026-07-01T00:00:00.000Z", "bad")).toBe(
      "invalid"
    );
    expect(
      evaluateScheduleWindow(
        NOW,
        "2026-07-01T00:00:00.000Z",
        "2026-08-01T00:00:00.000Z"
      )
    ).toBe("ok");
    expect(
      evaluateScheduleWindow(
        "2026-06-01T00:00:00.000Z",
        "2026-07-01T00:00:00.000Z",
        null
      )
    ).toBe("not_started");
  });

  it("keeps a stable first-match rule order when multiple exclusions apply", () => {
    expect(ADS_ELIGIBILITY_RULE_ORDER[0]).toBe("delivery_disabled");
    expect(ADS_ELIGIBILITY_RULE_ORDER[1]).toBe("placement_disabled");

    const result = evaluateAdsCandidateEligibility(
      baseRequest({
        featureFlags: {
          ADS_DELIVERY_ENABLED: false,
          ADS_PLACEMENT_WATCH_FEED_ENABLED: false,
        },
      }),
      baseCandidate({
        campaignStatus: "paused",
        budgetExhausted: true,
        policyBlocked: true,
        audienceMatched: false,
      })
    );
    expect(result.matchedRule).toBe("delivery_disabled");
    expect(result.exclusionReason).toBe("delivery_disabled");

    const afterDelivery = evaluateAdsCandidateEligibility(
      baseRequest({
        featureFlags: {
          ADS_DELIVERY_ENABLED: true,
          ADS_PLACEMENT_WATCH_FEED_ENABLED: false,
        },
      }),
      baseCandidate({
        placementId: "DISCOVER_FEED",
        campaignStatus: "paused",
      })
    );
    expect(afterDelivery.matchedRule).toBe("placement_disabled");
  });

  it("does not mutate request or candidate inputs", () => {
    const request = baseRequest();
    const candidate = baseCandidate();
    const requestBefore = JSON.stringify(request);
    const candidateBefore = JSON.stringify(candidate);

    Object.freeze(request);
    Object.freeze(request.featureFlags);
    Object.freeze(request.geo);
    Object.freeze(candidate);
    Object.freeze(candidate.targetedCountryCodes);
    Object.freeze(candidate.targetedLanguageCodes);

    evaluateAdsCandidateEligibility(request, candidate);

    expect(JSON.stringify(request)).toBe(requestBefore);
    expect(JSON.stringify(candidate)).toBe(candidateBefore);
  });

  it("always returns productionEnabled false even when request flags are true", () => {
    const result = evaluateAdsCandidateEligibility(
      baseRequest({
        featureFlags: {
          ADS_DELIVERY_ENABLED: true,
          ADS_PLACEMENT_WATCH_FEED_ENABLED: true,
        },
      }),
      baseCandidate()
    );
    expect(result.eligible).toBe(true);
    expect(result.productionEnabled).toBe(false);
  });

  it("fails closed on invalid country targeting entries", () => {
    expect(matchesCountryTargeting("US", ["USA"])).toBeNull();
    const result = evaluateAdsCandidateEligibility(
      baseRequest(),
      baseCandidate({ targetedCountryCodes: ["USA"] })
    );
    expect(result.exclusionReason).toBe("unknown");
  });

  it("documents inclusive start and exclusive end schedule semantics", () => {
    expect(
      evaluateScheduleWindow(
        "2026-07-01T00:00:00.000Z",
        "2026-07-01T00:00:00.000Z",
        "2026-08-01T00:00:00.000Z"
      )
    ).toBe("ok");
    expect(
      evaluateScheduleWindow(
        "2026-08-01T00:00:00.000Z",
        "2026-07-01T00:00:00.000Z",
        "2026-08-01T00:00:00.000Z"
      )
    ).toBe("expired");
  });
});

describe("Ads Eligibility safety invariants", () => {
  it("keeps Ads delivery and placement flags disabled in production constants", () => {
    expect(ADS_DELIVERY_ENABLED).toBe(false);
    expect(validateAdsPlacementRegistry()).toEqual([]);
    for (const placement of Object.values(ADS_PLACEMENT_REGISTRY)) {
      expect(placement.featureFlag.enabledByDefault).toBe(false);
      expect(placement.visibility).toBe("hidden");
    }
  });

  it("does not implement selection, ranking, or delivery execution", () => {
    const source = readFileSync(
      path.join(process.cwd(), "lib", "ads", "platform", "eligibilityRules.ts"),
      "utf8"
    );
    expect(source).not.toMatch(
      /Math\.random|Date\.now\(|selectAd|rankCandidates|runAuction|serveAd|paceSpend|\bbilling\b/
    );
    expect(source).toContain("evaluateAdsCandidateEligibility");
    expect(source).not.toContain("selectedCandidateId");
  });

  it("does not wire eligibility into product surfaces", () => {
    const markers =
      /evaluateAdsCandidateEligibility|eligibilityRules|serveAd|runAuction/;
    const roots = ["watch", "discover", "live", "store", "world", "learning"];
    for (const root of roots) {
      let source = "";
      try {
        source = readFileSync(
          path.join(process.cwd(), "app", root, "page.tsx"),
          "utf8"
        );
      } catch {
        // Alternate entry files are fine.
      }
      expect(source).not.toMatch(markers);
    }
  });
});
