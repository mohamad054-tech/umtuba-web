/**
 * Seller Dashboard & Operational Insights V1 — pure derivation.
 * Dashboard is not a source of truth. Gross order value is not revenue or profit.
 */

import { isStuckReservation } from "./commerceSafety";
import {
  isRealizedPaidOrder,
  isUnpaidPendingOrder,
} from "./analyticsFinance";
import type { SellerOrderListItem } from "./orders";
import {
  deriveInventoryAvailabilityState,
  type SellerInventoryAvailabilityState,
} from "./sellerInventoryPresentation";
import type {
  SellerInventoryRow,
  SellerReservationRow,
} from "./sellerInventoryQueries";
import {
  deriveSellerOrderAttention,
  isPaymentBlockingFulfillmentProgress,
} from "./sellerOrdersPresentation";
import type { StoreProductRow } from "./types";

const HREF = {
  store: "/seller/store",
  setup: "/seller/setup",
  orders: "/seller/store/orders",
  products: "/seller/store/products",
  inventory: "/seller/store/inventory",
  analytics: "/seller/store/analytics",
} as const;

export type SellerDashboardSeverity = "critical" | "warn" | "info";

export type SellerDashboardAttentionItem = {
  id: string;
  severity: SellerDashboardSeverity;
  title: string;
  reason: string;
  href: string;
  actionLabel: string;
};

export type SellerDashboardOrderSnapshot = {
  scopeLabel: string;
  totalOrders: number;
  openOrders: number;
  cancelledOrders: number;
  completedOrders: number;
  paymentBlockedOrders: number;
  awaitingAck: number;
  preparing: number;
  packed: number;
  grossOrderValueMinor: number | null;
  paidOrderValueMinor: number | null;
  unpaidOrderValueMinor: number | null;
  currency: string | null;
  valuesFromRecentWindow: boolean;
  recent: Array<{
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    grandTotalMinor: number;
    currency: string;
    createdAt: string;
  }>;
};

export type SellerDashboardProductSnapshot = {
  draft: number;
  inReview: number;
  active: number;
  hidden: number;
  archived: number;
  rejected: number;
  total: number;
};

export type SellerDashboardInventorySnapshot = {
  lowStock: number;
  outOfStock: number;
  fullyReserved: number;
  missing: number;
  activeReservations: number | null;
  stuckReservations: number | null;
  reservationsVisible: boolean;
};

export type SellerDashboardStoreReadiness = {
  storeActive: boolean;
  storeVerified: boolean;
  hasActiveProducts: boolean;
  catalogReady: boolean;
  orderOpsReady: boolean;
  notes: string[];
};

export type SellerDashboardMetricCard = {
  id: string;
  label: string;
  value: string;
  hint: string;
  href?: string;
};

function moneyLabel(minor: number | null, currency: string | null): string {
  if (minor == null || !currency) return "Unavailable";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
}

export function formatDashboardMoney(
  minor: number | null,
  currency: string | null
): string {
  return moneyLabel(minor, currency);
}

export function deriveProductSnapshot(
  products: StoreProductRow[]
): SellerDashboardProductSnapshot {
  const snap: SellerDashboardProductSnapshot = {
    draft: 0,
    inReview: 0,
    active: 0,
    hidden: 0,
    archived: 0,
    rejected: 0,
    total: products.length,
  };
  for (const p of products) {
    if (p.status === "draft") snap.draft += 1;
    else if (p.status === "in_review" || p.status === "pending_review") {
      snap.inReview += 1;
    } else if (p.status === "active") snap.active += 1;
    else if (
      p.status === "hidden" ||
      p.status === "paused" ||
      p.status === "blocked"
    ) {
      snap.hidden += 1;
    } else if (p.status === "archived") snap.archived += 1;
    else if (p.status === "rejected") snap.rejected += 1;
  }
  return snap;
}

export function deriveInventorySnapshot(input: {
  rows: SellerInventoryRow[];
  reservations: SellerReservationRow[];
  reservationsVisible: boolean;
}): SellerDashboardInventorySnapshot {
  let lowStock = 0;
  let outOfStock = 0;
  let fullyReserved = 0;
  let missing = 0;
  for (const row of input.rows) {
    const state: SellerInventoryAvailabilityState =
      deriveInventoryAvailabilityState(row);
    if (state === "low_stock") lowStock += 1;
    if (state === "out_of_stock") outOfStock += 1;
    if (state === "fully_reserved") fullyReserved += 1;
    if (state === "missing" || state === "unknown") missing += 1;
  }

  if (!input.reservationsVisible) {
    return {
      lowStock,
      outOfStock,
      fullyReserved,
      missing,
      activeReservations: null,
      stuckReservations: null,
      reservationsVisible: false,
    };
  }

  let activeReservations = 0;
  let stuckReservations = 0;
  for (const r of input.reservations) {
    if (r.status === "active" || r.status === "pending_capture") {
      activeReservations += 1;
      if (isStuckReservation({ status: r.status, expiresAtIso: r.expiresAt })) {
        stuckReservations += 1;
      }
    }
  }

  return {
    lowStock,
    outOfStock,
    fullyReserved,
    missing,
    activeReservations,
    stuckReservations,
    reservationsVisible: true,
  };
}

