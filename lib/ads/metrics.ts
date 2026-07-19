import type { SupabaseClient } from "@supabase/supabase-js";
import { ADS_DELIVERY_ENABLED } from "./constants";
import { ADS_ERRORS } from "./errors";
import type { AdvertiserOverviewMetrics } from "./types";

type AnyClient = SupabaseClient;

const EMPTY_NOTE =
  "Metrics show recorded data only. Ad delivery is not live in V1 — zeros mean no events yet, not estimates.";

export function emptyOverviewMetrics(): AdvertiserOverviewMetrics {
  return {
    impressions: 0,
    clicks: 0,
    uniqueReach: 0,
    videoViews: 0,
    spendMinor: 0,
    deliveryEnabled: false,
    note: EMPTY_NOTE,
  };
}

export async function getAdvertiserOverviewMetrics(
  supabase: AnyClient,
  advertiserAccountId: string
): Promise<
  | { ok: true; metrics: AdvertiserOverviewMetrics }
  | { ok: false; message: string }
> {
  const { data, error } = await supabase
    .from("ad_daily_metrics")
    .select("impressions, clicks, unique_reach, video_views, spend_minor")
    .eq("advertiser_account_id", advertiserAccountId);

  if (error) {
    console.error("getAdvertiserOverviewMetrics", error);
    return { ok: false, message: ADS_ERRORS.loadFailed };
  }

  const metrics = emptyOverviewMetrics();
  for (const row of data ?? []) {
    metrics.impressions += Number(row.impressions ?? 0);
    metrics.clicks += Number(row.clicks ?? 0);
    metrics.uniqueReach += Number(row.unique_reach ?? 0);
    metrics.videoViews += Number(row.video_views ?? 0);
    metrics.spendMinor += Number(row.spend_minor ?? 0);
  }

  if (ADS_DELIVERY_ENABLED) {
    // Compile-time contract: delivery flag stays false in V1.
  }

  return { ok: true, metrics };
}

export async function getCampaignMetrics(
  supabase: AnyClient,
  campaignId: string
): Promise<
  | { ok: true; metrics: AdvertiserOverviewMetrics }
  | { ok: false; message: string }
> {
  const { data, error } = await supabase
    .from("ad_daily_metrics")
    .select("impressions, clicks, unique_reach, video_views, spend_minor")
    .eq("campaign_id", campaignId);

  if (error) {
    console.error("getCampaignMetrics", error);
    return { ok: false, message: ADS_ERRORS.loadFailed };
  }

  const metrics = emptyOverviewMetrics();
  for (const row of data ?? []) {
    metrics.impressions += Number(row.impressions ?? 0);
    metrics.clicks += Number(row.clicks ?? 0);
    metrics.uniqueReach += Number(row.unique_reach ?? 0);
    metrics.videoViews += Number(row.video_views ?? 0);
    metrics.spendMinor += Number(row.spend_minor ?? 0);
  }

  return { ok: true, metrics };
}
