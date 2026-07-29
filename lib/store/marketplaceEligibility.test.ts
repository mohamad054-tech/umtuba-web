import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildCommerceFinancialEvent } from "./commerceRevenueBridge";
import {
  collectProductMarketplaceBlockers,
  deriveMarketplaceAdminDiagnostics,
  LISTING_PDP_RESOLUTION_RULE,
  listingBuyerPdpPath,
  validateListingCartContext,
} from "./marketplaceEligibility";
import {
  buildMarketplaceOrderItemProvenance,
  evaluateMarketplaceEligibility,
} from "./marketplaceSupplierSeller";
import { buildOrderItemProductSnapshot } from "./orderRules";

const MIGRATION_69 =
  "supabase/migrations/20260869_store_marketplace_supplier_seller_foundation_v1.sql";
const MIGRATION_70 =
  "supabase/migrations/20260870_store_marketplace_listing_checkout_alignment_v1.sql";

const SELLER = "11111111-1111-4111-8111-111111111111";
const SUPPLIER = "22222222-2222-4222-8222-222222222222";
const PRODUCT = "33333333-3333-4333-8333-333333333333";
const LISTING = "44444444-4444-4444-8444-444444444444";
const VARIANT = "55555555-5555-4555-8555-555555555555";
const ORDER = "66666666-6666-4666-8666-666666666666";

describe("marketplace eligibility controls", () => {
  it("separates supplier enablement from product eligibility blockers", () => {
    const blockers = collectProductMarketplaceBlockers({
      marketplaceSupplierEnabled: false,
      supplierStoreStatus: "active",
      supplierVerificationStatus: "verified",
      marketplaceEligible: false,
      productStatus: "active",
      moderationStatus: "approved",
      priceAmountMinor: 1200,
      priceCurrency: "USD",
    });
    expect(blockers.map((b) => b.code)).toEqual(
      expect.arrayContaining(["supplier_disabled", "product_ineligible"])
    );
  });

  it("requires verified active supplier and published priced product", () => {
    const gate = evaluateMarketplaceEligibility({
      productStatus: "draft",
      moderationStatus: "approved",
      marketplaceEligible: true,
      supplierStoreStatus: "active",
      supplierVerificationStatus: "verified",
      marketplaceSupplierEnabled: true,
      sellerStoreStatus: "active",
      sellerVerificationStatus: "verified",
      sellerStoreId: SELLER,
      supplierStoreId: SUPPLIER,
      priceAmountMinor: 1000,
      priceCurrency: "USD",
    });
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.code).toBe("product_unpublished");
  });

  it("rejects same-store supplier/seller listing", () => {
    const gate = evaluateMarketplaceEligibility({
      productStatus: "active",
      moderationStatus: "approved",
      marketplaceEligible: true,
      supplierStoreStatus: "active",
      supplierVerificationStatus: "verified",
      marketplaceSupplierEnabled: true,
      sellerStoreStatus: "active",
      sellerVerificationStatus: "verified",
      sellerStoreId: SUPPLIER,
      supplierStoreId: SUPPLIER,
      priceAmountMinor: 1000,
      priceCurrency: "USD",
    });
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.code).toBe("same_store");
  });
});

describe("listing cart context validation", () => {
  it("fails closed when listing is hidden after cart insertion", () => {
    const result = validateListingCartContext({
      listingId: LISTING,
      listingStatus: "hidden",
      sellerStoreId: SELLER,
      sellerStoreStatus: "active",
      sellerVerificationStatus: "verified",
      sourceProductId: PRODUCT,
      variantProductId: PRODUCT,
      supplierStoreId: SUPPLIER,
      supplierStoreStatus: "active",
      supplierVerificationStatus: "verified",
      marketplaceSupplierEnabled: true,
      marketplaceEligible: true,
      productStatus: "active",
      moderationStatus: "approved",
      priceAmountMinor: 2500,
      priceCurrency: "USD",
    });
    expect(result.ok).toBe(false);
  });

  it("fails closed on listing/source product mismatch", () => {
    const result = validateListingCartContext({
      listingId: LISTING,
      listingStatus: "active",
      sellerStoreId: SELLER,
      sellerStoreStatus: "active",
      sellerVerificationStatus: "verified",
      sourceProductId: PRODUCT,
      variantProductId: VARIANT,
      supplierStoreId: SUPPLIER,
      supplierStoreStatus: "active",
      supplierVerificationStatus: "verified",
      marketplaceSupplierEnabled: true,
      marketplaceEligible: true,
      productStatus: "active",
      moderationStatus: "approved",
      priceAmountMinor: 2500,
      priceCurrency: "USD",
    });
    expect(result.ok).toBe(false);
  });

  it("accepts a complete trusted listing purchase path", () => {
    const result = validateListingCartContext({
      listingId: LISTING,
      listingStatus: "active",
      sellerStoreId: SELLER,
      sellerStoreStatus: "active",
      sellerVerificationStatus: "verified",
      sourceProductId: PRODUCT,
      variantProductId: PRODUCT,
      supplierStoreId: SUPPLIER,
      supplierStoreStatus: "active",
      supplierVerificationStatus: "verified",
      marketplaceSupplierEnabled: true,
      marketplaceEligible: true,
      productStatus: "active",
      moderationStatus: "approved",
      priceAmountMinor: 2500,
      priceCurrency: "USD",
    });
    expect(result).toEqual({ ok: true });
  });
});

