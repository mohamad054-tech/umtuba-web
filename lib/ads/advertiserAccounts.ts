import type { SupabaseClient } from "@supabase/supabase-js";
import { ADS_ERRORS, adsUserMessage } from "./errors";
import type { AdvertiserAccount, AdvertiserRole } from "./types";
import { validateCountryCode, validateDestinationUrl } from "./validation";

type AnyClient = SupabaseClient;

function mapAccount(
  row: Record<string, unknown>,
  role: AdvertiserRole
): AdvertiserAccount {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    businessName: String(row.business_name),
    legalName: (row.legal_name as string | null) ?? null,
    contactEmail: String(row.contact_email),
    contactPhone: (row.contact_phone as string | null) ?? null,
    websiteUrl: (row.website_url as string | null) ?? null,
    countryCode: String(row.country_code),
    status: row.status as AdvertiserAccount["status"],
    reviewNote: (row.review_note as string | null) ?? null,
    reviewedAt: (row.reviewed_at as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    myRole: role,
  };
}

export async function listMyAdvertiserAccounts(
  supabase: AnyClient,
  userId: string
): Promise<
  | { ok: true; accounts: AdvertiserAccount[] }
  | { ok: false; message: string }
> {
  const { data: memberships, error: memErr } = await supabase
    .from("advertiser_members")
    .select("advertiser_account_id, role")
    .eq("user_id", userId);

  if (memErr) {
    console.error("listMyAdvertiserAccounts memberships", memErr);
    return { ok: false, message: ADS_ERRORS.loadFailed };
  }

  const ids = (memberships ?? []).map((m) => m.advertiser_account_id as string);
  if (ids.length === 0) return { ok: true, accounts: [] };

  const roleMap = new Map(
    (memberships ?? []).map((m) => [
      m.advertiser_account_id as string,
      m.role as AdvertiserRole,
    ])
  );

  const { data, error } = await supabase
    .from("advertiser_accounts")
    .select("*")
    .in("id", ids)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listMyAdvertiserAccounts", error);
    return { ok: false, message: ADS_ERRORS.loadFailed };
  }

  return {
    ok: true,
    accounts: (data ?? []).map((row) =>
      mapAccount(row as Record<string, unknown>, roleMap.get(String(row.id)) ?? "viewer")
    ),
  };
}

export type CreateAdvertiserInput = {
  businessName: string;
  legalName?: string | null;
  contactEmail: string;
  contactPhone?: string | null;
  websiteUrl?: string | null;
  countryCode: string;
};

export async function createAdvertiserAccount(
  supabase: AnyClient,
  userId: string,
  input: CreateAdvertiserInput
): Promise<
  | { ok: true; account: AdvertiserAccount }
  | { ok: false; message: string }
> {
  const businessName = input.businessName.trim();
  if (businessName.length < 2 || businessName.length > 120) {
    return { ok: false, message: "Business name must be 2–120 characters." };
  }
  const email = input.contactEmail.trim();
  if (!email.includes("@") || email.length > 160) {
    return { ok: false, message: "Contact email is invalid." };
  }
  const country = validateCountryCode(input.countryCode);
  if (!country.ok) return country;

  let websiteUrl: string | null = null;
  if (input.websiteUrl?.trim()) {
    const url = validateDestinationUrl(input.websiteUrl);
    if (!url.ok) return url;
    websiteUrl = url.url;
  }

  const { data, error } = await supabase
    .from("advertiser_accounts")
    .insert({
      owner_id: userId,
      business_name: businessName,
      legal_name: input.legalName?.trim() || null,
      contact_email: email,
      contact_phone: input.contactPhone?.trim() || null,
      website_url: websiteUrl,
      country_code: country.code,
      status: "draft",
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("createAdvertiserAccount", error);
    return {
      ok: false,
      message: adsUserMessage(error?.message, ADS_ERRORS.saveFailed),
    };
  }

  return {
    ok: true,
    account: mapAccount(data as Record<string, unknown>, "owner"),
  };
}

export async function updateAdvertiserAccount(
  supabase: AnyClient,
  accountId: string,
  input: CreateAdvertiserInput
): Promise<{ ok: true } | { ok: false; message: string }> {
  const businessName = input.businessName.trim();
  if (businessName.length < 2 || businessName.length > 120) {
    return { ok: false, message: "Business name must be 2–120 characters." };
  }
  const email = input.contactEmail.trim();
  if (!email.includes("@") || email.length > 160) {
    return { ok: false, message: "Contact email is invalid." };
  }
  const country = validateCountryCode(input.countryCode);
  if (!country.ok) return country;

  let websiteUrl: string | null = null;
  if (input.websiteUrl?.trim()) {
    const url = validateDestinationUrl(input.websiteUrl);
    if (!url.ok) return url;
    websiteUrl = url.url;
  }

  const { error } = await supabase
    .from("advertiser_accounts")
    .update({
      business_name: businessName,
      legal_name: input.legalName?.trim() || null,
      contact_email: email,
      contact_phone: input.contactPhone?.trim() || null,
      website_url: websiteUrl,
      country_code: country.code,
    })
    .eq("id", accountId);

  if (error) {
    console.error("updateAdvertiserAccount", error);
    return {
      ok: false,
      message: adsUserMessage(error.message, ADS_ERRORS.saveFailed),
    };
  }
  return { ok: true };
}

export async function submitAdvertiserForReview(
  supabase: AnyClient,
  accountId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.rpc("submit_advertiser_for_review", {
    p_account_id: accountId,
  });
  if (error) {
    console.error("submitAdvertiserForReview", error);
    return {
      ok: false,
      message: adsUserMessage(error.message, ADS_ERRORS.submitFailed),
    };
  }
  return { ok: true };
}

export async function addAdvertiserMember(
  supabase: AnyClient,
  accountId: string,
  memberUserId: string,
  role: Exclude<AdvertiserRole, "owner">
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (role === ("owner" as string)) {
    return { ok: false, message: "Cannot assign owner via invite." };
  }
  const { error } = await supabase.from("advertiser_members").insert({
    advertiser_account_id: accountId,
    user_id: memberUserId,
    role,
  });
  if (error) {
    console.error("addAdvertiserMember", error);
    return {
      ok: false,
      message: adsUserMessage(error.message, ADS_ERRORS.saveFailed),
    };
  }
  return { ok: true };
}
