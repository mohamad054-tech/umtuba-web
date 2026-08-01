import { describe, expect, it } from "vitest";
import type { StoreProductRow } from "./types";
import {
  SELLER_EXPERIENCE_FOUNDATION_ID,
  buildSellerExperienceBundle,
  deriveSellerActionCenter,
  deriveSellerAnalyticsFoundation,
  deriveSellerExperienceSummary,
  deriveSellerProductHealth,
  deriveSellerStoreReadinessReport,
} from "./sellerExperienceFoundation";

function product(
  overrides: Partial<StoreProductRow> & Pick<StoreProductRow, "id" | "title">
): StoreProductRow {
  return {
    store_id: "store-1",
    slug: "slug",
    short_description: null,
    description: null,
    product_type: "digital",
    status: "draft",
    moderation_status: "pending",
    primary_category_id: null,
    brand_id: null,
    created_by: "user-1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    published_at: null,
    ...overrides,
  };
}

describe("Seller Experience Foundation V1 — dashboard summary", () => {
  it("summarizes products, store status, and read-only orders/revenue", () => {
    const products = [
      product({ id: "p1", title: "A", status: "active", moderation_status: "approved" }),
      product({ id: "p2", title: "B", status: "draft" }),
      product({ id: "p3", title: "C", status: "draft" }),
    ];
    const summary = deriveSellerExperienceSummary({
      storeId: "store-1",
      storeName: "Demo",
      storeSlug: "demo",
      storeStatus: "active",
      verificationStatus: "verified",
      products,
      orderSnapshot: {
        scopeLabel: "Recent",
        totalOrders: 4,
        openOrders: 1,
        cancelledOrders: 0,
        completedOrders: 3,
        paymentBlockedOrders: 0,
        awaitingAck: 0,
        preparing: 0,
        packed: 0,
        grossOrderValueMinor: 1000,
        paidOrderValueMinor: 800,
        unpaidOrderValueMinor: 200,
        currency: "USD",
        valuesFromRecentWindow: true,
        recent: [],
      },
      revenue: {
        gmvMinor: 900,
        netSalesMinor: 850,
        currency: "USD",
        periodLabel: "Last 7 days",
      },
    });
    expect(summary.capability).toBe(SELLER_EXPERIENCE_FOUNDATION_ID);
    expect(summary.totalProducts).toBe(3);
    expect(summary.publishedProducts).toBe(1);
    expect(summary.draftProducts).toBe(2);
    expect(summary.storeStatus).toBe("active");
    expect(summary.ordersSummary?.totalOrders).toBe(4);
    expect(summary.revenueSummary?.readOnly).toBe(true);
    expect(summary.revenueSummary?.netSalesMinor).toBe(850);
  });
});

describe("Seller Experience Foundation V1 — product health", () => {
  it("flags draft, missing description/images/pricing/inventory, review, rejected, published, complete", () => {
    const draft = deriveSellerProductHealth({
      product: product({ id: "d1", title: "Draft", status: "draft" }),
    });
    expect(draft.codes).toContain("draft");
    expect(draft.codes).toContain("missing_description");

    const missing = deriveSellerProductHealth({
      product: product({
        id: "m1",
        title: "Almost",
        status: "active",
        moderation_status: "approved",
        description: "A sufficiently long product description for health.",
        primary_category_id: "cat-1",
      }),
      hasImages: false,
      hasPricing: false,
      hasInventoryRow: false,
    });
    expect(missing.codes).toContain("published");
    expect(missing.codes).toContain("missing_images");
    expect(missing.codes).toContain("missing_pricing");
    expect(missing.codes).toContain("missing_inventory");

    const pending = deriveSellerProductHealth({
      product: product({
        id: "r1",
        title: "Review",
        status: "in_review",
        moderation_status: "pending",
        description: "A sufficiently long product description for health.",
      }),
    });
    expect(pending.codes).toContain("pending_review");

    const rejected = deriveSellerProductHealth({
      product: product({
        id: "x1",
        title: "Rejected",
        status: "rejected",
        moderation_status: "rejected",
        description: "A sufficiently long product description for health.",
      }),
    });
    expect(rejected.codes).toContain("rejected");

    const complete = deriveSellerProductHealth({
      product: product({
        id: "c1",
        title: "Complete",
        status: "active",
        moderation_status: "approved",
        description: "A sufficiently long product description for health.",
        primary_category_id: "cat-1",
      }),
      hasImages: true,
      hasPricing: true,
      hasInventoryRow: true,
    });
    expect(complete.codes).toContain("complete");
    expect(complete.completenessScore).toBe(100);
    expect(complete.primaryIssue).toBeNull();
  });
});

