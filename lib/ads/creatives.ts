import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AD_CREATIVES_BUCKET,
  CTA_TYPES,
  CREATIVE_TYPES,
  type CallToAction,
  type CreativeType,
} from "./constants";
import { ADS_ERRORS, adsUserMessage } from "./errors";
import { canEditCreative } from "./statusTransitions";
import type { AdCreative, CreativeStatus } from "./types";
import {
  validateCreativeFile,
  validateCreativeMediaPath,
  validateDestinationUrl,
} from "./validation";

type AnyClient = SupabaseClient;

export function mapCreative(row: Record<string, unknown>): AdCreative {
  return {
    id: String(row.id),
    advertiserAccountId: String(row.advertiser_account_id),
    campaignId: (row.campaign_id as string | null) ?? null,
    adSetId: (row.ad_set_id as string | null) ?? null,
    creativeType: row.creative_type as CreativeType,
    headline: String(row.headline),
    bodyText: (row.body_text as string | null) ?? null,
    callToAction: row.call_to_action as CallToAction,
    destinationUrl: String(row.destination_url),
    mediaPath: String(row.media_path),
    thumbnailPath: (row.thumbnail_path as string | null) ?? null,
    status: row.status as CreativeStatus,
    moderationNotes: (row.moderation_notes as string | null) ?? null,
    createdBy: String(row.created_by),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export type CreateCreativeInput = {
  advertiserAccountId: string;
  campaignId?: string | null;
  adSetId?: string | null;
  creativeType: string;
  headline: string;
  bodyText?: string | null;
  callToAction?: string;
  destinationUrl: string;
  mediaPath: string;
  thumbnailPath?: string | null;
  mimeType: string;
  byteSize: number;
};

export async function createCreative(
  supabase: AnyClient,
  userId: string,
  input: CreateCreativeInput
): Promise<{ ok: true; creative: AdCreative } | { ok: false; message: string }> {
  if (!(CREATIVE_TYPES as readonly string[]).includes(input.creativeType)) {
    return { ok: false, message: "Creative type is invalid." };
  }
  const headline = input.headline.trim();
  if (headline.length < 1 || headline.length > 80) {
    return { ok: false, message: "Headline must be 1–80 characters." };
  }
  const bodyText = input.bodyText?.trim() || null;
  if (bodyText && bodyText.length > 500) {
    return { ok: false, message: "Body text must be at most 500 characters." };
  }
  const cta = input.callToAction ?? "learn_more";
  if (!(CTA_TYPES as readonly string[]).includes(cta)) {
    return { ok: false, message: "Call to action is invalid." };
  }

  const url = validateDestinationUrl(input.destinationUrl);
  if (!url.ok) return url;

  const fileOk = validateCreativeFile({
    mimeType: input.mimeType,
    byteSize: input.byteSize,
  });
  if (!fileOk.ok) return fileOk;

  if (
    !validateCreativeMediaPath(
      input.advertiserAccountId,
      userId,
      input.mediaPath
    )
  ) {
    return { ok: false, message: "Media path is not owned by this advertiser." };
  }

  if (
    input.thumbnailPath &&
    !validateCreativeMediaPath(
      input.advertiserAccountId,
      userId,
      input.thumbnailPath
    )
  ) {
    return {
      ok: false,
      message: "Thumbnail path is not owned by this advertiser.",
    };
  }

  const { data, error } = await supabase
    .from("ad_creatives")
    .insert({
      advertiser_account_id: input.advertiserAccountId,
      campaign_id: input.campaignId ?? null,
      ad_set_id: input.adSetId ?? null,
      creative_type: input.creativeType,
      headline,
      body_text: bodyText,
      call_to_action: cta,
      destination_url: url.url,
      media_path: input.mediaPath.trim(),
      thumbnail_path: input.thumbnailPath?.trim() || null,
      status: "draft",
      created_by: userId,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("createCreative", error);
    return {
      ok: false,
      message: adsUserMessage(error?.message, ADS_ERRORS.saveFailed),
    };
  }

  return { ok: true, creative: mapCreative(data as Record<string, unknown>) };
}

export type UpdateCreativeInput = {
  headline?: string;
  bodyText?: string | null;
  callToAction?: string;
  destinationUrl?: string;
  mediaPath?: string;
  thumbnailPath?: string | null;
  creativeType?: string;
  mimeType?: string;
  byteSize?: number;
};

export async function updateCreative(
  supabase: AnyClient,
  userId: string,
  creativeId: string,
  input: UpdateCreativeInput
): Promise<{ ok: true; creative: AdCreative } | { ok: false; message: string }> {
  const { data: existing, error: loadErr } = await supabase
    .from("ad_creatives")
    .select("*")
    .eq("id", creativeId)
    .maybeSingle();

  if (loadErr || !existing) {
    return { ok: false, message: ADS_ERRORS.creativeNotFound };
  }

  if (!canEditCreative(existing.status as CreativeStatus)) {
    return {
      ok: false,
      message:
        "Approved creatives cannot be edited. Create a new draft revision instead.",
    };
  }

  const patch: Record<string, unknown> = {};

  if (input.headline != null) {
    const headline = input.headline.trim();
    if (headline.length < 1 || headline.length > 80) {
      return { ok: false, message: "Headline must be 1–80 characters." };
    }
    patch.headline = headline;
  }

  if (input.bodyText !== undefined) {
    const bodyText = input.bodyText?.trim() || null;
    if (bodyText && bodyText.length > 500) {
      return { ok: false, message: "Body text must be at most 500 characters." };
    }
    patch.body_text = bodyText;
  }

  if (input.callToAction != null) {
    if (!(CTA_TYPES as readonly string[]).includes(input.callToAction)) {
      return { ok: false, message: "Call to action is invalid." };
    }
    patch.call_to_action = input.callToAction;
  }

  if (input.creativeType != null) {
    if (!(CREATIVE_TYPES as readonly string[]).includes(input.creativeType)) {
      return { ok: false, message: "Creative type is invalid." };
    }
    patch.creative_type = input.creativeType;
  }

  if (input.destinationUrl != null) {
    const url = validateDestinationUrl(input.destinationUrl);
    if (!url.ok) return url;
    patch.destination_url = url.url;
  }

  if (input.mediaPath != null) {
    if (input.mimeType == null || input.byteSize == null) {
      return { ok: false, message: "Media file metadata is required." };
    }
    const fileOk = validateCreativeFile({
      mimeType: input.mimeType,
      byteSize: input.byteSize,
    });
    if (!fileOk.ok) return fileOk;
    if (
      !validateCreativeMediaPath(
        String(existing.advertiser_account_id),
        userId,
        input.mediaPath
      )
    ) {
      return {
        ok: false,
        message: "Media path is not owned by this advertiser.",
      };
    }
    patch.media_path = input.mediaPath.trim();
  }

  if (input.thumbnailPath !== undefined) {
    if (
      input.thumbnailPath &&
      !validateCreativeMediaPath(
        String(existing.advertiser_account_id),
        userId,
        input.thumbnailPath
      )
    ) {
      return {
        ok: false,
        message: "Thumbnail path is not owned by this advertiser.",
      };
    }
    patch.thumbnail_path = input.thumbnailPath?.trim() || null;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: true, creative: mapCreative(existing as Record<string, unknown>) };
  }

  const { data, error } = await supabase
    .from("ad_creatives")
    .update(patch)
    .eq("id", creativeId)
    .select("*")
    .single();

  if (error || !data) {
    console.error("updateCreative", error);
    return {
      ok: false,
      message: adsUserMessage(error?.message, ADS_ERRORS.saveFailed),
    };
  }

  return { ok: true, creative: mapCreative(data as Record<string, unknown>) };
}

export async function submitCreativeForReview(
  supabase: AnyClient,
  creativeId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.rpc("submit_creative_for_review", {
    p_creative_id: creativeId,
  });
  if (error) {
    console.error("submitCreativeForReview", error);
    return {
      ok: false,
      message: adsUserMessage(error.message, ADS_ERRORS.submitFailed),
    };
  }
  return { ok: true };
}

export async function deleteDraftCreative(
  supabase: AnyClient,
  creativeId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: existing, error: loadErr } = await supabase
    .from("ad_creatives")
    .select("status, media_path")
    .eq("id", creativeId)
    .maybeSingle();

  if (loadErr || !existing) {
    return { ok: false, message: ADS_ERRORS.creativeNotFound };
  }
  if (existing.status !== "draft") {
    return { ok: false, message: "Only draft creatives can be deleted." };
  }

  const { error } = await supabase
    .from("ad_creatives")
    .delete()
    .eq("id", creativeId)
    .eq("status", "draft");

  if (error) {
    console.error("deleteDraftCreative", error);
    return {
      ok: false,
      message: adsUserMessage(error.message, ADS_ERRORS.saveFailed),
    };
  }

  // Best-effort storage cleanup; RLS enforces ownership.
  if (existing.media_path) {
    await supabase.storage
      .from(AD_CREATIVES_BUCKET)
      .remove([String(existing.media_path)]);
  }

  return { ok: true };
}

export async function listCreativesForCampaign(
  supabase: AnyClient,
  campaignId: string
): Promise<{ ok: true; creatives: AdCreative[] } | { ok: false; message: string }> {
  const { data, error } = await supabase
    .from("ad_creatives")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listCreativesForCampaign", error);
    return { ok: false, message: ADS_ERRORS.loadFailed };
  }

  return {
    ok: true,
    creatives: (data ?? []).map((row) =>
      mapCreative(row as Record<string, unknown>)
    ),
  };
}

export function buildCreativeObjectPath(
  advertiserAccountId: string,
  userId: string,
  fileId: string
): string {
  return `${advertiserAccountId}/${userId}/${fileId}`;
}
