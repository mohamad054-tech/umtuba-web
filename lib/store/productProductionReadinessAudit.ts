/**
 * Product Production Readiness Audit V1.
 * Single trusted server-side evaluation: READY | NOT_READY + ordered blockers.
 * Reuses category, inventory, digital publish readiness, marketplace eligibility,
 * commerce confirm, commission/settlement/payout compatibility helpers.
 * No client trust. Fail closed. No Dashboard/AI. No duplicate validation systems.
 */

import { assertPrimaryCategoryEligibleForReview } from "./categoryTaxonomySeed";
import {
  decideCommerceConfirmAllowed,
} from "./commerceSafety";
import {
  COMMISSION_POLICY_FOUNDATION_ID,
  commissionDoesNotAlterSettlementAmount,
  commissionDoesNotEnablePayoutExecution,
} from "./commissionPolicyFoundation";
import { evaluateDigitalProductPublishReadiness } from "./digitalProductPublishReadiness";
import { normalizeCurrencyCode } from "./money";
import {
  buildMarketplaceRevenueBridgeProvenance,
  evaluateMarketplaceEligibility,
} from "./marketplaceSupplierSeller";
import {
  isFiniteInventoryProductType,
  resolveTrustedInventoryAvailability,
  type TrustedInventoryStockSnapshot,
} from "./sellerInventoryAvailabilityFoundation";
import { supplierListingCreateCompatibility } from "./supplierListingCreateHardening";

export const PRODUCT_PRODUCTION_READINESS_AUDIT_ID =
  "commerce.product.production_readiness_audit_v1" as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export type ProductionReadinessVerdict = "READY" | "NOT_READY";

export type ProductionReadinessBlockerCode =
  | "malformed_id"
  | "store_inactive"
  | "seller_unverified"
  | "ownership_mismatch"
  | "invalid_category"
  | "inactive_category"
  | "digital_asset_not_ready"
  | "invalid_inventory"
  | "invalid_pricing"
  | "failed_moderation"
  | "product_unpublished"
  | "physical_gate"
  | "marketplace_ineligible"
  | "supplier_integrity"
  | "invalid_listing"
  | "duplicate_listing"
  | "settlement_incompatible"
  | "payout_incompatible"
  | "commission_incompatible";

export type ProductionReadinessBlocker = {
  code: ProductionReadinessBlockerCode;
  message: string;
};

/** Server-loaded facts only — never trust client-supplied readiness claims. */
export type ProductProductionReadinessFacts = {
  productId: string;
  storeId: string;
  /** Must equal storeId for owned products. */
  productStoreId: string;
  storeStatus: string;
  storeVerificationStatus: string;
  productType: string;
  productStatus: string;
  moderationStatus: string;
  marketplaceEligible: boolean;
  primaryCategoryId: string | null;
  categoryFound: boolean;
  categoryStatus: string | null;
  priceAmountMinor: number | null;
  priceCurrency: string | null;
  variantStatus: string | null;
  inventory: TrustedInventoryStockSnapshot | null;
  /** Required when productType === digital — pass server-fetched asset or null. */
  digitalAsset: {
    storeId: string;
    productId: string;
    status: string;
    storagePath: string;
  } | null;
  /** DB commerce_confirm_enabled (never from client). */
  commerceConfirmEnabled: boolean;
  /** Optional env kill-switch source; defaults to process.env inside evaluator. */
  commerceConfirmEnv?: Record<string, string | undefined>;
  /**
   * When marketplaceEligible or listing present, supplier/seller eligibility facts.
   * For owned marketplace-eligible products, supplier === owning store.
   */
  supplierStoreId?: string | null;
  supplierStoreStatus?: string | null;
  supplierVerificationStatus?: string | null;
  marketplaceSupplierEnabled?: boolean | null;
  sellerStoreId?: string | null;
  sellerStoreStatus?: string | null;
  sellerVerificationStatus?: string | null;
  /** Existing listing for integrity / duplicate checks (optional). */
  listing?: {
    id: string;
    status: string;
    sellerStoreId: string;
    sourceProductId: string;
    supplierStoreId: string;
  } | null;
  /** Other active listing id for same seller+product (duplicate). */
  duplicateActiveListingId?: string | null;
};

export type ProductProductionReadinessResult = {
  capability: typeof PRODUCT_PRODUCTION_READINESS_AUDIT_ID;
  verdict: ProductionReadinessVerdict;
  blockers: ProductionReadinessBlocker[];
  checks: {
    sellerVerified: boolean;
    storeActive: boolean;
    ownershipOk: boolean;
    categoryOk: boolean;
    publishReadinessOk: boolean;
    inventoryOk: boolean;
    pricingOk: boolean;
    moderationOk: boolean;
    physicalGateOk: boolean;
    marketplaceOk: boolean;
    listingOk: boolean;
    settlementCompatible: boolean;
    payoutCompatible: boolean;
    commissionCompatible: boolean;
  };
};

