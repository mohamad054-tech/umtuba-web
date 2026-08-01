/**
 * Seller Catalog Search & Filtering Foundation V1.
 * Pure in-memory search/filter/sort over store-scoped catalog items.
 * Relies on existing health codes; does not invent analytics sorts.
 */

import type { SellerProductHealthCode } from "./sellerExperienceFoundation";
import type { SellerCatalogListItem } from "./sellerCatalogPresentation";

export const SELLER_CATALOG_SEARCH_FILTERING_ID =
  "commerce.seller.catalog_search_filtering_v1" as const;

export type SellerCatalogStatusFilter =
  | "all"
  | "draft"
  | "published"
  | "pending_review"
  | "rejected"
  | "ready"
  | "needs_attention";

export type SellerCatalogHealthFilter =
  | "any"
  | "missing_images"
  | "missing_description"
  | "missing_pricing"
  | "missing_inventory"
  | "missing_digital_asset"
  | "missing_physical_metadata";

export type SellerCatalogProductTypeFilter =
  | "all"
  | "digital"
  | "physical"
  | "other";

export type SellerCatalogSearchSortKey =
  | "newest"
  | "oldest"
  | "updated_desc"
  | "updated_asc"
  | "title_asc"
  | "title_desc";

export type SellerCatalogSearchItem = SellerCatalogListItem & {
  storeId: string;
  skus: string[];
  barcodes: string[];
  healthCodes: SellerProductHealthCode[];
};

export const SELLER_CATALOG_STATUS_FILTERS: Array<{
  id: SellerCatalogStatusFilter;
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "published", label: "Published" },
  { id: "pending_review", label: "Pending Review" },
  { id: "rejected", label: "Rejected" },
  { id: "ready", label: "Ready" },
  { id: "needs_attention", label: "Needs Attention" },
];

export const SELLER_CATALOG_HEALTH_FILTERS: Array<{
  id: SellerCatalogHealthFilter;
  label: string;
}> = [
  { id: "any", label: "Any health" },
  { id: "missing_images", label: "Missing Images" },
  { id: "missing_description", label: "Missing Description" },
  { id: "missing_pricing", label: "Missing Price" },
  { id: "missing_inventory", label: "Missing Inventory" },
  { id: "missing_digital_asset", label: "Missing Digital Asset" },
  { id: "missing_physical_metadata", label: "Missing Physical Metadata" },
];

export const SELLER_CATALOG_TYPE_FILTERS: Array<{
  id: SellerCatalogProductTypeFilter;
  label: string;
}> = [
  { id: "all", label: "All types" },
  { id: "digital", label: "Digital" },
  { id: "physical", label: "Physical" },
  { id: "other", label: "Other" },
];

export const SELLER_CATALOG_SEARCH_SORTS: Array<{
  id: SellerCatalogSearchSortKey;
  label: string;
}> = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "updated_desc", label: "Last Updated" },
  { id: "updated_asc", label: "Oldest Updated" },
  { id: "title_asc", label: "Name A–Z" },
  { id: "title_desc", label: "Name Z–A" },
];

const ATTENTION_CODES: readonly SellerProductHealthCode[] = [
  "missing_title",
  "missing_images",
  "missing_description",
  "missing_pricing",
  "missing_category",
  "missing_inventory",
  "missing_digital_asset",
  "missing_physical_metadata",
  "rejected",
];

export function normalizeCatalogSearchQuery(query: string | null | undefined): string {
  return String(query ?? "").trim().toLowerCase();
}

export function productMatchesCatalogSearchQuery(
  item: SellerCatalogSearchItem,
  query: string | null | undefined
): boolean {
  const q = normalizeCatalogSearchQuery(query);
  if (!q) return true;

  if (item.id.toLowerCase().includes(q)) return true;
  if (item.title.toLowerCase().includes(q)) return true;
  if (item.slug.toLowerCase().includes(q)) return true;
  if ((item.shortDescription ?? "").toLowerCase().includes(q)) return true;

  for (const sku of item.skus) {
    if (sku.toLowerCase().includes(q)) return true;
  }
  for (const barcode of item.barcodes) {
    if (barcode.toLowerCase().includes(q)) return true;
  }
  return false;
}

export function productMatchesCatalogStatusFilter(
  item: SellerCatalogSearchItem,
  filter: SellerCatalogStatusFilter
): boolean {
  if (filter === "all") return true;

  const status = String(item.status ?? "");
  const moderation = String(item.moderationStatus ?? "");
  const codes = item.healthCodes;

  switch (filter) {
    case "draft":
      return status === "draft";
    case "published":
      return status === "active";
    case "pending_review":
      // Product workflow status only — draft+moderation pending is not "in review".
      return status === "in_review" || status === "pending_review";
    case "rejected":
      return status === "rejected" || moderation === "rejected";
    case "ready":
      return (
        codes.includes("ready_to_publish") || codes.includes("complete")
      );
    case "needs_attention":
      return ATTENTION_CODES.some((code) => codes.includes(code));
    default:
      return true;
  }
}

