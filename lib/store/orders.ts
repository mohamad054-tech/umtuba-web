/**
 * Order Management V1 — buyer/seller order queries + seller status updates.
 * Relies on RLS for read isolation; mutations go through SECURITY DEFINER RPC.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { listMyDigitalEntitlements } from "./digitalEntitlementGrant";
import {
  assertSellerFulfillmentConsistentWithOrder,
  assertSellerOrderStatusTransition,
  buyerDisplayNameFromSnapshot,
  canSellerManageOrders,
  isFulfillmentStatus,
  isOrderStatus,
  isSellerTerminalOrderStatus,
  mapOrderRpcError,
  sellerSafeFulfillmentContact,
} from "./orderRules";
import { canViewStore } from "./permissions";
import type {
  FulfillmentStatus,
  OrderStatus,
  StoreMemberRole,
  StoreOrderItemRow,
  StoreOrderRow,
  StoreOrderStatusHistoryRow,
} from "./types";

type AnyClient = SupabaseClient;

export type OrderActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; requiresAuth?: boolean };

export type OrderListFilters = {
  status?: OrderStatus | "all";
  fulfillmentStatus?: FulfillmentStatus | "all";
  paymentStatus?: string | "all";
  limit?: number;
};

export type BuyerOrderListItem = {
  id: string;
  orderNumber: string;
  storeId: string;
  storeName: string;
  storeSlug: string | null;
  createdAt: string;
  status: OrderStatus;
  paymentStatus: string;
  fulfillmentStatus: FulfillmentStatus;
  currency: string;
  grandTotalMinor: number;
  itemCount: number;
  /** First few line titles for list preview (from trusted snapshots). */
  previewTitles: string[];
};

export type BuyerSiblingOrder = {
  id: string;
  orderNumber: string;
  storeName: string;
  storeSlug: string | null;
  grandTotalMinor: number;
  currency: string;
};

export type BuyerPaymentAttemptSummary = {
  id: string;
  status: string;
  provider: string;
  amountMinor: number;
  currency: string;
  createdAt: string;
};

export type SellerOrderListItem = {
  id: string;
  orderNumber: string;
  createdAt: string;
  buyerDisplayName: string;
  status: OrderStatus;
  paymentStatus: string;
  fulfillmentStatus: FulfillmentStatus;
  currency: string;
  grandTotalMinor: number;
  itemCount: number;
  /** First few line titles for operational preview. */
  previewTitles: string[];
};

export type OrderDetailBundle = {
  order: StoreOrderRow;
  items: StoreOrderItemRow[];
  history: StoreOrderStatusHistoryRow[];
  storeName: string;
  storeSlug: string | null;
  itemCount: number;
  shippingContact: Record<string, string | null> | null;
  billingContact: Record<string, string | null> | null;
  buyerDisplayName: string;
  canUpdate: boolean;
  /** Other orders from the same checkout quote (buyer only; quote id never exposed). */
  siblingOrders?: BuyerSiblingOrder[];
  /** Buyer-owned payment attempts for this order. */
  paymentAttempts?: BuyerPaymentAttemptSummary[];
  /** Buyer digital entitlements for this order (active grants only). */
  digitalEntitlements?: {
    id: string;
    orderItemId: string;
    productId: string;
    titleSnapshot: string | null;
    skuSnapshot: string | null;
    grantedAt: string;
  }[];
};

const ORDER_SELECT = `
  id, buyer_id, store_id, order_number, idempotency_key,
  status, payment_status, fulfillment_status,
  subtotal_minor, discount_total_minor, tax_total_minor,
  shipping_total_minor, grand_total_minor, currency, notes,
  created_at, updated_at,
  shipping_address_snapshot, billing_contact_snapshot,
  shipping_method_code, shipping_method_name, shipping_estimate_text,
  coupon_code_snapshot, checkout_quote_id, tax_snapshot, discount_snapshot,
  confirmed_at, processing_at, packed_at, shipped_at, delivered_at, cancelled_at
`;

const ITEM_SELECT = `
  id, order_id, product_id, variant_id, seller_user_id,
  quantity, unit_price_minor, total_price_minor,
  product_snapshot, sku_snapshot, title_snapshot, variant_title_snapshot,
  created_at, updated_at
`;

