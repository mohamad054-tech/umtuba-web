import type { SupabaseClient } from "@supabase/supabase-js";
import { ADS_ERRORS, adsUserMessage } from "./errors";
import {
  canTransitionCampaign,
  canTransitionCreative,
} from "./statusTransitions";
import type {
  AdvertiserAccountStatus,
  CampaignStatus,
  CreativeStatus,
} from "./types";

type AnyClient = SupabaseClient;

export const PLATFORM_ADMIN_REVIEW_RPCS = [
  "admin_approve_advertiser_account",
  "admin_reject_advertiser_account",
  "admin_suspend_advertiser_account",
  "admin_restore_advertiser_account",
  "admin_approve_ad_campaign",
  "admin_reject_ad_campaign",
  "admin_pause_ad_campaign",
  "admin_restore_ad_campaign",
  "admin_approve_ad_creative",
  "admin_reject_ad_creative",
  "admin_suspend_ad_creative",
  "admin_restore_ad_creative",
] as const;

export type PlatformAdminReviewRpc = (typeof PLATFORM_ADMIN_REVIEW_RPCS)[number];

async function callAdminRpc(
  supabase: AnyClient,
  name: PlatformAdminReviewRpc,
  args: Record<string, unknown>
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.rpc(name, args);
  if (error) {
    console.error(name, error);
    return {
      ok: false,
      message: adsUserMessage(error.message, ADS_ERRORS.submitFailed),
    };
  }
  return { ok: true };
}

export function assertAdminAdvertiserAction(
  status: AdvertiserAccountStatus,
  action: "approve" | "reject" | "suspend" | "restore"
): { ok: true } | { ok: false; message: string } {
  if (action === "approve" || action === "reject") {
    if (status !== "pending_review") {
      return { ok: false, message: "Advertiser is not pending review." };
    }
    return { ok: true };
  }
  if (action === "suspend") {
    if (!["approved", "pending_review", "rejected"].includes(status)) {
      return { ok: false, message: "Advertiser cannot be suspended." };
    }
    return { ok: true };
  }
  if (status !== "suspended") {
    return { ok: false, message: "Only suspended advertisers can be restored." };
  }
  return { ok: true };
}

export function assertAdminCampaignAction(
  status: CampaignStatus,
  action: "approve" | "reject" | "pause" | "restore"
): { ok: true } | { ok: false; message: string } {
  if (action === "approve" || action === "reject") {
    if (status !== "pending_review") {
      return { ok: false, message: "Campaign is not pending review." };
    }
    return { ok: true };
  }
  if (action === "pause") {
    if (!canTransitionCampaign(status, "paused")) {
      return { ok: false, message: "Campaign cannot be paused." };
    }
    return { ok: true };
  }
  if (status !== "suspended") {
    return { ok: false, message: "Only suspended campaigns can be restored." };
  }
  return { ok: true };
}

export function assertAdminCreativeAction(
  status: CreativeStatus,
  action: "approve" | "reject" | "suspend" | "restore"
): { ok: true } | { ok: false; message: string } {
  if (action === "approve" || action === "reject") {
    if (status !== "pending_review") {
      return { ok: false, message: "Creative is not pending review." };
    }
    return { ok: true };
  }
  if (action === "suspend") {
    if (!canTransitionCreative(status, "suspended")) {
      return { ok: false, message: "Creative cannot be suspended." };
    }
    return { ok: true };
  }
  if (status !== "suspended") {
    return { ok: false, message: "Only suspended creatives can be restored." };
  }
  return { ok: true };
}

export async function approveAdvertiser(
  supabase: AnyClient,
  accountId: string
) {
  return callAdminRpc(supabase, "admin_approve_advertiser_account", {
    p_account_id: accountId,
  });
}

export async function rejectAdvertiser(
  supabase: AnyClient,
  accountId: string,
  note: string
) {
  return callAdminRpc(supabase, "admin_reject_advertiser_account", {
    p_account_id: accountId,
    p_note: note,
  });
}

export async function suspendAdvertiser(
  supabase: AnyClient,
  accountId: string,
  note?: string | null
) {
  return callAdminRpc(supabase, "admin_suspend_advertiser_account", {
    p_account_id: accountId,
    p_note: note ?? null,
  });
}

export async function restoreAdvertiser(
  supabase: AnyClient,
  accountId: string
) {
  return callAdminRpc(supabase, "admin_restore_advertiser_account", {
    p_account_id: accountId,
  });
}

export async function approveCampaign(supabase: AnyClient, campaignId: string) {
  return callAdminRpc(supabase, "admin_approve_ad_campaign", {
    p_campaign_id: campaignId,
  });
}

export async function rejectCampaign(
  supabase: AnyClient,
  campaignId: string,
  note: string
) {
  return callAdminRpc(supabase, "admin_reject_ad_campaign", {
    p_campaign_id: campaignId,
    p_note: note,
  });
}

export async function pauseCampaignAdmin(
  supabase: AnyClient,
  campaignId: string
) {
  return callAdminRpc(supabase, "admin_pause_ad_campaign", {
    p_campaign_id: campaignId,
  });
}

export async function restoreCampaign(
  supabase: AnyClient,
  campaignId: string
) {
  return callAdminRpc(supabase, "admin_restore_ad_campaign", {
    p_campaign_id: campaignId,
  });
}

export async function approveCreative(supabase: AnyClient, creativeId: string) {
  return callAdminRpc(supabase, "admin_approve_ad_creative", {
    p_creative_id: creativeId,
  });
}

export async function rejectCreative(
  supabase: AnyClient,
  creativeId: string,
  note: string
) {
  return callAdminRpc(supabase, "admin_reject_ad_creative", {
    p_creative_id: creativeId,
    p_note: note,
  });
}

export async function suspendCreative(
  supabase: AnyClient,
  creativeId: string,
  note?: string | null
) {
  return callAdminRpc(supabase, "admin_suspend_ad_creative", {
    p_creative_id: creativeId,
    p_note: note ?? null,
  });
}

export async function restoreCreative(
  supabase: AnyClient,
  creativeId: string
) {
  return callAdminRpc(supabase, "admin_restore_ad_creative", {
    p_creative_id: creativeId,
  });
}

/** Reviewer identity must never come from client form fields. */
export function resolveReviewerIdFromAuth(
  authUserId: string | null | undefined
): string | null {
  return authUserId?.trim() || null;
}
