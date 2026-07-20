"use server";

import { revalidatePath } from "next/cache";
import {
  ADMIN_STORE_UNAUTHORIZED,
  assertPlatformAdminDb,
} from "../../lib/store/adminAuth";
import {
  confirmOrderDelivery,
  listStoreCouponsForAdmin,
  updateOrderFulfillmentLifecycle,
  upsertOrderShipmentTracking,
  upsertShippingProviderAdmin,
  upsertShippingRateAdmin,
  upsertShippingZoneAdmin,
  upsertStoreCouponAdmin,
} from "../../lib/store/promotionsFulfillment";
import { isFulfillmentLifecycleStage } from "../../lib/store/fulfillmentRules";
import {
  isPromotionDiscountType,
  isPromotionStatus,
  validatePromotionCouponDefinition,
} from "../../lib/store/promotionRules";
import { isShippingProviderKey } from "../../lib/store/shipping";
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
  const storeId = formString(formData, "store_id");
  if (!storeId) return { ok: false as const, message: "Store id is required." };
  const gate = await requireStorePromotionsAdmin(storeId);
  if (!gate.ok) return gate;

  const discountType = formString(formData, "discount_type");
  const status = formString(formData, "status") || "active";
  if (!isPromotionDiscountType(discountType)) {
    return { ok: false as const, message: "Invalid discount type." };
  }
  if (!isPromotionStatus(status)) {
    return { ok: false as const, message: "Invalid coupon status." };
  }

  const minSubtotal = Number(formString(formData, "min_subtotal_minor") || "0");
  const percentBpsRaw = formString(formData, "percent_bps");
  const fixedRaw = formString(formData, "fixed_amount_minor");
  const maxDiscountRaw = formString(formData, "max_discount_minor");

  const definition = validatePromotionCouponDefinition({
    code: formString(formData, "code"),
    status,
    discountType,
    percentBps: percentBpsRaw ? Number(percentBpsRaw) : null,
    fixedAmountMinor: fixedRaw ? Number(fixedRaw) : null,
    currency: formString(formData, "currency") || null,
    minSubtotalMinor: minSubtotal,
    maxDiscountMinor: maxDiscountRaw ? Number(maxDiscountRaw) : null,
  });
  if (!definition.ok) {
    return { ok: false as const, message: definition.message };
  }

  const result = await upsertStoreCouponAdmin(gate.supabase, {
    p_store_id: storeId,
    p_coupon_id: formString(formData, "coupon_id") || null,
    p_code: formString(formData, "code"),
    p_discount_type: formString(formData, "discount_type"),
    p_status: formString(formData, "status") || "active",
    p_percent_bps: formString(formData, "percent_bps")
      ? Number(formString(formData, "percent_bps"))
      : null,
    p_fixed_amount_minor: formString(formData, "fixed_amount_minor")
      ? Number(formString(formData, "fixed_amount_minor"))
      : null,
    p_currency: formString(formData, "currency") || null,
    p_min_subtotal_minor: Number(formString(formData, "min_subtotal_minor") || "0"),
    p_max_discount_minor: formString(formData, "max_discount_minor")
      ? Number(formString(formData, "max_discount_minor"))
      : null,
    p_promotion_name: formString(formData, "promotion_name") || null,
    p_promotion_description: formString(formData, "promotion_description") || null,
  });

  if (result.ok) {
    revalidatePath(APP_ROUTES.sellerStore);
    revalidatePath(APP_ROUTES.adminStore);
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
  const result = await updateOrderFulfillmentLifecycle(supabase, {
    orderId,
    lifecycleStage: stage,
    note: formString(formData, "note") || null,
  });
  if (result.ok) {
    revalidatePath(APP_ROUTES.sellerOrders);
    revalidatePath(APP_ROUTES.storeOrders);
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
    revalidatePath(APP_ROUTES.storeOrders);
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
  }
  return result;
}

export async function upsertShippingProviderAdminAction(formData: FormData) {
  const storeId = formString(formData, "store_id");
  if (!storeId) return { ok: false as const, message: "Store id is required." };
  const gate = await requireStorePromotionsAdmin(storeId);
  if (!gate.ok) return gate;
  return upsertShippingProviderAdmin(gate.supabase, {
    p_store_id: storeId,
    p_provider_id: formString(formData, "provider_id") || null,
    p_provider_key: formString(formData, "provider_key"),
    p_display_name: formString(formData, "display_name"),
    p_enabled: formString(formData, "enabled") !== "0",
  });
}

export async function upsertShippingZoneAdminAction(formData: FormData) {
  const storeId = formString(formData, "store_id");
  if (!storeId) return { ok: false as const, message: "Store id is required." };
  const gate = await requireStorePromotionsAdmin(storeId);
  if (!gate.ok) return gate;
  const countries = formString(formData, "country_codes_json");
  let countryCodes: string[] = [];
  try {
    countryCodes = countries ? (JSON.parse(countries) as string[]) : [];
  } catch {
    return { ok: false as const, message: "country_codes_json is invalid." };
  }
  return upsertShippingZoneAdmin(gate.supabase, {
    p_store_id: storeId,
    p_zone_id: formString(formData, "zone_id") || null,
    p_name: formString(formData, "name"),
    p_country_codes: countryCodes,
    p_enabled: formString(formData, "enabled") !== "0",
  });
}

export async function upsertShippingRateAdminAction(formData: FormData) {
  const zoneId = formString(formData, "zone_id");
  if (!zoneId) return { ok: false as const, message: "Zone id is required." };
  const user = await getServerUser();
  if (!user) {
    return { ok: false as const, message: "Sign in required.", requiresAuth: true };
  }
  const supabase = await createClient();
  return upsertShippingRateAdmin(supabase, {
    p_zone_id: zoneId,
    p_rate_id: formString(formData, "rate_id") || null,
    p_provider_id: formString(formData, "provider_id") || null,
    p_service_type: formString(formData, "service_type") || "standard",
    p_fee_minor: Number(formString(formData, "fee_minor") || "0"),
    p_currency: formString(formData, "currency") || "USD",
    p_enabled: formString(formData, "enabled") !== "0",
  });
}
