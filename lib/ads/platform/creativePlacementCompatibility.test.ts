import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ADS_PLATFORM_CREATIVE_TYPES,
  type AdsPlatformCreativeType,
} from "./creativeContracts";
import {
  ADS_CREATIVE_PLACEMENT_COMPATIBILITY_ALLOWED_FIELDS,
  ADS_CREATIVE_PLACEMENT_COMPATIBILITY_CONTRACT_VERSION,
  ADS_CREATIVE_TYPE_REQUIRED_CAPABILITIES,
  getPlacementCompatibilityForCreative,
  isCreativeCompatible,
  listRequiredCapabilitiesForCreativeType,
  listSupportedCreativeTypes,
  resolveCapabilityProfile,
  resolvePlatformCreativeType,
  resolvePlatformPlacementId,
  validateCreativePlacementCompatibility,
} from "./creativePlacementCompatibility";
import {
  ADS_PLACEMENT_COMPATIBILITY,
  ADS_PLACEMENT_COMPATIBILITY_CAPABILITY_KEYS,
  ADS_PLACEMENT_COMPATIBILITY_CONTRACT_VERSION,
  getPlacementCompatibility,
  type AdsPlacementCompatibilityCapabilities,
} from "./placementCompatibility";
import {
  ADS_PLACEMENT_REGISTRY,
  ADS_PLATFORM_PLACEMENT_IDS,
  isCreativeTypeSupportedByPlacement,
  type AdsPlatformPlacementId,
} from "./placementRegistry";

const SOURCE_PATH = path.join(__dirname, "creativePlacementCompatibility.ts");
const SOURCE = readFileSync(SOURCE_PATH, "utf8");

function baseCapabilities(
  overrides: Partial<AdsPlacementCompatibilityCapabilities> = {}
): AdsPlacementCompatibilityCapabilities {
  return {
    supportsVideo: true,
    supportsImage: true,
    supportsCarousel: true,
    supportsInteractive: false,
    supportsStorePromotion: false,
    supportsLearningPromotion: false,
    supportsSponsoredContent: true,
    supportsVertical: true,
    supportsHorizontal: false,
    supportsFullScreen: false,
    supportsFeed: true,
    supportsOverlay: false,
    ...overrides,
  };
}

