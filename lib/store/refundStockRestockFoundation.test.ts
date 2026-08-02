import { describe, expect, it } from "vitest";
import {
  assertRefundStockRestockCommitmentPoint,
  buildRefundStockRestockEventKey,
  buildRefundStockRestockLineEventKey,
  formatRefundStockRestockPlanSummary,
  normalizeRefundStockRestockReadRow,
  planRefundStockRestock,
  refundStockRestockFoundationScope,
  refundStockRestockPresentationCopy,
  rejectClientRefundStockRestockExecutionFields,
  validateRefundStockRestockLineRelations,
  REFUND_STOCK_RESTOCK_COMMITMENT_POINT,
  REFUND_STOCK_RESTOCK_FOUNDATION_ID,
} from "./refundStockRestockFoundation";

const ORDER_ID = "11111111-1111-4111-8111-111111111111";
const ITEM_ID = "22222222-2222-4222-8222-222222222222";
const STORE_ID = "33333333-3333-4333-8333-333333333333";
const PRODUCT_ID = "44444444-4444-4444-8444-444444444444";
const VARIANT_ID = "55555555-5555-4555-8555-555555555555";
const RESERVATION_ID = "66666666-6666-4666-8666-666666666666";
const CAPTURE_KEY = "stripe:pi_test_abc:captured";

function finiteLine(overrides?: {
  productType?: string;
  priorDecrementQuantity?: number;
  priorPurchaseDecrementApplied?: boolean;
  priorPurchaseDecrementWasNoop?: boolean;
  onHand?: number;
  reserved?: number;
  safetyStock?: number;
  tracking?: "finite" | "unlimited" | "unavailable" | "unknown";
}) {
  return {
    orderId: ORDER_ID,
    orderItemId: ITEM_ID,
    storeId: STORE_ID,
    productId: PRODUCT_ID,
    variantId: VARIANT_ID,
    productType: overrides?.productType ?? "physical",
    reservationId: RESERVATION_ID,
    priorDecrementQuantity: overrides?.priorDecrementQuantity ?? 2,
    priorPurchaseDecrementApplied:
      overrides?.priorPurchaseDecrementApplied ?? true,
    priorPurchaseDecrementWasNoop: overrides?.priorPurchaseDecrementWasNoop,
    current: {
      tracking: overrides?.tracking ?? ("finite" as const),
      onHand: overrides?.onHand ?? 8,
      reserved: overrides?.reserved ?? 0,
      safetyStock: overrides?.safetyStock ?? 1,
    },
  };
}

