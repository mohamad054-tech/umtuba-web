import type { ContractValidationResult } from "./creativeContracts";
import {
  ADS_CANONICAL_CAPABILITY_IDS,
  ADS_CANONICAL_CREATIVE_TYPES,
  ADS_CANONICAL_EVENT_TYPES,
  ADS_CANONICAL_PLACEMENT_IDS,
  isCanonicalCapabilityId,
  isCanonicalCreativeType,
  isCanonicalEventType,
  isCanonicalPlacementId,
  validateCanonicalTaxonomy,
  type AdsCanonicalCapabilityId,
  type AdsCanonicalCreativeType,
  type AdsCanonicalEventType,
  type AdsCanonicalPlacementId,
  type AdsTaxonomyKind,
} from "./taxonomy";

/**
 * Ads Taxonomy Mapper V1 — deterministic legacy → canonical identifier maps.
 *
 * Pure mapping helpers only. Never delivers, ranks, auctions, paces, bills,
 * ingests events, or imports product modules.
 */

export type AdsTaxonomyMappingEntry<TCanonical extends string> = Readonly<{
  alias: string;
  canonical: TCanonical;
}>;

export type AdsTaxonomyMappingTable<TCanonical extends string> = Readonly<{
  kind: AdsTaxonomyKind;
  entries: readonly AdsTaxonomyMappingEntry<TCanonical>[];
}>;

/**
 * Built-in placement aliases.
 * Includes Layer 0 snake_case ids, design-doc ids, and identity mappings.
 */
const PLACEMENT_MAPPING_ENTRIES: readonly AdsTaxonomyMappingEntry<AdsCanonicalPlacementId>[] =
  Object.freeze([
    // Identity
    { alias: "WATCH_FEED", canonical: "WATCH_FEED" },
    { alias: "DISCOVER_FEED", canonical: "DISCOVER_FEED" },
    { alias: "WORLD_FEED", canonical: "WORLD_FEED" },
    { alias: "WORLD_PLACE", canonical: "WORLD_PLACE" },
    { alias: "WORLD_NEARBY", canonical: "WORLD_NEARBY" },
    { alias: "LIVE_FEED", canonical: "LIVE_FEED" },
    { alias: "LIVE_ROOM", canonical: "LIVE_ROOM" },
    { alias: "STORE_HOME", canonical: "STORE_HOME" },
    { alias: "STORE_PRODUCT", canonical: "STORE_PRODUCT" },
    { alias: "SEARCH", canonical: "SEARCH" },
    { alias: "LEARNING", canonical: "LEARNING" },
    { alias: "GAMES", canonical: "GAMES" },

    // Layer 0 / foundation snake_case
    { alias: "watch_feed", canonical: "WATCH_FEED" },
    { alias: "discover_feed", canonical: "DISCOVER_FEED" },
    { alias: "stories", canonical: "DISCOVER_FEED" },
    { alias: "live_lobby", canonical: "LIVE_FEED" },
    { alias: "search_results", canonical: "SEARCH" },
    { alias: "store_catalog", canonical: "STORE_HOME" },
    { alias: "profile_feed", canonical: "DISCOVER_FEED" },

    // Platform design-doc / snake_case of registry ids
    { alias: "world_feed", canonical: "WORLD_FEED" },
    { alias: "world_place", canonical: "WORLD_PLACE" },
    { alias: "world_nearby", canonical: "WORLD_NEARBY" },
    { alias: "world_city", canonical: "WORLD_PLACE" },
    { alias: "live_feed", canonical: "LIVE_FEED" },
    { alias: "live_room", canonical: "LIVE_ROOM" },
    { alias: "live_in_stream", canonical: "LIVE_ROOM" },
    { alias: "store_home", canonical: "STORE_HOME" },
    { alias: "store_product", canonical: "STORE_PRODUCT" },
    { alias: "search", canonical: "SEARCH" },
    { alias: "learning", canonical: "LEARNING" },
    { alias: "learning_promo", canonical: "LEARNING" },
    { alias: "games", canonical: "GAMES" },
    { alias: "games_promo", canonical: "GAMES" },
  ]);

/**
 * Built-in creative-type aliases.
 * Layer 0 + platform lowercase + identity.
 */
