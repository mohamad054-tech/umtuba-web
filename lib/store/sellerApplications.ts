import type { SupabaseClient } from "@supabase/supabase-js";
import type { StoreMemberRole } from "./types";
import {
  type SellerLifecycleState,
  toSellerLifecycleState,
} from "./commerceReadiness";
import { canManageCatalog } from "./permissions";

type AnyClient = SupabaseClient;

export const SELLER_APPLICATION_STATUSES = [
  "draft",
  "pending",
  "approved",
  "rejected",
  "suspended",
] as const;
export type SellerApplicationStatus = (typeof SELLER_APPLICATION_STATUSES)[number];

/** Statuses that block a user from submitting another application (mirrors DB unique index). */
export const OPEN_SELLER_APPLICATION_STATUSES: SellerApplicationStatus[] = [
  "draft",
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
  /** Seller Self-Service V1 — short store tagline. */
  proposed_tagline?: string | null;
  country_code: string | null;
  city: string | null;
  public_contact_email: string | null;
  public_contact_phone: string | null;
  /** Seller Self-Service V1 — public website / social link. */
  public_contact_url?: string | null;
  default_currency: string;
  /** Seller Self-Service V1 — chosen storefront template. */
  store_template?: string | null;
  return_policy?: string | null;
  shipping_policy?: string | null;
  privacy_policy?: string | null;
  /** Seller Self-Service V1 — wizard resume step (1–6). */
  wizard_step?: number | null;
  store_id: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SellerApplicationResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; message: string };

/**
 * Legacy one-shot apply path — disabled.
 * Seller Self-Service V1 requires the Store Setup Wizard +
 * `submit_my_seller_application` RPC so incomplete pending rows cannot be
 * created from the app. Callers should redirect to `/seller/setup`.
 */
export async function applyToBecomeSeller(
  _supabase: AnyClient,
  _userId: string,
  _raw: Record<string, unknown>
): Promise<SellerApplicationResult<SellerApplicationRow>> {
  return {
    ok: false,
    message:
      "Store setup now uses the wizard. Complete and submit at /seller/setup.",
  };
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
export function sellerApplicationLifecycle(
  status: SellerApplicationStatus | string | null | undefined
): SellerLifecycleState | null {
  return toSellerLifecycleState(status);
}

export function canManageSellerCatalog(input: {
  role: StoreMemberRole | null | undefined;
  storeVerificationStatus: string | null | undefined;
}): boolean {
  return (
    canManageCatalog(input.role) &&
    input.storeVerificationStatus === "verified"
  );
}
