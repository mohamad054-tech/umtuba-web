import {
  ADS_PLATFORM_CREATIVE_TYPES,
  type AdsPlatformCreativeType,
} from "./creativeContracts";
import {
  ADS_PLACEMENT_COMPATIBILITY,
  ADS_PLACEMENT_COMPATIBILITY_CAPABILITY_KEYS,
  ADS_PLACEMENT_COMPATIBILITY_CONTRACT_VERSION,
  collectIncompatibleCapabilityIssues,
  getPlacementCompatibility,
  type AdsPlacementCompatibilityCapabilities,
  type AdsPlacementCompatibilityCapabilityKey,
  type AdsPlacementCompatibilityProfile,
  validatePlacementCompatibilityProfile,
} from "./placementCompatibility";
import {
  ADS_PLACEMENT_REGISTRY,
  ADS_PLATFORM_PLACEMENT_IDS,
  getAdsPlacement,
  isAdsPlacementId,
  isCreativeTypeSupportedByPlacement,
  type AdsPlatformPlacementId,
} from "./placementRegistry";
import {
  getCanonicalCreativeType,
  getCanonicalPlacement,
} from "./taxonomyMapper";

/**
 * Ads Creative ↔ Placement Compatibility Gate Foundation V1.
 *
 * Pure validation only. Determines whether a creative type is allowed on a
 * placement given a capability profile. Never delivers, ranks, auctions,
 * paces, bills, ingests events, renders, selects, or imports product modules.
 *
 * productionEnabled is always false in V1.
 */

export const ADS_CREATIVE_PLACEMENT_COMPATIBILITY_CONTRACT_VERSION = 1 as const;

/**
 * Top-level keys allowed on the compatibility gate input.
 * Unknown fields fail closed.
 */
export const ADS_CREATIVE_PLACEMENT_COMPATIBILITY_ALLOWED_FIELDS = [
  "placement",
  "creativeType",
  "capabilityProfile",
] as const;

/**
 * Stable rejection reason codes / messages used by the gate.
 * Deterministic — do not reorder evaluation lightly.
 */
export const ADS_CREATIVE_PLACEMENT_INCOMPATIBILITY_REASONS = [
  "invalid_input",
  "unknown_field",
  "invalid_taxonomy",
  "unsupported_placement",
  "unsupported_creative_type",
  "invalid_compatibility_profile",
  "placement_capability_missing",
  "creative_type_unsupported_by_placement",
  "creative_requires_capability_not_provided",
] as const;

export type AdsCreativePlacementIncompatibilityReason =
  (typeof ADS_CREATIVE_PLACEMENT_INCOMPATIBILITY_REASONS)[number];

/**
 * Required placement-compatibility capabilities per creative type.
 * Types without a dedicated capability flag require none beyond registry support.
 */
export const ADS_CREATIVE_TYPE_REQUIRED_CAPABILITIES: Readonly<
  Record<AdsPlatformCreativeType, readonly AdsPlacementCompatibilityCapabilityKey[]>
> = Object.freeze({
  video: Object.freeze(["supportsVideo"] as const),
  image: Object.freeze(["supportsImage"] as const),
  carousel: Object.freeze(["supportsCarousel"] as const),
  text: Object.freeze([] as const),
  live_promotion: Object.freeze([] as const),
  store_promotion: Object.freeze(["supportsStorePromotion"] as const),
  learning_promotion: Object.freeze(["supportsLearningPromotion"] as const),
  game_promotion: Object.freeze([] as const),
  brand: Object.freeze(["supportsSponsoredContent"] as const),
});

/**
 * Gate input — placement, creative type, and optional capability profile.
 * When capabilityProfile is omitted, the authoritative placement profile is used.
 */
export type AdsCreativePlacementCompatibilityInput = Readonly<{
  placement: string;
  creativeType: string;
  capabilityProfile?: unknown;
}>;

/**
 * Gate result — validation only. productionEnabled is always false.
 */
