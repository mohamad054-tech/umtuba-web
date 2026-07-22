import type { ContractValidationResult } from "./creativeContracts";

/**
 * Ads Taxonomy Unification Foundation V1 — canonical identifiers only.
 *
 * Authoritative source for placement IDs, creative types, event types, and
 * capability IDs. Eliminates drift between Layer 0, platform contracts,
 * placement registry, compatibility, and event/creative contracts.
 *
 * Contracts / constants / validation only. Never delivers, ranks, auctions,
 * paces, bills, ingests events, or imports product modules.
 */

export const ADS_TAXONOMY_CONTRACT_VERSION = 1 as const;

export const ADS_TAXONOMY_KINDS = [
  "placement",
  "creative_type",
  "event_type",
  "capability",
] as const;

export type AdsTaxonomyKind = (typeof ADS_TAXONOMY_KINDS)[number];

/**
 * Canonical placement IDs. Align with Ads Platform Placement Registry V1.
 * SCREAMING_SNAKE is the stable wire form for unified taxonomy.
 */
export const ADS_CANONICAL_PLACEMENT_IDS = [
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

export type AdsCanonicalPlacementId =
  (typeof ADS_CANONICAL_PLACEMENT_IDS)[number];

/**
 * Canonical creative types. SCREAMING_SNAKE unifies Layer 0 + platform
 * lowercase creative identifiers.
 */
export const ADS_CANONICAL_CREATIVE_TYPES = [
  "VIDEO",
  "IMAGE",
  "CAROUSEL",
  "TEXT",
  "LIVE_PROMOTION",
  "STORE_PROMOTION",
  "LEARNING_PROMOTION",
  "GAME_PROMOTION",
  "BRAND",
] as const;

export type AdsCanonicalCreativeType =
  (typeof ADS_CANONICAL_CREATIVE_TYPES)[number];

/**
 * Canonical event types. Includes measurement catalog + report-contract types.
 */
export const ADS_CANONICAL_EVENT_TYPES = [
  "ELIGIBLE",
  "IMPRESSION",
  "QUALIFIED_VIEW",
  "CLICK",
  "DISMISS",
  "SAVE",
  "FOLLOW",
  "CONVERSION",
  "INSTALL",
  "PURCHASE",
] as const;

export type AdsCanonicalEventType =
  (typeof ADS_CANONICAL_EVENT_TYPES)[number];

/**
 * Canonical capability IDs.
 * Covers placement-registry capabilities and placement-compatibility keys.
 */
export const ADS_CANONICAL_CAPABILITY_IDS = [
  "FEED",
  "DETAIL",
  "NEARBY_CONTEXT",
  "LIVE_CONTEXT",
  "COMMERCE_CONTEXT",
  "SEARCH_CONTEXT",
  "LEARNING_CONTEXT",
  "GAME_CONTEXT",
  "AUTOPLAY",
  "FULL_BLEED",
  "SUPPORTS_VIDEO",
  "SUPPORTS_IMAGE",
  "SUPPORTS_CAROUSEL",
  "SUPPORTS_INTERACTIVE",
  "SUPPORTS_STORE_PROMOTION",
  "SUPPORTS_LEARNING_PROMOTION",
  "SUPPORTS_SPONSORED_CONTENT",
  "SUPPORTS_VERTICAL",
  "SUPPORTS_HORIZONTAL",
  "SUPPORTS_FULL_SCREEN",
  "SUPPORTS_FEED",
  "SUPPORTS_OVERLAY",
] as const;

export type AdsCanonicalCapabilityId =
  (typeof ADS_CANONICAL_CAPABILITY_IDS)[number];

export type AdsCanonicalTaxonomyId =
  | AdsCanonicalPlacementId
  | AdsCanonicalCreativeType
  | AdsCanonicalEventType
  | AdsCanonicalCapabilityId;

function freezeIdList<T extends string>(
  ids: readonly T[]
): readonly T[] {
  return Object.freeze([...ids]);
}

/** Frozen canonical placement id list. */
export const ADS_TAXONOMY_PLACEMENT_IDS = freezeIdList(
  ADS_CANONICAL_PLACEMENT_IDS
);

/** Frozen canonical creative type list. */
export const ADS_TAXONOMY_CREATIVE_TYPES = freezeIdList(
  ADS_CANONICAL_CREATIVE_TYPES
);

/** Frozen canonical event type list. */
export const ADS_TAXONOMY_EVENT_TYPES = freezeIdList(ADS_CANONICAL_EVENT_TYPES);

/** Frozen canonical capability id list. */
export const ADS_TAXONOMY_CAPABILITY_IDS = freezeIdList(
  ADS_CANONICAL_CAPABILITY_IDS
);

const PLACEMENT_SET = new Set<string>(ADS_CANONICAL_PLACEMENT_IDS);
const CREATIVE_SET = new Set<string>(ADS_CANONICAL_CREATIVE_TYPES);
const EVENT_SET = new Set<string>(ADS_CANONICAL_EVENT_TYPES);
const CAPABILITY_SET = new Set<string>(ADS_CANONICAL_CAPABILITY_IDS);

export function isCanonicalPlacementId(
  value: string
): value is AdsCanonicalPlacementId {
  return PLACEMENT_SET.has(value);
}

export function isCanonicalCreativeType(
  value: string
): value is AdsCanonicalCreativeType {
  return CREATIVE_SET.has(value);
}

export function isCanonicalEventType(
  value: string
): value is AdsCanonicalEventType {
  return EVENT_SET.has(value);
}

export function isCanonicalCapabilityId(
  value: string
): value is AdsCanonicalCapabilityId {
  return CAPABILITY_SET.has(value);
}

export function listCanonicalPlacementIds(): readonly AdsCanonicalPlacementId[] {
  return ADS_TAXONOMY_PLACEMENT_IDS;
}

export function listCanonicalCreativeTypes(): readonly AdsCanonicalCreativeType[] {
  return ADS_TAXONOMY_CREATIVE_TYPES;
}

export function listCanonicalEventTypes(): readonly AdsCanonicalEventType[] {
  return ADS_TAXONOMY_EVENT_TYPES;
}

export function listCanonicalCapabilityIds(): readonly AdsCanonicalCapabilityId[] {
  return ADS_TAXONOMY_CAPABILITY_IDS;
}

function collectDuplicateIssues(
  ids: readonly string[],
  label: string,
  issues: string[]
): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      issues.push(`Duplicate canonical ${label} id: ${id}`);
    }
    seen.add(id);
  }
}

