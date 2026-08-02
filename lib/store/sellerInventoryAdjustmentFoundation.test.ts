import { describe, expect, it } from "vitest";
import {
  formatSellerInventoryAdjustmentProjectionSummary,
  listSellerInventoryAdjustmentReasonOptions,
  parseSellerInventoryAdjustmentReason,
  rejectClientInventoryAdjustmentExecutionFields,
  sellerInventoryAdjustmentFoundationScope,
  validateSellerInventoryAdjustmentIntent,
  SELLER_INVENTORY_ADJUSTMENT_FOUNDATION_ID,
  SELLER_INVENTORY_ADJUSTMENT_REASONS,
} from "./sellerInventoryAdjustmentFoundation";
import { productEditorInventoryAlignmentCopy } from "./sellerInventoryPresentation";

describe("Seller Inventory Adjustment Foundation V1", () => {
  it("exposes capability, contract reasons, and deferred apply scope", () => {
    expect(SELLER_INVENTORY_ADJUSTMENT_FOUNDATION_ID).toBe(
      "commerce.inventory.seller_inventory_adjustment_foundation_v1"
    );
    expect(SELLER_INVENTORY_ADJUSTMENT_REASONS).toContain("correction");
    expect(SELLER_INVENTORY_ADJUSTMENT_REASONS).toContain("stock_count");
    expect(SELLER_INVENTORY_ADJUSTMENT_REASONS).toContain("damaged");
    expect(SELLER_INVENTORY_ADJUSTMENT_REASONS).toContain("returned");
    expect(SELLER_INVENTORY_ADJUSTMENT_REASONS).toContain("manual_adjustment");
    const scope = sellerInventoryAdjustmentFoundationScope();
    expect(scope.ownsApplyRuntime).toBe(false);
    expect(scope.ownsMovementLedger).toBe(false);
    expect(scope.catalogSeedIsNotAdjustmentLedger).toBe(true);
    expect(listSellerInventoryAdjustmentReasonOptions()).toHaveLength(5);
  });

  it("parses reasons fail-closed", () => {
    expect(parseSellerInventoryAdjustmentReason("stock count")).toEqual({
      ok: true,
      value: "stock_count",
    });
    expect(parseSellerInventoryAdjustmentReason("unknown").ok).toBe(false);
    expect(parseSellerInventoryAdjustmentReason(null).ok).toBe(false);
  });

  it("validates adjustment intents against finite quantity snapshots without applying", () => {
    const ok = validateSellerInventoryAdjustmentIntent({
      reason: "correction",
      deltaOnHand: -2,
      note: "  Count fix  ",
      current: {
        tracking: "finite",
        onHand: 10,
        reserved: 3,
        safetyStock: 1,
      },
    });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.projection.applied).toBe(false);
    expect(ok.projection.after.onHand).toBe(8);
    expect(ok.projection.after.reserved).toBe(3);
    expect(ok.projection.after.available).toBe(4);
    expect(ok.intent.note).toBe("Count fix");
    expect(
      formatSellerInventoryAdjustmentProjectionSummary(ok.projection)
    ).toContain("10 → 8");
  });

  it("rejects adjustments that breach reserved or go negative", () => {
    expect(
      validateSellerInventoryAdjustmentIntent({
        reason: "damaged",
        deltaOnHand: -8,
        current: {
          tracking: "finite",
          onHand: 10,
          reserved: 5,
          safetyStock: 0,
        },
      }).ok
    ).toBe(false);

    expect(
      validateSellerInventoryAdjustmentIntent({
        reason: "manual_adjustment",
        deltaOnHand: -11,
        current: {
          tracking: "finite",
          onHand: 10,
          reserved: 0,
          safetyStock: 0,
        },
      }).ok
    ).toBe(false);

    expect(
      validateSellerInventoryAdjustmentIntent({
        reason: "returned",
        deltaOnHand: 1,
        current: {
          tracking: "unlimited",
          onHand: null,
          reserved: null,
          safetyStock: null,
        },
      }).ok
    ).toBe(false);
  });

  it("rejects client execution claims and keeps seed copy distinct from ledger", () => {
    expect(
      rejectClientInventoryAdjustmentExecutionFields({ note: "ok" }).ok
    ).toBe(true);
    expect(
      rejectClientInventoryAdjustmentExecutionFields({
        applyAdjustment: true,
      }).ok
    ).toBe(false);
    const copy = productEditorInventoryAlignmentCopy();
    expect(copy.body.toLowerCase()).toContain("adjustment");
    expect(copy.eyebrow.toLowerCase()).toContain("seed");
  });
});
