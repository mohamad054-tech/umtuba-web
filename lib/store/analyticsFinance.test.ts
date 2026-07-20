import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ANALYTICS_MAX_RANGE_DAYS,
  ANALYTICS_MAX_TOP_LIMIT,
  ANALYTICS_METRIC_DEFINITIONS,
  ANALYTICS_PERIOD_PRESETS,
  FINANCE_FOUNDATION_PLACEHOLDER,
  buildAnalyticsDateRange,
  computeProvisionalNetSalesMinor,
  emptyAnalyticsBundle,
  isAnalyticsUnavailableMessage,
  isRealizedPaidOrder,
  isRefundedOrder,
  isUnpaidPendingOrder,
  mapAnalyticsRpcError,
  parseAnalyticsCouponPerformance,
  parseAnalyticsSummary,
  parseAnalyticsTopProducts,
  resolveAnalyticsPeriod,
  validateAnalyticsDateRange,
} from "./analyticsFinance";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260817_store_analytics_finance_foundation_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("analytics finance — order classification", () => {
  it("classifies realized paid orders", () => {
    expect(
      isRealizedPaidOrder({ paymentStatus: "paid", status: "confirmed" })
    ).toBe(true);
    expect(
      isRealizedPaidOrder({ paymentStatus: "pending", status: "confirmed" })
    ).toBe(false);
    expect(
      isRealizedPaidOrder({ paymentStatus: "paid", status: "cancelled" })
    ).toBe(false);
    expect(
      isRealizedPaidOrder({ paymentStatus: "paid", status: "refunded" })
    ).toBe(false);
  });

  it("classifies unpaid and refunded orders", () => {
    expect(
      isUnpaidPendingOrder({ paymentStatus: "pending", status: "pending" })
    ).toBe(true);
    expect(
      isUnpaidPendingOrder({ paymentStatus: "authorized", status: "confirmed" })
    ).toBe(true);
    expect(
      isUnpaidPendingOrder({ paymentStatus: "failed", status: "pending" })
    ).toBe(false);
    expect(
      isRefundedOrder({ paymentStatus: "refunded", status: "delivered" })
    ).toBe(true);
    expect(isRefundedOrder({ paymentStatus: "paid", status: "refunded" })).toBe(
      true
    );
  });
});

