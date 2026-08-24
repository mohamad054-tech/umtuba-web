/**
 * Product reviews — persisted buyer reviews after delivery.
 * No invented ratings. Sellers cannot review their own products.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

type AnyClient = SupabaseClient;

export const SUBMIT_STORE_PRODUCT_REVIEW_RPC = "submit_store_product_review";

export type ProductReviewRow = {
  id: string;
  product_id: string;
  order_id: string;
  buyer_id: string;
  rating: number;
  body: string | null;
  status: "published" | "hidden";
  created_at: string;
};

export function validateReviewRating(
  raw: unknown
): { ok: true; rating: number } | { ok: false; message: string } {
  const rating = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, message: "Rating must be a whole number from 1 to 5." };
  }
  return { ok: true, rating };
}

export function validateReviewBody(
  raw: unknown
): { ok: true; body: string | null } | { ok: false; message: string } {
  if (raw == null || raw === "") return { ok: true, body: null };
  if (typeof raw !== "string") {
    return { ok: false, message: "Review text is invalid." };
  }
  const body = raw.trim();
  if (body.length === 0) return { ok: true, body: null };
  if (body.length < 8) {
    return { ok: false, message: "Review text must be at least 8 characters." };
  }
  if (body.length > 4000) {
    return { ok: false, message: "Review text is too long." };
  }
  return { ok: true, body };
}

export function canBuyerWriteReview(input: {
  buyerId: string;
  orderBuyerId: string;
  orderStatus: string;
  productId: string;
  orderProductIds: readonly string[];
  sellerUserId?: string | null;
}): { ok: true } | { ok: false; message: string } {
  if (!input.buyerId || input.buyerId !== input.orderBuyerId) {
    return { ok: false, message: "Only the buyer can review this order." };
  }
  if (input.sellerUserId && input.sellerUserId === input.buyerId) {
    return { ok: false, message: "Sellers cannot review their own products." };
  }
  if (input.orderStatus !== "delivered" && input.orderStatus !== "returned") {
    return {
      ok: false,
      message: "Reviews open after the order is delivered.",
    };
  }
  if (!input.orderProductIds.includes(input.productId)) {
    return { ok: false, message: "This product was not on the order." };
  }
  return { ok: true };
}

export function publicReviewAverage(
  reviews: ReadonlyArray<Pick<ProductReviewRow, "rating" | "status">>
): number | null {
  const published = reviews.filter((row) => row.status === "published");
  if (published.length === 0) return null;
  const sum = published.reduce((acc, row) => acc + row.rating, 0);
  return Math.round((sum / published.length) * 10) / 10;
}

export async function listPublishedProductReviews(
  supabase: AnyClient,
  productId: string
): Promise<ProductReviewRow[]> {
  const { data, error } = await supabase
    .from("store_product_reviews")
    .select("id, product_id, order_id, buyer_id, rating, body, status, created_at")
    .eq("product_id", productId)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error || !data) return [];
  return data as ProductReviewRow[];
}
