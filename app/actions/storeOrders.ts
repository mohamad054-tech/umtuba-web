"use server";

import { revalidatePath } from "next/cache";
import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  canSellerManageOrders,
  isFulfillmentStatus,
  isOrderStatus,
  nextFulfillmentStatuses,
  nextSellerOrderStatuses,
} from "../../lib/store/orderRules";
import { updateSellerOrderStatus } from "../../lib/store/orders";
import { sellerTransitionPaymentBlocked } from "../../lib/store/sellerOrdersPresentation";
import { buyerCancelStoreOrder } from "../../lib/store/commerceSafetyQueries";
import { mintBuyerDigitalAccessSignedUrl } from "../../lib/store/digitalAccessDelivery";
import { getMembership } from "../../lib/store/sellerStore";
import { APP_ROUTES, buildSellerOrderHref, buildStoreOrderHref } from "../lib/nav";
import type { FulfillmentStatus, OrderStatus } from "../../lib/store/types";

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function updateSellerOrderStatusAction(formData: FormData) {
  const user = await getServerUser();
  if (!user) {
    return {
      ok: false as const,
      message: "Sign in required.",
      requiresAuth: true,
    };
  }

  const orderId = formString(formData, "order_id").trim();
  const statusRaw = formString(formData, "status").trim();
  const fulfillmentRaw = formString(formData, "fulfillment_status").trim();
  const note = formString(formData, "note").trim();

  // Reject any client attempt to mutate payment_status.
  if (formData.has("payment_status") || formData.has("paymentStatus")) {
    return {
      ok: false as const,
      message: "Payment status cannot be changed by sellers.",
    };
  }
  // Reject client-controlled store authority / role / ownership claims.
  if (
    formData.has("store_id") ||
    formData.has("storeId") ||
    formData.has("role") ||
    formData.has("buyer_id") ||
    formData.has("seller_id")
  ) {
    return {
      ok: false as const,
      message: "Store authority is derived server-side.",
    };
  }

  if (!orderId) {
    return { ok: false as const, message: "Order id is required." };
  }

  const status =
    statusRaw && isOrderStatus(statusRaw) ? (statusRaw as OrderStatus) : undefined;
  const fulfillmentStatus =
    fulfillmentRaw && isFulfillmentStatus(fulfillmentRaw)
      ? (fulfillmentRaw as FulfillmentStatus)
      : undefined;

  if (statusRaw && !status) {
    return { ok: false as const, message: "Invalid order status." };
  }
  if (fulfillmentRaw && !fulfillmentStatus) {
    return { ok: false as const, message: "Invalid fulfillment status." };
  }
  if (!status && !fulfillmentStatus) {
    return {
      ok: false as const,
      message: "Choose an order or fulfillment status to update.",
    };
  }

  const supabase = await createClient();

  // Resolve the order's store via RLS (seller can only read own-store orders).
  // Never trust a client-provided store_id. Uniform "not found" for IDOR.
  const { data: orderRow, error: orderError } = await supabase
    .from("orders")
    .select("id, store_id, status, payment_status, fulfillment_status")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !orderRow?.store_id) {
    return { ok: false as const, message: "Order not found." };
  }

  const role = await getMembership(supabase, orderRow.store_id as string, user.id);
  if (!canSellerManageOrders(role)) {
    // Viewer / catalog_editor / non-member — do not reveal order existence nuance.
    return { ok: false as const, message: "Order not found." };
  }

  // Presentation/policy guard mirrored server-side: unpaid orders cannot ship/deliver.
  const paymentBlock = sellerTransitionPaymentBlocked({
    paymentStatus: orderRow.payment_status,
    toStatus: status,
    toFulfillment: fulfillmentStatus,
  });
  if (paymentBlock.blocked) {
    return {
      ok: false as const,
      message: paymentBlock.reason || "Transition blocked by payment state.",
    };
  }

  // Stale transition pre-check against current trusted state.
  if (status) {
    const current = orderRow.status;
    if (
      isOrderStatus(current) &&
      !nextSellerOrderStatuses(current).includes(status)
    ) {
      return {
        ok: false as const,
        message: `Cannot transition order from ${current} to ${status}. Refresh and try again.`,
      };
    }
  }
  if (fulfillmentStatus) {
    const current = orderRow.fulfillment_status;
    if (
      isFulfillmentStatus(current) &&
      !nextFulfillmentStatuses(current).includes(fulfillmentStatus)
    ) {
      return {
        ok: false as const,
        message: `Cannot transition fulfillment from ${current} to ${fulfillmentStatus}. Refresh and try again.`,
      };
    }
  }

  const result = await updateSellerOrderStatus(supabase, {
    orderId,
    status,
    fulfillmentStatus,
    note: note || undefined,
  });

  if (result.ok) {
    revalidatePath(APP_ROUTES.sellerOrders);
    revalidatePath(buildSellerOrderHref(orderId));
  }
  return result;
}

export async function buyerCancelOrderAction(orderId: string) {
  const user = await getServerUser();
  if (!user) {
    return {
      ok: false as const,
      message: "Sign in required.",
      requiresAuth: true,
    };
  }
  const id = typeof orderId === "string" ? orderId.trim() : "";
  if (!id) {
    return { ok: false as const, message: "Order id is required." };
  }

  const supabase = await createClient();
  const result = await buyerCancelStoreOrder(supabase, id);
  if (result.ok) {
    revalidatePath(APP_ROUTES.storeOrders);
    revalidatePath(buildStoreOrderHref(id));
  }
  return result;
}

export async function mintBuyerDigitalAccessAction(entitlementId: string) {
  const user = await getServerUser();
  if (!user) {
    return {
      ok: false as const,
      code: "unauthenticated" as const,
      message: "Sign in required to open digital access.",
      requiresAuth: true as const,
    };
  }

  const id = typeof entitlementId === "string" ? entitlementId.trim() : "";
  if (!id) {
    return {
      ok: false as const,
      code: "invalid_entitlement_id" as const,
      message: "Invalid digital entitlement.",
    };
  }

  const supabase = await createClient();
  return mintBuyerDigitalAccessSignedUrl(supabase, {
    entitlementId: id,
    userId: user.id,
  });
}
