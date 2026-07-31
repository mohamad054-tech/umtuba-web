import { describe, expect, it } from "vitest";
import {
  FINITE_INVENTORY_PRODUCT_TYPES,
  SELLER_INVENTORY_AVAILABILITY_FOUNDATION_ID,
  UNLIMITED_INVENTORY_PRODUCT_TYPES,
  assertQuantityAgainstAvailability,
  inventoryAvailabilityDoesNotReplacePublishReadiness,
  isFiniteInventoryProductType,
  isUnlimitedInventoryProductType,
  isUuid,
  rejectClientInventoryStockFields,
  resolveTrustedInventoryAvailability,
} from "./sellerInventoryAvailabilityFoundation";

const ACTIVE = {
  productStatus: "active",
  variantStatus: "active",
} as const;

describe("sellerInventoryAvailabilityFoundation", () => {
  it("exposes the approved capability id", () => {
    expect(SELLER_INVENTORY_AVAILABILITY_FOUNDATION_ID).toBe(
      "commerce.inventory.seller_inventory_availability_foundation_v1"
    );
  });

  it("classifies unlimited vs finite product types", () => {
    for (const t of UNLIMITED_INVENTORY_PRODUCT_TYPES) {
      expect(isUnlimitedInventoryProductType(t)).toBe(true);
      expect(isFiniteInventoryProductType(t)).toBe(false);
    }
    for (const t of FINITE_INVENTORY_PRODUCT_TYPES) {
      expect(isFiniteInventoryProductType(t)).toBe(true);
      expect(isUnlimitedInventoryProductType(t)).toBe(false);
    }
  });

  it("unlimited inventory — digital/service skip finite stock math", () => {
    const digital = resolveTrustedInventoryAvailability({
      productType: "digital",
      ...ACTIVE,
      inventory: null,
    });
    expect(digital.mode).toBe("unlimited");
    expect(digital.sellable).toBe(true);
    expect(digital.availableQuantity).toBeNull();
    expect(digital.skipFiniteStockCheck).toBe(true);
    expect(digital.physicalLaunchGated).toBe(false);
    expect(assertQuantityAgainstAvailability(digital, 99)).toEqual({ ok: true });

    const service = resolveTrustedInventoryAvailability({
      productType: "service",
      ...ACTIVE,
      inventory: {
        onHand: 0,
        reserved: 0,
        safetyStock: 0,
        allowBackorder: false,
      },
    });
    expect(service.mode).toBe("unlimited");
    expect(service.sellable).toBe(true);
  });

  it("finite inventory — in stock after reserved and safety stock", () => {
    const result = resolveTrustedInventoryAvailability({
      productType: "physical",
      ...ACTIVE,
      inventory: {
        onHand: 10,
        reserved: 2,
        safetyStock: 3,
        allowBackorder: false,
      },
    });
    expect(result.mode).toBe("finite");
    expect(result.availableQuantity).toBe(5);
    expect(result.sellable).toBe(true);
    expect(result.reasonCode).toBe("finite_in_stock");
    expect(result.physicalLaunchGated).toBe(true);
    expect(assertQuantityAgainstAvailability(result, 5)).toEqual({ ok: true });
    expect(assertQuantityAgainstAvailability(result, 6).ok).toBe(false);
  });

  it("zero inventory — out of stock fail closed without backorder", () => {
    const result = resolveTrustedInventoryAvailability({
      productType: "physical",
      ...ACTIVE,
      inventory: {
        onHand: 5,
        reserved: 2,
        safetyStock: 3,
        allowBackorder: false,
      },
    });
    expect(result.mode).toBe("unavailable");
    expect(result.availableQuantity).toBe(0);
    expect(result.sellable).toBe(false);
    expect(result.reasonCode).toBe("finite_out_of_stock");
    expect(assertQuantityAgainstAvailability(result, 1).ok).toBe(false);
  });

  it("zero inventory with backorder remains sellable under finite mode", () => {
    const result = resolveTrustedInventoryAvailability({
      productType: "booking",
      ...ACTIVE,
      inventory: {
        onHand: 0,
        reserved: 0,
        safetyStock: 0,
        allowBackorder: true,
      },
    });
    expect(result.mode).toBe("finite");
    expect(result.reasonCode).toBe("finite_backorder");
    expect(result.skipFiniteStockCheck).toBe(true);
    expect(assertQuantityAgainstAvailability(result, 2)).toEqual({ ok: true });
  });

  it("unavailable product — draft / inactive / missing inventory fail closed", () => {
    expect(
      resolveTrustedInventoryAvailability({
        productType: "physical",
        productStatus: "draft",
        variantStatus: "active",
        inventory: {
          onHand: 10,
          reserved: 0,
          safetyStock: 0,
          allowBackorder: false,
        },
      }).reasonCode
    ).toBe("product_unavailable");

    expect(
      resolveTrustedInventoryAvailability({
        productType: "physical",
        productStatus: "active",
        variantStatus: "archived",
        inventory: {
          onHand: 10,
          reserved: 0,
          safetyStock: 0,
          allowBackorder: false,
        },
      }).reasonCode
    ).toBe("variant_unavailable");

    expect(
      resolveTrustedInventoryAvailability({
        productType: "physical",
        ...ACTIVE,
        inventory: null,
      }).reasonCode
    ).toBe("missing_inventory");
  });

  it("publish readiness compatibility — availability does not replace digital/category gates", () => {
    const ortho = inventoryAvailabilityDoesNotReplacePublishReadiness();
    expect(ortho.replacesDigitalPublishReadiness).toBe(false);
    expect(ortho.replacesCategoryGate).toBe(false);
  });

  it("category compatibility — foundation is orthogonal to primary_category_id", () => {
    // Availability resolution never reads category fields; category gate stays elsewhere.
    const result = resolveTrustedInventoryAvailability({
      productType: "digital",
      ...ACTIVE,
      inventory: null,
    });
    expect(result.capability).toBe(SELLER_INVENTORY_AVAILABILITY_FOUNDATION_ID);
    expect(result.sellable).toBe(true);
  });

  it("digital compatibility — unlimited even when warehouse row is zero", () => {
    const result = resolveTrustedInventoryAvailability({
      productType: "digital",
      ...ACTIVE,
      inventory: {
        onHand: 0,
        reserved: 5,
        safetyStock: 0,
        allowBackorder: false,
      },
    });
    expect(result.mode).toBe("unlimited");
    expect(result.reservedQuantity).toBe(5);
    expect(result.sellable).toBe(true);
  });

  it("authorization — rejects client-supplied stock / availability fields", () => {
    expect(
      rejectClientInventoryStockFields({ variantId: "v1", quantity: 1 })
    ).toEqual({ ok: true });
    expect(rejectClientInventoryStockFields({ onHand: 99 }).ok).toBe(false);
    expect(rejectClientInventoryStockFields({ on_hand: 1 }).ok).toBe(false);
    expect(rejectClientInventoryStockFields({ available: 5 }).ok).toBe(false);
    expect(rejectClientInventoryStockFields({ allowBackorder: true }).ok).toBe(
      false
    );
    expect(rejectClientInventoryStockFields({ stock: 3 }).ok).toBe(false);
  });

  it("malformed identifiers and invalid product type fail closed", () => {
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("c47a1000-0001-4000-8000-000000000001")).toBe(true);

    const badType = resolveTrustedInventoryAvailability({
      productType: "not-a-type",
      ...ACTIVE,
      inventory: {
        onHand: 10,
        reserved: 0,
        safetyStock: 0,
        allowBackorder: false,
      },
    });
    expect(badType.mode).toBe("unavailable");
    expect(badType.reasonCode).toBe("invalid_product_type");
    expect(badType.sellable).toBe(false);

    expect(
      assertQuantityAgainstAvailability(
        resolveTrustedInventoryAvailability({
          productType: "digital",
          ...ACTIVE,
          inventory: null,
        }),
        0
      ).ok
    ).toBe(false);
    expect(
      assertQuantityAgainstAvailability(
        resolveTrustedInventoryAvailability({
          productType: "digital",
          ...ACTIVE,
          inventory: null,
        }),
        1.5
      ).ok
    ).toBe(false);
  });

  it("regression — reserved exceeds on-hand and non-integer stock fail closed", () => {
    expect(
      resolveTrustedInventoryAvailability({
        productType: "physical",
        ...ACTIVE,
        inventory: {
          onHand: 2,
          reserved: 5,
          safetyStock: 0,
          allowBackorder: false,
        },
      }).reasonCode
    ).toBe("inconsistent_inventory");

    expect(
      resolveTrustedInventoryAvailability({
        productType: "physical",
        ...ACTIVE,
        inventory: {
          onHand: 2.5 as unknown as number,
          reserved: 0,
          safetyStock: 0,
          allowBackorder: false,
        },
      }).reasonCode
    ).toBe("inconsistent_inventory");
  });
});
