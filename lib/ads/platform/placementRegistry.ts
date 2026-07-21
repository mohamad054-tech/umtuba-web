import type { AdsPlatformCreativeType } from "./creativeContracts";

export const ADS_PLATFORM_PLACEMENT_IDS = [
  "WATCH_FEED",
  "DISCOVER_FEED",
  "WORLD_FEED",
  "WORLD_PLACE",
  "WORLD_NEARBY",
  "LIVE_FEED",
  "LIVE_ROOM",
  "STORE_HOME",
  "STORE_PRODUCT",
  "SEARCH",
  "LEARNING",
  "GAMES",
] as const;

export type AdsPlatformPlacementId =
  (typeof ADS_PLATFORM_PLACEMENT_IDS)[number];

export const ADS_PLATFORM_PRODUCTS = [
  "watch",
  "discover",
  "world",
  "live",
  "store",
  "search",
  "learning",
  "games",
] as const;

export type AdsPlatformProduct = (typeof ADS_PLATFORM_PRODUCTS)[number];

export const ADS_PLACEMENT_CAPABILITIES = [
  "feed",
  "detail",
  "nearby_context",
  "live_context",
  "commerce_context",
  "search_context",
  "learning_context",
  "game_context",
  "autoplay",
  "full_bleed",
] as const;

export type AdsPlacementCapability =
  (typeof ADS_PLACEMENT_CAPABILITIES)[number];

export type AdsPlacementVisibility = "hidden" | "internal" | "public";

export type AdsPlacementDefinition = Readonly<{
  id: AdsPlatformPlacementId;
  displayName: string;
  owningProduct: AdsPlatformProduct;
  supportedCreativeTypes: readonly AdsPlatformCreativeType[];
  featureFlag: Readonly<{
    key: `ADS_PLACEMENT_${AdsPlatformPlacementId}_ENABLED`;
    enabledByDefault: false;
  }>;
  capabilities: readonly AdsPlacementCapability[];
  visibility: AdsPlacementVisibility;
}>;

const hiddenFlag = <TId extends AdsPlatformPlacementId>(
  id: TId
): AdsPlacementDefinition["featureFlag"] => ({
  key: `ADS_PLACEMENT_${id}_ENABLED`,
  enabledByDefault: false,
});

