/**
 * Store Orders Foundation V1 — pure domain rules.
 * No payment gateway integration. UI behavior unchanged.
 */

import {
  normalizeCurrencyCode,
  validateAmountMinor,
} from "./money";
import { computeExclusiveTaxOrderGrandTotalMinor, formatTrustedMoney } from "./tradingContracts";
import type { StoreMemberRole } from "./types";
import {
  FULFILLMENT_STATUSES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  type FulfillmentStatus,
  type OrderStatus,
  type PaymentStatus,
  type StoreOrderItemSnapshotInput,
  type StoreOrderMoneyInput,
} from "./types";
import { canManageStoreSettings, canViewStore } from "./permissions";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  return_requested: "Return requested",
  returned: "Returned",
  refunded: "Refunded",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Pending",
  authorized: "Authorized",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
};

export const FULFILLMENT_STATUS_LABELS: Record<FulfillmentStatus, string> = {
  unfulfilled: "Unfulfilled",
  partial: "Partial",
  fulfilled: "Fulfilled",
};

/**
 * Allowed order.status transitions (foundation; payment/fulfillment stay separate).
 * Mirrored by store_order_status_transition_allowed() in Order Management V1.
 */
export const ORDER_STATUS_TRANSITIONS: Record<
  OrderStatus,
  readonly OrderStatus[]
> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["return_requested", "refunded"],
  cancelled: [],
  return_requested: ["returned", "refunded"],
  returned: ["refunded"],
  refunded: [],
};

/**
 * Seller-callable subset — excludes refunded (admin/payment-system only).
 * Terminal cancelled/refunded allow no further seller transitions.
 */
export const SELLER_ORDER_STATUS_TRANSITIONS: Record<
  OrderStatus,
  readonly OrderStatus[]
> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
  return_requested: ["returned"],
  returned: [],
  refunded: [],
};

export const FULFILLMENT_STATUS_TRANSITIONS: Record<
  FulfillmentStatus,
  readonly FulfillmentStatus[]
> = {
  unfulfilled: ["partial", "fulfilled"],
  partial: ["unfulfilled", "fulfilled"],
  // fulfilled → partial allowed only while order is still pre-ship (RPC enforces).
  fulfilled: ["partial"],
};

/** Order statuses where fulfilled→partial corrections are still allowed. */
export const FULFILLMENT_REOPEN_ALLOWED_ORDER_STATUSES: readonly OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "packed",
] as const;

/** Buyer-facing contact fields sellers may see for fulfillment only. */
export const SELLER_FULFILLMENT_CONTACT_KEYS = [
  "full_name",
  "phone",
  "email",
  "country_code",
  "region",
  "city",
  "postal_code",
  "address_line1",
  "address_line2",
  "delivery_instructions",
] as const;

/** Line payload keys that create_store_order_foundation must reject. */
export const ORDER_CREATE_FORBIDDEN_ITEM_KEYS = [
  "unit_price_minor",
  "total_price_minor",
  "sku_snapshot",
  "title_snapshot",
  "variant_title_snapshot",
  "product_snapshot",
  "seller_user_id",
  "subtotal_minor",
  "grand_total_minor",
] as const;

export function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === "string" &&
    (ORDER_STATUSES as readonly string[]).includes(value)
  );
}

export function isPaymentStatus(value: unknown): value is PaymentStatus {
  return (
    typeof value === "string" &&
    (PAYMENT_STATUSES as readonly string[]).includes(value)
  );
}

export function isFulfillmentStatus(value: unknown): value is FulfillmentStatus {
  return (
    typeof value === "string" &&
    (FULFILLMENT_STATUSES as readonly string[]).includes(value)
  );
}

export function formatOrderStatus(status: OrderStatus): string {
  return ORDER_STATUS_LABELS[status];
}

export function formatPaymentStatus(status: PaymentStatus): string {
  return PAYMENT_STATUS_LABELS[status];
}

export function formatFulfillmentStatus(status: FulfillmentStatus): string {
  return FULFILLMENT_STATUS_LABELS[status];
}

export function formatOrderMoney(
  amountMinor: number | null | undefined,
  currency: string | null | undefined
): string {
  return formatTrustedMoney(amountMinor, currency);
}

