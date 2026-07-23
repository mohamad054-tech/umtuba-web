"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addAdvertiserMember,
  createAdvertiserAccount,
  listMyAdvertiserAccounts,
  submitAdvertiserForReview,
  updateAdvertiserAccount,
} from "../../lib/ads/advertiserAccounts";
import {
  requireAccountManager,
  requireCampaignManager,
  getMembershipRole,
} from "../../lib/ads/membership";
import {
  archiveCampaign,
  activateCampaign,
  createCampaign,
  getCampaign,
  listCampaigns,
  pauseCampaign,
  submitCampaignForReview,
  updateCampaign,
} from "../../lib/ads/campaigns";
import { bindDeliverable } from "../../lib/ads/deliverableBindings";
import {
  createCreative,
  deleteDraftCreative,
  submitCreativeForReview,
  updateCreative,
  buildCreativeObjectPath,
} from "../../lib/ads/creatives";
import { ADS_DELIVERY_ENABLED } from "../../lib/ads/constants";
import { ADS_ERRORS } from "../../lib/ads/errors";
import {
  getAdvertiserOverviewMetrics,
  getCampaignMetrics,
} from "../../lib/ads/metrics";
import { saveCampaignTargeting } from "../../lib/ads/targeting";
import {
  AD_CREATIVES_BUCKET,
  AD_PLACEMENTS,
  SAFE_INTERESTS,
  type AdvertiserRole,
} from "../../lib/ads/constants";
import type { CampaignTargeting } from "../../lib/ads/types";
import { validateCreativeFile } from "../../lib/ads/validation";
import { createClient, getServerUser } from "../../lib/supabase/server";
import { APP_ROUTES, advertiseCampaignDetail } from "../lib/nav";

function revalidateAdvertise() {
  revalidatePath(APP_ROUTES.advertise);
  revalidatePath(APP_ROUTES.advertiseDashboard);
  revalidatePath(APP_ROUTES.advertiseCampaigns);
  revalidatePath(APP_ROUTES.advertiseSettings);
}

async function requireUser() {
  const user = await getServerUser();
  if (!user) {
    return null;
  }
  return user;
}

async function requireManagerForCampaign(
  supabase: Awaited<ReturnType<typeof createClient>>,
  campaignId: string,
  userId: string
) {
  const campaign = await getCampaign(supabase, campaignId);
  if (!campaign.ok) return campaign;
  const authz = await requireCampaignManager(
    supabase,
    campaign.campaign.advertiserAccountId,
    userId
  );
  if (!authz.ok) return authz;
  return { ok: true as const, campaign: campaign.campaign };
}

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function formOptional(formData: FormData, key: string): string | null {
  const value = formString(formData, key).trim();
  return value ? value : null;
}