export const ADS_PLACEMENT_REGISTRY = {
  WATCH_FEED: {
    id: "WATCH_FEED",
    displayName: "Watch Feed",
    owningProduct: "watch",
    supportedCreativeTypes: ["video", "image", "carousel", "brand"],
    featureFlag: hiddenFlag("WATCH_FEED"),
    capabilities: ["feed", "autoplay", "full_bleed"],
    visibility: "hidden",
  },
  DISCOVER_FEED: {
    id: "DISCOVER_FEED",
    displayName: "Discover Feed",
    owningProduct: "discover",
    supportedCreativeTypes: ["video", "image", "carousel", "text", "brand"],
    featureFlag: hiddenFlag("DISCOVER_FEED"),
    capabilities: ["feed", "autoplay"],
    visibility: "hidden",
  },
  WORLD_FEED: {
    id: "WORLD_FEED",
    displayName: "World Feed",
    owningProduct: "world",
    supportedCreativeTypes: ["video", "image", "carousel", "brand"],
    featureFlag: hiddenFlag("WORLD_FEED"),
    capabilities: ["feed"],
    visibility: "hidden",
  },
  WORLD_PLACE: {
    id: "WORLD_PLACE",
    displayName: "World Place",
    owningProduct: "world",
    supportedCreativeTypes: [
      "image",
      "carousel",
      "store_promotion",
      "brand",
    ],
    featureFlag: hiddenFlag("WORLD_PLACE"),
    capabilities: ["detail", "commerce_context"],
    visibility: "hidden",
  },
  WORLD_NEARBY: {
    id: "WORLD_NEARBY",
    displayName: "World Nearby",
    owningProduct: "world",
    supportedCreativeTypes: ["image", "store_promotion", "brand"],
    featureFlag: hiddenFlag("WORLD_NEARBY"),
    capabilities: ["nearby_context"],
    visibility: "hidden",
  },
  LIVE_FEED: {
    id: "LIVE_FEED",
    displayName: "Live Feed",
    owningProduct: "live",
    supportedCreativeTypes: ["video", "image", "live_promotion", "brand"],
    featureFlag: hiddenFlag("LIVE_FEED"),
    capabilities: ["feed", "live_context", "autoplay"],
    visibility: "hidden",
  },
  LIVE_ROOM: {
    id: "LIVE_ROOM",
    displayName: "Live Room",
    owningProduct: "live",
    supportedCreativeTypes: ["image", "text", "live_promotion", "brand"],
    featureFlag: hiddenFlag("LIVE_ROOM"),
    capabilities: ["detail", "live_context"],
    visibility: "hidden",
  },
  STORE_HOME: {
    id: "STORE_HOME",
    displayName: "Store Home",
    owningProduct: "store",
    supportedCreativeTypes: [
      "image",
      "carousel",
      "store_promotion",
      "brand",
    ],
    featureFlag: hiddenFlag("STORE_HOME"),
    capabilities: ["feed", "commerce_context"],
    visibility: "hidden",
  },
  STORE_PRODUCT: {
    id: "STORE_PRODUCT",
    displayName: "Store Product",
    owningProduct: "store",
    supportedCreativeTypes: ["image", "carousel", "store_promotion", "brand"],
    featureFlag: hiddenFlag("STORE_PRODUCT"),
    capabilities: ["detail", "commerce_context"],
    visibility: "hidden",
  },
  SEARCH: {
    id: "SEARCH",
    displayName: "Search",
    owningProduct: "search",
    supportedCreativeTypes: [
      "text",
      "image",
      "store_promotion",
      "learning_promotion",
      "game_promotion",
      "brand",
    ],
    featureFlag: hiddenFlag("SEARCH"),
    capabilities: ["search_context"],
    visibility: "hidden",
  },
  LEARNING: {
    id: "LEARNING",
    displayName: "UM Learning",
    owningProduct: "learning",
    supportedCreativeTypes: [
      "video",
      "image",
      "carousel",
      "text",
      "learning_promotion",
      "brand",
    ],
    featureFlag: hiddenFlag("LEARNING"),
    capabilities: ["feed", "learning_context"],
    visibility: "hidden",
  },
  GAMES: {
    id: "GAMES",
    displayName: "Games",
    owningProduct: "games",
    supportedCreativeTypes: [
      "video",
      "image",
      "carousel",
      "game_promotion",
      "brand",
    ],
    featureFlag: hiddenFlag("GAMES"),
    capabilities: ["feed", "game_context", "full_bleed"],
    visibility: "hidden",
  },
} as const satisfies Record<AdsPlatformPlacementId, AdsPlacementDefinition>;

export function getAdsPlacement(
  id: AdsPlatformPlacementId
): AdsPlacementDefinition {
  return ADS_PLACEMENT_REGISTRY[id];
}

export function isAdsPlacementId(
  value: string
): value is AdsPlatformPlacementId {
  return (ADS_PLATFORM_PLACEMENT_IDS as readonly string[]).includes(value);
}

export function isCreativeTypeSupportedByPlacement(
  placementId: AdsPlatformPlacementId,
  creativeType: AdsPlatformCreativeType
): boolean {
  return (
    ADS_PLACEMENT_REGISTRY[placementId]
      .supportedCreativeTypes as readonly AdsPlatformCreativeType[]
  ).includes(creativeType);
}

export function validateAdsPlacementRegistry(): readonly string[] {
  const issues: string[] = [];
  const definitions = Object.values(ADS_PLACEMENT_REGISTRY);
  const ids = new Set<string>();
  const featureFlags = new Set<string>();

  for (const definition of definitions) {
    if (ids.has(definition.id)) {
      issues.push(`Duplicate placement id: ${definition.id}`);
    }
    ids.add(definition.id);

    if (featureFlags.has(definition.featureFlag.key)) {
      issues.push(`Duplicate feature flag: ${definition.featureFlag.key}`);
    }
    featureFlags.add(definition.featureFlag.key);

    if (
      (definition.supportedCreativeTypes as readonly AdsPlatformCreativeType[])
        .length === 0
    ) {
      issues.push(`Placement ${definition.id} has no creative types.`);
    }
    if (definition.featureFlag.enabledByDefault !== false) {
      issues.push(`Placement ${definition.id} must be disabled by default.`);
    }
    if (definition.visibility !== "hidden") {
      issues.push(`Placement ${definition.id} must be hidden by default.`);
    }
  }

  if (definitions.length !== ADS_PLATFORM_PLACEMENT_IDS.length) {
    issues.push("Placement registry does not cover every stable placement id.");
  }

  return issues;
}