export function canTransitionOrderStatus(
  from: OrderStatus,
  to: OrderStatus
): boolean {
  if (from === to) return true;
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

export function canSellerTransitionOrderStatus(
  from: OrderStatus,
  to: OrderStatus
): boolean {
  if (from === to) return true;
  return SELLER_ORDER_STATUS_TRANSITIONS[from].includes(to);
}

export function canTransitionFulfillmentStatus(
  from: FulfillmentStatus,
  to: FulfillmentStatus
): boolean {
  if (from === to) return true;
  return FULFILLMENT_STATUS_TRANSITIONS[from].includes(to);
}

export function assertOrderStatusTransition(
  from: OrderStatus,
  to: OrderStatus
): { ok: true } | { ok: false; message: string } {
  if (!isOrderStatus(from) || !isOrderStatus(to)) {
    return { ok: false, message: "Invalid order status." };
  }
  if (!canTransitionOrderStatus(from, to)) {
    return {
      ok: false,
      message: `Cannot transition order from ${from} to ${to}.`,
    };
  }
  return { ok: true };
}

export function assertSellerOrderStatusTransition(
  from: OrderStatus,
  to: OrderStatus
): { ok: true } | { ok: false; message: string } {
  if (!isOrderStatus(from) || !isOrderStatus(to)) {
    return { ok: false, message: "Invalid order status." };
  }
  if (!canSellerTransitionOrderStatus(from, to)) {
    return {
      ok: false,
      message: `Cannot transition order from ${from} to ${to}.`,
    };
  }
  return { ok: true };
}

export function assertFulfillmentStatusTransition(
  from: FulfillmentStatus,
  to: FulfillmentStatus
): { ok: true } | { ok: false; message: string } {
  if (!isFulfillmentStatus(from) || !isFulfillmentStatus(to)) {
    return { ok: false, message: "Invalid fulfillment status." };
  }
  if (!canTransitionFulfillmentStatus(from, to)) {
    return {
      ok: false,
      message: `Cannot transition fulfillment from ${from} to ${to}.`,
    };
  }
  return { ok: true };
}

/**
 * Combined order+fulfillment consistency for seller updates.
 * Mirrors update_store_order_status rules in Order Management V1.
 */
export function assertSellerFulfillmentConsistentWithOrder(input: {
  orderStatus: OrderStatus;
  fromFulfillment: FulfillmentStatus;
  toFulfillment: FulfillmentStatus;
}): { ok: true } | { ok: false; message: string } {
  const base = assertFulfillmentStatusTransition(
    input.fromFulfillment,
    input.toFulfillment
  );
  if (!base.ok) return base;

  const preShip = (
    FULFILLMENT_REOPEN_ALLOWED_ORDER_STATUSES as readonly string[]
  ).includes(input.orderStatus);

  if (input.orderStatus === "delivered" && input.toFulfillment !== "fulfilled") {
    return {
      ok: false,
      message: "Delivered orders must be fulfilled.",
    };
  }

  if (!preShip) {
    if (
      input.toFulfillment === "unfulfilled" &&
      input.fromFulfillment !== "unfulfilled"
    ) {
      return {
        ok: false,
        message: "Cannot mark shipped/delivered/cancelled orders unfulfilled.",
      };
    }
    if (
      input.fromFulfillment === "fulfilled" &&
      input.toFulfillment === "partial"
    ) {
      return {
        ok: false,
        message: "Cannot reopen fulfillment after ship/deliver/cancel.",
      };
    }
  }

  return { ok: true };
}

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return status === "cancelled" || status === "refunded";
}

/** Seller-facing terminal: delivered is also frozen for seller edits. */
export function isSellerTerminalOrderStatus(status: OrderStatus): boolean {
  return (
    status === "cancelled" ||
    status === "refunded" ||
    status === "delivered" ||
    status === "returned"
  );
}

export function nextSellerOrderStatuses(
  from: OrderStatus
): readonly OrderStatus[] {
  return SELLER_ORDER_STATUS_TRANSITIONS[from];
}

