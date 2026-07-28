import { describe, expect, it } from "vitest";
import {
  buildBuyerOrderMoneyRows,
  buildBuyerStatusChips,
  buildConfirmedBuyerTimeline,
  buyerDeliveryStatusLabel,
  buyerOrderStatusLabel,
  buyerPaymentStatusLabel,
  canBuyerCancelUnpaidOrder,
  canRetryDeferredPaymentRecording,
  deriveBuyerOrderActions,
  formatBuyerMoneyRow,
  groupBuyerOrdersByStore,
} from "./buyerOrdersPresentation";

describe("buyerOrdersPresentation — status separation", () => {
  it("keeps order, payment, fulfillment, and delivery labels distinct", () => {
    const chips = buildBuyerStatusChips({
      status: "processing",
      paymentStatus: "pending",
      fulfillmentStatus: "unfulfilled",
    });
    expect(chips.map((c) => c.kind)).toEqual([
      "order",
      "payment",
      "fulfillment",
      "delivery",
    ]);
    expect(chips[0]?.label).toContain("Preparing");
    expect(chips[1]?.label).toContain("Payment pending");
    expect(chips[2]?.label).toContain("Not fulfilled");
    expect(chips[3]?.label).toContain("Not handed to shipping");
  });

  it("renders unknown states honestly", () => {
    expect(buyerOrderStatusLabel("weird")).toMatch(/Unknown order state/);
    expect(buyerPaymentStatusLabel("mystery")).toMatch(/Unknown payment state/);
    expect(buyerDeliveryStatusLabel({ status: "packed" }).label).toBe(
      "Ready for shipping"
    );
    expect(
      buyerDeliveryStatusLabel({
        status: "confirmed",
        shippedAt: "2026-07-01T00:00:00.000Z",
      }).label
    ).toBe("Handed to shipping");
  });
});

describe("buyerOrdersPresentation — money integrity", () => {
  it("builds money rows only from trusted order totals", () => {
    const rows = buildBuyerOrderMoneyRows({
      subtotal_minor: 2000,
      discount_total_minor: 200,
      tax_total_minor: 50,
      shipping_total_minor: 300,
      grand_total_minor: 2150,
    });
    expect(rows.find((r) => r.key === "grand")?.amountMinor).toBe(2150);
    expect(formatBuyerMoneyRow(rows.find((r) => r.key === "discount")!, "USD")).toMatch(
      /−/
    );
  });
});

describe("buyerOrdersPresentation — timeline confirmed-only", () => {
  it("does not invent unconfirmed progression steps", () => {
    const events = buildConfirmedBuyerTimeline({
      createdAt: "2026-07-01T10:00:00.000Z",
      status: "confirmed",
      confirmedAt: null,
      processingAt: null,
      packedAt: null,
      shippedAt: null,
      deliveredAt: null,
    });
    expect(events.map((e) => e.key)).toEqual(["placed"]);
  });

  it("includes only stamped events plus cancellation when applicable", () => {
    const events = buildConfirmedBuyerTimeline({
      createdAt: "2026-07-01T10:00:00.000Z",
      status: "shipped",
      confirmedAt: "2026-07-01T11:00:00.000Z",
      shippedAt: "2026-07-02T09:00:00.000Z",
    });
    expect(events.map((e) => e.key)).toEqual([
      "placed",
      "confirmed",
      "shipped",
    ]);
  });
});

describe("buyerOrdersPresentation — actions and multi-seller", () => {
  it("exposes cancel only for unpaid cancellable states", () => {
    expect(
      canBuyerCancelUnpaidOrder({
        status: "confirmed",
        paymentStatus: "pending",
      }).ok
    ).toBe(true);
    expect(
      canBuyerCancelUnpaidOrder({
        status: "shipped",
        paymentStatus: "pending",
      }).ok
    ).toBe(false);
    expect(
      canBuyerCancelUnpaidOrder({
        status: "confirmed",
        paymentStatus: "paid",
      }).ok
    ).toBe(false);
  });

  it("allows deferred payment recovery without inventing live charge", () => {
    expect(
      canRetryDeferredPaymentRecording({
        paymentStatus: "pending",
        orderStatus: "confirmed",
        hasDeferredAttempt: false,
      }).ok
    ).toBe(true);
    expect(
      canRetryDeferredPaymentRecording({
        paymentStatus: "paid",
        orderStatus: "confirmed",
        hasDeferredAttempt: true,
      }).ok
    ).toBe(false);
  });

  it("derives safe navigation actions", () => {
    const actions = deriveBuyerOrderActions({
      storeSlug: "atelier",
      orderId: "11111111-1111-1111-1111-111111111111",
      status: "confirmed",
      paymentStatus: "pending",
      hasDeferredAttempt: false,
    });
    expect(actions.find((a) => a.id === "view_store")?.href).toBe(
      "/store/atelier"
    );
    expect(actions.find((a) => a.id === "cancel_unpaid")?.enabled).toBe(true);
    expect(
      actions.find((a) => a.id === "retry_deferred_payment")?.enabled
    ).toBe(true);
  });

  it("groups list items by seller without merging identities", () => {
    const grouped = groupBuyerOrdersByStore([
      { storeId: "a", id: "1" },
      { storeId: "b", id: "2" },
      { storeId: "a", id: "3" },
    ]);
    expect(grouped.get("a")).toHaveLength(2);
    expect(grouped.get("b")).toHaveLength(1);
  });
});
