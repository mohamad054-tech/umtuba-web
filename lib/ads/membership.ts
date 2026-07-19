import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdvertiserRole } from "./constants";
import { ADS_ERRORS } from "./errors";
import {
  canManageAccount,
  canManageCampaigns,
} from "./permissions";

type AnyClient = SupabaseClient;

export async function getMembershipRole(
  supabase: AnyClient,
  advertiserAccountId: string,
  userId: string
): Promise<
  | { ok: true; role: AdvertiserRole }
  | { ok: false; message: string }
> {
  const { data, error } = await supabase
    .from("advertiser_members")
    .select("role")
    .eq("advertiser_account_id", advertiserAccountId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("getMembershipRole", error);
    return { ok: false, message: ADS_ERRORS.loadFailed };
  }
  if (!data?.role) {
    return { ok: false, message: ADS_ERRORS.notAuthorized };
  }
  return { ok: true, role: data.role as AdvertiserRole };
}

export async function requireCampaignManager(
  supabase: AnyClient,
  advertiserAccountId: string,
  userId: string
): Promise<{ ok: true; role: AdvertiserRole } | { ok: false; message: string }> {
  const membership = await getMembershipRole(
    supabase,
    advertiserAccountId,
    userId
  );
  if (!membership.ok) return membership;
  if (!canManageCampaigns(membership.role)) {
    return { ok: false, message: ADS_ERRORS.notAuthorized };
  }
  return membership;
}

export async function requireAccountManager(
  supabase: AnyClient,
  advertiserAccountId: string,
  userId: string
): Promise<{ ok: true; role: AdvertiserRole } | { ok: false; message: string }> {
  const membership = await getMembershipRole(
    supabase,
    advertiserAccountId,
    userId
  );
  if (!membership.ok) return membership;
  if (!canManageAccount(membership.role)) {
    return { ok: false, message: ADS_ERRORS.notAuthorized };
  }
  return membership;
}
