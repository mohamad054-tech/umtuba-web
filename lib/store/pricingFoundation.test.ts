import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertPricingGrandNonNegative,
  computeCouponDiscountMinor,
  computeLineTotalMinor,
  computeShippingFeeMinor,
  computeStoreCheckoutGrandTotalMinor,
  computeStorePricingBreakdown,
  computeTaxMinor,
  sumPricingBreakdowns,
} from "./pricing";
import {
  defaultManualShippingQuote,
  isShippingQuote,
  quoteShippingMethod,
} from "./shipping";
import {
  CHECKOUT_PAYMENT_PLACEHOLDER_OPTIONS,
  DeferredPaymentAdapter,
  isPaymentProvider,
} from "./payments";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260814_store_checkout_payments_foundation_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("pricing engine", () => {
  it("computes line totals with integer math only", () => {
    expect(computeLineTotalMinor(199, 3)).toBe(597);
    expect(computeLineTotalMinor(-1, 2)).toBe(0);
  });

  it("applies free-shipping threshold", () => {
    expect(
      computeShippingFeeMinor({
        feeMinor: 1500,
        freeAboveSubtotalMinor: 10000,
        subtotalMinor: 10000,
      })
    ).toBe(0);
    expect(
      computeShippingFeeMinor({
        feeMinor: 1500,
        freeAboveSubtotalMinor: 10000,
        subtotalMinor: 9999,
      })
    ).toBe(1500);
  });

  it("computes exclusive and inclusive tax", () => {
    const exclusive = computeTaxMinor({
      taxableMinor: 10000,
      rateBps: 1000,
      inclusive: false,
      enabled: true,
    });
    expect(exclusive.taxMinor).toBe(1000);
    expect(exclusive.grandMerchandiseMinor).toBe(11000);

    const inclusive = computeTaxMinor({
      taxableMinor: 11000,
      rateBps: 1000,
      inclusive: true,
      enabled: true,
    });
    expect(inclusive.taxMinor).toBe(1000);
    expect(inclusive.grandMerchandiseMinor).toBe(11000);
  });

  it("caps discounts and never exceeds subtotal", () => {
    expect(
      computeCouponDiscountMinor({
        discountType: "percent",
        percentBps: 5000,
        subtotalMinor: 1000,
        maxDiscountMinor: 200,
      })
    ).toBe(200);
    expect(
      computeCouponDiscountMinor({
        discountType: "fixed",
        fixedAmountMinor: 5000,
        subtotalMinor: 1000,
      })
    ).toBe(1000);
  });

  it("builds a full store pricing breakdown", () => {
    const breakdown = computeStorePricingBreakdown({
      subtotalMinor: 10000,
      discount: {
        discountType: "percent",
        percentBps: 1000,
      },
      shipping: {
        feeMinor: 500,
        freeAboveSubtotalMinor: null,
        applyFreeThresholdToPostDiscount: true,
      },
      tax: {
        enabled: true,
        rateBps: 1000,
        inclusive: false,
      },
    });
    expect(breakdown.discountTotalMinor).toBe(1000);
    expect(breakdown.taxableMinor).toBe(9000);
    expect(breakdown.taxTotalMinor).toBe(900);
    expect(breakdown.shippingTotalMinor).toBe(500);
    expect(breakdown.grandTotalMinor).toBe(10400);
    expect(assertPricingGrandNonNegative(breakdown.grandTotalMinor).ok).toBe(
      true
    );
  });

  it("sums multi-store breakdowns", () => {
    const a = computeStorePricingBreakdown({
      subtotalMinor: 1000,
      discountTotalMinor: 0,
      shippingTotalMinor: 100,
      taxTotalMinor: 0,
      tax: { enabled: false, rateBps: 0, inclusive: false },
    });
    const b = computeStorePricingBreakdown({
      subtotalMinor: 2000,
      discountTotalMinor: 0,
      shippingTotalMinor: 0,
      taxTotalMinor: 200,
      tax: { enabled: true, rateBps: 1000, inclusive: false },
    });
    const sum = sumPricingBreakdowns([a, b]);
    expect(sum.subtotalMinor).toBe(3000);
    expect(sum.grandTotalMinor).toBe(
      computeStoreCheckoutGrandTotalMinor({
        subtotalMinor: 1000,
        discountTotalMinor: 0,
        taxTotalMinor: 0,
        shippingTotalMinor: 100,
        taxInclusive: false,
      }) +
        computeStoreCheckoutGrandTotalMinor({
          subtotalMinor: 2000,
          discountTotalMinor: 0,
          taxTotalMinor: 200,
          shippingTotalMinor: 0,
          taxInclusive: false,
        })
    );
  });
});

