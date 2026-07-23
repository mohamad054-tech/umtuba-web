import type { SupabaseClient } from "@supabase/supabase-js";
import { ADS_ERRORS, adsUserMessage } from "./errors";
import { isCreativeCompatible } from "./platform/creativePlacementCompatibility";
import {
  getCanonicalPlacement,
} from "./platform/taxonomyMapper";
import type {
  AdCreative,
  AdDeliverable,
  AdDeliverableStatus,
  AdSet,
  AdCampaign,
  AdvertiserAccountStatus,
  CampaignStatus,
  CreativeType,
} from "./types";
import { mapCreative } from "./creatives";
import { canActivateCampaign } from "./statusTransitions";

type AnyClient = SupabaseClient;

const BINDABLE_CAMPAIGN_STATUSES = new Set<CampaignStatus>([
  "draft",
  "approved",
  "active",
  "paused",
]);

const BINDABLE_AD_SET_STATUSES = new Set<CampaignStatus>([
  "draft",
  "approved",
  "active",
  "paused",
  "pending_review",
]);

const INVALID_BINDING_STATUSES = new Set<CampaignStatus>([
  "rejected",
  "suspended",
  "archived",
  "completed",
]);

export function mapDeliverable(row: Record<string, unknown>): AdDeliverable {
  return {
    id: String(row.id),
    adSetId: String(row.ad_set_id),
    creativeId: String(row.creative_id),
    name: String(row.name),
    status: row.status as AdDeliverableStatus,
    deliveryPriority: Number(row.delivery_priority ?? 100),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

/**
 * Domain placements permitted for deliverable binding.
 * Must stay aligned with `ads_deliverable_binding_placement_supported` in
 * `20260842_ads_deliverable_binding_database_authority_v1.sql`.
 */
export const ADS_DELIVERABLE_BINDING_SUPPORTED_PLACEMENTS = [
  "discover_feed",
  "watch_feed",
  "stories",
  "live_lobby",
  "search_results",
  "store_catalog",
  "profile_feed",
] as const;

/**
 * Domain placements that accept image (incl. story→image) but reject video.
 * Must stay aligned with SQL `ads_deliverable_binding_format_compatible`.
 */
export const ADS_DELIVERABLE_BINDING_IMAGE_ONLY_PLACEMENTS = [
  "search_results",
  "store_catalog",
] as const;

export type DeliverableBindingSelectionFormat = "image" | "video";

export function mapDomainCreativeTypeForPlacement(
  creativeType: CreativeType
): string | null {
  if (creativeType === "image" || creativeType === "story") return "image";
  if (creativeType === "video") return "video";
  if (creativeType === "native") return "brand";
  return null;
}

/**
 * Selection-eligible format for deliverable binding (image|video only).
 * story → image; native and unknown → null (fail closed).
 */
export function mapCreativeTypeForDeliverableBinding(
  creativeType: CreativeType | string
): DeliverableBindingSelectionFormat | null {
  if (creativeType === "image" || creativeType === "story") return "image";
  if (creativeType === "video") return "video";
  return null;
}

/**
 * Fail-closed placement ↔ selection-format matrix used by app + SQL authority.
 * Does not trust caller metadata — callers must pass DB-derived values.
 */
export function isDeliverableBindingPlacementFormatCompatible(
  placement: string,
  selectionFormat: DeliverableBindingSelectionFormat
): boolean {
  if (
    !(ADS_DELIVERABLE_BINDING_SUPPORTED_PLACEMENTS as readonly string[]).includes(
      placement
    )
  ) {
    return false;
  }
  if (selectionFormat === "image") return true;
  if (selectionFormat === "video") {
    return !(
      ADS_DELIVERABLE_BINDING_IMAGE_ONLY_PLACEMENTS as readonly string[]
    ).includes(placement);
  }
  return false;
}

/** Deterministic SQL/RPC compatibility rejection → user-facing message. */
export function mapBindDeliverableCompatibilityError(
  message: string | null | undefined
): string | null {
  if (!message) return null;
  if (/Ad set must include at least one placement/i.test(message)) {
    return "Ad set must include at least one placement.";
  }
  if (/Unsupported placement/i.test(message)) {
    const match = message.match(/Unsupported placement\s+"([^"]*)"/i);
    return match
      ? `Unsupported placement "${match[1]}".`
      : "Unsupported placement.";
  }
  if (
    /Creative format is not selection-eligible for diagnostic inventory/i.test(
      message
    ) ||
    /Creative format is not supported for binding/i.test(message)
  ) {
    return "Creative format is not selection-eligible for diagnostic inventory.";
  }
  if (/Creative format is incompatible with placement/i.test(message)) {
    const match = message.match(
      /Creative format is incompatible with placement\s+"([^"]*)"/i
    );
    return match
      ? `Creative format is incompatible with placement "${match[1]}".`
      : "Creative format is incompatible with placement.";
  }
  return null;
}

