import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  EMPTY_FULFILLMENT_DASHBOARD_COUNTS,
  SELLER_DASHBOARD_FULFILLMENT_CARDS,
  formatCouponCampaignWindow,
  formatCouponDiscountSummary,
  formatCouponTargetingSummary,
  formatCouponType,
  formatCouponUsageStats,
  formatCountryCodes,
  isAllowedFulfillmentTransitionOption,
  isValidShippingCurrencyCode,
  normalizeDatetimeLocalForRpc,
  parseCouponAdminFormFields,
  parseFulfillmentDashboardCounts,
  parseSortPriority,
  remainingCouponUsage,
  sellerOrdersHrefForDashboardCard,
  sortFulfillmentEventsChronologically,
  validateAndBuildCouponAdminRpcPayload,
  validateShippingRateFormInput,
} from "./adminUiHelpers";
import type { StoreCouponRow } from "./promotionsFulfillment";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260816_store_admin_ui_foundation_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

const sampleCoupon = (overrides: Partial<StoreCouponRow> = {}): StoreCouponRow => ({
  id: "c1",
  store_id: "s1",
  code: "SAVE10",
  status: "active",
  discount_type: "percent",
  percent_bps: 1000,
  fixed_amount_minor: null,
  currency: null,
  min_subtotal_minor: 0,
  max_discount_minor: 500,
  starts_at: "2026-01-01T00:00:00.000Z",
  ends_at: "2026-12-31T00:00:00.000Z",
  total_usage_limit: 100,
  per_user_usage_limit: 2,
  usage_count: 40,
  promotion_name: "Save ten",
  promotion_description: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("admin UI helpers", () => {
  it("parses fulfillment dashboard counts with safe defaults", () => {
    expect(parseFulfillmentDashboardCounts(null)).toEqual(
      EMPTY_FULFILLMENT_DASHBOARD_COUNTS
    );
    expect(
      parseFulfillmentDashboardCounts({
        pending: "3",
        preparing: 2,
        shipped: -1,
        total: 9.7,
      })
    ).toMatchObject({
      pending: 3,
      preparing: 2,
      shipped: 0,
      total: 9,
    });
  });

  it("formats coupon type, discount, usage, and remaining", () => {
    const coupon = sampleCoupon();
    expect(formatCouponType("percent")).toBe("Percentage");
    expect(formatCouponType("free_shipping")).toBe("Free shipping");
    expect(formatCouponDiscountSummary(coupon)).toContain("% off");
    expect(formatCouponUsageStats(coupon)).toContain("40 used");
    expect(remainingCouponUsage(coupon)).toBe(60);
    expect(
      remainingCouponUsage(sampleCoupon({ total_usage_limit: null }))
    ).toBeNull();
    expect(formatCouponCampaignWindow(coupon)).toMatch(/→/);
  });

  it("summarizes targeting and country codes", () => {
    expect(formatCouponTargetingSummary(null)).toMatch(/Store-wide/);
    expect(
      formatCouponTargetingSummary({
        couponId: "c1",
        productCount: 2,
        categoryCount: 1,
        regionCount: 0,
        storeWide: false,
      })
    ).toBe("2 product(s) · 1 category");
    expect(formatCountryCodes(["us", "ca"])).toBe("US, CA");
    expect(formatCountryCodes([])).toBe("No countries");
  });

  it("builds seller dashboard quick-nav hrefs", () => {
    expect(SELLER_DASHBOARD_FULFILLMENT_CARDS).toHaveLength(7);
    const preparing = SELLER_DASHBOARD_FULFILLMENT_CARDS.find(
      (c) => c.key === "preparing"
    )!;
    expect(sellerOrdersHrefForDashboardCard(preparing, "/seller/store/orders")).toBe(
      "/seller/store/orders?status=processing"
    );
    const returned = SELLER_DASHBOARD_FULFILLMENT_CARDS.find(
      (c) => c.key === "returned"
    )!;
    expect(sellerOrdersHrefForDashboardCard(returned, "/seller/store/orders")).toBe(
      "/seller/store/orders"
    );
  });

  it("normalizes coupon admin payloads by discount type", () => {
    const freeShip = validateAndBuildCouponAdminRpcPayload({
      storeId: "store-1",
      couponId: null,
      code: "FREESHIP",
      status: "active",
      discountType: "free_shipping",
      percentBpsRaw: "5000",
      fixedAmountRaw: "100",
      currency: "USD",
      minSubtotalRaw: "0",
      maxDiscountRaw: "500",
      startsAtRaw: "",
      endsAtRaw: "",
      totalUsageLimitRaw: "",
      perUserUsageLimitRaw: "",
      promotionName: "",
      promotionDescription: "",
    });
    expect(freeShip.ok).toBe(true);
    if (freeShip.ok) {
      expect(freeShip.payload.p_percent_bps).toBeNull();
      expect(freeShip.payload.p_fixed_amount_minor).toBeNull();
      expect(freeShip.payload.p_max_discount_minor).toBeNull();
    }

    const invalidDates = validateAndBuildCouponAdminRpcPayload({
      storeId: "store-1",
      couponId: null,
      code: "BAD",
      status: "active",
      discountType: "percent",
      percentBpsRaw: "1000",
      fixedAmountRaw: "",
      currency: "",
      minSubtotalRaw: "0",
      maxDiscountRaw: "",
      startsAtRaw: "2026-12-31T00:00",
      endsAtRaw: "2026-01-01T00:00",
      totalUsageLimitRaw: "0",
      perUserUsageLimitRaw: "",
      promotionName: "",
      promotionDescription: "",
    });
    expect(invalidDates.ok).toBe(false);
  });

  it("parses form data and validates shipping rate input", () => {
    const fd = new FormData();
    fd.set("store_id", "store-1");
    fd.set("code", "SAVE");
    fd.set("discount_type", "percent");
    fd.set("percent_bps", "1000");
    const fields = parseCouponAdminFormFields(fd);
    expect(fields.storeId).toBe("store-1");
    expect(fields.discountType).toBe("percent");

    expect(parseSortPriority("50")).toBe(50);
    expect(parseSortPriority("-1")).toBeNull();
    expect(isValidShippingCurrencyCode("usd")).toBe(true);
    expect(isValidShippingCurrencyCode("US")).toBe(false);

    expect(
      validateShippingRateFormInput({
        serviceType: "standard",
        feeMinorRaw: "-1",
        currency: "USD",
      }).ok
    ).toBe(false);
    expect(
      validateShippingRateFormInput({
        serviceType: "bogus",
        feeMinorRaw: "100",
        currency: "USD",
      }).ok
    ).toBe(false);
  });

  it("sorts fulfillment events chronologically and gates transitions", () => {
    const sorted = sortFulfillmentEventsChronologically([
      { created_at: "2026-02-01T00:00:00.000Z" },
      { created_at: "2026-01-01T00:00:00.000Z" },
    ]);
    expect(sorted[0]?.created_at).toBe("2026-01-01T00:00:00.000Z");
    expect(isAllowedFulfillmentTransitionOption("pending", "confirmed")).toBe(
      true
    );
    expect(isAllowedFulfillmentTransitionOption("pending", "delivered")).toBe(
      false
    );
    expect(
      normalizeDatetimeLocalForRpc("2026-07-20T12:00")
    ).toMatch(/2026-07-20/);
  });
});

describe("admin UI foundation migration contracts", () => {
  it("ships list/dashboard RPCs and provider priority", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    const sql = read(MIGRATION);
    expect(sql).toContain("sort_priority");
    expect(sql).toContain("admin_list_shipping_providers");
    expect(sql).toContain("admin_list_shipping_zones");
    expect(sql).toContain("admin_list_shipping_rates");
    expect(sql).toContain("admin_coupon_targeting_summary");
    expect(sql).toContain("seller_fulfillment_dashboard_counts");
    expect(sql).toContain("drop function if exists public.admin_upsert_shipping_provider");
    expect(sql).toContain("Shipping provider not found for this store");
    expect(sql).toMatch(/revoke all on function public\.admin_list_shipping_providers/i);
    expect(sql).toMatch(/grant execute on function public\.seller_fulfillment_dashboard_counts/i);
  });
});
