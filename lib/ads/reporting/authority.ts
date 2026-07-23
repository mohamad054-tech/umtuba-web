/**
 * Shared authority for Reporting & Analytics Foundation V1.
 * Read-only contracts. No live delivery, billing, or ingestion.
 */

export const ADS_REPORTING_CONTRACT_VERSION = "v1" as const;

export const ADS_REPORTING_AUTHORITY = {
  productionEnabled: false,
  productionAccepted: false,
  authoritativeProductionServing: false,
  billingEnabled: false,
  deliveryEnabled: false,
  triggersMeasurementIngestion: false,
  sourcesLiveDelivery: false,
  mutatesDatabase: false,
} as const;

export type AdsReportingAuthority = typeof ADS_REPORTING_AUTHORITY;

export function freezeReportingAuthority<T extends Record<string, unknown>>(
  value: T
): T & AdsReportingAuthority {
  return Object.freeze({
    ...value,
    ...ADS_REPORTING_AUTHORITY,
  });
}

export function assertReportingAuthorityClosed(input: {
  productionEnabled?: unknown;
  productionAccepted?: unknown;
  authoritativeProductionServing?: unknown;
  billingEnabled?: unknown;
  deliveryEnabled?: unknown;
  triggersMeasurementIngestion?: unknown;
  sourcesLiveDelivery?: unknown;
}): { ok: true } | { ok: false; issues: readonly string[] } {
  const issues: string[] = [];
  if (input.productionEnabled === true) {
    issues.push("productionEnabled must remain false.");
  }
  if (input.productionAccepted === true) {
    issues.push("productionAccepted must remain false.");
  }
  if (input.authoritativeProductionServing === true) {
    issues.push("authoritativeProductionServing must remain false.");
  }
  if (input.billingEnabled === true) {
    issues.push("billingEnabled must remain false.");
  }
  if (input.deliveryEnabled === true) {
    issues.push("deliveryEnabled must remain false.");
  }
  if (input.triggersMeasurementIngestion === true) {
    issues.push("triggersMeasurementIngestion must remain false.");
  }
  if (input.sourcesLiveDelivery === true) {
    issues.push("sourcesLiveDelivery must remain false.");
  }
  return issues.length === 0
    ? { ok: true }
    : { ok: false, issues: Object.freeze(issues) };
}