const HISTORY_SELECT = `
  id, order_id, actor_user_id,
  from_status, to_status,
  from_fulfillment_status, to_fulfillment_status,
  from_payment_status, to_payment_status,
  note, source, created_at
`;

function normalizeLimit(limit?: number): number {
  if (limit == null || !Number.isFinite(limit)) return 50;
  return Math.min(Math.max(Math.trunc(limit), 1), 100);
}

async function countItemsByOrderIds(
  supabase: AnyClient,
  orderIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (orderIds.length === 0) return map;
  const { data, error } = await supabase
    .from("order_items")
    .select("order_id, quantity")
    .in("order_id", orderIds);
  if (error || !data) return map;
  for (const row of data) {
    const id = row.order_id as string;
    const qty = typeof row.quantity === "number" ? row.quantity : 0;
    map.set(id, (map.get(id) ?? 0) + qty);
  }
  return map;
}

async function previewTitlesByOrderIds(
  supabase: AnyClient,
  orderIds: string[]
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (orderIds.length === 0) return map;
  const { data, error } = await supabase
    .from("order_items")
    .select("order_id, title_snapshot, created_at")
    .in("order_id", orderIds)
    .order("created_at", { ascending: true });
  if (error || !data) return map;
  for (const row of data) {
    const id = row.order_id as string;
    const title =
      typeof row.title_snapshot === "string" ? row.title_snapshot.trim() : "";
    if (!title) continue;
    const list = map.get(id) ?? [];
    if (list.length < 3) list.push(title);
    map.set(id, list);
  }
  return map;
}

export async function listBuyerOrders(
  supabase: AnyClient,
  userId: string,
  filters: OrderListFilters = {}
): Promise<OrderActionResult<BuyerOrderListItem[]>> {
  let query = supabase
    .from("orders")
    .select(
      `${ORDER_SELECT}, stores!inner ( id, name, slug )`
    )
    .eq("buyer_id", userId)
    .order("created_at", { ascending: false })
    .limit(normalizeLimit(filters.limit));

  if (filters.status && filters.status !== "all" && isOrderStatus(filters.status)) {
    query = query.eq("status", filters.status);
  }
  if (
    filters.fulfillmentStatus &&
    filters.fulfillmentStatus !== "all" &&
    isFulfillmentStatus(filters.fulfillmentStatus)
  ) {
    query = query.eq("fulfillment_status", filters.fulfillmentStatus);
  }
  if (filters.paymentStatus && filters.paymentStatus !== "all") {
    query = query.eq("payment_status", filters.paymentStatus);
  }

  const { data, error } = await query;
  if (error) {
    return { ok: false, message: error.message || "Could not load orders." };
  }

  const rows = (data ?? []) as unknown as Array<
    StoreOrderRow & { stores: { id: string; name: string; slug: string } | null }
  >;
  const orderIds = rows.map((r) => r.id);
  const [counts, previews] = await Promise.all([
    countItemsByOrderIds(supabase, orderIds),
    previewTitlesByOrderIds(supabase, orderIds),
  ]);

  return {
    ok: true,
    data: rows.map((row) => ({
      id: row.id,
      orderNumber: row.order_number,
      storeId: row.store_id,
      storeName: row.stores?.name ?? "Store",
      storeSlug: row.stores?.slug ?? null,
      createdAt: row.created_at,
      status: row.status,
      paymentStatus: row.payment_status,
      fulfillmentStatus: row.fulfillment_status,
      currency: row.currency,
      grandTotalMinor: row.grand_total_minor,
      itemCount: counts.get(row.id) ?? 0,
      previewTitles: previews.get(row.id) ?? [],
    })),
  };
}

