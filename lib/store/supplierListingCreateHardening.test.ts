import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { COMMISSION_POLICY_FOUNDATION_ID } from "./commissionPolicyFoundation";
import {
  canCreateSupplierListing,
  evaluateSupplierListingCreate,
  isUuid,
  rejectClientListingCreateFields,
  supplierListingCreateCompatibility,
  SUPPLIER_LISTING_CREATE_HARDENING_ID,
  type SupplierListingCreateFacts,
} from "./supplierListingCreateHardening";
import { buildMarketplaceRevenueBridgeProvenance } from "./marketplaceSupplierSeller";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260886_store_supplier_listing_create_hardening_v1.sql";

const SELLER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SUPPLIER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PRODUCT = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const CATEGORY = "c47a1000-0001-4000-8000-000000000001";
const LISTING = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

function validFacts(
  overrides: Partial<SupplierListingCreateFacts> = {}
): SupplierListingCreateFacts {
  return {
    role: "owner",
    sellerStoreId: SELLER,
    sourceProductId: PRODUCT,
    productStoreId: SUPPLIER,
    supplierStoreId: SUPPLIER,
    productStatus: "active",
    moderationStatus: "approved",
    marketplaceEligible: true,
    productType: "digital",
    primaryCategoryId: CATEGORY,
    categoryFound: true,
    categoryStatus: "active",
    supplierStoreStatus: "active",
    supplierVerificationStatus: "verified",
    marketplaceSupplierEnabled: true,
    sellerStoreStatus: "active",
    sellerVerificationStatus: "verified",
    priceAmountMinor: 2500,
    priceCurrency: "USD",
    digitalPublishReady: true,
    inventory: null,
    variantStatus: "active",
    existingListing: null,
    ...overrides,
  };
}

describe("supplierListingCreateHardening — capability", () => {
  it("exposes approved capability id", () => {
    expect(SUPPLIER_LISTING_CREATE_HARDENING_ID).toBe(
      "commerce.marketplace.supplier_listing_create_hardening_v1"
    );
  });

  it("ships local hardening migration", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    const sql = readFileSync(join(ROOT, MIGRATION), "utf8");
    expect(sql).toMatch(/add_store_seller_listing/);
    expect(sql).toMatch(/Only store owners or managers/);
    expect(sql).toMatch(/An active listing already exists/);
    expect(sql).toMatch(/revoke insert on table public\.store_seller_listings/);
    expect(sql).toMatch(/primary_category_id/);
    expect(sql).toMatch(/Trusted selling price/);
  });
});

describe("supplierListingCreateHardening — authorization", () => {
  it("allows only owner/manager", () => {
    expect(canCreateSupplierListing("owner")).toBe(true);
    expect(canCreateSupplierListing("manager")).toBe(true);
    expect(canCreateSupplierListing("catalog_editor")).toBe(false);
    expect(canCreateSupplierListing("viewer")).toBe(false);
    expect(canCreateSupplierListing(null)).toBe(false);
  });

  it("rejects unauthorized roles at evaluate", () => {
    const gate = evaluateSupplierListingCreate(
      validFacts({ role: "catalog_editor" })
    );
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.code).toBe("unauthorized");
  });
});

describe("supplierListingCreateHardening — valid create", () => {
  it("accepts a valid supplier listing create", () => {
    const gate = evaluateSupplierListingCreate(validFacts());
    expect(gate.ok).toBe(true);
    if (gate.ok) {
      expect(gate.action).toBe("create");
      expect(gate.listingStatus).toBe("active");
      expect(gate.primaryCategoryId).toBe(CATEGORY);
      expect(gate.inventoryOwnerStoreId).toBe(SUPPLIER);
      expect(gate.fulfillmentPartyStoreId).toBe(SUPPLIER);
    }
  });

  it("allows reactivate of non-active listing", () => {
    const gate = evaluateSupplierListingCreate(
      validFacts({
        existingListing: {
          id: LISTING,
          status: "hidden",
          sellerStoreId: SELLER,
          sourceProductId: PRODUCT,
          supplierStoreId: SUPPLIER,
        },
      })
    );
    expect(gate.ok).toBe(true);
    if (gate.ok) expect(gate.action).toBe("reactivate");
  });
});

describe("supplierListingCreateHardening — duplicate listing", () => {
  it("rejects duplicate active listings", () => {
    const gate = evaluateSupplierListingCreate(
      validFacts({
        existingListing: {
          id: LISTING,
          status: "active",
          sellerStoreId: SELLER,
          sourceProductId: PRODUCT,
          supplierStoreId: SUPPLIER,
        },
      })
    );
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.code).toBe("duplicate_active");
  });
});

