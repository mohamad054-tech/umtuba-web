"use server";

import { revalidatePath } from "next/cache";
import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  SUBMIT_STORE_PRODUCT_REVIEW_RPC,
  validateReviewBody,
  validateReviewRating,
} from "../../lib/store/productReviews";

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function submitStoreProductReviewAction(formData: FormData) {
  const user = await getServerUser();
  if (!user) {
    return { ok: false as const, message: "Sign in required.", requiresAuth: true };
  }

  const orderId = formString(formData, "order_id").trim();
  const productId = formString(formData, "product_id").trim();
  const storeSlug = formString(formData, "store_slug").trim();
  const productSlug = formString(formData, "product_slug").trim();
  const rating = validateReviewRating(formString(formData, "rating"));
  const body = validateReviewBody(formString(formData, "body"));
  if (!orderId || !productId) {
    return { ok: false as const, message: "Order and product are required." };
  }
  if (!rating.ok) return { ok: false as const, message: rating.message };
  if (!body.ok) return { ok: false as const, message: body.message };

  const supabase = await createClient();
  const { error } = await supabase.rpc(SUBMIT_STORE_PRODUCT_REVIEW_RPC, {
    p_order_id: orderId,
    p_product_id: productId,
    p_rating: rating.rating,
    p_body: body.body,
  });
  if (error) {
    return {
      ok: false as const,
      message: error.message || "Review could not be saved.",
    };
  }

  if (storeSlug && productSlug) {
    revalidatePath(`/store/${storeSlug}/product/${productSlug}`);
  }
  return { ok: true as const };
}