describe("analytics finance — integer minor-unit math", () => {
  it("computes provisional net sales without floats", () => {
    expect(
      computeProvisionalNetSalesMinor({
        merchandiseSubtotalMinor: 10_000,
        discountsMinor: 1_500,
        refundedMerchandiseMinor: 2_000,
      })
    ).toBe(6_500);
    expect(
      computeProvisionalNetSalesMinor({
        merchandiseSubtotalMinor: 100,
        discountsMinor: 500,
        refundedMerchandiseMinor: 0,
      })
    ).toBe(0);
    expect(
      computeProvisionalNetSalesMinor({
        merchandiseSubtotalMinor: 10_000,
        discountsMinor: 1_500,
        refundedMerchandiseMinor: 0,
      })
    ).toBe(8_500);
  });

  it("parses summary JSON with safe defaults and safe integer bounds", () => {
    expect(parseAnalyticsSummary(null)).toMatchObject({
      currency: "USD",
      netSalesMinor: 0,
      paidOrders: 0,
    });
    expect(
      parseAnalyticsSummary({
        currency: "eur",
        net_sales_minor: "4200",
        paid_orders: 3,
      })
    ).toMatchObject({
      currency: "EUR",
      netSalesMinor: 4200,
      paidOrders: 3,
    });
    expect(
      parseAnalyticsSummary({
        net_sales_minor: "9223372036854775807",
      }).netSalesMinor
    ).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("documents pre-discount subtotal semantics", () => {
    expect(
      ANALYTICS_METRIC_DEFINITIONS.grossMerchandiseValueMinor.description
    ).toContain("pre-discount");
    expect(ANALYTICS_METRIC_DEFINITIONS.netSalesMinor.description).toContain(
      "subtotal"
    );
  });
});

describe("analytics finance — date range and periods", () => {
  it("validates bounded UTC ranges", () => {
    const from = "2026-01-01T00:00:00.000Z";
    const to = "2026-06-01T00:00:00.000Z";
    expect(validateAnalyticsDateRange({ from, to }).ok).toBe(true);
    expect(validateAnalyticsDateRange({ from: to, to: from }).ok).toBe(false);
    const far = new Date("2026-01-01T00:00:00.000Z");
    const tooFar = new Date(far.getTime() + (ANALYTICS_MAX_RANGE_DAYS + 1) * 86400000);
    expect(
      validateAnalyticsDateRange({
        from: far.toISOString(),
        to: tooFar.toISOString(),
      }).ok
    ).toBe(false);
  });

  it("resolves period presets and builds ranges", () => {
    expect(resolveAnalyticsPeriod("7d")).toBe("7d");
    expect(resolveAnalyticsPeriod("invalid")).toBe("30d");
    expect(ANALYTICS_PERIOD_PRESETS).toHaveLength(3);
    const range = buildAnalyticsDateRange("7d", new Date("2026-07-20T12:00:00.000Z"));
    expect(range.periodKey).toBe("7d");
    expect(Date.parse(range.to)).toBeGreaterThan(Date.parse(range.from));
  });
});

describe("analytics finance — privacy and limits", () => {
  it("parses top products without buyer fields", () => {
    const rows = parseAnalyticsTopProducts([
      {
        product_id: "p1",
        title: "Widget",
        quantity_sold: 5,
        merchandise_subtotal_minor: 2500,
        buyer_id: "should-not-surface",
      },
    ]);
    expect(rows[0]).toEqual({
      productId: "p1",
      title: "Widget",
      quantitySold: 5,
      merchandiseSubtotalMinor: 2500,
    });
    expect(rows[0]).not.toHaveProperty("buyerId");
  });

  it("caps top limit constant", () => {
    expect(ANALYTICS_MAX_TOP_LIMIT).toBe(50);
  });

  it("maps unavailable RPC errors", () => {
    const msg = mapAnalyticsRpcError(
      'function seller_analytics_summary(uuid, timestamptz, timestamptz) does not exist'
    );
    expect(isAnalyticsUnavailableMessage(msg)).toBe(true);
  });

  it("maps multi-currency RPC errors", () => {
    expect(
      mapAnalyticsRpcError("Analytics currently supports a single currency per period")
    ).toContain("one order currency");
  });
});

describe("analytics finance — finance placeholder", () => {
  it("marks future finance models as not configured", () => {
    for (const model of Object.values(FINANCE_FOUNDATION_PLACEHOLDER)) {
      expect(model.status).toBe("not_configured");
    }
    expect(ANALYTICS_METRIC_DEFINITIONS.netSalesMinor.kind).toBe("provisional");
  });

  it("parses coupon performance rows", () => {
    expect(
      parseAnalyticsCouponPerformance([
        { coupon_id: "c1", code: "SAVE", redemption_count: 2, discount_minor: 300 },
      ])
    ).toEqual([
      {
        couponId: "c1",
        code: "SAVE",
        redemptionCount: 2,
        discountMinor: 300,
      },
    ]);
  });

  it("provides empty bundle for unavailable state", () => {
    const range = buildAnalyticsDateRange("30d");
    const empty = emptyAnalyticsBundle(range);
    expect(empty.summary.netSalesMinor).toBe(0);
    expect(empty.topProducts).toEqual([]);
  });
});

describe("analytics finance migration contracts", () => {
  it("defines seller analytics RPCs with auth and indexes", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    const sql = read(MIGRATION);
    expect(sql).toContain("orders_store_payment_created_idx");
    expect(sql).toContain("seller_analytics_summary");
    expect(sql).toContain("seller_analytics_order_status_counts");
    expect(sql).toContain("seller_analytics_sales_series");
    expect(sql).toContain("seller_analytics_top_products");
    expect(sql).toContain("seller_analytics_coupon_performance");
    expect(sql).toContain("seller_analytics_fulfillment_summary");
    expect(sql).toContain("seller_analytics_refunds_returns");
    expect(sql).toMatch(/set search_path = public/i);
    expect(sql).toMatch(/revoke all on function public\.seller_analytics_summary/i);
    expect(sql).toMatch(/grant execute on function public\.seller_analytics_summary/i);
    expect(sql).toMatch(
      /is_store_member_with_role\(p_store_id,\s*array\['owner',\s*'manager'\]\)/i
    );
    expect(sql).toContain("public.is_platform_admin()");
    expect(sql).not.toMatch(/array\['owner',\s*'manager',\s*'catalog_editor'/i);
    expect(sql).not.toMatch(/array\['owner',\s*'manager',\s*'viewer'/i);
    expect(sql).toContain("seller_analytics_assert_single_currency");
    expect(sql).toContain("supports a single currency per period");
    expect(sql).toContain("p_to - interval '1 microsecond'");
    expect(sql).not.toMatch(/buyer_id/i);
    expect(sql).toContain("payment_status = 'paid'");
    expect(sql).not.toMatch(/from public\.payment_attempts/i);
    expect(sql).not.toMatch(
      /seller_analytics_assert_store_access[\s\S]*is_store_member\(p_store_id\)/i
    );
    expect(sql).toContain("'refunded_orders'");
    expect(sql).toContain("count(*) filter (");
    expect(sql).toContain("where o.payment_status = 'refunded' or o.status = 'refunded'");
    expect(sql).toContain("f.lifecycle_stage = 'returned'");
  });
});
