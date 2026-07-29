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
import { ensureDeferredPaymentAttempts } from "../../lib/store/paymentAttempts";
import { rejectClientMoneyFormFields } from "../../lib/store/tradingContracts";
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
  // Reject any client-supplied money fields (totals are server-derived).
  const moneyGate = rejectClientMoneyFormFields((key) => formData.has(key));
  if (!moneyGate.ok) {
    return { ok: false as const, message: moneyGate.message };
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
  const moneyGate = rejectClientMoneyFormFields((key) => formData.has(key));
  if (!moneyGate.ok) {
    return { ok: false as const, message: moneyGate.message };
  }
  const quoteId = formString(formData, "quote_id");
  if (!quoteId) {
    return { ok: false as const, message: "Missing checkout quote." };
  }
  const supabase = await createClient();
  const result = await confirmCheckoutQuote(supabase, quoteId);
  if (!result.ok) {
    return result;
  }

  // Best-effort deferred payment attempt rows (no charge). Failures do not
  // roll back the confirmed order — payment gateways are not live yet.
  const orders =
    (result.data.orders as Array<{ order_id?: string }> | undefined) ?? [];
  const orderIds = orders
    .map((o) => (typeof o.order_id === "string" ? o.order_id : ""))
    .filter(Boolean);

  const { attempts, failures } = await ensureDeferredPaymentAttempts(
    supabase,
    orderIds
  );

  revalidatePath(APP_ROUTES.storeCart);
  revalidatePath(APP_ROUTES.storeCheckout);
  revalidatePath(APP_ROUTES.store);
  revalidatePath(APP_ROUTES.storeOrders);

  return {
    ok: true as const,
    data: {
      ...result.data,
      payment_attempts: attempts,
      payment_attempt_failures: failures,
      payment_recording_incomplete: failures.length > 0,
    },
  };
}

/**
 * Recovery: create missing deferred payment attempts for buyer-owned orders.
 * Does not charge; amount comes from each order row via SECURITY DEFINER RPC.
 */
export async function ensureDeferredPaymentAttemptAction(formData: FormData) {
  const user = await getServerUser();
  if (!user) {
    return {
      ok: false as const,
      message: "Sign in required.",
      requiresAuth: true,
    };
  }

  const single = formString(formData, "order_id").trim();
  const rawList = formString(formData, "order_ids_json").trim();
  let orderIds: string[] = [];
  if (single) {
    orderIds = [single];
  } else if (rawList) {
    try {
      const parsed = JSON.parse(rawList) as unknown;
      if (!Array.isArray(parsed)) {
        return { ok: false as const, message: "order_ids_json must be an array." };
      }
      orderIds = parsed.filter((v): v is string => typeof v === "string");
    } catch {
      return { ok: false as const, message: "order_ids_json is invalid." };
    }
  }

  if (orderIds.length === 0) {
    return { ok: false as const, message: "At least one order id is required." };
  }
  if (orderIds.length > 20) {
    return { ok: false as const, message: "Too many order ids." };
  }

  // Reject client money fields on recovery path too.
  const moneyGate = rejectClientMoneyFormFields((key) => formData.has(key));
  if (!moneyGate.ok) {
    return { ok: false as const, message: moneyGate.message };
  }

  const supabase = await createClient();
  const { attempts, failures } = await ensureDeferredPaymentAttempts(
    supabase,
    orderIds
  );

  if (attempts.length > 0) {
    revalidatePath(APP_ROUTES.storeOrders);
  }

  return {
    ok: true as const,
    data: {
      payment_attempts: attempts,
      payment_attempt_failures: failures,
      payment_recording_incomplete: failures.length > 0,
    },
  };
}
