import type { PublicCatalogItem } from "../../../lib/store/types";
import type { ProductCategoryRow } from "../../../lib/store/types";
import { isLegitimateCompareAt } from "../../../lib/store/tradingContracts";

export type FeaturedStore = {
  id: string;
  slug: string;
  name: string;
  logoPath: string | null;
  productCount: number;
};

/** Pure presentation helpers — does not touch product domain modules. */
export function deriveFeaturedStores(items: PublicCatalogItem[]): FeaturedStore[] {
  const map = new Map<string, FeaturedStore>();
  for (const item of items) {
    const existing = map.get(item.store.id);
    if (existing) {
      existing.productCount += 1;
    } else {
      map.set(item.store.id, {
        id: item.store.id,
        slug: item.store.slug,
        name: item.store.name,
        logoPath: item.store.logo_path,
        productCount: 1,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.productCount - a.productCount);
}

export function pickTrending(items: PublicCatalogItem[], limit = 8): PublicCatalogItem[] {
  return [...items]
    .sort((a, b) => {
      const avail = (b.available ?? 0) - (a.available ?? 0);
      if (avail !== 0) return avail;
      const ap = a.product.published_at ?? a.product.created_at;
      const bp = b.product.published_at ?? b.product.created_at;
      return bp.localeCompare(ap);
    })
    .slice(0, limit);
}

export function pickNewArrivals(items: PublicCatalogItem[], limit = 8): PublicCatalogItem[] {
  return [...items]
    .sort((a, b) => {
      const ap = a.product.published_at ?? a.product.created_at;
      const bp = b.product.published_at ?? b.product.created_at;
      return bp.localeCompare(ap);
    })
    .slice(0, limit);
}

export function pickRecommended(
  items: PublicCatalogItem[],
  excludeProductId?: string,
  limit = 8
): PublicCatalogItem[] {
  return items
    .filter((i) => i.product.id !== excludeProductId)
    .filter((i) => (i.available == null ? true : i.available > 0))
    .slice(0, limit);
}

/** Categories with enough catalog coverage become curated collection chips. */
export function deriveCuratedCollections(
  items: PublicCatalogItem[],
  categories: ProductCategoryRow[],
  limit = 6
): Array<ProductCategoryRow & { productCount: number }> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const id = item.product.primary_category_id;
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return categories
    .map((category) => ({
      ...category,
      productCount: counts.get(category.id) ?? 0,
    }))
    .filter((c) => c.productCount > 0)
    .sort(
      (a, b) =>
        b.productCount - a.productCount ||
        (a.sort_order ?? 0) - (b.sort_order ?? 0)
    )
    .slice(0, limit);
}

export function filterCatalogByAvailability(
  items: PublicCatalogItem[],
  availability: string
): PublicCatalogItem[] {
  if (availability === "in_stock") {
    return items.filter((item) => (item.available ?? 0) > 0);
  }
  return items;
}

export function sortCatalogItems(
  items: PublicCatalogItem[],
  sort: string
): PublicCatalogItem[] {
  const copy = [...items];
  switch (sort) {
    case "price_asc":
      return copy.sort(
        (a, b) =>
          (a.priceMinor ?? Number.POSITIVE_INFINITY) -
          (b.priceMinor ?? Number.POSITIVE_INFINITY)
      );
    case "price_desc":
      return copy.sort((a, b) => (b.priceMinor ?? -1) - (a.priceMinor ?? -1));
    case "title":
      return copy.sort((a, b) => a.product.title.localeCompare(b.product.title));
    case "newest":
    default:
      return copy.sort((a, b) => {
        const ap = a.product.published_at ?? a.product.created_at;
        const bp = b.product.published_at ?? b.product.created_at;
        return bp.localeCompare(ap);
      });
  }
}

export function heroSlidesFromCatalog(items: PublicCatalogItem[]): Array<{
  id: string;
  title: string;
  subtitle: string;
  href: string;
  imageUrl?: string | null;
  ctaLabel?: string;
}> {
  const picks = pickTrending(items, 3).filter((i) => i.coverUrl);
  const fallbackPicks = picks.length > 0 ? picks : pickTrending(items, 3);
  if (fallbackPicks.length === 0) {
    return [];
  }
  return fallbackPicks.map((item) => ({
    id: item.product.id,
    title: item.product.title,
    subtitle: `${item.store.name}${
      item.product.short_description
        ? ` · ${item.product.short_description}`
        : ""
    }`,
    href: `/store/${item.store.slug}/product/${item.product.slug}`,
    imageUrl: item.coverUrl ?? null,
  }));
}

export function categoryHref(category: ProductCategoryRow): string {
  return `/store/search?category=${encodeURIComponent(category.id)}`;
}

export function hasLegitimateCompareAt(item: PublicCatalogItem): boolean {
  return isLegitimateCompareAt(item.priceMinor, item.compareAtMinor);
}

/** UI-only percent off. Null when compare-at is not a legitimate catalog discount. */
export function compareAtSavePercent(
  priceMinor: number | null | undefined,
  compareAtMinor: number | null | undefined
): number | null {
  if (!isLegitimateCompareAt(priceMinor, compareAtMinor)) return null;
  const price = priceMinor as number;
  const compareAt = compareAtMinor as number;
  const pct = Math.round(((compareAt - price) / compareAt) * 100);
  return pct > 0 ? pct : null;
}