export function nextFulfillmentStatuses(
  from: FulfillmentStatus
): readonly FulfillmentStatus[] {
  return FULFILLMENT_STATUS_TRANSITIONS[from];
}

/**
 * Strip address/contact snapshots to fulfillment-safe fields only.
 * Never pass through unrelated profile or payment data.
 */
export function sellerSafeFulfillmentContact(
  snapshot: Record<string, unknown> | null | undefined
): Record<string, string | null> | null {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return null;
  }
  const out: Record<string, string | null> = {};
  for (const key of SELLER_FULFILLMENT_CONTACT_KEYS) {
    const value = snapshot[key];
    if (typeof value === "string" && value.trim()) {
      out[key] = value.trim();
    } else {
      out[key] = null;
    }
  }
  return out;
}

export function buyerDisplayNameFromSnapshot(
  snapshot: Record<string, unknown> | null | undefined
): string {
  const safe = sellerSafeFulfillmentContact(snapshot);
  const name = safe?.full_name?.trim();
  return name && name.length > 0 ? name : "Customer";
}

export function mapOrderRpcError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("authentication required")) return "Sign in required.";
  if (m.includes("not authorized")) return "You cannot update this order.";
  if (m.includes("order not found")) return "Order not found.";
  if (m.includes("terminal state")) return "This order can no longer be updated.";
  if (m.includes("invalid order status transition")) {
    return "That order status change is not allowed.";
  }
  if (m.includes("invalid fulfillment status transition")) {
    return "That fulfillment status change is not allowed.";
  }
  if (m.includes("cannot set refunded")) {
    return "Sellers cannot mark orders as refunded.";
  }
  if (m.includes("payment")) return "Payment status cannot be changed here.";
  return message || "Could not update order.";
}

export function buildOrderTimeline(input: {
  createdAt: string;
  status: OrderStatus;
  confirmedAt?: string | null;
  processingAt?: string | null;
  packedAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
}): Array<{ key: string; label: string; at: string | null; done: boolean }> {
  const cancelled = input.status === "cancelled";
  return [
    {
      key: "placed",
      label: "Order placed",
      at: input.createdAt,
      done: true,
    },
    {
      key: "confirmed",
      label: "Confirmed",
      at: input.confirmedAt ?? null,
      done:
        Boolean(input.confirmedAt) ||
        ["confirmed", "processing", "packed", "shipped", "delivered"].includes(
          input.status
        ),
    },
    {
      key: "processing",
      label: "Processing",
      at: input.processingAt ?? null,
      done:
        Boolean(input.processingAt) ||
        ["processing", "packed", "shipped", "delivered"].includes(input.status),
    },
    {
      key: "packed",
      label: "Packed",
      at: input.packedAt ?? null,
      done:
        Boolean(input.packedAt) ||
        ["packed", "shipped", "delivered"].includes(input.status),
    },
    {
      key: "shipped",
      label: "Shipped",
      at: input.shippedAt ?? null,
      done:
        Boolean(input.shippedAt) ||
        ["shipped", "delivered"].includes(input.status),
    },
    {
      key: "delivered",
      label: "Delivered",
      at: input.deliveredAt ?? null,
      done: Boolean(input.deliveredAt) || input.status === "delivered",
    },
    ...(cancelled
      ? [
          {
            key: "cancelled",
            label: "Cancelled",
            at: input.cancelledAt ?? null,
            done: true,
          },
        ]
      : []),
  ];
}

/** Roles allowed to mutate order status (mirrors RPC). */
export function canSellerManageOrders(
  role: StoreMemberRole | null | undefined
): boolean {
  return canManageStoreSettings(role);
}

export function validateOrderQuantity(
  value: unknown
): { ok: true; quantity: number } | { ok: false; message: string } {
  if (typeof value === "string" && value.trim() !== "") {
    if (!/^\d+$/.test(value.trim())) {
      return { ok: false, message: "Quantity must be a whole number." };
    }
    value = Number(value.trim());
  }
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isInteger(value)
  ) {
    return { ok: false, message: "Quantity must be a whole number." };
  }
  if (value < 1) {
    return { ok: false, message: "Quantity must be at least 1." };
  }
  if (value > 9999) {
    return { ok: false, message: "Quantity is too large." };
  }
  return { ok: true, quantity: value };
}

