/**
 * Commerce Marketplace Supplier→Seller Foundation V1
 *
 * Supplier Product ≠ Seller Listing ≠ Inventory.
 * Listing publication ≠ availability.
 * Pricing Outcome B: seller listing price is read-only from canonical product_prices.
 * No fabricated margins, commissions, or earnings.
 */

import { isLegitimateCompareAt } from "./tradingContracts";
import { normalizeCurrencyCode } from "./money";
import type { ModerationStatus, ProductStatus } from "./types";

export const MARKETPLACE_LISTING_STATUSES = [
  "draft",
  "active",
  "hidden",
  "archived",
] as const;
export type MarketplaceListingStatus =
  (typeof MARKETPLACE_LISTING_STATUSES)[number];

export const MARKETPLACE_SOURCE_TYPES = ["owned", "supplier_listing"] as const;
export type MarketplaceSourceType = (typeof MARKETPLACE_SOURCE_TYPES)[number];

export const ADD_STORE_SELLER_LISTING_RPC = "add_store_seller_listing" as const;
export const UPDATE_STORE_SELLER_LISTING_RPC =
  "update_store_seller_listing" as const;

export type MarketplaceSupplierIdentity = {
  storeId: string;
  name: string;
  slug: string;
  status: string;
  verificationStatus: string;
  marketplaceSupplierEnabled: boolean;
};

export type MarketplaceDiscoveryItem = {
  productId: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  categoryName: string | null;
  coverUrl: string | null;
  coverPath: string | null;
  priceMinor: number | null;
  compareAtMinor: number | null;
  currency: string | null;
  available: number | null;
  availabilityKnown: boolean;
  marketplaceEligible: boolean;
  supplier: MarketplaceSupplierIdentity;
  existingListingId: string | null;
  existingListingStatus: MarketplaceListingStatus | null;
};

export type SellerListingRow = {
  id: string;
  sellerStoreId: string;
  sourceProductId: string;
  supplierStoreId: string;
  status: MarketplaceListingStatus;
  displayTitleOverride: string | null;
  marketingDescription: string | null;
  primaryCategoryId: string | null;
  inventoryOwnerStoreId: string | null;
  fulfillmentPartyStoreId: string | null;
  createdAt: string;
  updatedAt: string;
  /** Joined presentation */
  sourceTitle?: string;
  sourceSlug?: string;
  supplierName?: string;
  supplierSlug?: string;
  priceMinor?: number | null;
  currency?: string | null;
  available?: number | null;
  availabilityKnown?: boolean;
  coverUrl?: string | null;
  /** Seller listing visibility / eligibility diagnostics */
  supplierMarketplaceEnabled?: boolean;
  productMarketplaceEligible?: boolean;
  supplierStoreStatus?: string;
  buyerPdpAvailable?: boolean;
  buyerPdpPath?: string | null;
  blockingReason?: string | null;
};

export type MarketplaceEligibilityInput = {
  productStatus: string;
  moderationStatus: string;
  marketplaceEligible: boolean;
  supplierStoreStatus: string;
  supplierVerificationStatus: string;
  marketplaceSupplierEnabled: boolean;
  sellerStoreStatus: string;
  sellerVerificationStatus: string;
  sellerStoreId: string;
  supplierStoreId: string;
  priceAmountMinor: number | null;
  priceCurrency: string | null;
};

export function isMarketplaceListingStatus(
  value: unknown
): value is MarketplaceListingStatus {
  return (
    typeof value === "string" &&
    (MARKETPLACE_LISTING_STATUSES as readonly string[]).includes(value)
  );
}

/** Seller may not alter supplier product truth — only listing merchandising. */
export const SELLER_LISTING_FORBIDDEN_MUTATIONS = [
  "canonical_product_specs",
  "supplier_identity",
  "supplier_inventory",
  "supplier_cost",
  "trusted_stock",
  "fulfillment_facts",
] as const;

