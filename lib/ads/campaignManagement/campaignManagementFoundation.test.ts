import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ADS_DELIVERY_ENABLED } from "../constants";
import * as adsIndex from "../index";
import * as platform from "../platform";
import {
  ADS_CAMPAIGN_MANAGEMENT_AUTHORITY,
  evaluateAdsCampaignBudgetBillingExecution,
  evaluateAdsCampaignLifecycleTransition,
  evaluateAdsCampaignScheduleActivation,
  evaluateAdsCampaignServingEligibility,
  inspectAdsCampaignManagementBundle,
  listAdsCampaignLifecycleTransitions,
  parseAdsCampaignBudgetModel,
  parseAdsCampaignCreativeContract,
  parseAdsCampaignScheduleModel,
  parseAdsCampaignTargetingModel,
  proposeAdsCampaignLifecycleTransition,
  validateAdsCampaignManagementBundle,
} from "./index";

const ROOT = path.join(__dirname, "..", "..", "..");
const INDEX_SOURCE = readFileSync(path.join(ROOT, "lib/ads/index.ts"), "utf8");
const CM_DIR = __dirname;

function readCm(rel: string) {
  return readFileSync(path.join(CM_DIR, rel), "utf8");
}

function validBudget(overrides: Record<string, unknown> = {}) {
  return {
    currencyCode: "USD",
    dailyBudgetMinor: 1_000,
    lifetimeBudgetMinor: 10_000,
    spendLimitMinor: 10_000,
    pacingReference: "even",
    ...overrides,
  };
}

function validSchedule(overrides: Record<string, unknown> = {}) {
  return {
    startAt: "2026-08-01T00:00:00.000Z",
    endAt: "2026-08-31T00:00:00.000Z",
    timezone: "UTC",
    recurrencePlaceholder: "none",
    ...overrides,
  };
}

function validTargeting(overrides: Record<string, unknown> = {}) {
  return {
    countries: ["US"],
    cities: ["Amman"],
    interests: ["music"],
    languages: ["en"],
    ageMin: 18,
    ageMax: 45,
    customAudienceRefs: ["aud.ref-1"],
    ...overrides,
  };
}

function validCreative(overrides: Record<string, unknown> = {}) {
  return {
    creativeRef: "creative-1",
    creativeType: "video",
    headline: "Hello",
    bodyText: "Body",
    mediaReference: "media-1",
    thumbnailReference: "thumb-1",
    destinationReference: "dest-1",
    ...overrides,
  };
}

function validAdSet(overrides: Record<string, unknown> = {}) {
  return {
    adSetRef: "adset-1",
    campaignRef: "campaign-1",
    name: "Ad Set One",
    budget: validBudget(),
    schedule: validSchedule(),
    placements: ["watch_feed"],
    targeting: validTargeting(),
    optimizationObjective: "awareness",
    ...overrides,
  };
}

function validCampaign(overrides: Record<string, unknown> = {}) {
  return {
    campaignRef: "campaign-1",
    advertiserAccountRef: "advertiser-1",
    name: "Campaign One",
    objective: "awareness",
    lifecycleState: "draft",
    budget: validBudget(),
    schedule: validSchedule(),
    adSets: [validAdSet()],
    creatives: [validCreative()],
    ...overrides,
  };
}

