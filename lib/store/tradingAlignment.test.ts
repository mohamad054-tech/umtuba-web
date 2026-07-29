import { describe, expect, it } from "vitest";
import { validatePriceInput } from "./validators";
import { computeOrderGrandTotalMinor } from "./orderRules";
import { computeStoreCheckoutGrandTotalMinor } from "./pricing";
import { rejectClientPriceSnapshot } from "./cartRules";
import {
  aggregateTrustedQuoteGroupTotals,
  classifyTradingPaymentState,
  computeExclusiveTaxOrderGrandTotalMinor,
  formatTrustedMoney,
  isLegitimateCompareAt,
  normalizeCompareAtMinor,
  rejectClientCartPrice,
  rejectClientMoneyFormFields,
  TRADING_PATH_SUMMARY,
} from "./tradingContracts";

describe("trading alignment — compare-at integrity", () => {
  it("accepts compare-at only when strictly greater than selling price", () => {
    expect(isLegitimateCompareAt(1000, 1500)).toBe(true);
    expect(isLegitimateCompareAt(1000, 1000)).toBe(false);
    expect(isLegitimateCompareAt(1000, 999)).toBe(false);
    expect(isLegitimateCompareAt(null, 1500)).toBe(false);
    expect(normalizeCompareAtMinor(1000, 1000)).toBeNull();
    expect(normalizeCompareAtMinor(1000, 1200)).toBe(1200);
  });

  it("fails closed on equal compare-at write validation", () => {
    expect(
      validatePriceInput({
        amountMinor: 1000,
        compareAtMinor: 1000,
        currency: "USD",
      }).ok
    ).toBe(false);
    expect(
      validatePriceInput({
        amountMinor: 1000,
        compareAtMinor: 1001,
        currency: "USD",
      }).ok
    ).toBe(true);
  });
});

describe("trading alignment — client money rejection", () => {
  it("hard-rejects client-supplied cart prices", () => {
    expect(rejectClientCartPrice(1999).ok).toBe(false);
    expect(rejectClientCartPrice("1999").ok).toBe(false);
    expect(rejectClientCartPrice(undefined).ok).toBe(true);
    expect(rejectClientCartPrice(null).ok).toBe(true);
    expect(rejectClientPriceSnapshot(500)).toBe(true);
  });
});

describe("trading alignment — grand total single path", () => {
  it("keeps order and checkout exclusive-tax grand totals identical", () => {
    const input = {
      subtotalMinor: 5000,
      discountTotalMinor: 500,
      taxTotalMinor: 200,
      shippingTotalMinor: 300,
    };
    expect(computeOrderGrandTotalMinor(input)).toBe(
      computeExclusiveTaxOrderGrandTotalMinor(input)
    );
    expect(computeOrderGrandTotalMinor(input)).toBe(
      computeStoreCheckoutGrandTotalMinor({ ...input, taxInclusive: false })
    );
    expect(computeOrderGrandTotalMinor(input)).toBe(5000);
  });
});

describe("trading alignment — currency and quote aggregation", () => {
  it("preserves complete same-currency aggregates", () => {
    const totals = aggregateTrustedQuoteGroupTotals([
      {
        currency: "USD",
        discount_total_minor: 0,
        shipping_total_minor: 100,
        tax_total_minor: 50,
        grand_total_minor: 1150,
        subtotal_minor: 1000,
      },
    ]);
    expect(totals.complete).toBe(true);
    expect(totals.mixedCurrency).toBe(false);
    expect(totals.grandMinor).toBe(1150);
  });

  it("never sums mixed currencies", () => {
    const totals = aggregateTrustedQuoteGroupTotals([
      {
        currency: "USD",
        discount_total_minor: 0,
        shipping_total_minor: 0,
        tax_total_minor: 0,
        grand_total_minor: 100,
        subtotal_minor: 100,
      },
      {
        currency: "GBP",
        discount_total_minor: 0,
        shipping_total_minor: 0,
        tax_total_minor: 0,
        grand_total_minor: 200,
        subtotal_minor: 200,
      },
    ]);
    expect(totals.mixedCurrency).toBe(true);
    expect(totals.complete).toBe(false);
    expect(totals.grandMinor).toBe(0);
    expect(totals.subtotalMinor).toBe(0);
  });

  it("marks incomplete when quote money fields are missing", () => {
    const totals = aggregateTrustedQuoteGroupTotals([
      {
        currency: "USD",
        grand_total_minor: 1000,
      },
    ]);
    expect(totals.complete).toBe(false);
  });

  it("rejects client money form fields", () => {
    expect(
      rejectClientMoneyFormFields((key) => key === "grand_total_minor").ok
    ).toBe(false);
    expect(rejectClientMoneyFormFields(() => false).ok).toBe(true);
  });
});

describe("trading alignment — money presentation", () => {
  it("does not fabricate zero for unknown money", () => {
    expect(formatTrustedMoney(null, "USD")).toBe("Unavailable");
    expect(formatTrustedMoney(1000, null)).toBe("Unavailable");
    expect(formatTrustedMoney(1000, "USD")).toMatch(/10\.00|USD/);
  });
});

describe("trading alignment — payment state matrix", () => {
  it("separates order existence from payment success", () => {
    const pending = classifyTradingPaymentState({
      paymentStatus: "pending",
      status: "confirmed",
    });
    expect(pending.realizedPaid).toBe(false);
    expect(pending.unpaidPendingOrAuthorized).toBe(true);
    expect(pending.blocksFulfillmentProgress).toBe(true);
    expect(pending.buyerCancellableUnpaid).toBe(true);

    const authorized = classifyTradingPaymentState({
      paymentStatus: "authorized",
      status: "confirmed",
    });
    expect(authorized.realizedPaid).toBe(false);
    expect(authorized.unpaidPendingOrAuthorized).toBe(true);
    expect(authorized.blocksFulfillmentProgress).toBe(false);

    const paid = classifyTradingPaymentState({
      paymentStatus: "paid",
      status: "confirmed",
    });
    expect(paid.realizedPaid).toBe(true);
    expect(paid.blocksFulfillmentProgress).toBe(false);
  });

  it("documents the canonical trading path", () => {
    expect(TRADING_PATH_SUMMARY.length).toBeGreaterThanOrEqual(5);
    expect(TRADING_PATH_SUMMARY[0]).toMatch(/Catalog Offer/i);
    expect(TRADING_PATH_SUMMARY[4]).toMatch(/Payment State/i);
  });
});