export function evaluateMarketplaceEligibility(
  input: MarketplaceEligibilityInput
): { ok: true } | { ok: false; message: string; code: string } {
  if (input.sellerStoreId === input.supplierStoreId) {
    return {
      ok: false,
      message: "Cannot list your own product through marketplace discovery.",
      code: "same_store",
    };
  }
  if (input.sellerStoreStatus !== "active") {
    return {
      ok: false,
      message: "Seller store must be active.",
      code: "seller_inactive",
    };
  }
  if (input.sellerVerificationStatus !== "verified") {
    return {
      ok: false,
      message: "Seller store must be verified.",
      code: "seller_unverified",
    };
  }
  if (input.supplierStoreStatus !== "active") {
    return {
      ok: false,
      message: "Supplier store is inactive.",
      code: "supplier_inactive",
    };
  }
  if (input.supplierVerificationStatus !== "verified") {
    return {
      ok: false,
      message: "Supplier store is unverified.",
      code: "supplier_unverified",
    };
  }
  if (!input.marketplaceSupplierEnabled) {
    return {
      ok: false,
      message: "Supplier is not enabled for marketplace supply.",
      code: "supplier_not_enabled",
    };
  }
  if (!input.marketplaceEligible) {
    return {
      ok: false,
      message: "Product is not marketplace-eligible.",
      code: "product_not_eligible",
    };
  }
  if (input.productStatus !== "active") {
    return {
      ok: false,
      message: "Product is not published.",
      code: "product_unpublished",
    };
  }
  if (input.moderationStatus !== "approved") {
    return {
      ok: false,
      message: "Product is not approved for marketplace.",
      code: "product_not_approved",
    };
  }
  if (
    input.priceAmountMinor == null ||
    !Number.isInteger(input.priceAmountMinor) ||
    input.priceAmountMinor < 0 ||
    !normalizeCurrencyCode(input.priceCurrency ?? "")
  ) {
    return {
      ok: false,
      message: "Trusted selling price is missing or invalid.",
      code: "missing_price",
    };
  }
  return { ok: true };
}

/** Outcome B: listing price is read-only from canonical offer. */
export function sellerListingPricingControl(): {
  mode: "read_only_canonical";
  marginAllowed: false;
  message: string;
} {
  return {
    mode: "read_only_canonical",
    marginAllowed: false,
    message:
      "Seller markup is not enabled. Listing price follows the canonical supplier offer (Trading Integrity Outcome B).",
  };
}

export function normalizeListingCompareAt(
  sellingPriceMinor: number | null,
  compareAtMinor: number | null
): number | null {
  if (sellingPriceMinor == null) return null;
  return isLegitimateCompareAt(sellingPriceMinor, compareAtMinor)
    ? compareAtMinor
    : null;
}

export function listingDisplayTitle(
  sourceTitle: string,
  override: string | null | undefined
): string {
  const trimmed = (override ?? "").trim();
  return trimmed || sourceTitle;
}

export function distinguishCatalogOrigin(input: {
  productStoreId: string;
  viewingStoreId: string;
  listingId?: string | null;
}): MarketplaceSourceType {
  if (input.listingId) return "supplier_listing";
  if (input.productStoreId === input.viewingStoreId) return "owned";
  return "supplier_listing";
}

export type MarketplaceOrderItemProvenance = {
  marketplaceSourceType: MarketplaceSourceType;
  sellerStoreId: string;
  supplierStoreId: string | null;
  sellerListingId: string | null;
  canonicalProductId: string;
  variantId: string;
  fulfillmentPartyStoreId: string | null;
  inventoryOwnerStoreId: string | null;
};

export function buildMarketplaceOrderItemProvenance(input: {
  sellerStoreId: string;
  productStoreId: string;
  productId: string;
  variantId: string;
  listingId?: string | null;
  fulfillmentPartyStoreId?: string | null;
  inventoryOwnerStoreId?: string | null;
}): MarketplaceOrderItemProvenance {
  const isOwned = input.productStoreId === input.sellerStoreId;
  return {
    marketplaceSourceType: isOwned ? "owned" : "supplier_listing",
    sellerStoreId: input.sellerStoreId,
    supplierStoreId: isOwned ? null : input.productStoreId,
    sellerListingId: isOwned ? null : input.listingId ?? null,
    canonicalProductId: input.productId,
    variantId: input.variantId,
    fulfillmentPartyStoreId: input.fulfillmentPartyStoreId ?? null,
    inventoryOwnerStoreId: input.inventoryOwnerStoreId ?? null,
  };
}