function parseCsv(value: string): string[] {
  return value
    .split(/[,|\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function targetingFromForm(formData: FormData): Partial<CampaignTargeting> {
  return {
    countries: parseCsv(formString(formData, "countries")).map((c) =>
      c.toUpperCase()
    ),
    regions: parseCsv(formString(formData, "regions")),
    cities: parseCsv(formString(formData, "cities")),
    languages: parseCsv(formString(formData, "languages")),
    ageMin: Number(formString(formData, "ageMin") || "13"),
    ageMax: Number(formString(formData, "ageMax") || "65"),
    gender: (formOptional(formData, "gender") as CampaignTargeting["gender"]) ?? "all",
    interests: parseCsv(formString(formData, "interests")).map((i) =>
      i.toLowerCase()
    ),
    userSegments: parseCsv(formString(formData, "userSegments")),
    placements: parseCsv(formString(formData, "placements")).filter((p) =>
      (AD_PLACEMENTS as readonly string[]).includes(p)
    ) as CampaignTargeting["placements"],
    devices: parseCsv(formString(formData, "devices")),
    excludeCountries: parseCsv(formString(formData, "excludeCountries")).map(
      (c) => c.toUpperCase()
    ),
    excludeRegions: parseCsv(formString(formData, "excludeRegions")),
    excludeCities: parseCsv(formString(formData, "excludeCities")),
    excludeInterests: parseCsv(formString(formData, "excludeInterests")),
    excludeUserSegments: parseCsv(formString(formData, "excludeUserSegments")),
    frequencyCap: formOptional(formData, "frequencyCap")
      ? Number(formString(formData, "frequencyCap"))
      : null,
  };
}

// --- Advertiser ---

export async function createAdvertiserAccountAction(
  formData: FormData
): Promise<void> {
  const user = await requireUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.advertiseApply)}`
    );
  }

  const supabase = await createClient();
  const result = await createAdvertiserAccount(supabase, user.id, {
    businessName: formString(formData, "businessName"),
    legalName: formOptional(formData, "legalName"),
    contactEmail: formString(formData, "contactEmail"),
    contactPhone: formOptional(formData, "contactPhone"),
    websiteUrl: formOptional(formData, "websiteUrl"),
    countryCode: formString(formData, "countryCode"),
  });

  if (!result.ok) {
    redirect(
      `${APP_ROUTES.advertiseApply}?error=${encodeURIComponent(result.message)}`
    );
  }

  revalidateAdvertise();
  redirect(`${APP_ROUTES.advertiseDashboard}?created=1`);
}

export async function updateAdvertiserAccountAction(
  formData: FormData
): Promise<void> {
  const user = await requireUser();
  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.advertiseSettings)}`);
  }

  const accountId = formString(formData, "accountId");
  const supabase = await createClient();
  const authz = await requireAccountManager(supabase, accountId, user.id);
  if (!authz.ok) {
    redirect(
      `${APP_ROUTES.advertiseSettings}?error=${encodeURIComponent(authz.message)}`
    );
  }

  const result = await updateAdvertiserAccount(supabase, accountId, {
    businessName: formString(formData, "businessName"),
    legalName: formOptional(formData, "legalName"),
    contactEmail: formString(formData, "contactEmail"),
    contactPhone: formOptional(formData, "contactPhone"),
    websiteUrl: formOptional(formData, "websiteUrl"),
    countryCode: formString(formData, "countryCode"),
  });

  if (!result.ok) {
    redirect(
      `${APP_ROUTES.advertiseSettings}?error=${encodeURIComponent(result.message)}`
    );
  }

  revalidateAdvertise();
  redirect(`${APP_ROUTES.advertiseSettings}?saved=1`);
}

export async function submitAdvertiserForReviewAction(
  formData: FormData
): Promise<void> {
  const user = await requireUser();
  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.advertiseDashboard)}`);
  }

  const supabase = await createClient();
  const result = await submitAdvertiserForReview(
    supabase,
    formString(formData, "accountId")
  );

  if (!result.ok) {
    redirect(
      `${APP_ROUTES.advertiseDashboard}?error=${encodeURIComponent(result.message)}`
    );
  }

  revalidateAdvertise();
  redirect(`${APP_ROUTES.advertiseDashboard}?submitted=1`);
}

export async function listMyAdvertiserAccountsAction() {
  const user = await requireUser();
  if (!user) return { ok: false as const, message: ADS_ERRORS.authRequired };
  const supabase = await createClient();
  return listMyAdvertiserAccounts(supabase, user.id);
}

export async function inviteOrAddAdvertiserMemberAction(
  formData: FormData
): Promise<void> {
  const user = await requireUser();
  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.advertiseSettings)}`);
  }

  const role = formString(formData, "role") as Exclude<AdvertiserRole, "owner">;
  const accountId = formString(formData, "accountId");
  const supabase = await createClient();
  const authz = await requireAccountManager(supabase, accountId, user.id);
  if (!authz.ok) {
    redirect(
      `${APP_ROUTES.advertiseSettings}?error=${encodeURIComponent(authz.message)}`
    );
  }
  const result = await addAdvertiserMember(
    supabase,
    accountId,
    formString(formData, "memberUserId"),
    role
  );

  if (!result.ok) {
    redirect(
      `${APP_ROUTES.advertiseSettings}?error=${encodeURIComponent(result.message)}`
    );
  }

  revalidateAdvertise();
  redirect(`${APP_ROUTES.advertiseSettings}?member=1`);
}

