import { describe, expect, it } from "vitest";
import {
  aggregateQuoteTotals,
  buildCheckoutQuoteMoneyRows,
  canProceedFromCart,
  cartMediaDisplayUrl,
  clampDisplayedQuantity,
  deriveCartLineBlockingIssue,
  evaluateCheckoutStepReadiness,
  multiSellerCheckoutNotice,
  validateCheckoutAddressForm,
} from "./cartCheckoutPresentation";
import { computeCartSummary } from "./cartRules";
import {
  CHECKOUT_MULTI_STORE_POLICY,
  isCheckoutQuoteExpired,
} from "./checkoutRules";

describe("cartCheckoutPresentation — integrity", () => {
  it("only treats http(s) media snapshots as displayable images", () => {
    expect(cartMediaDisplayUrl("https://cdn.example/a.jpg")).toBe(
      "https://cdn.example/a.jpg"
    );
    expect(cartMediaDisplayUrl("products/cover.webp")).toBeNull();
    expect(cartMediaDisplayUrl(null)).toBeNull();
  });

  it("blocks checkout when price changed or stock insufficient", () => {
    expect(
      deriveCartLineBlockingIssue({
        liveUnitPriceMinor: 1200,
        snapshotUnitPriceMinor: 1000,
        available: 5,
        quantity: 1,
        allowBackorder: false,
        productAvailable: true,
        variantAvailable: true,
        storeActive: true,
      })
    ).toMatch(/Price changed/);

    expect(
      deriveCartLineBlockingIssue({
        liveUnitPriceMinor: 1000,
        snapshotUnitPriceMinor: 1000,
        available: 1,
        quantity: 3,
        allowBackorder: false,
        productAvailable: true,
        variantAvailable: true,
        storeActive: true,
      })
    ).toMatch(/Only 1 available/);

    expect(
      deriveCartLineBlockingIssue({
        liveUnitPriceMinor: null,
        snapshotUnitPriceMinor: 1000,
        available: 5,
        quantity: 1,
        allowBackorder: false,
        productAvailable: true,
        variantAvailable: true,
        storeActive: true,
      })
    ).toMatch(/Current price is unavailable/);
  });

  it("prevents proceed when cart has blocking issues", () => {
    const summary = computeCartSummary([
      {
        id: "1",
        storeId: "s1",
        storeName: "Alpha",
        quantity: 1,
        unitPriceMinor: 1000,
        currency: "USD",
        productTitle: "A",
        variantTitle: "Default",
        mediaSnapshot: null,
        blockingIssue: "Price changed. Update quantity or refresh before checkout.",
      },
    ]);
    expect(summary.hasBlockingIssues).toBe(true);
    expect(canProceedFromCart(summary).ok).toBe(false);
  });

  it("allows proceed for clean multi-seller carts and explains split orders", () => {
    const summary = computeCartSummary([
      {
        id: "1",
        storeId: "s1",
        storeName: "Alpha",
        quantity: 1,
        unitPriceMinor: 1000,
        currency: "USD",
        productTitle: "A",
        variantTitle: "Default",
        mediaSnapshot: null,
      },
      {
        id: "2",
        storeId: "s2",
        storeName: "Beta",
        quantity: 2,
        unitPriceMinor: 500,
        currency: "USD",
        productTitle: "B",
        variantTitle: "Default",
        mediaSnapshot: null,
      },
    ]);
    expect(canProceedFromCart(summary).ok).toBe(true);
    expect(multiSellerCheckoutNotice(summary.groups.length)).toContain(
      CHECKOUT_MULTI_STORE_POLICY.description
    );
    expect(multiSellerCheckoutNotice(1)).toBeNull();
  });

  it("validates quantity boundaries without inventing stock", () => {
    expect(clampDisplayedQuantity(0).ok).toBe(false);
    expect(clampDisplayedQuantity(-2).ok).toBe(false);
    expect(clampDisplayedQuantity(2.5).ok).toBe(false);
    expect(clampDisplayedQuantity(4, 3).ok).toBe(false);
    expect(clampDisplayedQuantity(2, 3)).toEqual({ ok: true, quantity: 2 });
  });
});

