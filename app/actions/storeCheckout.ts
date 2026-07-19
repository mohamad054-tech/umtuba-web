"use server";

import { revalidatePath } from "next/cache";
import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  confirmCheckoutQuote,
  createCheckoutQuote,
  listBuyerAddresses,
  listShippingMethodsForStores,
  upsertBuyerAddress,
} from "../../lib/store/checkout";
import { getCartSummary } from "../../lib/store/cart";
import { APP_ROUTES } from "../lib/nav";

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function addressFromForm(formData: FormData) {
  return {
    full_name: formString(formData, "full_name"),
    phone: formString(formData, "phone"),
    email: formString(formData, "email"),
    country_code: formString(formData, "country_code"),
    region: formString(formData, "region"),
    city: formString(formData, "city"),
    postal_code: formString(formData, "postal_code"),
    address_line1: formString(formData, "address_line1"),
    address_line2: formString(formData, "address_line2"),
    delivery_instructions: formString(formData, "delivery_instructions"),
  };
}

export async function getCheckoutBootstrapAction() {
  const user = await getServerUser();
  if (!user) {
    return { ok: false as const, message: "Sign in required.", requiresAuth: true };
  }
  const supabase = await createClient();
  const cart = await getCartSummary(supabase, user.id);
  if (!cart.ok) return cart;
  const addresses = await listBuyerAddresses(supabase, user.id);
  if (!addresses.ok) return addresses;
  const storeIds = cart.data.groups.map((g) => g.storeId);
  const shipping = await listShippingMethodsForStores(supabase, storeIds);
  if (!shipping.ok) return shipping;
  return {
    ok: true as const,
    data: {
      cart: cart.data,
      addresses: addresses.data,
      shippingMethods: shipping.data,
    },
  };
}

export async function saveCheckoutAddressAction(formData: FormData) {
  const user = await getServerUser();
  if (!user) {
    return { ok: false as const, message: "Sign in required.", requiresAuth: true };
  }
  const supabase = await createClient();
  const result = await upsertBuyerAddress(supabase, user.id, {
    ...addressFromForm(formData),
    label: formString(formData, "label") || undefined,
    is_default: formString(formData, "is_default") === "1",
    id: formString(formData, "address_id") || undefined,
  });
  if (result.ok) {
    revalidatePath(APP_ROUTES.storeCheckout);
  }
  return result;
}

export async function createCheckoutQuoteAction(formData: FormData) {
  const user = await getServerUser();
  if (!user) {
    return { ok: false as const, message: "Sign in required.", requiresAuth: true };
  }
  const supabase = await createClient();
  const shippingRaw = formString(formData, "shipping_selections_json");
  let shippingSelections: Record<string, string> = {};
  try {
    shippingSelections = shippingRaw ? JSON.parse(shippingRaw) : {};
  } catch {
    return { ok: false as const, message: "Shipping selections are invalid." };
  }

  const idempotencyKey =
    formString(formData, "idempotency_key") ||
    `checkout:${user.id}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;

  const result = await createCheckoutQuote(supabase, {
    address: addressFromForm(formData),
    billing: addressFromForm(formData),
    shippingSelections,
    couponCode: formString(formData, "coupon_code") || undefined,
    idempotencyKey,
  });
  return result;
}

export async function confirmCheckoutQuoteAction(formData: FormData) {
  const user = await getServerUser();
  if (!user) {
    return { ok: false as const, message: "Sign in required.", requiresAuth: true };
  }
  const quoteId = formString(formData, "quote_id");
  if (!quoteId) {
    return { ok: false as const, message: "Missing checkout quote." };
  }
  const supabase = await createClient();
  const result = await confirmCheckoutQuote(supabase, quoteId);
  if (result.ok) {
    revalidatePath(APP_ROUTES.storeCart);
    revalidatePath(APP_ROUTES.storeCheckout);
    revalidatePath(APP_ROUTES.store);
  }
  return result;
}