export function deriveOrderSnapshotFromRecentList(input: {
  orders: SellerOrderListItem[];
  scopeLabel: string;
}): SellerDashboardOrderSnapshot {
  const orders = input.orders;
  let openOrders = 0;
  let cancelledOrders = 0;
  let completedOrders = 0;
  let paymentBlockedOrders = 0;
  let awaitingAck = 0;
  let preparing = 0;
  let packed = 0;
  let grossOrderValueMinor = 0;
  let paidOrderValueMinor = 0;
  let unpaidOrderValueMinor = 0;
  let currency: string | null = orders[0]?.currency ?? null;
  let currencyConsistent = true;

  for (const order of orders) {
    if (currency && order.currency !== currency) currencyConsistent = false;
    if (!currency) currency = order.currency;

    if (order.status === "cancelled") cancelledOrders += 1;
    else if (order.status === "delivered") completedOrders += 1;
    else if (order.status !== "refunded") openOrders += 1;

    if (order.status === "pending") awaitingAck += 1;
    if (order.status === "confirmed" || order.status === "processing") {
      preparing += 1;
    }
    if (order.status === "packed") packed += 1;

    if (
      isPaymentBlockingFulfillmentProgress(order.paymentStatus) &&
      order.status !== "cancelled" &&
      order.status !== "refunded"
    ) {
      paymentBlockedOrders += 1;
    }

    grossOrderValueMinor += order.grandTotalMinor;
    if (isRealizedPaidOrder(order)) {
      paidOrderValueMinor += order.grandTotalMinor;
    } else if (
      isUnpaidPendingOrder(order) ||
      order.paymentStatus === "failed"
    ) {
      unpaidOrderValueMinor += order.grandTotalMinor;
    }
  }

  return {
    scopeLabel: input.scopeLabel,
    totalOrders: orders.length,
    openOrders,
    cancelledOrders,
    completedOrders,
    paymentBlockedOrders,
    awaitingAck,
    preparing,
    packed,
    grossOrderValueMinor: currencyConsistent ? grossOrderValueMinor : null,
    paidOrderValueMinor: currencyConsistent ? paidOrderValueMinor : null,
    unpaidOrderValueMinor: currencyConsistent ? unpaidOrderValueMinor : null,
    currency: currencyConsistent ? currency : null,
    valuesFromRecentWindow: true,
    recent: orders.slice(0, 5).map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      paymentStatus: o.paymentStatus,
      grandTotalMinor: o.grandTotalMinor,
      currency: o.currency,
      createdAt: o.createdAt,
    })),
  };
}

export function deriveStoreReadiness(input: {
  storeStatus: string;
  verificationStatus: string;
  productSnapshot: SellerDashboardProductSnapshot;
}): SellerDashboardStoreReadiness {
  const storeActive = input.storeStatus === "active";
  const storeVerified = input.verificationStatus === "verified";
  const hasActiveProducts = input.productSnapshot.active > 0;
  const notes: string[] = [];
  if (!storeActive) {
    notes.push("Store is not active — public selling is unavailable.");
  }
  if (!storeVerified) {
    notes.push(
      "Store verification is incomplete — catalog create may stay locked."
    );
  }
  if (!hasActiveProducts) {
    notes.push("No published (active) products yet.");
  }
  return {
    storeActive,
    storeVerified,
    hasActiveProducts,
    catalogReady: storeActive && storeVerified && hasActiveProducts,
    orderOpsReady: storeActive,
    notes,
  };
}

