import type { SupabaseClient } from "@supabase/supabase-js";
import { AD_CREATIVES_BUCKET } from "./constants";
import { ADS_ERRORS } from "./errors";
import type {
  AdvertiserAccountStatus,
  CampaignStatus,
  CreativeStatus,
} from "./types";

type AnyClient = SupabaseClient;

export type AdminAdvertiserRow = {
  id: string;
  owner_id: string;
  business_name: string;
  legal_name: string | null;
  contact_email: string;
  contact_phone: string | null;
  website_url: string | null;
  country_code: string;
  status: AdvertiserAccountStatus;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminCampaignRow = {
  id: string;
  advertiser_account_id: string;
  business_name: string;
  name: string;
  objective: string;
  status: CampaignStatus;
  start_at: string | null;
  end_at: string | null;
  daily_budget_minor: number | null;
  total_budget_minor: number | null;
  currency_code: string;
  spent_minor: number;
  created_at: string;
  updated_at: string;
};

export type AdminCreativeRow = {
  id: string;
  advertiser_account_id: string;
  business_name: string;
  campaign_id: string | null;
  campaign_name: string | null;
  creative_type: string;
  headline: string;
  body_text: string | null;
  call_to_action: string;
  destination_url: string;
  media_path: string;
  thumbnail_path: string | null;
  status: CreativeStatus;
  moderation_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminReviewEventRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  reviewer_id: string | null;
  actor_id: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AdminQueueCounts = {
  advertisers_pending: number;
  campaigns_pending: number;
  creatives_pending: number;
  advertisers_suspended: number;
  campaigns_suspended: number;
};

export async function adminListAdvertisers(
  supabase: AnyClient,
  filters: {
    status?: string | null;
    country?: string | null;
    query?: string | null;
  }
): Promise<
  | { ok: true; rows: AdminAdvertiserRow[] }
  | { ok: false; message: string }
> {
  const { data, error } = await supabase.rpc("admin_list_advertiser_accounts", {
    p_status: filters.status || null,
    p_country: filters.country || null,
    p_query: filters.query || null,
    p_limit: 50,
    p_offset: 0,
  });
  if (error) {
    console.error("adminListAdvertisers", error);
    return { ok: false, message: ADS_ERRORS.loadFailed };
  }
  return { ok: true, rows: (data ?? []) as AdminAdvertiserRow[] };
}

export async function adminGetAdvertiser(
  supabase: AnyClient,
  accountId: string
): Promise<
  | { ok: true; account: AdminAdvertiserRow }
  | { ok: false; message: string }
> {
  const { data, error } = await supabase.rpc("admin_get_advertiser_account", {
    p_account_id: accountId,
  });
  if (error || !data?.[0]) {
    console.error("adminGetAdvertiser", error);
    return { ok: false, message: ADS_ERRORS.accountNotFound };
  }
  return { ok: true, account: data[0] as AdminAdvertiserRow };
}

export async function adminListCampaigns(
  supabase: AnyClient,
  filters: {
    status?: string | null;
    objective?: string | null;
    query?: string | null;
  }
): Promise<
  | { ok: true; rows: AdminCampaignRow[] }
  | { ok: false; message: string }
> {
  const { data, error } = await supabase.rpc("admin_list_ad_campaigns", {
    p_status: filters.status || null,
    p_objective: filters.objective || null,
    p_query: filters.query || null,
    p_limit: 50,
    p_offset: 0,
  });
  if (error) {
    console.error("adminListCampaigns", error);
    return { ok: false, message: ADS_ERRORS.loadFailed };
  }
  return { ok: true, rows: (data ?? []) as AdminCampaignRow[] };
}

export async function adminGetCampaignWorkspace(
  supabase: AnyClient,
  campaignId: string
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc("admin_get_ad_campaign", {
    p_campaign_id: campaignId,
  });
  if (error || !data) {
    console.error("adminGetCampaignWorkspace", error);
    return { ok: false, message: ADS_ERRORS.campaignNotFound };
  }
  return { ok: true, data: data as Record<string, unknown> };
}

export async function adminListCreatives(
  supabase: AnyClient,
  filters: { status?: string | null; query?: string | null }
): Promise<
  | { ok: true; rows: AdminCreativeRow[] }
  | { ok: false; message: string }
> {
  const { data, error } = await supabase.rpc("admin_list_ad_creatives", {
    p_status: filters.status || null,
    p_query: filters.query || null,
    p_limit: 50,
    p_offset: 0,
  });
  if (error) {
    console.error("adminListCreatives", error);
    return { ok: false, message: ADS_ERRORS.loadFailed };
  }
  return { ok: true, rows: (data ?? []) as AdminCreativeRow[] };
}

export async function adminGetCreativeWorkspace(
  supabase: AnyClient,
  creativeId: string
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc("admin_get_ad_creative", {
    p_creative_id: creativeId,
  });
  if (error || !data) {
    console.error("adminGetCreativeWorkspace", error);
    return { ok: false, message: ADS_ERRORS.creativeNotFound };
  }
  return { ok: true, data: data as Record<string, unknown> };
}

export async function adminListReviewEvents(
  supabase: AnyClient,
  filters: {
    entityType?: string | null;
    entityId?: string | null;
    reviewerId?: string | null;
    action?: string | null;
  }
): Promise<
  | { ok: true; rows: AdminReviewEventRow[] }
  | { ok: false; message: string }
> {
  const { data, error } = await supabase.rpc("admin_list_review_events", {
    p_entity_type: filters.entityType || null,
    p_entity_id: filters.entityId || null,
    p_reviewer_id: filters.reviewerId || null,
    p_action: filters.action || null,
    p_limit: 50,
    p_offset: 0,
  });
  if (error) {
    console.error("adminListReviewEvents", error);
    return { ok: false, message: ADS_ERRORS.loadFailed };
  }
  return { ok: true, rows: (data ?? []) as AdminReviewEventRow[] };
}

export async function adminQueueCounts(
  supabase: AnyClient
): Promise<
  | { ok: true; counts: AdminQueueCounts }
  | { ok: false; message: string }
> {
  const { data, error } = await supabase.rpc("admin_review_queue_counts");
  if (error || !data) {
    console.error("adminQueueCounts", error);
    return { ok: false, message: ADS_ERRORS.loadFailed };
  }
  return { ok: true, counts: data as AdminQueueCounts };
}

export async function adminSignedCreativeUrl(
  supabase: AnyClient,
  mediaPath: string
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  if (!mediaPath || mediaPath.includes("..") || mediaPath.includes(" ")) {
    return { ok: false, message: ADS_ERRORS.notAuthorized };
  }
  // Storage policy also checks is_platform_admin(); fail closed in app layer.
  const { data: isAdmin, error: adminError } = await supabase.rpc(
    "is_platform_admin"
  );
  if (adminError || isAdmin !== true) {
    return { ok: false, message: ADS_ERRORS.notAuthorized };
  }
  const { data, error } = await supabase.storage
    .from(AD_CREATIVES_BUCKET)
    .createSignedUrl(mediaPath, 3600);
  if (error || !data?.signedUrl) {
    console.error("adminSignedCreativeUrl", error);
    return { ok: false, message: ADS_ERRORS.loadFailed };
  }
  return { ok: true, url: data.signedUrl };
}
