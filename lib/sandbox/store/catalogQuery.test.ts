import { describe, expect, it } from "vitest";
import { queryStoreCatalog } from "./catalogQuery";
import { STORE_LISTING_VIEWS } from "./listings";

describe("sandbox store catalog query", () => {
  it("returns all 26 products for an empty query", () => {
    expect(queryStoreCatalog({})).toHaveLength(26);
  });

  it("filters by category and searches title tokens", () => {
    const fashion = queryStoreCatalog({ category: "fashion" });
    expect(fashion.every((row) => row.product.category === "fashion")).toBe(true);
    expect(fashion.length).toBeGreaterThan(0);
    const earbuds = queryStoreCatalog({ q: "earbuds" });
    expect(earbuds.some((row) => row.product.slug.includes("earbuds"))).toBe(true);
  });

  it("sorts by price and title", () => {
    const asc = queryStoreCatalog({ sort: "price-asc" });
    const desc = queryStoreCatalog({ sort: "price-desc" });
    const firstAsc = asc[0]!.product.variants[0]!.priceMinor;
    const lastAsc = asc[asc.length - 1]!.product.variants[0]!.priceMinor;
    expect(firstAsc).toBeLessThanOrEqual(lastAsc);
    expect(desc[0]!.product.variants[0]!.priceMinor).toBeGreaterThanOrEqual(
      desc[desc.length - 1]!.product.variants[0]!.priceMinor
    );
    const titled = queryStoreCatalog({ sort: "title" });
    expect(titled[0]!.product.title <= titled[1]!.product.title).toBe(true);
  });

  it("returns an empty list for a nonsense query", () => {
    expect(queryStoreCatalog({ q: "zzznomatchtoken" })).toHaveLength(0);
    expect(STORE_LISTING_VIEWS).toHaveLength(26);
  });
});