// --- Campaigns ---

export async function createCampaignAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.advertiseCampaignsNew)}`
    );
  }

  const advertiserAccountId = formString(formData, "advertiserAccountId");
  const supabase = await createClient();
  const authz = await requireCampaignManager(
    supabase,
    advertiserAccountId,
    user.id
  );
  if (!authz.ok) {
    redirect(
      `${APP_ROUTES.advertiseCampaignsNew}?error=${encodeURIComponent(authz.message)}`
    );
  }

  const result = await createCampaign(supabase, user.id, {
    advertiserAccountId,
    name: formString(formData, "name"),
    objective: formString(formData, "objective"),
    startAt: formOptional(formData, "startAt"),
    endAt: formOptional(formData, "endAt"),
    dailyBudgetMinor: formOptional(formData, "dailyBudgetMinor"),
    totalBudgetMinor: formOptional(formData, "totalBudgetMinor"),
    currencyCode: formString(formData, "currencyCode") || "USD",
  });

  if (!result.ok) {
    redirect(
      `${APP_ROUTES.advertiseCampaignsNew}?error=${encodeURIComponent(result.message)}`
    );
  }

  const targeting = await saveCampaignTargeting(
    supabase,
    result.campaign.id,
    null,
    {
      ...targetingFromForm(formData),
      name: "Default ad set",
    }
  );

  if (!targeting.ok) {
    redirect(
      `${advertiseCampaignDetail(result.campaign.id)}?error=${encodeURIComponent(
        targeting.message
      )}`
    );
  }

  revalidateAdvertise();
  redirect(
    `${advertiseCampaignDetail(result.campaign.id)}?created=1`
  );
}

export async function updateCampaignAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.advertiseCampaigns)}`);
  }

  const campaignId = formString(formData, "campaignId");
  const supabase = await createClient();
  const gate = await requireManagerForCampaign(supabase, campaignId, user.id);
  if (!gate.ok) {
    redirect(
      `${advertiseCampaignDetail(campaignId)}?error=${encodeURIComponent(gate.message)}`
    );
  }
  const result = await updateCampaign(supabase, campaignId, {
    name: formOptional(formData, "name") ?? undefined,
    objective: formOptional(formData, "objective") ?? undefined,
    startAt: formOptional(formData, "startAt"),
    endAt: formOptional(formData, "endAt"),
    dailyBudgetMinor: formOptional(formData, "dailyBudgetMinor") ?? undefined,
    totalBudgetMinor: formOptional(formData, "totalBudgetMinor") ?? undefined,
    currencyCode: formOptional(formData, "currencyCode") ?? undefined,
  });

  if (!result.ok) {
    redirect(
      `${advertiseCampaignDetail(campaignId)}?error=${encodeURIComponent(
        result.message
      )}`
    );
  }

  revalidateAdvertise();
  redirect(`${advertiseCampaignDetail(campaignId)}?saved=1`);
}

export async function submitCampaignForReviewAction(
  formData: FormData
): Promise<void> {
  const user = await requireUser();
  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.advertiseCampaigns)}`);
  }

  const campaignId = formString(formData, "campaignId");
  const supabase = await createClient();
  const result = await submitCampaignForReview(supabase, campaignId);

  if (!result.ok) {
    redirect(
      `${advertiseCampaignDetail(campaignId)}?error=${encodeURIComponent(
        result.message
      )}`
    );
  }

  revalidateAdvertise();
  redirect(`${advertiseCampaignDetail(campaignId)}?submitted=1`);
}

export async function pauseCampaignAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.advertiseCampaigns)}`);
  }

  const campaignId = formString(formData, "campaignId");
  const supabase = await createClient();
  const result = await pauseCampaign(supabase, campaignId);

  if (!result.ok) {
    redirect(
      `${advertiseCampaignDetail(campaignId)}?error=${encodeURIComponent(
        result.message
      )}`
    );
  }

  revalidateAdvertise();
  redirect(`${advertiseCampaignDetail(campaignId)}?paused=1`);
}

