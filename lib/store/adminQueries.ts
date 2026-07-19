import type { SupabaseClient } from "@supabase/supabase-js";

type AnyClient = SupabaseClient;

export type AdminSellerApplicationRow = {
  id: string;
  user_id: string;
  applicant_username: string | null;
  applicant_display_name: string | null;
  proposed_store_name: string;
  proposed_store_slug: string;
  city: string | null;
  country_code: string | null;
  public_contact_email: string | null;
  public_contact_phone: string | null;
  default_currency: string;
  status: string;
  review_note: string | null;
  store_id: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
};

export type AdminStoreProductModerationRow = {
  id: string;
  store_id: string;
  store_slug: string;
  store_name: string;
  owner_user_id: string;
  created_by: string;
  title: string;
  slug: string;
  category_name: string | null;
  status: string;
  moderation_status: string;
  currency: string | null;
  amount_minor: number | null;
  on_hand: number | null;
  reserved: number | null;
  safety_stock: number | null;
  allow_backorder: boolean | null;
  media_path: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminStoreQueueCounts = {
  seller_applications_pending: number;
  products_pending: number;
};

function queryFailed(message?: string) {
  return {
    ok: false as const,
    message: message?.trim() || "Unable to load moderation queue.",
  };
}

export async function adminStoreQueueCounts(
  supabase: AnyClient
): Promise<
  | { ok: true; counts: AdminStoreQueueCounts }
  | { ok: false; message: string }
> {
  const { data, error } = await supabase.rpc(
    "admin_store_moderation_queue_counts"
  );
  if (error) {
    console.error("admin_store_moderation_queue_counts", error);
    return queryFailed();
  }
  const row = (data ?? {}) as Record<string, unknown>;
  return {
    ok: true,
    counts: {
      seller_applications_pending: Number(
        row.seller_applications_pending ?? 0
      ),
      products_pending: Number(row.products_pending ?? 0),
    },
  };
}

export async function adminListSellerApplications(
  supabase: AnyClient,
  filters: { status?: string | null }
): Promise<
  | { ok: true; rows: AdminSellerApplicationRow[] }
  | { ok: false; message: string }
> {
  const { data, error } = await supabase.rpc("admin_list_seller_applications", {
    p_status: filters.status || "pending",
    p_limit: 50,
    p_offset: 0,
  });
  if (error) {
    console.error("admin_list_seller_applications", error);
    return queryFailed();
  }
  return {
    ok: true,
    rows: (data ?? []) as AdminSellerApplicationRow[],
  };
}

export async function adminListStoreProductsForModeration(
  supabase: AnyClient,
  filters: { status?: string | null }
): Promise<
  | { ok: true; rows: AdminStoreProductModerationRow[] }
  | { ok: false; message: string }
> {
  const { data, error } = await supabase.rpc(
    "admin_list_store_products_for_moderation",
    {
      p_status: filters.status || "pending",
      p_limit: 50,
      p_offset: 0,
    }
  );
  if (error) {
    console.error("admin_list_store_products_for_moderation", error);
    return queryFailed();
  }
  return {
    ok: true,
    rows: (data ?? []) as AdminStoreProductModerationRow[],
  };
}
