import type { ContractValidationResult } from "./creativeContracts";
import {
  ADS_PLATFORM_PLACEMENT_IDS,
  isAdsPlacementId,
  type AdsPlatformPlacementId,
} from "./placementRegistry";

/**
 * Ads Placement Compatibility Foundation V1 — metadata contracts only.
 *
 * Declares which creative capabilities each placement supports. Immutable,
 * deterministic, fail-closed. Never delivers, ranks, scores, auctions, paces,
 * bills, ingests events, or imports product modules.
 */

export const ADS_PLACEMENT_COMPATIBILITY_CONTRACT_VERSION = 1 as const;

/**
 * Canonical capability keys every placement profile must declare.
 * Order is stable for deterministic listing and validation.
 */
export const ADS_PLACEMENT_COMPATIBILITY_CAPABILITY_KEYS = [
  "supportsVideo",
  "supportsImage",
  "supportsCarousel",
  "supportsInteractive",
  "supportsStorePromotion",
  "supportsLearningPromotion",
  "supportsSponsoredContent",
  "supportsVertical",
  "supportsHorizontal",
  "supportsFullScreen",
  "supportsFeed",
  "supportsOverlay",
] as const;

export type AdsPlacementCompatibilityCapabilityKey =
  (typeof ADS_PLACEMENT_COMPATIBILITY_CAPABILITY_KEYS)[number];

/** Boolean capability bag required on every placement compatibility profile. */
export type AdsPlacementCompatibilityCapabilities = Readonly<{
  supportsVideo: boolean;
  supportsImage: boolean;
  supportsCarousel: boolean;
  supportsInteractive: boolean;
  supportsStorePromotion: boolean;
  supportsLearningPromotion: boolean;
  supportsSponsoredContent: boolean;
  supportsVertical: boolean;
  supportsHorizontal: boolean;
  supportsFullScreen: boolean;
  supportsFeed: boolean;
  supportsOverlay: boolean;
}>;

/** Stable per-placement compatibility profile. */
export type AdsPlacementCompatibilityProfile = Readonly<{
  placementId: AdsPlatformPlacementId;
  contractVersion: typeof ADS_PLACEMENT_COMPATIBILITY_CONTRACT_VERSION;
  capabilities: AdsPlacementCompatibilityCapabilities;
}>;

export type AdsPlacementCompatibilityRegistry = Readonly<
  Record<AdsPlatformPlacementId, AdsPlacementCompatibilityProfile>
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function freezeCapabilities(
  capabilities: AdsPlacementCompatibilityCapabilities
): AdsPlacementCompatibilityCapabilities {
  return Object.freeze({ ...capabilities });
}

function freezeProfile(
  profile: AdsPlacementCompatibilityProfile
): AdsPlacementCompatibilityProfile {
  return Object.freeze({
    placementId: profile.placementId,
    contractVersion: profile.contractVersion,
    capabilities: freezeCapabilities(profile.capabilities),
  });
}

function profile(
  placementId: AdsPlatformPlacementId,
  capabilities: AdsPlacementCompatibilityCapabilities
): AdsPlacementCompatibilityProfile {
  return freezeProfile({
    placementId,
    contractVersion: ADS_PLACEMENT_COMPATIBILITY_CONTRACT_VERSION,
    capabilities,
  });
}

/**
 * Authoritative placement compatibility matrix V1.
 * Values describe creative/presentation capability only — not delivery policy.
 */
