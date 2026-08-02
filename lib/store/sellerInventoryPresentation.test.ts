import { describe, expect, it } from "vitest";
import {
  deriveAvailableToSell,
  deriveInventoryAvailabilityState,
  deriveReservationAttention,
  deriveSellerInventoryAttention,
  filterSellerInventoryRows,
  productEditorInventoryAlignmentCopy,
  quantityDisplay,
  sellerOrderRefLabel,
} from "./sellerInventoryPresentation";
import type { SellerInventoryRow } from "./sellerInventoryQueries";

function row(
  overrides: Partial<SellerInventoryRow> = {}
): SellerInventoryRow {
  return {
    productId: "p1",
    productTitle: "Lamp",
    productSlug: "lamp",
    productStatus: "active",
    productType: "physical",
    variantId: "v1",
    variantTitle: "Default",
    sku: "SKU-1",
    variantStatus: "active",
    warehouseKey: "default",
    inventoryId: "i1",
    onHand: 10,
    reserved: 2,
    safetyStock: 3,
    allowBackorder: false,
    availableToSell: 5,
    inventoryUpdatedAt: "2026-07-28T00:00:00Z",
    missingInventory: false,
    availabilityMode: "finite",
    ...overrides,
  };
}

describe("sellerInventoryPresentation — quantity separation", () => {
  it("derives available-to-sell from trusted formula and never treats null as zero", () => {
    expect(
      deriveAvailableToSell({ onHand: 10, reserved: 2, safetyStock: 3 })
    ).toBe(5);
    expect(
      deriveAvailableToSell({ onHand: null, reserved: 0, safetyStock: 0 })
    ).toBeNull();
    expect(quantityDisplay(null)).toBe("—");
    expect(quantityDisplay(0)).toBe("0");
  });

  it("separates out-of-stock, low-stock, fully reserved, and missing", () => {
    expect(
      deriveInventoryAvailabilityState(
        row({ onHand: 5, reserved: 5, safetyStock: 0, availableToSell: 0 })
      )
    ).toBe("fully_reserved");
    expect(
      deriveInventoryAvailabilityState(
        row({ onHand: 5, reserved: 2, safetyStock: 3, availableToSell: 0 })
      )
    ).toBe("out_of_stock");
    expect(
      deriveInventoryAvailabilityState(
        row({ onHand: 10, reserved: 2, safetyStock: 5, availableToSell: 3 })
      )
    ).toBe("low_stock");
    expect(
      deriveInventoryAvailabilityState(row({ missingInventory: true }))
    ).toBe("missing");
    expect(
      deriveInventoryAvailabilityState(
        row({ onHand: null, reserved: null, safetyStock: null, availableToSell: null })
      )
    ).toBe("unknown");
  });

  it("treats unlimited digital/service rows as unlimited without missing-inventory pressure", () => {
    expect(
      deriveInventoryAvailabilityState(
        row({
          productType: "digital",
          availabilityMode: "unlimited",
          missingInventory: false,
          onHand: null,
          reserved: null,
          safetyStock: null,
          availableToSell: null,
          allowBackorder: true,
        })
      )
    ).toBe("unlimited");
    expect(
      deriveSellerInventoryAttention(
        row({
          productType: "digital",
          availabilityMode: "unlimited",
          availableToSell: null,
        })
      ).level
    ).toBe("none");
  });

  it("does not invent low-stock when safety stock is zero", () => {
    expect(
      deriveInventoryAvailabilityState(
        row({ onHand: 2, reserved: 0, safetyStock: 0, availableToSell: 2 })
      )
    ).toBe("available");
  });
});

describe("sellerInventoryPresentation — attention and filters", () => {
  it("flags missing and fully reserved as critical attention", () => {
    expect(
      deriveSellerInventoryAttention(row({ missingInventory: true })).level
    ).toBe("critical");
    expect(
      deriveSellerInventoryAttention(
        row({ onHand: 4, reserved: 4, safetyStock: 0, availableToSell: 0 })
      ).level
    ).toBe("critical");
  });

  it("filters attention and reserved buckets", () => {
    const rows = [
      row({ variantId: "a", reserved: 0, availableToSell: 8, safetyStock: 0 }),
      row({
        variantId: "b",
        productTitle: "Vase",
        sku: "VZ",
        onHand: 3,
        reserved: 3,
        safetyStock: 0,
        availableToSell: 0,
      }),
    ];
    expect(
      filterSellerInventoryRows(rows, { bucket: "reserved" }).map((r) => r.variantId)
    ).toEqual(["b"]);
    expect(
      filterSellerInventoryRows(rows, { query: "vase" }).map((r) => r.variantId)
    ).toEqual(["b"]);
  });
});

describe("sellerInventoryPresentation — reservations and editor alignment", () => {
  it("marks stuck active holds and privacy-safe order refs", () => {
    const attention = deriveReservationAttention({
      id: "r1",
      productId: "p1",
      variantId: "v1",
      orderId: "11111111-2222-3333-4444-555555555555",
      warehouseKey: "default",
      quantity: 2,
      status: "active",
      expiresAt: "2020-01-01T00:00:00.000Z",
      releaseReason: null,
      createdAt: "2020-01-01T00:00:00.000Z",
      updatedAt: "2020-01-01T00:00:00.000Z",
      releasedAt: null,
      consumedAt: null,
    });
    expect(attention.stuck).toBe(true);
    expect(attention.level).toBe("critical");
    expect(sellerOrderRefLabel("11111111-2222-3333-4444-555555555555")).toBe(
      "Order 11111111…"
    );
    expect(sellerOrderRefLabel(null)).toBeNull();
  });

  it("keeps product-editor stock labeled as catalog seed not ledger", () => {
    const copy = productEditorInventoryAlignmentCopy();
    expect(copy.body.toLowerCase()).toContain("not warehouse movements");
    expect(copy.body.toLowerCase()).toContain("adjustment ledger entries");
    expect(copy.body.toLowerCase()).toContain("movement ledger");
    expect(copy.body.toLowerCase()).toContain("contract-only");
    expect(copy.reservedNote.toLowerCase()).toContain("system-managed");
  });
});
