import type { PublicCatalogItem } from "../../../lib/store/types";
import type { ProductCategoryRow } from "../../../lib/store/types";

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
    .sort((a, b) => (b.available ?? 0) - (a.available ?? 0))
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
    .slice(0, limit);
}

export function sortCatalogItems(
  items: PublicCatalogItem[],
  sort: string
): PublicCatalogItem[] {
  const copy = [...items];
  switch (sort) {
    case "price_asc":
      return copy.sort(
        (a, b) => (a.priceMinor ?? Number.POSITIVE_INFINITY) - (b.priceMinor ?? Number.POSITIVE_INFINITY)
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
  tone: "violet" | "indigo" | "fuchsia";
}> {
  const picks = pickTrending(items, 3);
  const tones: Array<"violet" | "indigo" | "fuchsia"> = ["violet", "indigo", "fuchsia"];
  if (picks.length === 0) {
    return [
      {
        id: "welcome",
        title: "UMTUBA Store",
        subtitle: "Discover active products from premium storefronts.",
        href: "/store/search",
        tone: "violet",
      },
    ];
  }
  return picks.map((item, i) => ({
    id: item.product.id,
    title: item.product.title,
    subtitle: item.store.name,
    href: `/store/${item.store.slug}/product/${item.product.slug}`,
    tone: tones[i % tones.length],
  }));
}

export function categoryHref(category: ProductCategoryRow): string {
  return `/store/search?category=${encodeURIComponent(category.id)}`;
}
