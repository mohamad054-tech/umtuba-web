import { describe, expect, it } from "vitest";
import {
  assertCurrenciesCompatible,
  canAccessBuyerCart,
  computeCartSummary,
  evaluateCartAdd,
  mergeCartQuantity,
  rejectClientPriceSnapshot,
  validateCartQuantity,
} from "./cartRules";

const ACTIVE_OFFER = {
  productStatus: "active",
  moderationStatus: "approved",
  storeStatus: "active",
  variantStatus: "active",
  priceStatus: "active",
  priceAmountMinor: 1999,
  priceCurrency: "USD",
  onHand: 10,
  reserved: 0,
  safetyStock: 0,
  allowBackorder: false,
};

describe("own-cart isolation", () => {
  it("allows only the cart owner", () => {
    expect(
      canAccessBuyerCart({
        cartUserId: "user-a",
        requesterUserId: "user-a",
      })
    ).toBe(true);
    expect(
      canAccessBuyerCart({
        cartUserId: "buyer-1",
        requesterUserId: "seller-9",
      })
    ).toBe(false);
  });

  it("denies viewer/seller roles from accessing another buyer cart", () => {
    // Store membership never grants cart access — ownership is user_id only.
    expect(
      canAccessBuyerCart({
        cartUserId: "buyer",
        requesterUserId: "store-viewer",
      })
    ).toBe(false);
    expect(
      canAccessBuyerCart({
        cartUserId: "buyer",
        requesterUserId: "store-owner",
      })
    ).toBe(false);
  });
});

describe("price snapshot server-side", () => {
  it("snapshots server price and ignores client-supplied amounts", () => {
    expect(rejectClientPriceSnapshot(500)).toBe(true);
    expect(rejectClientPriceSnapshot(undefined)).toBe(false);

    const result = evaluateCartAdd({
      ...ACTIVE_OFFER,
      requestedQuantity: 1,
      priceAmountMinor: 2500,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.unitPriceMinor).toBe(2500);
    expect(result.currency).toBe("USD");
  });

  it("rejects invalid server prices fail-closed", () => {
    expect(
      evaluateCartAdd({
        ...ACTIVE_OFFER,
        requestedQuantity: 1,
        priceAmountMinor: 19.99,
      }).ok
    ).toBe(false);
  });
});

describe("availability and product status gates", () => {
  it("rejects inactive products", () => {
    expect(
      evaluateCartAdd({
        ...ACTIVE_OFFER,
        productStatus: "draft",
        requestedQuantity: 1,
      }).ok
    ).toBe(false);
    expect(
      evaluateCartAdd({
        ...ACTIVE_OFFER,
        moderationStatus: "pending",
        requestedQuantity: 1,
      }).ok
    ).toBe(false);
  });

  it("rejects unavailable variants", () => {
    expect(
      evaluateCartAdd({
        ...ACTIVE_OFFER,
        variantStatus: "hidden",
        requestedQuantity: 1,
      }).ok
    ).toBe(false);
    expect(
      evaluateCartAdd({
        ...ACTIVE_OFFER,
        priceStatus: "archived",
        requestedQuantity: 1,
      }).ok
    ).toBe(false);
  });

  it("rejects overstock quantity unless backorder allowed", () => {
    expect(
      evaluateCartAdd({
        ...ACTIVE_OFFER,
        onHand: 2,
        reserved: 0,
        safetyStock: 0,
        requestedQuantity: 3,
        allowBackorder: false,
      }).ok
    ).toBe(false);

    expect(
      evaluateCartAdd({
        ...ACTIVE_OFFER,
        onHand: 2,
        requestedQuantity: 3,
        allowBackorder: true,
      }).ok
    ).toBe(true);
  });
});

describe("duplicate variant merges quantity", () => {
  it("merges add into existing line idempotently", () => {
    const merged = mergeCartQuantity({
      existingQuantity: 2,
      addQuantity: 3,
    });
    expect(merged).toEqual({ ok: true, quantity: 5 });

    const evaluated = evaluateCartAdd({
      ...ACTIVE_OFFER,
      onHand: 20,
      existingQuantity: 2,
      requestedQuantity: 3,
    });
    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) return;
    expect(evaluated.quantity).toBe(5);
  });
});

describe("cross-currency rejected", () => {
  it("rejects mismatched cart/item currencies", () => {
    expect(assertCurrenciesCompatible("USD", "EUR").ok).toBe(false);
    expect(assertCurrenciesCompatible("USD", "usd")).toEqual({
      ok: true,
      currency: "USD",
    });
  });
});

describe("cart summary totals", () => {
  it("groups by store and computes subtotal correctly", () => {
    const summary = computeCartSummary([
      {
        id: "1",
        storeId: "s1",
        storeName: "Alpha",
        quantity: 2,
        unitPriceMinor: 1000,
        currency: "USD",
        productTitle: "A",
        variantTitle: "Default",
        mediaSnapshot: null,
      },
      {
        id: "2",
        storeId: "s1",
        storeName: "Alpha",
        quantity: 1,
        unitPriceMinor: 500,
        currency: "USD",
        productTitle: "B",
        variantTitle: "Default",
        mediaSnapshot: null,
      },
      {
        id: "3",
        storeId: "s2",
        storeName: "Beta",
        quantity: 1,
        unitPriceMinor: 250,
        currency: "USD",
        productTitle: "C",
        variantTitle: "Default",
        mediaSnapshot: null,
      },
    ]);

    expect(summary.itemCount).toBe(4);
    expect(summary.subtotalMinor).toBe(2750);
    expect(summary.groups).toHaveLength(2);
    expect(summary.groups.find((g) => g.storeId === "s1")?.storeSubtotalMinor).toBe(
      2500
    );
  });

  it("skips corrupted cross-currency lines in totals", () => {
    const summary = computeCartSummary([
      {
        id: "1",
        storeId: "s1",
        quantity: 1,
        unitPriceMinor: 100,
        currency: "USD",
        productTitle: "A",
        variantTitle: "D",
        mediaSnapshot: null,
      },
      {
        id: "2",
        storeId: "s1",
        quantity: 1,
        unitPriceMinor: 999,
        currency: "EUR",
        productTitle: "B",
        variantTitle: "D",
        mediaSnapshot: null,
      },
    ]);
    expect(summary.subtotalMinor).toBe(100);
    expect(summary.itemCount).toBe(1);
  });
});

describe("quantity validation", () => {
  it("fails safely on corrupted inputs", () => {
    expect(validateCartQuantity(0).ok).toBe(false);
    expect(validateCartQuantity(-1).ok).toBe(false);
    expect(validateCartQuantity("1.5").ok).toBe(false);
    expect(validateCartQuantity("abc").ok).toBe(false);
    expect(validateCartQuantity(2)).toEqual({ ok: true, quantity: 2 });
  });
});