export async function listSellerOrders(
  supabase: AnyClient,
  storeId: string,
  memberRole: StoreMemberRole | null | undefined,
  filters: OrderListFilters = {}
): Promise<OrderActionResult<SellerOrderListItem[]>> {
  if (!canViewStore(memberRole)) {
    return { ok: false, message: "You do not have access to store orders." };
  }

  let query = supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(normalizeLimit(filters.limit));

  if (filters.status && filters.status !== "all" && isOrderStatus(filters.status)) {
    query = query.eq("status", filters.status);
  }
  if (
    filters.fulfillmentStatus &&
    filters.fulfillmentStatus !== "all" &&
    isFulfillmentStatus(filters.fulfillmentStatus)
  ) {
    query = query.eq("fulfillment_status", filters.fulfillmentStatus);
  }
  if (filters.paymentStatus && filters.paymentStatus !== "all") {
    query = query.eq("payment_status", filters.paymentStatus);
  }

  const { data, error } = await query;
  if (error) {
    return { ok: false, message: error.message || "Could not load orders." };
  }

  const rows = (data ?? []) as StoreOrderRow[];
  // Defense in depth: never return another store's rows even if filters were wrong.
  const scoped = rows.filter((r) => r.store_id === storeId);
  const orderIds = scoped.map((r) => r.id);
  const [counts, previews] = await Promise.all([
    countItemsByOrderIds(supabase, orderIds),
    previewTitlesByOrderIds(supabase, orderIds),
  ]);

  return {
    ok: true,
    data: scoped.map((row) => ({
      id: row.id,
      orderNumber: row.order_number,
      createdAt: row.created_at,
      buyerDisplayName: buyerDisplayNameFromSnapshot(
        row.shipping_address_snapshot ?? row.billing_contact_snapshot
      ),
      status: row.status,
      paymentStatus: row.payment_status,
      fulfillmentStatus: row.fulfillment_status,
      currency: row.currency,
      grandTotalMinor: row.grand_total_minor,
      itemCount: counts.get(row.id) ?? 0,
      previewTitles: previews.get(row.id) ?? [],
    })),
  };
}