export function deriveSellerDashboardAttention(input: {
  storeStatus: string;
  verificationStatus: string;
  products: StoreProductRow[];
  orders: SellerOrderListItem[];
  inventory: SellerInventoryRow[];
  reservations: SellerReservationRow[];
  reservationsVisible: boolean;
}): SellerDashboardAttentionItem[] {
  const items: SellerDashboardAttentionItem[] = [];

  if (input.storeStatus !== "active") {
    items.push({
      id: "store-inactive",
      severity: "critical",
      title: "Store inactive",
      reason: "Store status is not active. Selling and operations are blocked.",
      href: HREF.store,
      actionLabel: "Review store settings",
    });
  }

  if (input.verificationStatus !== "verified") {
    items.push({
      id: "store-unverified",
      severity: "warn",
      title: "Verification incomplete",
      reason: "Operator verification is still pending for this store.",
      href: HREF.setup,
      actionLabel: "Open setup",
    });
  }

  // Cap product alerts to avoid noise.
  let draftShown = 0;
  let reviewShown = 0;
  for (const product of input.products) {
    if (product.status === "draft" && draftShown < 5) {
      draftShown += 1;
      items.push({
        id: `product-draft-${product.id}`,
        severity: "info",
        title: "Draft product",
        reason: `"${product.title}" is still a draft and has not been submitted for review.`,
        href: `${HREF.products}/${product.id}/edit`,
        actionLabel: "Continue editing",
      });
    } else if (
      (product.status === "in_review" || product.status === "pending_review") &&
      reviewShown < 5
    ) {
      reviewShown += 1;
      items.push({
        id: `product-review-${product.id}`,
        severity: "info",
        title: "Product in review",
        reason: `"${product.title}" is waiting for operator moderation.`,
        href: `${HREF.products}/${product.id}/edit`,
        actionLabel: "View product",
      });
    } else if (product.status === "rejected") {
      items.push({
        id: `product-rejected-${product.id}`,
        severity: "warn",
        title: "Product rejected",
        reason: `"${product.title}" was rejected and needs revision.`,
        href: `${HREF.products}/${product.id}/edit`,
        actionLabel: "Revise product",
      });
    }
  }

  for (const order of input.orders) {
    if (order.paymentStatus === "failed" && order.status !== "cancelled") {
      items.push({
        id: `order-pay-failed-${order.id}`,
        severity: "critical",
        title: "Failed payment",
        reason: `Order ${order.orderNumber} has a failed payment state in trusted records.`,
        href: `${HREF.orders}/${order.id}`,
        actionLabel: "Open order",
      });
      continue;
    }
    if (
      isPaymentBlockingFulfillmentProgress(order.paymentStatus) &&
      ["packed", "processing", "confirmed"].includes(order.status)
    ) {
      items.push({
        id: `order-pay-block-${order.id}`,
        severity: "warn",
        title: "Payment-blocked fulfillment",
        reason: `Order ${order.orderNumber} cannot advance to ship/deliver while payment is unpaid.`,
        href: `${HREF.orders}/${order.id}`,
        actionLabel: "Review order",
      });
    }
    const attention = deriveSellerOrderAttention({
      status: order.status,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
    });
    if (attention.level === "critical" || attention.level === "warn") {
      if (!items.some((i) => i.id.includes(order.id))) {
        items.push({
          id: `order-attn-${order.id}`,
          severity: attention.level === "critical" ? "critical" : "warn",
          title: "Order needs attention",
          reason:
            attention.message ||
            `Order ${order.orderNumber} requires seller awareness.`,
          href: `${HREF.orders}/${order.id}`,
          actionLabel: "Open order",
        });
      }
    } else if (order.status === "pending") {
      items.push({
        id: `order-ack-${order.id}`,
        severity: "info",
        title: "Awaiting acknowledgement",
        reason: `Order ${order.orderNumber} is pending seller acknowledgement.`,
        href: `${HREF.orders}/${order.id}`,
        actionLabel: "Acknowledge",
      });
    }
  }

  let invShown = 0;
  for (const row of input.inventory) {
    if (invShown >= 8) break;
    const state = deriveInventoryAvailabilityState(row);
    if (state === "missing") {
      invShown += 1;
      items.push({
        id: `inv-missing-${row.variantId}`,
        severity: "critical",
        title: "Missing inventory",
        reason: `"${row.productTitle}" (${row.sku}) has no trusted inventory row.`,
        href: `${HREF.inventory}?variant=${row.variantId}`,
        actionLabel: "Open inventory",
      });
    } else if (state === "fully_reserved") {
      invShown += 1;
      items.push({
        id: `inv-reserved-${row.variantId}`,
        severity: "critical",
        title: "Fully reserved",
        reason: `"${row.productTitle}" (${row.sku}) has all on-hand units reserved.`,
        href: `${HREF.inventory}?variant=${row.variantId}`,
        actionLabel: "View holds",
      });
    } else if (state === "out_of_stock") {
      invShown += 1;
      items.push({
        id: `inv-oos-${row.variantId}`,
        severity: "warn",
        title: "Out of stock",
        reason: `"${row.productTitle}" (${row.sku}) available-to-sell is zero.`,
        href: `${HREF.inventory}?variant=${row.variantId}`,
        actionLabel: "Open inventory",
      });
    } else if (state === "low_stock") {
      invShown += 1;
      items.push({
        id: `inv-low-${row.variantId}`,
        severity: "info",
        title: "Low stock",
        reason: `"${row.productTitle}" (${row.sku}) is at or below safety stock.`,
        href: `${HREF.inventory}?variant=${row.variantId}`,
        actionLabel: "Review stock",
      });
    }
  }

  if (input.reservationsVisible) {
    for (const r of input.reservations) {
      if (isStuckReservation({ status: r.status, expiresAtIso: r.expiresAt })) {
        items.push({
          id: `res-stuck-${r.id}`,
          severity: "critical",
          title: "Stuck reservation",
          reason: "An inventory hold is past expiry and still active.",
          href: `${HREF.inventory}?variant=${r.variantId}`,
          actionLabel: "Inspect hold",
        });
      }
    }
  }

  const severityRank: Record<SellerDashboardSeverity, number> = {
    critical: 0,
    warn: 1,
    info: 2,
  };
  return items
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
    .slice(0, 20);
}

