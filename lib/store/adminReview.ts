import type { SupabaseClient } from "@supabase/supabase-js";

type AnyClient = SupabaseClient;

export const STORE_ADMIN_REVIEW_RPCS = [
  "admin_approve_seller_application",
  "admin_reject_seller_application",
  "admin_suspend_seller_application",
  "admin_approve_store_product",
  "admin_reject_store_product",
  "admin_return_store_product_for_revision",
  "admin_store_moderation_queue_counts",
  "admin_list_seller_applications",
  "admin_list_store_products_for_moderation",
] as const;

export type StoreAdminReviewRpc = (typeof STORE_ADMIN_REVIEW_RPCS)[number];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isStoreAdminUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export function validateRejectionReason(
  note: string
): { ok: true; note: string } | { ok: false; message: string } {
  const trimmed = note.trim();
  if (trimmed.length < 3) {
    return { ok: false, message: "Rejection reason is required." };
  }
  if (trimmed.length > 1000) {
    return { ok: false, message: "Rejection reason is too long." };
  }
  return { ok: true, note: trimmed };
}

export function validateRevisionReason(
  note: string
): { ok: true; note: string } | { ok: false; message: string } {
  const trimmed = note.trim();
  if (trimmed.length < 3) {
    return { ok: false, message: "Revision reason is required." };
  }
  if (trimmed.length > 1000) {
    return { ok: false, message: "Revision reason is too long." };
  }
  return { ok: true, note: trimmed };
}

export function assertSellerApplicationAction(
  status: string,
  action: "approve" | "reject" | "suspend"
): { ok: true } | { ok: false; message: string } {
  if (action === "approve" || action === "reject") {
    if (status !== "pending") {
      return { ok: false, message: "Seller application is not pending." };
    }
    return { ok: true };
  }
  if (status === "suspended") {
    return { ok: false, message: "Seller application is already suspended." };
  }
  if (status !== "pending" && status !== "approved") {
    return {
      ok: false,
      message: "Only pending or approved seller applications can be suspended.",
    };
  }
  return { ok: true };
}

export function assertProductModerationAction(
  status: string,
  moderationStatus: string,
  action: "approve" | "reject" | "return"
): { ok: true } | { ok: false; message: string } {
  if (action !== "approve" && action !== "reject" && action !== "return") {
    return { ok: false, message: "Unsupported product moderation action." };
  }
  if (
    moderationStatus !== "pending" ||
    (status !== "in_review" && status !== "pending_review")
  ) {
    return { ok: false, message: "Product is not awaiting moderation." };
  }
  return { ok: true };
}

/** Mirrors DB gate in admin_approve_store_product / pending queue filters. */
export function assertStoreEligibleForProductApproval(
  storeStatus: string,
  verificationStatus: string
): { ok: true } | { ok: false; message: string } {
  if (storeStatus === "active" && verificationStatus === "verified") {
    return { ok: true };
  }
  return {
    ok: false,
    message: "This store is not eligible for product approval.",
  };
}

export function mapStoreAdminRpcError(
  message: string | undefined,
  fallback: string
): string {
  const raw = (message || "").toLowerCase();
  if (raw.includes("not pending") || raw.includes("not awaiting")) {
    return "This item is no longer awaiting review.";
  }
  if (raw.includes("not found")) {
    return "Item not found.";
  }
  if (raw.includes("rejection reason")) {
    return "Rejection reason is required.";
  }
  if (raw.includes("revision reason")) {
    return "Revision reason is required.";
  }
  if (raw.includes("already suspended")) {
    return "This application is already suspended.";
  }
  if (raw.includes("platform admin") || raw.includes("authentication")) {
    return "You don’t have permission to perform this action.";
  }
  if (raw.includes("already linked")) {
    return "This application is already linked to a store.";
  }
  if (raw.includes("not eligible for product approval")) {
    return "This store is not eligible for product approval.";
  }
  return fallback;
}

async function callAdminRpc(
  supabase: AnyClient,
  name: StoreAdminReviewRpc,
  args: Record<string, unknown>,
  fallback: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.rpc(name, args);
  if (error) {
    console.error(name, error);
    return {
      ok: false,
      message: mapStoreAdminRpcError(error.message, fallback),
    };
  }
  return { ok: true };
}

export async function approveSellerApplicationAdmin(
  supabase: AnyClient,
  applicationId: string
) {
  if (!isStoreAdminUuid(applicationId)) {
    return { ok: false as const, message: "Invalid application id." };
  }
  return callAdminRpc(
    supabase,
    "admin_approve_seller_application",
    { p_application_id: applicationId.trim() },
    "Unable to approve seller application."
  );
}

export async function rejectSellerApplicationAdmin(
  supabase: AnyClient,
  applicationId: string,
  note: string
) {
  if (!isStoreAdminUuid(applicationId)) {
    return { ok: false as const, message: "Invalid application id." };
  }
  const reason = validateRejectionReason(note);
  if (!reason.ok) return reason;
  return callAdminRpc(
    supabase,
    "admin_reject_seller_application",
    {
      p_application_id: applicationId.trim(),
      p_note: reason.note,
    },
    "Unable to reject seller application."
  );
}

export async function suspendSellerApplicationAdmin(
  supabase: AnyClient,
  applicationId: string
) {
  if (!isStoreAdminUuid(applicationId)) {
    return { ok: false as const, message: "Invalid application id." };
  }
  return callAdminRpc(
    supabase,
    "admin_suspend_seller_application",
    { p_application_id: applicationId.trim() },
    "Unable to suspend seller application."
  );
}

export async function approveStoreProductAdmin(
  supabase: AnyClient,
  productId: string
) {
  if (!isStoreAdminUuid(productId)) {
    return { ok: false as const, message: "Invalid product id." };
  }
  return callAdminRpc(
    supabase,
    "admin_approve_store_product",
    { p_product_id: productId.trim() },
    "Unable to approve product."
  );
}

export async function rejectStoreProductAdmin(
  supabase: AnyClient,
  productId: string,
  note: string
) {
  if (!isStoreAdminUuid(productId)) {
    return { ok: false as const, message: "Invalid product id." };
  }
  const reason = validateRejectionReason(note);
  if (!reason.ok) return reason;
  return callAdminRpc(
    supabase,
    "admin_reject_store_product",
    {
      p_product_id: productId.trim(),
      p_note: reason.note,
    },
    "Unable to reject product."
  );
}

export async function returnStoreProductForRevisionAdmin(
  supabase: AnyClient,
  productId: string,
  note: string
) {
  if (!isStoreAdminUuid(productId)) {
    return { ok: false as const, message: "Invalid product id." };
  }
  const reason = validateRevisionReason(note);
  if (!reason.ok) return reason;
  return callAdminRpc(
    supabase,
    "admin_return_store_product_for_revision",
    {
      p_product_id: productId.trim(),
      p_note: reason.note,
    },
    "Unable to return product for revision."
  );
}
