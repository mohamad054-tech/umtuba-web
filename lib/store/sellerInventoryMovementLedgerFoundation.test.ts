import { describe, expect, it } from "vitest";
import {
  formatSellerInventoryMovementProjectionSummary,
  listSellerInventoryMovementTypeOptions,
  mapReservationStatusTransitionToMovementType,
  movementTypeForAdjustmentReason,
  normalizeSellerInventoryMovementReadRow,
  parseSellerInventoryMovementType,
  rejectClientInventoryMovementLedgerExecutionFields,
  sellerInventoryMovementLedgerFoundationScope,
  validateSellerInventoryMovementIntent,
  SELLER_INVENTORY_MOVEMENT_LEDGER_FOUNDATION_ID,
  SELLER_INVENTORY_MOVEMENT_TYPES,
} from "./sellerInventoryMovementLedgerFoundation";
import { productEditorInventoryAlignmentCopy } from "./sellerInventoryPresentation";

describe("Seller Inventory Movement Ledger Foundation V1", () => {
  it("exposes capability, contract types, and deferred append scope", () => {
    expect(SELLER_INVENTORY_MOVEMENT_LEDGER_FOUNDATION_ID).toBe(
      "commerce.inventory.seller_inventory_movement_ledger_foundation_v1"
    );
    expect(SELLER_INVENTORY_MOVEMENT_TYPES).toEqual([
      "reservation_created",
      "reservation_released",
      "reservation_consumed",
      "inventory_adjustment",
      "purchase_decrement",
      "return_increment",
    ]);
    const scope = sellerInventoryMovementLedgerFoundationScope();
    expect(scope.ownsAppendRuntime).toBe(false);
    expect(scope.ownsPersistence).toBe(false);
    expect(scope.ownsPurchaseDecrementRuntime).toBe(false);
    expect(scope.reservationEventsAreHoldAuditOnly).toBe(true);
    expect(scope.catalogSeedIsNotMovementLedger).toBe(true);
    expect(listSellerInventoryMovementTypeOptions()).toHaveLength(6);
  });

  it("parses movement types fail-closed and maps reservation/adjustment boundaries", () => {
    expect(parseSellerInventoryMovementType("purchase decrement")).toEqual({
      ok: true,
      value: "purchase_decrement",
    });
    expect(parseSellerInventoryMovementType("unknown").ok).toBe(false);
    expect(
      mapReservationStatusTransitionToMovementType({ toStatus: "active" })
    ).toEqual({ ok: true, value: "reservation_created" });
    expect(
      mapReservationStatusTransitionToMovementType({ toStatus: "released" })
    ).toEqual({ ok: true, value: "reservation_released" });
    expect(
      mapReservationStatusTransitionToMovementType({ toStatus: "consumed" })
    ).toEqual({ ok: true, value: "reservation_consumed" });
    expect(
      mapReservationStatusTransitionToMovementType({ toStatus: "expired" })
    ).toEqual({ ok: true, value: "reservation_released" });
    expect(movementTypeForAdjustmentReason("correction")).toEqual({
      ok: true,
      value: "inventory_adjustment",
    });
    expect(movementTypeForAdjustmentReason("nope").ok).toBe(false);
  });

  it("validates movement intents against finite snapshots without recording", () => {
    const hold = validateSellerInventoryMovementIntent({
      type: "reservation_created",
      deltaOnHand: 0,
      deltaReserved: 2,
      note: "  checkout hold  ",
      current: {
        tracking: "finite",
        onHand: 10,
        reserved: 1,
        safetyStock: 1,
      },
    });
    expect(hold.ok).toBe(true);
    if (!hold.ok) return;
    expect(hold.projection.recorded).toBe(false);
    expect(hold.projection.after.reserved).toBe(3);
    expect(hold.projection.after.available).toBe(6);
    expect(hold.intent.note).toBe("checkout hold");

    const adjust = validateSellerInventoryMovementIntent({
      type: "inventory_adjustment",
      deltaOnHand: -2,
      deltaReserved: 0,
      current: {
        tracking: "finite",
        onHand: 10,
        reserved: 3,
        safetyStock: 1,
      },
    });
    expect(adjust.ok).toBe(true);
    if (!adjust.ok) return;
    expect(adjust.projection.after.onHand).toBe(8);
    expect(adjust.projection.after.reserved).toBe(3);
    expect(
      formatSellerInventoryMovementProjectionSummary(adjust.projection)
    ).toContain("10 → 8");
  });

  it("rejects illegal shapes, reserved breaches, and unlimited tracking", () => {
    expect(
      validateSellerInventoryMovementIntent({
        type: "reservation_created",
        deltaOnHand: -1,
        deltaReserved: 1,
        current: {
          tracking: "finite",
          onHand: 10,
          reserved: 0,
          safetyStock: 0,
        },
      }).ok
    ).toBe(false);

    expect(
      validateSellerInventoryMovementIntent({
        type: "purchase_decrement",
        deltaOnHand: -5,
        deltaReserved: 0,
        current: {
          tracking: "finite",
          onHand: 4,
          reserved: 0,
          safetyStock: 0,
        },
      }).ok
    ).toBe(false);

    expect(
      validateSellerInventoryMovementIntent({
        type: "return_increment",
        deltaOnHand: 1,
        deltaReserved: 0,
        current: {
          tracking: "unlimited",
          onHand: null,
          reserved: null,
          safetyStock: null,
        },
      }).ok
    ).toBe(false);
  });

  it("normalizes read rows, rejects client ledger writes, and keeps seed copy distinct", () => {
    const row = normalizeSellerInventoryMovementReadRow({
      type: "return_increment",
      deltaOnHand: 3,
      deltaReserved: 0,
      source: "contract",
    });
    expect(row.ok).toBe(true);
    if (!row.ok) return;
    expect(row.row.recorded).toBe(false);
    expect(row.row.source).toBe("contract");

    expect(
      rejectClientInventoryMovementLedgerExecutionFields({ note: "ok" }).ok
    ).toBe(true);
    expect(
      rejectClientInventoryMovementLedgerExecutionFields({
        appendMovement: true,
      }).ok
    ).toBe(false);

    const copy = productEditorInventoryAlignmentCopy();
    expect(copy.body.toLowerCase()).toContain("movement ledger");
    expect(copy.eyebrow.toLowerCase()).toContain("seed");
  });
});