export type AdsCreativePlacementCompatibilityResult = Readonly<{
  compatible: boolean;
  /** Null when compatible; stable human-readable reason when incompatible. */
  reason: string | null;
  productionEnabled: false;
}>;

const INPUT_ALLOWED_FIELD_SET = new Set<string>(
  ADS_CREATIVE_PLACEMENT_COMPATIBILITY_ALLOWED_FIELDS
);

const CREATIVE_TYPE_SET = new Set<string>(ADS_PLATFORM_CREATIVE_TYPES);

const CAPABILITY_KEY_SET = new Set<string>(
  ADS_PLACEMENT_COMPATIBILITY_CAPABILITY_KEYS
);

const PROFILE_ALLOWED_FIELDS = new Set([
  "placementId",
  "contractVersion",
  "capabilities",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function freezeResult(
  compatible: boolean,
  reason: string | null
): AdsCreativePlacementCompatibilityResult {
  return Object.freeze({
    compatible,
    reason,
    productionEnabled: false as const,
  });
}

function incompatible(reason: string): AdsCreativePlacementCompatibilityResult {
  return freezeResult(false, reason);
}

function compatible(): AdsCreativePlacementCompatibilityResult {
  return freezeResult(true, null);
}

/**
 * Map taxonomy / platform creative identifiers to AdsPlatformCreativeType.
 * Accepts lowercase platform ids and canonical SCREAMING_SNAKE via taxonomy.
 * Fail closed on unknown input.
 */
export function resolvePlatformCreativeType(
  value: string
): AdsPlatformCreativeType | null {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  if (CREATIVE_TYPE_SET.has(value)) {
    return value as AdsPlatformCreativeType;
  }

  try {
    const canonical = getCanonicalCreativeType(value);
    const platform = canonical.toLowerCase();
    if (CREATIVE_TYPE_SET.has(platform)) {
      return platform as AdsPlatformCreativeType;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Map taxonomy / platform placement identifiers to AdsPlatformPlacementId.
 * Fail closed on unknown input.
 */
export function resolvePlatformPlacementId(
  value: string
): AdsPlatformPlacementId | null {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  if (isAdsPlacementId(value)) {
    return value;
  }

  try {
    const canonical = getCanonicalPlacement(value);
    if (isAdsPlacementId(canonical)) {
      return canonical;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Required capability keys for a creative type, in canonical order.
 */
export function listRequiredCapabilitiesForCreativeType(
  creativeType: AdsPlatformCreativeType
): readonly AdsPlacementCompatibilityCapabilityKey[] {
  return ADS_CREATIVE_TYPE_REQUIRED_CAPABILITIES[creativeType];
}

function isCapabilitiesBag(
  value: Record<string, unknown>
): boolean {
  const keys = Object.keys(value);
  if (keys.length === 0) {
    return false;
  }
  return keys.every((key) => CAPABILITY_KEY_SET.has(key));
}

function validateCapabilitiesBag(
  value: unknown,
  issues: string[]
): AdsPlacementCompatibilityCapabilities | null {
  if (!isRecord(value)) {
    issues.push("capabilities must be an object.");
    return null;
  }

  for (const key of Object.keys(value)) {
    if (!CAPABILITY_KEY_SET.has(key)) {
      issues.push(`capabilities contains unknown capability "${key}".`);
    }
  }

  for (const key of ADS_PLACEMENT_COMPATIBILITY_CAPABILITY_KEYS) {
    if (!(key in value)) {
      issues.push(`capabilities is missing required capability "${key}".`);
      continue;
    }
    if (typeof value[key] !== "boolean") {
      issues.push(`capabilities.${key} must be a boolean.`);
    }
  }

  if (issues.length > 0) {
    return null;
  }

  const capabilities = Object.freeze({
    ...(value as AdsPlacementCompatibilityCapabilities),
  });
  issues.push(...collectIncompatibleCapabilityIssues(capabilities));
  if (issues.length > 0) {
    return null;
  }

  return capabilities;
}

/**
 * Resolve and validate a capability profile input.
 * Accepts a full placement compatibility profile or a capabilities bag.
 * Fail closed on unknown fields / invalid shapes.
 */
export function resolveCapabilityProfile(
  value: unknown,
  expectedPlacementId: AdsPlatformPlacementId
):
  | Readonly<{ valid: true; capabilities: AdsPlacementCompatibilityCapabilities }>
  | Readonly<{ valid: false; issues: readonly string[] }> {
  if (value === undefined) {
    const profile = ADS_PLACEMENT_COMPATIBILITY[expectedPlacementId];
    if (!profile) {
      return {
        valid: false,
        issues: Object.freeze([
          `Placement compatibility profile is missing for "${expectedPlacementId}".`,
        ]),
      };
    }
    return { valid: true, capabilities: profile.capabilities };
  }

  if (!isRecord(value)) {
    return {
      valid: false,
      issues: Object.freeze(["capabilityProfile must be an object."]),
    };
  }

  // Full profile shape.
  if (
    "placementId" in value ||
    "contractVersion" in value ||
    "capabilities" in value
  ) {
    for (const key of Object.keys(value)) {
      if (!PROFILE_ALLOWED_FIELDS.has(key)) {
        return {
          valid: false,
          issues: Object.freeze([
            `capabilityProfile contains unknown field "${key}".`,
          ]),
        };
      }
    }

    const profileResult = validatePlacementCompatibilityProfile(value);
    if (!profileResult.valid) {
      return {
        valid: false,
        issues: Object.freeze([...profileResult.issues]),
      };
    }

    if (
      typeof value.placementId === "string" &&
      value.placementId !== expectedPlacementId
    ) {
      return {
        valid: false,
        issues: Object.freeze([
          `capabilityProfile.placementId must match placement "${expectedPlacementId}".`,
        ]),
      };
    }

    if (
      value.contractVersion !== undefined &&
      value.contractVersion !== ADS_PLACEMENT_COMPATIBILITY_CONTRACT_VERSION
    ) {
      return {
        valid: false,
        issues: Object.freeze([
          `capabilityProfile.contractVersion must be ${ADS_PLACEMENT_COMPATIBILITY_CONTRACT_VERSION}.`,
        ]),
      };
    }

    const capabilities = (value as AdsPlacementCompatibilityProfile)
      .capabilities;
    return { valid: true, capabilities };
  }

  // Capabilities-only bag.
  if (isCapabilitiesBag(value)) {
    const issues: string[] = [];
    const capabilities = validateCapabilitiesBag(value, issues);
    if (!capabilities) {
      return { valid: false, issues: Object.freeze([...issues]) };
    }
    return { valid: true, capabilities };
  }

  return {
    valid: false,
    issues: Object.freeze([
      "capabilityProfile is neither a compatibility profile nor a capabilities object.",
    ]),
  };
}

function findMissingRequiredCapability(
  creativeType: AdsPlatformCreativeType,
  capabilities: AdsPlacementCompatibilityCapabilities
): AdsPlacementCompatibilityCapabilityKey | null {
  for (const key of ADS_CREATIVE_TYPE_REQUIRED_CAPABILITIES[creativeType]) {
    if (!capabilities[key]) {
      return key;
    }
  }
  return null;
}

/**
 * Pure creative ↔ placement compatibility gate.
 * Fail closed. Never enables production delivery.
 */
export function validateCreativePlacementCompatibility(
  input: unknown
): AdsCreativePlacementCompatibilityResult {
  if (!isRecord(input)) {
    return incompatible("Compatibility input must be an object.");
  }

  for (const key of Object.keys(input)) {
    if (!INPUT_ALLOWED_FIELD_SET.has(key)) {
      return incompatible(
        `Compatibility input contains unknown field "${key}".`
      );
    }
  }

  if (typeof input.placement !== "string" || input.placement.trim().length === 0) {
    return incompatible("Invalid taxonomy: placement must be a non-empty string.");
  }

  if (
    typeof input.creativeType !== "string" ||
    input.creativeType.trim().length === 0
  ) {
    return incompatible(
      "Invalid taxonomy: creativeType must be a non-empty string."
    );
  }

  const placementId = resolvePlatformPlacementId(input.placement);
  if (!placementId) {
    // Distinguish unknown taxonomy alias vs unknown placement id when possible.
    if (
      !isAdsPlacementId(input.placement) &&
      !(ADS_PLATFORM_PLACEMENT_IDS as readonly string[]).includes(input.placement)
    ) {
      try {
        getCanonicalPlacement(input.placement);
      } catch {
        return incompatible(
          `Invalid taxonomy: unknown placement "${input.placement}".`
        );
      }
    }
    return incompatible(
      `Unsupported placement "${input.placement}".`
    );
  }

  const creativeType = resolvePlatformCreativeType(input.creativeType);
  if (!creativeType) {
    return incompatible(
      `Invalid taxonomy: unknown creative type "${input.creativeType}".`
    );
  }

  if (!(placementId in ADS_PLACEMENT_REGISTRY)) {
    return incompatible(`Unsupported placement "${placementId}".`);
  }

  if (!(placementId in ADS_PLACEMENT_COMPATIBILITY)) {
    return incompatible(
      `Placement capability profile is missing for "${placementId}".`
    );
  }

  const profileResult = resolveCapabilityProfile(
    input.capabilityProfile,
    placementId
  );
  if (!profileResult.valid) {
    return incompatible(
      `Invalid compatibility profile: ${profileResult.issues[0]}`
    );
  }

  if (!isCreativeTypeSupportedByPlacement(placementId, creativeType)) {
    return incompatible(
      `Creative type "${creativeType}" is not supported by placement "${placementId}".`
    );
  }

  const missing = findMissingRequiredCapability(
    creativeType,
    profileResult.capabilities
  );
  if (missing) {
    return incompatible(
      `Creative type "${creativeType}" requires capability "${missing}" which is not provided by placement "${placementId}".`
    );
  }

  return compatible();
}

/**
 * Boolean helper over the compatibility gate.
 */
export function isCreativeCompatible(
  placement: string,
  creativeType: string,
  capabilityProfile?: unknown
): boolean {
  const input: AdsCreativePlacementCompatibilityInput =
    capabilityProfile === undefined
      ? { placement, creativeType }
      : { placement, creativeType, capabilityProfile };
  return validateCreativePlacementCompatibility(input).compatible;
}

/**
 * List creative types supported by a placement under a capability profile.
 * Deterministic order matches ADS_PLATFORM_CREATIVE_TYPES.
 * When capabilityProfile is omitted, uses the authoritative placement profile.
 */
export function listSupportedCreativeTypes(
  placement: string,
  capabilityProfile?: unknown
): readonly AdsPlatformCreativeType[] {
  const placementId = resolvePlatformPlacementId(placement);
  if (!placementId) {
    return Object.freeze([]);
  }

  if (!(placementId in ADS_PLACEMENT_REGISTRY)) {
    return Object.freeze([]);
  }

  const profileResult = resolveCapabilityProfile(
    capabilityProfile,
    placementId
  );
  if (!profileResult.valid) {
    return Object.freeze([]);
  }

  const registryTypes = getAdsPlacement(placementId)
    .supportedCreativeTypes as readonly AdsPlatformCreativeType[];

  const supported = ADS_PLATFORM_CREATIVE_TYPES.filter((creativeType) => {
    if (!registryTypes.includes(creativeType)) {
      return false;
    }
    return (
      findMissingRequiredCapability(creativeType, profileResult.capabilities) ===
      null
    );
  });

  return Object.freeze([...supported]);
}

/**
 * Authoritative compatibility check using registry + placement capability matrix.
 * Convenience wrapper — same gate as validateCreativePlacementCompatibility.
 */
export function getPlacementCompatibilityForCreative(
  placementId: AdsPlatformPlacementId,
  creativeType: AdsPlatformCreativeType
): AdsCreativePlacementCompatibilityResult {
  return validateCreativePlacementCompatibility({
    placement: placementId,
    creativeType,
    capabilityProfile: getPlacementCompatibility(placementId),
  });
}
