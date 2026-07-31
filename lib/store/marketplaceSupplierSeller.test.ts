import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertSellerCannotMutateSupplierTruth,
  buildMarketplaceOrderItemProvenance,
  buildMarketplaceRevenueBridgeProvenance,
  evaluateMarketplaceEligibility,
  filterMarketplaceDiscovery,
  listingDisplayTitle,
  normalizeListingCompareAt,
  sellerListingAttention,
  sellerListingPricingControl,
  type MarketplaceDiscoveryItem,
} from "./marketplaceSupplierSeller";
import { buildOrderItemProductSnapshot } from "./orderRules";
import { buildCommerceFinancialEvent } from "./commerceRevenueBridge";

const ROOT = process.cwd();
const MIGRATION_A =
  "supabase/migrations/20260869_store_marketplace_supplier_seller_foundation_v1.sql";
const MIGRATION_B =
  "supabase/migrations/20260870_store_marketplace_listing_checkout_alignment_v1.sql";

const SELLER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SUPPLIER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PRODUCT = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const LISTING = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const VARIANT = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const ORDER = "ffffffff-ffff-4fff-8fff-ffffffffffff";

function eligibleBase() {
  return {
    productStatus: "active",
    moderationStatus: "approved",
    marketplaceEligible: true,
    supplierStoreStatus: "active",
    supplierVerificationStatus: "verified",
    marketplaceSupplierEnabled: true,
    sellerStoreStatus: "active",
    sellerVerificationStatus: "verified",
    sellerStoreId: SELLER,
    supplierStoreId: SUPPLIER,
    priceAmountMinor: 2500,
    priceCurrency: "USD",
  };
}

