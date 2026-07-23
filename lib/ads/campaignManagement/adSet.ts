import { CAMPAIGN_OBJECTIVES, type CampaignObjective } from "../constants";
import { freezeCampaignManagementAuthority } from "./authority";
import {
  parseAdsCampaignBudgetModel,
  type AdsCampaignBudgetModel,
} from "./budget";
import {
  parseAdsCampaignScheduleModel,
  type AdsCampaignScheduleModel,
} from "./schedule";
import {
  parseAdsCampaignPlacementConfiguration,
  parseAdsCampaignTargetingModel,
  type AdsCampaignTargetingModel,
} from "./targeting";

/**
 * Ad Set foundation contracts for Campaign Management V1.
 * No runtime serving.
 */

export const ADS_CAMPAIGN_AD_SET_CONTRACT_VERSION = "v1" as const;

export type AdsCampaignAdSetContract = Readonly<{
  contractVersion: typeof ADS_CAMPAIGN_AD_SET_CONTRACT_VERSION;
  adSetRef: string;
  campaignRef: string;
  name: string;
  budget: AdsCampaignBudgetModel;
  schedule: AdsCampaignScheduleModel;
  placements: readonly string[];
  targeting: AdsCampaignTargetingModel;
  optimizationObjective: CampaignObjective;
  productionEnabled: false;
  deliveryEnabled: false;
  billingEnabled: false;
  productionAccepted: false;
  authoritativeProductionServing: false;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const REF_RE = /^[A-Za-z0-9_.:-]{1,128}$/;

export function parseAdsCampaignAdSetContract(
  input: unknown
):
  | { ok: true; adSet: AdsCampaignAdSetContract }
  | { ok: false; message: string; issues: readonly string[] } {
  if (!isRecord(input)) {
    return {
      ok: false,
      message: "Ad set contract must be an object.",
      issues: Object.freeze(["Ad set contract must be an object."]),
    };
  }
  const issues: string[] = [];
  if (
    input.contractVersion != null &&
    input.contractVersion !== ADS_CAMPAIGN_AD_SET_CONTRACT_VERSION
  ) {
    issues.push(
      `contractVersion must be "${ADS_CAMPAIGN_AD_SET_CONTRACT_VERSION}".`
    );
  }
  if (typeof input.adSetRef !== "string" || !REF_RE.test(input.adSetRef.trim())) {
    issues.push("adSetRef must be 1–128 chars of [A-Za-z0-9_.:-].");
  }
  if (
    typeof input.campaignRef !== "string" ||
    !REF_RE.test(input.campaignRef.trim())
  ) {
    issues.push("campaignRef must be 1–128 chars of [A-Za-z0-9_.:-].");
  }
  if (
    typeof input.name !== "string" ||
    input.name.trim().length < 2 ||
    input.name.trim().length > 120
  ) {
    issues.push("name must be 2–120 characters.");
  }
  if (
    typeof input.optimizationObjective !== "string" ||
    !(CAMPAIGN_OBJECTIVES as readonly string[]).includes(
      input.optimizationObjective
    )
  ) {
    issues.push("optimizationObjective is invalid.");
  }

  const budget = parseAdsCampaignBudgetModel(input.budget);
  if (!budget.ok) {
    issues.push(...budget.issues.map((i) => `budget: ${i}`));
  }
  const schedule = parseAdsCampaignScheduleModel(input.schedule);
  if (!schedule.ok) {
    issues.push(...schedule.issues.map((i) => `schedule: ${i}`));
  }
  const placements = parseAdsCampaignPlacementConfiguration(input.placements);
  if (!placements.ok) {
    issues.push(...placements.issues.map((i) => `placements: ${i}`));
  }
  const targeting = parseAdsCampaignTargetingModel(input.targeting);
  if (!targeting.ok) {
    issues.push(...targeting.issues.map((i) => `targeting: ${i}`));
  }

  if (
    issues.length > 0 ||
    !budget.ok ||
    !schedule.ok ||
    !placements.ok ||
    !targeting.ok
  ) {
    return {
      ok: false,
      message: issues[0] ?? "Invalid ad set contract.",
      issues: Object.freeze(issues),
    };
  }

  return {
    ok: true,
    adSet: freezeCampaignManagementAuthority({
      contractVersion: ADS_CAMPAIGN_AD_SET_CONTRACT_VERSION,
      adSetRef: String(input.adSetRef).trim(),
      campaignRef: String(input.campaignRef).trim(),
      name: String(input.name).trim(),
      budget: budget.budget,
      schedule: schedule.schedule,
      placements: placements.placements,
      targeting: targeting.targeting,
      optimizationObjective: input.optimizationObjective as CampaignObjective,
    }),
  };
}
