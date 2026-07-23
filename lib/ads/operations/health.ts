import { ADS_DELIVERY_ENABLED } from "../constants";
import { evaluateAdsOperationsReadiness } from "./readiness";

/**
 * Ads Operations Health Check Foundation V1 — read-only foundation presence.
 *
 * Does not probe networks, databases, or live delivery. Reports whether
 * foundational modules are present and production paths remain closed.
 */

export const ADS_HEALTH_CONTRACT_VERSION = "v1" as const;

export type AdsHealthComponentId =
  | "canonical_stack"
  | "diagnostics"
  | "measurement"
  | "billing"
  | "inventory"
  | "provenance";

export type AdsHealthStatus = "healthy" | "disabled" | "blocked";

export type AdsComponentHealth = Readonly<{
  id: AdsHealthComponentId;
  status: AdsHealthStatus;
  detail: string;
  productionEnabled: false;
}>;

export type AdsHealthReport = Readonly<{
  contractVersion: typeof ADS_HEALTH_CONTRACT_VERSION;
  overall: "healthy" | "degraded";
  components: readonly AdsComponentHealth[];
  productionEnabled: false;
  productionAccepted: false;
  authoritativeProductionServing: false;
  billingEnabled: false;
  deliveryEnabled: false;
  readOnly: true;
}>;

function component(
  id: AdsHealthComponentId,
  status: AdsHealthStatus,
  detail: string
): AdsComponentHealth {
  return Object.freeze({
    id,
    status,
    detail,
    productionEnabled: false as const,
  });
}

/** Read-only health snapshot for Ads foundations. */
export function getAdsOperationsHealthReport(): AdsHealthReport {
  const readiness = evaluateAdsOperationsReadiness();
  const components: AdsComponentHealth[] = [
    component(
      "canonical_stack",
      "healthy",
      "runAdsCanonicalStackV1 remains the sole authoritative decision engine."
    ),
    component(
      "diagnostics",
      readiness.featureFlags.flags.diagnostics ? "healthy" : "disabled",
      "Admin diagnostic runner foundation is inspection-only."
    ),
    component(
      "measurement",
      "blocked",
      "Measurement contracts exist; ingestion kill switch is engaged."
    ),
    component(
      "billing",
      "disabled",
      "Billing contracts exist; billing flag and kill switch remain closed."
    ),
    component(
      "inventory",
      "healthy",
      "Inventory Bridge foundation is available for read-only diagnostics."
    ),
    component(
      "provenance",
      "healthy",
      "Candidate Provenance Foundation provides structured identity continuity."
    ),
  ];

  const overall =
    ADS_DELIVERY_ENABLED === false &&
    readiness.productionEligible === false &&
    readiness.deliveryEnabled === false &&
    readiness.billingEnabled === false
      ? ("healthy" as const)
      : ("degraded" as const);

  if (overall === "degraded") {
    throw new Error(
      "Ads health refused an open production configuration (fail closed)."
    );
  }

  return Object.freeze({
    contractVersion: ADS_HEALTH_CONTRACT_VERSION,
    overall,
    components: Object.freeze(components),
    productionEnabled: false as const,
    productionAccepted: false as const,
    authoritativeProductionServing: false as const,
    billingEnabled: false as const,
    deliveryEnabled: false as const,
    readOnly: true as const,
  });
}