async function loadOrderDetail(
  supabase: AnyClient,
  orderId: string,
  options: {
    expectBuyerId?: string;
    expectStoreId?: string;
    memberRole?: StoreMemberRole | null;
    mode: "buyer" | "seller";
  }
): Promise<OrderActionResult<OrderDetailBundle>> {
  const { data: order, error } = await supabase
    .from("orders")
    .select(`${ORDER_SELECT}, stores!inner ( id, name, slug )`)
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    return { ok: false, message: error.message || "Could not load order." };
  }
  if (!order) {
    return { ok: false, message: "Order not found." };
  }

  const row = order as unknown as StoreOrderRow & {
    stores: { id: string; name: string; slug: string } | null;
  };

  // Uniform not-found for IDOR (do not reveal existence of other users' orders).
  if (options.expectBuyerId && row.buyer_id !== options.expectBuyerId) {
    return { ok: false, message: "Order not found." };
  }
  if (options.expectStoreId && row.store_id !== options.expectStoreId) {
    return { ok: false, message: "Order not found." };
  }
  if (
    options.expectStoreId &&
    options.memberRole !== undefined &&
    !canViewStore(options.memberRole)
  ) {
    return { ok: false, message: "Order not found." };
  }

  const [{ data: items, error: itemsError }, { data: history, error: histError }] =
    await Promise.all([
      supabase
        .from("order_items")
        .select(ITEM_SELECT)
        .eq("order_id", orderId)
        .order("created_at", { ascending: true }),
      supabase
        .from("order_status_history")
        .select(HISTORY_SELECT)
        .eq("order_id", orderId)
        .order("created_at", { ascending: true }),
    ]);

  if (itemsError) {
    return { ok: false, message: itemsError.message || "Could not load items." };
  }
  if (histError) {
    if (!/does not exist|relation/i.test(histError.message)) {
      return {
        ok: false,
        message: histError.message || "Could not load order history.",
      };
    }
  }

  const itemRows = (items ?? []) as StoreOrderItemRow[];
  const itemCount = itemRows.reduce((sum, i) => sum + i.quantity, 0);
  const shippingContact = sellerSafeFulfillmentContact(
    row.shipping_address_snapshot
  );
  const billingContact = sellerSafeFulfillmentContact(
    row.billing_contact_snapshot
  );

  const sanitizedOrder = sanitizeOrderForMode(row, options.mode);
  const sanitizedHistory = sanitizeHistoryForMode(
    (history ?? []) as StoreOrderStatusHistoryRow[],
    options.mode
  );

  let siblingOrders: BuyerSiblingOrder[] | undefined;
  let paymentAttempts: BuyerPaymentAttemptSummary[] | undefined;
  let digitalEntitlements: OrderDetailBundle["digitalEntitlements"];

  if (options.mode === "buyer" && options.expectBuyerId) {
    const quoteId =
      typeof row.checkout_quote_id === "string" ? row.checkout_quote_id : null;
    if (quoteId) {
      const { data: siblings } = await supabase
        .from("orders")
        .select(
          "id, order_number, grand_total_minor, currency, stores!inner ( name, slug )"
        )
        .eq("buyer_id", options.expectBuyerId)
        .eq("checkout_quote_id", quoteId)
        .neq("id", orderId)
        .order("created_at", { ascending: true });
      siblingOrders = (siblings ?? []).map((s) => {
        const store = s.stores as unknown as {
          name: string;
          slug: string;
        } | null;
        return {
          id: s.id as string,
          orderNumber: s.order_number as string,
          storeName: store?.name ?? "Store",
          storeSlug: store?.slug ?? null,
          grandTotalMinor: Number(s.grand_total_minor),
          currency: s.currency as string,
        };
      });
    } else {
      siblingOrders = [];
    }

    const { data: attempts } = await supabase
      .from("payment_attempts")
      .select("id, status, provider, amount_minor, currency, created_at")
      .eq("order_id", orderId)
      .eq("buyer_id", options.expectBuyerId)
      .order("created_at", { ascending: false })
      .limit(10);
    paymentAttempts = (attempts ?? []).map((a) => ({
      id: a.id as string,
      status: String(a.status ?? "unknown"),
      provider: String(a.provider ?? "none"),
      amountMinor: Number(a.amount_minor),
      currency: String(a.currency ?? row.currency),
      createdAt: String(a.created_at),
    }));

    const entitlementList = await listMyDigitalEntitlements(supabase, {
      orderId,
      limit: 50,
    });
    if (entitlementList.ok) {
      digitalEntitlements = entitlementList.entitlements.map((e) => ({
        id: e.id,
        orderItemId: e.orderItemId,
        productId: e.productId,
        titleSnapshot: e.titleSnapshot,
        skuSnapshot: e.skuSnapshot,
        grantedAt: e.grantedAt,
      }));
    } else {
      digitalEntitlements = [];
    }
  }

  return {
    ok: true,
    data: {
      order: sanitizedOrder,
      items: itemRows.map((item) => sanitizeOrderItem(item, options.mode)),
      history: sanitizedHistory,
      storeName: row.stores?.name ?? "Store",
      storeSlug: row.stores?.slug ?? null,
      itemCount,
      shippingContact,
      billingContact:
        options.mode === "seller" ? billingContact : billingContact,
      buyerDisplayName: buyerDisplayNameFromSnapshot(
        row.shipping_address_snapshot ?? row.billing_contact_snapshot
      ),
      canUpdate:
        options.mode === "seller" &&
        Boolean(options.expectStoreId) &&
        canSellerManageOrders(options.memberRole) &&
        !isSellerTerminalOrderStatus(row.status),
      siblingOrders,
      paymentAttempts,
      digitalEntitlements,
    },
  };
}

function sanitizeOrderForMode(
  row: StoreOrderRow,
  mode: "buyer" | "seller"
): StoreOrderRow {
  const base: StoreOrderRow = {
    ...row,
    // Never expose checkout quote id or idempotency key in UI bundles.
    idempotency_key: null,
    checkout_quote_id: null,
    // Strip internal discount/tax engines; keep totals + coupon code only.
    tax_snapshot: null,
    discount_snapshot: null,
  };

  if (mode === "seller") {
    return {
      ...base,
      // Hide buyer UUID from seller UI payloads (fulfillment uses snapshots).
      buyer_id: "",
      notes: null,
    };
  }

  return base;
}

function sanitizeOrderItem(
  item: StoreOrderItemRow,
  mode: "buyer" | "seller"
): StoreOrderItemRow {
  return {
    ...item,
    seller_user_id: mode === "buyer" ? "" : item.seller_user_id,
  };
}

