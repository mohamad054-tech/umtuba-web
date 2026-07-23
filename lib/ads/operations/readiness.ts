import { ADS_DELIVERY_ENABLED } from "../constants";
import { getAdsFeatureFlagsSnapshot } from "./featureFlags";
import { getAdsKillSwitchesSnapshot } from "./killSwitches";
import { getAdsOperationalStateSnapshot } from "./operationsState";

/**
 * Ads Operations Readiness Evaluation V1.
 *
 * Production eligibility is always FALSE.
 */

export const ADS_READINESS_CONTRACT_VERSION = "v1" as const;

export type AdsFoundationReadinessId =
  | "canonical_stack"
  | "diagnostics"
  | "measurement"
  | "billing"
  | "inventory"
  | "provenance"
  | "campaign_management"
  | "admin_operations"
  | "reporting";

export type AdsReadinessReport = Readonly<{
  contractVersion: typeof ADS_READINESS_CONTRACT_VERSION;
  operationalState: ReturnType<typeof getAdsOperationalStateSnapshot>;
  featureFlags: ReturnType<typeof getAdsFeatureFlagsSnapshot>;
  killSwitches: ReturnType<typeof getAdsKillSwitchesSnapshot>;
  enabledFoundations: readonly AdsFoundationReadinessId[];
  disabledFoundations: readonly AdsFoundationReadinessId[];
  blockingConditions: readonly string[];
  productionEligible: false;
  productionEnabled: false;
  productionAccepted: false;
  authoritativeProductionServing: false;
  billingEnabled: false;
  deliveryEnabled: false;
  evaluatedAtPolicy: "caller_supplied_or_omitted";
}>;

const ENABLED_FOUNDATIONS: readonly AdsFoundationReadinessId[] = Object.freeze([
  "canonical_stack",
  "diagnostics",
  "measurement",
  "inventory",
  "provenance",
  "campaign_management",
  "admin_operations",
  "reporting",
]);

/** Billing foundation exists as contracts but remains operationally disabled. */
const DISABLED_FOUNDATIONS: readonly AdsFoundationReadinessId[] = Object.freeze([
  "billing",
]);

export function evaluateAdsOperationsReadiness(): AdsReadinessReport {
  const operationalState = getAdsOperationalStateSnapshot();
  const featureFlags = getAdsFeatureFlagsSnapshot();
  const killSwitches = getAdsKillSwitchesSnapshot();

  const blockingConditions: string[] = [
    "productionEligible is permanently false in V1.",
    "globalServing kill switch is engaged.",
    "billing kill switch is engaged.",
    "measurementIngestion kill switch is engaged.",
    "delivery feature flag is false.",
    "billing feature flag is false.",
    `ADS_DELIVERY_ENABLED is ${String(ADS_DELIVERY_ENABLED)}.`,
  ];

  if (operationalState.activeState === ("production" as string)) {
    blockingConditions.push("active operational state must not be production.");
  }

  return Object.freeze({
    contractVersion: ADS_READINESS_CONTRACT_VERSION,
    operationalState,
    featureFlags,
    killSwitches,
    enabledFoundations: ENABLED_FOUNDATIONS,
    disabledFoundations: DISABLED_FOUNDATIONS,
    blockingConditions: Object.freeze([...blockingConditions]),
    productionEligible: false as const,
    productionEnabled: false as const,
    productionAccepted: false as const,
    authoritativeProductionServing: false as const,
    billingEnabled: false as const,
    deliveryEnabled: false as const,
    evaluatedAtPolicy: "caller_supplied_or_omitted" as const,
  });
}

export function assertAdsNotProductionEligible(
  report: AdsReadinessReport = evaluateAdsOperationsReadiness()
): { ok: true } | { ok: false; message: string } {
  if (report.productionEligible !== false) {
    return {
      ok: false,
      message: "Ads readiness refused a production-eligible report.",
    };
  }
  if (
    report.productionEnabled !== false ||
    report.productionAccepted !== false ||
    report.authoritativeProductionServing !== false ||
    report.billingEnabled !== false ||
    report.deliveryEnabled !== false
  ) {
    return {
      ok: false,
      message: "Ads readiness refused an open production authority flag.",
    };
  }
  return { ok: true };
}
