import { describe, expect, it } from "vitest";
import {
  assertPurchaseStockDecrementCommitmentPoint,
  buildPurchaseStockDecrementEventKey,
  buildPurchaseStockDecrementLineEventKey,
  formatPurchaseStockDecrementPlanSummary,
  planPurchaseStockDecrement,
  purchaseStockDecrementFoundationScope,
  rejectClientPurchaseStockDecrementExecutionFields,
  validatePurchaseStockDecrementLineRelations,
  PURCHASE_STOCK_DECREMENT_COMMITMENT_POINT,
  PURCHASE_STOCK_DECREMENT_FOUNDATION_ID,
} from "./purchaseStockDecrementFoundation";

const ORDER_ID = "11111111-1111-4111-8111-111111111111";
const ITEM_ID = "22222222-2222-4222-8222-222222222222";
const STORE_ID = "33333333-3333-4333-8333-333333333333";
const PRODUCT_ID = "44444444-4444-4444-8444-444444444444";
const VARIANT_ID = "55555555-5555-4555-8555-555555555555";
const RESERVATION_ID = "66666666-6666-4666-8666-666666666666";
const CAPTURE_KEY = "stripe:pi_test_abc:captured";

function finiteLine(overrides?: {
  productType?: string;
  status?: string;
  quantity?: number;
  onHand?: number;
  reserved?: number;
  safetyStock?: number;
  reservationOrderId?: string | null;
  reservationProductId?: string;
  reservationVariantId?: string;
  tracking?: "finite" | "unlimited" | "unavailable" | "unknown";
}) {
  return {
    orderId: ORDER_ID,
    orderItemId: ITEM_ID,
    storeId: STORE_ID,
    productId: PRODUCT_ID,
    variantId: VARIANT_ID,
    productType: overrides?.productType ?? "physical",
    reservation: {
      id: RESERVATION_ID,
      orderId: overrides?.reservationOrderId === undefined
        ? ORDER_ID
        : overrides.reservationOrderId,
      productId: overrides?.reservationProductId ?? PRODUCT_ID,
      variantId: overrides?.reservationVariantId ?? VARIANT_ID,
      quantity: overrides?.quantity ?? 2,
      status: overrides?.status ?? "active",
    },
    current: {
      tracking: overrides?.tracking ?? ("finite" as const),
      onHand: overrides?.onHand ?? 10,
      reserved: overrides?.reserved ?? 2,
      safetyStock: overrides?.safetyStock ?? 1,
    },
  };
}

