import { describe, expect, it } from "vitest";
import {
  aggregateSellerCatalogAvailabilityStatuses,
  deriveSellerCatalogAvailabilityDisplay,
  deriveSellerCatalogAvailabilityFromInventoryRow,
  indexSellerCatalogAvailabilityByProductId,
  mapTrustedAvailabilityToCatalogStatus,
  parseSellerCatalogAvailabilityStatus,
  sellerCatalogAvailabilityLabel,
  SELLER_CATALOG_AVAILABILITY_DEFERRED_STATUSES,
} from "./sellerCatalogAvailability";
import { resolveTrustedInventoryAvailability } from "./sellerInventoryAvailabilityFoundation";
import { deriveInventoryAvailabilityState } from "./sellerInventoryPresentation";
import type { SellerInventoryRow } from "./sellerInventoryQueries";

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
    onHand: 5,
    reserved: 0,
    safetyStock: 0,
    allowBackorder: false,
    availableToSell: 5,
    inventoryUpdatedAt: null,
    missingInventory: false,
    availabilityMode: "finite",
    ...overrides,
  };
}

describe("Seller Catalog Availability Foundation V1", () => {
  it("parses known statuses fail-closed and rejects preorder/unknown", () => {
    expect(parseSellerCatalogAvailabilityStatus("in_stock")).toEqual({
      ok: true,
      value: "in_stock",
    });
    expect(parseSellerCatalogAvailabilityStatus("OUT OF STOCK").ok).toBe(true);
    expect(parseSellerCatalogAvailabilityStatus("preorder").ok).toBe(false);
    expect(parseSellerCatalogAvailabilityStatus("bogus").ok).toBe(false);
    expect(parseSellerCatalogAvailabilityStatus(null).ok).toBe(false);
    expect(SELLER_CATALOG_AVAILABILITY_DEFERRED_STATUSES).toContain("preorder");
  });

  it("derives display from inventory seed without silent in_stock for null", () => {
    expect(
      deriveSellerCatalogAvailabilityDisplay({
        productType: "physical",
        inventory: null,
      })
    ).toBe("unavailable");

    expect(
      deriveSellerCatalogAvailabilityDisplay({
        productType: "digital",
        inventory: null,
      })
    ).toBe("unlimited");

    expect(
      deriveSellerCatalogAvailabilityDisplay({
        productType: "physical",
        inventory: {
          onHand: 4,
          reserved: 1,
          safetyStock: 1,
          allowBackorder: false,
        },
      })
    ).toBe("in_stock");

    expect(
      deriveSellerCatalogAvailabilityDisplay({
        productType: "physical",
        inventory: {
          onHand: 1,
          reserved: 1,
          safetyStock: 0,
          allowBackorder: true,
        },
      })
    ).toBe("backorder");

    expect(
      deriveSellerCatalogAvailabilityDisplay({
        productType: "physical",
        inventory: {
          onHand: 0,
          reserved: 0,
          safetyStock: 0,
          allowBackorder: false,
        },
      })
    ).toBe("out_of_stock");
  });

  it("maps trusted storefront resolver codes to catalog statuses", () => {
    const inStock = resolveTrustedInventoryAvailability({
      productType: "physical",
      productStatus: "active",
      variantStatus: "active",
      inventory: {
        onHand: 3,
        reserved: 0,
        safetyStock: 0,
        allowBackorder: false,
      },
    });
    expect(mapTrustedAvailabilityToCatalogStatus(inStock)).toBe("in_stock");

    const digital = resolveTrustedInventoryAvailability({
      productType: "digital",
      productStatus: "active",
      variantStatus: "active",
      inventory: null,
    });
    expect(mapTrustedAvailabilityToCatalogStatus(digital)).toBe("unlimited");
    expect(sellerCatalogAvailabilityLabel("unlimited")).toBe("Unlimited");
  });

  it("aggregates multi-variant rows fail-closed and indexes by product", () => {
    expect(
      aggregateSellerCatalogAvailabilityStatuses([
        "in_stock",
        "out_of_stock",
        "backorder",
      ])
    ).toBe("out_of_stock");

    const map = indexSellerCatalogAvailabilityByProductId([
      row({
        productId: "p1",
        variantId: "v1",
        availableToSell: 2,
        onHand: 2,
      }),
      row({
        productId: "p1",
        variantId: "v2",
        onHand: 0,
        reserved: 0,
        safetyStock: 0,
        availableToSell: 0,
        allowBackorder: false,
      }),
      row({
        productId: "p2",
        variantId: "v3",
        productType: "digital",
        availabilityMode: "unlimited",
        missingInventory: true,
        onHand: null,
        reserved: null,
        safetyStock: null,
        allowBackorder: null,
        availableToSell: null,
      }),
    ]);
    expect(map.get("p1")).toBe("out_of_stock");
    expect(map.get("p2")).toBe("unlimited");
  });

  it("treats backorder as distinct from out_of_stock in inventory presentation", () => {
    expect(
      deriveInventoryAvailabilityState(
        row({
          productId: "p",
          variantId: "v",
          onHand: 0,
          reserved: 0,
          safetyStock: 0,
          availableToSell: 0,
          allowBackorder: true,
        })
      )
    ).toBe("backorder");

    expect(
      deriveSellerCatalogAvailabilityFromInventoryRow(
        row({
          productId: "p",
          variantId: "v",
          onHand: 0,
          reserved: 0,
          safetyStock: 0,
          availableToSell: 0,
          allowBackorder: true,
        })
      )
    ).toBe("backorder");
  });

  it("legacy unknown when quantity fields are incomplete", () => {
    expect(
      deriveSellerCatalogAvailabilityFromInventoryRow(
        row({
          productId: "p",
          variantId: "v",
          onHand: null,
          reserved: 0,
          safetyStock: 0,
          allowBackorder: false,
          availableToSell: null,
          missingInventory: false,
        })
      )
    ).toBe("unknown");
  });
});