const CREATIVE_MAPPING_ENTRIES: readonly AdsTaxonomyMappingEntry<AdsCanonicalCreativeType>[] =
  Object.freeze([
    // Identity
    { alias: "VIDEO", canonical: "VIDEO" },
    { alias: "IMAGE", canonical: "IMAGE" },
    { alias: "CAROUSEL", canonical: "CAROUSEL" },
    { alias: "TEXT", canonical: "TEXT" },
    { alias: "LIVE_PROMOTION", canonical: "LIVE_PROMOTION" },
    { alias: "STORE_PROMOTION", canonical: "STORE_PROMOTION" },
    { alias: "LEARNING_PROMOTION", canonical: "LEARNING_PROMOTION" },
    { alias: "GAME_PROMOTION", canonical: "GAME_PROMOTION" },
    { alias: "BRAND", canonical: "BRAND" },

    // Platform / Layer 0 lowercase
    { alias: "video", canonical: "VIDEO" },
    { alias: "image", canonical: "IMAGE" },
    { alias: "carousel", canonical: "CAROUSEL" },
    { alias: "text", canonical: "TEXT" },
    { alias: "live_promotion", canonical: "LIVE_PROMOTION" },
    { alias: "store_promotion", canonical: "STORE_PROMOTION" },
    { alias: "learning_promotion", canonical: "LEARNING_PROMOTION" },
    { alias: "game_promotion", canonical: "GAME_PROMOTION" },
    { alias: "brand", canonical: "BRAND" },

    // Layer 0 creative types without direct platform peers
    { alias: "story", canonical: "IMAGE" },
    { alias: "native", canonical: "BRAND" },
  ]);

/**
 * Built-in event-type aliases.
 */
const EVENT_MAPPING_ENTRIES: readonly AdsTaxonomyMappingEntry<AdsCanonicalEventType>[] =
  Object.freeze([
    // Identity
    { alias: "ELIGIBLE", canonical: "ELIGIBLE" },
    { alias: "IMPRESSION", canonical: "IMPRESSION" },
    { alias: "QUALIFIED_VIEW", canonical: "QUALIFIED_VIEW" },
    { alias: "CLICK", canonical: "CLICK" },
    { alias: "DISMISS", canonical: "DISMISS" },
    { alias: "SAVE", canonical: "SAVE" },
    { alias: "FOLLOW", canonical: "FOLLOW" },
    { alias: "CONVERSION", canonical: "CONVERSION" },
    { alias: "INSTALL", canonical: "INSTALL" },
    { alias: "PURCHASE", canonical: "PURCHASE" },

    // Measurement / report-contract lowercase
    { alias: "eligible", canonical: "ELIGIBLE" },
    { alias: "impression", canonical: "IMPRESSION" },
    { alias: "qualified_view", canonical: "QUALIFIED_VIEW" },
    { alias: "click", canonical: "CLICK" },
    { alias: "dismiss", canonical: "DISMISS" },
    { alias: "save", canonical: "SAVE" },
    { alias: "follow", canonical: "FOLLOW" },
    { alias: "conversion", canonical: "CONVERSION" },
    { alias: "install", canonical: "INSTALL" },
    { alias: "purchase", canonical: "PURCHASE" },
  ]);

/**
 * Built-in capability aliases.
 * Placement-registry snake_case + compatibility camelCase + identity.
 */
