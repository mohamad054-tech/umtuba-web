import { describe, expect, it } from "vitest";
import {
  assessReservedCounterConsistency,
  formatSellerReservationPressureSummary,
  indexBlockingReservationQuantityByVariantId,
  isBlockingReservationStatus,
  isTerminalReservationStatus,
  mapSellerInventoryReservationHold,
  parseSellerInventoryReservationStatus,
  rejectClientReservationMutationFields,
  sellerInventoryReservationFoundationScope,
  sumBlockingReservationQuantity,
  SELLER_INVENTORY_RESERVATION_FOUNDATION_ID,
} from "./sellerInventoryReservationFoundation";
import { deriveReservationAttention } from "./sellerInventoryPresentation";
import type { SellerReservationRow } from "./sellerInventoryQueries";

function hold(
  overrides: Partial<SellerReservationRow> & { id: string }
): SellerReservationRow {
  return {
    productId: "p1",
    variantId: "v1",
    orderId: "o1",
    warehouseKey: "default",
    quantity: 2,
    status: "active",
    expiresAt: "2099-01-01T00:00:00.000Z",
    releaseReason: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    releasedAt: null,
    consumedAt: null,
    ...overrides,
  };
}

describe("Seller Inventory Reservation Foundation V1", () => {
  it("exposes capability and read-only scope", () => {
    expect(SELLER_INVENTORY_RESERVATION_FOUNDATION_ID).toBe(
      "commerce.inventory.seller_inventory_reservation_foundation_v1"
    );
    const scope = sellerInventoryReservationFoundationScope();
    expect(scope.ownsCheckoutReserveRuntime).toBe(false);
    expect(scope.ownsExpireScheduler).toBe(false);
    expect(scope.readsHoldLedger).toBe(true);
  });

  it("parses statuses fail-closed and classifies blocking vs terminal", () => {
    expect(parseSellerInventoryReservationStatus("active")).toEqual({
      ok: true,
      value: "active",
    });
    expect(parseSellerInventoryReservationStatus("bogus").ok).toBe(false);
    expect(parseSellerInventoryReservationStatus(null).ok).toBe(false);
    expect(isBlockingReservationStatus("active")).toBe(true);
    expect(isBlockingReservationStatus("pending_capture")).toBe(true);
    expect(isBlockingReservationStatus("released")).toBe(false);
    expect(isTerminalReservationStatus("consumed")).toBe(true);
  });

  it("rejects client reservation mutation fields", () => {
    expect(rejectClientReservationMutationFields({ title: "ok" }).ok).toBe(
      true
    );
    expect(
      rejectClientReservationMutationFields({ reserved: 3 }).ok
    ).toBe(false);
    expect(
      rejectClientReservationMutationFields({ reservationId: "x" }).ok
    ).toBe(false);
  });

  it("maps holds, detects stuck, and sums blocking pressure", () => {
    const active = mapSellerInventoryReservationHold(hold({ id: "h1" }));
    expect(active.state).toBe("blocking");
    expect(active.blocksSellable).toBe(true);

    const stuck = mapSellerInventoryReservationHold(
      hold({
        id: "h2",
        expiresAt: "2020-01-01T00:00:00.000Z",
      })
    );
    expect(stuck.stuck).toBe(true);
    expect(stuck.state).toBe("stuck");

    const released = mapSellerInventoryReservationHold(
      hold({ id: "h3", status: "released", quantity: 5 })
    );
    expect(released.state).toBe("terminal");
    expect(released.blocksSellable).toBe(false);

    expect(
      sumBlockingReservationQuantity([
        hold({ id: "a", quantity: 2 }),
        hold({ id: "b", quantity: 3, status: "pending_capture" }),
        hold({ id: "c", quantity: 9, status: "released" }),
      ])
    ).toBe(5);
  });

  it("assesses reserved counter vs hold pressure without inventing repairs", () => {
    const aligned = assessReservedCounterConsistency({
      reservedCounter: 5,
      holdRows: [
        hold({ id: "a", quantity: 2 }),
        hold({ id: "b", quantity: 3 }),
      ],
    });
    expect(aligned.aligned).toBe(true);
    expect(aligned.delta).toBe(0);

    const drift = assessReservedCounterConsistency({
      reservedCounter: 4,
      holdRows: [hold({ id: "a", quantity: 2 })],
    });
    expect(drift.aligned).toBe(false);
    expect(drift.delta).toBe(2);

    expect(
      formatSellerReservationPressureSummary({
        reservedCounter: 4,
        blockingHoldQuantity: 2,
      })
    ).toContain("Active holds 2");
  });

  it("indexes blocking pressure by variant and keeps presentation attention wired", () => {
    const byVariant = indexBlockingReservationQuantityByVariantId([
      hold({ id: "a", variantId: "v1", quantity: 2 }),
      hold({ id: "b", variantId: "v1", quantity: 1 }),
      hold({ id: "c", variantId: "v2", quantity: 4, status: "expired" }),
    ]);
    expect(byVariant.get("v1")).toBe(3);
    expect(byVariant.get("v2")).toBeUndefined();

    expect(
      deriveReservationAttention(
        hold({ id: "s", expiresAt: "2020-01-01T00:00:00.000Z" })
      ).level
    ).toBe("critical");
  });
});
