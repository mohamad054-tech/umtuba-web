import { describe, expect, it } from "vitest";
import {
  categoryHref,
  compareAtSavePercent,
  deriveCuratedCollections,
  deriveFeaturedStores,
  hasLegitimateCompareAt,
  heroSlidesFromCatalog,
  pickNewArrivals,
  pickRecommended,
  pickTrending,
  sortCatalogItems,
} from "../../app/lib/storefront/deriveSections";
import type {
  ProductCategoryRow,
  PublicCatalogItem,
  StoreProductRow,
} from "./types";

function product(
  overrides: Partial<StoreProductRow> & Pick<StoreProductRow, "id" | "title">
): StoreProductRow {
  return {
    store_id: "s1",
    slug: overrides.slug ?? overrides.id,
    short_description: null,
    description: null,
    product_type: "physical",
    status: "active",
    moderation_status: "approved",
    primary_category_id: null,
    brand_id: null,
    created_by: "u1",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    published_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function item(
  overrides: Partial<PublicCatalogItem> & {
    product: StoreProductRow;
    store?: PublicCatalogItem["store"];
  }
): PublicCatalogItem {
  return {
    store: overrides.store ?? {
      id: "store-a",
      slug: "atelier-a",
      name: "Atelier A",
      logo_path: null,
      status: "active",
    },
    coverPath: null,
    coverUrl: null,
    priceMinor: 1000,
    compareAtMinor: null,
    currency: "USD",
    available: 5,
    ...overrides,
  };
}

describe("storefront deriveSections", () => {
  it("derives featured stores by product count", () => {
    const items = [
      item({
        product: product({ id: "p1", title: "One" }),
        store: {
          id: "a",
          slug: "a",
          name: "A",
          logo_path: null,
          status: "active",
        },
      }),
      item({
        product: product({ id: "p2", title: "Two" }),
        store: {
          id: "b",
          slug: "b",
          name: "B",
          logo_path: null,
          status: "active",
        },
      }),
      item({
        product: product({ id: "p3", title: "Three" }),
        store: {
          id: "a",
          slug: "a",
          name: "A",
          logo_path: null,
          status: "active",
        },
      }),
    ];
    const stores = deriveFeaturedStores(items);
    expect(stores[0]?.id).toBe("a");
    expect(stores[0]?.productCount).toBe(2);
  });

  it("picks trending by availability then recency", () => {
    const items = [
      item({
        product: product({
          id: "old",
          title: "Old",
          published_at: "2026-01-01T00:00:00.000Z",
        }),
        available: 1,
      }),
      item({
        product: product({
          id: "hot",
          title: "Hot",
          published_at: "2026-02-01T00:00:00.000Z",
        }),
        available: 20,
      }),
    ];
    expect(pickTrending(items, 1)[0]?.product.id).toBe("hot");
  });

  it("picks new arrivals by published_at", () => {
    const items = [
      item({
        product: product({
          id: "older",
          title: "Older",
          published_at: "2026-01-01T00:00:00.000Z",
        }),
      }),
      item({
        product: product({
          id: "newer",
          title: "Newer",
          published_at: "2026-03-01T00:00:00.000Z",
        }),
      }),
    ];
    expect(pickNewArrivals(items, 1)[0]?.product.id).toBe("newer");
  });

  it("excludes current product and zero stock from recommendations", () => {
    const items = [
      item({ product: product({ id: "keep", title: "Keep" }), available: 2 }),
      item({ product: product({ id: "skip", title: "Skip" }), available: 0 }),
      item({ product: product({ id: "self", title: "Self" }), available: 4 }),
    ];
    const recommended = pickRecommended(items, "self", 8);
    expect(recommended.map((r) => r.product.id)).toEqual(["keep"]);
  });

  it("derives curated collections from category coverage", () => {
    const categories: ProductCategoryRow[] = [
      {
        id: "c1",
        parent_id: null,
        slug: "objects",
        name: "Objects",
        status: "active",
        sort_order: 2,
      },
      {
        id: "c2",
        parent_id: null,
        slug: "wear",
        name: "Wear",
        status: "active",
        sort_order: 1,
      },
    ];
    const items = [
      item({
        product: product({
          id: "p1",
          title: "P1",
          primary_category_id: "c1",
        }),
      }),
      item({
        product: product({
          id: "p2",
          title: "P2",
          primary_category_id: "c1",
        }),
      }),
      item({
        product: product({
          id: "p3",
          title: "P3",
          primary_category_id: "c2",
        }),
      }),
    ];
    const collections = deriveCuratedCollections(items, categories, 6);
    expect(collections[0]?.id).toBe("c1");
    expect(collections[0]?.productCount).toBe(2);
    expect(categoryHref(collections[0]!)).toBe(
      `/store/search?category=${encodeURIComponent("c1")}`
    );
  });

  it("builds hero slides with image URLs when available", () => {
    const items = [
      item({
        product: product({ id: "hero", title: "Hero Piece" }),
        coverUrl: "https://cdn.example/hero.jpg",
        available: 9,
      }),
    ];
    const slides = heroSlidesFromCatalog(items);
    expect(slides[0]?.imageUrl).toBe("https://cdn.example/hero.jpg");
    expect(slides[0]?.href).toContain("/product/hero");
    expect(slides[0]).not.toHaveProperty("tone");
  });

  it("falls back to editorial welcome slide when catalog empty", () => {
    const slides = heroSlidesFromCatalog([]);
    expect(slides).toHaveLength(1);
    expect(slides[0]?.id).toBe("welcome");
    expect(slides[0]?.href).toBe("/store/search");
    expect(slides[0]?.title).toBe("Shop UMTUBA");
  });

  it("sorts catalog by price and title without inventing prices", () => {
    const items = [
      item({
        product: product({ id: "b", title: "Beta" }),
        priceMinor: 300,
      }),
      item({
        product: product({ id: "a", title: "Alpha" }),
        priceMinor: 100,
      }),
      item({
        product: product({ id: "z", title: "Zulu" }),
        priceMinor: null,
      }),
    ];
    expect(sortCatalogItems(items, "price_asc").map((i) => i.product.id)).toEqual([
      "a",
      "b",
      "z",
    ]);
    expect(sortCatalogItems(items, "title").map((i) => i.product.id)).toEqual([
      "a",
      "b",
      "z",
    ]);
  });

  it("only treats compare-at as legitimate when higher than price", () => {
    expect(
      hasLegitimateCompareAt(
        item({
          product: product({ id: "ok", title: "Ok" }),
          priceMinor: 100,
          compareAtMinor: 150,
        })
      )
    ).toBe(true);
    expect(
      hasLegitimateCompareAt(
        item({
          product: product({ id: "bad", title: "Bad" }),
          priceMinor: 100,
          compareAtMinor: 100,
        })
      )
    ).toBe(false);
  });

  it("computes compare-at save percent only for legitimate discounts", () => {
    expect(compareAtSavePercent(800, 1000)).toBe(20);
    expect(compareAtSavePercent(100, 100)).toBe(null);
    expect(compareAtSavePercent(null, 1500)).toBe(null);
  });
});