const CAPABILITY_MAPPING_ENTRIES: readonly AdsTaxonomyMappingEntry<AdsCanonicalCapabilityId>[] =
  Object.freeze([
    // Identity
    { alias: "FEED", canonical: "FEED" },
    { alias: "DETAIL", canonical: "DETAIL" },
    { alias: "NEARBY_CONTEXT", canonical: "NEARBY_CONTEXT" },
    { alias: "LIVE_CONTEXT", canonical: "LIVE_CONTEXT" },
    { alias: "COMMERCE_CONTEXT", canonical: "COMMERCE_CONTEXT" },
    { alias: "SEARCH_CONTEXT", canonical: "SEARCH_CONTEXT" },
    { alias: "LEARNING_CONTEXT", canonical: "LEARNING_CONTEXT" },
    { alias: "GAME_CONTEXT", canonical: "GAME_CONTEXT" },
    { alias: "AUTOPLAY", canonical: "AUTOPLAY" },
    { alias: "FULL_BLEED", canonical: "FULL_BLEED" },
    { alias: "SUPPORTS_VIDEO", canonical: "SUPPORTS_VIDEO" },
    { alias: "SUPPORTS_IMAGE", canonical: "SUPPORTS_IMAGE" },
    { alias: "SUPPORTS_CAROUSEL", canonical: "SUPPORTS_CAROUSEL" },
    { alias: "SUPPORTS_INTERACTIVE", canonical: "SUPPORTS_INTERACTIVE" },
    { alias: "SUPPORTS_STORE_PROMOTION", canonical: "SUPPORTS_STORE_PROMOTION" },
    {
      alias: "SUPPORTS_LEARNING_PROMOTION",
      canonical: "SUPPORTS_LEARNING_PROMOTION",
    },
    {
      alias: "SUPPORTS_SPONSORED_CONTENT",
      canonical: "SUPPORTS_SPONSORED_CONTENT",
    },
    { alias: "SUPPORTS_VERTICAL", canonical: "SUPPORTS_VERTICAL" },
    { alias: "SUPPORTS_HORIZONTAL", canonical: "SUPPORTS_HORIZONTAL" },
    { alias: "SUPPORTS_FULL_SCREEN", canonical: "SUPPORTS_FULL_SCREEN" },
    { alias: "SUPPORTS_FEED", canonical: "SUPPORTS_FEED" },
    { alias: "SUPPORTS_OVERLAY", canonical: "SUPPORTS_OVERLAY" },

    // Placement-registry capabilities
    { alias: "feed", canonical: "FEED" },
    { alias: "detail", canonical: "DETAIL" },
    { alias: "nearby_context", canonical: "NEARBY_CONTEXT" },
    { alias: "live_context", canonical: "LIVE_CONTEXT" },
    { alias: "commerce_context", canonical: "COMMERCE_CONTEXT" },
    { alias: "search_context", canonical: "SEARCH_CONTEXT" },
    { alias: "learning_context", canonical: "LEARNING_CONTEXT" },
    { alias: "game_context", canonical: "GAME_CONTEXT" },
    { alias: "autoplay", canonical: "AUTOPLAY" },
    { alias: "full_bleed", canonical: "FULL_BLEED" },

    // Placement-compatibility capability keys
    { alias: "supportsVideo", canonical: "SUPPORTS_VIDEO" },
    { alias: "supportsImage", canonical: "SUPPORTS_IMAGE" },
    { alias: "supportsCarousel", canonical: "SUPPORTS_CAROUSEL" },
    { alias: "supportsInteractive", canonical: "SUPPORTS_INTERACTIVE" },
    { alias: "supportsStorePromotion", canonical: "SUPPORTS_STORE_PROMOTION" },
    {
      alias: "supportsLearningPromotion",
      canonical: "SUPPORTS_LEARNING_PROMOTION",
    },
    { alias: "supportsSponsoredContent", canonical: "SUPPORTS_SPONSORED_CONTENT" },
    { alias: "supportsVertical", canonical: "SUPPORTS_VERTICAL" },
    { alias: "supportsHorizontal", canonical: "SUPPORTS_HORIZONTAL" },
    { alias: "supportsFullScreen", canonical: "SUPPORTS_FULL_SCREEN" },
    { alias: "supportsFeed", canonical: "SUPPORTS_FEED" },
    { alias: "supportsOverlay", canonical: "SUPPORTS_OVERLAY" },
  ]);

function buildAliasMap<TCanonical extends string>(
  entries: readonly AdsTaxonomyMappingEntry<TCanonical>[]
): Readonly<Record<string, TCanonical>> {
  const map: Record<string, TCanonical> = {};
  for (const entry of entries) {
    map[entry.alias] = entry.canonical;
  }
  return Object.freeze(map);
}

const PLACEMENT_ALIAS_MAP = buildAliasMap(PLACEMENT_MAPPING_ENTRIES);
const CREATIVE_ALIAS_MAP = buildAliasMap(CREATIVE_MAPPING_ENTRIES);
const EVENT_ALIAS_MAP = buildAliasMap(EVENT_MAPPING_ENTRIES);
const CAPABILITY_ALIAS_MAP = buildAliasMap(CAPABILITY_MAPPING_ENTRIES);

/** Frozen placement alias → canonical map (includes identity). */
export const ADS_PLACEMENT_TAXONOMY_MAP = PLACEMENT_ALIAS_MAP;

/** Frozen creative-type alias → canonical map (includes identity). */
export const ADS_CREATIVE_TYPE_TAXONOMY_MAP = CREATIVE_ALIAS_MAP;

/** Frozen event-type alias → canonical map (includes identity). */
export const ADS_EVENT_TYPE_TAXONOMY_MAP = EVENT_ALIAS_MAP;

