/**
 * Review / moderation contracts for Ads Platform Foundation V1.
 *
 * Advertiser-facing: submit_* RPCs only.
 * Admin approve/reject/suspend: service_role RPCs (backend only) — never
 * exposed in advertiser UI.
 */

import { canApproveAds, canWriteReviewEvents } from "./permissions";
import {
  canTransitionAdvertiser,
  canTransitionCampaign,
  canTransitionCreative,
} from "./statusTransitions";
import type {
  AdvertiserAccountStatus,
  CampaignStatus,
  CreativeStatus,
} from "./types";

export const PROHIBITED_CONTENT_POLICY_PLACEHOLDER = {
  version: "v1-placeholder",
  blocks: [
    "illegal_goods",
    "adult_sexual_content",
    "hate_or_harassment",
    "misleading_claims",
    "weapons_and_explosives",
    "tobacco_and_vaping_to_minors",
    "political_microtargeting",
    "health_claims_without_evidence",
  ],
  note: "AI moderation is not implemented in V1. Human review uses these labels.",
} as const;

export type ReviewEntityType =
  | "advertiser"
  | "campaign"
  | "creative"
  | "ad"
  | "ad_set";

export type ReviewAction =
  | "submitted"
  | "approved"
  | "rejected"
  | "suspended"
  | "restored";

/** Advertisers never self-approve. */
export function advertiserCanSelfApprove(): boolean {
  return canApproveAds("owner");
}

export function advertiserCanWriteReviewAudit(): boolean {
  return canWriteReviewEvents("owner");
}

export function assertSubmitTransition(
  entity: "advertiser" | "campaign" | "creative",
  from: AdvertiserAccountStatus | CampaignStatus | CreativeStatus
): { ok: true } | { ok: false; message: string } {
  if (entity === "advertiser") {
    if (!canTransitionAdvertiser(from as AdvertiserAccountStatus, "pending_review")) {
      return { ok: false, message: "Advertiser cannot be submitted from this status." };
    }
  } else if (entity === "campaign") {
    if (!canTransitionCampaign(from as CampaignStatus, "pending_review")) {
      return { ok: false, message: "Campaign cannot be submitted from this status." };
    }
  } else if (!canTransitionCreative(from as CreativeStatus, "pending_review")) {
    return { ok: false, message: "Creative cannot be submitted from this status." };
  }
  return { ok: true };
}

/**
 * Backend-only contract names (service_role). Documented for admin tooling.
 * Do not call from advertiser client code.
 */
/** Legacy automation RPCs (service_role only). Prefer PLATFORM_ADMIN_REVIEW_RPCS for UI. */
export const ADMIN_REVIEW_RPCS = [
  "approve_advertiser_account",
  "reject_advertiser_account",
  "suspend_advertiser_account",
  "approve_ad_campaign",
  "reject_ad_campaign",
  "approve_ad_creative",
  "reject_ad_creative",
] as const;

export {
  PLATFORM_ADMIN_REVIEW_RPCS,
  approveAdvertiser,
  rejectAdvertiser,
  suspendAdvertiser,
  restoreAdvertiser,
  approveCampaign,
  rejectCampaign,
  pauseCampaignAdmin,
  restoreCampaign,
  approveCreative,
  rejectCreative,
  suspendCreative,
  restoreCreative,
  resolveReviewerIdFromAuth,
} from "./adminReview";