export function computeOrderLineTotalMinor(
  unitPriceMinor: number,
  quantity: number
): number {
  return unitPriceMinor * quantity;
}

export function computeOrderGrandTotalMinor(input: {
  subtotalMinor: number;
  discountTotalMinor: number;
  taxTotalMinor: number;
  shippingTotalMinor: number;
}): number {
  // Align with checkout pricing (exclusive tax) — do not fork grand-total math.
  return computeExclusiveTaxOrderGrandTotalMinor(input);
}

export function validateOrderMoneyTotals(
  input: StoreOrderMoneyInput
):
  | {
      ok: true;
      currency: string;
      subtotalMinor: number;
      discountTotalMinor: number;
      taxTotalMinor: number;
      shippingTotalMinor: number;
      grandTotalMinor: number;
    }
  | { ok: false; message: string } {
  const currency = normalizeCurrencyCode(input.currency);
  const subtotal = validateAmountMinor(input.subtotalMinor, currency);
  if (!subtotal.ok) return subtotal;
  const discount = validateAmountMinor(input.discountTotalMinor, currency);
  if (!discount.ok) return discount;
  const tax = validateAmountMinor(input.taxTotalMinor, currency);
  if (!tax.ok) return tax;
  const shipping = validateAmountMinor(input.shippingTotalMinor, currency);
  if (!shipping.ok) return shipping;

  if (discount.amountMinor > subtotal.amountMinor) {
    return { ok: false, message: "Discount cannot exceed subtotal." };
  }

  const grandTotalMinor = computeOrderGrandTotalMinor({
    subtotalMinor: subtotal.amountMinor,
    discountTotalMinor: discount.amountMinor,
    taxTotalMinor: tax.amountMinor,
    shippingTotalMinor: shipping.amountMinor,
  });

  if (grandTotalMinor < 0) {
    return { ok: false, message: "Grand total cannot be negative." };
  }

  if (
    input.grandTotalMinor !== undefined &&
    input.grandTotalMinor !== grandTotalMinor
  ) {
    return { ok: false, message: "Grand total does not match money breakdown." };
  }

  return {
    ok: true,
    currency,
    subtotalMinor: subtotal.amountMinor,
    discountTotalMinor: discount.amountMinor,
    taxTotalMinor: tax.amountMinor,
    shippingTotalMinor: shipping.amountMinor,
    grandTotalMinor,
  };
}

/**
 * Build an immutable product snapshot for order_items.
 * Callers must persist this blob; later catalog edits must not rewrite it.
 */
export function buildOrderItemProductSnapshot(input: {
  productId: string;
  storeId: string;
  slug: string;
  title: string;
  productType: string;
  sku: string;
  variantId?: string | null;
  variantTitle?: string | null;
  unitPriceMinor: number;
  currency: string;
  /** Marketplace provenance — optional, immutable once snapshotted. */
  marketplaceSourceType?: "owned" | "supplier_listing" | null;
  supplierStoreId?: string | null;
  sellerListingId?: string | null;
  fulfillmentPartyStoreId?: string | null;
  inventoryOwnerStoreId?: string | null;
}): Record<string, unknown> {
  return {
    product_id: input.productId,
    store_id: input.storeId,
    slug: input.slug,
    title: input.title,
    product_type: input.productType,
    sku: input.sku,
    variant_id: input.variantId ?? null,
    variant_title: input.variantTitle ?? null,
    unit_price_minor: input.unitPriceMinor,
    currency: normalizeCurrencyCode(input.currency),
    marketplace_source_type: input.marketplaceSourceType ?? null,
    supplier_store_id: input.supplierStoreId ?? null,
    seller_listing_id: input.sellerListingId ?? null,
    fulfillment_party_store_id: input.fulfillmentPartyStoreId ?? null,
    inventory_owner_store_id: input.inventoryOwnerStoreId ?? null,
    snapshotted_at: "order_create",
  };
}

