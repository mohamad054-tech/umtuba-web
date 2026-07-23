import {
  ADS_CAMPAIGN_MANAGEMENT_AUTHORITY,
  freezeCampaignManagementAuthority,
} from "./authority";

/**
 * Unified budget foundation for Campaign Management V1.
 * No billing execution.
 */

export const ADS_CAMPAIGN_BUDGET_CONTRACT_VERSION = "v1" as const;

export const ADS_CAMPAIGN_BUDGET_MAX_MINOR = 1_000_000_000_000;

export const ADS_CAMPAIGN_PACING_REFERENCES = [
  "unspecified",
  "even",
  "accelerated",
  "lifetime",
] as const;

export type AdsCampaignPacingReference =
  (typeof ADS_CAMPAIGN_PACING_REFERENCES)[number];

export type AdsCampaignBudgetModel = Readonly<{
  contractVersion: typeof ADS_CAMPAIGN_BUDGET_CONTRACT_VERSION;
  currencyCode: string;
  dailyBudgetMinor: number | null;
  lifetimeBudgetMinor: number | null;
  spendLimitMinor: number | null;
  pacingReference: AdsCampaignPacingReference;
  productionEnabled: false;
  billingEnabled: false;
  deliveryEnabled: false;
  productionAccepted: false;
  authoritativeProductionServing: false;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseOptionalPositiveMinor(
  value: unknown,
  field: string,
  issues: string[]
): number | null {
  if (value == null || value === "") return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    issues.push(`${field} must be a positive integer minor amount when set.`);
    return null;
  }
  if (value > ADS_CAMPAIGN_BUDGET_MAX_MINOR) {
    issues.push(`${field} exceeds the allowed maximum.`);
    return null;
  }
  return value;
}

export function parseAdsCampaignBudgetModel(
  input: unknown
):
  | { ok: true; budget: AdsCampaignBudgetModel }
  | { ok: false; message: string; issues: readonly string[] } {
  if (!isRecord(input)) {
    return {
      ok: false,
      message: "Budget model must be an object.",
      issues: Object.freeze(["Budget model must be an object."]),
    };
  }
  const issues: string[] = [];
  if (
    input.contractVersion != null &&
    input.contractVersion !== ADS_CAMPAIGN_BUDGET_CONTRACT_VERSION
  ) {
    issues.push(
      `contractVersion must be "${ADS_CAMPAIGN_BUDGET_CONTRACT_VERSION}".`
    );
  }
  if (
    typeof input.currencyCode !== "string" ||
    !/^[A-Za-z]{3}$/.test(input.currencyCode.trim())
  ) {
    issues.push("currencyCode must be a 3-letter ISO code.");
  }
  const daily = parseOptionalPositiveMinor(
    input.dailyBudgetMinor,
    "dailyBudgetMinor",
    issues
  );
  const lifetime = parseOptionalPositiveMinor(
    input.lifetimeBudgetMinor,
    "lifetimeBudgetMinor",
    issues
  );
  const spendLimit = parseOptionalPositiveMinor(
    input.spendLimitMinor,
    "spendLimitMinor",
    issues
  );
  if (daily == null && lifetime == null) {
    issues.push("At least one of dailyBudgetMinor or lifetimeBudgetMinor is required.");
  }
  if (
    daily != null &&
    lifetime != null &&
    lifetime < daily
  ) {
    issues.push("lifetimeBudgetMinor must be >= dailyBudgetMinor when both are set.");
  }
  if (
    spendLimit != null &&
    lifetime != null &&
    spendLimit > lifetime
  ) {
    issues.push("spendLimitMinor cannot exceed lifetimeBudgetMinor.");
  }
  let pacing: AdsCampaignPacingReference = "unspecified";
  if (input.pacingReference != null) {
    if (
      typeof input.pacingReference !== "string" ||
      !(ADS_CAMPAIGN_PACING_REFERENCES as readonly string[]).includes(
        input.pacingReference
      )
    ) {
      issues.push("pacingReference is invalid.");
    } else {
      pacing = input.pacingReference as AdsCampaignPacingReference;
    }
  }
  if (issues.length > 0) {
    return {
      ok: false,
      message: issues[0] ?? "Invalid budget model.",
      issues: Object.freeze(issues),
    };
  }
  return {
    ok: true,
    budget: freezeCampaignManagementAuthority({
      contractVersion: ADS_CAMPAIGN_BUDGET_CONTRACT_VERSION,
      currencyCode: String(input.currencyCode).trim().toUpperCase(),
      dailyBudgetMinor: daily,
      lifetimeBudgetMinor: lifetime,
      spendLimitMinor: spendLimit,
      pacingReference: pacing,
    }),
  };
}

/** Billing execution is always refused. */
export function evaluateAdsCampaignBudgetBillingExecution(): Readonly<{
  allowed: false;
  reason: string;
  billingEnabled: false;
  productionEnabled: false;
  productionAccepted: false;
  authoritativeProductionServing: false;
  deliveryEnabled: false;
}> {
  return Object.freeze({
    allowed: false as const,
    reason: "Campaign budget foundation never executes billing.",
    ...ADS_CAMPAIGN_MANAGEMENT_AUTHORITY,
  });
}