describe("Purchase Stock Decrement Foundation V1", () => {
  it("exposes capability, capture commitment, and deferred runtime scope", () => {
    expect(PURCHASE_STOCK_DECREMENT_FOUNDATION_ID).toBe(
      "commerce.inventory.purchase_stock_decrement_foundation_v1"
    );
    expect(PURCHASE_STOCK_DECREMENT_COMMITMENT_POINT).toBe(
      "trusted_payment_capture"
    );
    const scope = purchaseStockDecrementFoundationScope();
    expect(scope.ownsApplyRuntime).toBe(false);
    expect(scope.ownsMigration).toBe(false);
    expect(scope.sequence).toBe("consume_then_purchase_decrement");
    expect(scope.quantitySource).toBe("trusted_reservation_only");
    expect(buildPurchaseStockDecrementEventKey(CAPTURE_KEY)).toBe(
      `${CAPTURE_KEY}:purchase_stock`
    );
    expect(
      buildPurchaseStockDecrementLineEventKey(CAPTURE_KEY, RESERVATION_ID)
    ).toBe(`${CAPTURE_KEY}:purchase_stock:${RESERVATION_ID}`);
  });

  it("rejects forbidden lifecycle points fail-closed", () => {
    expect(
      assertPurchaseStockDecrementCommitmentPoint("trusted_payment_capture").ok
    ).toBe(true);
    expect(
      assertPurchaseStockDecrementCommitmentPoint("checkout_confirm").ok
    ).toBe(false);
    expect(assertPurchaseStockDecrementCommitmentPoint("fulfillment").ok).toBe(
      false
    );
    expect(assertPurchaseStockDecrementCommitmentPoint("order_create").ok).toBe(
      false
    );
  });

  it("projects finite consume-then-decrement without applying", () => {
    const plan = planPurchaseStockDecrement({
      commitmentPoint: "trusted_payment_capture",
      captureEventKey: CAPTURE_KEY,
      line: finiteLine(),
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok || plan.disposition !== "projected") return;
    expect(plan.sequence.applied).toBe(false);
    expect(plan.sequence.consume.recorded).toBe(false);
    expect(plan.sequence.decrement.recorded).toBe(false);
    expect(plan.sequence.consume.after.reserved).toBe(0);
    expect(plan.sequence.decrement.after.onHand).toBe(8);
    expect(plan.sequence.decrement.after.reserved).toBe(0);
    expect(plan.sequence.decrement.after.available).toBe(7);
    expect(plan.sequence.idempotencyKey).toBe(`${CAPTURE_KEY}:purchase_stock`);
    expect(formatPurchaseStockDecrementPlanSummary(plan)).toContain(
      "on hand 10 → 8"
    );
  });

  it("no-ops digital/unlimited without inventing finite stock", () => {
    for (const productType of [
      "digital",
      "service",
      "subscription",
      "bundle",
    ]) {
      const plan = planPurchaseStockDecrement({
        commitmentPoint: "trusted_payment_capture",
        captureEventKey: CAPTURE_KEY,
        line: finiteLine({ productType }),
      });
      expect(plan.ok).toBe(true);
      if (!plan.ok) return;
      expect(plan.disposition).toBe("noop_unlimited");
      if (plan.disposition !== "noop_unlimited") return;
      expect(plan.applied).toBe(false);
    }
  });

  it("keeps idempotency keys stable across retries (contract)", () => {
    const a = planPurchaseStockDecrement({
      commitmentPoint: "trusted_payment_capture",
      captureEventKey: CAPTURE_KEY,
      line: finiteLine(),
    });
    const b = planPurchaseStockDecrement({
      commitmentPoint: "trusted_payment_capture",
      captureEventKey: CAPTURE_KEY,
      line: finiteLine(),
    });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    if (a.disposition !== "projected" || b.disposition !== "projected") return;
    expect(a.sequence.idempotencyKey).toBe(b.sequence.idempotencyKey);
    expect(a.sequence.lineIdempotencyKey).toBe(b.sequence.lineIdempotencyKey);
    expect(a.sequence.decrement.after.onHand).toBe(
      b.sequence.decrement.after.onHand
    );
  });

  it("fails closed on insufficient/inconsistent inventory and negatives", () => {
    expect(
      planPurchaseStockDecrement({
        commitmentPoint: "trusted_payment_capture",
        captureEventKey: CAPTURE_KEY,
        line: finiteLine({ onHand: 1, reserved: 2, quantity: 2 }),
      }).ok
    ).toBe(false);

    expect(
      planPurchaseStockDecrement({
        commitmentPoint: "trusted_payment_capture",
        captureEventKey: CAPTURE_KEY,
        line: finiteLine({ onHand: 2, reserved: 1, quantity: 2 }),
      }).ok
    ).toBe(false);

    expect(
      planPurchaseStockDecrement({
        commitmentPoint: "trusted_payment_capture",
        captureEventKey: CAPTURE_KEY,
        line: finiteLine({ tracking: "unlimited", onHand: null as unknown as number }),
      }).ok
    ).toBe(false);
  });

  it("fails closed on released/expired/consumed holds and missing relations", () => {
    expect(
      planPurchaseStockDecrement({
        commitmentPoint: "trusted_payment_capture",
        captureEventKey: CAPTURE_KEY,
        line: finiteLine({ status: "released" }),
      }).ok
    ).toBe(false);
    expect(
      planPurchaseStockDecrement({
        commitmentPoint: "trusted_payment_capture",
        captureEventKey: CAPTURE_KEY,
        line: finiteLine({ status: "expired" }),
      }).ok
    ).toBe(false);
    expect(
      planPurchaseStockDecrement({
        commitmentPoint: "trusted_payment_capture",
        captureEventKey: CAPTURE_KEY,
        line: finiteLine({ status: "consumed" }),
      }).ok
    ).toBe(false);

    expect(
      validatePurchaseStockDecrementLineRelations({
        orderId: ORDER_ID,
        orderItemId: ITEM_ID,
        storeId: STORE_ID,
        productId: PRODUCT_ID,
        variantId: VARIANT_ID,
        reservation: {
          id: RESERVATION_ID,
          orderId: null,
          productId: PRODUCT_ID,
          variantId: VARIANT_ID,
          quantity: 1,
          status: "active",
        },
      }).ok
    ).toBe(false);

    expect(
      validatePurchaseStockDecrementLineRelations({
        orderId: ORDER_ID,
        orderItemId: ITEM_ID,
        storeId: STORE_ID,
        productId: PRODUCT_ID,
        variantId: VARIANT_ID,
        reservation: {
          id: RESERVATION_ID,
          orderId: ORDER_ID,
          productId: "77777777-7777-4777-8777-777777777777",
          variantId: VARIANT_ID,
          quantity: 1,
          status: "active",
        },
      }).ok
    ).toBe(false);
  });

  it("rejects client execution claims and cross-order mismatches", () => {
    expect(
      rejectClientPurchaseStockDecrementExecutionFields({ note: "ok" }).ok
    ).toBe(true);
    expect(
      rejectClientPurchaseStockDecrementExecutionFields({
        decrementOnHand: 1,
      }).ok
    ).toBe(false);
    expect(
      rejectClientPurchaseStockDecrementExecutionFields({
        clientQuantity: 9,
      }).ok
    ).toBe(false);

    expect(
      planPurchaseStockDecrement({
        commitmentPoint: "trusted_payment_capture",
        captureEventKey: CAPTURE_KEY,
        line: finiteLine({
          reservationOrderId: "88888888-8888-4888-8888-888888888888",
        }),
      }).ok
    ).toBe(false);
  });
});