describe("Ads Campaign Management Foundation V1", () => {
  it("parses budget/schedule/targeting/creative foundations fail-closed", () => {
    expect(parseAdsCampaignBudgetModel(validBudget()).ok).toBe(true);
    expect(
      parseAdsCampaignBudgetModel(
        validBudget({ dailyBudgetMinor: null, lifetimeBudgetMinor: null })
      ).ok
    ).toBe(false);
    expect(parseAdsCampaignScheduleModel(validSchedule()).ok).toBe(true);
    expect(
      parseAdsCampaignScheduleModel(
        validSchedule({ endAt: "2026-07-01T00:00:00.000Z" })
      ).ok
    ).toBe(false);
    expect(parseAdsCampaignTargetingModel(validTargeting()).ok).toBe(true);
    expect(
      parseAdsCampaignTargetingModel(
        validTargeting({ interests: ["religion"] })
      ).ok
    ).toBe(false);
    expect(parseAdsCampaignCreativeContract(validCreative()).ok).toBe(true);
    expect(
      parseAdsCampaignCreativeContract(
        validCreative({ creativeType: "carousel" })
      ).ok
    ).toBe(true);
    expect(
      parseAdsCampaignCreativeContract(
        validCreative({ creativeType: "interactive" })
      ).ok
    ).toBe(true);
    expect(
      parseAdsCampaignCreativeContract(validCreative({ headline: "" })).ok
    ).toBe(false);
  });

  it("enforces approval state machine without enabling serving", () => {
    expect(listAdsCampaignLifecycleTransitions("draft")).toEqual([
      "review",
      "archived",
    ]);
    expect(
      evaluateAdsCampaignLifecycleTransition({
        from: "draft",
        to: "review",
      }).ok
    ).toBe(true);
    expect(
      evaluateAdsCampaignLifecycleTransition({
        from: "review",
        to: "approved",
      }).ok
    ).toBe(true);
    expect(
      evaluateAdsCampaignLifecycleTransition({
        from: "approved",
        to: "paused",
      }).ok
    ).toBe(true);
    expect(
      evaluateAdsCampaignLifecycleTransition({
        from: "paused",
        to: "archived",
      }).ok
    ).toBe(true);
    expect(
      evaluateAdsCampaignLifecycleTransition({
        from: "archived",
        to: "draft",
      }).ok
    ).toBe(false);

    const approved = evaluateAdsCampaignLifecycleTransition({
      from: "review",
      to: "approved",
    });
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    expect(approved.enablesServing).toBe(false);
    expect(approved.productionEnabled).toBe(false);
    expect(approved.deliveryEnabled).toBe(false);
    expect(
      evaluateAdsCampaignServingEligibility({ lifecycleState: "approved" })
        .eligible
    ).toBe(false);
  });

  it("validates campaign bundles and rejects incomplete review assets", () => {
    const draftOk = validateAdsCampaignManagementBundle(validCampaign());
    expect(draftOk.ok).toBe(true);
    expect(draftOk.servingEligible).toBe(false);
    expect(draftOk.productionEnabled).toBe(false);
    expect(draftOk.deliveryEnabled).toBe(false);
    expect(draftOk.billingEnabled).toBe(false);

    const reviewMissingCreative = validateAdsCampaignManagementBundle(
      validCampaign({ lifecycleState: "review", creatives: [] })
    );
    expect(reviewMissingCreative.ok).toBe(false);
    expect(reviewMissingCreative.issues.join(" ")).toMatch(/creative/i);

    const badBudget = validateAdsCampaignManagementBundle(
      validCampaign({
        budget: validBudget({
          dailyBudgetMinor: null,
          lifetimeBudgetMinor: null,
        }),
      })
    );
    expect(badBudget.ok).toBe(false);

    const badTargeting = validateAdsCampaignManagementBundle(
      validCampaign({
        adSets: [
          validAdSet({
            targeting: validTargeting({ countries: [] }),
          }),
        ],
      })
    );
    expect(badTargeting.ok).toBe(false);
  });

  it("keeps budget/schedule activation and billing execution closed", () => {
    expect(evaluateAdsCampaignBudgetBillingExecution().allowed).toBe(false);
    expect(evaluateAdsCampaignScheduleActivation().activatesServing).toBe(
      false
    );
    expect(ADS_CAMPAIGN_MANAGEMENT_AUTHORITY.productionEnabled).toBe(false);
    expect(ADS_CAMPAIGN_MANAGEMENT_AUTHORITY.deliveryEnabled).toBe(false);
    expect(ADS_CAMPAIGN_MANAGEMENT_AUTHORITY.billingEnabled).toBe(false);
    expect(ADS_DELIVERY_ENABLED).toBe(false);
  });

  it("exposes admin contracts that never apply serving", () => {
    const inspected = inspectAdsCampaignManagementBundle({
      actorRef: "admin-1",
      correlationId: "corr-1",
      campaign: validCampaign({ lifecycleState: "approved" }),
    });
    expect("validation" in inspected).toBe(true);
    if (!("validation" in inspected)) return;
    expect(inspected.validation.ok).toBe(true);
    expect(inspected.deliveryEnabled).toBe(false);

    const transition = proposeAdsCampaignLifecycleTransition({
      actorRef: "admin-1",
      correlationId: "corr-2",
      from: "draft",
      to: "review",
      campaign: validCampaign({ lifecycleState: "draft" }),
    });
    expect(transition.ok).toBe(true);
    if (!transition.ok) return;
    expect(transition.applied).toBe(false);
    expect(transition.enablesServing).toBe(false);
    expect(transition.productionEnabled).toBe(false);

    const blocked = proposeAdsCampaignLifecycleTransition({
      actorRef: "admin-1",
      correlationId: "corr-3",
      from: "draft",
      to: "review",
      campaign: validCampaign({ lifecycleState: "draft", creatives: [] }),
    });
    expect(blocked.ok).toBe(false);
  });

  it("does not weaken canonical stack, ops kill switches, or open production flags", () => {
    expect(typeof platform.runAdsCanonicalStackV1).toBe("function");
    expect(INDEX_SOURCE).toMatch(/from ["'].\/campaignManagement["']/);
    expect(adsIndex).toHaveProperty("validateAdsCampaignManagementBundle");
    expect(adsIndex).toHaveProperty("evaluateAdsOperationsReadiness");

    const sources = [
      "authority.ts",
      "lifecycle.ts",
      "budget.ts",
      "schedule.ts",
      "validation.ts",
      "adminContracts.ts",
      "campaign.ts",
    ]
      .map(readCm)
      .join("\n");
    expect(sources).not.toMatch(/productionEnabled:\s*true/);
    expect(sources).not.toMatch(/deliveryEnabled:\s*true/);
    expect(sources).not.toMatch(/billingEnabled:\s*true/);
    expect(sources).not.toMatch(/productionAccepted:\s*true/);
    expect(sources).not.toMatch(/authoritativeProductionServing:\s*true/);
    expect(sources).not.toMatch(/ADS_DELIVERY_ENABLED\s*=\s*true/);
    expect(sources).not.toMatch(/stripe|paypal|adyen/i);
    expect(sources).not.toMatch(/runAdsCanonicalStackV1/);
  });
});
