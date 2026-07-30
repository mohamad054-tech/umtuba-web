/**
 * Marketplace eligibility controls & diagnostics V1.
 * Supplier enablement ≠ product eligibility ≠ listing state ≠ availability.
 */

import { evaluateMarketplaceEligibility } from "./marketplaceSupplierSeller";
import { normalizeCurrencyCode } from "./money";

export type MarketplaceEligibilityBlocker = {
  code: string;
  message: string;
};

export function collectProductMarketplaceBlockers(input: {
  marketplaceSupplierEnabled: boolean;
  supplierStoreStatus: string;
  supplierVerificationStatus: string;
  marketplaceEligible: boolean;
  productStatus: string;
  moderationStatus: string;
  priceAmountMinor: number | null;
  priceCurrency: string | null;
  productType?: string | null;
  digitalPublishReady?: boolean | null;
}): MarketplaceEligibilityBlocker[] {
  const blockers: MarketplaceEligibilityBlocker[] = [];
  if (!input.marketplaceSupplierEnabled) {
    blockers.push({
      code: "supplier_disabled",
      message: "Marketplace supplier participation is disabled for this store.",
    });
  }
  if (input.supplierStoreStatus !== "active") {
    blockers.push({
      code: "supplier_inactive",
      message: "Supplier store must be active.",
    });
  }
  if (input.supplierVerificationStatus !== "verified") {
    blockers.push({
      code: "supplier_unverified",
      message: "Supplier store must be verified.",
    });
  }
  if (!input.marketplaceEligible) {
    blockers.push({
      code: "product_ineligible",
      message: "Product is not marked marketplace-eligible.",
    });
  }
  if (input.productStatus !== "active") {
    blockers.push({
      code: "product_unpublished",
      message: "Product must be published (active).",
    });
  }
  if (input.moderationStatus !== "approved") {
    blockers.push({
      code: "product_not_approved",
      message: "Product must be moderation-approved.",
    });
  }
  if (
    input.priceAmountMinor == null ||
    !Number.isInteger(input.priceAmountMinor) ||
    input.priceAmountMinor < 0 ||
    !normalizeCurrencyCode(input.priceCurrency ?? "")
  ) {
    blockers.push({
      code: "missing_price",
      message: "A trusted active selling price is required.",
    });
  }
  if (
    String(input.productType ?? "").trim() === "digital" &&
    input.digitalPublishReady !== true
  ) {
    blockers.push({
      code: "digital_asset_not_ready",
      message:
        "Digital products require an active owned digital deliverable before marketplace sale.",
    });
  }
  return blockers;
}

export function explainMarketplaceSupplierToggle(): string {
  return "Enabling marketplace participation lets other verified sellers discover products you mark as marketplace-eligible. It does not make every product eligible automatically.";
}

export function explainMarketplaceProductToggle(): string {
  return "Eligible products can appear in other sellers’ marketplace discovery. Sellers cannot change your product specs, prices, or inventory.";
}

export type MarketplaceAdminDiagnostic = {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  supplierStoreId?: string;
  productId?: string;
  listingId?: string;
};

