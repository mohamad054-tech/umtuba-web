/**
 * Seller Catalog Availability display contract V1.
 * Maps trusted inventory foundation facts → seller catalog statuses.
 * No stored availability_status column. No preorder (unsupported).
 * Digital/unlimited types never pretend to be finite in_stock.
 */

import { availableUnits } from "./inventory";
import {
  isFiniteInventoryProductType,
  isUnlimitedInventoryProductType,
  resolveTrustedInventoryAvailability,
  type TrustedInventoryAvailabilityResult,
  type TrustedInventoryStockSnapshot,
} from "./sellerInventoryAvailabilityFoundation";
import type { SellerInventoryRow } from "./sellerInventoryQueries";

export const SELLER_CATALOG_AVAILABILITY_ID =
  "commerce.seller.catalog_availability_v1" as const;

/**
 * Seller-facing catalog statuses grounded in existing inventory facts.
 * `preorder` is intentionally absent — no schema/contract exists.
 */
export const SELLER_CATALOG_AVAILABILITY_STATUSES = [
  "in_stock",
  "out_of_stock",
  "backorder",
  "unlimited",
  "unavailable",
  "unknown",
] as const;

export type SellerCatalogAvailabilityStatus =
  (typeof SELLER_CATALOG_AVAILABILITY_STATUSES)[number];

/** Target statuses that cannot be invented without a new business contract. */
export const SELLER_CATALOG_AVAILABILITY_DEFERRED_STATUSES = [
  "preorder",
] as const;

const STATUS_SET = new Set<string>(SELLER_CATALOG_AVAILABILITY_STATUSES);

const AGGREGATE_RANK: Record<SellerCatalogAvailabilityStatus, number> = {
  unavailable: 0,
  out_of_stock: 1,
  unknown: 2,
  backorder: 3,
  in_stock: 4,
  unlimited: 5,
};

export function isSellerCatalogAvailabilityStatus(
  value: unknown
): value is SellerCatalogAvailabilityStatus {
  return typeof value === "string" && STATUS_SET.has(value);
}

/**
 * Fail-closed parse for any client-supplied availability token.
 * Unknown / preorder / empty → reject (never silently coerce to in_stock).
 */
export function parseSellerCatalogAvailabilityStatus(
  raw: unknown
):
  | { ok: true; value: SellerCatalogAvailabilityStatus }
  | { ok: false; message: string } {
  if (raw == null || (typeof raw === "string" && !raw.trim())) {
    return {
      ok: false,
      message: "Availability status is required.",
    };
  }
  if (typeof raw !== "string") {
    return { ok: false, message: "Availability status must be a string." };
  }
  const normalized = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "preorder") {
    return {
      ok: false,
      message:
        "Preorder is not supported — no trusted preorder contract exists.",
    };
  }
  if (!isSellerCatalogAvailabilityStatus(normalized)) {
    return {
      ok: false,
      message: `Unknown availability status "${raw}".`,
    };
  }
  return { ok: true, value: normalized };
}

export function sellerCatalogAvailabilityLabel(
  status: SellerCatalogAvailabilityStatus
): string {
  switch (status) {
    case "in_stock":
      return "In stock";
    case "out_of_stock":
      return "Out of stock";
    case "backorder":
      return "Backorder";
    case "unlimited":
      return "Unlimited";
    case "unavailable":
      return "Unavailable";
    case "unknown":
      return "Unknown";
  }
}

/** Map storefront/trusted resolver result → catalog status (no silent in_stock). */
export function mapTrustedAvailabilityToCatalogStatus(
  result: TrustedInventoryAvailabilityResult
): SellerCatalogAvailabilityStatus {
  switch (result.reasonCode) {
    case "finite_in_stock":
      return "in_stock";
    case "finite_out_of_stock":
      return "out_of_stock";
    case "finite_backorder":
      return "backorder";
    case "unlimited_digital_or_service":
      return "unlimited";
    case "missing_inventory":
    case "inconsistent_inventory":
    case "product_unavailable":
    case "variant_unavailable":
    case "invalid_product_type":
      return "unavailable";
    default:
      return "unavailable";
  }
}

/**
 * Seller workspace display from product type + inventory seed.
 * Ignores product publish status so drafts still show seed availability,
 * but never treats missing/null finite inventory as in_stock.
 */
