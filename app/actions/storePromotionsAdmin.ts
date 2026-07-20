"use server";

import { revalidatePath } from "next/cache";
import {
  ADMIN_STORE_UNAUTHORIZED,
  assertPlatformAdminDb,
} from "../../lib/store/adminAuth";
import {
  confirmOrderDelivery,
  listShippingProvidersForAdmin,
  listStoreCouponsForAdmin,
  updateOrderFulfillmentLifecycle,
  upsertOrderShipmentTracking,
  upsertShippingProviderAdmin,
  upsertShippingRateAdmin,
  upsertShippingZoneAdmin,
  upsertStoreCouponAdmin,
  listShippingZonesForAdmin,
} from "../../lib/store/promotionsFulfillment";
import {
  parseCouponAdminFormFields,
  parseSortPriority,
  validateAndBuildCouponAdminRpcPayload,
  validateShippingRateFormInput,
} from "../../lib/store/adminUiHelpers";
import {
  isFulfillmentLifecycleStage,
} from "../../lib/store/fulfillmentRules";
import { isShippingProviderKey } from "../../lib/store/shipping";
import { validateShippingZone } from "../../lib/store/shippingProviders";
import {
  isTrackingStatus,
  validateShipmentTracking,
} from "../../lib/store/tracking";
import { createClient, getServerUser } from "../../lib/supabase/server";
import { APP_ROUTES } from "../lib/nav";

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function revalidateSellerAdmin(storeId?: string) {
  revalidatePath(APP_ROUTES.sellerStore);
  revalidatePath(APP_ROUTES.sellerPromotions);
  revalidatePath(APP_ROUTES.sellerShipping);
  revalidatePath(APP_ROUTES.sellerOrders);
  revalidatePath(APP_ROUTES.adminStore);
  void storeId;
}

async function requireStorePromotionsAdmin(storeId: string) {
  const user = await getServerUser();
  if (!user) {
    return {
      ok: false as const,
      message: "Sign in required.",
      requiresAuth: true,
    };
  }
  const supabase = await createClient();
  const isAdmin = await assertPlatformAdminDb(supabase);
  if (!isAdmin) {
    const { data: member } = await supabase
      .from("store_members")
      .select("role,status")
      .eq("store_id", storeId)
      .eq("user_id", user.id)
      .maybeSingle();
    const role = member?.role;
    const active = member?.status === "active";
    if (!active || (role !== "owner" && role !== "manager")) {
      return { ok: false as const, message: ADMIN_STORE_UNAUTHORIZED };
    }
  }
  return { ok: true as const, supabase, user, isAdmin };
}

export async function listStoreCouponsAdminAction(storeId: string) {
  const gate = await requireStorePromotionsAdmin(storeId);
  if (!gate.ok) return gate;
  return listStoreCouponsForAdmin(gate.supabase, storeId);
}

export async function upsertStoreCouponAdminAction(formData: FormData) {
  const fields = parseCouponAdminFormFields(formData);
  if (!fields.storeId) {
    return { ok: false as const, message: "Store id is required." };
  }
  const gate = await requireStorePromotionsAdmin(fields.storeId);
  if (!gate.ok) return gate;

  const built = validateAndBuildCouponAdminRpcPayload(fields);
  if (!built.ok) {
    return { ok: false as const, message: built.message };
  }

  if (fields.couponId) {
    const listed = await listStoreCouponsForAdmin(gate.supabase, fields.storeId);
    if (!listed.ok) return listed;
    if (!listed.rows.some((row) => row.id === fields.couponId)) {
      return { ok: false as const, message: "Coupon not found." };
    }
  }

  const result = await upsertStoreCouponAdmin(gate.supabase, built.payload);

  if (result.ok) {
    revalidateSellerAdmin(fields.storeId);
  }
  return result;
}

export async function toggleStoreCouponStatusAction(formData: FormData) {
  const storeId = formString(formData, "store_id");
  const couponId = formString(formData, "coupon_id");
  const nextStatus = formString(formData, "status");
  if (!storeId || !couponId) {
    return { ok: false as const, message: "Store and coupon id are required." };
  }
  if (nextStatus !== "active" && nextStatus !== "disabled") {
    return { ok: false as const, message: "Status must be active or disabled." };
  }
  const gate = await requireStorePromotionsAdmin(storeId);
  if (!gate.ok) return gate;

  const listed = await listStoreCouponsForAdmin(gate.supabase, storeId);
  if (!listed.ok) return listed;
  const existing = listed.rows.find((r) => r.id === couponId);
  if (!existing) {
    return { ok: false as const, message: "Coupon not found." };
  }

  const result = await upsertStoreCouponAdmin(gate.supabase, {
    p_store_id: storeId,
    p_coupon_id: couponId,
    p_code: existing.code,
    p_discount_type: existing.discount_type,
    p_status: nextStatus,
    p_percent_bps: existing.percent_bps,
    p_fixed_amount_minor: existing.fixed_amount_minor,
    p_currency: existing.currency,
    p_min_subtotal_minor: existing.min_subtotal_minor,
    p_max_discount_minor: existing.max_discount_minor,
    p_starts_at: existing.starts_at,
    p_ends_at: existing.ends_at,
    p_total_usage_limit: existing.total_usage_limit,
    p_per_user_usage_limit: existing.per_user_usage_limit,
    p_promotion_name: existing.promotion_name,
    p_promotion_description: existing.promotion_description,
  });
  if (result.ok) {
    revalidateSellerAdmin(storeId);
  }
  return result;
}

