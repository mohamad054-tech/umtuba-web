import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { computeCouponDiscountMinor } from "./pricing";
import {
  applyFreeShippingToFee,
  describePromotionTargetingSemantics,
  normalizePromotionCode,
  validatePromotionCouponDefinition,
  validatePromotionEligibility,
} from "./promotionRules";
import {
  FULFILLMENT_LIFECYCLE_STAGES,
  FULFILLMENT_LIFECYCLE_TRANSITIONS,
  assertFulfillmentLifecycleTransition,
  canTransitionFulfillmentLifecycle,
  isFulfillmentLifecycleStage,
  isTerminalFulfillmentLifecycle,
} from "./fulfillmentRules";
import {
  DEFAULT_SHIPPING_PROVIDER_CATALOG,
  quoteRateForSubtotal,
  validateShippingRate,
  validateShippingZone,
} from "./shippingProviders";
import {
  normalizeTrackingNumber,
  validateDeliveryConfirmation,
  validateShipmentMetadata,
  validateShipmentTracking,
  validateTrackingUrl,
} from "./tracking";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260815_store_promotions_fulfillment_foundation_v1.sql";
const CHECKOUT_MIGRATION =
  "supabase/migrations/20260812_store_checkout_foundation_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

const baseCoupon = {
  code: "SAVE10",
  status: "active" as const,
  discountType: "percent" as const,
  percentBps: 1000,
  minSubtotalMinor: 1000,
  usageCount: 0,
  storeId: "store-1",
};

const baseContext = {
  storeId: "store-1",
  buyerId: "buyer-1",
  currency: "USD",
  subtotalMinor: 5000,
  productIds: ["prod-a"],
  categoryIds: ["cat-a"],
  countryCode: "US",
  region: "CA",
  userRedemptionCount: 0,
};