export function deriveSellerCatalogAvailabilityDisplay(input: {
  productType: string;
  inventory: TrustedInventoryStockSnapshot | null;
}): SellerCatalogAvailabilityStatus {
  if (isUnlimitedInventoryProductType(input.productType)) {
    return "unlimited";
  }
  if (!isFiniteInventoryProductType(input.productType)) {
    return "unavailable";
  }
  if (!input.inventory) {
    return "unavailable";
  }
  const { onHand, reserved, safetyStock, allowBackorder } = input.inventory;
  if (
    ![onHand, reserved, safetyStock].every(
      (n) => typeof n === "number" && Number.isInteger(n) && Number.isFinite(n)
    ) ||
    onHand < 0 ||
    reserved < 0 ||
    safetyStock < 0 ||
    reserved > onHand
  ) {
    return "unavailable";
  }
  const available = availableUnits({ onHand, reserved, safetyStock });
  if (available > 0) return "in_stock";
  if (allowBackorder) return "backorder";
  return "out_of_stock";
}

export function deriveSellerCatalogAvailabilityFromInventoryRow(
  row: Pick<
    SellerInventoryRow,
    | "productType"
    | "productStatus"
    | "variantStatus"
    | "missingInventory"
    | "onHand"
    | "reserved"
    | "safetyStock"
    | "allowBackorder"
    | "availabilityMode"
  >
): SellerCatalogAvailabilityStatus {
  // Prefer workspace seed display for non-active catalog rows; storefront
  // sellability still uses resolveTrustedInventoryAvailability elsewhere.
  if (row.availabilityMode === "unlimited") {
    return "unlimited";
  }
  if (row.missingInventory) {
    return "unavailable";
  }
  if (
    row.onHand == null ||
    row.reserved == null ||
    row.safetyStock == null ||
    row.allowBackorder == null
  ) {
    return "unknown";
  }
  return deriveSellerCatalogAvailabilityDisplay({
    productType: row.productType,
    inventory: {
      onHand: row.onHand,
      reserved: row.reserved,
      safetyStock: row.safetyStock,
      allowBackorder: Boolean(row.allowBackorder),
    },
  });
}

/** Most restrictive status across variants wins (fail closed). */
export function aggregateSellerCatalogAvailabilityStatuses(
  statuses: readonly SellerCatalogAvailabilityStatus[]
): SellerCatalogAvailabilityStatus {
  if (statuses.length === 0) return "unknown";
  let worst: SellerCatalogAvailabilityStatus = statuses[0]!;
  for (const status of statuses) {
    if (AGGREGATE_RANK[status] < AGGREGATE_RANK[worst]) {
      worst = status;
    }
  }
  return worst;
}

export function indexSellerCatalogAvailabilityByProductId(
  rows: readonly SellerInventoryRow[]
): Map<string, SellerCatalogAvailabilityStatus> {
  const grouped = new Map<string, SellerCatalogAvailabilityStatus[]>();
  for (const row of rows) {
    const id = String(row.productId ?? "").trim();
    if (!id) continue;
    const status = deriveSellerCatalogAvailabilityFromInventoryRow(row);
    const bag = grouped.get(id) ?? [];
    bag.push(status);
    grouped.set(id, bag);
  }
  const out = new Map<string, SellerCatalogAvailabilityStatus>();
  for (const [id, bag] of grouped) {
    out.set(id, aggregateSellerCatalogAvailabilityStatuses(bag));
  }
  return out;
}

/**
 * Storefront-aligned claim — uses trusted resolver (active product/variant).
 * Useful for editor “live sellability” notes; not for silent catalog fallbacks.
 */
export function resolveSellerCatalogStorefrontAvailability(input: {
  productType: string;
  productStatus: string;
  variantStatus: string;
  inventory: TrustedInventoryStockSnapshot | null;
}): {
  status: SellerCatalogAvailabilityStatus;
  trusted: TrustedInventoryAvailabilityResult;
} {
  const trusted = resolveTrustedInventoryAvailability({
    productType: input.productType,
    productStatus: input.productStatus,
    variantStatus: input.variantStatus,
    inventory: input.inventory,
  });
  return {
    status: mapTrustedAvailabilityToCatalogStatus(trusted),
    trusted,
  };
}
