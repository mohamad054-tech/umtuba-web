import { describe, expect, it } from "vitest";
import type {
  AdContract,
  AdSetContract,
  CampaignContract,
} from "./campaignContracts";
import {
  ADS_PLATFORM_CREATIVE_TYPES,
  validateCreativeContract,
} from "./creativeContracts";
import {
  ADS_PLACEMENT_REGISTRY,
  ADS_PLATFORM_PLACEMENT_IDS,
  getAdsPlacement,
  isCreativeTypeSupportedByPlacement,
  validateAdsPlacementRegistry,
} from "./placementRegistry";
import {
  validatePlacementResolutionRequest,
  type PlacementResolutionRequest,
  type PlacementResolutionResponse,
} from "./placementResolutionContracts";

describe("Ads Platform placement registry", () => {
  it("contains every stable placement id exactly once", () => {
    const definitions = Object.values(ADS_PLACEMENT_REGISTRY);
    const ids = definitions.map((definition) => definition.id);

    expect(definitions).toHaveLength(12);
    expect(ids).toEqual(ADS_PLATFORM_PLACEMENT_IDS);
    expect(new Set(ids).size).toBe(ids.length);
    expect(validateAdsPlacementRegistry()).toEqual([]);
  });

  it("keeps every placement disabled and hidden by default", () => {
    for (const placement of Object.values(ADS_PLACEMENT_REGISTRY)) {
      expect(placement.featureFlag.key).toBe(
        `ADS_PLACEMENT_${placement.id}_ENABLED`
      );
      expect(placement.featureFlag.enabledByDefault).toBe(false);
      expect(placement.visibility).toBe("hidden");
    }
  });

  it("maps each placement to its owning product and capabilities", () => {
    expect(getAdsPlacement("WATCH_FEED")).toMatchObject({
      owningProduct: "watch",
      capabilities: ["feed", "autoplay", "full_bleed"],
    });
    expect(getAdsPlacement("WORLD_NEARBY")).toMatchObject({
      owningProduct: "world",
      capabilities: ["nearby_context"],
    });
    expect(getAdsPlacement("STORE_PRODUCT")).toMatchObject({
      owningProduct: "store",
      capabilities: ["detail", "commerce_context"],
    });
  });

  it("registers every creative contract type on at least one placement", () => {
    const registeredTypes = new Set(
      Object.values(ADS_PLACEMENT_REGISTRY).flatMap(
        (placement) => placement.supportedCreativeTypes
      )
    );

    expect([...registeredTypes].sort()).toEqual(
      [...ADS_PLATFORM_CREATIVE_TYPES].sort()
    );
  });
});

describe("Ads Platform creative contracts", () => {
  it("validates structural contracts without upload or delivery behavior", () => {
    expect(
      validateCreativeContract({
        contractVersion: 1,
        type: "video",
        label: "Watch launch",
        assetReference: "creative:video:1",
      })
    ).toEqual({ valid: true });

    expect(
      validateCreativeContract({
        contractVersion: 1,
        type: "carousel",
        label: "Products",
        cards: [
          {
            cardId: "card-1",
            assetReference: "creative:image:1",
            headline: "Product one",
          },
        ],
      })
    ).toEqual({ valid: true });
  });

  it("rejects unsupported, incomplete, and wrong-version contracts", () => {
    expect(
      validateCreativeContract({
        contractVersion: 2,
        type: "audio",
        label: "",
      })
    ).toMatchObject({ valid: false });

    expect(
      validateCreativeContract({
        contractVersion: 1,
        type: "image",
        label: "Image",
        assetReference: "creative:image:1",
        altText: "",
      })
    ).toMatchObject({ valid: false });
  });

  it("enforces creative compatibility from registry metadata", () => {
    expect(isCreativeTypeSupportedByPlacement("WATCH_FEED", "video")).toBe(true);
    expect(
      isCreativeTypeSupportedByPlacement("WATCH_FEED", "game_promotion")
    ).toBe(false);
    expect(isCreativeTypeSupportedByPlacement("GAMES", "game_promotion")).toBe(
      true
    );
    expect(
      isCreativeTypeSupportedByPlacement("STORE_PRODUCT", "store_promotion")
    ).toBe(true);
  });
});

describe("Ads Platform campaign contracts", () => {
  it("composes Campaign → Ad Set → Ad with references only", () => {
    const campaign: CampaignContract = {
      contractVersion: 1,
      campaignId: "campaign-1",
      advertiserAccountId: "advertiser-1",
      name: "Foundation contract",
      objective: "awareness",
      schedule: { startsAt: null, endsAt: null },
      budget: { budgetId: "budget-1", version: 1 },
      policy: { policyId: "policy-1", version: 1 },
      lifecycle: { status: "draft", version: 1 },
    };
    const adSet: AdSetContract = {
      contractVersion: 1,
      adSetId: "ad-set-1",
      campaignId: campaign.campaignId,
      name: "Watch set",
      placements: [{ placementId: "WATCH_FEED" }],
      targeting: { targetingId: "targeting-1", version: 1 },
      budget: null,
      policy: campaign.policy,
      lifecycle: { status: "draft", version: 1 },
    };
    const ad: AdContract = {
      contractVersion: 1,
      adId: "ad-1",
      adSetId: adSet.adSetId,
      creative: {
        creativeId: "creative-1",
        creativeType: "video",
        revision: 1,
      },
      policy: campaign.policy,
      lifecycle: { status: "draft", version: 1 },
    };

    expect(adSet.campaignId).toBe(campaign.campaignId);
    expect(ad.adSetId).toBe(adSet.adSetId);
    expect(ad.creative.creativeType).toBe("video");
  });
});

describe("Ads Platform placement resolution contracts", () => {
  const request: PlacementResolutionRequest = {
    contractVersion: 1,
    requestId: "request-1",
    placementId: "WATCH_FEED",
    context: {
      owningProduct: "watch",
      locale: "en",
      countryCode: "US",
      deviceClass: "mobile",
    },
    acceptedCreativeTypes: ["video", "image"],
  };

  it("validates a product request without resolving delivery", () => {
    expect(validatePlacementResolutionRequest(request)).toEqual({ valid: true });
  });

  it("rejects product and creative compatibility mismatches", () => {
    expect(
      validatePlacementResolutionRequest({
        ...request,
        context: { owningProduct: "store" },
      })
    ).toMatchObject({ valid: false });

    expect(
      validatePlacementResolutionRequest({
        ...request,
        acceptedCreativeTypes: ["game_promotion"],
      })
    ).toMatchObject({ valid: false });
  });

  it("keeps placeholder responses non-visible and eligibility unevaluated", () => {
    const response: PlacementResolutionResponse = {
      contractVersion: 1,
      requestId: request.requestId,
      placementId: request.placementId,
      status: "placeholder",
      creative: {
        creativeType: "video",
        creativeReference: null,
        eligibility: "not_evaluated",
      },
      productionVisible: false,
    };

    expect(response.status).toBe("placeholder");
    expect(response.creative.eligibility).toBe("not_evaluated");
    expect(response.productionVisible).toBe(false);
  });
});