describe("Ads Creative ↔ Placement Compatibility Gate Foundation V1", () => {
  it("exposes contract version and allowed fields", () => {
    expect(ADS_CREATIVE_PLACEMENT_COMPATIBILITY_CONTRACT_VERSION).toBe(1);
    expect([...ADS_CREATIVE_PLACEMENT_COMPATIBILITY_ALLOWED_FIELDS]).toEqual([
      "placement",
      "creativeType",
      "capabilityProfile",
    ]);
  });

  it("covers every placement and creative type combination against the gate", () => {
    for (const placementId of ADS_PLATFORM_PLACEMENT_IDS) {
      for (const creativeType of ADS_PLATFORM_CREATIVE_TYPES) {
        const result = validateCreativePlacementCompatibility({
          placement: placementId,
          creativeType,
        });
        expect(result.productionEnabled).toBe(false);
        expect(typeof result.compatible).toBe("boolean");

        const registrySupports = isCreativeTypeSupportedByPlacement(
          placementId,
          creativeType
        );
        const required =
          ADS_CREATIVE_TYPE_REQUIRED_CAPABILITIES[creativeType];
        const capabilities =
          getPlacementCompatibility(placementId).capabilities;
        const capabilitiesOk = required.every((key) => capabilities[key]);

        expect(result.compatible).toBe(registrySupports && capabilitiesOk);

        if (result.compatible) {
          expect(result.reason).toBeNull();
        } else {
          expect(typeof result.reason).toBe("string");
          expect(result.reason!.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("accepts every registry-supported combination as compatible", () => {
    for (const placementId of ADS_PLATFORM_PLACEMENT_IDS) {
      const supported = ADS_PLACEMENT_REGISTRY[placementId]
        .supportedCreativeTypes as readonly AdsPlatformCreativeType[];

      for (const creativeType of supported) {
        const result = validateCreativePlacementCompatibility({
          placement: placementId,
          creativeType,
          capabilityProfile: getPlacementCompatibility(placementId),
        });
        expect(result).toEqual({
          compatible: true,
          reason: null,
          productionEnabled: false,
        });
        expect(isCreativeCompatible(placementId, creativeType)).toBe(true);
      }
    }
  });

  it("rejects creative types unsupported by the placement", () => {
    const result = validateCreativePlacementCompatibility({
      placement: "WATCH_FEED",
      creativeType: "game_promotion",
    });
    expect(result.compatible).toBe(false);
    expect(result.productionEnabled).toBe(false);
    expect(result.reason).toContain("not supported by placement");
    expect(isCreativeCompatible("WATCH_FEED", "game_promotion")).toBe(false);
  });

  it("rejects unsupported placements", () => {
    const result = validateCreativePlacementCompatibility({
      placement: "NOT_A_PLACEMENT",
      creativeType: "video",
    });
    expect(result.compatible).toBe(false);
    expect(result.productionEnabled).toBe(false);
    expect(result.reason).toMatch(/Invalid taxonomy|Unsupported placement/);
  });

  it("rejects unsupported creative types", () => {
    const result = validateCreativePlacementCompatibility({
      placement: "WATCH_FEED",
      creativeType: "audio",
    });
    expect(result.compatible).toBe(false);
    expect(result.reason).toMatch(/Invalid taxonomy|unknown creative type/);
  });

  it("rejects invalid taxonomy aliases", () => {
    expect(
      validateCreativePlacementCompatibility({
        placement: "totally_unknown_surface",
        creativeType: "video",
      }).compatible
    ).toBe(false);

    expect(
      validateCreativePlacementCompatibility({
        placement: "WATCH_FEED",
        creativeType: "TOTALLY_UNKNOWN_CREATIVE",
      }).compatible
    ).toBe(false);
  });

  it("accepts taxonomy aliases that resolve to platform ids", () => {
    expect(
      validateCreativePlacementCompatibility({
        placement: "watch_feed",
        creativeType: "VIDEO",
      })
    ).toEqual({
      compatible: true,
      reason: null,
      productionEnabled: false,
    });

    expect(
      validateCreativePlacementCompatibility({
        placement: "store_catalog",
        creativeType: "store_promotion",
      }).compatible
    ).toBe(true);
  });

  it("rejects when creative requires a capability not provided", () => {
    const disabledVideo = baseCapabilities({
      supportsVideo: false,
      supportsImage: true,
    });

    const result = validateCreativePlacementCompatibility({
      placement: "WATCH_FEED",
      creativeType: "video",
      capabilityProfile: disabledVideo,
    });

    expect(result.compatible).toBe(false);
    expect(result.reason).toContain('requires capability "supportsVideo"');
    expect(result.productionEnabled).toBe(false);
  });

  it("rejects when placement capability profile is invalid", () => {
    const malformed = {
      placementId: "WATCH_FEED",
      contractVersion: ADS_PLACEMENT_COMPATIBILITY_CONTRACT_VERSION,
      capabilities: baseCapabilities({
        supportsVideo: false,
        supportsImage: false,
        supportsCarousel: false,
        supportsInteractive: false,
      }),
    };

    const result = validateCreativePlacementCompatibility({
      placement: "WATCH_FEED",
      creativeType: "video",
      capabilityProfile: malformed,
    });
    expect(result.compatible).toBe(false);
    expect(result.reason).toMatch(/Invalid compatibility profile/);
  });

  it("rejects unknown fields on the input", () => {
    const result = validateCreativePlacementCompatibility({
      placement: "WATCH_FEED",
      creativeType: "video",
      rankingScore: 1,
    });
    expect(result.compatible).toBe(false);
    expect(result.reason).toContain('unknown field "rankingScore"');
  });

  it("rejects unknown fields on capabilityProfile", () => {
    const result = validateCreativePlacementCompatibility({
      placement: "WATCH_FEED",
      creativeType: "video",
      capabilityProfile: {
        placementId: "WATCH_FEED",
        contractVersion: ADS_PLACEMENT_COMPATIBILITY_CONTRACT_VERSION,
        capabilities: baseCapabilities(),
        auctionBid: 10,
      },
    });
    expect(result.compatible).toBe(false);
    expect(result.reason).toMatch(/Invalid compatibility profile/);
  });

  it("rejects non-object and empty inputs (fail closed)", () => {
    expect(validateCreativePlacementCompatibility(null).compatible).toBe(false);
    expect(validateCreativePlacementCompatibility(undefined).compatible).toBe(
      false
    );
    expect(validateCreativePlacementCompatibility("WATCH_FEED").compatible).toBe(
      false
    );
    expect(validateCreativePlacementCompatibility(42).compatible).toBe(false);
    expect(validateCreativePlacementCompatibility({}).compatible).toBe(false);
  });

  it("rejects mismatched capabilityProfile.placementId", () => {
    const result = validateCreativePlacementCompatibility({
      placement: "WATCH_FEED",
      creativeType: "video",
      capabilityProfile: {
        ...getPlacementCompatibility("DISCOVER_FEED"),
        placementId: "DISCOVER_FEED",
      },
    });
    expect(result.compatible).toBe(false);
    expect(result.reason).toMatch(/Invalid compatibility profile/);
  });

  it("listSupportedCreativeTypes covers every placement", () => {
    for (const placementId of ADS_PLATFORM_PLACEMENT_IDS) {
      const listed = listSupportedCreativeTypes(placementId);
      const registry = ADS_PLACEMENT_REGISTRY[placementId]
        .supportedCreativeTypes as readonly AdsPlatformCreativeType[];

      expect([...listed].sort()).toEqual([...registry].sort());

      for (const creativeType of listed) {
        expect(isCreativeCompatible(placementId, creativeType)).toBe(true);
      }

      for (const creativeType of ADS_PLATFORM_CREATIVE_TYPES) {
        if (!registry.includes(creativeType)) {
          expect(listed).not.toContain(creativeType);
        }
      }
    }
  });

  it("listSupportedCreativeTypes fails closed for unsupported placements", () => {
    expect(listSupportedCreativeTypes("NOT_A_PLACEMENT")).toEqual([]);
  });

  it("listSupportedCreativeTypes respects a restricted capability profile", () => {
    const noVideo = baseCapabilities({ supportsVideo: false });
    const listed = listSupportedCreativeTypes("WATCH_FEED", noVideo);
    expect(listed).not.toContain("video");
    expect(listed).toContain("image");
    expect(listed).toContain("brand");
  });

  it("lists required capabilities for every creative type", () => {
    for (const creativeType of ADS_PLATFORM_CREATIVE_TYPES) {
      const required = listRequiredCapabilitiesForCreativeType(creativeType);
      expect(Array.isArray(required)).toBe(true);
      for (const key of required) {
        expect(
          (ADS_PLACEMENT_COMPATIBILITY_CAPABILITY_KEYS as readonly string[]).includes(
            key
          )
        ).toBe(true);
      }
    }

    expect(listRequiredCapabilitiesForCreativeType("video")).toEqual([
      "supportsVideo",
    ]);
    expect(listRequiredCapabilitiesForCreativeType("store_promotion")).toEqual([
      "supportsStorePromotion",
    ]);
    expect(listRequiredCapabilitiesForCreativeType("text")).toEqual([]);
  });

  it("resolves platform placement and creative type ids deterministically", () => {
    expect(resolvePlatformPlacementId("WATCH_FEED")).toBe("WATCH_FEED");
    expect(resolvePlatformPlacementId("watch_feed")).toBe("WATCH_FEED");
    expect(resolvePlatformPlacementId("nope")).toBeNull();

    expect(resolvePlatformCreativeType("video")).toBe("video");
    expect(resolvePlatformCreativeType("VIDEO")).toBe("video");
    expect(resolvePlatformCreativeType("audio")).toBeNull();
  });

  it("resolveCapabilityProfile uses authoritative registry when omitted", () => {
    const result = resolveCapabilityProfile(undefined, "LEARNING");
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.capabilities).toBe(
        ADS_PLACEMENT_COMPATIBILITY.LEARNING.capabilities
      );
    }
  });

  it("produces deterministic output for identical inputs", () => {
    const input = {
      placement: "GAMES" as const,
      creativeType: "game_promotion" as const,
    };
    const first = validateCreativePlacementCompatibility(input);
    const second = validateCreativePlacementCompatibility(input);
    expect(first).toEqual(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(second)).toBe(true);
  });

  it("does not mutate input objects (immutability)", () => {
    const input = {
      placement: "STORE_HOME",
      creativeType: "store_promotion",
      capabilityProfile: {
        placementId: "STORE_HOME" as AdsPlatformPlacementId,
        contractVersion: ADS_PLACEMENT_COMPATIBILITY_CONTRACT_VERSION,
        capabilities: { ...getPlacementCompatibility("STORE_HOME").capabilities },
      },
    };
    const snapshot = structuredClone(input);
    validateCreativePlacementCompatibility(input);
    isCreativeCompatible(
      input.placement,
      input.creativeType,
      input.capabilityProfile
    );
    listSupportedCreativeTypes(input.placement, input.capabilityProfile);
    expect(input).toEqual(snapshot);
  });

  it("getPlacementCompatibilityForCreative mirrors the gate", () => {
    expect(getPlacementCompatibilityForCreative("SEARCH", "text")).toEqual(
      validateCreativePlacementCompatibility({
        placement: "SEARCH",
        creativeType: "text",
      })
    );
    expect(
      getPlacementCompatibilityForCreative("LIVE_ROOM", "video").compatible
    ).toBe(false);
  });

  it("always returns productionEnabled false", () => {
    const cases = [
      { placement: "WATCH_FEED", creativeType: "video" },
      { placement: "WATCH_FEED", creativeType: "game_promotion" },
      { placement: "NOT_REAL", creativeType: "video" },
      { placement: "WATCH_FEED", creativeType: "not_real" },
    ];
    for (const input of cases) {
      expect(
        validateCreativePlacementCompatibility(input).productionEnabled
      ).toBe(false);
    }
  });

  it("aligns required capabilities with placement compatibility media flags", () => {
    for (const placementId of ADS_PLATFORM_PLACEMENT_IDS) {
      const capabilities = getPlacementCompatibility(placementId).capabilities;
      const listed = listSupportedCreativeTypes(placementId);

      if (capabilities.supportsVideo) {
        expect(
          listed.includes("video") ||
            !isCreativeTypeSupportedByPlacement(placementId, "video")
        ).toBe(true);
      } else {
        expect(listed).not.toContain("video");
      }

      if (!capabilities.supportsStorePromotion) {
        expect(listed).not.toContain("store_promotion");
      }
      if (!capabilities.supportsLearningPromotion) {
        expect(listed).not.toContain("learning_promotion");
      }
    }
  });

  it("has no runtime product, delivery, or network dependencies", () => {
    expect(SOURCE).not.toMatch(/from ["']@\//);
    expect(SOURCE).not.toMatch(/from ["']\.\.\/\.\.\//);
    expect(SOURCE).not.toMatch(
      /from ["'][^"']*(watch|discover|live|store|messenger|games|learning|search|notifications)/i
    );
    expect(SOURCE).not.toMatch(/\bfetch\b|\baxios\b|createClient|supabase/i);
    expect(SOURCE).not.toMatch(/ADS_DELIVERY_ENABLED\s*=\s*true/);
    expect(SOURCE).not.toMatch(/Math\.random|Date\.now|performance\.now/);
    expect(SOURCE).toMatch(/placementRegistry/);
    expect(SOURCE).toMatch(/placementCompatibility/);
    expect(SOURCE).toMatch(/creativeContracts/);
    expect(SOURCE).toMatch(/taxonomyMapper/);
    expect(SOURCE).toMatch(/productionEnabled: false/);
  });
});