describe("Seller Experience Foundation V1 — action center", () => {
  it("builds action cards for incomplete, images, review, rejected, and fixes", () => {
    const health = [
      deriveSellerProductHealth({
        product: product({ id: "1", title: "D", status: "draft" }),
        hasImages: false,
      }),
      deriveSellerProductHealth({
        product: product({
          id: "2",
          title: "R",
          status: "rejected",
          moderation_status: "rejected",
          description: "A sufficiently long product description for health.",
        }),
      }),
    ];
    const cards = deriveSellerActionCenter(health, {
      storeStatus: "active",
      verificationStatus: "verified",
    });
    const ids = cards.map((c) => c.id);
    expect(ids).toContain("complete-product-data");
    expect(ids).toContain("add-images");
    expect(ids).toContain("submit-review");
    expect(ids).toContain("rejected-products");
  });
});

describe("Seller Experience Foundation V1 — analytics foundation", () => {
  it("computes conversion and top products without a heavy analytics system", () => {
    const analytics = deriveSellerAnalyticsFoundation({
      productViews: 100,
      storeViews: 50,
      orders: 5,
      salesMinor: 2500,
      currency: "USD",
      periodLabel: "7d",
      topProducts: [
        {
          productId: "p1",
          title: "Top",
          quantitySold: 3,
          merchandiseSubtotalMinor: 1500,
        },
      ],
    });
    expect(analytics.conversionRate).toBe(10);
    expect(analytics.topProducts[0]?.units).toBe(3);
    expect(analytics.notes.length).toBe(0);

    const noViews = deriveSellerAnalyticsFoundation({ orders: 2 });
    expect(noViews.conversionRate).toBeNull();
    expect(noViews.notes[0]).toMatch(/views/i);
  });
});

describe("Seller Experience Foundation V1 — store readiness", () => {
  it("reports readiness percent, missing items, and sell readiness", () => {
    const notReady = deriveSellerStoreReadinessReport({
      storeStatus: "draft",
      verificationStatus: "pending",
      products: [],
    });
    expect(notReady.readyToSell).toBe(false);
    expect(notReady.readinessPercent).toBeLessThan(85);
    expect(notReady.missing.length).toBeGreaterThan(0);
    expect(notReady.suggestions.length).toBeGreaterThan(0);

    const ready = deriveSellerStoreReadinessReport({
      storeStatus: "active",
      verificationStatus: "verified",
      products: [
        product({
          id: "p1",
          title: "Ready",
          status: "active",
          moderation_status: "approved",
          description: "A sufficiently long product description for health.",
          primary_category_id: "cat-1",
        }),
      ],
      health: [
        deriveSellerProductHealth({
          product: product({
            id: "p1",
            title: "Ready",
            status: "active",
            moderation_status: "approved",
            description: "A sufficiently long product description for health.",
            primary_category_id: "cat-1",
          }),
          hasImages: true,
          hasPricing: true,
        }),
      ],
    });
    expect(ready.readyToSell).toBe(true);
    expect(ready.readinessPercent).toBeGreaterThanOrEqual(85);
    expect(ready.capability).toBe(SELLER_EXPERIENCE_FOUNDATION_ID);
  });
});

describe("Seller Experience Foundation V1 — bundle", () => {
  it("composes summary, health, actions, analytics, readiness", () => {
    const bundle = buildSellerExperienceBundle({
      storeId: "store-1",
      storeName: "Demo",
      storeSlug: "demo",
      storeStatus: "active",
      verificationStatus: "verified",
      products: [
        product({
          id: "p1",
          title: "Live",
          status: "active",
          moderation_status: "approved",
          description: "A sufficiently long product description for health.",
          primary_category_id: "cat-1",
        }),
      ],
      productFacts: [
        {
          product: product({
            id: "p1",
            title: "Live",
            status: "active",
            moderation_status: "approved",
            description: "A sufficiently long product description for health.",
            primary_category_id: "cat-1",
          }),
          hasImages: true,
          hasPricing: true,
        },
      ],
      revenue: {
        gmvMinor: 100,
        netSalesMinor: 90,
        currency: "USD",
        periodLabel: "7d",
      },
      analytics: { storeViews: 10, orders: 1, salesMinor: 90 },
    });
    expect(bundle.summary.publishedProducts).toBe(1);
    expect(bundle.productHealth).toHaveLength(1);
    expect(bundle.actionCenter.length).toBeGreaterThanOrEqual(0);
    expect(bundle.analytics.conversionRate).toBe(10);
    expect(bundle.storeReadiness.readyToSell).toBe(true);
  });
});