export async function updateFulfillmentLifecycleAction(formData: FormData) {
  const orderId = formString(formData, "order_id");
  const stage = formString(formData, "lifecycle_stage");
  if (!orderId || !stage) {
    return { ok: false as const, message: "Order and lifecycle stage are required." };
  }
  if (!isFulfillmentLifecycleStage(stage)) {
    return { ok: false as const, message: "Invalid lifecycle stage." };
  }
  const user = await getServerUser();
  if (!user) {
    return { ok: false as const, message: "Sign in required.", requiresAuth: true };
  }
  const supabase = await createClient();
  const note = formString(formData, "note").trim();
  if (note.length > 500) {
    return { ok: false as const, message: "Note must be 500 characters or fewer." };
  }
  const result = await updateOrderFulfillmentLifecycle(supabase, {
    orderId,
    lifecycleStage: stage,
    note: note || null,
  });
  if (result.ok) {
    revalidatePath(APP_ROUTES.sellerOrders);
    revalidatePath(`${APP_ROUTES.sellerOrders}/${orderId}`);
    revalidatePath(APP_ROUTES.storeOrders);
    revalidatePath(APP_ROUTES.sellerStore);
  }
  return result;
}

export async function upsertShipmentTrackingAction(formData: FormData) {
  const orderId = formString(formData, "order_id");
  const providerKey = formString(formData, "provider_key");
  const trackingNumber = formString(formData, "tracking_number");
  if (!orderId || !providerKey || !trackingNumber) {
    return {
      ok: false as const,
      message: "Order, provider, and tracking number are required.",
    };
  }
  if (!isShippingProviderKey(providerKey)) {
    return { ok: false as const, message: "Invalid shipping provider." };
  }
  const trackingStatus = formString(formData, "tracking_status") || "pending";
  if (!isTrackingStatus(trackingStatus)) {
    return { ok: false as const, message: "Invalid tracking status." };
  }
  const parsed = validateShipmentTracking({
    orderId,
    providerKey,
    trackingNumber,
    trackingStatus,
  });
  if (!parsed.ok) {
    return { ok: false as const, message: parsed.message };
  }
  const user = await getServerUser();
  if (!user) {
    return { ok: false as const, message: "Sign in required.", requiresAuth: true };
  }
  const supabase = await createClient();
  const result = await upsertOrderShipmentTracking(supabase, {
    orderId,
    providerKey,
    trackingNumber: parsed.trackingNumber,
    trackingStatus,
    estimatedDeliveryAt: formString(formData, "estimated_delivery_at") || null,
  });
  if (result.ok) {
    revalidatePath(APP_ROUTES.sellerOrders);
    revalidatePath(`${APP_ROUTES.sellerOrders}/${orderId}`);
    revalidatePath(APP_ROUTES.storeOrders);
    revalidatePath(APP_ROUTES.sellerStore);
  }
  return result;
}

export async function confirmOrderDeliveryAction(formData: FormData) {
  const trackingId = formString(formData, "tracking_id");
  if (!trackingId) {
    return { ok: false as const, message: "Tracking id is required." };
  }
  const user = await getServerUser();
  if (!user) {
    return { ok: false as const, message: "Sign in required.", requiresAuth: true };
  }
  const supabase = await createClient();
  const result = await confirmOrderDelivery(supabase, {
    trackingId,
    confirmedBy: "seller",
  });
  if (result.ok) {
    revalidatePath(APP_ROUTES.sellerOrders);
    revalidatePath(APP_ROUTES.storeOrders);
    revalidatePath(APP_ROUTES.sellerStore);
  }
  return result;
}