export async function activateCampaignAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.advertiseCampaigns)}`
    );
  }

  const campaignId = formString(formData, "campaignId");
  const supabase = await createClient();
  const authz = await requireManagerForCampaign(supabase, campaignId, user.id);
  if (!authz.ok) {
    redirect(
      `${advertiseCampaignDetail(campaignId)}?error=${encodeURIComponent(
        authz.message
      )}`
    );
  }

  // Structural: activation never flips the delivery kill switch.
  if (ADS_DELIVERY_ENABLED) {
    redirect(
      `${advertiseCampaignDetail(campaignId)}?error=${encodeURIComponent(
        ADS_ERRORS.deliveryDisabled
      )}`
    );
  }

  const result = await activateCampaign(supabase, campaignId);
  if (!result.ok) {
    redirect(
      `${advertiseCampaignDetail(campaignId)}?error=${encodeURIComponent(
        result.message
      )}`
    );
  }

  revalidateAdvertise();
  redirect(`${advertiseCampaignDetail(campaignId)}?activated=1`);
}

export async function bindDeliverableAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.advertiseCampaigns)}`
    );
  }

  const campaignId = formString(formData, "campaignId");
  const adSetId = formString(formData, "adSetId");
  const creativeId = formString(formData, "creativeId");
  const supabase = await createClient();
  const authz = await requireManagerForCampaign(supabase, campaignId, user.id);
  if (!authz.ok) {
    redirect(
      `${advertiseCampaignDetail(campaignId)}?error=${encodeURIComponent(
        authz.message
      )}`
    );
  }

  const result = await bindDeliverable(supabase, {
    campaignId,
    adSetId,
    creativeId,
  });
  if (!result.ok) {
    redirect(
      `${advertiseCampaignDetail(campaignId)}?error=${encodeURIComponent(
        result.message
      )}`
    );
  }

  revalidateAdvertise();
  redirect(
    `${advertiseCampaignDetail(campaignId)}?bound=${result.created ? "1" : "existing"}`
  );
}

export async function archiveCampaignAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.advertiseCampaigns)}`);
  }

  const campaignId = formString(formData, "campaignId");
  const supabase = await createClient();
  const result = await archiveCampaign(supabase, campaignId);

  if (!result.ok) {
    redirect(
      `${advertiseCampaignDetail(campaignId)}?error=${encodeURIComponent(
        result.message
      )}`
    );
  }

  revalidateAdvertise();
  redirect(`${APP_ROUTES.advertiseCampaigns}?archived=1`);
}

export async function listCampaignsAction(advertiserAccountId: string) {
  const user = await requireUser();
  if (!user) return { ok: false as const, message: ADS_ERRORS.authRequired };
  const supabase = await createClient();
  return listCampaigns(supabase, advertiserAccountId);
}

export async function getCampaignAction(campaignId: string) {
  const user = await requireUser();
  if (!user) return { ok: false as const, message: ADS_ERRORS.authRequired };
  const supabase = await createClient();
  return getCampaign(supabase, campaignId);
}

export async function saveCampaignTargetingAction(
  formData: FormData
): Promise<void> {
  const user = await requireUser();
  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.advertiseCampaigns)}`);
  }

  const campaignId = formString(formData, "campaignId");
  const adSetId = formOptional(formData, "adSetId");
  const supabase = await createClient();
  const gate = await requireManagerForCampaign(supabase, campaignId, user.id);
  if (!gate.ok) {
    redirect(
      `${advertiseCampaignDetail(campaignId)}?error=${encodeURIComponent(gate.message)}`
    );
  }
  if (
    gate.campaign.status !== "draft" &&
    gate.campaign.status !== "rejected"
  ) {
    redirect(
      `${advertiseCampaignDetail(campaignId)}?error=${encodeURIComponent(
        "Targeting can only be edited on draft or rejected campaigns."
      )}`
    );
  }
  const result = await saveCampaignTargeting(
    supabase,
    campaignId,
    adSetId,
    {
      ...targetingFromForm(formData),
      name: formOptional(formData, "adSetName") ?? "Default ad set",
    }
  );

  if (!result.ok) {
    redirect(
      `${advertiseCampaignDetail(campaignId)}?error=${encodeURIComponent(
        result.message
      )}`
    );
  }

  revalidateAdvertise();
  redirect(`${advertiseCampaignDetail(campaignId)}?targeting=1`);
}

