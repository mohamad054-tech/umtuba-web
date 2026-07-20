import type { SupabaseClient } from "@supabase/supabase-js";
import {
  decideCommerceConfirmAllowed,
  isStuckReservation,
  mapCommerceSafetyRpcError,
  type ReservationStatus,
} from "./commerceSafety";

type AnyClient = SupabaseClient;

export type CommerceGateSnapshot = {
  dbEnabled: boolean;
  purchasesAvailable: boolean;
  message: string | null;
};

export async function loadCommerceConfirmGate(
  supabase: AnyClient
): Promise<CommerceGateSnapshot> {
  const { data, error } = await supabase
    .from("store_commerce_config")
    .select("key, value")
    .eq("key", "commerce_confirm_enabled")
    .maybeSingle();

  // Fail closed if config cannot be read.
  if (error) {
    return {
      dbEnabled: false,
      purchasesAvailable: false,
      message:
        "Purchases are not currently available. You can still browse and save items to your cart.",
    };
  }

  const dbEnabled = Number(data?.value ?? 0) === 1;
  const decision = decideCommerceConfirmAllowed({ dbEnabled });
  return {
    dbEnabled,
    purchasesAvailable: decision.allowed,
    message: decision.allowed ? null : decision.message,
  };
}

export type AdminReservationRow = {
  id: string;
  checkout_session_id: string;
  order_id: string | null;
  store_id: string;
  product_id: string;
  variant_id: string;
  quantity: number;
  status: ReservationStatus | string;
  expires_at: string;
  release_reason: string | null;
  created_at: string;
  updated_at: string;
  released_at: string | null;
  is_stuck_past_expiry: boolean;
};

export async function adminListInventoryReservations(
  supabase: AnyClient,
  input: {
    status?: string | null;
    storeId?: string | null;
    stuckOnly?: boolean;
    limit?: number;
  } = {}
): Promise<
  | { ok: true; data: AdminReservationRow[] }
  | { ok: false; message: string }
> {
  const { data, error } = await supabase.rpc("admin_list_inventory_reservations", {
    p_status: input.status ?? null,
    p_store_id: input.storeId ?? null,
    p_stuck_only: Boolean(input.stuckOnly),
    p_limit: input.limit ?? 100,
  });

  if (error) {
    return { ok: false, message: mapCommerceSafetyRpcError(error.message) };
  }

  const rows = (Array.isArray(data) ? data : []) as AdminReservationRow[];
  // Defense in depth: never surface unexpected PII keys if RPC shape changes.
  const sanitized = rows.map((row) => ({
    id: String(row.id),
    checkout_session_id: String(row.checkout_session_id),
    order_id: row.order_id ? String(row.order_id) : null,
    store_id: String(row.store_id),
    product_id: String(row.product_id),
    variant_id: String(row.variant_id),
    quantity: Number(row.quantity) || 0,
    status: String(row.status),
    expires_at: String(row.expires_at),
    release_reason: row.release_reason ? String(row.release_reason) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    released_at: row.released_at ? String(row.released_at) : null,
    is_stuck_past_expiry:
      Boolean(row.is_stuck_past_expiry) ||
      isStuckReservation({
        status: String(row.status),
        expiresAtIso: String(row.expires_at),
      }),
  }));

  return { ok: true, data: sanitized };
}

export async function adminSetCommerceConfirmEnabled(
  supabase: AnyClient,
  enabled: boolean
): Promise<
  | { ok: true; data: { commerce_confirm_enabled: boolean } }
  | { ok: false; message: string }
> {
  const { data, error } = await supabase.rpc("admin_set_commerce_confirm_enabled", {
    p_enabled: enabled,
  });
  if (error) {
    return { ok: false, message: mapCommerceSafetyRpcError(error.message) };
  }
  const payload = (data ?? {}) as { commerce_confirm_enabled?: boolean };
  return {
    ok: true,
    data: { commerce_confirm_enabled: Boolean(payload.commerce_confirm_enabled) },
  };
}

export async function buyerCancelStoreOrder(
  supabase: AnyClient,
  orderId: string,
  note?: string
): Promise<
  | {
      ok: true;
      data: {
        orderId: string;
        status: string;
        paymentStatus: string;
        unchanged: boolean;
      };
    }
  | { ok: false; message: string }
> {
  if (!orderId.trim()) {
    return { ok: false, message: "Order id is required." };
  }
  const { data, error } = await supabase.rpc("buyer_cancel_store_order", {
    p_order_id: orderId,
    p_note: note?.trim() || null,
  });
  if (error) {
    return { ok: false, message: mapCommerceSafetyRpcError(error.message) };
  }
  const payload = (data ?? {}) as Record<string, unknown>;
  return {
    ok: true,
    data: {
      orderId: String(payload.order_id ?? orderId),
      status: String(payload.status ?? "cancelled"),
      paymentStatus: String(payload.payment_status ?? "pending"),
      unchanged: Boolean(payload.unchanged),
    },
  };
}