export function validateOrderItemSnapshot(
  input: StoreOrderItemSnapshotInput
):
  | {
      ok: true;
      quantity: number;
      unitPriceMinor: number;
      totalPriceMinor: number;
      skuSnapshot: string;
      titleSnapshot: string;
      variantTitleSnapshot: string | null;
      productSnapshot: Record<string, unknown>;
    }
  | { ok: false; message: string } {
  const qty = validateOrderQuantity(input.quantity);
  if (!qty.ok) return qty;

  const price = validateAmountMinor(input.unitPriceMinor, input.currency);
  if (!price.ok) return price;

  const sku = input.skuSnapshot.trim();
  const title = input.titleSnapshot.trim();
  if (!sku || sku.length > 64) {
    return { ok: false, message: "SKU snapshot is required." };
  }
  if (!title || title.length > 200) {
    return { ok: false, message: "Title snapshot is required." };
  }

  let variantTitle: string | null = null;
  if (input.variantTitleSnapshot != null) {
    const vt = input.variantTitleSnapshot.trim();
    if (!vt || vt.length > 120) {
      return { ok: false, message: "Variant title snapshot is invalid." };
    }
    variantTitle = vt;
  }

  const snapshot =
    input.productSnapshot &&
    typeof input.productSnapshot === "object" &&
    !Array.isArray(input.productSnapshot)
      ? { ...input.productSnapshot }
      : null;

  if (!snapshot) {
    return { ok: false, message: "Product snapshot must be an object." };
  }

  const totalPriceMinor = computeOrderLineTotalMinor(
    price.amountMinor,
    qty.quantity
  );

  if (
    input.totalPriceMinor !== undefined &&
    input.totalPriceMinor !== totalPriceMinor
  ) {
    return { ok: false, message: "Line total does not match unit price × qty." };
  }

  return {
    ok: true,
    quantity: qty.quantity,
    unitPriceMinor: price.amountMinor,
    totalPriceMinor,
    skuSnapshot: sku,
    titleSnapshot: title,
    variantTitleSnapshot: variantTitle,
    productSnapshot: snapshot,
  };
}

/** Pure RLS mirror: buyer may read only own orders. */
export function canBuyerReadOrder(input: {
  buyerId: string;
  requesterUserId: string | null | undefined;
}): boolean {
  if (!input.requesterUserId) return false;
  return input.buyerId === input.requesterUserId;
}

/**
 * Pure RLS mirror: sellers read only orders for stores they belong to.
 * Membership role must be at least viewer; no cross-store access.
 */
export function canSellerReadOrder(input: {
  orderStoreId: string;
  memberStoreId: string | null | undefined;
  memberRole: StoreMemberRole | null | undefined;
  memberStatus?: string | null;
}): boolean {
  if (!input.memberStoreId || input.memberStoreId !== input.orderStoreId) {
    return false;
  }
  if (input.memberStatus != null && input.memberStatus !== "active") {
    return false;
  }
  return canViewStore(input.memberRole);
}

/** Combined read gate used by app-layer checks (mirrors DB policy intent). */
export function canReadStoreOrder(input: {
  buyerId: string;
  storeId: string;
  requesterUserId: string | null | undefined;
  memberStoreId?: string | null;
  memberRole?: StoreMemberRole | null;
  memberStatus?: string | null;
  isPlatformAdmin?: boolean;
}): boolean {
  if (!input.requesterUserId) return false;
  if (input.isPlatformAdmin) return true;
  if (canBuyerReadOrder(input)) return true;
  return canSellerReadOrder({
    orderStoreId: input.storeId,
    memberStoreId: input.memberStoreId,
    memberRole: input.memberRole,
    memberStatus: input.memberStatus,
  });
}

/**
 * Create RPC trust boundary: line payloads may only identify catalog rows + qty.
 * Prices/titles/SKUs/snapshots must be derived server-side from DB rows.
 */
