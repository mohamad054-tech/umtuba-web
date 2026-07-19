import type { SupabaseClient } from "@supabase/supabase-js";
import { CAMPAIGN_OBJECTIVES, type CampaignObjective } from "./constants";
import { ADS_ERRORS, adsUserMessage } from "./errors";
import type { AdCampaign } from "./types";
import {
  validateCampaignBudget,
  validateCampaignDates,
} from "./validation";

type AnyClient = SupabaseClient;

export function mapCampaign(row: Record<string, unknown>): AdCampaign {
  return {
    id: String(row.id),
    advertiserAccountId: String(row.advertiser_account_id),
    name: String(row.name),
    objective: row.objective as CampaignObjective,
    status: row.status as AdCampaign["status"],
    startAt: (row.start_at as string | null) ?? null,
    endAt: (row.end_at as string | null) ?? null,
    dailyBudgetMinor:
      row.daily_budget_minor == null ? null : Number(row.daily_budget_minor),
    totalBudgetMinor:
      row.total_budget_minor == null ? null : Number(row.total_budget_minor),
    currencyCode: String(row.currency_code),
    spentMinor: Number(row.spent_minor ?? 0),
    createdBy: String(row.created_by),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export type CreateCampaignInput = {
  advertiserAccountId: string;
  name: string;
  objective: string;
  startAt?: string | null;
  endAt?: string | null;
  dailyBudgetMinor?: unknown;
  totalBudgetMinor?: unknown;
  currencyCode?: string;
};

export async function createCampaign(
  supabase: AnyClient,
  userId: string,
  input: CreateCampaignInput
): Promise<{ ok: true; campaign: AdCampaign } | { ok: false; message: string }> {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 120) {
    return { ok: false, message: "Campaign name must be 2–120 characters." };
  }
  if (!(CAMPAIGN_OBJECTIVES as readonly string[]).includes(input.objective)) {
    return { ok: false, message: "Campaign objective is invalid." };
  }

  const budget = validateCampaignBudget({
    dailyBudgetMinor: input.dailyBudgetMinor,
    totalBudgetMinor: input.totalBudgetMinor,
    currencyCode: input.currencyCode ?? "USD",
  });
  if (!budget.ok) return budget;

  const dates = validateCampaignDates(input.startAt, input.endAt);
  if (!dates.ok) return dates;

  const { data, error } = await supabase
    .from("ad_campaigns")
    .insert({
      advertiser_account_id: input.advertiserAccountId,
      name,
      objective: input.objective,
      status: "draft",
      start_at: input.startAt?.trim() || null,
      end_at: input.endAt?.trim() || null,
      daily_budget_minor: budget.daily,
      total_budget_minor: budget.total,
      currency_code: budget.currency,
      created_by: userId,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("createCampaign", error);
    return {
      ok: false,
      message: adsUserMessage(error?.message, ADS_ERRORS.saveFailed),
    };
  }

  return { ok: true, campaign: mapCampaign(data as Record<string, unknown>) };
}

export type UpdateCampaignInput = {
  name?: string;
  objective?: string;
  startAt?: string | null;
  endAt?: string | null;
  dailyBudgetMinor?: unknown;
  totalBudgetMinor?: unknown;
  currencyCode?: string;
};

export async function updateCampaign(
  supabase: AnyClient,
  campaignId: string,
  input: UpdateCampaignInput
): Promise<{ ok: true; campaign: AdCampaign } | { ok: false; message: string }> {
  const { data: existing, error: loadErr } = await supabase
    .from("ad_campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();

  if (loadErr || !existing) {
    return { ok: false, message: ADS_ERRORS.campaignNotFound };
  }

  if (existing.status !== "draft" && existing.status !== "rejected") {
    return {
      ok: false,
      message: "Only draft or rejected campaigns can be edited.",
    };
  }

  const patch: Record<string, unknown> = {};

  if (input.name != null) {
    const name = input.name.trim();
    if (name.length < 2 || name.length > 120) {
      return { ok: false, message: "Campaign name must be 2–120 characters." };
    }
    patch.name = name;
  }

  if (input.objective != null) {
    if (!(CAMPAIGN_OBJECTIVES as readonly string[]).includes(input.objective)) {
      return { ok: false, message: "Campaign objective is invalid." };
    }
    patch.objective = input.objective;
  }

  const startAt =
    input.startAt !== undefined
      ? input.startAt?.trim() || null
      : (existing.start_at as string | null);
  const endAt =
    input.endAt !== undefined
      ? input.endAt?.trim() || null
      : (existing.end_at as string | null);
  const dates = validateCampaignDates(startAt, endAt);
  if (!dates.ok) return dates;
  if (input.startAt !== undefined) patch.start_at = startAt;
  if (input.endAt !== undefined) patch.end_at = endAt;

  if (
    input.dailyBudgetMinor !== undefined ||
    input.totalBudgetMinor !== undefined ||
    input.currencyCode !== undefined
  ) {
    const budget = validateCampaignBudget({
      dailyBudgetMinor:
        input.dailyBudgetMinor !== undefined
          ? input.dailyBudgetMinor
          : existing.daily_budget_minor,
      totalBudgetMinor:
        input.totalBudgetMinor !== undefined
          ? input.totalBudgetMinor
          : existing.total_budget_minor,
      currencyCode:
        input.currencyCode ?? String(existing.currency_code ?? "USD"),
    });
    if (!budget.ok) return budget;
    patch.daily_budget_minor = budget.daily;
    patch.total_budget_minor = budget.total;
    patch.currency_code = budget.currency;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: true, campaign: mapCampaign(existing as Record<string, unknown>) };
  }

  const { data, error } = await supabase
    .from("ad_campaigns")
    .update(patch)
    .eq("id", campaignId)
    .select("*")
    .single();

  if (error || !data) {
    console.error("updateCampaign", error);
    return {
      ok: false,
      message: adsUserMessage(error?.message, ADS_ERRORS.saveFailed),
    };
  }

  return { ok: true, campaign: mapCampaign(data as Record<string, unknown>) };
}

export async function submitCampaignForReview(
  supabase: AnyClient,
  campaignId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.rpc("submit_campaign_for_review", {
    p_campaign_id: campaignId,
  });
  if (error) {
    console.error("submitCampaignForReview", error);
    return {
      ok: false,
      message: adsUserMessage(error.message, ADS_ERRORS.submitFailed),
    };
  }
  return { ok: true };
}

export async function pauseCampaign(
  supabase: AnyClient,
  campaignId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.rpc("pause_ad_campaign", {
    p_campaign_id: campaignId,
  });
  if (error) {
    console.error("pauseCampaign", error);
    return {
      ok: false,
      message: adsUserMessage(error.message, ADS_ERRORS.saveFailed),
    };
  }
  return { ok: true };
}

export async function archiveCampaign(
  supabase: AnyClient,
  campaignId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.rpc("archive_ad_campaign", {
    p_campaign_id: campaignId,
  });
  if (error) {
    console.error("archiveCampaign", error);
    return {
      ok: false,
      message: adsUserMessage(error.message, ADS_ERRORS.saveFailed),
    };
  }
  return { ok: true };
}

export async function listCampaigns(
  supabase: AnyClient,
  advertiserAccountId: string
): Promise<{ ok: true; campaigns: AdCampaign[] } | { ok: false; message: string }> {
  const { data, error } = await supabase
    .from("ad_campaigns")
    .select("*")
    .eq("advertiser_account_id", advertiserAccountId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listCampaigns", error);
    return { ok: false, message: ADS_ERRORS.loadFailed };
  }

  return {
    ok: true,
    campaigns: (data ?? []).map((row) =>
      mapCampaign(row as Record<string, unknown>)
    ),
  };
}

export async function getCampaign(
  supabase: AnyClient,
  campaignId: string
): Promise<{ ok: true; campaign: AdCampaign } | { ok: false; message: string }> {
  const { data, error } = await supabase
    .from("ad_campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();

  if (error) {
    console.error("getCampaign", error);
    return { ok: false, message: ADS_ERRORS.loadFailed };
  }
  if (!data) return { ok: false, message: ADS_ERRORS.campaignNotFound };

  return { ok: true, campaign: mapCampaign(data as Record<string, unknown>) };
}
