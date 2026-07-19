import type { SupabaseClient } from "@supabase/supabase-js";
import type { StoreMemberRole } from "./types";
import { canManageCatalog } from "./permissions";
import { isValidSlug, slugify } from "./validators";

type AnyClient = SupabaseClient;

export const SELLER_APPLICATION_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "suspended",
] as const;
export type SellerApplicationStatus = (typeof SELLER_APPLICATION_STATUSES)[number];

/** Statuses that block a user from submitting another application (mirrors DB unique index). */
export const OPEN_SELLER_APPLICATION_STATUSES: SellerApplicationStatus[] = [
  "pending",
  "approved",
  "suspended",
];

export type SellerApplicationRow = {
  id: string;
  user_id: string;
  status: SellerApplicationStatus;
  proposed_store_name: string;
  proposed_store_slug: string;
  proposed_description: string | null;
  country_code: string | null;
  city: string | null;
  public_contact_email: string | null;
  public_contact_phone: string | null;
  default_currency: string;
  store_id: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SellerApplicationResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; message: string };

function normalizeOptionalString(
  value: unknown,
  maxLength: number
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function validateSellerApplicationInput(input: {
  storeName?: unknown;
  slug?: unknown;
  description?: unknown;
  countryCode?: unknown;
  city?: unknown;
  publicContactEmail?: unknown;
  publicContactPhone?: unknown;
  defaultCurrency?: unknown;
}):
  | {
      ok: true;
      value: {
        storeName: string;
        slug: string;
        description: string | null;
        countryCode: string | null;
        city: string | null;
        publicContactEmail: string | null;
        publicContactPhone: string | null;
        defaultCurrency: string;
      };
    }
  | { ok: false; message: string } {
  const storeName =
    typeof input.storeName === "string" ? input.storeName.trim() : "";
  if (storeName.length < 2 || storeName.length > 80) {
    return { ok: false, message: "Store name must be 2–80 characters." };
  }

  const slugRaw =
    typeof input.slug === "string" && input.slug.trim()
      ? slugify(input.slug)
      : slugify(storeName);
  if (!isValidSlug(slugRaw)) {
    return { ok: false, message: "Store slug is invalid." };
  }

  const description = normalizeOptionalString(input.description, 2000);

  let countryCode: string | null = null;
  if (typeof input.countryCode === "string" && input.countryCode.trim()) {
    countryCode = input.countryCode.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(countryCode)) {
      return { ok: false, message: "Country code must be 2 letters." };
    }
  }

  const city = normalizeOptionalString(input.city, 80);

  const publicContactEmail = normalizeOptionalString(
    input.publicContactEmail,
    160
  );
  if (publicContactEmail && !/^\S+@\S+\.\S+$/.test(publicContactEmail)) {
    return { ok: false, message: "Contact email is invalid." };
  }

  const publicContactPhone = normalizeOptionalString(
    input.publicContactPhone,
    40
  );

  const defaultCurrency =
    typeof input.defaultCurrency === "string"
      ? input.defaultCurrency.trim().toUpperCase()
      : "USD";
  if (!/^[A-Z]{3}$/.test(defaultCurrency)) {
    return { ok: false, message: "Default currency must be a 3-letter code." };
  }

  return {
    ok: true,
    value: {
      storeName,
      slug: slugRaw,
      description,
      countryCode,
      city,
      publicContactEmail,
      publicContactPhone,
      defaultCurrency,
    },
  };
}

/**
 * Submit a seller application. Store creation happens only via the
 * service-role `approve_seller_application` RPC — never directly from the app.
 */
export async function applyToBecomeSeller(
  supabase: AnyClient,
  userId: string,
  raw: Record<string, unknown>
): Promise<SellerApplicationResult<SellerApplicationRow>> {
  const existing = await getLatestSellerApplication(supabase, userId);
  if (existing && OPEN_SELLER_APPLICATION_STATUSES.includes(existing.status)) {
    if (existing.status === "approved") {
      return {
        ok: false,
        message: "You already have an approved seller account.",
      };
    }
    return {
      ok: false,
      message: "You already have an open seller application.",
    };
  }

  const parsed = validateSellerApplicationInput(raw);
  if (!parsed.ok) return parsed;

  const { data, error } = await supabase
    .from("seller_applications")
    .insert({
      user_id: userId,
      status: "pending",
      proposed_store_name: parsed.value.storeName,
      proposed_store_slug: parsed.value.slug,
      proposed_description: parsed.value.description,
      country_code: parsed.value.countryCode,
      city: parsed.value.city,
      public_contact_email: parsed.value.publicContactEmail,
      public_contact_phone: parsed.value.publicContactPhone,
      default_currency: parsed.value.defaultCurrency,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("applyToBecomeSeller", error);
    if (error?.code === "23505") {
      return {
        ok: false,
        message:
          "That store slug is already pending review, or you already have an open application.",
      };
    }
    return { ok: false, message: "Unable to submit seller application." };
  }

  return { ok: true, data: data as SellerApplicationRow };
}

/** Most recent application for a user, or null when they have never applied. */
export async function getLatestSellerApplication(
  supabase: AnyClient,
  userId: string
): Promise<SellerApplicationRow | null> {
  const { data } = await supabase
    .from("seller_applications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as SellerApplicationRow | null) ?? null;
}

/**
 * Sellers may only manage catalog when their store role is at least
 * `catalog_editor` **and** the store has been verified by an operator.
 * Mirrors the `enforce_verified_store_for_products` DB trigger.
 */
export function canManageSellerCatalog(input: {
  role: StoreMemberRole | null | undefined;
  storeVerificationStatus: string | null | undefined;
}): boolean {
  return (
    canManageCatalog(input.role) &&
    input.storeVerificationStatus === "verified"
  );
}
