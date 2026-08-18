import { describe, expect, it } from "vitest";
import { displayOnHand, STORE_LISTING_VIEWS } from "./listings";
import {
  addToCart,
  cartActorIds,
  cartQuantity,
  completeRefundDemo,
  emptyStoreSession,
  placeOrder,
  requestRefund,
  requestReturn,
  setCartQuantity,
  toggleFavorite,
} from "./session";

describe("sandbox store session", () => {
  const physical = STORE_LISTING_VIEWS.find((row) => row.stockKind === "physical")!;
  const otherActor = STORE_LISTING_VIEWS.find((row) => row.actorId !== physical.actorId)!;

  it("adds, updates, and removes cart lines without mutating fixture stock", () => {
    const before = displayOnHand(physical);
    let state = emptyStoreSession();
    expect(state.cart).toHaveLength(0);
    state = addToCart(state, physical.product.slug, physical.product.variants[0]!.id, 2);
    expect(cartQuantity(state)).toBe(2);
    state = setCartQuantity(state, physical.product.slug, physical.product.variants[0]!.id, 1);
    expect(cartQuantity(state)).toBe(1);
    state = setCartQuantity(state, physical.product.slug, physical.product.variants[0]!.id, 0);
    expect(state.cart).toHaveLength(0);
    expect(displayOnHand(physical)).toBe(before);
  });

  it("toggles favorites", () => {
    let state = emptyStoreSession();
    state = toggleFavorite(state, physical.product.slug);
    expect(state.favorites).toContain(physical.product.slug);
    state = toggleFavorite(state, physical.product.slug);
    expect(state.favorites).not.toContain(physical.product.slug);
  });

  it("places SUCCESS and PROCESSING orders and keeps DECLINED/CANCELLED off the ledger", () => {
    let state = emptyStoreSession();
    state = addToCart(state, physical.product.slug, physical.product.variants[0]!.id, 1);
    const declined = placeOrder(state, { shippingId: "standard", outcome: "DECLINED" });
    expect(declined.ok).toBe(false);
    expect(declined.state.cart).toHaveLength(1);
    const cancelled = placeOrder(state, { shippingId: "standard", outcome: "CANCELLED" });
    expect(cancelled.ok).toBe(false);
    const success = placeOrder(state, { shippingId: "standard", outcome: "SUCCESS" });
    expect(success.ok).toBe(true);
    if (success.ok) {
      expect(success.order.paymentMode).toBe("SANDBOX");
      expect(success.order.realPayment).toBe(false);
      expect(success.order.realProviderCall).toBe(false);
      expect(success.payment.realProviderCall).toBe(false);
      expect(success.state.cart).toHaveLength(0);
      expect(success.state.orders[0]?.id).toBe(success.order.id);
    }
    state = addToCart(emptyStoreSession(), physical.product.slug, physical.product.variants[0]!.id, 1);
    const processing = placeOrder(state, { shippingId: "standard", outcome: "PROCESSING" });
    expect(processing.ok).toBe(true);
    if (processing.ok) expect(processing.order.status).toBe("PROCESSING");
  });

  it("supports after-sale return and refund demo states", () => {
    let state = emptyStoreSession();
    state = addToCart(state, physical.product.slug, physical.product.variants[0]!.id, 1);
    const placed = placeOrder(state, { shippingId: "standard", outcome: "SUCCESS" });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    state = requestReturn(placed.state, placed.order.id);
    expect(state.orders[0]?.afterSale).toBe("RETURN_PENDING");
    state = requestRefund(placed.state, placed.order.id);
    expect(state.orders[0]?.paymentOutcome).toBe("REFUND_PENDING");
    state = completeRefundDemo(state, placed.order.id);
    expect(state.orders[0]?.afterSale).toBe("REFUNDED_DEMO");
    expect(state.orders[0]?.realProviderCall).toBe(false);
  });

  it("flags multi-provider carts without merging actors", () => {
    let state = emptyStoreSession();
    state = addToCart(state, physical.product.slug, physical.product.variants[0]!.id, 1);
    state = addToCart(state, otherActor.product.slug, otherActor.product.variants[0]!.id, 1);
    expect(cartActorIds(state).length).toBeGreaterThan(1);
  });
});