/** Extend Revenue Bridge metadata without inventing commission amounts. */
export function buildMarketplaceRevenueBridgeProvenance(input: {
  sellerStoreId: string;
  supplierStoreId?: string | null;
  listingId?: string | null;
  marketplaceSourceType?: MarketplaceSourceType | null;
}): {
  sellerStoreId: string;
  supplierStoreId: string | null;
  listingId: string | null;
  marketplaceSourceType: MarketplaceSourceType | null;
  settlementDecomposition: "unavailable";
  message: string;
} {
  return {
    sellerStoreId: input.sellerStoreId,
    supplierStoreId: input.supplierStoreId ?? null,
    listingId: input.listingId ?? null,
    marketplaceSourceType: input.marketplaceSourceType ?? null,
    settlementDecomposition: "unavailable",
    message:
      "Supplier/seller provenance retained. Commission and earnings remain unavailable without a trusted policy.",
  };
}

export function filterMarketplaceDiscovery(
  items: MarketplaceDiscoveryItem[],
  input: {
    query?: string;
    categoryName?: string | null;
    onlyAvailable?: boolean;
    sort?: "title_asc" | "price_asc" | "price_desc" | "newest";
  }
): MarketplaceDiscoveryItem[] {
  const q = (input.query ?? "").trim().toLowerCase();
  let next = items.filter((item) => {
    if (!item.marketplaceEligible) return false;
    if (q) {
      const hay = `${item.title} ${item.supplier.name} ${item.categoryName ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (
      input.categoryName &&
      (item.categoryName ?? "").toLowerCase() !==
        input.categoryName.toLowerCase()
    ) {
      return false;
    }
    if (input.onlyAvailable) {
      if (!item.availabilityKnown || (item.available ?? 0) <= 0) return false;
    }
    return true;
  });

  const sort = input.sort ?? "title_asc";
  next = [...next].sort((a, b) => {
    if (sort === "price_asc") {
      return (a.priceMinor ?? Number.MAX_SAFE_INTEGER) -
        (b.priceMinor ?? Number.MAX_SAFE_INTEGER);
    }
    if (sort === "price_desc") {
      return (b.priceMinor ?? -1) - (a.priceMinor ?? -1);
    }
    return a.title.localeCompare(b.title);
  });
  return next;
}

export function sellerListingAttention(input: {
  listings: Array<{
    status: MarketplaceListingStatus;
    availabilityKnown?: boolean;
    available?: number | null;
    supplierStatus?: string;
  }>;
}): {
  active: number;
  hidden: number;
  draft: number;
  archived: number;
  unavailableStock: number;
  supplierIssues: number;
} {
  const snap = {
    active: 0,
    hidden: 0,
    draft: 0,
    archived: 0,
    unavailableStock: 0,
    supplierIssues: 0,
  };
  for (const row of input.listings) {
    if (row.status === "active") snap.active += 1;
    else if (row.status === "hidden") snap.hidden += 1;
    else if (row.status === "draft") snap.draft += 1;
    else if (row.status === "archived") snap.archived += 1;
    if (
      row.status === "active" &&
      row.availabilityKnown &&
      (row.available ?? 0) <= 0
    ) {
      snap.unavailableStock += 1;
    }
    if (row.supplierStatus && row.supplierStatus !== "active") {
      snap.supplierIssues += 1;
    }
  }
  return snap;
}

export function assertSellerCannotMutateSupplierTruth(
  mutationKey: string
): { ok: true } | { ok: false; message: string } {
  if (
    (SELLER_LISTING_FORBIDDEN_MUTATIONS as readonly string[]).includes(
      mutationKey
    )
  ) {
    return {
      ok: false,
      message: "Sellers cannot modify supplier-owned product truth or inventory.",
    };
  }
  return { ok: true };
}

export function mapProductStatusesForOwnedVsListing(input: {
  sourceType: MarketplaceSourceType;
  productStatus: ProductStatus | string;
  listingStatus?: MarketplaceListingStatus | null;
}): { label: string; tone: "owned" | "sourced" } {
  if (input.sourceType === "owned") {
    return { label: String(input.productStatus), tone: "owned" };
  }
  return {
    label: input.listingStatus ?? "listing",
    tone: "sourced",
  };
}

export type { ModerationStatus, ProductStatus };