export const ADS_PLACEMENT_COMPATIBILITY: AdsPlacementCompatibilityRegistry =
  Object.freeze({
    WATCH_FEED: profile("WATCH_FEED", {
      supportsVideo: true,
      supportsImage: true,
      supportsCarousel: true,
      supportsInteractive: false,
      supportsStorePromotion: false,
      supportsLearningPromotion: false,
      supportsSponsoredContent: true,
      supportsVertical: true,
      supportsHorizontal: false,
      supportsFullScreen: true,
      supportsFeed: true,
      supportsOverlay: false,
    }),
    DISCOVER_FEED: profile("DISCOVER_FEED", {
      supportsVideo: true,
      supportsImage: true,
      supportsCarousel: true,
      supportsInteractive: false,
      supportsStorePromotion: false,
      supportsLearningPromotion: false,
      supportsSponsoredContent: true,
      supportsVertical: true,
      supportsHorizontal: true,
      supportsFullScreen: false,
      supportsFeed: true,
      supportsOverlay: false,
    }),
    WORLD_FEED: profile("WORLD_FEED", {
      supportsVideo: true,
      supportsImage: true,
      supportsCarousel: true,
      supportsInteractive: false,
      supportsStorePromotion: false,
      supportsLearningPromotion: false,
      supportsSponsoredContent: true,
      supportsVertical: true,
      supportsHorizontal: true,
      supportsFullScreen: false,
      supportsFeed: true,
      supportsOverlay: false,
    }),
    WORLD_PLACE: profile("WORLD_PLACE", {
      supportsVideo: false,
      supportsImage: true,
      supportsCarousel: true,
      supportsInteractive: false,
      supportsStorePromotion: true,
      supportsLearningPromotion: false,
      supportsSponsoredContent: true,
      supportsVertical: false,
      supportsHorizontal: true,
      supportsFullScreen: false,
      supportsFeed: false,
      supportsOverlay: false,
    }),
    WORLD_NEARBY: profile("WORLD_NEARBY", {
      supportsVideo: false,
      supportsImage: true,
      supportsCarousel: false,
      supportsInteractive: false,
      supportsStorePromotion: true,
      supportsLearningPromotion: false,
      supportsSponsoredContent: true,
      supportsVertical: false,
      supportsHorizontal: true,
      supportsFullScreen: false,
      supportsFeed: false,
      supportsOverlay: false,
    }),
    LIVE_FEED: profile("LIVE_FEED", {
      supportsVideo: true,
      supportsImage: true,
      supportsCarousel: false,
      supportsInteractive: false,
      supportsStorePromotion: false,
      supportsLearningPromotion: false,
      supportsSponsoredContent: true,
      supportsVertical: true,
      supportsHorizontal: true,
      supportsFullScreen: false,
      supportsFeed: true,
      supportsOverlay: false,
    }),
    LIVE_ROOM: profile("LIVE_ROOM", {
      supportsVideo: false,
      supportsImage: true,
      supportsCarousel: false,
      supportsInteractive: false,
      supportsStorePromotion: false,
      supportsLearningPromotion: false,
      supportsSponsoredContent: true,
      supportsVertical: false,
      supportsHorizontal: true,
      supportsFullScreen: false,
      supportsFeed: false,
      supportsOverlay: true,
    }),
    STORE_HOME: profile("STORE_HOME", {
      supportsVideo: false,
      supportsImage: true,
      supportsCarousel: true,
      supportsInteractive: false,
      supportsStorePromotion: true,
      supportsLearningPromotion: false,
      supportsSponsoredContent: true,
      supportsVertical: false,
      supportsHorizontal: true,
      supportsFullScreen: false,
      supportsFeed: true,
      supportsOverlay: false,
    }),
    STORE_PRODUCT: profile("STORE_PRODUCT", {
      supportsVideo: false,
      supportsImage: true,
      supportsCarousel: true,
      supportsInteractive: false,
      supportsStorePromotion: true,
      supportsLearningPromotion: false,
      supportsSponsoredContent: true,
      supportsVertical: false,
      supportsHorizontal: true,
      supportsFullScreen: false,
      supportsFeed: false,
      supportsOverlay: false,
    }),
    SEARCH: profile("SEARCH", {
      supportsVideo: false,
      supportsImage: true,
      supportsCarousel: false,
      supportsInteractive: false,
      supportsStorePromotion: true,
      supportsLearningPromotion: true,
      supportsSponsoredContent: true,
      supportsVertical: false,
      supportsHorizontal: true,
      supportsFullScreen: false,
      supportsFeed: false,
      supportsOverlay: false,
    }),
    LEARNING: profile("LEARNING", {
      supportsVideo: true,
      supportsImage: true,
      supportsCarousel: true,
      supportsInteractive: false,
      supportsStorePromotion: false,
      supportsLearningPromotion: true,
      supportsSponsoredContent: true,
      supportsVertical: true,
      supportsHorizontal: true,
      supportsFullScreen: false,
      supportsFeed: true,
      supportsOverlay: false,
    }),
    GAMES: profile("GAMES", {
      supportsVideo: true,
      supportsImage: true,
      supportsCarousel: true,
      supportsInteractive: false,
      supportsStorePromotion: false,
      supportsLearningPromotion: false,
      supportsSponsoredContent: true,
      supportsVertical: true,
      supportsHorizontal: true,
      supportsFullScreen: true,
      supportsFeed: true,
      supportsOverlay: false,
    }),
  }) satisfies AdsPlacementCompatibilityRegistry;

/**
 * Collect incompatible-combination issues for an already shape-validated
 * capabilities bag. Fail closed — any defined conflict is an error.
 */