describe("supplierListingCreateHardening — ownership", () => {
  it("rejects invalid ownership / same-store", () => {
    expect(
      evaluateSupplierListingCreate(
        validFacts({ productStoreId: SELLER, supplierStoreId: SUPPLIER })
      ).ok
    ).toBe(false);
    expect(
      evaluateSupplierListingCreate(
        validFacts({ sellerStoreId: SUPPLIER, supplierStoreId: SUPPLIER })
      ).ok
    ).toBe(false);
    const malformed = evaluateSupplierListingCreate(
      validFacts({
        existingListing: {
          id: LISTING,
          status: "draft",
          sellerStoreId: SELLER,
          sourceProductId: PRODUCT,
          supplierStoreId: SELLER,
        },
      })
    );
    expect(malformed.ok).toBe(false);
    if (!malformed.ok) expect(malformed.code).toBe("malformed_ownership");
  });
});

describe("supplierListingCreateHardening — category", () => {
  it("rejects missing / invalid category", () => {
    const missing = evaluateSupplierListingCreate(
      validFacts({ primaryCategoryId: null })
    );
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.code).toBe("invalid_category");

    const notFound = evaluateSupplierListingCreate(
      validFacts({ categoryFound: false })
    );
    expect(notFound.ok).toBe(false);
    if (!notFound.ok) expect(notFound.code).toBe("invalid_category");
  });

  it("rejects inactive category", () => {
    const gate = evaluateSupplierListingCreate(
      validFacts({ categoryStatus: "inactive" })
    );
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.code).toBe("inactive_category");
  });
});

describe("supplierListingCreateHardening — inventory", () => {
  it("rejects missing finite inventory", () => {
    const gate = evaluateSupplierListingCreate(
      validFacts({
        productType: "physical",
        inventory: null,
        digitalPublishReady: true,
      })
    );
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.code).toBe("invalid_inventory");
  });

  it("rejects inconsistent finite inventory", () => {
    const gate = evaluateSupplierListingCreate(
      validFacts({
        productType: "physical",
        inventory: {
          onHand: 2,
          reserved: 5,
          safetyStock: 0,
          allowBackorder: false,
        },
      })
    );
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.code).toBe("invalid_inventory");
  });

  it("allows finite in-stock and out-of-stock with valid model", () => {
    expect(
      evaluateSupplierListingCreate(
        validFacts({
          productType: "physical",
          inventory: {
            onHand: 10,
            reserved: 1,
            safetyStock: 2,
            allowBackorder: false,
          },
        })
      ).ok
    ).toBe(true);
    expect(
      evaluateSupplierListingCreate(
        validFacts({
          productType: "physical",
          inventory: {
            onHand: 0,
            reserved: 0,
            safetyStock: 0,
            allowBackorder: false,
          },
        })
      ).ok
    ).toBe(true);
  });
});

describe("supplierListingCreateHardening — publish readiness", () => {
  it("rejects digital without publish readiness", () => {
    const gate = evaluateSupplierListingCreate(
      validFacts({ digitalPublishReady: false })
    );
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.code).toBe("digital_asset_not_ready");
  });

  it("compatibility — does not replace publish readiness", () => {
    const c = supplierListingCreateCompatibility();
    expect(c.replacesDigitalPublishReadiness).toBe(false);
    expect(c.replacesCategoryGate).toBe(false);
  });
});

describe("supplierListingCreateHardening — commission / settlement", () => {
  it("does not invent commission or settlement on create", () => {
    const c = supplierListingCreateCompatibility();
    expect(c.inventsCommission).toBe(false);
    expect(c.inventsSettlementDecomposition).toBe(false);
    expect(c.commissionPolicyId).toBe(COMMISSION_POLICY_FOUNDATION_ID);

    const provenance = buildMarketplaceRevenueBridgeProvenance({
      sellerStoreId: SELLER,
      supplierStoreId: SUPPLIER,
      listingId: LISTING,
      marketplaceSourceType: "supplier_listing",
    });
    expect(provenance.settlementDecomposition).toBe("unavailable");
  });
});

describe("supplierListingCreateHardening — client fields / malformed", () => {
  it("rejects client-supplied ownership and money fields", () => {
    expect(
      rejectClientListingCreateFields({ source_product_id: PRODUCT }).ok
    ).toBe(true);
    expect(rejectClientListingCreateFields({ listing_id: LISTING }).ok).toBe(
      false
    );
    expect(
      rejectClientListingCreateFields({ supplier_store_id: SUPPLIER }).ok
    ).toBe(false);
    expect(rejectClientListingCreateFields({ onHand: 9 }).ok).toBe(false);
    expect(rejectClientListingCreateFields({ commission: 1 }).ok).toBe(false);
  });

  it("rejects malformed identifiers", () => {
    expect(isUuid("not-a-uuid")).toBe(false);
    const gate = evaluateSupplierListingCreate(
      validFacts({ sourceProductId: "bad" })
    );
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.code).toBe("malformed_id");
  });
});

describe("supplierListingCreateHardening — regression", () => {
  it("still requires marketplace eligibility (price / supplier flags)", () => {
    expect(
      evaluateSupplierListingCreate(validFacts({ priceAmountMinor: null })).ok
    ).toBe(false);
    expect(
      evaluateSupplierListingCreate(
        validFacts({ marketplaceSupplierEnabled: false })
      ).ok
    ).toBe(false);
    expect(
      evaluateSupplierListingCreate(
        validFacts({ marketplaceEligible: false })
      ).ok
    ).toBe(false);
  });
});