export async function upsertShippingProviderAdminAction(formData: FormData) {
  const storeId = formString(formData, "store_id");
  if (!storeId) return { ok: false as const, message: "Store id is required." };
  const gate = await requireStorePromotionsAdmin(storeId);
  if (!gate.ok) return gate;
  const providerKey = formString(formData, "provider_key");
  if (!isShippingProviderKey(providerKey)) {
    return { ok: false as const, message: "Invalid shipping provider." };
  }
  const displayName = formString(formData, "display_name").trim();
  if (!displayName) {
    return { ok: false as const, message: "Display name is required." };
  }
  const sortPriority = parseSortPriority(formString(formData, "sort_priority"));
  if (sortPriority == null) {
    return {
      ok: false as const,
      message: "Priority must be an integer between 0 and 100000.",
    };
  }
  const providerId = formString(formData, "provider_id") || null;
  if (providerId) {
    const listed = await listShippingProvidersForAdmin(gate.supabase, storeId);
    if (!listed.ok) return listed;
    if (!listed.rows.some((row) => row.id === providerId)) {
      return { ok: false as const, message: "Shipping provider not found." };
    }
  }
  const result = await upsertShippingProviderAdmin(gate.supabase, {
    p_store_id: storeId,
    p_provider_id: providerId,
    p_provider_key: providerKey,
    p_display_name: displayName,
    p_enabled: formString(formData, "enabled") !== "0",
    p_supports_tracking: formString(formData, "supports_tracking") === "1",
    p_supports_pickup: formString(formData, "supports_pickup") === "1",
    p_supports_international:
      formString(formData, "supports_international") === "1",
    p_sort_priority: sortPriority,
  });
  if (result.ok) revalidateSellerAdmin(storeId);
  return result;
}

export async function upsertShippingZoneAdminAction(formData: FormData) {
  const storeId = formString(formData, "store_id");
  if (!storeId) return { ok: false as const, message: "Store id is required." };
  const gate = await requireStorePromotionsAdmin(storeId);
  if (!gate.ok) return gate;
  const countriesRaw = formString(formData, "country_codes");
  const countryCodes = countriesRaw
    .split(/[\s,]+/)
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
  const regionsRaw = formString(formData, "region_codes");
  const regionCodes = regionsRaw
    .split(/[\s,]+/)
    .map((r) => r.trim().toUpperCase())
    .filter(Boolean);
  const zoneCheck = validateShippingZone({
    name: formString(formData, "name"),
    countryCodes,
    enabled: formString(formData, "enabled") !== "0",
  });
  if (!zoneCheck.ok) {
    return { ok: false as const, message: zoneCheck.message };
  }
  const zoneId = formString(formData, "zone_id") || null;
  if (zoneId) {
    const zones = await listShippingZonesForAdmin(gate.supabase, storeId);
    if (!zones.ok) return zones;
    if (!zones.rows.some((zone) => zone.id === zoneId)) {
      return { ok: false as const, message: "Shipping zone not found." };
    }
  }
  const result = await upsertShippingZoneAdmin(gate.supabase, {
    p_store_id: storeId,
    p_zone_id: zoneId,
    p_name: formString(formData, "name"),
    p_country_codes: countryCodes,
    p_region_codes: regionCodes,
    p_enabled: formString(formData, "enabled") !== "0",
  });
  if (result.ok) revalidateSellerAdmin(storeId);
  return result;
}

export async function upsertShippingRateAdminAction(formData: FormData) {
  const zoneId = formString(formData, "zone_id");
  const storeId = formString(formData, "store_id");
  if (!zoneId) return { ok: false as const, message: "Zone id is required." };
  if (!storeId) return { ok: false as const, message: "Store id is required." };
  const gate = await requireStorePromotionsAdmin(storeId);
  if (!gate.ok) return gate;

  const zones = await listShippingZonesForAdmin(gate.supabase, storeId);
  if (!zones.ok) return zones;
  if (!zones.rows.some((zone) => zone.id === zoneId)) {
    return { ok: false as const, message: "Shipping zone not found." };
  }

  const rateCheck = validateShippingRateFormInput({
    serviceType: formString(formData, "service_type") || "standard",
    feeMinorRaw: formString(formData, "fee_minor"),
    currency: formString(formData, "currency") || "USD",
  });
  if (!rateCheck.ok) {
    return { ok: false as const, message: rateCheck.message };
  }

  const providerId = formString(formData, "provider_id") || null;
  if (providerId) {
    const providers = await listShippingProvidersForAdmin(gate.supabase, storeId);
    if (!providers.ok) return providers;
    if (!providers.rows.some((row) => row.id === providerId)) {
      return {
        ok: false as const,
        message: "Shipping provider does not belong to this store.",
      };
    }
  }

  const result = await upsertShippingRateAdmin(gate.supabase, {
    p_zone_id: zoneId,
    p_rate_id: formString(formData, "rate_id") || null,
    p_provider_id: providerId,
    p_service_type: rateCheck.serviceType,
    p_fee_minor: rateCheck.feeMinor,
    p_currency: rateCheck.currency,
    p_enabled: formString(formData, "enabled") !== "0",
  });
  if (result.ok) revalidateSellerAdmin(storeId);
  return result;
}
