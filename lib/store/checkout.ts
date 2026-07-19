import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapCheckoutRpcError,
  validateCheckoutAddress,
  type CheckoutAddress,
  type CheckoutAddressInput,
} from "./checkoutRules";

type AnyClient = SupabaseClient;

export type CheckoutActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; requiresAuth?: boolean };

export type BuyerAddressRow = CheckoutAddress & {
  id: string;
  label: string | null;
  is_default: boolean;
};

export async function listBuyerAddresses(
  supabase: AnyClient,
  userId: string
): Promise<CheckoutActionResult<BuyerAddressRow[]>> {
  const { data, error } = await supabase
    .from("buyer_addresses")
    .select(
      "id, label, full_name, phone, email, country_code, region, city, postal_code, address_line1, address_line2, delivery_instructions, is_default"
    )
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return { ok: false, message: error.message || "Could not load addresses." };
  }
  return { ok: true, data: (data ?? []) as BuyerAddressRow[] };
}

export async function upsertBuyerAddress(
  supabase: AnyClient,
  userId: string,
  input: CheckoutAddressInput & { label?: string; is_default?: boolean; id?: string }
): Promise<CheckoutActionResult<BuyerAddressRow>> {
  const validated = validateCheckoutAddress(input);
  if (!validated.ok) return validated;

  if (input.is_default) {
    await supabase
      .from("buyer_addresses")
      .update({ is_default: false })
      .eq("user_id", userId)
      .eq("is_default", true);
  }

  const row = {
    user_id: userId,
    label: input.label?.trim() || null,
    ...validated.address,
    is_default: Boolean(input.is_default),
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("buyer_addresses")
      .update(row)
      .eq("id", input.id)
      .eq("user_id", userId)
      .select(
        "id, label, full_name, phone, email, country_code, region, city, postal_code, address_line1, address_line2, delivery_instructions, is_default"
      )
      .maybeSingle();
    if (error || !data) {
      return { ok: false, message: error?.message || "Could not update address." };
    }
    return { ok: true, data: data as BuyerAddressRow };
  }

  const { data, error } = await supabase
    .from("buyer_addresses")
    .insert(row)
    .select(
      "id, label, full_name, phone, email, country_code, region, city, postal_code, address_line1, address_line2, delivery_instructions, is_default"
    )
    .maybeSingle();
  if (error || !data) {
    return { ok: false, message: error?.message || "Could not save address." };
  }
  return { ok: true, data: data as BuyerAddressRow };
}

export async function listShippingMethodsForStores(
  supabase: AnyClient,
  storeIds: string[]
): Promise<
  CheckoutActionResult<
    Array<{
      id: string;
      store_id: string;
      code: string;
      name: string;
      fee_minor: number;
      currency: string;
      free_above_subtotal_minor: number | null;
      estimate_text: string | null;
    }>
  >
> {
  if (storeIds.length === 0) return { ok: true, data: [] };
  const { data, error } = await supabase
    .from("store_shipping_methods")
    .select(
      "id, store_id, code, name, fee_minor, currency, free_above_subtotal_minor, estimate_text"
    )
    .in("store_id", storeIds)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) {
    return { ok: false, message: error.message || "Could not load shipping methods." };
  }
  return { ok: true, data: (data ?? []) as never };
}

export async function createCheckoutQuote(
  supabase: AnyClient,
  input: {
    address: CheckoutAddressInput;
    billing?: CheckoutAddressInput;
    shippingSelections: Record<string, string>;
    couponCode?: string;
    idempotencyKey: string;
  }
): Promise<CheckoutActionResult<Record<string, unknown>>> {
  const address = validateCheckoutAddress(input.address);
  if (!address.ok) return address;
  const billing = validateCheckoutAddress(input.billing ?? input.address);
  if (!billing.ok) return billing;

  const { data, error } = await supabase.rpc("create_store_checkout_quote", {
    p_address: address.address,
    p_billing: billing.address,
    p_shipping_selections: input.shippingSelections,
    p_coupon_code: input.couponCode ?? null,
    p_idempotency_key: input.idempotencyKey,
  });

  if (error) {
    return { ok: false, message: mapCheckoutRpcError(error.message) };
  }
  return { ok: true, data: (data ?? {}) as Record<string, unknown> };
}

export async function confirmCheckoutQuote(
  supabase: AnyClient,
  quoteId: string
): Promise<CheckoutActionResult<Record<string, unknown>>> {
  const { data, error } = await supabase.rpc("confirm_store_checkout_quote", {
    p_quote_id: quoteId,
  });
  if (error) {
    return { ok: false, message: mapCheckoutRpcError(error.message) };
  }
  return { ok: true, data: (data ?? {}) as Record<string, unknown> };
}
