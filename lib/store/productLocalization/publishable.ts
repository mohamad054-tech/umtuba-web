import type { StoreBrowseProduct } from "../../services/cj/expansionBrowse";
import { evaluateLocaleCompleteness } from "./localeCompleteness";
import type { LocalizedCatalogProduct } from "./types";

const BLOCKING_FLAGS = new Set([
  "LOCALIZATION_REVIEW",
  "PRODUCT_DATA_REVIEW",
  "IP_REVIEW",
  "PRICE_REVIEW",
  "SHIPPING_REVIEW",
  "UNAVAILABLE",
]);

export function isPublishableLocalizedRow(row: LocalizedCatalogProduct): boolean {
  if (row.status === "manual_review_required") return false;
  if (!row.quality.ok) return false;
  if (!row.localized.title_ar.trim() || !row.localized.description_ar.trim()) return false;
  if (!row.cover_url || !row.cover_url.startsWith("https://")) return false;
  if (row.localized.by_locale && !evaluateLocaleCompleteness(row.localized).complete) return false;
  return !(row.catalog_qa ?? []).some((item) => BLOCKING_FLAGS.has(item.flag));
}

export function isPublishableBrowseRow(
  browse: StoreBrowseProduct,
  row: LocalizedCatalogProduct | undefined
): boolean {
  if (!row || !isPublishableLocalizedRow(row)) return false;
  if (!browse.customerVisible) return false;
  if ((browse.economics.stock ?? 0) <= 0) return false;
  return true;
}

export function applyPublishableCustomerVisibility(
  items: StoreBrowseProduct[],
  byId: Map<string, LocalizedCatalogProduct>
): StoreBrowseProduct[] {
  return items.map((item) => {
    const row = byId.get(item.identity.cj_product_id);
    const publishable = isPublishableBrowseRow(item, row);
    return publishable ? item : { ...item, customerVisible: false };
  });
}

export function publishableStats(
  products: LocalizedCatalogProduct[],
  browseById: Map<string, StoreBrowseProduct>
): {
  publishable: number;
  held: number;
  avgMargin: number | null;
  avgDeliveryDays: number | null;
} {
  const publishableRows: StoreBrowseProduct[] = [];
  for (const row of products) {
    const browse = browseById.get(row.cj_product_id);
    if (browse && isPublishableBrowseRow(browse, row)) publishableRows.push(browse);
  }
  const margins = publishableRows
    .map((row) => row.economics.gross_margin)
    .filter((value): value is number => typeof value === "number");
  const days = publishableRows
    .map((row) => row.economics.delivery_days)
    .filter((value): value is number => typeof value === "number");
  return {
    publishable: publishableRows.length,
    held: products.length - publishableRows.length,
    avgMargin: margins.length ? margins.reduce((sum, value) => sum + value, 0) / margins.length : null,
    avgDeliveryDays: days.length ? days.reduce((sum, value) => sum + value, 0) / days.length : null,
  };
}
