import {
  ADS_CAMPAIGN_MANAGEMENT_AUTHORITY,
  assertCampaignManagementAuthorityClosed,
} from "./authority";
import {
  parseAdsCampaignDomainContract,
  type AdsCampaignDomainContract,
} from "./campaign";
import {
  evaluateAdsCampaignLifecycleTransition,
  evaluateAdsCampaignServingEligibility,
  type AdsCampaignLifecycleState,
} from "./lifecycle";

/**
 * Centralized Campaign Management validation V1.
 * Fail closed. Never enables production serving/billing.
 */

export const ADS_CAMPAIGN_VALIDATION_CONTRACT_VERSION = "v1" as const;

export type AdsCampaignValidationReport = Readonly<{
  contractVersion: typeof ADS_CAMPAIGN_VALIDATION_CONTRACT_VERSION;
  ok: boolean;
  issues: readonly string[];
  campaign: AdsCampaignDomainContract | null;
  servingEligible: false;
  productionEnabled: false;
  productionAccepted: false;
  authoritativeProductionServing: false;
  billingEnabled: false;
  deliveryEnabled: false;
}>;

/**
 * Validate a full campaign management bundle.
 * Requires at least one ad set and one creative for review/approved/paused.
 */
export function validateAdsCampaignManagementBundle(
  input: unknown
): AdsCampaignValidationReport {
  const parsed = parseAdsCampaignDomainContract(input);
  if (!parsed.ok) {
    return Object.freeze({
      contractVersion: ADS_CAMPAIGN_VALIDATION_CONTRACT_VERSION,
      ok: false,
      issues: parsed.issues,
      campaign: null,
      servingEligible: false as const,
      ...ADS_CAMPAIGN_MANAGEMENT_AUTHORITY,
    });
  }

  const issues: string[] = [];
  const campaign = parsed.campaign;
  const authority = assertCampaignManagementAuthorityClosed(campaign);
  if (!authority.ok) {
    issues.push(...authority.issues);
  }

  const needsAssets =
    campaign.lifecycleState === "review" ||
    campaign.lifecycleState === "approved" ||
    campaign.lifecycleState === "paused";

  if (needsAssets && campaign.adSets.length === 0) {
    issues.push("At least one ad set is required for this lifecycle state.");
  }
  if (needsAssets && campaign.creatives.length === 0) {
    issues.push("At least one creative is required for this lifecycle state.");
  }
  if (
    campaign.budget.dailyBudgetMinor == null &&
    campaign.budget.lifetimeBudgetMinor == null
  ) {
    issues.push("Campaign budget is incomplete.");
  }
  if (campaign.schedule.startAt && campaign.schedule.endAt) {
    if (
      Date.parse(campaign.schedule.endAt) < Date.parse(campaign.schedule.startAt)
    ) {
      issues.push("Campaign schedule is invalid.");
    }
  }

  for (const adSet of campaign.adSets) {
    if (adSet.targeting.countries.length === 0) {
      issues.push(
        `adSet ${adSet.adSetRef}: targeting must include at least one country.`
      );
    }
    if (adSet.placements.length === 0) {
      issues.push(`adSet ${adSet.adSetRef}: placements are required.`);
    }
  }

  const serving = evaluateAdsCampaignServingEligibility({
    lifecycleState: campaign.lifecycleState,
  });
  if (serving.eligible !== false) {
    issues.push("Serving eligibility must remain false.");
  }

  return Object.freeze({
    contractVersion: ADS_CAMPAIGN_VALIDATION_CONTRACT_VERSION,
    ok: issues.length === 0,
    issues: Object.freeze(issues),
    campaign: issues.length === 0 ? campaign : campaign,
    servingEligible: false as const,
    ...ADS_CAMPAIGN_MANAGEMENT_AUTHORITY,
  });
}

export function validateAdsCampaignLifecycleChange(input: {
  from: AdsCampaignLifecycleState;
  to: AdsCampaignLifecycleState;
  campaign?: unknown;
}):
  | {
      ok: true;
      transition: Extract<
        ReturnType<typeof evaluateAdsCampaignLifecycleTransition>,
        { ok: true }
      >;
      productionEnabled: false;
      deliveryEnabled: false;
    }
  | { ok: false; message: string; issues: readonly string[] } {
  const transition = evaluateAdsCampaignLifecycleTransition({
    from: input.from,
    to: input.to,
  });
  if (!transition.ok) {
    return transition;
  }
  if (input.campaign !== undefined) {
    // Validate as if already in the target lifecycle state.
    const projected =
      typeof input.campaign === "object" &&
      input.campaign !== null &&
      !Array.isArray(input.campaign)
        ? { ...(input.campaign as Record<string, unknown>), lifecycleState: input.to }
        : input.campaign;
    const bundle = validateAdsCampaignManagementBundle(projected);
    if (
      !bundle.ok &&
      (input.to === "review" ||
        input.to === "approved" ||
        input.to === "paused")
    ) {
      return {
        ok: false,
        message: "Campaign bundle failed validation for this transition.",
        issues: bundle.issues,
      };
    }
  }
  return {
    ok: true,
    transition,
    productionEnabled: false as const,
    deliveryEnabled: false as const,
  };
}
