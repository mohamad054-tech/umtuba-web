"use server";

import { revalidatePath } from "next/cache";
import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  addToWishlist,
  isProductWishlisted,
  removeFromWishlist,
} from "../../lib/store/wishlist";
import { APP_ROUTES } from "../lib/nav";

export type WishlistToggleResult =
  | { ok: true; wishlisted: boolean }
  | { ok: false; message: string; requiresAuth?: boolean };

/**
 * Flips the current save state for a product. Reads the current state
 * server-side so the client never needs to track it — safe against stale UI.
 */
export async function toggleWishlistAction(input: {
  productId: unknown;
}): Promise<WishlistToggleResult> {
  const user = await getServerUser();
  if (!user) {
    return {
      ok: false,
      message: "Sign in to save products to your favorites.",
      requiresAuth: true,
    };
  }

  const supabase = await createClient();
  const currentlyWishlisted = await isProductWishlisted(
    supabase,
    user.id,
    input.productId
  );

  const result = currentlyWishlisted
    ? await removeFromWishlist(supabase, user.id, input.productId)
    : await addToWishlist(supabase, user.id, input.productId);

  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  revalidatePath(APP_ROUTES.storeWishlist);
  return { ok: true, wishlisted: !currentlyWishlisted };
}