/** Frozen capability alias → canonical map (includes identity). */
export const ADS_CAPABILITY_TAXONOMY_MAP = CAPABILITY_ALIAS_MAP;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function unknownIdError(kind: AdsTaxonomyKind, value: string): Error {
  return new Error(`Unknown ${kind} taxonomy id: ${value}`);
}

/**
 * Resolve a placement identifier to its canonical form.
 * Accepts legacy aliases and canonical ids. Fail closed on unknown input.
 */
export function getCanonicalPlacement(
  value: string
): AdsCanonicalPlacementId {
  if (!isNonEmptyString(value)) {
    throw unknownIdError("placement", String(value));
  }
  const canonical = PLACEMENT_ALIAS_MAP[value];
  if (!canonical || !isCanonicalPlacementId(canonical)) {
    throw unknownIdError("placement", value);
  }
  return canonical;
}

/**
 * Resolve a creative-type identifier to its canonical form.
 * Fail closed on unknown input.
 */
export function getCanonicalCreativeType(
  value: string
): AdsCanonicalCreativeType {
  if (!isNonEmptyString(value)) {
    throw unknownIdError("creative_type", String(value));
  }
  const canonical = CREATIVE_ALIAS_MAP[value];
  if (!canonical || !isCanonicalCreativeType(canonical)) {
    throw unknownIdError("creative_type", value);
  }
  return canonical;
}

/**
 * Resolve a capability identifier to its canonical form.
 * Fail closed on unknown input.
 */
export function getCanonicalCapability(
  value: string
): AdsCanonicalCapabilityId {
  if (!isNonEmptyString(value)) {
    throw unknownIdError("capability", String(value));
  }
  const canonical = CAPABILITY_ALIAS_MAP[value];
  if (!canonical || !isCanonicalCapabilityId(canonical)) {
    throw unknownIdError("capability", value);
  }
  return canonical;
}

/**
 * Resolve an event-type identifier to its canonical form.
 * Fail closed on unknown input.
 */
export function getCanonicalEventType(value: string): AdsCanonicalEventType {
  if (!isNonEmptyString(value)) {
    throw unknownIdError("event_type", String(value));
  }
  const canonical = EVENT_ALIAS_MAP[value];
  if (!canonical || !isCanonicalEventType(canonical)) {
    throw unknownIdError("event_type", value);
  }
  return canonical;
}

function legacyAliasesFromEntries<TCanonical extends string>(
  entries: readonly AdsTaxonomyMappingEntry<TCanonical>[],
  canonicalId?: TCanonical
): readonly string[] {
  const aliases: string[] = [];
  for (const entry of entries) {
    if (entry.alias === entry.canonical) {
      continue;
    }
    if (canonicalId !== undefined && entry.canonical !== canonicalId) {
      continue;
    }
    aliases.push(entry.alias);
  }
  return Object.freeze(aliases);
}

export type ListLegacyAliasesOptions = Readonly<{
  kind?: AdsTaxonomyKind;
  canonicalId?: string;
}>;

/**
 * List non-identity legacy aliases.
 * Optionally filter by taxonomy kind and/or target canonical id.
 */
