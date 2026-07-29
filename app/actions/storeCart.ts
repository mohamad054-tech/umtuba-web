"use server";

import { revalidatePath } from "next/cache";
import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  addToCart,
  clearCart,
  getCartSummary,
  removeCartItem,
  updateCartQuantity,
} from "../../lib/store/cart";
import type { CartSummary } from "../../lib/store/cartRules";

export type CartMutationResult =
  | { ok: true; quantity?: number; itemCount?: number; summary?: CartSummary }
  | { ok: false; message: string; requiresAuth?: boolean };

function revalidateCartPaths() {
  revalidatePath("/store/cart");
  revalidatePath("/store/checkout");
  revalidatePath("/store");
}

async function summaryFor(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<CartSummary | undefined> {
  const summary = await getCartSummary(supabase, userId);
  return summary.ok ? summary.data : undefined;
}

export async function getCartSummaryAction(): Promise<
  | { ok: true; summary: CartSummary }
  | { ok: false; message: string; requiresAuth?: boolean }
> {
  const user = await getServerUser();
  if (!user) {
    return { ok: false, message: "Sign in to view your cart.", requiresAuth: true };
  }
  const supabase = await createClient();
  const result = await getCartSummary(supabase, user.id);
  if (!result.ok) return result;
  return { ok: true, summary: result.data };
}

export async function getCartItemCountAction(): Promise<
  | { ok: true; count: number }
  | { ok: false; message: string; requiresAuth?: boolean }
> {
  const result = await getCartSummaryAction();
  if (!result.ok) return result;
  return { ok: true, count: result.summary.itemCount };
}

export async function addToCartAction(input: {
  variantId: string;
  quantity?: number;
  /** Listing-backed PDP must pass this; owned products omit it. */
  sellerListingId?: string | null;
}): Promise<CartMutationResult> {
  const user = await getServerUser();
  if (!user) {
    return { ok: false, message: "Sign in to add items to your cart.", requiresAuth: true };
  }

  const supabase = await createClient();
  const result = await addToCart(supabase, user.id, {
    variantId: input.variantId,
    quantity: input.quantity ?? 1,
    sellerListingId: input.sellerListingId ?? undefined,
  });

  if (!result.ok) return result;

  revalidateCartPaths();
  const summary = await summaryFor(supabase, user.id);
  return {
    ok: true,
    quantity: result.data.quantity,
    itemCount: summary?.itemCount,
    summary,
  };
}

export async function updateCartQuantityAction(input: {
  itemId: string;
  quantity: number;
}): Promise<CartMutationResult> {
  const user = await getServerUser();
  if (!user) {
    return { ok: false, message: "Sign in to update your cart.", requiresAuth: true };
  }

  const supabase = await createClient();
  const result = await updateCartQuantity(supabase, user.id, {
    itemId: input.itemId,
    quantity: input.quantity,
  });

  if (!result.ok) return result;
  revalidateCartPaths();
  const summary = await summaryFor(supabase, user.id);
  return {
    ok: true,
    quantity: result.data.quantity,
    itemCount: summary?.itemCount,
    summary,
  };
}

export async function removeCartItemAction(input: {
  itemId: string;
}): Promise<CartMutationResult> {
  const user = await getServerUser();
  if (!user) {
    return { ok: false, message: "Sign in to update your cart.", requiresAuth: true };
  }

  const supabase = await createClient();
  const result = await removeCartItem(supabase, user.id, input.itemId);
  if (!result.ok) return result;
  revalidateCartPaths();
  const summary = await summaryFor(supabase, user.id);
  return { ok: true, itemCount: summary?.itemCount ?? 0, summary };
}

export async function clearCartAction(): Promise<CartMutationResult> {
  const user = await getServerUser();
  if (!user) {
    return { ok: false, message: "Sign in to update your cart.", requiresAuth: true };
  }

  const supabase = await createClient();
  const result = await clearCart(supabase, user.id);
  if (!result.ok) return result;
  revalidateCartPaths();
  return {
    ok: true,
    itemCount: 0,
    summary: {
      currency: null,
      itemCount: 0,
      subtotalMinor: 0,
      groups: [],
      hasBlockingIssues: false,
    },
  };
}
