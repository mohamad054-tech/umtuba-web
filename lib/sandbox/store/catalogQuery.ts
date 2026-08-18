import type { DemoCategorySlug } from "../../store/demo/types";
import { STORE_LISTING_VIEWS, type StoreListingView } from "./listings";

export const STORE_SORTS = ["featured", "price-asc", "price-desc", "title"] as const;
export type StoreSort = (typeof STORE_SORTS)[number];

export type CatalogQuery = {
  q?: string;
  category?: DemoCategorySlug | "all";
  sort?: StoreSort;
};

function priceOf(listing: StoreListingView): number {
  return listing.product.variants[0]?.priceMinor ?? 0;
}

export function parseStoreSort(value: string | undefined): StoreSort {
  return STORE_SORTS.includes(value as StoreSort) ? (value as StoreSort) : "featured";
}

export function queryStoreCatalog(
  input: CatalogQuery,
  listings: readonly StoreListingView[] = STORE_LISTING_VIEWS
): readonly StoreListingView[] {
  const needle = (input.q ?? "").trim().toLowerCase();
  const category = input.category && input.category !== "all" ? input.category : undefined;
  let rows = listings.filter((listing) => {
    if (category && listing.product.category !== category) return false;
    if (!needle) return true;
    const hay = [
      listing.product.title,
      listing.product.shortDescription,
      listing.product.category,
      listing.product.tags.join(" "),
      listing.commerceMode,
      listing.actor.displayName,
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(needle);
  });

  const sort = parseStoreSort(input.sort);
  if (sort === "price-asc") {
    rows = [...rows].sort((a, b) => priceOf(a) - priceOf(b));
  } else if (sort === "price-desc") {
    rows = [...rows].sort((a, b) => priceOf(b) - priceOf(a));
  } else if (sort === "title") {
    rows = [...rows].sort((a, b) => a.product.title.localeCompare(b.product.title));
  }
  return rows;
}