export function buildDashboardMetricCards(input: {
  orderSnapshot: SellerDashboardOrderSnapshot | null;
  productSnapshot: SellerDashboardProductSnapshot | null;
  inventorySnapshot: SellerDashboardInventorySnapshot | null;
  analyticsGmvMinor: number | null;
  analyticsCurrency: string | null;
  analyticsPeriodLabel: string | null;
}): SellerDashboardMetricCard[] {
  const cards: SellerDashboardMetricCard[] = [];
  const orders = input.orderSnapshot;
  const products = input.productSnapshot;
  const inventory = input.inventorySnapshot;

  if (orders) {
    cards.push({
      id: "orders-total",
      label: "Orders in window",
      value: String(orders.totalOrders),
      hint: orders.scopeLabel,
      href: HREF.orders,
    });
    cards.push({
      id: "orders-open",
      label: "Open orders",
      value: String(orders.openOrders),
      hint: "Not cancelled, refunded, or delivered",
      href: HREF.orders,
    });
    cards.push({
      id: "orders-pay-blocked",
      label: "Payment-blocked",
      value: String(orders.paymentBlockedOrders),
      hint: "Unpaid/failed — ship/deliver blocked",
      href: HREF.orders,
    });
  }

  if (input.analyticsGmvMinor != null && input.analyticsCurrency) {
    cards.push({
      id: "gmv",
      label: "Gross merchandise value",
      value: moneyLabel(input.analyticsGmvMinor, input.analyticsCurrency),
      hint: `${input.analyticsPeriodLabel ?? "Period"} · provisional · not profit`,
      href: HREF.analytics,
    });
  } else if (orders) {
    cards.push({
      id: "gross-order-value",
      label: "Gross order value",
      value: moneyLabel(orders.grossOrderValueMinor, orders.currency),
      hint: `${orders.scopeLabel} · not revenue or profit`,
      href: HREF.orders,
    });
    cards.push({
      id: "paid-order-value",
      label: "Paid order value",
      value: moneyLabel(orders.paidOrderValueMinor, orders.currency),
      hint: "payment_status = paid · not settlement",
    });
    cards.push({
      id: "unpaid-order-value",
      label: "Unpaid order value",
      value: moneyLabel(orders.unpaidOrderValueMinor, orders.currency),
      hint: "Pending/authorized/failed totals",
    });
  }

  if (products) {
    cards.push({
      id: "products-active",
      label: "Published products",
      value: String(products.active),
      hint: "status = active",
      href: HREF.products,
    });
    cards.push({
      id: "products-draft",
      label: "Draft products",
      value: String(products.draft),
      hint: "Needs submit for review",
      href: HREF.products,
    });
  }

  if (inventory) {
    cards.push({
      id: "inv-oos",
      label: "Out of stock",
      value: String(inventory.outOfStock),
      hint: "Available-to-sell is zero",
      href: HREF.inventory,
    });
    cards.push({
      id: "inv-low",
      label: "Low stock",
      value: String(inventory.lowStock),
      hint: "At or below safety stock",
      href: HREF.inventory,
    });
    if (inventory.reservationsVisible) {
      cards.push({
        id: "inv-holds",
        label: "Active holds",
        value: String(inventory.activeReservations ?? 0),
        hint:
          inventory.stuckReservations && inventory.stuckReservations > 0
            ? `${inventory.stuckReservations} stuck past expiry`
            : "Checkout/order reservations",
        href: HREF.inventory,
      });
    }
  }

  return cards;
}
