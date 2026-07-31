import { describe, expect, it } from "vitest";
import {
  PRODUCT_PRODUCTION_READINESS_AUDIT_ID,
  evaluateProductProductionReadiness,
  rejectClientProductionReadinessFields,
  type ProductProductionReadinessFacts,
} from "./productProductionReadinessAudit";
import { buildStoreDigitalProductAssetPath } from "./mediaConstants";

const STORE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PRODUCT = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CATEGORY = "c47a1000-0001-4000-8000-000000000001";
const LISTING = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const LISTING2 = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const OTHER_STORE = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

function digitalPath(): string {
  return buildStoreDigitalProductAssetPath(
    STORE,
    PRODUCT,
    "11111111-1111-4111-8111-111111111111",
    "pdf"
  );
}

function readyDigital(
  overrides: Partial<ProductProductionReadinessFacts> = {}
): ProductProductionReadinessFacts {
  return {
    productId: PRODUCT,
    storeId: STORE,
    productStoreId: STORE,
    storeStatus: "active",
    storeVerificationStatus: "verified",
    productType: "digital",
    productStatus: "active",
    moderationStatus: "approved",
    marketplaceEligible: false,
    primaryCategoryId: CATEGORY,
    categoryFound: true,
    categoryStatus: "active",
    priceAmountMinor: 2500,
    priceCurrency: "USD",
    variantStatus: "active",
    inventory: null,
    digitalAsset: {
      storeId: STORE,
      productId: PRODUCT,
      status: "active",
      storagePath: digitalPath(),
    },
    commerceConfirmEnabled: false,
    commerceConfirmEnv: {},
    ...overrides,
  };
}

function readyPhysical(
  overrides: Partial<ProductProductionReadinessFacts> = {}
): ProductProductionReadinessFacts {
  return readyDigital({
    productType: "physical",
    digitalAsset: null,
    inventory: {
      onHand: 10,
      reserved: 1,
      safetyStock: 2,
      allowBackorder: false,
    },
    commerceConfirmEnabled: true,
    ...overrides,
  });
}

