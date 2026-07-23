import type { SupabaseClient } from "@supabase/supabase-js";
import { listMyAdvertiserAccounts } from "./advertiserAccounts";
import { getCampaign, listCampaigns } from "./campaigns";
import { listCreativesForCampaign } from "./creatives";
import { listDeliverablesForCampaign } from "./deliverableBindings";
import { ADS_ERRORS } from "./errors";
import { getAdvertiserOverviewMetrics, getCampaignMetrics } from "./metrics";
import { listAdSetsForCampaign } from "./targeting";
import type {
  AdCampaign,
  AdCreative,
  AdDeliverable,
  AdSet,
  AdvertiserAccount,
  AdvertiserOverviewMetrics,
} from "./types";

type AnyClient = SupabaseClient;

export async function resolvePrimaryAdvertiserAccount(
  supabase: AnyClient,
  userId: string
): Promise<
  | { ok: true; account: AdvertiserAccount | null }
  | { ok: false; message: string }
> {
  const result = await listMyAdvertiserAccounts(supabase, userId);
  if (!result.ok) return result;
  return { ok: true, account: result.accounts[0] ?? null };
}

export async function loadAdvertiserDashboard(
  supabase: AnyClient,
  userId: string
): Promise<
  | {
      ok: true;
      account: AdvertiserAccount | null;
      campaigns: AdCampaign[];
      metrics: AdvertiserOverviewMetrics;
    }
  | { ok: false; message: string }
> {
  const accounts = await listMyAdvertiserAccounts(supabase, userId);
  if (!accounts.ok) return accounts;

  const account = accounts.accounts[0] ?? null;
  if (!account) {
    return {
      ok: true,
      account: null,
      campaigns: [],
      metrics: {
        impressions: 0,
        clicks: 0,
        uniqueReach: 0,
        videoViews: 0,
        spendMinor: 0,
        deliveryEnabled: false,
        note: "Create an advertiser account to start.",
      },
    };
  }

  const [campaigns, metrics] = await Promise.all([
    listCampaigns(supabase, account.id),
    getAdvertiserOverviewMetrics(supabase, account.id),
  ]);

  if (!campaigns.ok) return campaigns;
  if (!metrics.ok) return metrics;

  return {
    ok: true,
    account,
    campaigns: campaigns.campaigns,
    metrics: metrics.metrics,
  };
}

export async function loadCampaignWorkspace(
  supabase: AnyClient,
  campaignId: string
): Promise<
  | {
      ok: true;
      campaign: AdCampaign;
      adSets: AdSet[];
      creatives: AdCreative[];
      bindings: AdDeliverable[];
      metrics: AdvertiserOverviewMetrics;
    }
  | { ok: false; message: string }
> {
  const campaign = await getCampaign(supabase, campaignId);
  if (!campaign.ok) return campaign;

  const [adSets, creatives, bindings, metrics] = await Promise.all([
    listAdSetsForCampaign(supabase, campaignId),
    listCreativesForCampaign(supabase, campaignId),
    listDeliverablesForCampaign(supabase, campaignId),
    getCampaignMetrics(supabase, campaignId),
  ]);

  if (!adSets.ok) return adSets;
  if (!creatives.ok) return creatives;
  if (!bindings.ok) return bindings;
  if (!metrics.ok) return metrics;

  return {
    ok: true,
    campaign: campaign.campaign,
    adSets: adSets.adSets,
    creatives: creatives.creatives,
    bindings: bindings.bindings,
    metrics: metrics.metrics,
  };
}

export function adsAuthRequiredMessage(): string {
  return ADS_ERRORS.authRequired;
}