describe("Refund Stock Restock Foundation V1", () => {
  it("exposes capability, refund commitment, and deferred runtime scope", () => {
    expect(REFUND_STOCK_RESTOCK_FOUNDATION_ID).toBe(
      "commerce.inventory.refund_stock_restock_foundation_v1"
    );
    expect(REFUND_STOCK_RESTOCK_COMMITMENT_POINT).toBe("trusted_payment_refund");
    const scope = refundStockRestockFoundationScope();
    expect(scope.ownsApplyRuntime).toBe(false);
    expect(scope.ownsMigration).toBe(false);
    expect(scope.ownsCancellationRestock).toBe(false);
    expect(scope.ownsPartialRefundRestock).toBe(false);
    expect(scope.movementType).toBe("return_increment");
    expect(scope.prerequisite).toBe("prior_purchase_stock_decrement_applied");
    expect(scope.futureWireIn).toBe(
      "applyFullOrderRefund_after_sync_refunded"
    );
    expect(buildRefundStockRestockEventKey(CAPTURE_KEY)).toBe(
      `${CAPTURE_KEY}:purchase_stock:restock`
    );
    expect(
      buildRefundStockRestockLineEventKey(CAPTURE_KEY, RESERVATION_ID)
    ).toBe(`${CAPTURE_KEY}:purchase_stock:restock:${RESERVATION_ID}`);
  });

  it("rejects forbidden lifecycle points and partial scope fail-closed", () => {
    expect(
      assertRefundStockRestockCommitmentPoint("trusted_payment_refund").ok
    ).toBe(true);
    expect(
      assertRefundStockRestockCommitmentPoint("cancellation_release").ok
    ).toBe(false);
    expect(
      assertRefundStockRestockCommitmentPoint("partial_refund").ok
    ).toBe(false);
    expect(
      assertRefundStockRestockCommitmentPoint("trusted_payment_capture").ok
    ).toBe(false);

    expect(
      planRefundStockRestock({
        commitmentPoint: "trusted_payment_refund",
        captureEventKey: CAPTURE_KEY,
        refundScope: "partial",
        line: finiteLine(),
      }).ok
    ).toBe(false);
  });

  it("projects finite return_increment without applying when prior decrement proven", () => {
    const plan = planRefundStockRestock({
      commitmentPoint: "trusted_payment_refund",
      captureEventKey: CAPTURE_KEY,
      refundScope: "full_order",
      line: finiteLine(),
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok || plan.disposition !== "projected") return;
    expect(plan.sequence.applied).toBe(false);
    expect(plan.sequence.restock.recorded).toBe(false);
    expect(plan.sequence.restock.type).toBe("return_increment");
    expect(plan.sequence.restock.after.onHand).toBe(10);
    expect(plan.sequence.restock.after.reserved).toBe(0);
    expect(plan.sequence.restock.after.available).toBe(9);
    expect(formatRefundStockRestockPlanSummary(plan)).toContain("8 → 10");

    const row = normalizeRefundStockRestockReadRow(plan);
    expect(row.recorded).toBe(false);
    expect(row.disposition).toBe("projected");
    expect(row.quantity).toBe(2);
  });

  it("no-ops digital/unlimited and prior purchase-stock noop without inventing stock", () => {
    for (const productType of [
      "digital",
      "service",
      "subscription",
      "bundle",
    ]) {
      const plan = planRefundStockRestock({
        commitmentPoint: "trusted_payment_refund",
        captureEventKey: CAPTURE_KEY,
        line: finiteLine({ productType }),
      });
      expect(plan.ok).toBe(true);
      if (!plan.ok) return;
      expect(plan.disposition).toBe("noop_unlimited");
    }

    const noopPrior = planRefundStockRestock({
      commitmentPoint: "trusted_payment_refund",
      captureEventKey: CAPTURE_KEY,
      line: finiteLine({
        priorPurchaseDecrementWasNoop: true,
        priorPurchaseDecrementApplied: false,
      }),
    });
    expect(noopPrior.ok).toBe(true);
    if (!noopPrior.ok) return;
    expect(noopPrior.disposition).toBe("noop_no_prior_decrement");
  });

  it("fails closed without prior decrement evidence and on relation mismatches", () => {
    expect(
      planRefundStockRestock({
        commitmentPoint: "trusted_payment_refund",
        captureEventKey: CAPTURE_KEY,
        line: finiteLine({ priorPurchaseDecrementApplied: false }),
      }).ok
    ).toBe(false);

    expect(
      validateRefundStockRestockLineRelations({
        orderId: ORDER_ID,
        orderItemId: ITEM_ID,
        storeId: STORE_ID,
        productId: PRODUCT_ID,
        variantId: VARIANT_ID,
        reservationId: "not-a-uuid",
      }).ok
    ).toBe(false);
  });

  it("keeps idempotency keys stable and rejects client execution claims", () => {
    const a = planRefundStockRestock({
      commitmentPoint: "trusted_payment_refund",
      captureEventKey: CAPTURE_KEY,
      line: finiteLine(),
    });
    const b = planRefundStockRestock({
      commitmentPoint: "trusted_payment_refund",
      captureEventKey: CAPTURE_KEY,
      line: finiteLine(),
    });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    if (a.disposition !== "projected" || b.disposition !== "projected") return;
    expect(a.sequence.idempotencyKey).toBe(b.sequence.idempotencyKey);
    expect(a.sequence.lineIdempotencyKey).toBe(b.sequence.lineIdempotencyKey);

    expect(
      rejectClientRefundStockRestockExecutionFields({ note: "ok" }).ok
    ).toBe(true);
    expect(
      rejectClientRefundStockRestockExecutionFields({
        restockOnHand: 1,
      }).ok
    ).toBe(false);
    expect(
      rejectClientRefundStockRestockExecutionFields({
        partialRestockQty: 1,
      }).ok
    ).toBe(false);

    const copy = refundStockRestockPresentationCopy();
    expect(copy.body.toLowerCase()).toContain("trusted sync refunded");
    expect(copy.note.toLowerCase()).toContain("partial");
  });
});