export function productMatchesCatalogHealthFilter(
  item: SellerCatalogSearchItem,
  filter: SellerCatalogHealthFilter
): boolean {
  if (filter === "any") return true;
  return item.healthCodes.includes(filter);
}

export function productMatchesCatalogTypeFilter(
  item: SellerCatalogSearchItem,
  filter: SellerCatalogProductTypeFilter
): boolean {
  if (filter === "all") return true;
  const type = String(item.productType ?? "").toLowerCase();
  if (filter === "digital") return type === "digital";
  if (filter === "physical") return type === "physical";
  return type !== "digital" && type !== "physical";
}

export function filterSellerCatalogSearchItems(
  items: readonly SellerCatalogSearchItem[],
  input: {
    storeId: string;
    query?: string;
    status?: SellerCatalogStatusFilter;
    health?: SellerCatalogHealthFilter;
    productType?: SellerCatalogProductTypeFilter;
    sort?: SellerCatalogSearchSortKey;
  }
): SellerCatalogSearchItem[] {
  const storeId = String(input.storeId ?? "").trim();
  const status = input.status ?? "all";
  const health = input.health ?? "any";
  const productType = input.productType ?? "all";
  const sort = input.sort ?? "updated_desc";

  let next = items.filter((item) => {
    // Security: never surface another store's rows even if mixed into the array.
    if (String(item.storeId ?? "") !== storeId) return false;
    if (!productMatchesCatalogStatusFilter(item, status)) return false;
    if (!productMatchesCatalogHealthFilter(item, health)) return false;
    if (!productMatchesCatalogTypeFilter(item, productType)) return false;
    if (!productMatchesCatalogSearchQuery(item, input.query)) return false;
    return true;
  });

  next = [...next].sort((a, b) => {
    switch (sort) {
      case "newest":
        return b.createdAt.localeCompare(a.createdAt);
      case "oldest":
        return a.createdAt.localeCompare(b.createdAt);
      case "title_asc":
        return a.title.localeCompare(b.title);
      case "title_desc":
        return b.title.localeCompare(a.title);
      case "updated_asc":
        return a.updatedAt.localeCompare(b.updatedAt);
      case "updated_desc":
      default:
        return b.updatedAt.localeCompare(a.updatedAt);
    }
  });

  return next;
}

export type SellerCatalogVariantSearchToken = {
  productId: string;
  sku: string | null;
  barcode: string | null;
};

/**
 * Map variant rows → per-product SKU/barcode bags (deterministic, deduped).
 * Ignores product IDs outside `allowedProductIds`.
 */
export function indexVariantSearchTokens(
  rows: readonly SellerCatalogVariantSearchToken[],
  allowedProductIds: readonly string[]
): Map<string, { skus: string[]; barcodes: string[] }> {
  const allowed = new Set(allowedProductIds.map((id) => String(id)));
  const out = new Map<string, { skus: string[]; barcodes: string[] }>();

  for (const row of rows) {
    const productId = String(row.productId ?? "");
    if (!productId || !allowed.has(productId)) continue;
    let bag = out.get(productId);
    if (!bag) {
      bag = { skus: [], barcodes: [] };
      out.set(productId, bag);
    }
    const sku = String(row.sku ?? "").trim();
    if (sku && !bag.skus.includes(sku)) bag.skus.push(sku);
    const barcode = String(row.barcode ?? "").trim();
    if (barcode && !bag.barcodes.includes(barcode)) bag.barcodes.push(barcode);
  }

  return out;
}

export function buildSellerCatalogSearchItems(input: {
  storeId: string;
  items: readonly SellerCatalogListItem[];
  /** product.store_id for each list item id (optional; falls back to storeId). */
  storeIdByProductId?: ReadonlyMap<string, string>;
  variantTokens?: ReadonlyMap<string, { skus: string[]; barcodes: string[] }>;
  healthCodesByProductId?: ReadonlyMap<string, SellerProductHealthCode[]>;
}): SellerCatalogSearchItem[] {
  const storeId = String(input.storeId ?? "").trim();
  return input.items.map((item) => {
    const ownedStoreId =
      input.storeIdByProductId?.get(item.id) ?? storeId;
    const tokens = input.variantTokens?.get(item.id);
    return {
      ...item,
      storeId: ownedStoreId,
      skus: tokens?.skus ?? [],
      barcodes: tokens?.barcodes ?? [],
      healthCodes: input.healthCodesByProductId?.get(item.id) ?? [],
    };
  });
}
