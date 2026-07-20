/**
 * Promotions & Fulfillment — Supabase query/RPC wrappers.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { mapPromotionRpcError } from "./promotionRules";
import { mapFulfillmentRpcError } from "./fulfillmentRules";
import { mapTrackingRpcError } from "./tracking";
import { mapShippingAdminRpcError } from "./shippingProviders";

type AnyClient = SupabaseClient;

export type StoreCouponRow = {
  id: string;
  store_id: string | null;
  code: string;
  status: string;
  discount_type: string;
  percent_bps: number | null;
  fixed_amount_minor: number | null;
  currency: string | null;
  min_subtotal_minor: number;
  max_discount_minor: number | null;
  starts_at: string | null;
  ends_at: string | null;
  total_usage_limit: number | null;
  per_user_usage_limit: number | null;
  usage_count: number;
  promotion_name: string | null;
  promotion_description: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderFulfillmentRow = {
  id: string;
  order_id: string;
  store_id: string;
  buyer_id: string;
  lifecycle_stage: string;
  created_at: string;
  updated_at: string;
};

export type OrderShipmentRow = {
  id: string;
  order_id: string;
  fulfillment_id: string | null;
  provider_key: string;
  tracking_number: string;
  tracking_status: string;
  estimated_delivery_at: string | null;
  last_update_at: string | null;
  delivered_at: string | null;
  delivery_confirmed_by: string | null;
  created_at: string;
  updated_at: string;
};

export async function listStoreCouponsForAdmin(
  supabase: AnyClient,
  storeId: string
): Promise<
  | { ok: true; rows: StoreCouponRow[] }
  | { ok: false; message: string }
> {
  const { data, error } = await supabase.rpc("admin_list_store_coupons", {
    p_store_id: storeId,
  });
  if (error) {
    return { ok: false, message: mapPromotionRpcError(error.message) };
  }
  return { ok: true, rows: (data ?? []) as StoreCouponRow[] };
}

export async function upsertStoreCouponAdmin(
  supabase: AnyClient,
  input: Record<string, unknown>
): Promise<{ ok: true; couponId: string } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc("admin_upsert_store_coupon", input);
  if (error) {
    return { ok: false, message: mapPromotionRpcError(error.message) };
  }
  const row = (data ?? {}) as Record<string, unknown>;
  const couponId = String(row.coupon_id ?? "");
  if (!couponId) {
    return { ok: false, message: "Unexpected coupon response." };
  }
  return { ok: true, couponId };
}

export async function getOrderFulfillment(
  supabase: AnyClient,
  orderId: string
): Promise<
  | { ok: true; fulfillment: OrderFulfillmentRow; events: Array<Record<string, unknown>> }
  | { ok: false; message: string }
> {
  const { data, error } = await supabase.rpc("get_order_fulfillment", {
    p_order_id: orderId,
  });
  if (error) {
    return { ok: false, message: mapFulfillmentRpcError(error.message) };
  }
  const payload = (data ?? {}) as Record<string, unknown>;
  const fulfillment = payload.fulfillment as OrderFulfillmentRow | undefined;
  if (!fulfillment?.id) {
    return { ok: false, message: "Fulfillment not found." };
  }
  return {
    ok: true,
    fulfillment,
    events: (payload.events as Array<Record<string, unknown>>) ?? [],
  };
}

export async function updateOrderFulfillmentLifecycle(
  supabase: AnyClient,
  input: {
    orderId: string;
    lifecycleStage: string;
    note?: string | null;
  }
): Promise<{ ok: true; stage: string } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc("update_order_fulfillment_lifecycle", {
    p_order_id: input.orderId,
    p_lifecycle_stage: input.lifecycleStage,
    p_note: input.note ?? null,
  });
  if (error) {
    return { ok: false, message: mapFulfillmentRpcError(error.message) };
  }
  const row = (data ?? {}) as Record<string, unknown>;
  return { ok: true, stage: String(row.lifecycle_stage ?? input.lifecycleStage) };
}

export async function upsertOrderShipmentTracking(
  supabase: AnyClient,
  input: {
    orderId: string;
    providerKey: string;
    trackingNumber: string;
    trackingStatus?: string;
    estimatedDeliveryAt?: string | null;
  }
): Promise<{ ok: true; trackingId: string } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc("upsert_order_shipment_tracking", {
    p_order_id: input.orderId,
    p_provider_key: input.providerKey,
    p_tracking_number: input.trackingNumber,
    p_tracking_status: input.trackingStatus ?? "pending",
    p_estimated_delivery_at: input.estimatedDeliveryAt ?? null,
  });
  if (error) {
    return { ok: false, message: mapTrackingRpcError(error.message) };
  }
  const row = (data ?? {}) as Record<string, unknown>;
  const trackingId = String(row.tracking_id ?? "");
  if (!trackingId) {
    return { ok: false, message: "Unexpected tracking response." };
  }
  return { ok: true, trackingId };
}

export async function confirmOrderDelivery(
  supabase: AnyClient,
  input: { trackingId: string; confirmedBy: string }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.rpc("confirm_order_delivery", {
    p_tracking_id: input.trackingId,
    p_confirmed_by: input.confirmedBy,
  });
  if (error) {
    return { ok: false, message: mapTrackingRpcError(error.message) };
  }
  return { ok: true };
}

export async function upsertShippingProviderAdmin(
  supabase: AnyClient,
  input: Record<string, unknown>
): Promise<{ ok: true; providerId: string } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc("admin_upsert_shipping_provider", input);
  if (error) {
    return { ok: false, message: mapShippingAdminRpcError(error.message) };
  }
  const row = (data ?? {}) as Record<string, unknown>;
  return { ok: true, providerId: String(row.provider_id ?? "") };
}

export async function upsertShippingZoneAdmin(
  supabase: AnyClient,
  input: Record<string, unknown>
): Promise<{ ok: true; zoneId: string } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc("admin_upsert_shipping_zone", input);
  if (error) {
    return { ok: false, message: mapShippingAdminRpcError(error.message) };
  }
  const row = (data ?? {}) as Record<string, unknown>;
  return { ok: true, zoneId: String(row.zone_id ?? "") };
}

export async function upsertShippingRateAdmin(
  supabase: AnyClient,
  input: Record<string, unknown>
): Promise<{ ok: true; rateId: string } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc("admin_upsert_shipping_rate", input);
  if (error) {
    return { ok: false, message: mapShippingAdminRpcError(error.message) };
  }
  const row = (data ?? {}) as Record<string, unknown>;
  return { ok: true, rateId: String(row.rate_id ?? "") };
}

export type ShippingProviderRow = {
  id: string;
  store_id: string;
  provider_key: string;
  display_name: string;
  enabled: boolean;
  supports_tracking: boolean;
  supports_pickup: boolean;
  supports_international: boolean;
  sort_priority: number;
  created_at: string;
  updated_at: string;
};

export type ShippingZoneRow = {
  id: string;
  store_id: string;
  name: string;
  country_codes: string[];
  region_codes: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type ShippingRateRow = {
  id: string;
  zone_id: string;
  provider_id: string | null;
  service_type: string;
  fee_minor: number;
  currency: string;
  min_subtotal_minor: number | null;
  max_subtotal_minor: number | null;
  free_above_subtotal_minor: number | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type CouponTargetingSummaryRow = {
  coupon_id: string;
  product_count: number;
  category_count: number;
  region_count: number;
  store_wide: boolean;
};

export async function listShippingProvidersForAdmin(
  supabase: AnyClient,
  storeId: string
): Promise<
  | { ok: true; rows: ShippingProviderRow[] }
  | { ok: false; message: string }
> {
  const { data, error } = await supabase.rpc("admin_list_shipping_providers", {
    p_store_id: storeId,
  });
  if (error) {
    return { ok: false, message: mapShippingAdminRpcError(error.message) };
  }
  return { ok: true, rows: (data ?? []) as ShippingProviderRow[] };
}

export async function listShippingZonesForAdmin(
  supabase: AnyClient,
  storeId: string
): Promise<{ ok: true; rows: ShippingZoneRow[] } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc("admin_list_shipping_zones", {
    p_store_id: storeId,
  });
  if (error) {
    return { ok: false, message: mapShippingAdminRpcError(error.message) };
  }
  return { ok: true, rows: (data ?? []) as ShippingZoneRow[] };
}

export async function listShippingRatesForAdmin(
  supabase: AnyClient,
  zoneId: string
): Promise<{ ok: true; rows: ShippingRateRow[] } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc("admin_list_shipping_rates", {
    p_zone_id: zoneId,
  });
  if (error) {
    return { ok: false, message: mapShippingAdminRpcError(error.message) };
  }
  return { ok: true, rows: (data ?? []) as ShippingRateRow[] };
}

export async function getCouponTargetingSummary(
  supabase: AnyClient,
  couponId: string
): Promise<
  | { ok: true; summary: CouponTargetingSummaryRow }
  | { ok: false; message: string }
> {
  const { data, error } = await supabase.rpc("admin_coupon_targeting_summary", {
    p_coupon_id: couponId,
  });
  if (error) {
    return { ok: false, message: mapPromotionRpcError(error.message) };
  }
  const row = (data ?? {}) as Record<string, unknown>;
  return {
    ok: true,
    summary: {
      coupon_id: String(row.coupon_id ?? couponId),
      product_count: Number(row.product_count ?? 0),
      category_count: Number(row.category_count ?? 0),
      region_count: Number(row.region_count ?? 0),
      store_wide: Boolean(row.store_wide),
    },
  };
}

export async function getSellerFulfillmentDashboardCounts(
  supabase: AnyClient,
  storeId: string
): Promise<
  | { ok: true; counts: Record<string, unknown> }
  | { ok: false; message: string }
> {
  const { data, error } = await supabase.rpc(
    "seller_fulfillment_dashboard_counts",
    { p_store_id: storeId }
  );
  if (error) {
    return { ok: false, message: mapFulfillmentRpcError(error.message) };
  }
  return { ok: true, counts: (data ?? {}) as Record<string, unknown> };
}

export async function listOrderShipments(
  supabase: AnyClient,
  orderId: string
): Promise<
  | { ok: true; rows: OrderShipmentRow[] }
  | { ok: false; message: string }
> {
  const { data, error } = await supabase
    .from("order_shipments")
    .select(
      "id, order_id, fulfillment_id, provider_key, tracking_number, tracking_status, estimated_delivery_at, last_update_at, delivered_at, delivery_confirmed_by, created_at, updated_at"
    )
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  if (error) {
    return { ok: false, message: mapTrackingRpcError(error.message) };
  }
  return { ok: true, rows: (data ?? []) as OrderShipmentRow[] };
}
