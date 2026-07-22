import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AD_PLACEMENTS, CREATIVE_TYPES } from "../constants";
import {
  ADS_PLATFORM_CREATIVE_TYPES,
} from "./creativeContracts";
import { ADS_EVENT_REPORT_EVENT_TYPES } from "./eventReportContracts";
import {
  ADS_PLACEMENT_CAPABILITIES,
  ADS_PLATFORM_PLACEMENT_IDS,
} from "./placementRegistry";
import {
  ADS_PLACEMENT_COMPATIBILITY_CAPABILITY_KEYS,
} from "./placementCompatibility";
import {
  ADS_CANONICAL_CAPABILITY_IDS,
  ADS_CANONICAL_CREATIVE_TYPES,
  ADS_CANONICAL_EVENT_TYPES,
  ADS_CANONICAL_PLACEMENT_IDS,
  ADS_TAXONOMY_CAPABILITY_IDS,
  ADS_TAXONOMY_CONTRACT_VERSION,
  ADS_TAXONOMY_CREATIVE_TYPES,
  ADS_TAXONOMY_EVENT_TYPES,
  ADS_TAXONOMY_PLACEMENT_IDS,
  isCanonicalCapabilityId,
  isCanonicalCreativeType,
  isCanonicalEventType,
  isCanonicalPlacementId,
  listCanonicalCapabilityIds,
  listCanonicalCreativeTypes,
  listCanonicalEventTypes,
  listCanonicalPlacementIds,
  validateCanonicalCapabilityIds,
  validateCanonicalTaxonomy,
} from "./taxonomy";
import {
  ADS_CAPABILITY_TAXONOMY_MAP,
  ADS_CREATIVE_TYPE_TAXONOMY_MAP,
  ADS_EVENT_TYPE_TAXONOMY_MAP,
  ADS_PLACEMENT_TAXONOMY_MAP,
  getCanonicalCapability,
  getCanonicalCreativeType,
  getCanonicalEventType,
  getCanonicalPlacement,
  listLegacyAliases,
  validateTaxonomy,
  validateTaxonomyMappingTable,
  validateTaxonomyMappings,
  type AdsTaxonomyMappingEntry,
} from "./taxonomyMapper";

const TAXONOMY_SOURCE = readFileSync(
  path.join(__dirname, "taxonomy.ts"),
  "utf8"
);
const MAPPER_SOURCE = readFileSync(
  path.join(__dirname, "taxonomyMapper.ts"),
  "utf8"
);

/** Expected Layer 0 + design-doc placement alias outcomes. */
const LEGACY_PLACEMENT_EXPECTATIONS: Readonly<
  Record<string, (typeof ADS_CANONICAL_PLACEMENT_IDS)[number]>
> = {
  watch_feed: "WATCH_FEED",
  discover_feed: "DISCOVER_FEED",
  stories: "DISCOVER_FEED",
  live_lobby: "LIVE_FEED",
  search_results: "SEARCH",
  store_catalog: "STORE_HOME",
  profile_feed: "DISCOVER_FEED",
  world_feed: "WORLD_FEED",
  world_place: "WORLD_PLACE",
  world_nearby: "WORLD_NEARBY",
  world_city: "WORLD_PLACE",
  live_feed: "LIVE_FEED",
  live_room: "LIVE_ROOM",
  live_in_stream: "LIVE_ROOM",
  store_home: "STORE_HOME",
  store_product: "STORE_PRODUCT",
  search: "SEARCH",
  learning: "LEARNING",
  learning_promo: "LEARNING",
  games: "GAMES",
  games_promo: "GAMES",
};