function push(
  blockers: ProductionReadinessBlocker[],
  code: ProductionReadinessBlockerCode,
  message: string
): void {
  blockers.push({ code, message });
}

/**
 * Deterministic production readiness audit. Callers must supply server-loaded facts.
 */
export function evaluateProductProductionReadiness(
  facts: ProductProductionReadinessFacts
): ProductProductionReadinessResult {
  const blockers: ProductionReadinessBlocker[] = [];

  const checks = {
    sellerVerified: false,
    storeActive: false,
    ownershipOk: false,
    categoryOk: false,
    publishReadinessOk: false,
    inventoryOk: false,
    pricingOk: false,
    moderationOk: false,
    physicalGateOk: false,
    marketplaceOk: false,
    listingOk: false,
    settlementCompatible: false,
    payoutCompatible: false,
    commissionCompatible: false,
  };

  if (
    !isUuid(facts.productId) ||
    !isUuid(facts.storeId) ||
    !isUuid(facts.productStoreId)
  ) {
    push(blockers, "malformed_id", "Product or store identifiers are invalid.");
    return finalize(blockers, checks);
  }

  // Store active
  checks.storeActive = facts.storeStatus === "active";
  if (!checks.storeActive) {
    push(blockers, "store_inactive", "Store must be active.");
  }

  // Seller verified
  checks.sellerVerified = facts.storeVerificationStatus === "verified";
  if (!checks.sellerVerified) {
    push(blockers, "seller_unverified", "Seller store must be verified.");
  }

  // Ownership
  checks.ownershipOk = facts.productStoreId === facts.storeId;
  if (!checks.ownershipOk) {
    push(
      blockers,
      "ownership_mismatch",
      "Product does not belong to the evaluated store."
    );
  }

  // Category
  const categoryGate = assertPrimaryCategoryEligibleForReview({
    primaryCategoryId: facts.primaryCategoryId,
    categoryFound: facts.categoryFound,
    categoryStatus: facts.categoryStatus,
  });
  if (!categoryGate.ok) {
    push(
      blockers,
      categoryGate.code === "inactive" ? "inactive_category" : "invalid_category",
      categoryGate.message
    );
  } else {
    checks.categoryOk = true;
  }

  // Pricing (trusted minor + currency)
  const currency = normalizeCurrencyCode(facts.priceCurrency ?? "");
  checks.pricingOk =
    facts.priceAmountMinor != null &&
    Number.isInteger(facts.priceAmountMinor) &&
    facts.priceAmountMinor >= 0 &&
    Boolean(currency);
  if (!checks.pricingOk) {
    push(
      blockers,
      "invalid_pricing",
      "Trusted selling price is missing or invalid."
    );
  }

  // Moderation + product status
  checks.moderationOk = facts.moderationStatus === "approved";
  if (!checks.moderationOk) {
    push(
      blockers,
      "failed_moderation",
      "Product must be approved before production."
    );
  }
  if (facts.productStatus !== "active") {
    push(
      blockers,
      "product_unpublished",
      "Product must be active for production."
    );
  }

  // Digital publish readiness (reuse SSOT)
  const digital = evaluateDigitalProductPublishReadiness({
    productType: facts.productType,
    storeId: facts.storeId,
    productId: facts.productId,
    asset: facts.digitalAsset,
  });
  checks.publishReadinessOk = digital.ready;
  if (!digital.ready) {
    push(
      blockers,
      "digital_asset_not_ready",
      digital.message ||
        "Digital product is missing an active owned deliverable."
    );
  }

  // Inventory model (reuse availability foundation)
  if (isFiniteInventoryProductType(facts.productType)) {
    if (!facts.variantStatus || facts.variantStatus !== "active") {
      push(
        blockers,
        "invalid_inventory",
        "Finite inventory product requires an active variant."
      );
    } else {
      const availability = resolveTrustedInventoryAvailability({
        productType: facts.productType,
        productStatus: facts.productStatus === "active" ? "active" : "active",
        variantStatus: facts.variantStatus,
        moderationStatus: facts.moderationStatus,
        inventory: facts.inventory,
      });
      // For audit, require consistent inventory model — out-of-stock is OK for catalog.
      if (
        availability.reasonCode === "missing_inventory" ||
        availability.reasonCode === "inconsistent_inventory" ||
        availability.reasonCode === "invalid_product_type"
      ) {
        push(blockers, "invalid_inventory", availability.message);
      } else {
        checks.inventoryOk = true;
      }
    }
  } else {
    // Unlimited types: absent inventory OK; inconsistent row fails.
    if (facts.inventory) {
      const availability = resolveTrustedInventoryAvailability({
        productType: facts.productType,
        productStatus: "active",
        variantStatus: facts.variantStatus ?? "active",
        moderationStatus: facts.moderationStatus,
        inventory: facts.inventory,
      });
      if (availability.reasonCode === "inconsistent_inventory") {
        push(blockers, "invalid_inventory", availability.message);
      } else {
        checks.inventoryOk = true;
      }
    } else {
      checks.inventoryOk = true;
    }
  }

  // Physical launch gate
  if (facts.productType === "physical") {
    const gate = decideCommerceConfirmAllowed({
      dbEnabled: facts.commerceConfirmEnabled,
      env: facts.commerceConfirmEnv,
    });
    checks.physicalGateOk = gate.allowed;
    if (!gate.allowed) {
      push(
        blockers,
        "physical_gate",
        gate.message ||
          "Physical commerce confirm gate is OFF — physical products are not production-sellable."
      );
    }
  } else {
    checks.physicalGateOk = true;
  }

  // Marketplace eligibility + supplier integrity (when flagged or listing present)
  const needsMarketplace =
    facts.marketplaceEligible || Boolean(facts.listing);
  if (needsMarketplace) {
    const supplierStoreId = String(
      facts.supplierStoreId ?? facts.productStoreId ?? ""
    );
    const sellerStoreId = String(facts.sellerStoreId ?? facts.storeId);
    if (!isUuid(supplierStoreId)) {
      push(
        blockers,
        "supplier_integrity",
        "Supplier store identity is missing or invalid."
      );
    } else if (supplierStoreId !== facts.productStoreId) {
      push(
        blockers,
        "supplier_integrity",
        "Supplier store does not match product owner store."
      );
    } else {
      const eligibility = evaluateMarketplaceEligibility({
        productStatus: facts.productStatus,
        moderationStatus: facts.moderationStatus,
        marketplaceEligible: facts.marketplaceEligible,
        supplierStoreStatus: String(
          facts.supplierStoreStatus ?? facts.storeStatus
        ),
        supplierVerificationStatus: String(
          facts.supplierVerificationStatus ?? facts.storeVerificationStatus
        ),
        marketplaceSupplierEnabled:
          facts.marketplaceSupplierEnabled === true ||
          // Owned listing on same store: supplier flag not required for owned path
          sellerStoreId === supplierStoreId,
        sellerStoreStatus: String(
          facts.sellerStoreStatus ?? facts.storeStatus
        ),
        sellerVerificationStatus: String(
          facts.sellerVerificationStatus ?? facts.storeVerificationStatus
        ),
        sellerStoreId,
        supplierStoreId,
        priceAmountMinor: facts.priceAmountMinor,
        priceCurrency: facts.priceCurrency,
        productType: facts.productType,
        digitalPublishReady: digital.ready,
      });
      // Same-store owned marketplace: evaluateMarketplaceEligibility rejects same_store.
      // For owned production readiness with marketplaceEligible, treat same-store as OK
      // when no cross-store listing is present.
      if (
        !eligibility.ok &&
        eligibility.code === "same_store" &&
        !facts.listing &&
        sellerStoreId === supplierStoreId
      ) {
        checks.marketplaceOk = facts.marketplaceEligible === true;
        if (!checks.marketplaceOk) {
          push(
            blockers,
            "marketplace_ineligible",
            "Product is not marketplace-eligible."
          );
        }
      } else if (!eligibility.ok) {
        if (
          eligibility.code === "supplier_not_enabled" ||
          eligibility.code === "supplier_inactive" ||
          eligibility.code === "supplier_unverified"
        ) {
          push(blockers, "supplier_integrity", eligibility.message);
        } else if (eligibility.code === "product_not_eligible") {
          push(blockers, "marketplace_ineligible", eligibility.message);
        } else if (eligibility.code === "missing_price") {
          // already covered by pricing; keep marketplace note if needed
          push(blockers, "marketplace_ineligible", eligibility.message);
        } else if (eligibility.code === "digital_asset_not_ready") {
          // already covered
        } else {
          push(blockers, "marketplace_ineligible", eligibility.message);
        }
      } else {
        checks.marketplaceOk = true;
      }
    }
  } else {
    checks.marketplaceOk = true;
  }

  // Listing integrity + duplicate
  if (facts.listing) {
    const listing = facts.listing;
    let listingOk = true;
    if (!isUuid(listing.id)) {
      listingOk = false;
      push(blockers, "invalid_listing", "Listing identifier is invalid.");
    }
    if (listing.sourceProductId !== facts.productId) {
      listingOk = false;
      push(
        blockers,
        "invalid_listing",
        "Listing source product does not match product."
      );
    }
    if (listing.supplierStoreId !== facts.productStoreId) {
      listingOk = false;
      push(
        blockers,
        "supplier_integrity",
        "Listing supplier does not match product owner store."
      );
    }
    if (listing.sellerStoreId && !isUuid(listing.sellerStoreId)) {
      listingOk = false;
      push(blockers, "invalid_listing", "Listing seller store is invalid.");
    }
    if (listing.status !== "active") {
      listingOk = false;
      push(
        blockers,
        "invalid_listing",
        "Listing must be active for production."
      );
    }
    if (
      facts.duplicateActiveListingId &&
      isUuid(facts.duplicateActiveListingId) &&
      facts.duplicateActiveListingId !== listing.id
    ) {
      listingOk = false;
      push(
        blockers,
        "duplicate_listing",
        "Another active listing already exists for this seller and product."
      );
    }
    checks.listingOk = listingOk;
  } else {
    checks.listingOk = true;
    if (
      facts.duplicateActiveListingId &&
      isUuid(facts.duplicateActiveListingId)
    ) {
      push(
        blockers,
        "duplicate_listing",
        "An active listing already exists for this seller and product."
      );
      checks.listingOk = false;
    }
  }

  // Settlement / payout / commission compatibility (reuse — do not invent amounts)
  const provenance = buildMarketplaceRevenueBridgeProvenance({
    sellerStoreId: String(facts.sellerStoreId ?? facts.storeId),
    supplierStoreId: facts.supplierStoreId ?? facts.productStoreId,
    listingId: facts.listing?.id ?? null,
    marketplaceSourceType: facts.listing ? "supplier_listing" : "owned",
  });
  checks.settlementCompatible =
    provenance.settlementDecomposition === "unavailable";
  if (!checks.settlementCompatible) {
    push(
      blockers,
      "settlement_incompatible",
      "Settlement decomposition must remain unavailable without a trusted policy."
    );
  }

  // payout: foundation must not enable execution
  checks.payoutCompatible = commissionDoesNotEnablePayoutExecution() === false;
  if (!checks.payoutCompatible) {
    push(
      blockers,
      "payout_incompatible",
      "Payout execution must remain disabled at product readiness."
    );
  }

  const listingCompat = supplierListingCreateCompatibility();
  checks.commissionCompatible =
    listingCompat.inventsCommission === false &&
    listingCompat.commissionPolicyId === COMMISSION_POLICY_FOUNDATION_ID &&
    commissionDoesNotAlterSettlementAmount({
      captureAmountMinor: facts.priceAmountMinor ?? 0,
      commission: null,
    });
  if (!checks.commissionCompatible) {
    push(
      blockers,
      "commission_incompatible",
      "Commission must not invent settlement amounts at product readiness."
    );
  }

  return finalize(blockers, checks);
}

