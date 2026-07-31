/**
 * Supplier Listing Create Hardening V1.
 * Trusted create path over existing store_seller_listings — no duplicate listing system.
 * Reuses marketplace eligibility, category taxonomy, inventory availability,
 * digital publish readiness. Does not invent commission or settlement amounts.
 */

import { assertPrimaryCategoryEligibleForReview } from "./categoryTaxonomySeed";
import { evaluateMarketplaceEligibility } from "./marketplaceSupplierSeller";
import { canManageStoreSettings } from "./permissions";
import {
  isFiniteInventoryProductType,
  resolveTrustedInventoryAvailability,
  type TrustedInventoryStockSnapshot,
} from "./sellerInventoryAvailabilityFoundation";
import type { StoreMemberRole } from "./types";
import { COMMISSION_POLICY_FOUNDATION_ID } from "./commissionPolicyFoundation";

export const SUPPLIER_LISTING_CREATE_HARDENING_ID =
  "commerce.marketplace.supplier_listing_create_hardening_v1" as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** Owner/manager only — catalog_editor cannot create marketplace listings. */
export function canCreateSupplierListing(
  role: StoreMemberRole | null | undefined
): boolean {
  return canManageStoreSettings(role);
}

/**
 * Client must not supply ownership, listing identity, inventory, or money fields.
 */
export function rejectClientListingCreateFields(
  input: Record<string, unknown>
): { ok: true } | { ok: false; message: string } {
  for (const key of Object.keys(input)) {
    if (
      /^(listing_id|listingId|supplier_store_id|supplierStoreId|inventory_owner|inventoryOwner|fulfillment_party|fulfillmentParty|on_hand|onHand|reserved|available|stock|unit_price|grand_total|commission|settlement)/i.test(
        key
      ) ||
      key === "id" ||
      key === "created_by" ||
      key === "createdBy"
    ) {
      return {
        ok: false,
        message:
          "Client must not supply listing ownership, identity, inventory, or money fields.",
      };
    }
  }
  return { ok: true };
}

export type SupplierListingCreateFacts = {
  role: StoreMemberRole | null | undefined;
  sellerStoreId: string;
  sourceProductId: string;
  /** Loaded product.store_id — must equal supplierStoreId. */
  productStoreId: string;
  supplierStoreId: string;
  productStatus: string;
  moderationStatus: string;
  marketplaceEligible: boolean;
  productType: string;
  primaryCategoryId: string | null;
  categoryFound: boolean;
  categoryStatus: string | null;
  supplierStoreStatus: string;
  supplierVerificationStatus: string;
  marketplaceSupplierEnabled: boolean;
  sellerStoreStatus: string;
  sellerVerificationStatus: string;
  priceAmountMinor: number | null;
  priceCurrency: string | null;
  digitalPublishReady: boolean;
  /** Null when no inventory row; required for finite product types. */
  inventory: TrustedInventoryStockSnapshot | null;
  variantStatus: string | null;
  /** Existing listing for (seller, product) if any. */
  existingListing: {
    id: string;
    status: string;
    sellerStoreId: string;
    sourceProductId: string;
    supplierStoreId: string;
  } | null;
};

export type SupplierListingCreateEvaluation =
  | {
      ok: true;
      capability: typeof SUPPLIER_LISTING_CREATE_HARDENING_ID;
      action: "create" | "reactivate";
      listingStatus: "active";
      primaryCategoryId: string;
      inventoryOwnerStoreId: string;
      fulfillmentPartyStoreId: string;
    }
  | {
      ok: false;
      capability: typeof SUPPLIER_LISTING_CREATE_HARDENING_ID;
      code: string;
      message: string;
    };

/**
 * Deterministic create readiness — fail closed. Does not trust client ownership.
 */