describe("cartCheckoutPresentation — quote money rows", () => {
  it("labels unknown tax/shipping/discount until server quote exists", () => {
    const rows = buildCheckoutQuoteMoneyRows({
      cartSubtotalMinor: 2500,
      quoted: false,
    });
    expect(rows.find((r) => r.key === "subtotal")?.known).toBe(true);
    expect(rows.find((r) => r.key === "tax")?.known).toBe(false);
    expect(rows.find((r) => r.key === "shipping")?.known).toBe(false);
    expect(rows.find((r) => r.key === "grand")?.known).toBe(false);
  });

  it("surfaces only server-provided quote totals", () => {
    const rows = buildCheckoutQuoteMoneyRows({
      cartSubtotalMinor: 2500,
      quoted: true,
      quoteGroup: {
        subtotal_minor: 2500,
        discount_total_minor: 100,
        shipping_total_minor: 300,
        tax_total_minor: 50,
        grand_total_minor: 2750,
      },
    });
    expect(rows.find((r) => r.key === "grand")?.amountMinor).toBe(2750);
    expect(rows.find((r) => r.key === "discount")?.amountMinor).toBe(100);
    const totals = aggregateQuoteTotals([
      {
        discount_total_minor: 100,
        shipping_total_minor: 300,
        tax_total_minor: 50,
        grand_total_minor: 2750,
        subtotal_minor: 2500,
      },
      {
        discount_total_minor: 0,
        shipping_total_minor: 200,
        tax_total_minor: 20,
        grand_total_minor: 1220,
        subtotal_minor: 1000,
      },
    ]);
    expect(totals.grandMinor).toBe(3970);
    expect(totals.shippingMinor).toBe(500);
  });
});

describe("cartCheckoutPresentation — checkout steps", () => {
  it("gates quote and submit progression deliberately", () => {
    expect(
      evaluateCheckoutStepReadiness({
        hasItems: true,
        hasAddress: false,
        shippingSelectionsComplete: true,
        hasQuote: false,
        purchasesAvailable: true,
      }).step
    ).toBe("address");

    expect(
      evaluateCheckoutStepReadiness({
        hasItems: true,
        hasAddress: true,
        shippingSelectionsComplete: false,
        hasQuote: false,
        purchasesAvailable: true,
      }).canQuote
    ).toBe(false);

    const expired = evaluateCheckoutStepReadiness({
      hasItems: true,
      hasAddress: true,
      shippingSelectionsComplete: true,
      hasQuote: true,
      quoteExpiresAt: "2000-01-01T00:00:00.000Z",
      purchasesAvailable: true,
      nowMs: Date.parse("2026-07-28T00:00:00.000Z"),
    });
    expect(expired.canSubmit).toBe(false);
    expect(expired.message).toMatch(/expired/i);

    const ready = evaluateCheckoutStepReadiness({
      hasItems: true,
      hasAddress: true,
      shippingSelectionsComplete: true,
      hasQuote: true,
      quoteExpiresAt: "2099-01-01T00:00:00.000Z",
      purchasesAvailable: true,
    });
    expect(ready.canSubmit).toBe(true);
  });

  it("validates address forms fail-closed", () => {
    expect(
      validateCheckoutAddressForm({
        full_name: "A",
        phone: "123",
        country_code: "USA",
        city: "City",
        address_line1: "Line",
      }).ok
    ).toBe(false);

    expect(
      validateCheckoutAddressForm({
        full_name: "Ada Lovelace",
        phone: "+1 555 0100",
        country_code: "US",
        city: "Austin",
        postal_code: "78701",
        address_line1: "1 Congress Ave",
      }).ok
    ).toBe(true);
  });

  it("detects expired quotes", () => {
    expect(isCheckoutQuoteExpired("2000-01-01T00:00:00.000Z")).toBe(true);
    expect(isCheckoutQuoteExpired("2099-01-01T00:00:00.000Z")).toBe(false);
  });
});
