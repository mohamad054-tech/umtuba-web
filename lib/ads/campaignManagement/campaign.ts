import { CAMPAIGN_OBJECTIVES, type CampaignObjective } from "../constants";
import { freezeCampaignManagementAuthority } from "./authority";
import {
  parseAdsCampaignAdSetContract,
  type AdsCampaignAdSetContract,
} from "./adSet";
import {
  parseAdsCampaignBudgetModel,
  type AdsCampaignBudgetModel,
} from "./budget";
import {
  parseAdsCampaignCreativeContract,
  type AdsCampaignCreativeContract,
} from "./creative";
import {
  isAdsCampaignLifecycleState,
  type AdsCampaignLifecycleState,
} from "./lifecycle";
import {
  parseAdsCampaignScheduleModel,
  type AdsCampaignScheduleModel,
} from "./schedule";

/**
 * Canonical campaign domain contracts for Campaign Management V1.
 * Serving remains impossible in every lifecycle state.
 */

export const ADS_CAMPAIGN_DOMAIN_CONTRACT_VERSION = "v1" as const;

export type AdsCampaignDomainContract = Readonly<{
  contractVersion: typeof ADS_CAMPAIGN_DOMAIN_CONTRACT_VERSION;
  campaignRef: string;
  advertiserAccountRef: string;
  name: string;
  objective: CampaignObjective;
  lifecycleState: AdsCampaignLifecycleState;
  budget: AdsCampaignBudgetModel;
  schedule: AdsCampaignScheduleModel;
  adSets: readonly AdsCampaignAdSetContract[];
  creatives: readonly AdsCampaignCreativeContract[];
  productionEnabled: false;
  deliveryEnabled: false;
  billingEnabled: false;
  productionAccepted: false;
  authoritativeProductionServing: false;
  servingImpossible: true;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const REF_RE = /^[A-Za-z0-9_.:-]{1,128}$/;

export function parseAdsCampaignDomainContract(
  input: unknown
):
  | { ok: true; campaign: AdsCampaignDomainContract }
  | { ok: false; message: string; issues: readonly string[] } {
  if (!isRecord(input)) {
    return {
      ok: false,
      message: "Campaign contract must be an object.",
      issues: Object.freeze(["Campaign contract must be an object."]),
    };
  }
  const issues: string[] = [];
  if (
    input.contractVersion != null &&
    input.contractVersion !== ADS_CAMPAIGN_DOMAIN_CONTRACT_VERSION
  ) {
    issues.push(
      `contractVersion must be "${ADS_CAMPAIGN_DOMAIN_CONTRACT_VERSION}".`
    );
  }
  if (
    typeof input.campaignRef !== "string" ||
    !REF_RE.test(input.campaignRef.trim())
  ) {
    issues.push("campaignRef must be 1–128 chars of [A-Za-z0-9_.:-].");
  }
  if (
    typeof input.advertiserAccountRef !== "string" ||
    !REF_RE.test(input.advertiserAccountRef.trim())
  ) {
    issues.push("advertiserAccountRef must be 1–128 chars of [A-Za-z0-9_.:-].");
  }
  if (
    typeof input.name !== "string" ||
    input.name.trim().length < 2 ||
    input.name.trim().length > 120
  ) {
    issues.push("name must be 2–120 characters.");
  }
  if (
    typeof input.objective !== "string" ||
    !(CAMPAIGN_OBJECTIVES as readonly string[]).includes(input.objective)
  ) {
    issues.push("objective is invalid.");
  }
  if (!isAdsCampaignLifecycleState(input.lifecycleState)) {
    issues.push("lifecycleState is invalid.");
  }

  const budget = parseAdsCampaignBudgetModel(input.budget);
  if (!budget.ok) issues.push(...budget.issues.map((i) => `budget: ${i}`));
  const schedule = parseAdsCampaignScheduleModel(input.schedule);
  if (!schedule.ok) issues.push(...schedule.issues.map((i) => `schedule: ${i}`));

  if (!Array.isArray(input.adSets)) {
    issues.push("adSets must be an array.");
  }
  if (!Array.isArray(input.creatives)) {
    issues.push("creatives must be an array.");
  }

  const adSets: AdsCampaignAdSetContract[] = [];
  if (Array.isArray(input.adSets)) {
    if (input.adSets.length > 32) {
      issues.push("adSets exceeds max length of 32.");
    }
    for (let i = 0; i < input.adSets.length; i++) {
      const parsed = parseAdsCampaignAdSetContract(input.adSets[i]);
      if (!parsed.ok) {
        issues.push(...parsed.issues.map((issue) => `adSets[${i}]: ${issue}`));
        continue;
      }
      if (
        typeof input.campaignRef === "string" &&
        parsed.adSet.campaignRef !== input.campaignRef.trim()
      ) {
        issues.push(`adSets[${i}]: campaignRef must match campaign.campaignRef.`);
        continue;
      }
      adSets.push(parsed.adSet);
    }
  }

  const creatives: AdsCampaignCreativeContract[] = [];
  if (Array.isArray(input.creatives)) {
    if (input.creatives.length > 64) {
      issues.push("creatives exceeds max length of 64.");
    }
    for (let i = 0; i < input.creatives.length; i++) {
      const parsed = parseAdsCampaignCreativeContract(input.creatives[i]);
      if (!parsed.ok) {
        issues.push(
          ...parsed.issues.map((issue) => `creatives[${i}]: ${issue}`)
        );
        continue;
      }
      creatives.push(parsed.creative);
    }
  }

  if (issues.length > 0 || !budget.ok || !schedule.ok) {
    return {
      ok: false,
      message: issues[0] ?? "Invalid campaign contract.",
      issues: Object.freeze(issues),
    };
  }

  return {
    ok: true,
    campaign: freezeCampaignManagementAuthority({
      contractVersion: ADS_CAMPAIGN_DOMAIN_CONTRACT_VERSION,
      campaignRef: String(input.campaignRef).trim(),
      advertiserAccountRef: String(input.advertiserAccountRef).trim(),
      name: String(input.name).trim(),
      objective: input.objective as CampaignObjective,
      lifecycleState: input.lifecycleState as AdsCampaignLifecycleState,
      budget: budget.budget,
      schedule: schedule.schedule,
      adSets: Object.freeze(adSets),
      creatives: Object.freeze(creatives),
      servingImpossible: true as const,
    }),
  };
}