function finalize(
  blockers: ProductionReadinessBlocker[],
  checks: ProductProductionReadinessResult["checks"]
): ProductProductionReadinessResult {
  // Deduplicate codes preserving first message order
  const seen = new Set<string>();
  const ordered: ProductionReadinessBlocker[] = [];
  for (const b of blockers) {
    const key = `${b.code}:${b.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    ordered.push(b);
  }

  return {
    capability: PRODUCT_PRODUCTION_READINESS_AUDIT_ID,
    verdict: ordered.length === 0 ? "READY" : "NOT_READY",
    blockers: ordered,
    checks,
  };
}

/**
 * Reject client-claimed readiness / money / ownership fields.
 */
export function rejectClientProductionReadinessFields(
  input: Record<string, unknown>
): { ok: true } | { ok: false; message: string } {
  for (const key of Object.keys(input)) {
    if (
      /^(verdict|ready|blockers|checks|on_hand|onHand|reserved|available|commission|settlement|listing_id|listingId|supplier_store_id|moderation_status|marketplace_eligible|commerce_confirm)/i.test(
        key
      ) ||
      key === "ownershipOk" ||
      key === "publishReadinessOk"
    ) {
      return {
        ok: false,
        message:
          "Client must not supply production readiness, ownership, or money fields.",
      };
    }
  }
  return { ok: true };
}