export function deriveMarketplaceAdminDiagnostics(input: {
  suppliers: Array<{
    storeId: string;
    marketplaceSupplierEnabled: boolean;
    status: string;
    activeListingCount: number;
  }>;
  products: Array<{
    productId: string;
    storeId: string;
    marketplaceEligible: boolean;
    status: string;
    activeListingCount: number;
    hasTrustedPrice: boolean;
  }>;
  listings: Array<{
    listingId: string;
    status: string;
    sourceProductId: string | null;
    sourceProductExists: boolean;
    hasTrustedPrice: boolean;
    sellerStoreId: string;
    supplierEnabled: boolean;
    productEligible: boolean;
  }>;
  migrationsAppliedRemotely?: boolean | null;
}): MarketplaceAdminDiagnostic[] {
  const out: MarketplaceAdminDiagnostic[] = [];

  if (input.migrationsAppliedRemotely === false) {
    out.push({
      code: "migrations_unavailable_remotely",
      severity: "warning",
      message:
        "Marketplace migrations 20260869/20260870 are present locally but not confirmed applied remotely.",
    });
  }

  for (const s of input.suppliers) {
    if (!s.marketplaceSupplierEnabled && s.activeListingCount > 0) {
      out.push({
        code: "supplier_disabled_with_active_listings",
        severity: "warning",
        message: `Supplier has marketplace disabled but ${s.activeListingCount} active listing(s) still reference it.`,
        supplierStoreId: s.storeId,
      });
    }
  }

  for (const p of input.products) {
    if (!p.marketplaceEligible && p.activeListingCount > 0) {
      out.push({
        code: "product_ineligible_with_active_listings",
        severity: "warning",
        message: `Product is marketplace-ineligible but has ${p.activeListingCount} active listing(s).`,
        productId: p.productId,
        supplierStoreId: p.storeId,
      });
    }
    if (p.marketplaceEligible && !p.hasTrustedPrice) {
      out.push({
        code: "eligible_product_missing_price",
        severity: "error",
        message: "Marketplace-eligible product is missing a trusted active price.",
        productId: p.productId,
        supplierStoreId: p.storeId,
      });
    }
  }

  for (const l of input.listings) {
    if (l.status !== "active") continue;
    if (!l.sourceProductExists || !l.sourceProductId) {
      out.push({
        code: "listing_missing_source_product",
        severity: "error",
        message: "Active listing is missing its source product.",
        listingId: l.listingId,
      });
    }
    if (!l.hasTrustedPrice) {
      out.push({
        code: "listing_missing_price",
        severity: "error",
        message: "Active listing source product has no trusted price.",
        listingId: l.listingId,
        productId: l.sourceProductId ?? undefined,
      });
    }
    if (!l.supplierEnabled || !l.productEligible) {
      out.push({
        code: "listing_eligibility_invalid",
        severity: "warning",
        message:
          "Active listing no longer satisfies supplier/product marketplace eligibility.",
        listingId: l.listingId,
        productId: l.sourceProductId ?? undefined,
      });
    }
  }

  return out;
}

export function listingBuyerPdpPath(input: {
  sellerStoreSlug: string;
  productSlug: string;
}): string {
  return `/store/${encodeURIComponent(input.sellerStoreSlug)}/product/${encodeURIComponent(input.productSlug)}`;
}

export function validateListingCartContext(input: {
  listingId: string;
  listingStatus: string;
  sellerStoreId: string;
  sellerStoreStatus: string;
  sellerVerificationStatus: string;
  sourceProductId: string;
  variantProductId: string;
  supplierStoreId: string;
  supplierStoreStatus: string;
  supplierVerificationStatus: string;
  marketplaceSupplierEnabled: boolean;
  marketplaceEligible: boolean;
  productStatus: string;
  moderationStatus: string;
  priceAmountMinor: number | null;
  priceCurrency: string | null;
  productType?: string | null;
  digitalPublishReady?: boolean | null;
}): { ok: true } | { ok: false; message: string } {
  if (input.listingStatus !== "active") {
    return { ok: false, message: "This marketplace listing is not active." };
  }
  if (input.sellerStoreStatus !== "active") {
    return { ok: false, message: "Seller store is not active." };
  }
  if (input.sourceProductId !== input.variantProductId) {
    return {
      ok: false,
      message: "Listing and variant product do not match.",
    };
  }
  const gate = evaluateMarketplaceEligibility({
    productStatus: input.productStatus,
    moderationStatus: input.moderationStatus,
    marketplaceEligible: input.marketplaceEligible,
    supplierStoreStatus: input.supplierStoreStatus,
    supplierVerificationStatus: input.supplierVerificationStatus,
    marketplaceSupplierEnabled: input.marketplaceSupplierEnabled,
    sellerStoreStatus: input.sellerStoreStatus,
    sellerVerificationStatus: input.sellerVerificationStatus,
    sellerStoreId: input.sellerStoreId,
    supplierStoreId: input.supplierStoreId,
    priceAmountMinor: input.priceAmountMinor,
    priceCurrency: input.priceCurrency,
    productType: input.productType,
    digitalPublishReady: input.digitalPublishReady,
  });
  if (!gate.ok) {
    return { ok: false, message: gate.message };
  }
  return { ok: true };
}

/** Deterministic PDP resolution preference. */
export const LISTING_PDP_RESOLUTION_RULE =
  "owned_product_first_then_active_supplier_listing" as const;
