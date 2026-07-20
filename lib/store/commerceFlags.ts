/**
 * Commerce Safety V1 — checkout/order-create gate.
 *
 * Database (`store_commerce_settings.checkout_confirm_enabled`) is the source of truth
 * for enabling commerce confirm / order create.
 *
 * Environment may only force an emergency OFF override; it cannot enable
 * commerce when the DB gate is off.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/** Emergency kill switch: STORE_COMMERCE_EMERGENCY_DISABLE=1 forces OFF. */
export function isCommerceEmergencyDisabled(): boolean {
  return process.env.STORE_COMMERCE_EMERGENCY_DISABLE === "1";
}

/**
 * Effective app-side commerce availability.
 * - Emergency env OFF → false
 * - Else DB RPC `get_store_commerce_checkout_enabled`
 * - On RPC failure → false (fail-closed)
 */
export async function isStoreCommerceCheckoutEnabled(
  supabase: SupabaseClient
): Promise<boolean> {
  if (isCommerceEmergencyDisabled()) return false;

  const { data, error } = await supabase.rpc(
    "get_store_commerce_checkout_enabled"
  );
  if (error) return false;
  return data === true;
}

export const COMMERCE_CHECKOUT_DISABLED_MESSAGE =
  "Store checkout confirmation is disabled.";