/**
 * Validates placement ↔ creative format using the binding matrix (app) and
 * platform compatibility gate (cross-check). Domain placements are DB values.
 */
export function validateDeliverablePlacementCompatibility(input: {
  placements: readonly string[];
  creativeType: CreativeType;
}): { ok: true; placements: string[] } | { ok: false; message: string } {
  if (input.placements.length === 0) {
    return { ok: false, message: "Ad set must include at least one placement." };
  }

  const selectionFormat = mapCreativeTypeForDeliverableBinding(
    input.creativeType
  );
  if (!selectionFormat) {
    return {
      ok: false,
      message:
        "Creative format is not selection-eligible for diagnostic inventory.",
    };
  }

  // Keep platform alias mapping available for inventory bridge consumers.
  const mappedCreative = mapDomainCreativeTypeForPlacement(input.creativeType);
  if (mappedCreative !== "image" && mappedCreative !== "video") {
    return {
      ok: false,
      message:
        "Creative format is not selection-eligible for diagnostic inventory.",
    };
  }

  const compatible: string[] = [];
  for (const placement of input.placements) {
    if (
      !(ADS_DELIVERABLE_BINDING_SUPPORTED_PLACEMENTS as readonly string[]).includes(
        placement
      )
    ) {
      return {
        ok: false,
        message: `Unsupported placement "${placement}".`,
      };
    }
    try {
      getCanonicalPlacement(placement);
    } catch {
      return {
        ok: false,
        message: `Unsupported placement "${placement}".`,
      };
    }
    if (
      !isDeliverableBindingPlacementFormatCompatible(placement, selectionFormat)
    ) {
      return {
        ok: false,
        message: `Creative format is incompatible with placement "${placement}".`,
      };
    }
    // Cross-check against platform gate — matrices must remain aligned.
    if (!isCreativeCompatible(placement, selectionFormat)) {
      return {
        ok: false,
        message: `Creative format is incompatible with placement "${placement}".`,
      };
    }
    compatible.push(placement);
  }

  return { ok: true, placements: compatible };
}

export function isDeliverableBindingStatusEligible(
  status: AdDeliverableStatus
): boolean {
  return status === "approved" || status === "active";
}

export function countValidDeliverableBindings(
  bindings: readonly AdDeliverable[]
): number {
  return bindings.filter((binding) =>
    isDeliverableBindingStatusEligible(binding.status)
  ).length;
}

export type BindDeliverableInput = {
  campaignId: string;
  adSetId: string;
  creativeId: string;
  name?: string;
};

/**
 * Creates or returns an existing creative↔ad_set deliverable binding.
 * Idempotent on (ad_set_id, creative_id). Never enables delivery/billing.
 */
export async function bindDeliverable(
  supabase: AnyClient,
  input: BindDeliverableInput
): Promise<
  | { ok: true; binding: AdDeliverable; created: boolean }
  | { ok: false; message: string }