describe("Ads Taxonomy Unification Foundation V1", () => {
  it("exposes contract version and frozen canonical registries", () => {
    expect(ADS_TAXONOMY_CONTRACT_VERSION).toBe(1);
    expect(Object.isFrozen(ADS_TAXONOMY_PLACEMENT_IDS)).toBe(true);
    expect(Object.isFrozen(ADS_TAXONOMY_CREATIVE_TYPES)).toBe(true);
    expect(Object.isFrozen(ADS_TAXONOMY_EVENT_TYPES)).toBe(true);
    expect(Object.isFrozen(ADS_TAXONOMY_CAPABILITY_IDS)).toBe(true);
    expect(Object.isFrozen(ADS_PLACEMENT_TAXONOMY_MAP)).toBe(true);
    expect(Object.isFrozen(ADS_CREATIVE_TYPE_TAXONOMY_MAP)).toBe(true);
    expect(Object.isFrozen(ADS_EVENT_TYPE_TAXONOMY_MAP)).toBe(true);
    expect(Object.isFrozen(ADS_CAPABILITY_TAXONOMY_MAP)).toBe(true);

    expect(() => {
      (ADS_TAXONOMY_PLACEMENT_IDS as unknown as string[]).push("X");
    }).toThrow();
    expect(() => {
      (ADS_PLACEMENT_TAXONOMY_MAP as { watch_feed?: string }).watch_feed =
        "GAMES";
    }).toThrow();
  });

  it("aligns canonical placements with the placement registry", () => {
    expect([...ADS_CANONICAL_PLACEMENT_IDS].sort()).toEqual(
      [...ADS_PLATFORM_PLACEMENT_IDS].sort()
    );
  });

  it("covers every platform creative type as a canonical creative type", () => {
    for (const type of ADS_PLATFORM_CREATIVE_TYPES) {
      expect(getCanonicalCreativeType(type)).toBe(type.toUpperCase());
      expect(isCanonicalCreativeType(type.toUpperCase())).toBe(true);
    }
  });

  it("covers every event-report event type", () => {
    for (const eventType of ADS_EVENT_REPORT_EVENT_TYPES) {
      expect(getCanonicalEventType(eventType)).toBe(eventType.toUpperCase());
    }
  });

  it("covers every placement-registry and compatibility capability", () => {
    for (const capability of ADS_PLACEMENT_CAPABILITIES) {
      expect(isCanonicalCapabilityId(getCanonicalCapability(capability))).toBe(
        true
      );
    }
    for (const key of ADS_PLACEMENT_COMPATIBILITY_CAPABILITY_KEYS) {
      expect(isCanonicalCapabilityId(getCanonicalCapability(key))).toBe(true);
    }
  });

  it("maps every Layer 0 placement alias correctly", () => {
    for (const placement of AD_PLACEMENTS) {
      expect(LEGACY_PLACEMENT_EXPECTATIONS[placement]).toBeDefined();
      expect(getCanonicalPlacement(placement)).toBe(
        LEGACY_PLACEMENT_EXPECTATIONS[placement]
      );
    }
  });

  it("maps every documented legacy placement correctly", () => {
    for (const [alias, canonical] of Object.entries(
      LEGACY_PLACEMENT_EXPECTATIONS
    )) {
      expect(getCanonicalPlacement(alias)).toBe(canonical);
      expect(getCanonicalPlacement(canonical)).toBe(canonical);
    }
  });

  it("maps Layer 0 creative types deterministically", () => {
    expect(getCanonicalCreativeType("image")).toBe("IMAGE");
    expect(getCanonicalCreativeType("video")).toBe("VIDEO");
    expect(getCanonicalCreativeType("story")).toBe("IMAGE");
    expect(getCanonicalCreativeType("native")).toBe("BRAND");
    for (const type of CREATIVE_TYPES) {
      expect(isCanonicalCreativeType(getCanonicalCreativeType(type))).toBe(
        true
      );
    }
  });

  it("maps capabilities and event types deterministically", () => {
    expect(getCanonicalCapability("feed")).toBe("FEED");
    expect(getCanonicalCapability("supportsVideo")).toBe("SUPPORTS_VIDEO");
    expect(getCanonicalCapability("SUPPORTS_VIDEO")).toBe("SUPPORTS_VIDEO");
    expect(getCanonicalEventType("impression")).toBe("IMPRESSION");
    expect(getCanonicalEventType("click")).toBe("CLICK");
    expect(getCanonicalEventType("qualified_view")).toBe("QUALIFIED_VIEW");

    // Determinism: repeated calls are stable.
    for (let i = 0; i < 5; i += 1) {
      expect(getCanonicalPlacement("watch_feed")).toBe("WATCH_FEED");
      expect(getCanonicalCreativeType("carousel")).toBe("CAROUSEL");
      expect(getCanonicalEventType("purchase")).toBe("PURCHASE");
      expect(getCanonicalCapability("full_bleed")).toBe("FULL_BLEED");
    }
  });

  it("exposes helper list APIs", () => {
    expect(listCanonicalPlacementIds()).toEqual(ADS_CANONICAL_PLACEMENT_IDS);
    expect(listCanonicalCreativeTypes()).toEqual(ADS_CANONICAL_CREATIVE_TYPES);
    expect(listCanonicalEventTypes()).toEqual(ADS_CANONICAL_EVENT_TYPES);
    expect(listCanonicalCapabilityIds()).toEqual(ADS_CANONICAL_CAPABILITY_IDS);

    const placementAliases = listLegacyAliases({ kind: "placement" });
    expect(placementAliases).toContain("watch_feed");
    expect(placementAliases).not.toContain("WATCH_FEED");
    expect(Object.isFrozen(placementAliases)).toBe(true);

    const watchAliases = listLegacyAliases({
      kind: "placement",
      canonicalId: "WATCH_FEED",
    });
    expect(watchAliases).toEqual(["watch_feed"]);

    const allAliases = listLegacyAliases();
    expect(allAliases.length).toBeGreaterThan(placementAliases.length);
    expect(allAliases).toContain("supportsVideo");
    expect(allAliases).toContain("impression");
  });

  it("rejects unknown ids (fail closed)", () => {
    expect(() => getCanonicalPlacement("messages_promo")).toThrow(
      /Unknown placement/
    );
    expect(() => getCanonicalPlacement("")).toThrow(/Unknown placement/);
    expect(() => getCanonicalCreativeType("banner")).toThrow(
      /Unknown creative_type/
    );
    expect(() => getCanonicalEventType("viewability")).toThrow(
      /Unknown event_type/
    );
    expect(() => getCanonicalCapability("supportsAuction")).toThrow(
      /Unknown capability/
    );
    expect(isCanonicalPlacementId("watch_feed")).toBe(false);
    expect(isCanonicalCreativeType("video")).toBe(false);
    expect(isCanonicalEventType("click")).toBe(false);
    expect(isCanonicalCapabilityId("feed")).toBe(false);
  });

  it("rejects duplicate aliases", () => {
    const entries: AdsTaxonomyMappingEntry<(typeof ADS_CANONICAL_PLACEMENT_IDS)[number]>[] =
      [
        { alias: "WATCH_FEED", canonical: "WATCH_FEED" },
        { alias: "dup", canonical: "WATCH_FEED" },
        { alias: "dup", canonical: "WATCH_FEED" },
      ];
    const result = validateTaxonomyMappingTable(
      { kind: "placement", entries },
      isCanonicalPlacementId
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues.some((issue) => issue.includes("Duplicate alias"))).toBe(
        true
      );
    }
  });

  it("rejects conflicting mappings", () => {
    const entries: AdsTaxonomyMappingEntry<(typeof ADS_CANONICAL_PLACEMENT_IDS)[number]>[] =
      [
        { alias: "WATCH_FEED", canonical: "WATCH_FEED" },
        { alias: "legacy_x", canonical: "WATCH_FEED" },
        { alias: "legacy_x", canonical: "DISCOVER_FEED" },
      ];
    const result = validateTaxonomyMappingTable(
      { kind: "placement", entries },
      isCanonicalPlacementId
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(
        result.issues.some((issue) => issue.includes("Duplicate alias"))
      ).toBe(true);
    }

    const remapped = validateTaxonomyMappingTable(
      {
        kind: "placement",
        entries: [
          { alias: "WATCH_FEED", canonical: "DISCOVER_FEED" },
          { alias: "DISCOVER_FEED", canonical: "DISCOVER_FEED" },
        ],
      },
      isCanonicalPlacementId
    );
    expect(remapped.valid).toBe(false);
    if (!remapped.valid) {
      expect(
        remapped.issues.some((issue) =>
          issue.includes("Conflicting remapping of canonical id")
        )
      ).toBe(true);
    }
  });

  it("rejects unknown canonical references", () => {
    const result = validateTaxonomyMappingTable(
      {
        kind: "placement",
        entries: [
          {
            alias: "orphan",
            canonical: "NOT_A_PLACEMENT" as (typeof ADS_CANONICAL_PLACEMENT_IDS)[number],
          },
        ],
      },
      isCanonicalPlacementId
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(
        result.issues.some((issue) =>
          issue.includes("Unknown canonical reference")
        )
      ).toBe(true);
    }
  });

  it("rejects circular mappings", () => {
    const result = validateTaxonomyMappingTable(
      {
        kind: "placement",
        entries: [
          { alias: "WATCH_FEED", canonical: "DISCOVER_FEED" },
          { alias: "DISCOVER_FEED", canonical: "WATCH_FEED" },
        ],
      },
      isCanonicalPlacementId
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(
        result.issues.some((issue) => issue.includes("Circular mapping"))
      ).toBe(true);
    }
  });

  it("rejects invalid capability ids", () => {
    const capabilityResult = validateCanonicalCapabilityIds([
      "FEED",
      "NOT_REAL",
      "FEED",
    ]);
    expect(capabilityResult.valid).toBe(false);
    if (!capabilityResult.valid) {
      expect(
        capabilityResult.issues.some((issue) =>
          issue.includes("Unknown canonical capability id")
        )
      ).toBe(true);
      expect(
        capabilityResult.issues.some((issue) =>
          issue.includes("Duplicate canonical capability id")
        )
      ).toBe(true);
    }

    const mappingResult = validateTaxonomyMappingTable(
      {
        kind: "capability",
        entries: [
          {
            alias: "bad",
            canonical: "NOT_A_CAPABILITY" as (typeof ADS_CANONICAL_CAPABILITY_IDS)[number],
          },
        ],
      },
      isCanonicalCapabilityId
    );
    expect(mappingResult.valid).toBe(false);
  });

  it("validateTaxonomy passes for the built-in registry (fail closed elsewhere)", () => {
    expect(validateCanonicalTaxonomy()).toEqual({ valid: true });
    expect(validateTaxonomyMappings()).toEqual({ valid: true });
    expect(validateTaxonomy()).toEqual({ valid: true });
  });

  it("does not mutate caller-supplied mapping validation input", () => {
    const entries = [
      { alias: "WATCH_FEED", canonical: "WATCH_FEED" as const },
      { alias: "dup", canonical: "WATCH_FEED" as const },
      { alias: "dup", canonical: "DISCOVER_FEED" as const },
    ];
    const snapshot = structuredClone(entries);
    const result = validateTaxonomyMappingTable(
      { kind: "placement", entries },
      isCanonicalPlacementId
    );
    expect(result.valid).toBe(false);
    expect(entries).toEqual(snapshot);
  });

  it("has no runtime product, delivery, or network dependencies", () => {
    for (const source of [TAXONOMY_SOURCE, MAPPER_SOURCE]) {
      expect(source).not.toMatch(/from ["']@\//);
      expect(source).not.toMatch(/from ["']\.\.\/\.\.\//);
      expect(source).not.toMatch(
        /from ["'][^"']*(watch|discover|live|store|messenger|games|learning|search|notifications)/i
      );
      expect(source).not.toMatch(/\bfetch\b|\baxios\b|createClient|supabase/i);
      expect(source).not.toMatch(/ADS_DELIVERY_ENABLED/);
      expect(source).not.toMatch(/Math\.random|Date\.now|performance\.now/);
    }
    expect(TAXONOMY_SOURCE).not.toMatch(/placementRegistry|placementCompatibility/);
    expect(MAPPER_SOURCE).not.toMatch(/placementRegistry|placementCompatibility/);
    expect(MAPPER_SOURCE).toMatch(/from ["']\.\/taxonomy["']/);
  });
});