/**
 * Cross-kind collision check: the same string must not be a canonical id in
 * more than one taxonomy kind (fail closed against ambiguous identifiers).
 */
function collectCrossKindCollisionIssues(issues: string[]): void {
  const owners = new Map<string, AdsTaxonomyKind>();

  const register = (id: string, kind: AdsTaxonomyKind): void => {
    const existing = owners.get(id);
    if (existing && existing !== kind) {
      issues.push(
        `Canonical id "${id}" collides across kinds (${existing} and ${kind}).`
      );
      return;
    }
    owners.set(id, kind);
  };

  for (const id of ADS_CANONICAL_PLACEMENT_IDS) {
    register(id, "placement");
  }
  for (const id of ADS_CANONICAL_CREATIVE_TYPES) {
    register(id, "creative_type");
  }
  for (const id of ADS_CANONICAL_EVENT_TYPES) {
    register(id, "event_type");
  }
  for (const id of ADS_CANONICAL_CAPABILITY_IDS) {
    register(id, "capability");
  }
}

/**
 * Validate the built-in canonical taxonomy ids. Fail closed on duplicates or
 * cross-kind collisions. Does not mutate registry state.
 *
 * Prefer `validateTaxonomy()` from `taxonomyMapper.ts` for the full
 * canonical + mapping fail-closed check.
 */
export function validateCanonicalTaxonomy(): ContractValidationResult {
  const issues: string[] = [];

  collectDuplicateIssues(
    ADS_CANONICAL_PLACEMENT_IDS,
    "placement",
    issues
  );
  collectDuplicateIssues(
    ADS_CANONICAL_CREATIVE_TYPES,
    "creative_type",
    issues
  );
  collectDuplicateIssues(ADS_CANONICAL_EVENT_TYPES, "event_type", issues);
  collectDuplicateIssues(
    ADS_CANONICAL_CAPABILITY_IDS,
    "capability",
    issues
  );
  collectCrossKindCollisionIssues(issues);

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

/**
 * Validate an arbitrary list of purported capability IDs against the canonical
 * capability set. Fail closed on any unknown id.
 */
export function validateCanonicalCapabilityIds(
  values: readonly string[]
): ContractValidationResult {
  const issues: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    if (typeof value !== "string" || value.length === 0) {
      issues.push("Capability id must be a non-empty string.");
      continue;
    }
    if (!isCanonicalCapabilityId(value)) {
      issues.push(`Unknown canonical capability id: ${value}`);
    }
    if (seen.has(value)) {
      issues.push(`Duplicate canonical capability id: ${value}`);
    }
    seen.add(value);
  }

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}
