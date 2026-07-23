import { ADS_DELIVERY_ENABLED } from "../constants";

/**
 * Ads Feature Flag Foundation V1 — centralized flags only.
 *
 * Delivery and billing flags are hard-closed. Other foundation flags describe
 * whether internal foundations exist for operators — never production serving.
 */

export const ADS_FEATURE_FLAGS_CONTRACT_VERSION = "v1" as const;

export const ADS_FEATURE_FLAG_KEYS = [
  "delivery",
  "billing",
  "diagnostics",
  "reporting",
  "campaignManagement",
  "adminOperations",
] as const;

export type AdsFeatureFlagKey = (typeof ADS_FEATURE_FLAG_KEYS)[number];

/**
 * Centralized flag table. Do not scatter booleans across product modules.
 * delivery/billing are structurally false regardless of caller intent.
 */
export const ADS_FEATURE_FLAGS = Object.freeze({
  delivery: false,
  billing: false,
  diagnostics: true,
  reporting: true,
  campaignManagement: true,
  adminOperations: true,
} as const satisfies Record<AdsFeatureFlagKey, boolean>);

export type AdsFeatureFlagsSnapshot = Readonly<{
  contractVersion: typeof ADS_FEATURE_FLAGS_CONTRACT_VERSION;
  flags: typeof ADS_FEATURE_FLAGS;
  productionEnabled: false;
  productionAccepted: false;
  authoritativeProductionServing: false;
  billingEnabled: false;
  deliveryEnabled: false;
  sourceOfTruth: "lib/ads/operations/featureFlags.ts";
}>;

export function getAdsFeatureFlagsSnapshot(): AdsFeatureFlagsSnapshot {
  // Defend against accidental constant drift in ADS_DELIVERY_ENABLED.
  const deliveryClosed = ADS_DELIVERY_ENABLED === false && ADS_FEATURE_FLAGS.delivery === false;
  if (!deliveryClosed) {
    throw new Error(
      "Ads feature flags refused an open delivery configuration (fail closed)."
    );
  }
  return Object.freeze({
    contractVersion: ADS_FEATURE_FLAGS_CONTRACT_VERSION,
    flags: ADS_FEATURE_FLAGS,
    productionEnabled: false as const,
    productionAccepted: false as const,
    authoritativeProductionServing: false as const,
    billingEnabled: false as const,
    deliveryEnabled: false as const,
    sourceOfTruth: "lib/ads/operations/featureFlags.ts" as const,
  });
}

export function isAdsFeatureFlagEnabled(key: AdsFeatureFlagKey): boolean {
  if (key === "delivery" || key === "billing") {
    return false;
  }
  return ADS_FEATURE_FLAGS[key] === true;
}

/**
 * Propose a flag change. Opening delivery/billing always fails closed.
 * Other changes are not applied in V1 (frozen table) but are classifiable.
 */
export function evaluateAdsFeatureFlagChange(input: {
  key: AdsFeatureFlagKey;
  enabled: boolean;
}):
  | {
      ok: true;
      key: AdsFeatureFlagKey;
      enabled: boolean;
      applied: false;
      message: string;
    }
  | { ok: false; message: string; issues: readonly string[] } {
  if (!(ADS_FEATURE_FLAG_KEYS as readonly string[]).includes(input.key)) {
    return {
      ok: false,
      message: "Unknown Ads feature flag.",
      issues: Object.freeze(["key is not a registered Ads feature flag."]),
    };
  }
  if (
    (input.key === "delivery" || input.key === "billing") &&
    input.enabled === true
  ) {
    return {
      ok: false,
      message: "Delivery and billing feature flags cannot be enabled in V1.",
      issues: Object.freeze([
        `${input.key} must remain false.`,
        "productionEnabled must remain false.",
      ]),
    };
  }
  return {
    ok: true,
    key: input.key,
    enabled: input.enabled,
    applied: false,
    message:
      "Feature flag table is frozen in V1; change accepted for audit only.",
  };
}