> {
  const { data: campaign, error: campaignErr } = await supabase
    .from("ad_campaigns")
    .select("*")
    .eq("id", input.campaignId)
    .maybeSingle();
  if (campaignErr || !campaign) {
    return { ok: false, message: ADS_ERRORS.campaignNotFound };
  }

  const campaignStatus = campaign.status as CampaignStatus;
  if (
    INVALID_BINDING_STATUSES.has(campaignStatus) ||
    !BINDABLE_CAMPAIGN_STATUSES.has(campaignStatus)
  ) {
    return {
      ok: false,
      message: "Campaign status is not valid for deliverable binding.",
    };
  }

  const { data: adSet, error: adSetErr } = await supabase
    .from("ad_sets")
    .select("*")
    .eq("id", input.adSetId)
    .maybeSingle();
  if (adSetErr || !adSet) {
    return { ok: false, message: ADS_ERRORS.adSetNotFound };
  }
  if (String(adSet.campaign_id) !== input.campaignId) {
    return { ok: false, message: "Ad set does not belong to this campaign." };
  }
  const adSetStatus = adSet.status as CampaignStatus;
  if (
    INVALID_BINDING_STATUSES.has(adSetStatus) ||
    !BINDABLE_AD_SET_STATUSES.has(adSetStatus)
  ) {
    return {
      ok: false,
      message: "Ad set status is not valid for deliverable binding.",
    };
  }

  const { data: creativeRow, error: creativeErr } = await supabase
    .from("ad_creatives")
    .select("*")
    .eq("id", input.creativeId)
    .maybeSingle();
  if (creativeErr || !creativeRow) {
    return { ok: false, message: ADS_ERRORS.creativeNotFound };
  }
  const creative = mapCreative(creativeRow as Record<string, unknown>);

  if (creative.advertiserAccountId !== String(campaign.advertiser_account_id)) {
    return {
      ok: false,
      message: "Creative does not belong to this advertiser account.",
    };
  }
  if (creative.campaignId && creative.campaignId !== input.campaignId) {
    return {
      ok: false,
      message: "Creative is bound to a different campaign.",
    };
  }
  if (creative.adSetId && creative.adSetId !== input.adSetId) {
    return {
      ok: false,
      message: "Creative is bound to a different ad set.",
    };
  }
  if (creative.status !== "approved") {
    return {
      ok: false,
      message: "Only approved creatives can be bound.",
    };
  }

  const placements = Array.isArray(adSet.placements)
    ? (adSet.placements as string[])
    : [];
  const placementCheck = validateDeliverablePlacementCompatibility({
    placements,
    creativeType: creative.creativeType,
  });
  if (!placementCheck.ok) return placementCheck;

  const name =
    input.name?.trim() ||
    `${creative.headline.slice(0, 80)} · binding`.slice(0, 120);
  if (name.length < 2) {
    return { ok: false, message: "Binding name must be at least 2 characters." };
  }

  // Database SECURITY DEFINER RPC is final authority for ownership,
  // moderation, uniqueness, and concurrent idempotency.
  const { data: rpcData, error: rpcErr } = await supabase.rpc(
    "bind_ad_deliverable",
    {
      p_campaign_id: input.campaignId,
      p_ad_set_id: input.adSetId,
      p_creative_id: input.creativeId,
      p_name: name,
    }
  );

  if (rpcErr) {
    // Unique/race outcomes should be resolved inside the RPC; map any
    // residual uniqueness signal to a deterministic re-read.
    const code = String(
      (rpcErr as { code?: string }).code ?? ""
    ).toUpperCase();
    const msg = String(rpcErr.message ?? "");
    if (
      code === "23505" ||
      /unique|duplicate key|ads_ad_set_id_creative_id/i.test(msg)
    ) {
      const { data: raced } = await supabase
        .from("ads")
        .select("*")
        .eq("ad_set_id", input.adSetId)
        .eq("creative_id", input.creativeId)
        .maybeSingle();
      if (raced) {
        return {
          ok: true,
          binding: mapDeliverable(raced as Record<string, unknown>),
          created: false,
        };
      }
    }
    const compatibilityMessage = mapBindDeliverableCompatibilityError(msg);
    if (compatibilityMessage) {
      return { ok: false, message: compatibilityMessage };
    }
    console.error("bindDeliverable rpc", rpcErr);
    return {
      ok: false,
      message: adsUserMessage(rpcErr.message, ADS_ERRORS.saveFailed),
    };
  }

  const payload = rpcData as {
    created?: boolean;
    binding?: Record<string, unknown>;
  } | null;
  const bindingRow = payload?.binding;
  if (!bindingRow || typeof bindingRow !== "object") {
    console.error("bindDeliverable rpc payload", rpcData);
    return { ok: false, message: ADS_ERRORS.saveFailed };
  }

  return {
    ok: true,
    binding: mapDeliverable(bindingRow),
    created: Boolean(payload?.created),
  };
}