export function evaluateSupplierListingCreate(
  facts: SupplierListingCreateFacts
): SupplierListingCreateEvaluation {
  const capability = SUPPLIER_LISTING_CREATE_HARDENING_ID;

  if (!canCreateSupplierListing(facts.role)) {
    return {
      ok: false,
      capability,
      code: "unauthorized",
      message: "Only store owners or managers may create marketplace listings.",
    };
  }

  if (!isUuid(facts.sellerStoreId) || !isUuid(facts.sourceProductId)) {
    return {
      ok: false,
      capability,
      code: "malformed_id",
      message: "Listing identifiers are invalid.",
    };
  }

  if (
    !isUuid(facts.productStoreId) ||
    !isUuid(facts.supplierStoreId) ||
    facts.productStoreId !== facts.supplierStoreId
  ) {
    return {
      ok: false,
      capability,
      code: "ownership_mismatch",
      message: "Product does not belong to the supplier store.",
    };
  }

  if (facts.sellerStoreId === facts.supplierStoreId) {
    return {
      ok: false,
      capability,
      code: "same_store",
      message: "Cannot list your own product through marketplace discovery.",
    };
  }

  const categoryGate = assertPrimaryCategoryEligibleForReview({
    primaryCategoryId: facts.primaryCategoryId,
    categoryFound: facts.categoryFound,
    categoryStatus: facts.categoryStatus,
  });
  if (!categoryGate.ok) {
    return {
      ok: false,
      capability,
      code:
        categoryGate.code === "inactive"
          ? "inactive_category"
          : "invalid_category",
      message: categoryGate.message,
    };
  }

  const eligibility = evaluateMarketplaceEligibility({
    productStatus: facts.productStatus,
    moderationStatus: facts.moderationStatus,
    marketplaceEligible: facts.marketplaceEligible,
    supplierStoreStatus: facts.supplierStoreStatus,
    supplierVerificationStatus: facts.supplierVerificationStatus,
    marketplaceSupplierEnabled: facts.marketplaceSupplierEnabled,
    sellerStoreStatus: facts.sellerStoreStatus,
    sellerVerificationStatus: facts.sellerVerificationStatus,
    sellerStoreId: facts.sellerStoreId,
    supplierStoreId: facts.supplierStoreId,
    priceAmountMinor: facts.priceAmountMinor,
    priceCurrency: facts.priceCurrency,
    productType: facts.productType,
    digitalPublishReady: facts.digitalPublishReady,
  });
  if (!eligibility.ok) {
    return {
      ok: false,
      capability,
      code: eligibility.code,
      message: eligibility.message,
    };
  }

  // Inventory model must be valid for the product type.
  // Listing publication ≠ sellable quantity — out-of-stock does not block create,
  // but missing/inconsistent finite inventory fails closed.
  if (isFiniteInventoryProductType(facts.productType)) {
    if (!facts.variantStatus || facts.variantStatus !== "active") {
      return {
        ok: false,
        capability,
        code: "invalid_inventory",
        message: "Finite inventory product requires an active variant.",
      };
    }
    const availability = resolveTrustedInventoryAvailability({
      productType: facts.productType,
      productStatus: facts.productStatus,
      variantStatus: facts.variantStatus,
      moderationStatus: facts.moderationStatus,
      inventory: facts.inventory,
    });
    if (
      availability.reasonCode === "missing_inventory" ||
      availability.reasonCode === "inconsistent_inventory" ||
      availability.reasonCode === "invalid_product_type"
    ) {
      return {
        ok: false,
        capability,
        code: "invalid_inventory",
        message: availability.message,
      };
    }
  } else {
    // Unlimited types: inventory may be absent; if present must not be inconsistent.
    if (facts.inventory) {
      const availability = resolveTrustedInventoryAvailability({
        productType: facts.productType,
        productStatus: facts.productStatus,
        variantStatus: facts.variantStatus ?? "active",
        moderationStatus: facts.moderationStatus,
        inventory: facts.inventory,
      });
      if (availability.reasonCode === "inconsistent_inventory") {
        return {
          ok: false,
          capability,
          code: "invalid_inventory",
          message: availability.message,
        };
      }
    }
  }

  if (facts.existingListing) {
    if (
      facts.existingListing.sellerStoreId !== facts.sellerStoreId ||
      facts.existingListing.sourceProductId !== facts.sourceProductId
    ) {
      return {
        ok: false,
        capability,
        code: "malformed_ownership",
        message: "Existing listing ownership is inconsistent.",
      };
    }
    if (facts.existingListing.supplierStoreId !== facts.supplierStoreId) {
      return {
        ok: false,
        capability,
        code: "malformed_ownership",
        message: "Existing listing supplier does not match source product store.",
      };
    }
    if (facts.existingListing.status === "active") {
      return {
        ok: false,
        capability,
        code: "duplicate_active",
        message: "An active listing already exists for this product.",
      };
    }
  }

  return {
    ok: true,
    capability,
    action: facts.existingListing ? "reactivate" : "create",
    listingStatus: "active",
    primaryCategoryId: facts.primaryCategoryId as string,
    inventoryOwnerStoreId: facts.supplierStoreId,
    fulfillmentPartyStoreId: facts.supplierStoreId,
  };
}

/** Listing create does not replace publish readiness, commission, or settlement SSOTs. */
export function supplierListingCreateCompatibility(): {
  replacesDigitalPublishReadiness: false;
  replacesCategoryGate: false;
  inventsCommission: false;
  inventsSettlementDecomposition: false;
  commissionPolicyId: typeof COMMISSION_POLICY_FOUNDATION_ID;
  note: string;
} {
  return {
    replacesDigitalPublishReadiness: false,
    replacesCategoryGate: false,
    inventsCommission: false,
    inventsSettlementDecomposition: false,
    commissionPolicyId: COMMISSION_POLICY_FOUNDATION_ID,
    note: "Create hardening reuses eligibility, category, inventory, and publish-readiness gates. Commission/settlement remain unavailable at listing create.",
  };
}
