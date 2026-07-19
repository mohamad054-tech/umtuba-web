"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ADMIN_ADS_UNAUTHORIZED,
  assertPlatformAdminDb,
} from "../../lib/ads/adminAuth";
import {
  approveAdvertiser,
  approveCampaign,
  approveCreative,
  pauseCampaignAdmin,
  rejectAdvertiser,
  rejectCampaign,
  rejectCreative,
  restoreAdvertiser,
  restoreCampaign,
  restoreCreative,
  suspendAdvertiser,
  suspendCreative,
} from "../../lib/ads/adminReview";
import { ADS_ERRORS } from "../../lib/ads/errors";
import { createClient, getServerUser } from "../../lib/supabase/server";
import { APP_ROUTES } from "../lib/nav";

function revalidateAdminAds() {
  revalidatePath(APP_ROUTES.adminAds);
  revalidatePath(APP_ROUTES.adminAdsAdvertisers);
  revalidatePath(APP_ROUTES.adminAdsCampaigns);
  revalidatePath(APP_ROUTES.adminAdsCreatives);
  revalidatePath(APP_ROUTES.adminAdsReviews);
}

async function requirePlatformAdmin() {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.adminAds)}`
    );
  }
  const supabase = await createClient();
  // DB is the sole authority — JWT/env hints are never enough.
  const isAdmin = await assertPlatformAdminDb(supabase);
  if (!isAdmin) {
    redirect(`${APP_ROUTES.home}?error=${encodeURIComponent(ADMIN_ADS_UNAUTHORIZED)}`);
  }
  return user;
}

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function backPath(formData: FormData, fallback: string): string {
  const raw = formString(formData, "returnTo").trim();
  if (raw.startsWith("/admin/ads")) return raw;
  return fallback;
}

export async function approveAdvertiserAction(formData: FormData): Promise<void> {
  await requirePlatformAdmin();
  const id = formString(formData, "accountId");
  const supabase = await createClient();
  const result = await approveAdvertiser(supabase, id);
  const back = backPath(formData, APP_ROUTES.adminAdsAdvertisers);
  if (!result.ok) {
    redirect(`${back}?error=${encodeURIComponent(result.message)}`);
  }
  revalidateAdminAds();
  redirect(`${back}?approved=1`);
}

export async function rejectAdvertiserAction(formData: FormData): Promise<void> {
  await requirePlatformAdmin();
  const id = formString(formData, "accountId");
  const note = formString(formData, "note").trim();
  if (note.length < 3) {
    const back = backPath(formData, APP_ROUTES.adminAdsAdvertisers);
    redirect(
      `${back}?error=${encodeURIComponent("Rejection reason is required.")}`
    );
  }
  const supabase = await createClient();
  const result = await rejectAdvertiser(supabase, id, note);
  const back = backPath(formData, APP_ROUTES.adminAdsAdvertisers);
  if (!result.ok) {
    redirect(`${back}?error=${encodeURIComponent(result.message)}`);
  }
  revalidateAdminAds();
  redirect(`${back}?rejected=1`);
}

export async function suspendAdvertiserAction(formData: FormData): Promise<void> {
  await requirePlatformAdmin();
  const id = formString(formData, "accountId");
  const note = formString(formData, "note").trim() || null;
  const supabase = await createClient();
  const result = await suspendAdvertiser(supabase, id, note);
  const back = backPath(formData, APP_ROUTES.adminAdsAdvertisers);
  if (!result.ok) {
    redirect(`${back}?error=${encodeURIComponent(result.message)}`);
  }
  revalidateAdminAds();
  redirect(`${back}?suspended=1`);
}

export async function restoreAdvertiserAction(formData: FormData): Promise<void> {
  await requirePlatformAdmin();
  const id = formString(formData, "accountId");
  const supabase = await createClient();
  const result = await restoreAdvertiser(supabase, id);
  const back = backPath(formData, APP_ROUTES.adminAdsAdvertisers);
  if (!result.ok) {
    redirect(`${back}?error=${encodeURIComponent(result.message)}`);
  }
  revalidateAdminAds();
  redirect(`${back}?restored=1`);
}

export async function approveCampaignAction(formData: FormData): Promise<void> {
  await requirePlatformAdmin();
  const id = formString(formData, "campaignId");
  const supabase = await createClient();
  const result = await approveCampaign(supabase, id);
  const back = backPath(formData, APP_ROUTES.adminAdsCampaigns);
  if (!result.ok) {
    redirect(`${back}?error=${encodeURIComponent(result.message)}`);
  }
  revalidateAdminAds();
  redirect(`${back}?approved=1`);
}

export async function rejectCampaignAction(formData: FormData): Promise<void> {
  await requirePlatformAdmin();
  const id = formString(formData, "campaignId");
  const note = formString(formData, "note").trim();
  if (note.length < 3) {
    const back = backPath(formData, APP_ROUTES.adminAdsCampaigns);
    redirect(
      `${back}?error=${encodeURIComponent("Rejection reason is required.")}`
    );
  }
  const supabase = await createClient();
  const result = await rejectCampaign(supabase, id, note);
  const back = backPath(formData, APP_ROUTES.adminAdsCampaigns);
  if (!result.ok) {
    redirect(`${back}?error=${encodeURIComponent(result.message)}`);
  }
  revalidateAdminAds();
  redirect(`${back}?rejected=1`);
}

export async function pauseCampaignAdminAction(formData: FormData): Promise<void> {
  await requirePlatformAdmin();
  const id = formString(formData, "campaignId");
  const supabase = await createClient();
  const result = await pauseCampaignAdmin(supabase, id);
  const back = backPath(formData, APP_ROUTES.adminAdsCampaigns);
  if (!result.ok) {
    redirect(`${back}?error=${encodeURIComponent(result.message)}`);
  }
  revalidateAdminAds();
  redirect(`${back}?paused=1`);
}

export async function restoreCampaignAction(formData: FormData): Promise<void> {
  await requirePlatformAdmin();
  const id = formString(formData, "campaignId");
  const supabase = await createClient();
  const result = await restoreCampaign(supabase, id);
  const back = backPath(formData, APP_ROUTES.adminAdsCampaigns);
  if (!result.ok) {
    redirect(`${back}?error=${encodeURIComponent(result.message)}`);
  }
  revalidateAdminAds();
  redirect(`${back}?restored=1`);
}

export async function approveCreativeAction(formData: FormData): Promise<void> {
  await requirePlatformAdmin();
  const id = formString(formData, "creativeId");
  const supabase = await createClient();
  const result = await approveCreative(supabase, id);
  const back = backPath(formData, APP_ROUTES.adminAdsCreatives);
  if (!result.ok) {
    redirect(`${back}?error=${encodeURIComponent(result.message)}`);
  }
  revalidateAdminAds();
  redirect(`${back}?approved=1`);
}

export async function rejectCreativeAction(formData: FormData): Promise<void> {
  await requirePlatformAdmin();
  const id = formString(formData, "creativeId");
  const note = formString(formData, "note").trim();
  if (note.length < 3) {
    const back = backPath(formData, APP_ROUTES.adminAdsCreatives);
    redirect(
      `${back}?error=${encodeURIComponent("Rejection reason is required.")}`
    );
  }
  const supabase = await createClient();
  const result = await rejectCreative(supabase, id, note);
  const back = backPath(formData, APP_ROUTES.adminAdsCreatives);
  if (!result.ok) {
    redirect(`${back}?error=${encodeURIComponent(result.message)}`);
  }
  revalidateAdminAds();
  redirect(`${back}?rejected=1`);
}

export async function suspendCreativeAction(formData: FormData): Promise<void> {
  await requirePlatformAdmin();
  const id = formString(formData, "creativeId");
  const note = formString(formData, "note").trim() || null;
  const supabase = await createClient();
  const result = await suspendCreative(supabase, id, note);
  const back = backPath(formData, APP_ROUTES.adminAdsCreatives);
  if (!result.ok) {
    redirect(`${back}?error=${encodeURIComponent(result.message)}`);
  }
  revalidateAdminAds();
  redirect(`${back}?suspended=1`);
}

export async function restoreCreativeAction(formData: FormData): Promise<void> {
  await requirePlatformAdmin();
  const id = formString(formData, "creativeId");
  const supabase = await createClient();
  const result = await restoreCreative(supabase, id);
  const back = backPath(formData, APP_ROUTES.adminAdsCreatives);
  if (!result.ok) {
    redirect(`${back}?error=${encodeURIComponent(result.message)}`);
  }
  revalidateAdminAds();
  redirect(`${back}?restored=1`);
}

/** Read helper for pages — never trusts client reviewer ids. */
export async function assertAdminSessionAction(): Promise<
  { ok: true; userId: string } | { ok: false; message: string }
> {
  const user = await getServerUser();
  if (!user) return { ok: false, message: ADS_ERRORS.authRequired };
  const supabase = await createClient();
  if (!(await assertPlatformAdminDb(supabase))) {
    return { ok: false, message: ADMIN_ADS_UNAUTHORIZED };
  }
  return { ok: true, userId: user.id };
}