describe("listing-backed PDP resolution contract", () => {
  it("uses owned-product-first collision rule", () => {
    expect(LISTING_PDP_RESOLUTION_RULE).toBe(
      "owned_product_first_then_active_supplier_listing"
    );
  });

  it("builds seller-storefront PDP paths (not supplier storefront)", () => {
    expect(
      listingBuyerPdpPath({
        sellerStoreSlug: "atelier-north",
        productSlug: "linen-set",
      })
    ).toBe("/store/atelier-north/product/linen-set");
  });
});

describe("order and revenue bridge provenance continuity", () => {
  it("preserves seller, supplier, listing, and source type through order snapshot", () => {
    const prov = buildMarketplaceOrderItemProvenance({
      sellerStoreId: SELLER,
      productStoreId: SUPPLIER,
      productId: PRODUCT,
      variantId: VARIANT,
      listingId: LISTING,
    });
    expect(prov.marketplaceSourceType).toBe("supplier_listing");
    expect(prov.sellerListingId).toBe(LISTING);
    expect(prov.supplierStoreId).toBe(SUPPLIER);

    const snap = buildOrderItemProductSnapshot({
      productId: PRODUCT,
      storeId: SELLER,
      slug: "linen-set",
      title: "Linen set",
      productType: "physical",
      sku: "SKU",
      variantId: VARIANT,
      unitPriceMinor: 2500,
      currency: "USD",
      marketplaceSourceType: prov.marketplaceSourceType,
      supplierStoreId: prov.supplierStoreId,
      sellerListingId: prov.sellerListingId,
    });
    expect(snap.seller_listing_id).toBe(LISTING);
    expect(snap.supplier_store_id).toBe(SUPPLIER);
    expect(snap.marketplace_source_type).toBe("supplier_listing");

    const event = buildCommerceFinancialEvent({
      orderId: ORDER,
      storeId: SELLER,
      currency: "USD",
      subtotalMinor: 2500,
      discountTotalMinor: 0,
      taxTotalMinor: 0,
      shippingTotalMinor: 0,
      grandTotalMinor: 2500,
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
    expect(event.event.marketplace.listingId).toBe(LISTING);
    expect(event.event.commission.merchantAmountMinor).toBeNull();
  });
});

describe("admin marketplace diagnostics", () => {
  it("flags supplier disabled with active listings and missing price", () => {
    const diagnostics = deriveMarketplaceAdminDiagnostics({
      suppliers: [
        {
          storeId: SUPPLIER,
          marketplaceSupplierEnabled: false,
          status: "active",
          activeListingCount: 2,
        },
      ],
      products: [
        {
          productId: PRODUCT,
          storeId: SUPPLIER,
          marketplaceEligible: true,
          status: "active",
          activeListingCount: 1,
          hasTrustedPrice: false,
        },
      ],
      listings: [
        {
          listingId: LISTING,
          status: "active",
          sourceProductId: PRODUCT,
          sourceProductExists: true,
          hasTrustedPrice: false,
          sellerStoreId: SELLER,
          supplierEnabled: false,
          productEligible: true,
        },
      ],
      migrationsAppliedRemotely: false,
    });
    expect(diagnostics.map((d) => d.code)).toEqual(
      expect.arrayContaining([
        "migrations_unavailable_remotely",
        "supplier_disabled_with_active_listings",
        "eligible_product_missing_price",
        "listing_missing_price",
        "listing_eligibility_invalid",
      ])
    );
  });
});

describe("marketplace eligibility migrations (local contract)", () => {
  it("keeps foundation + checkout alignment migrations non-destructive", () => {
    const sql69 = readFileSync(resolve(process.cwd(), MIGRATION_69), "utf8");
    const sql70 = readFileSync(resolve(process.cwd(), MIGRATION_70), "utf8");
    for (const sql of [sql69, sql70]) {
      expect(sql).not.toMatch(/\bdrop table\b/i);
      expect(sql).not.toMatch(/\btruncate\b/i);
    }
    expect(sql69).toMatch(/marketplace_supplier_enabled/);
    expect(sql69).toMatch(/marketplace_eligible/);
    expect(sql69).toMatch(/store_seller_listings/);
    expect(sql69).toMatch(/seller_listing_id/);
    expect(sql69).toMatch(/store_listing_allows_seller_sale/);
    expect(sql70).toMatch(/create_store_order_foundation_core/);
    expect(sql70).toMatch(/seller_listing_id/);
  });
});