// --- Creatives ---

export async function createCreativeAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.advertiseCreativesNew)}`
    );
  }

  const advertiserAccountId = formString(formData, "advertiserAccountId");
  const campaignId = formOptional(formData, "campaignId");
  const file = formData.get("media");
  if (!(file instanceof File) || file.size === 0) {
    redirect(
      `${APP_ROUTES.advertiseCreativesNew}?error=${encodeURIComponent(
        "Creative media file is required."
      )}`
    );
  }

  const mimeType = file.type || "application/octet-stream";
  const fileCheck = validateCreativeFile({
    mimeType,
    byteSize: file.size,
  });
  if (!fileCheck.ok) {
    redirect(
      `${APP_ROUTES.advertiseCreativesNew}?error=${encodeURIComponent(fileCheck.message)}`
    );
  }

  const supabase = await createClient();
  const authz = await requireCampaignManager(
    supabase,
    advertiserAccountId,
    user.id
  );
  if (!authz.ok) {
    redirect(
      `${APP_ROUTES.advertiseCreativesNew}?error=${encodeURIComponent(authz.message)}`
    );
  }

  const mediaPath = buildCreativeObjectPath(
    advertiserAccountId,
    user.id,
    crypto.randomUUID()
  );

  const { error: uploadError } = await supabase.storage
    .from(AD_CREATIVES_BUCKET)
    .upload(mediaPath, file, { contentType: mimeType, upsert: false });

  if (uploadError) {
    redirect(
      `${APP_ROUTES.advertiseCreativesNew}?error=${encodeURIComponent(
        uploadError.message || ADS_ERRORS.saveFailed
      )}`
    );
  }

  const result = await createCreative(supabase, user.id, {
    advertiserAccountId,
    campaignId,
    adSetId: formOptional(formData, "adSetId"),
    creativeType: formString(formData, "creativeType") || "image",
    headline: formString(formData, "headline"),
    bodyText: formOptional(formData, "bodyText"),
    callToAction: formString(formData, "callToAction") || "learn_more",
    destinationUrl: formString(formData, "destinationUrl"),
    mediaPath,
    mimeType,
    byteSize: file.size,
  });

  if (!result.ok) {
    await supabase.storage.from(AD_CREATIVES_BUCKET).remove([mediaPath]);
    redirect(
      `${APP_ROUTES.advertiseCreativesNew}?error=${encodeURIComponent(result.message)}`
    );
  }

  revalidateAdvertise();
  const next = campaignId
    ? advertiseCampaignDetail(campaignId)
    : APP_ROUTES.advertiseDashboard;
  redirect(`${next}?creative=1`);
}

export async function updateCreativeAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.advertiseDashboard)}`);
  }

  const creativeId = formString(formData, "creativeId");
  const campaignId = formOptional(formData, "campaignId");
  const supabase = await createClient();
  const result = await updateCreative(supabase, user.id, creativeId, {
    headline: formOptional(formData, "headline") ?? undefined,
    bodyText: formOptional(formData, "bodyText"),
    callToAction: formOptional(formData, "callToAction") ?? undefined,
    destinationUrl: formOptional(formData, "destinationUrl") ?? undefined,
    creativeType: formOptional(formData, "creativeType") ?? undefined,
  });

  if (!result.ok) {
    const back = campaignId
      ? advertiseCampaignDetail(campaignId)
      : APP_ROUTES.advertiseDashboard;
    redirect(`${back}?error=${encodeURIComponent(result.message)}`);
  }

  revalidateAdvertise();
  const next = campaignId
    ? advertiseCampaignDetail(campaignId)
    : APP_ROUTES.advertiseDashboard;
  redirect(`${next}?creativeSaved=1`);
}

