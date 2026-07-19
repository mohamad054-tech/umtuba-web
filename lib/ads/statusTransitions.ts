import type {
  AdvertiserAccountStatus,
  CampaignStatus,
  CreativeStatus,
} from "./types";

const ADVERTISER_TRANSITIONS: Record<
  AdvertiserAccountStatus,
  AdvertiserAccountStatus[]
> = {
  draft: ["pending_review"],
  pending_review: ["approved", "rejected", "suspended"],
  approved: ["suspended"],
  rejected: ["pending_review", "draft"],
  suspended: ["approved", "rejected"],
};

const CAMPAIGN_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  draft: ["pending_review", "archived"],
  pending_review: ["approved", "rejected", "suspended"],
  approved: ["active", "paused", "archived", "suspended"],
  rejected: ["draft", "pending_review", "archived"],
  paused: ["active", "archived", "suspended", "completed"],
  active: ["paused", "completed", "suspended"],
  completed: ["archived"],
  suspended: ["paused", "archived"],
  archived: [],
};

const CREATIVE_TRANSITIONS: Record<CreativeStatus, CreativeStatus[]> = {
  draft: ["pending_review"],
  pending_review: ["approved", "rejected", "suspended"],
  approved: ["suspended"],
  rejected: ["draft", "pending_review"],
  suspended: ["draft"],
};

export function canTransitionAdvertiser(
  from: AdvertiserAccountStatus,
  to: AdvertiserAccountStatus
): boolean {
  return ADVERTISER_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canTransitionCampaign(
  from: CampaignStatus,
  to: CampaignStatus
): boolean {
  return CAMPAIGN_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canTransitionCreative(
  from: CreativeStatus,
  to: CreativeStatus
): boolean {
  return CREATIVE_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Campaign may become active only when advertiser + campaign + creative
 * are approved and budgets/dates are present. Delivery remains off in V1.
 */
export function canActivateCampaign(input: {
  advertiserStatus: AdvertiserAccountStatus;
  campaignStatus: CampaignStatus;
  hasApprovedCreative: boolean;
  hasValidBudget: boolean;
  hasValidDates: boolean;
}): { ok: true } | { ok: false; message: string } {
  if (input.advertiserStatus !== "approved") {
    return { ok: false, message: "Advertiser account must be approved." };
  }
  if (input.campaignStatus !== "approved" && input.campaignStatus !== "paused") {
    return { ok: false, message: "Campaign must be approved before activation." };
  }
  if (!input.hasApprovedCreative) {
    return { ok: false, message: "At least one approved creative is required." };
  }
  if (!input.hasValidBudget) {
    return { ok: false, message: "Campaign budget is incomplete." };
  }
  if (!input.hasValidDates) {
    return { ok: false, message: "Campaign schedule is invalid." };
  }
  return { ok: true };
}

/** Approved creatives are immutable in V1 — reopen via draft revision. */
export function canEditCreative(status: CreativeStatus): boolean {
  return status === "draft" || status === "rejected";
}