export function listLegacyAliases(
  options: ListLegacyAliasesOptions = {}
): readonly string[] {
  const { kind, canonicalId } = options;

  const collect = <TCanonical extends string>(
    entries: readonly AdsTaxonomyMappingEntry<TCanonical>[],
    isCanonical: (value: string) => value is TCanonical
  ): readonly string[] => {
    if (canonicalId !== undefined && !isCanonical(canonicalId)) {
      return Object.freeze([]);
    }
    return legacyAliasesFromEntries(
      entries,
      canonicalId as TCanonical | undefined
    );
  };

  if (kind === "placement") {
    return collect(PLACEMENT_MAPPING_ENTRIES, isCanonicalPlacementId);
  }
  if (kind === "creative_type") {
    return collect(CREATIVE_MAPPING_ENTRIES, isCanonicalCreativeType);
  }
  if (kind === "event_type") {
    return collect(EVENT_MAPPING_ENTRIES, isCanonicalEventType);
  }
  if (kind === "capability") {
    return collect(CAPABILITY_MAPPING_ENTRIES, isCanonicalCapabilityId);
  }

  if (kind !== undefined) {
    return Object.freeze([]);
  }

  // All kinds. If canonicalId is set, only return aliases targeting that id
  // across kinds (fail closed when id is not canonical in any kind).
  if (canonicalId !== undefined) {
    const matched: string[] = [];
    if (isCanonicalPlacementId(canonicalId)) {
      matched.push(
        ...legacyAliasesFromEntries(PLACEMENT_MAPPING_ENTRIES, canonicalId)
      );
    }
    if (isCanonicalCreativeType(canonicalId)) {
      matched.push(
        ...legacyAliasesFromEntries(CREATIVE_MAPPING_ENTRIES, canonicalId)
      );
    }
    if (isCanonicalEventType(canonicalId)) {
      matched.push(
        ...legacyAliasesFromEntries(EVENT_MAPPING_ENTRIES, canonicalId)
      );
    }
    if (isCanonicalCapabilityId(canonicalId)) {
      matched.push(
        ...legacyAliasesFromEntries(CAPABILITY_MAPPING_ENTRIES, canonicalId)
      );
    }
    return Object.freeze(matched);
  }

  return Object.freeze([
    ...legacyAliasesFromEntries(PLACEMENT_MAPPING_ENTRIES),
    ...legacyAliasesFromEntries(CREATIVE_MAPPING_ENTRIES),
    ...legacyAliasesFromEntries(EVENT_MAPPING_ENTRIES),
    ...legacyAliasesFromEntries(CAPABILITY_MAPPING_ENTRIES),
  ]);
}

/**
 * Validate a mapping table for duplicates, conflicts, unknown canonicals,
 * remapped canonicals, and circular alias chains. Fail closed.
 */
