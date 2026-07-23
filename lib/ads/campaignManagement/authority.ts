/**
 * Shared authority for Campaign Management Foundation V1.
 * Serving / billing / production remain impossible.
 */

export const ADS_CAMPAIGN_MANAGEMENT_CONTRACT_VERSION = "v1" as const;

export const ADS_CAMPAIGN_MANAGEMENT_AUTHORITY = {
  productionEnabled: false,
  productionAccepted: false,
  authoritativeProductionServing: false,
  billingEnabled: false,
  deliveryEnabled: false,
  enablesRealCampaignDelivery: false,
  connectsPaymentProviders: false,
  mutatesRuntimeServing: false,
} as const;

export type AdsCampaignManagementAuthority =
  typeof ADS_CAMPAIGN_MANAGEMENT_AUTHORITY;

export function freezeCampaignManagementAuthority<
  T extends Record<string, unknown>,
>(value: T): T & AdsCampaignManagementAuthority {
  return Object.freeze({
    ...value,
    ...ADS_CAMPAIGN_MANAGEMENT_AUTHORITY,
  });
}

export function assertCampaignManagementAuthorityClosed(input: {
  productionEnabled?: unknown;
  productionAccepted?: unknown;
  authoritativeProductionServing?: unknown;
  billingEnabled?: unknown;
  deliveryEnabled?: unknown;
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
  return issues.length === 0
    ? { ok: true }
    : { ok: false, issues: Object.freeze(issues) };
}
