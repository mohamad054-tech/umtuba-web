import { describe, expect, it } from "vitest";
import {
  aggregateSellerInventoryQuantitySnapshots,
  deriveSellerInventoryAvailableQuantity,
  formatSellerInventoryQuantitySummary,
  indexSellerInventoryQuantityByProductId,
  resolveSellerInventoryQuantityFromRow,
  resolveSellerInventoryQuantitySnapshot,
  validateSellerInventoryQuantitySeed,
  SELLER_INVENTORY_QUANTITY_FOUNDATION_ID,
} from "./sellerInventoryQuantityFoundation";
import type { SellerInventoryRow } from "./sellerInventoryQueries";
import { availableUnits } from "./inventory";

function row(
  overrides: Partial<SellerInventoryRow> &
    Pick<SellerInventoryRow, "productId" | "variantId">
): SellerInventoryRow {
  return {
    productTitle: "P",
    productSlug: "p",
    productStatus: "draft",
    productType: "physical",
    variantTitle: "Default",
    sku: "SKU",
    variantStatus: "active",
    warehouseKey: "default",
    inventoryId: "inv-1",
    onHand: 10,
    reserved: 2,
    safetyStock: 1,
    allowBackorder: false,
    availableToSell: 7,
    inventoryUpdatedAt: null,
    missingInventory: false,
    availabilityMode: "finite",
    ...overrides,
  };
}

describe("Seller Inventory Quantity Foundation V1", () => {
  it("exposes capability id and reuses availableUnits formula", () => {
    expect(SELLER_INVENTORY_QUANTITY_FOUNDATION_ID).toBe(
      "commerce.inventory.seller_inventory_quantity_foundation_v1"
    );
    expect(
      deriveSellerInventoryAvailableQuantity({
        onHand: 10,
        reserved: 3,
        safetyStock: 2,
      })
    ).toBe(availableUnits({ onHand: 10, reserved: 3, safetyStock: 2 }));
  });

  it("fail-closes available quantity for null/invalid/legacy inputs", () => {
    expect(
      deriveSellerInventoryAvailableQuantity({
        onHand: null,
        reserved: 0,
        safetyStock: 0,
      })
    ).toBeNull();
    expect(
      deriveSellerInventoryAvailableQuantity({
        onHand: 2,
        reserved: 3,
        safetyStock: 0,
      })
    ).toBeNull();
    expect(
      deriveSellerInventoryAvailableQuantity({
        onHand: 1.5,
        reserved: 0,
        safetyStock: 0,
      })
    ).toBeNull();
  });

  it("resolves finite, unlimited digital, and missing inventory snapshots", () => {
    expect(
      resolveSellerInventoryQuantitySnapshot({
        productType: "physical",
        onHand: 8,
        reserved: 2,
        safetyStock: 1,
      })
    ).toEqual({
      tracking: "finite",
      onHand: 8,
      reserved: 2,
      safetyStock: 1,
      available: 5,
    });

    expect(
      resolveSellerInventoryQuantitySnapshot({
        productType: "digital",
        onHand: 0,
        reserved: 0,
        safetyStock: 0,
      })
    ).toEqual({
      tracking: "unlimited",
      onHand: null,
      reserved: null,
      safetyStock: null,
      available: null,
    });

    expect(
      resolveSellerInventoryQuantitySnapshot({
        productType: "physical",
        missingInventory: true,
      }).tracking
    ).toBe("unavailable");
  });

  it("validates seller quantity seed without accepting reserved mutation", () => {
    const ok = validateSellerInventoryQuantitySeed({
      onHand: 5,
      reserved: 99,
      safetyStock: 1,
      allowBackorder: true,
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.reserved).toBe(0);
      expect(ok.available).toBe(4);
      expect(ok.allowBackorder).toBe(true);
    }
    expect(validateSellerInventoryQuantitySeed({ onHand: -1 }).ok).toBe(false);
  });

  it("aggregates multi-variant quantities and indexes by product", () => {
    const map = indexSellerInventoryQuantityByProductId([
      row({
        productId: "p1",
        variantId: "v1",
        onHand: 5,
        reserved: 1,
        safetyStock: 0,
        availableToSell: 4,
      }),
      row({
        productId: "p1",
        variantId: "v2",
        onHand: 3,
        reserved: 0,
        safetyStock: 1,
        availableToSell: 2,
      }),
      row({
        productId: "p2",
        variantId: "v3",
        productType: "digital",
        availabilityMode: "unlimited",
        onHand: null,
        reserved: null,
        safetyStock: null,
        availableToSell: null,
      }),
    ]);
    expect(map.get("p1")).toEqual({
      tracking: "finite",
      onHand: 8,
      reserved: 1,
      safetyStock: 1,
      available: 6,
    });
    expect(map.get("p2")?.tracking).toBe("unlimited");
    expect(
      formatSellerInventoryQuantitySummary(map.get("p1")!)
    ).toContain("Available 6");
  });

  it("keeps unknown aggregate when only incomplete rows exist", () => {
    expect(
      aggregateSellerInventoryQuantitySnapshots([
        resolveSellerInventoryQuantityFromRow(
          row({
            productId: "p",
            variantId: "v",
            onHand: null,
            reserved: null,
            safetyStock: null,
            availableToSell: null,
          })
        ),
      ]).tracking
    ).toBe("unknown");
  });
});