export function assertOrderCreateItemPayloadTrusted(item: Record<string, unknown>):
  | { ok: true; productId: string; variantId: string; quantity: number }
  | { ok: false; message: string } {
  for (const key of ORDER_CREATE_FORBIDDEN_ITEM_KEYS) {
    if (Object.prototype.hasOwnProperty.call(item, key)) {
      return {
        ok: false,
        message: `Order item must not include client-priced field ${key}.`,
      };
    }
  }

  const productId =
    typeof item.product_id === "string" ? item.product_id.trim() : "";
  const variantId =
    typeof item.variant_id === "string" ? item.variant_id.trim() : "";
  if (!productId || !variantId) {
    return {
      ok: false,
      message: "Order item product_id and variant_id are required.",
    };
  }

  const qty = validateOrderQuantity(item.quantity);
  if (!qty.ok) return qty;

  return {
    ok: true,
    productId,
    variantId,
    quantity: qty.quantity,
  };
}

/** Header identity fields that must remain immutable after create. */
export function assertOrderHeaderIdentityPreserved(input: {
  before: {
    buyerId: string;
    storeId: string;
    orderNumber: string;
    currency: string;
    subtotalMinor: number;
    discountTotalMinor: number;
    taxTotalMinor: number;
    shippingTotalMinor: number;
    grandTotalMinor: number;
  };
  after: {
    buyerId: string;
    storeId: string;
    orderNumber: string;
    currency: string;
    subtotalMinor: number;
    discountTotalMinor: number;
    taxTotalMinor: number;
    shippingTotalMinor: number;
    grandTotalMinor: number;
  };
}): { ok: true } | { ok: false; message: string } {
  const keys = [
    "buyerId",
    "storeId",
    "orderNumber",
    "currency",
    "subtotalMinor",
    "discountTotalMinor",
    "taxTotalMinor",
    "shippingTotalMinor",
    "grandTotalMinor",
  ] as const;

  for (const key of keys) {
    if (input.before[key] !== input.after[key]) {
      return {
        ok: false,
        message: `Order field ${key} must remain immutable after create.`,
      };
    }
  }
  return { ok: true };
}

/** Store mismatch contract mirrored by enforce_order_item_store_alignment. */
export function assertOrderItemBelongsToOrderStore(input: {
  orderStoreId: string;
  productStoreId: string;
}): { ok: true } | { ok: false; message: string } {
  if (input.orderStoreId !== input.productStoreId) {
    return {
      ok: false,
      message: "Order item product must belong to the order store.",
    };
  }
  return { ok: true };
}

/**
 * Snapshot preservation contract: after create, catalog mutations must not
 * rewrite frozen order_item fields.
 */
export function assertOrderItemSnapshotsPreserved(input: {
  before: {
    productId: string;
    variantId: string | null;
    sellerUserId: string;
    quantity: number;
    unitPriceMinor: number;
    totalPriceMinor: number;
    productSnapshot: Record<string, unknown>;
    skuSnapshot: string;
    titleSnapshot: string;
    variantTitleSnapshot: string | null;
  };
  after: {
    productId: string;
    variantId: string | null;
    sellerUserId: string;
    quantity: number;
    unitPriceMinor: number;
    totalPriceMinor: number;
    productSnapshot: Record<string, unknown>;
    skuSnapshot: string;
    titleSnapshot: string;
    variantTitleSnapshot: string | null;
  };
}): { ok: true } | { ok: false; message: string } {
  const keys = [
    "productId",
    "variantId",
    "sellerUserId",
    "quantity",
    "unitPriceMinor",
    "totalPriceMinor",
    "skuSnapshot",
    "titleSnapshot",
    "variantTitleSnapshot",
  ] as const;

  for (const key of keys) {
    if (input.before[key] !== input.after[key]) {
      return {
        ok: false,
        message: `Order item field ${key} must remain immutable.`,
      };
    }
  }

  if (
    JSON.stringify(input.before.productSnapshot) !==
    JSON.stringify(input.after.productSnapshot)
  ) {
    return {
      ok: false,
      message: "Order item product_snapshot must remain immutable.",
    };
  }

  return { ok: true };
}

/** Human-friendly order number format used by next_store_order_number(). */
export const STORE_ORDER_NUMBER_RE = /^UMT-[0-9]{8}-[A-Z0-9]{6}$/;

export function isValidStoreOrderNumber(value: string): boolean {
  return STORE_ORDER_NUMBER_RE.test(value);
}