describe("productProductionReadinessAudit", () => {
  it("exposes approved capability id", () => {
    expect(PRODUCT_PRODUCTION_READINESS_AUDIT_ID).toBe(
      "commerce.product.production_readiness_audit_v1"
    );
  });

  it("READY — verified digital product with category, price, asset", () => {
    const result = evaluateProductProductionReadiness(readyDigital());
    expect(result.verdict).toBe("READY");
    expect(result.blockers).toEqual([]);
    expect(result.checks.publishReadinessOk).toBe(true);
    expect(result.checks.inventoryOk).toBe(true);
    expect(result.checks.settlementCompatible).toBe(true);
    expect(result.checks.payoutCompatible).toBe(true);
    expect(result.checks.commissionCompatible).toBe(true);
  });

  it("NOT_READY — missing category", () => {
    const result = evaluateProductProductionReadiness(
      readyDigital({ primaryCategoryId: null })
    );
    expect(result.verdict).toBe("NOT_READY");
    expect(result.blockers.some((b) => b.code === "invalid_category")).toBe(
      true
    );
  });

  it("NOT_READY — inactive category", () => {
    const result = evaluateProductProductionReadiness(
      readyDigital({ categoryStatus: "inactive" })
    );
    expect(result.verdict).toBe("NOT_READY");
    expect(result.blockers.some((b) => b.code === "inactive_category")).toBe(
      true
    );
  });

  it("NOT_READY — missing finite inventory", () => {
    const result = evaluateProductProductionReadiness(
      readyPhysical({
        inventory: null,
        commerceConfirmEnabled: true,
      })
    );
    expect(result.verdict).toBe("NOT_READY");
    expect(result.blockers.some((b) => b.code === "invalid_inventory")).toBe(
      true
    );
  });

  it("NOT_READY — missing digital asset", () => {
    const result = evaluateProductProductionReadiness(
      readyDigital({ digitalAsset: null })
    );
    expect(result.verdict).toBe("NOT_READY");
    expect(
      result.blockers.some((b) => b.code === "digital_asset_not_ready")
    ).toBe(true);
  });

  it("NOT_READY — failed moderation", () => {
    const result = evaluateProductProductionReadiness(
      readyDigital({ moderationStatus: "pending" })
    );
    expect(result.verdict).toBe("NOT_READY");
    expect(result.blockers.some((b) => b.code === "failed_moderation")).toBe(
      true
    );
  });

  it("NOT_READY — invalid listing / supplier mismatch", () => {
    const result = evaluateProductProductionReadiness(
      readyDigital({
        marketplaceEligible: true,
        marketplaceSupplierEnabled: true,
        supplierStoreId: STORE,
        supplierStoreStatus: "active",
        supplierVerificationStatus: "verified",
        sellerStoreId: OTHER_STORE,
        sellerStoreStatus: "active",
        sellerVerificationStatus: "verified",
        listing: {
          id: LISTING,
          status: "hidden",
          sellerStoreId: OTHER_STORE,
          sourceProductId: PRODUCT,
          supplierStoreId: OTHER_STORE,
        },
      })
    );
    expect(result.verdict).toBe("NOT_READY");
    expect(result.blockers.some((b) => b.code === "invalid_listing")).toBe(
      true
    );
    expect(result.blockers.some((b) => b.code === "supplier_integrity")).toBe(
      true
    );
  });

  it("NOT_READY — duplicate listing", () => {
    const result = evaluateProductProductionReadiness(
      readyDigital({
        listing: {
          id: LISTING,
          status: "active",
          sellerStoreId: OTHER_STORE,
          sourceProductId: PRODUCT,
          supplierStoreId: STORE,
        },
        marketplaceEligible: true,
        marketplaceSupplierEnabled: true,
        supplierStoreId: STORE,
        supplierStoreStatus: "active",
        supplierVerificationStatus: "verified",
        sellerStoreId: OTHER_STORE,
        sellerStoreStatus: "active",
        sellerVerificationStatus: "verified",
        duplicateActiveListingId: LISTING2,
      })
    );
    expect(result.verdict).toBe("NOT_READY");
    expect(result.blockers.some((b) => b.code === "duplicate_listing")).toBe(
      true
    );
  });

  it("NOT_READY — invalid pricing", () => {
    const result = evaluateProductProductionReadiness(
      readyDigital({ priceAmountMinor: null, priceCurrency: null })
    );
    expect(result.verdict).toBe("NOT_READY");
    expect(result.blockers.some((b) => b.code === "invalid_pricing")).toBe(
      true
    );
  });

  it("NOT_READY — physical gate OFF", () => {
    const result = evaluateProductProductionReadiness(
      readyPhysical({ commerceConfirmEnabled: false })
    );
    expect(result.verdict).toBe("NOT_READY");
    expect(result.blockers.some((b) => b.code === "physical_gate")).toBe(true);
  });

  it("READY — physical when confirm ON and inventory valid", () => {
    const result = evaluateProductProductionReadiness(readyPhysical());
    expect(result.verdict).toBe("READY");
    expect(result.checks.physicalGateOk).toBe(true);
  });

  it("rejects client readiness fields", () => {
    expect(
      rejectClientProductionReadinessFields({ productId: PRODUCT }).ok
    ).toBe(true);
    expect(rejectClientProductionReadinessFields({ verdict: "READY" }).ok).toBe(
      false
    );
    expect(
      rejectClientProductionReadinessFields({ commerce_confirm: true }).ok
    ).toBe(false);
  });

  it("regression — ownership and unverified seller fail closed", () => {
    expect(
      evaluateProductProductionReadiness(
        readyDigital({ productStoreId: OTHER_STORE })
      ).blockers.some((b) => b.code === "ownership_mismatch")
    ).toBe(true);
    expect(
      evaluateProductProductionReadiness(
        readyDigital({ storeVerificationStatus: "pending" })
      ).blockers.some((b) => b.code === "seller_unverified")
    ).toBe(true);
  });

  it("blockers are ordered and deterministic", () => {
    const a = evaluateProductProductionReadiness(
      readyDigital({
        primaryCategoryId: null,
        priceAmountMinor: null,
        digitalAsset: null,
      })
    );
    const b = evaluateProductProductionReadiness(
      readyDigital({
        primaryCategoryId: null,
        priceAmountMinor: null,
        digitalAsset: null,
      })
    );
    expect(a.blockers.map((x) => x.code)).toEqual(
      b.blockers.map((x) => x.code)
    );
    expect(a.blockers.length).toBeGreaterThan(1);
  });
});
