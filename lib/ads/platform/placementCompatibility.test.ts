import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ADS_PLACEMENT_REGISTRY,
  ADS_PLATFORM_PLACEMENT_IDS,
} from "./placementRegistry";
import {
  ADS_PLACEMENT_COMPATIBILITY,
  ADS_PLACEMENT_COMPATIBILITY_CAPABILITY_KEYS,
  ADS_PLACEMENT_COMPATIBILITY_CONTRACT_VERSION,
  collectIncompatibleCapabilityIssues,
  getPlacementCompatibility,
  isAdsPlacementCompatibilityCapabilityKey,
  listPlacementCapabilities,
  placementSupportsCapability,
  validatePlacementCompatibility,
  validatePlacementCompatibilityProfile,
  validatePlacementCompatibilityRegistry,
  type AdsPlacementCompatibilityCapabilities,
  type AdsPlacementCompatibilityProfile,
} from "./placementCompatibility";

const SOURCE_PATH = path.join(__dirname, "placementCompatibility.ts");
const SOURCE = readFileSync(SOURCE_PATH, "utf8");

function baseCapabilities(
  overrides: Partial<AdsPlacementCompatibilityCapabilities> = {}
): AdsPlacementCompatibilityCapabilities {
  return {
    supportsVideo: true,
    supportsImage: true,
    supportsCarousel: false,
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

function baseProfile(
  overrides: Partial<AdsPlacementCompatibilityProfile> = {}
): AdsPlacementCompatibilityProfile {
  return {
    placementId: "WATCH_FEED",
    contractVersion: ADS_PLACEMENT_COMPATIBILITY_CONTRACT_VERSION,
    capabilities: baseCapabilities(),
    ...overrides,
  };
}

describe("Ads Placement Compatibility Foundation V1", () => {
  it("exposes a profile for every stable placement id", () => {
    expect(Object.keys(ADS_PLACEMENT_COMPATIBILITY).sort()).toEqual(
      [...ADS_PLATFORM_PLACEMENT_IDS].sort()
    );

    for (const placementId of ADS_PLATFORM_PLACEMENT_IDS) {
      const profile = getPlacementCompatibility(placementId);
      expect(profile.placementId).toBe(placementId);
      expect(profile.contractVersion).toBe(
        ADS_PLACEMENT_COMPATIBILITY_CONTRACT_VERSION
      );
      expect(validatePlacementCompatibilityProfile(profile)).toEqual({
        valid: true,
      });
    }

    expect(validatePlacementCompatibility()).toEqual({ valid: true });
  });

  it("declares every required capability field on each profile", () => {
    for (const placementId of ADS_PLATFORM_PLACEMENT_IDS) {
      const { capabilities } = getPlacementCompatibility(placementId);
      for (const key of ADS_PLACEMENT_COMPATIBILITY_CAPABILITY_KEYS) {
        expect(typeof capabilities[key]).toBe("boolean");
      }
      expect(Object.keys(capabilities).sort()).toEqual(
        [...ADS_PLACEMENT_COMPATIBILITY_CAPABILITY_KEYS].sort()
      );
    }
  });

  it("rejects duplicate placement ids", () => {
    const duplicated = {
      ...ADS_PLACEMENT_COMPATIBILITY,
      WATCH_FEED_DUP: {
        ...getPlacementCompatibility("WATCH_FEED"),
        placementId: "WATCH_FEED",
      },
    };

    const result = validatePlacementCompatibilityRegistry(duplicated);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues.some((issue) => issue.includes("unknown placement"))).toBe(
        true
      );
    }

    const twinProfiles = {
      WATCH_FEED: getPlacementCompatibility("WATCH_FEED"),
      DISCOVER_FEED: {
        ...getPlacementCompatibility("DISCOVER_FEED"),
        placementId: "WATCH_FEED",
      },
      WORLD_FEED: getPlacementCompatibility("WORLD_FEED"),
      WORLD_PLACE: getPlacementCompatibility("WORLD_PLACE"),
      WORLD_NEARBY: getPlacementCompatibility("WORLD_NEARBY"),
      LIVE_FEED: getPlacementCompatibility("LIVE_FEED"),
      LIVE_ROOM: getPlacementCompatibility("LIVE_ROOM"),
      STORE_HOME: getPlacementCompatibility("STORE_HOME"),
      STORE_PRODUCT: getPlacementCompatibility("STORE_PRODUCT"),
      SEARCH: getPlacementCompatibility("SEARCH"),
      LEARNING: getPlacementCompatibility("LEARNING"),
      GAMES: getPlacementCompatibility("GAMES"),
    };

    const twinResult = validatePlacementCompatibility(twinProfiles);
    expect(twinResult.valid).toBe(false);
    if (!twinResult.valid) {
      expect(
        twinResult.issues.some((issue) =>
          issue.includes("Duplicate placement id: WATCH_FEED")
        )
      ).toBe(true);
    }
  });

  it("rejects malformed profiles", () => {
    expect(validatePlacementCompatibility(null)).toMatchObject({
      valid: false,
    });
    expect(validatePlacementCompatibility("WATCH_FEED")).toMatchObject({
      valid: false,
    });
    expect(validatePlacementCompatibility(42)).toMatchObject({ valid: false });

    expect(
      validatePlacementCompatibilityProfile({
        placementId: "NOT_A_PLACEMENT",
        contractVersion: 1,
        capabilities: baseCapabilities(),
      })
    ).toMatchObject({ valid: false });

    expect(
      validatePlacementCompatibilityProfile({
        placementId: "WATCH_FEED",
        contractVersion: 2,
        capabilities: baseCapabilities(),
      })
    ).toMatchObject({ valid: false });

    expect(
      validatePlacementCompatibilityProfile({
        placementId: "WATCH_FEED",
        contractVersion: 1,
        capabilities: baseCapabilities(),
        extra: true,
      })
    ).toMatchObject({ valid: false });

    const missingCapability = baseCapabilities();
    const {
      supportsVideo: _removed,
      ...withoutVideo
    } = missingCapability as AdsPlacementCompatibilityCapabilities & {
      supportsVideo?: boolean;
    };
    void _removed;

    expect(
      validatePlacementCompatibilityProfile({
        placementId: "WATCH_FEED",
        contractVersion: 1,
        capabilities: withoutVideo,
      })
    ).toMatchObject({ valid: false });

    expect(
      validatePlacementCompatibilityProfile({
        placementId: "WATCH_FEED",
        contractVersion: 1,
        capabilities: {
          ...baseCapabilities(),
          supportsVideo: "yes",
        },
      })
    ).toMatchObject({ valid: false });
  });

  it("rejects unknown capability names", () => {
    const result = validatePlacementCompatibilityProfile({
      placementId: "WATCH_FEED",
      contractVersion: 1,
      capabilities: {
        ...baseCapabilities(),
        supportsAuction: true,
      },
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(
        result.issues.some((issue) =>
          issue.includes('unknown capability "supportsAuction"')
        )
      ).toBe(true);
    }
  });

  it("rejects incompatible capability combinations", () => {
    expect(
      collectIncompatibleCapabilityIssues(
        baseCapabilities({
          supportsVideo: false,
          supportsImage: false,
          supportsCarousel: false,
          supportsInteractive: false,
        })
      ).length
    ).toBeGreaterThan(0);

    expect(
      collectIncompatibleCapabilityIssues(
        baseCapabilities({
          supportsVertical: false,
          supportsHorizontal: false,
        })
      ).length
    ).toBeGreaterThan(0);

    expect(
      collectIncompatibleCapabilityIssues(
        baseCapabilities({
          supportsFullScreen: true,
          supportsOverlay: true,
        })
      ).length
    ).toBeGreaterThan(0);

    expect(
      collectIncompatibleCapabilityIssues(
        baseCapabilities({
          supportsCarousel: true,
          supportsImage: false,
        })
      ).length
    ).toBeGreaterThan(0);

    expect(
      validatePlacementCompatibilityProfile(
        baseProfile({
          capabilities: baseCapabilities({
            supportsFullScreen: true,
            supportsOverlay: true,
          }),
        })
      )
    ).toMatchObject({ valid: false });
  });

  it("provides deterministic helper output", () => {
    const first = getPlacementCompatibility("SEARCH");
    const second = getPlacementCompatibility("SEARCH");
    expect(first).toEqual(second);
    expect(first).toBe(ADS_PLACEMENT_COMPATIBILITY.SEARCH);

    expect(listPlacementCapabilities()).toEqual(
      ADS_PLACEMENT_COMPATIBILITY_CAPABILITY_KEYS
    );
    expect(listPlacementCapabilities("WATCH_FEED")).toEqual([
      "supportsVideo",
      "supportsImage",
      "supportsCarousel",
      "supportsSponsoredContent",
      "supportsVertical",
      "supportsFullScreen",
      "supportsFeed",
    ]);
    expect(listPlacementCapabilities("LIVE_ROOM")).toEqual([
      "supportsImage",
      "supportsSponsoredContent",
      "supportsHorizontal",
      "supportsOverlay",
    ]);

    expect(placementSupportsCapability("STORE_HOME", "supportsStorePromotion")).toBe(
      true
    );
    expect(placementSupportsCapability("WATCH_FEED", "supportsStorePromotion")).toBe(
      false
    );
    expect(isAdsPlacementCompatibilityCapabilityKey("supportsVideo")).toBe(true);
    expect(isAdsPlacementCompatibilityCapabilityKey("supportsAuction")).toBe(
      false
    );
  });

  it("keeps profiles and capability bags immutable", () => {
    const profile = getPlacementCompatibility("GAMES");
    const capabilities = profile.capabilities;

    expect(Object.isFrozen(ADS_PLACEMENT_COMPATIBILITY)).toBe(true);
    expect(Object.isFrozen(profile)).toBe(true);
    expect(Object.isFrozen(capabilities)).toBe(true);

    expect(() => {
      (profile as { placementId: string }).placementId = "SEARCH";
    }).toThrow();
    expect(() => {
      (capabilities as { supportsVideo: boolean }).supportsVideo = false;
    }).toThrow();

    const listed = listPlacementCapabilities("GAMES");
    expect(Object.isFrozen(listed)).toBe(true);
    expect(() => {
      (listed as unknown as string[]).push("supportsInteractive");
    }).toThrow();

    expect(profile.placementId).toBe("GAMES");
    expect(capabilities.supportsVideo).toBe(true);
  });

  it("does not mutate caller-supplied validation input", () => {
    const input = baseProfile({
      capabilities: baseCapabilities({ supportsOverlay: true, supportsFullScreen: true }),
    });
    Object.freeze(input);
    Object.freeze(input.capabilities);

    const snapshot = structuredClone(input);
    const result = validatePlacementCompatibility(input);
    expect(result.valid).toBe(false);
    expect(input).toEqual(snapshot);
  });

  it("fails closed for incomplete registries and ambiguous input", () => {
    const partial = {
      WATCH_FEED: getPlacementCompatibility("WATCH_FEED"),
    };
    const result = validatePlacementCompatibility(partial);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(
        result.issues.some((issue) => issue.includes('missing placement "DISCOVER_FEED"'))
      ).toBe(true);
    }

    expect(validatePlacementCompatibility({})).toMatchObject({ valid: false });
  });

  it("aligns media capability flags with placement registry creative types", () => {
    for (const placementId of ADS_PLATFORM_PLACEMENT_IDS) {
      const registryTypes = ADS_PLACEMENT_REGISTRY[placementId]
        .supportedCreativeTypes as readonly string[];
      const capabilities = getPlacementCompatibility(placementId).capabilities;

      expect(capabilities.supportsVideo).toBe(registryTypes.includes("video"));
      expect(capabilities.supportsImage).toBe(registryTypes.includes("image"));
      expect(capabilities.supportsCarousel).toBe(
        registryTypes.includes("carousel")
      );
      expect(capabilities.supportsStorePromotion).toBe(
        registryTypes.includes("store_promotion")
      );
      expect(capabilities.supportsLearningPromotion).toBe(
        registryTypes.includes("learning_promotion")
      );
      expect(capabilities.supportsSponsoredContent).toBe(true);
    }
  });

  it("has no runtime product, delivery, or network dependencies", () => {
    expect(SOURCE).not.toMatch(/from ["']@\//);
    expect(SOURCE).not.toMatch(/from ["']\.\.\/\.\.\//);
    expect(SOURCE).not.toMatch(/from ["'][^"']*(watch|discover|live|store|messenger|games|learning|search|notifications)/i);
    expect(SOURCE).not.toMatch(/\bfetch\b|\baxios\b|createClient|supabase/i);
    expect(SOURCE).not.toMatch(/ADS_DELIVERY_ENABLED/);
    expect(SOURCE).not.toMatch(/Math\.random|Date\.now|performance\.now/);
    expect(SOURCE).toMatch(/placementRegistry/);
    expect(SOURCE).toMatch(/creativeContracts/);
  });
});