export async function submitCreativeForReviewAction(
  formData: FormData
): Promise<void> {
  const user = await requireUser();
  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.advertiseDashboard)}`);
  }

  const creativeId = formString(formData, "creativeId");
  const campaignId = formOptional(formData, "campaignId");
  const supabase = await createClient();
  const result = await submitCreativeForReview(supabase, creativeId);

  if (!result.ok) {
    const back = campaignId
      ? advertiseCampaignDetail(campaignId)
      : APP_ROUTES.advertiseDashboard;
    redirect(`${back}?error=${encodeURIComponent(result.message)}`);
  }

  revalidateAdvertise();
  const next = campaignId
    ? advertiseCampaignDetail(campaignId)
    : APP_ROUTES.advertiseDashboard;
  redirect(`${next}?creativeSubmitted=1`);
}

export async function deleteDraftCreativeAction(
  formData: FormData
): Promise<void> {
  const user = await requireUser();
  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.advertiseDashboard)}`);
  }

  const creativeId = formString(formData, "creativeId");
  const campaignId = formOptional(formData, "campaignId");
  const supabase = await createClient();
  const result = await deleteDraftCreative(supabase, creativeId);

  if (!result.ok) {
    const back = campaignId
      ? advertiseCampaignDetail(campaignId)
      : APP_ROUTES.advertiseDashboard;
    redirect(`${back}?error=${encodeURIComponent(result.message)}`);
  }

  revalidateAdvertise();
  const next = campaignId
    ? advertiseCampaignDetail(campaignId)
    : APP_ROUTES.advertiseDashboard;
  redirect(`${next}?creativeDeleted=1`);
}

export async function getCreativeUploadUrlAction(input: {
  advertiserAccountId: string;
}): Promise<
  | { ok: true; bucket: string; pathPrefix: string; allowedInterests: readonly string[] }
  | { ok: false; message: string }
> {
  const user = await requireUser();
  if (!user) return { ok: false, message: ADS_ERRORS.authRequired };
  const supabase = await createClient();
  const authz = await requireCampaignManager(
    supabase,
    input.advertiserAccountId,
    user.id
  );
  if (!authz.ok) return authz;

  return {
    ok: true,
    bucket: AD_CREATIVES_BUCKET,
    pathPrefix: `${input.advertiserAccountId}/${user.id}/`,
    allowedInterests: SAFE_INTERESTS,
  };
}

// --- Metrics ---

export async function getAdvertiserOverviewMetricsAction(
  advertiserAccountId: string
) {
  const user = await requireUser();
  if (!user) return { ok: false as const, message: ADS_ERRORS.authRequired };
  const supabase = await createClient();
  const membership = await getMembershipRole(
    supabase,
    advertiserAccountId,
    user.id
  );
  if (!membership.ok) return membership;
  return getAdvertiserOverviewMetrics(supabase, advertiserAccountId);
}

export async function getCampaignMetricsAction(campaignId: string) {
  const user = await requireUser();
  if (!user) return { ok: false as const, message: ADS_ERRORS.authRequired };
  const supabase = await createClient();
  return getCampaignMetrics(supabase, campaignId);
}