describe("shipping architecture", () => {
  it("quotes manual and free-threshold methods without carrier APIs", () => {
    const quoted = quoteShippingMethod({
      serviceType: "local",
      providerKey: "manual",
      feeMinor: 800,
      currency: "usd",
      freeAboveSubtotalMinor: 5000,
      eligibleSubtotalMinor: 5000,
    });
    expect(isShippingQuote(quoted)).toBe(true);
    if (!isShippingQuote(quoted)) return;
    expect(quoted.feeMinor).toBe(0);
    expect(quoted.freeShippingApplied).toBe(true);
    expect(quoted.currency).toBe("USD");

    const fallback = defaultManualShippingQuote("eur");
    expect(fallback.feeMinor).toBe(0);
    expect(fallback.providerKey).toBe("manual");
  });

  it("fails closed on invalid currency or service type", () => {
    const badCurrency = quoteShippingMethod({
      serviceType: "standard",
      feeMinor: 100,
      currency: "US",
      eligibleSubtotalMinor: 0,
    });
    expect(isShippingQuote(badCurrency)).toBe(false);

    const badService = quoteShippingMethod({
      serviceType: "drone" as "standard",
      feeMinor: 100,
      currency: "USD",
      eligibleSubtotalMinor: 0,
    });
    expect(isShippingQuote(badService)).toBe(false);
  });
});

describe("payment abstraction", () => {
  it("exposes deferred adapter and placeholder catalog", () => {
    expect(isPaymentProvider("stripe")).toBe(true);
    expect(isPaymentProvider("bitcoin")).toBe(false);
    expect(
      CHECKOUT_PAYMENT_PLACEHOLDER_OPTIONS.some(
        (o) => o.provider === "none" && o.enabled
      )
    ).toBe(true);
    expect(
      CHECKOUT_PAYMENT_PLACEHOLDER_OPTIONS.filter((o) => o.enabled)
    ).toHaveLength(1);
  });

  it("deferred adapter never charges and rejects bad money", async () => {
    const adapter = new DeferredPaymentAdapter();
    const ok = await adapter.createIntent({
      orderId: "o1",
      buyerId: "b1",
      money: { amountMinor: 1000, currency: "USD" },
      provider: "none",
      methodKind: "deferred",
      idempotencyKey: "deferred-key-1",
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.status).toBe("deferred");
      expect(ok.clientAction?.type).toBe("none");
    }

    const bad = await adapter.createIntent({
      orderId: "o1",
      buyerId: "b1",
      money: { amountMinor: -1, currency: "USD" },
      provider: "none",
      methodKind: "deferred",
      idempotencyKey: "deferred-key-2",
    });
    expect(bad.ok).toBe(false);

    const liveRejected = await adapter.createIntent({
      orderId: "o1",
      buyerId: "b1",
      money: { amountMinor: 100, currency: "USD" },
      provider: "stripe",
      methodKind: "card",
      idempotencyKey: "deferred-key-3",
    });
    expect(liveRejected.ok).toBe(false);
  });

  it("placeholder copy does not claim live charging", () => {
    const labels = CHECKOUT_PAYMENT_PLACEHOLDER_OPTIONS.map((o) =>
      o.label.toLowerCase()
    ).join(" ");
    expect(labels).not.toMatch(/\bcharged\b|\bpay now\b|\blive charge\b/);
    expect(labels).toMatch(/deferred/);
  });
});

describe("payments migration contracts", () => {
  it("ships additive payment_attempts migration with RLS", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    const sql = read(MIGRATION);
    expect(sql).toMatch(/create table if not exists public\.payment_attempts/);
    expect(sql).toMatch(/force row level security/);
    expect(sql).toMatch(
      /revoke insert, update, delete on public\.payment_attempts from authenticated/
    );
    expect(sql).toMatch(/create_deferred_payment_attempt/);
    expect(sql).toMatch(/security definer/i);
    expect(sql).toMatch(/set search_path = public/);
    expect(sql).toMatch(
      /revoke all on function public\.create_deferred_payment_attempt\(uuid, text\)\s+from public, anon/
    );
    expect(sql).toMatch(/Amount always from order row/);
    expect(sql).toMatch(/payment_attempts_order_deferred_uidx/);
    expect(sql).toMatch(/unique_violation/);
    expect(sql).toMatch(/o\.buyer_id is distinct from uid/);
    expect(sql).toMatch(/o\.grand_total_minor/);
    expect(sql).toMatch(/service_type/);
    expect(sql).toMatch(/provider_key/);
    expect(sql.toLowerCase()).not.toMatch(/stripe\.com|sk_live|secret_key/);
  });
});

describe("pricing grand total integrity", () => {
  it("truncates non-integer inputs and caps discount", () => {
    expect(
      computeStoreCheckoutGrandTotalMinor({
        subtotalMinor: 1000.9,
        discountTotalMinor: 5000.2,
        taxTotalMinor: 10.7,
        shippingTotalMinor: 5.1,
        taxInclusive: false,
      })
    ).toBe(15);
  });
});
