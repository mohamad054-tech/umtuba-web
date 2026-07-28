import { describe, expect, it } from "vitest";
import {
  canSellerUpdateOrderOps,
  deriveSellerOpsActions,
  deriveSellerOrderAttention,
  isPaymentBlockingFulfillmentProgress,
  sellerListBuyerLabel,
  sellerOrderStatusOptions,
  sellerTransitionPaymentBlocked,
  validateSellerStatusFormSelection,
} from "./sellerOrdersPresentation";

describe("sellerOrdersPresentation — privacy and attention", () => {
  it("minimizes buyer identity in list labels", () => {
    expect(sellerListBuyerLabel("Ada Lovelace")).toBe("Ada");
    expect(sellerListBuyerLabel("Customer")).toBe("Customer");
    expect(sellerListBuyerLabel("")).toBe("Customer");
  });

  it("flags unpaid and failed payment attention", () => {
    expect(
      deriveSellerOrderAttention({
        status: "packed",
        paymentStatus: "pending",
        fulfillmentStatus: "partial",
      }).level
    ).toBe("warn");
    expect(
      deriveSellerOrderAttention({
        status: "confirmed",
        paymentStatus: "failed",
        fulfillmentStatus: "unfulfilled",
      }).level
    ).toBe("critical");
  });
});

describe("sellerOrdersPresentation — payment safety", () => {
  it("blocks ship/deliver and fulfilled while payment pending/failed", () => {
    expect(isPaymentBlockingFulfillmentProgress("pending")).toBe(true);
    expect(isPaymentBlockingFulfillmentProgress("paid")).toBe(false);

    expect(
      sellerTransitionPaymentBlocked({
        paymentStatus: "pending",
        toStatus: "shipped",
      }).blocked
    ).toBe(true);
    expect(
      sellerTransitionPaymentBlocked({
        paymentStatus: "pending",
        toStatus: "confirmed",
      }).blocked
    ).toBe(false);
    expect(
      sellerTransitionPaymentBlocked({
        paymentStatus: "failed",
        toFulfillment: "fulfilled",
      }).blocked
    ).toBe(true);
    expect(
      sellerTransitionPaymentBlocked({
        paymentStatus: "paid",
        toStatus: "shipped",
      }).blocked
    ).toBe(false);
  });

  it("marks ship options as payment-blocked in status menus", () => {
    const options = sellerOrderStatusOptions({
      status: "packed",
      paymentStatus: "pending",
    });
    const ship = options.find((o) => o.value === "shipped");
    expect(ship?.paymentBlocked).toBe(true);
    const cancel = options.find((o) => o.value === "cancelled");
    expect(cancel?.paymentBlocked).toBe(false);
  });
});

describe("sellerOrdersPresentation — action derivation and stale guards", () => {
  it("requires owner/manager and blocks terminal orders", () => {
    expect(
      canSellerUpdateOrderOps({ role: "viewer", status: "pending" }).ok
    ).toBe(false);
    expect(
      canSellerUpdateOrderOps({ role: "owner", status: "delivered" }).ok
    ).toBe(false);
    expect(
      canSellerUpdateOrderOps({ role: "manager", status: "processing" }).ok
    ).toBe(true);
  });

  it("rejects invalid or payment-blocked form selections", () => {
    expect(
      validateSellerStatusFormSelection({
        currentStatus: "pending",
        currentFulfillment: "unfulfilled",
        paymentStatus: "pending",
        selectedStatus: "shipped",
        selectedFulfillment: "",
      }).ok
    ).toBe(false);

    expect(
      validateSellerStatusFormSelection({
        currentStatus: "packed",
        currentFulfillment: "partial",
        paymentStatus: "pending",
        selectedStatus: "shipped",
        selectedFulfillment: "",
      }).ok
    ).toBe(false);

    expect(
      validateSellerStatusFormSelection({
        currentStatus: "pending",
        currentFulfillment: "unfulfilled",
        paymentStatus: "pending",
        selectedStatus: "confirmed",
        selectedFulfillment: "",
      })
    ).toEqual({ ok: true, status: "confirmed", fulfillment: undefined });
  });

  it("derives ops actions with honest blocked update state", () => {
    const actions = deriveSellerOpsActions({
      role: "owner",
      status: "packed",
      paymentStatus: "pending",
      fulfillmentStatus: "partial",
    });
    const update = actions.find((a) => a.id === "update_status");
    // cancel remains available even when ship is blocked
    expect(update?.enabled).toBe(true);
    expect(actions.find((a) => a.id === "view_dashboard")?.href).toBe(
      "/seller/store"
    );
  });
});