function sanitizeHistoryForMode(
  history: StoreOrderStatusHistoryRow[],
  mode: "buyer" | "seller"
): StoreOrderStatusHistoryRow[] {
  return history.map((entry) => ({
    ...entry,
    // Buyers should not see actor UUIDs or seller-internal notes.
    actor_user_id: mode === "buyer" ? null : entry.actor_user_id,
    note: mode === "buyer" ? null : entry.note,
  }));
}

export async function getBuyerOrderDetail(
  supabase: AnyClient,
  userId: string,
  orderId: string
): Promise<OrderActionResult<OrderDetailBundle>> {
  return loadOrderDetail(supabase, orderId, {
    expectBuyerId: userId,
    mode: "buyer",
  });
}

export async function getSellerOrderDetail(
  supabase: AnyClient,
  storeId: string,
  memberRole: StoreMemberRole | null | undefined,
  orderId: string
): Promise<OrderActionResult<OrderDetailBundle>> {
  return loadOrderDetail(supabase, orderId, {
    expectStoreId: storeId,
    memberRole,
    mode: "seller",
  });
}

export async function updateSellerOrderStatus(
  supabase: AnyClient,
  input: {
    orderId: string;
    status?: OrderStatus;
    fulfillmentStatus?: FulfillmentStatus;
    note?: string;
  }
): Promise<OrderActionResult<{
  orderId: string;
  status: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
  paymentStatus: string;
  unchanged: boolean;
}>> {
  if (!input.orderId.trim()) {
    return { ok: false, message: "Order id is required." };
  }
  if (!input.status && !input.fulfillmentStatus) {
    return {
      ok: false,
      message: "Choose an order status or fulfillment status to update.",
    };
  }

  // Client-side pre-check (server RPC is authoritative).
  if (input.status) {
    // We don't know current status here without a fetch; RPC validates.
    if (!isOrderStatus(input.status)) {
      return { ok: false, message: "Invalid order status." };
    }
  }
  if (input.fulfillmentStatus && !isFulfillmentStatus(input.fulfillmentStatus)) {
    return { ok: false, message: "Invalid fulfillment status." };
  }

  const { data, error } = await supabase.rpc("update_store_order_status", {
    p_order_id: input.orderId,
    p_status: input.status ?? null,
    p_fulfillment_status: input.fulfillmentStatus ?? null,
    p_note: input.note?.trim() || null,
  });

  if (error) {
    return { ok: false, message: mapOrderRpcError(error.message) };
  }

  const payload = (data ?? {}) as Record<string, unknown>;
  const status = payload.status;
  const fulfillment = payload.fulfillment_status;
  if (!isOrderStatus(status) || !isFulfillmentStatus(fulfillment)) {
    return { ok: false, message: "Unexpected order update response." };
  }

  return {
    ok: true,
    data: {
      orderId: String(payload.order_id ?? input.orderId),
      status,
      fulfillmentStatus: fulfillment,
      paymentStatus: String(payload.payment_status ?? "pending"),
      unchanged: Boolean(payload.unchanged),
    },
  };
}

/** Pure helper used by tests — validates a proposed seller update pair. */
export function validateSellerOrderUpdateProposal(input: {
  fromStatus: OrderStatus;
  toStatus?: OrderStatus;
  fromFulfillment: FulfillmentStatus;
  toFulfillment?: FulfillmentStatus;
  role?: StoreMemberRole | null;
}): { ok: true } | { ok: false; message: string } {
  if (input.role !== undefined && !canSellerManageOrders(input.role)) {
    return {
      ok: false,
      message: "Only store owners or managers can update orders.",
    };
  }
  if (isSellerTerminalOrderStatus(input.fromStatus)) {
    return { ok: false, message: "Order is in a terminal state." };
  }
  const effectiveStatus = input.toStatus ?? input.fromStatus;
  if (input.toStatus) {
    const t = assertSellerOrderStatusTransition(input.fromStatus, input.toStatus);
    if (!t.ok) return t;
  }
  if (input.toFulfillment) {
    const t = assertSellerFulfillmentConsistentWithOrder({
      orderStatus: effectiveStatus,
      fromFulfillment: input.fromFulfillment,
      toFulfillment: input.toFulfillment,
    });
    if (!t.ok) return t;
  }
  if (!input.toStatus && !input.toFulfillment) {
    return { ok: false, message: "No changes requested." };
  }
  return { ok: true };
}
