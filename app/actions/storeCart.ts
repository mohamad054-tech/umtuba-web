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
  | { ok: true; quantity?: number; itemCount?: number }
  | { ok: false; message: string; requiresAuth?: boolean };

function revalidateCartPaths() {
  revalidatePath("/store/cart");
  revalidatePath("/store");
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
}): Promise<CartMutationResult> {
  const user = await getServerUser();
  if (!user) {
    return { ok: false, message: "Sign in to add items to your cart.", requiresAuth: true };
  }

  const supabase = await createClient();
  const result = await addToCart(supabase, user.id, {
    variantId: input.variantId,
    quantity: input.quantity ?? 1,
  });

  if (!result.ok) return result;

  revalidateCartPaths();
  const summary = await getCartSummary(supabase, user.id);
  return {
    ok: true,
    quantity: result.data.quantity,
    itemCount: summary.ok ? summary.data.itemCount : undefined,
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
  return { ok: true, quantity: result.data.quantity };
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
  return { ok: true };
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
  return { ok: true };
}