export function collectIncompatibleCapabilityIssues(
  capabilities: AdsPlacementCompatibilityCapabilities,
  label = "capabilities"
): readonly string[] {
  const issues: string[] = [];

  const hasMediaFormat =
    capabilities.supportsVideo ||
    capabilities.supportsImage ||
    capabilities.supportsCarousel ||
    capabilities.supportsInteractive;

  if (!hasMediaFormat) {
    issues.push(
      `${label} must enable at least one media format (video, image, carousel, or interactive).`
    );
  }

  if (!capabilities.supportsVertical && !capabilities.supportsHorizontal) {
    issues.push(
      `${label} must enable at least one orientation (vertical or horizontal).`
    );
  }

  if (capabilities.supportsFullScreen && capabilities.supportsOverlay) {
    issues.push(
      `${label} cannot enable both supportsFullScreen and supportsOverlay.`
    );
  }

  if (capabilities.supportsCarousel && !capabilities.supportsImage) {
    issues.push(
      `${label} supportsCarousel requires supportsImage.`
    );
  }

  if (
    capabilities.supportsStorePromotion &&
    !capabilities.supportsImage &&
    !capabilities.supportsCarousel
  ) {
    issues.push(
      `${label} supportsStorePromotion requires supportsImage or supportsCarousel.`
    );
  }

  if (
    capabilities.supportsLearningPromotion &&
    !capabilities.supportsVideo &&
    !capabilities.supportsImage &&
    !capabilities.supportsCarousel &&
    !capabilities.supportsSponsoredContent
  ) {
    issues.push(
      `${label} supportsLearningPromotion requires a media format or sponsored content.`
    );
  }

  return issues;
}

function validateCapabilitiesShape(
  value: unknown,
  issues: string[],
  label = "capabilities"
): AdsPlacementCompatibilityCapabilities | null {
  if (!isRecord(value)) {
    issues.push(`${label} must be an object.`);
    return null;
  }

  const keys = Object.keys(value);
  const known = new Set<string>(ADS_PLACEMENT_COMPATIBILITY_CAPABILITY_KEYS);

  for (const key of keys) {
    if (!known.has(key)) {
      issues.push(`${label} contains unknown capability "${key}".`);
    }
  }

  for (const key of ADS_PLACEMENT_COMPATIBILITY_CAPABILITY_KEYS) {
    if (!(key in value)) {
      issues.push(`${label} is missing required capability "${key}".`);
      continue;
    }
    if (typeof value[key] !== "boolean") {
      issues.push(`${label}.${key} must be a boolean.`);
    }
  }

  if (issues.length > 0) {
    return null;
  }

  return freezeCapabilities(
    value as AdsPlacementCompatibilityCapabilities
  );
}

/**
 * Validate a single placement compatibility profile. Fail closed.
 */
