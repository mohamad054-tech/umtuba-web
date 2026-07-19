import type { SupabaseClient } from "@supabase/supabase-js";
import { ADS_ERRORS, adsUserMessage } from "./errors";
import type { AdSet, CampaignTargeting } from "./types";
import { validateTargeting } from "./validation";

type AnyClient = SupabaseClient;

export function mapAdSet(row: Record<string, unknown>): AdSet {
  const targeting: CampaignTargeting = {
    countries: (row.countries as string[]) ?? [],
    regions: (row.regions as string[]) ?? [],
    cities: (row.cities as string[]) ?? [],
    languages: (row.languages as string[]) ?? [],
    ageMin: Number(row.age_min),
    ageMax: Number(row.age_max),
    gender: (row.gender as CampaignTargeting["gender"]) ?? "all",
    interests: (row.interests as string[]) ?? [],
    userSegments: (row.user_segments as string[]) ?? [],
    placements: (row.placements as CampaignTargeting["placements"]) ?? [],
    devices: (row.devices as string[]) ?? [],
    excludeCountries: (row.exclude_countries as string[]) ?? [],
    excludeRegions: (row.exclude_regions as string[]) ?? [],
    excludeCities: (row.exclude_cities as string[]) ?? [],
    excludeInterests: (row.exclude_interests as string[]) ?? [],
    excludeUserSegments: (row.exclude_user_segments as string[]) ?? [],
    frequencyCap: (row.frequency_cap as number | null) ?? null,
  };

  return {
    id: String(row.id),
    campaignId: String(row.campaign_id),
    name: String(row.name),
    status: row.status as AdSet["status"],
    targeting,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function targetingToRow(targeting: CampaignTargeting) {
  return {
    countries: targeting.countries,
    regions: targeting.regions,
    cities: targeting.cities,
    languages: targeting.languages,
    age_min: targeting.ageMin,
    age_max: targeting.ageMax,
    gender: targeting.gender,
    interests: targeting.interests,
    user_segments: targeting.userSegments,
    placements: targeting.placements,
    devices: targeting.devices,
    exclude_countries: targeting.excludeCountries,
    exclude_regions: targeting.excludeRegions,
    exclude_cities: targeting.excludeCities,
    exclude_interests: targeting.excludeInterests,
    exclude_user_segments: targeting.excludeUserSegments,
    frequency_cap: targeting.frequencyCap,
  };
}

export async function saveCampaignTargeting(
  supabase: AnyClient,
  campaignId: string,
  adSetId: string | null,
  input: Partial<CampaignTargeting> & { name?: string }
): Promise<{ ok: true; adSet: AdSet } | { ok: false; message: string }> {
  const validated = validateTargeting(input);
  if (!validated.ok) return validated;

  const payload = {
    campaign_id: campaignId,
    name: (input.name ?? "Default ad set").trim().slice(0, 120) || "Default ad set",
    ...targetingToRow(validated.targeting),
  };

  if (adSetId) {
    const { data, error } = await supabase
      .from("ad_sets")
      .update(payload)
      .eq("id", adSetId)
      .eq("campaign_id", campaignId)
      .select("*")
      .single();
    if (error || !data) {
      console.error("saveCampaignTargeting update", error);
      return {
        ok: false,
        message: adsUserMessage(error?.message, ADS_ERRORS.saveFailed),
      };
    }
    return { ok: true, adSet: mapAdSet(data as Record<string, unknown>) };
  }

  const { data, error } = await supabase
    .from("ad_sets")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    console.error("saveCampaignTargeting insert", error);
    return {
      ok: false,
      message: adsUserMessage(error?.message, ADS_ERRORS.saveFailed),
    };
  }

  return { ok: true, adSet: mapAdSet(data as Record<string, unknown>) };
}

export async function listAdSetsForCampaign(
  supabase: AnyClient,
  campaignId: string
): Promise<{ ok: true; adSets: AdSet[] } | { ok: false; message: string }> {
  const { data, error } = await supabase
    .from("ad_sets")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("listAdSetsForCampaign", error);
    return { ok: false, message: ADS_ERRORS.loadFailed };
  }

  return {
    ok: true,
    adSets: (data ?? []).map((row) => mapAdSet(row as Record<string, unknown>)),
  };
}
