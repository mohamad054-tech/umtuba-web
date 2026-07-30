/**
 * Commerce Buyer Delivery & Post-Purchase Flow V1.
 * UX orchestration over existing entitlement list + delivery availability + mint.
 * Does not create tables, RPCs, or alternate mint paths.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  listMyDigitalEntitlements,
  type DigitalEntitlementRow,
} from "./digitalEntitlementGrant";
import {
  resolveDigitalDeliveryAvailability,
  type DigitalDeliveryAvailability,
} from "./digitalAccessDelivery";

export const BUYER_DELIVERY_POST_PURCHASE_FLOW_ID =
  "commerce.digital.buyer_delivery_post_purchase_flow_v1" as const;

type AnyClient = SupabaseClient;

export type BuyerDigitalAccessLibraryItem = {
  entitlementId: string;
  orderId: string;
  orderItemId: string;
  productId: string;
  titleSnapshot: string | null;
  skuSnapshot: string | null;
  grantedAt: string;
  status: string;
  deliveryAvailability: DigitalDeliveryAvailability;
};

function serviceRoleAdmin(): AnyClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Fail-closed order → has active digital entitlement map.
 * If entitlement listing fails, every order is treated as non-digital for cues.
 */
export async function mapOrdersWithDigitalEntitlements(
  userClient: AnyClient,
  orderIds: string[]
): Promise<Set<string>> {
  const out = new Set<string>();
  if (orderIds.length === 0) return out;

  const listed = await listMyDigitalEntitlements(userClient, { limit: 100 });
  if (!listed.ok) return out;

  const wanted = new Set(orderIds);
  for (const row of listed.entitlements) {
    if (row.status !== "active") continue;
    if (wanted.has(row.orderId)) out.add(row.orderId);
  }
  return out;
}

async function withDeliveryAvailability(
  rows: DigitalEntitlementRow[]
): Promise<BuyerDigitalAccessLibraryItem[]> {
  const admin = serviceRoleAdmin();
  const items: BuyerDigitalAccessLibraryItem[] = [];

  for (const row of rows) {
    if (row.status !== "active") continue;
    let deliveryAvailability: DigitalDeliveryAvailability = "unavailable";
    if (admin) {
      deliveryAvailability = await resolveDigitalDeliveryAvailability(admin, {
        productId: row.productId,
        storeId: row.storeId,
        entitlementStatus: row.status,
      });
    }
    items.push({
      entitlementId: row.id,
      orderId: row.orderId,
      orderItemId: row.orderItemId,
      productId: row.productId,
      titleSnapshot: row.titleSnapshot,
      skuSnapshot: row.skuSnapshot,
      grantedAt: row.grantedAt,
      status: row.status,
      deliveryAvailability,
    });
  }
  return items;
}

/**
 * Cross-order digital access library for the authenticated buyer session.
 */
export async function listBuyerDigitalAccessLibrary(
  userClient: AnyClient,
  input?: { limit?: number }
): Promise<
  | { ok: true; items: BuyerDigitalAccessLibraryItem[] }
  | { ok: false; message: string }
> {
  const listed = await listMyDigitalEntitlements(userClient, {
    limit: input?.limit ?? 50,
  });
  if (!listed.ok) return listed;
  const items = await withDeliveryAvailability(listed.entitlements);
  return { ok: true, items };
}

/**
 * Fail-closed probe: true only when at least one active entitlement exists
 * for the provided order ids owned by the session buyer (via RPC).
 */
export async function buyerOrdersHaveDigitalEntitlements(
  userClient: AnyClient,
  orderIds: string[]
): Promise<{ hasDigitalAccess: boolean; entitlementCount: number }> {
  const ids = orderIds.map((id) => id.trim()).filter(Boolean);
  if (ids.length === 0) {
    return { hasDigitalAccess: false, entitlementCount: 0 };
  }

  const listed = await listMyDigitalEntitlements(userClient, { limit: 100 });
  if (!listed.ok) {
    return { hasDigitalAccess: false, entitlementCount: 0 };
  }

  const wanted = new Set(ids);
  let count = 0;
  const matchedOrders = new Set<string>();
  for (const row of listed.entitlements) {
    if (row.status !== "active") continue;
    if (!wanted.has(row.orderId)) continue;
    count += 1;
    matchedOrders.add(row.orderId);
  }
  return {
    hasDigitalAccess: matchedOrders.size > 0,
    entitlementCount: count,
  };
}