export function validatePlacementCompatibilityProfile(
  value: unknown
): ContractValidationResult {
  if (!isRecord(value)) {
    return {
      valid: false,
      issues: ["Placement compatibility profile must be an object."],
    };
  }

  const issues: string[] = [];

  if (value.contractVersion !== ADS_PLACEMENT_COMPATIBILITY_CONTRACT_VERSION) {
    issues.push(
      `contractVersion must be ${ADS_PLACEMENT_COMPATIBILITY_CONTRACT_VERSION}.`
    );
  }

  if (
    typeof value.placementId !== "string" ||
    !isAdsPlacementId(value.placementId)
  ) {
    issues.push("placementId must be a known Ads platform placement id.");
  }

  const capabilities = validateCapabilitiesShape(
    value.capabilities,
    issues,
    "capabilities"
  );

  if (capabilities) {
    issues.push(...collectIncompatibleCapabilityIssues(capabilities));
  }

  // Reject unexpected top-level keys (malformed / extended profiles).
  const allowedTopLevel = new Set([
    "placementId",
    "contractVersion",
    "capabilities",
  ]);
  for (const key of Object.keys(value)) {
    if (!allowedTopLevel.has(key)) {
      issues.push(`Profile contains unknown field "${key}".`);
    }
  }

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

/**
 * Validate a compatibility registry / profile collection. Rejects duplicate
 * placement IDs, missing placements, and any malformed profile. Fail closed.
 */
export function validatePlacementCompatibilityRegistry(
  value: unknown
): ContractValidationResult {
  if (!isRecord(value)) {
    return {
      valid: false,
      issues: ["Placement compatibility registry must be an object."],
    };
  }

  const issues: string[] = [];
  const seen = new Set<string>();
  const entries = Object.entries(value);

  for (const [key, profileValue] of entries) {
    if (!isAdsPlacementId(key)) {
      issues.push(`Registry contains unknown placement key "${key}".`);
      continue;
    }

    if (seen.has(key)) {
      issues.push(`Duplicate placement id: ${key}`);
    }
    seen.add(key);

    const profileResult = validatePlacementCompatibilityProfile(profileValue);
    if (!profileResult.valid) {
      for (const issue of profileResult.issues) {
        issues.push(`${key}: ${issue}`);
      }
      continue;
    }

    if (
      isRecord(profileValue) &&
      profileValue.placementId !== key
    ) {
      issues.push(
        `${key}: placementId must match registry key (got "${String(profileValue.placementId)}").`
      );
    }
  }

  // Detect duplicates if caller passed an array-shaped bag via numeric keys —
  // also scan values for repeated placementId fields.
  const placementIdsFromProfiles: string[] = [];
  for (const profileValue of Object.values(value)) {
    if (isRecord(profileValue) && typeof profileValue.placementId === "string") {
      placementIdsFromProfiles.push(profileValue.placementId);
    }
  }
  const idCounts = new Map<string, number>();
  for (const id of placementIdsFromProfiles) {
    idCounts.set(id, (idCounts.get(id) ?? 0) + 1);
  }
  for (const [id, count] of idCounts) {
    if (count > 1) {
      const message = `Duplicate placement id: ${id}`;
      if (!issues.includes(message)) {
        issues.push(message);
      }
    }
  }

  for (const placementId of ADS_PLATFORM_PLACEMENT_IDS) {
    if (!(placementId in value)) {
      issues.push(`Registry is missing placement "${placementId}".`);
    }
  }

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

/**
 * Validate authoritative registry (no arg) or a supplied profile / registry.
 * Fail closed on unknown shapes.
 */
export function validatePlacementCompatibility(
  value?: unknown
): ContractValidationResult {
  if (arguments.length === 0 || value === undefined) {
    return validatePlacementCompatibilityRegistry(ADS_PLACEMENT_COMPATIBILITY);
  }

  if (!isRecord(value)) {
    return {
      valid: false,
      issues: ["Placement compatibility input must be an object."],
    };
  }

  // Single profile: has placementId + capabilities (+ optional contractVersion).
  if ("placementId" in value && "capabilities" in value && !("WATCH_FEED" in value)) {
    return validatePlacementCompatibilityProfile(value);
  }

  // Registry-shaped: keyed by placement ids (or unknown keys — still validated).
  if (
    ADS_PLATFORM_PLACEMENT_IDS.some((id) => id in value) ||
    Object.keys(value).some((key) => isAdsPlacementId(key))
  ) {
    return validatePlacementCompatibilityRegistry(value);
  }

  // Ambiguous / malformed — fail closed.
  if ("capabilities" in value || "placementId" in value) {
    return validatePlacementCompatibilityProfile(value);
  }

  return {
    valid: false,
    issues: [
      "Placement compatibility input is neither a profile nor a registry.",
    ],
  };
}

/**
 * Return the frozen compatibility profile for a placement.
 */
export function getPlacementCompatibility(
  placementId: AdsPlatformPlacementId
): AdsPlacementCompatibilityProfile {
  return ADS_PLACEMENT_COMPATIBILITY[placementId];
}

/**
 * List capability keys.
 * - With placementId: enabled capabilities only, in canonical order.
 * - Without: the full canonical capability key list.
 */
export function listPlacementCapabilities(
  placementId?: AdsPlatformPlacementId
): readonly AdsPlacementCompatibilityCapabilityKey[] {
  if (placementId === undefined) {
    return ADS_PLACEMENT_COMPATIBILITY_CAPABILITY_KEYS;
  }

  const capabilities = ADS_PLACEMENT_COMPATIBILITY[placementId].capabilities;
  return Object.freeze(
    ADS_PLACEMENT_COMPATIBILITY_CAPABILITY_KEYS.filter(
      (key) => capabilities[key]
    )
  );
}

/**
 * True when the placement declares the named capability as enabled.
 */
export function placementSupportsCapability(
  placementId: AdsPlatformPlacementId,
  capability: AdsPlacementCompatibilityCapabilityKey
): boolean {
  return ADS_PLACEMENT_COMPATIBILITY[placementId].capabilities[capability];
}

/**
 * True when the value is a known capability key.
 */
export function isAdsPlacementCompatibilityCapabilityKey(
  value: string
): value is AdsPlacementCompatibilityCapabilityKey {
  return (
    ADS_PLACEMENT_COMPATIBILITY_CAPABILITY_KEYS as readonly string[]
  ).includes(value);
}