describe("promotion rules", () => {
  it("documents empty targeting semantics", () => {
    expect(describePromotionTargetingSemantics()).toMatch(/Empty/);
    expect(describePromotionTargetingSemantics()).toMatch(/all configured dimensions must pass/);
  });

  it("enforces percent bounds and max discount caps", () => {
    expect(
      validatePromotionCouponDefinition({
        code: "BIG",
        status: "active",
        discountType: "percent",
        percentBps: 10001,
        minSubtotalMinor: 0,
      }).ok
    ).toBe(false);

    const discount = computeCouponDiscountMinor({
      discountType: "percent",
      percentBps: 5000,
      subtotalMinor: 10000,
      maxDiscountMinor: 2000,
    });
    expect(discount).toBe(2000);
  });

  it("caps fixed discounts at subtotal", () => {
    const result = validatePromotionEligibility({
      coupon: {
        ...baseCoupon,
        discountType: "fixed",
        percentBps: null,
        fixedAmountMinor: 9000,
        currency: "USD",
      },
      context: { ...baseContext, subtotalMinor: 5000 },
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.discountMinor).toBe(5000);
  });

  it("rejects inactive, future, expired, and exhausted coupons", () => {
    const now = new Date("2026-07-20T12:00:00Z");
    expect(
      validatePromotionEligibility({
        coupon: { ...baseCoupon, status: "disabled" },
        context: { ...baseContext, now },
      }).ok
    ).toBe(false);
    expect(
      validatePromotionEligibility({
        coupon: {
          ...baseCoupon,
          startsAt: "2026-07-21T00:00:00Z",
        },
        context: { ...baseContext, now },
      }).ok
    ).toBe(false);
    expect(
      validatePromotionEligibility({
        coupon: {
          ...baseCoupon,
          endsAt: "2026-07-19T00:00:00Z",
        },
        context: { ...baseContext, now },
      }).ok
    ).toBe(false);
    expect(
      validatePromotionEligibility({
        coupon: { ...baseCoupon, usageCount: 10, totalUsageLimit: 10 },
        context: baseContext,
      }).ok
    ).toBe(false);
    expect(
      validatePromotionEligibility({
        coupon: { ...baseCoupon, perUserUsageLimit: 1 },
        context: { ...baseContext, userRedemptionCount: 1 },
      }).ok
    ).toBe(false);
  });

  it("enforces minimum subtotal and region targeting", () => {
    expect(
      validatePromotionEligibility({
        coupon: { ...baseCoupon, minSubtotalMinor: 10000 },
        context: baseContext,
      }).ok
    ).toBe(false);
    expect(
      validatePromotionEligibility({
        coupon: {
          ...baseCoupon,
          regions: [{ countryCode: "GB" }],
        },
        context: baseContext,
      }).ok
    ).toBe(false);
  });

  it("requires product and category matches when configured", () => {
    expect(
      validatePromotionEligibility({
        coupon: { ...baseCoupon, productIds: ["prod-b"] },
        context: baseContext,
      }).ok
    ).toBe(false);
    expect(
      validatePromotionEligibility({
        coupon: { ...baseCoupon, categoryIds: ["cat-b"] },
        context: baseContext,
      }).ok
    ).toBe(false);
  });

  it("applies free shipping without merchandise discount", () => {
    const result = validatePromotionEligibility({
      coupon: {
        ...baseCoupon,
        discountType: "free_shipping",
        percentBps: null,
      },
      context: baseContext,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.discountMinor).toBe(0);
      expect(result.freeShipping).toBe(true);
    }
    expect(applyFreeShippingToFee({ shippingFeeMinor: 1200, freeShipping: true })).toBe(
      0
    );
    expect(applyFreeShippingToFee({ shippingFeeMinor: 1200, freeShipping: false })).toBe(
      1200
    );
  });

  it("normalizes coupon codes", () => {
    expect(normalizePromotionCode(" save-10 ")).toBe("SAVE-10");
  });
});

describe("fulfillment lifecycle rules", () => {
  it("allows every declared transition", () => {
    for (const from of FULFILLMENT_LIFECYCLE_STAGES) {
      for (const to of FULFILLMENT_LIFECYCLE_TRANSITIONS[from]) {
        expect(canTransitionFulfillmentLifecycle(from, to)).toBe(true);
        expect(assertFulfillmentLifecycleTransition(from, to).ok).toBe(true);
      }
    }
  });

  it("blocks representative forbidden transitions", () => {
    expect(canTransitionFulfillmentLifecycle("pending", "delivered")).toBe(false);
    expect(canTransitionFulfillmentLifecycle("delivered", "pending")).toBe(false);
    expect(canTransitionFulfillmentLifecycle("cancelled", "confirmed")).toBe(false);
    expect(canTransitionFulfillmentLifecycle("refunded", "returned")).toBe(false);
  });

  it("marks terminal stages", () => {
    expect(isTerminalFulfillmentLifecycle("cancelled")).toBe(true);
    expect(isTerminalFulfillmentLifecycle("refunded")).toBe(true);
    expect(isTerminalFulfillmentLifecycle("shipped")).toBe(false);
    expect(isFulfillmentLifecycleStage("preparing")).toBe(true);
  });
});

describe("shipping provider abstraction", () => {
  it("exposes provider catalog without external APIs", () => {
    expect(DEFAULT_SHIPPING_PROVIDER_CATALOG.some((p) => p.providerKey === "dhl")).toBe(
      true
    );
    expect(
      DEFAULT_SHIPPING_PROVIDER_CATALOG.every((p) => p.displayName.length > 0)
    ).toBe(true);
  });

  it("validates zones and rejects negative rates", () => {
    expect(
      validateShippingZone({
        name: "US Domestic",
        countryCodes: ["US"],
        enabled: true,
      }).ok
    ).toBe(true);
    expect(
      validateShippingRate({
        zoneId: "zone-1",
        providerKey: "ups",
        serviceType: "standard",
        feeMinor: -1,
        currency: "USD",
        enabled: true,
      }).ok
    ).toBe(false);
    const quoted = quoteRateForSubtotal({
      rate: {
        zoneId: "zone-1",
        providerKey: "ups",
        serviceType: "standard",
        feeMinor: 500,
        currency: "USD",
        enabled: true,
      },
      subtotalMinor: 10000,
    });
    expect("feeMinor" in quoted && quoted.feeMinor).toBe(500);
  });
});

describe("tracking foundation", () => {
  it("normalizes tracking numbers without stripping hyphens", () => {
    const ok = validateShipmentTracking({
      orderId: "order-1",
      providerKey: "dhl",
      trackingNumber: "ab c-123",
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(normalizeTrackingNumber("ab c-123")).toBe("ABC-123");
    }
  });

  it("rejects unsafe tracking URLs and metadata", () => {
    expect(validateTrackingUrl("javascript:alert(1)").ok).toBe(false);
    expect(validateTrackingUrl("data:text/html,hi").ok).toBe(false);
    expect(validateTrackingUrl("https://carrier.example/track/1").ok).toBe(true);
    expect(
      validateShipmentMetadata({ tracking_url: "javascript:evil" }).ok
    ).toBe(false);
  });

  it("validates delivery confirmation sources", () => {
    expect(
      validateDeliveryConfirmation({
        trackingId: "track-1",
        deliveredAt: new Date().toISOString(),
        confirmedBy: "buyer",
      }).ok
    ).toBe(true);
    expect(
      validateDeliveryConfirmation({
        trackingId: "track-1",
        deliveredAt: new Date().toISOString(),
        confirmedBy: "hacker" as "buyer",
      }).ok
    ).toBe(false);
  });
});

describe("promotions/fulfillment migration contracts", () => {
  it("ships additive migration with RLS and SECURITY DEFINER hardening", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, CHECKOUT_MIGRATION))).toBe(true);
    const sql = read(MIGRATION);
    expect(sql).toMatch(/free_shipping/);
    expect(sql).toMatch(/store_coupon_products/);
    expect(sql).toMatch(/order_fulfillments/);
    expect(sql).toMatch(/order_shipments/);
    expect(sql).toMatch(/product_ids, category_ids, buyer_country, buyer_region/);
    expect(sql).toMatch(/disc_snap/);
    expect(sql).toMatch(/drop function if exists public\.checkout_validate_coupon\(text, uuid, uuid, text, bigint\)/);
    expect(sql).toMatch(/unchanged', true/);
    expect(sql).toMatch(/idempotent', true/);
    expect(sql).toMatch(/delivery_confirmed_by = confirmed_by/);
    expect(sql).toMatch(/revoke all on function public\.init_order_fulfillment_on_order_insert/);
    const checkoutSql = read(CHECKOUT_MIGRATION);
    expect(checkoutSql).toMatch(/store_coupon_redemptions_coupon_order_uidx|unique \(coupon_id, order_id\)/);
    expect(sql).toMatch(/force row level security/);
    expect(sql).toMatch(/set search_path = public/);
    expect(sql.toLowerCase()).not.toMatch(/sk_live|secret_key/);
  });
});