export async function listDeliverablesForCampaign(
  supabase: AnyClient,
  campaignId: string
): Promise<
  { ok: true; bindings: AdDeliverable[] } | { ok: false; message: string }
> {
  const { data: adSets, error: adSetErr } = await supabase
    .from("ad_sets")
    .select("id")
    .eq("campaign_id", campaignId);
  if (adSetErr) {
    console.error("listDeliverablesForCampaign adSets", adSetErr);
    return { ok: false, message: ADS_ERRORS.loadFailed };
  }
  const adSetIds = (adSets ?? []).map((row) => String(row.id));
  if (adSetIds.length === 0) {
    return { ok: true, bindings: [] };
  }

  const { data, error } = await supabase
    .from("ads")
    .select("*")
    .in("ad_set_id", adSetIds)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("listDeliverablesForCampaign", error);
    return { ok: false, message: ADS_ERRORS.loadFailed };
  }

  return {
    ok: true,
    bindings: (data ?? []).map((row) =>
      mapDeliverable(row as Record<string, unknown>)
    ),
  };
}

export async function campaignHasValidDeliverableBinding(
  supabase: AnyClient,
  campaignId: string
): Promise<{ ok: true; hasBinding: boolean } | { ok: false; message: string }> {
  const listed = await listDeliverablesForCampaign(supabase, campaignId);
  if (!listed.ok) return listed;
  return {
    ok: true,
    hasBinding: countValidDeliverableBindings(listed.bindings) > 0,
  };
}

export type ActivationReadinessInput = {
  advertiserStatus: AdvertiserAccountStatus;
  campaign: AdCampaign;
  adSets: readonly AdSet[];
  creatives: readonly AdCreative[];
  bindings: readonly AdDeliverable[];
};

export function evaluateCampaignActivationReadiness(
  input: ActivationReadinessInput
): { ok: true } | { ok: false; message: string } {
  const hasEligibleAdSet = input.adSets.some(
    (set) => !INVALID_BINDING_STATUSES.has(set.status)
  );
  const hasApprovedCreative = input.creatives.some(
    (creative) => creative.status === "approved"
  );
  const hasValidDeliverableBinding =
    countValidDeliverableBindings(input.bindings) > 0;
  const hasValidBudget =
    input.campaign.dailyBudgetMinor != null ||
    input.campaign.totalBudgetMinor != null;
  const hasValidDates =
    !(
      input.campaign.startAt &&
      input.campaign.endAt &&
      input.campaign.endAt <= input.campaign.startAt
    );

  return canActivateCampaign({
    advertiserStatus: input.advertiserStatus,
    campaignStatus: input.campaign.status,
    hasApprovedCreative,
    hasValidDeliverableBinding,
    hasEligibleAdSet,
    hasValidBudget,
    hasValidDates,
  });
}