describe("marketplace supplier-seller — migrations", () => {
  it("ships listing foundation and checkout alignment migrations", () => {
    expect(existsSync(join(ROOT, MIGRATION_A))).toBe(true);
    expect(existsSync(join(ROOT, MIGRATION_B))).toBe(true);
    const a = readFileSync(join(ROOT, MIGRATION_A), "utf8");
    expect(a).toMatch(/create table if not exists public\.store_seller_listings/);
    expect(a).toMatch(/add_store_seller_listing/);
    expect(a).toMatch(/store_listing_allows_seller_sale/);
    expect(a).toMatch(/force row level security/);
    const b = readFileSync(join(ROOT, MIGRATION_B), "utf8");
    expect(b).toMatch(/store_listing_allows_seller_sale/);
    expect(b).toMatch(/seller_listing_id/);
  });

  it("ships supplier listing create hardening migration", () => {
    const path =
      "supabase/migrations/20260886_store_supplier_listing_create_hardening_v1.sql";
    expect(existsSync(join(ROOT, path))).toBe(true);
    const sql = readFileSync(join(ROOT, path), "utf8");
    expect(sql).toMatch(/array\['owner', 'manager'\]/);
    expect(sql).not.toMatch(
      /is_store_member_with_role\(\s*v_seller_store_id,\s*array\['owner', 'manager', 'catalog_editor'\]/
    );
    expect(sql).toMatch(/An active listing already exists for this product/);
  });
});

describe("marketplace eligibility", () => {
  it("allows verified supplier products with trusted prices", () => {
    expect(evaluateMarketplaceEligibility(eligibleBase()).ok).toBe(true);
  });

  it("rejects same-store, inactive, unverified, ineligible, missing price", () => {
    expect(
      evaluateMarketplaceEligibility({
        ...eligibleBase(),
        sellerStoreId: SUPPLIER,
        supplierStoreId: SUPPLIER,
      }).ok
    ).toBe(false);
    expect(
      evaluateMarketplaceEligibility({
        ...eligibleBase(),
        marketplaceEligible: false,
      }).ok
    ).toBe(false);
    expect(
      evaluateMarketplaceEligibility({
        ...eligibleBase(),
        marketplaceSupplierEnabled: false,
      }).ok
    ).toBe(false);
    expect(
      evaluateMarketplaceEligibility({
        ...eligibleBase(),
        sellerVerificationStatus: "pending",
      }).ok
    ).toBe(false);
    expect(
      evaluateMarketplaceEligibility({
        ...eligibleBase(),
        priceAmountMinor: null,
      }).ok
    ).toBe(false);
  });
});

describe("listing pricing Outcome B", () => {
  it("keeps seller markup disabled", () => {
    const pricing = sellerListingPricingControl();
    expect(pricing.mode).toBe("read_only_canonical");
    expect(pricing.marginAllowed).toBe(false);
  });

  it("keeps compare-at integrity", () => {
    expect(normalizeListingCompareAt(1000, 1500)).toBe(1500);
    expect(normalizeListingCompareAt(1000, 1000)).toBeNull();
  });
});

describe("seller mutation restrictions", () => {
  it("blocks supplier truth mutations", () => {
    expect(assertSellerCannotMutateSupplierTruth("supplier_inventory").ok).toBe(
      false
    );
    expect(assertSellerCannotMutateSupplierTruth("display_title").ok).toBe(true);
  });
});

describe("provenance", () => {
  it("builds order provenance for supplier listings", () => {
    const prov = buildMarketplaceOrderItemProvenance({
      sellerStoreId: SELLER,
      productStoreId: SUPPLIER,
      productId: PRODUCT,
      variantId: VARIANT,
      listingId: LISTING,
    });
    expect(prov.marketplaceSourceType).toBe("supplier_listing");
    expect(prov.supplierStoreId).toBe(SUPPLIER);
    expect(prov.sellerListingId).toBe(LISTING);
  });

  it("snapshots marketplace fields immutably", () => {
    const snap = buildOrderItemProductSnapshot({
      productId: PRODUCT,
      storeId: SELLER,
      slug: "lamp",
      title: "Lamp",
      productType: "physical",
      sku: "SKU",
      variantId: VARIANT,
      unitPriceMinor: 2500,
      currency: "USD",
      marketplaceSourceType: "supplier_listing",
      supplierStoreId: SUPPLIER,
      sellerListingId: LISTING,
    });
    expect(snap.marketplace_source_type).toBe("supplier_listing");
    expect(snap.supplier_store_id).toBe(SUPPLIER);
    expect(snap.seller_listing_id).toBe(LISTING);
  });

  it("extends revenue bridge provenance without inventing commission", () => {
    const bridge = buildMarketplaceRevenueBridgeProvenance({
      sellerStoreId: SELLER,
      supplierStoreId: SUPPLIER,
      listingId: LISTING,
      marketplaceSourceType: "supplier_listing",
    });
    expect(bridge.settlementDecomposition).toBe("unavailable");
    const event = buildCommerceFinancialEvent({
      orderId: ORDER,
      storeId: SELLER,
      currency: "USD",
      subtotalMinor: 5000,
      discountTotalMinor: 0,
      taxTotalMinor: 0,
      shippingTotalMinor: 0,
      grandTotalMinor: 5000,
      paymentStatus: "paid",
      orderStatus: "confirmed",
      occurredAt: "2026-07-28T12:00:00.000Z",
      supplierStoreId: SUPPLIER,
      sellerListingId: LISTING,
      marketplaceSourceType: "supplier_listing",
    });
    expect(event.ok).toBe(true);
    if (!event.ok) return;
    expect(event.event.marketplace.supplierStoreId).toBe(SUPPLIER);
    expect(event.event.commission.merchantAmountMinor).toBeNull();
  });
});

describe("discovery filters and dashboard attention", () => {
  const sample: MarketplaceDiscoveryItem = {
    productId: PRODUCT,
    title: "Cedar Chair",
    slug: "cedar-chair",
    shortDescription: null,
    categoryName: "Furniture",
    coverUrl: null,
    coverPath: null,
    priceMinor: 4000,
    compareAtMinor: null,
    currency: "USD",
    available: 3,
    availabilityKnown: true,
    marketplaceEligible: true,
    supplier: {
      storeId: SUPPLIER,
      name: "North Mill",
      slug: "north-mill",
      status: "active",
      verificationStatus: "verified",
      marketplaceSupplierEnabled: true,
    },
    existingListingId: null,
    existingListingStatus: null,
  };

  it("filters and sorts discovery", () => {
    const rows = filterMarketplaceDiscovery(
      [
        sample,
        {
          ...sample,
          productId: "99999999-9999-4999-8999-999999999999",
          title: "Oak Table",
          priceMinor: 9000,
          available: 0,
        },
      ],
      { query: "cedar", onlyAvailable: true, sort: "price_asc" }
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toBe("Cedar Chair");
  });

  it("summarizes listing attention without fabricating opportunity scores", () => {
    const snap = sellerListingAttention({
      listings: [
        { status: "active", availabilityKnown: true, available: 0 },
        { status: "hidden" },
        { status: "active", supplierStatus: "suspended" },
      ],
    });
    expect(snap.active).toBe(2);
    expect(snap.hidden).toBe(1);
    expect(snap.unavailableStock).toBe(1);
    expect(snap.supplierIssues).toBe(1);
  });

  it("uses override title only when present", () => {
    expect(listingDisplayTitle("Canonical", null)).toBe("Canonical");
    expect(listingDisplayTitle("Canonical", "Seller title")).toBe("Seller title");
  });
});