export function validateTaxonomyMappingTable<TCanonical extends string>(
  table: AdsTaxonomyMappingTable<TCanonical>,
  isCanonical: (value: string) => value is TCanonical
): ContractValidationResult {
  const issues: string[] = [];

  if (
    table.kind !== "placement" &&
    table.kind !== "creative_type" &&
    table.kind !== "event_type" &&
    table.kind !== "capability" &&
    table.kind !== "platform"
  ) {
    issues.push(`Unknown taxonomy kind: ${String(table.kind)}`);
  }

  if (!Array.isArray(table.entries)) {
    return {
      valid: false,
      issues: Object.freeze(["Mapping table entries must be an array."]),
    };
  }

  const aliasToCanonical = new Map<string, string>();
  const seenAliases = new Set<string>();

  for (const entry of table.entries) {
    if (
      entry === null ||
      typeof entry !== "object" ||
      Array.isArray(entry)
    ) {
      issues.push("Mapping entry must be an object.");
      continue;
    }

    if (!isNonEmptyString(entry.alias)) {
      issues.push("Mapping alias must be a non-empty string.");
      continue;
    }
    if (!isNonEmptyString(entry.canonical)) {
      issues.push(
        `Mapping alias "${entry.alias}" has an invalid canonical target.`
      );
      continue;
    }

    if (seenAliases.has(entry.alias)) {
      issues.push(`Duplicate alias: ${entry.alias}`);
    }
    seenAliases.add(entry.alias);

    if (!isCanonical(entry.canonical)) {
      issues.push(
        `Unknown canonical reference for alias "${entry.alias}": ${entry.canonical}`
      );
      continue;
    }

    const prior = aliasToCanonical.get(entry.alias);
    if (prior !== undefined && prior !== entry.canonical) {
      issues.push(
        `Conflicting mapping for alias "${entry.alias}": ${prior} vs ${entry.canonical}`
      );
    }
    aliasToCanonical.set(entry.alias, entry.canonical);

    // Canonical ids may only identity-map to themselves.
    if (isCanonical(entry.alias) && entry.alias !== entry.canonical) {
      issues.push(
        `Conflicting remapping of canonical id "${entry.alias}" → "${entry.canonical}".`
      );
    }
  }

  // Circular / multi-hop detection: follow alias chains to a terminal.
  for (const startAlias of aliasToCanonical.keys()) {
    const visiting = new Set<string>();
    let current = startAlias;
    let hops = 0;
    const maxHops = aliasToCanonical.size + 1;

    while (hops <= maxHops) {
      if (visiting.has(current)) {
        issues.push(
          `Circular mapping detected involving alias "${startAlias}".`
        );
        break;
      }
      visiting.add(current);

      const next = aliasToCanonical.get(current);
      if (next === undefined) {
        if (!isCanonical(current)) {
          issues.push(
            `Mapping for alias "${startAlias}" does not resolve to a canonical id.`
          );
        }
        break;
      }

      // Identity terminal.
      if (next === current) {
        break;
      }

      // Canonical terminal that is not remapped further.
      if (isCanonical(next) && !aliasToCanonical.has(next)) {
        break;
      }

      current = next;
      hops += 1;
    }
  }

  // Capability-specific: every canonical capability must be valid.
  if (table.kind === "capability") {
    for (const entry of table.entries) {
      if (
        isNonEmptyString(entry?.canonical) &&
        !isCanonicalCapabilityId(entry.canonical)
      ) {
        const message = `Invalid capability id: ${entry.canonical}`;
        if (!issues.includes(message)) {
          issues.push(message);
        }
      }
    }
  }

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

/**
 * Validate all built-in mapping tables plus coverage of every canonical id.
 * Fail closed.
 */
export function validateTaxonomyMappings(): ContractValidationResult {
  const issues: string[] = [];

  const checks: readonly {
    table: AdsTaxonomyMappingTable<string>;
    isCanonical: (value: string) => boolean;
    canonicalIds: readonly string[];
    label: string;
  }[] = [
    {
      table: { kind: "placement", entries: PLACEMENT_MAPPING_ENTRIES },
      isCanonical: isCanonicalPlacementId,
      canonicalIds: ADS_CANONICAL_PLACEMENT_IDS,
      label: "placement",
    },
    {
      table: { kind: "creative_type", entries: CREATIVE_MAPPING_ENTRIES },
      isCanonical: isCanonicalCreativeType,
      canonicalIds: ADS_CANONICAL_CREATIVE_TYPES,
      label: "creative_type",
    },
    {
      table: { kind: "event_type", entries: EVENT_MAPPING_ENTRIES },
      isCanonical: isCanonicalEventType,
      canonicalIds: ADS_CANONICAL_EVENT_TYPES,
      label: "event_type",
    },
    {
      table: { kind: "capability", entries: CAPABILITY_MAPPING_ENTRIES },
      isCanonical: isCanonicalCapabilityId,
      canonicalIds: ADS_CANONICAL_CAPABILITY_IDS,
      label: "capability",
    },
  ];

  for (const check of checks) {
    const result = validateTaxonomyMappingTable(
      check.table,
      check.isCanonical as (value: string) => value is string
    );
    if (!result.valid) {
      for (const issue of result.issues) {
        issues.push(`${check.label}: ${issue}`);
      }
    }

    for (const canonicalId of check.canonicalIds) {
      const identity = check.table.entries.find(
        (entry) => entry.alias === canonicalId
      );
      if (!identity) {
        issues.push(
          `${check.label}: missing identity mapping for canonical id "${canonicalId}".`
        );
      } else if (identity.canonical !== canonicalId) {
        issues.push(
          `${check.label}: identity mapping for "${canonicalId}" must target itself.`
        );
      }
    }
  }

  // Global alias uniqueness across kinds (fail closed against ambiguous aliases).
  const globalAliases = new Map<string, AdsTaxonomyKind>();
  const allTables: readonly {
    kind: AdsTaxonomyKind;
    entries: readonly AdsTaxonomyMappingEntry<string>[];
  }[] = [
    { kind: "placement", entries: PLACEMENT_MAPPING_ENTRIES },
    { kind: "creative_type", entries: CREATIVE_MAPPING_ENTRIES },
    { kind: "event_type", entries: EVENT_MAPPING_ENTRIES },
    { kind: "capability", entries: CAPABILITY_MAPPING_ENTRIES },
  ];

  for (const table of allTables) {
    for (const entry of table.entries) {
      const prior = globalAliases.get(entry.alias);
      if (prior && prior !== table.kind) {
        issues.push(
          `Duplicate alias across kinds: "${entry.alias}" (${prior} and ${table.kind}).`
        );
      }
      globalAliases.set(entry.alias, table.kind);
    }
  }

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

/**
 * Full taxonomy fail-closed validation: canonical ids + mapping tables.
 */
export function validateTaxonomy(): ContractValidationResult {
  const issues: string[] = [];

  const canonicalResult = validateCanonicalTaxonomy();
  if (!canonicalResult.valid) {
    issues.push(...canonicalResult.issues);
  }

  const mappingResult = validateTaxonomyMappings();
  if (!mappingResult.valid) {
    issues.push(...mappingResult.issues);
  }

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}
