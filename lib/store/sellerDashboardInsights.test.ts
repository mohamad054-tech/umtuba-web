import { describe, expect, it } from "vitest";
import {
  buildDashboardMetricCards,
  deriveInventorySnapshot,
  deriveOrderSnapshotFromRecentList,
  deriveProductSnapshot,
  deriveSellerDashboardAttention,
  deriveStoreReadiness,
  formatDashboardMoney,
} from "./sellerDashboardInsights";
import type { SellerInventoryRow } from "./sellerInventoryQueries";
import type { SellerOrderListItem } from "./orders";
import type { StoreProductRow } from "./types";

function product(
  overrides: Partial<StoreProductRow> & Pick<StoreProductRow, "id" | "status">
): StoreProductRow {
  return {
    store_id: "s1",
    slug: "p",
    title: "Product",
    short_description: null,
    description: null,
    product_type: "physical",
    moderation_status: "pending",
    primary_category_id: null,
    brand_id: null,
    created_by: "u1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    published_at: null,
    ...overrides,
  };
}

function order(
  overrides: Partial<SellerOrderListItem> & Pick<SellerOrderListItem, "id">
): SellerOrderListItem {
  return {
    orderNumber: "ORD-1",
    createdAt: "2026-07-01T00:00:00Z",
    buyerDisplayName: "Ada",
    status: "pending",
    paymentStatus: "pending",
    fulfillmentStatus: "unfulfilled",
    currency: "USD",
    grandTotalMinor: 1000,
    itemCount: 1,
    previewTitles: [],
    ...overrides,
  };
}

function inv(
  overrides: Partial<SellerInventoryRow> = {}
): SellerInventoryRow {
  return {
    productId: "p1",
    productTitle: "Lamp",
    productSlug: "lamp",
    productStatus: "active",
    productType: "physical",
    variantId: "v1",
    variantTitle: "Default",
    sku: "SKU-1",
    variantStatus: "active",
    warehouseKey: "default",
    inventoryId: "i1",
    onHand: 10,
    reserved: 0,
    safetyStock: 2,
    allowBackorder: false,
    availableToSell: 8,
    inventoryUpdatedAt: "2026-07-01T00:00:00Z",
    missingInventory: false,
    availabilityMode: "finite",
    ...overrides,
  };
}

describe("sellerDashboardInsights — snapshots", () => {
  it("separates product readiness buckets", () => {
    const snap = deriveProductSnapshot([
      product({ id: "1", status: "draft" }),
      product({ id: "2", status: "active" }),
      product({ id: "3", status: "in_review" }),
      product({ id: "4", status: "hidden" }),
    ]);
    expect(snap.draft).toBe(1);
    expect(snap.active).toBe(1);
    expect(snap.inReview).toBe(1);
    expect(snap.hidden).toBe(1);
  });

  it("separates paid vs unpaid order values and never calls them revenue", () => {
    const snap = deriveOrderSnapshotFromRecentList({
      scopeLabel: "Recent orders window",
      orders: [
        order({
          id: "a",
          status: "confirmed",
          paymentStatus: "paid",
          grandTotalMinor: 2000,
        }),
        order({
          id: "b",
          status: "pending",
          paymentStatus: "pending",
          grandTotalMinor: 500,
        }),
        order({
          id: "c",
          status: "cancelled",
          paymentStatus: "pending",
          grandTotalMinor: 100,
        }),
      ],
    });
    expect(snap.paidOrderValueMinor).toBe(2000);
    expect(snap.unpaidOrderValueMinor).toBe(500);
    expect(snap.grossOrderValueMinor).toBe(2600);
    expect(snap.cancelledOrders).toBe(1);
    const cards = buildDashboardMetricCards({
      orderSnapshot: snap,
      productSnapshot: null,
      inventorySnapshot: null,
      analyticsGmvMinor: null,
      analyticsCurrency: null,
      analyticsPeriodLabel: null,
    });
    expect(cards.find((c) => c.id === "gross-order-value")?.hint).toMatch(
      /not revenue or profit/i
    );
  });

  it("marks mixed currencies as unavailable money totals", () => {
    const snap = deriveOrderSnapshotFromRecentList({
      scopeLabel: "window",
      orders: [
        order({ id: "a", currency: "USD", grandTotalMinor: 100 }),
        order({ id: "b", currency: "EUR", grandTotalMinor: 100 }),
      ],
    });
    expect(snap.grossOrderValueMinor).toBeNull();
    expect(formatDashboardMoney(null, null)).toBe("Unavailable");
  });

  it("derives inventory pressure without inventing allocated", () => {
    const snap = deriveInventorySnapshot({
      rows: [
        inv({ availableToSell: 1, safetyStock: 2, onHand: 5, reserved: 2 }),
        inv({
          variantId: "v2",
          availableToSell: 0,
          onHand: 2,
          reserved: 2,
          safetyStock: 0,
        }),
        inv({
          variantId: "v3",
          missingInventory: true,
          onHand: null,
          reserved: null,
          safetyStock: null,
          availableToSell: null,
        }),
      ],
      reservations: [],
      reservationsVisible: true,
    });
    expect(snap.lowStock).toBe(1);
    expect(snap.fullyReserved).toBe(1);
    expect(snap.missing).toBe(1);
  });
});

describe("sellerDashboardInsights — attention and readiness", () => {
  it("flags inactive/unverified stores and unpaid packed orders", () => {
    const items = deriveSellerDashboardAttention({
      storeStatus: "paused",
      verificationStatus: "pending",
      products: [product({ id: "1", status: "draft", title: "Draft Bowl" })],
      orders: [
        order({
          id: "o1",
          orderNumber: "ORD-9",
          status: "packed",
          paymentStatus: "pending",
        }),
      ],
      inventory: [],
      reservations: [],
      reservationsVisible: false,
    });
    expect(items.some((i) => i.id === "store-inactive")).toBe(true);
    expect(items.some((i) => i.id === "store-unverified")).toBe(true);
    expect(items.some((i) => i.id.startsWith("order-pay-block"))).toBe(true);
  });

  it("builds readiness notes for new stores", () => {
    const readiness = deriveStoreReadiness({
      storeStatus: "active",
      verificationStatus: "pending",
      productSnapshot: deriveProductSnapshot([]),
    });
    expect(readiness.catalogReady).toBe(false);
    expect(readiness.notes.length).toBeGreaterThan(0);
  });
});
