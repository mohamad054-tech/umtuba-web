import { describe, expect, it } from "vitest";
import { UMTUBA_STORE_CATEGORY_SLUGS, mapProviderCategoryToUmtuba } from "../categories";
import { UMTUBA_DEMO_PRODUCTS } from "./catalog";
import {
  addDemoCartLine,
  assertDemoIsolation,
  demoCheckoutSandbox,
  describeDemoPdp,
  searchDemoCatalog,
  toggleDemoFavorite,
} from "./surface";

describe("Store DEMO catalog", () => {
  it("ships 20–30 isolated demo products across the taxonomy", () => {
    expect(UMTUBA_DEMO_PRODUCTS.length).toBeGreaterThanOrEqual(20);
    expect(UMTUBA_DEMO_PRODUCTS.length).toBeLessThanOrEqual(30);
    const categories = new Set(UMTUBA_DEMO_PRODUCTS.map((product) => product.category));
    for (const slug of UMTUBA_STORE_CATEGORY_SLUGS) {
      expect(categories.has(slug)).toBe(true);
    }
    for (const product of UMTUBA_DEMO_PRODUCTS) {
      expect(assertDemoIsolation(product).ok).toBe(true);
      expect(product.variants.length).toBeGreaterThanOrEqual(1);
      expect(product.title).toMatch(/UMTUBA (Demo|Concept)/);
      expect(product.purchasable).toBe(false);
      expect(product.productionSellable).toBe(false);
      expect(product.imagePolicy).toBe("UMTUBA_NEUTRAL_PLACEHOLDER");
    }
  });

  it("supports search, filters, PDP, variants, favorites, cart, and checkout sandbox states", () => {
    const ready = searchDemoCatalog({ category: "fashion" });
    expect(ready.state).toBe("ready");
    expect(ready.items.length).toBeGreaterThan(0);

    const found = searchDemoCatalog({ q: "tote" });
    expect(found.items.some((item) => item.slug.includes("tote"))).toBe(true);

    const empty = searchDemoCatalog({ q: "no-such-demo-sku-zzz" });
    expect(empty.state).toBe("empty");

    const loading = searchDemoCatalog({}, "loading");
    expect(loading.state).toBe("loading");
    const error = searchDemoCatalog({}, "error");
    expect(error.state).toBe("error");

    const pdp = describeDemoPdp("umtuba-demo-canvas-tote");
    expect(pdp?.purchasable).toBe(false);
    expect(pdp?.product.variants).toHaveLength(2);

    const favs = toggleDemoFavorite([], pdp!.product.id);
    expect(favs).toHaveLength(1);

    const cart = addDemoCartLine([], pdp!.product.id, pdp!.product.variants[0].id);
    expect(cart.ok).toBe(true);
    expect(demoCheckoutSandbox().allowed).toBe(false);
    expect(demoCheckoutSandbox().liveCheckoutInvented).toBe(false);
    expect(ready.responsiveNotes.grid).toMatch(/1-col/);
  });
});

describe("Store category foundation", () => {
  it("maps generic provider aliases without overfitting a marketplace", () => {
    expect(mapProviderCategoryToUmtuba("consumer-electronics").slug).toBe("electronics");
    expect(mapProviderCategoryToUmtuba("apparel").slug).toBe("fashion");
    expect(mapProviderCategoryToUmtuba("home-garden").slug).toBe("home");
    expect(mapProviderCategoryToUmtuba("car-accessories").slug).toBe("automotive-accessories");
    expect(mapProviderCategoryToUmtuba("uncategorized").slug).toBe("digital-other");
    expect(mapProviderCategoryToUmtuba("completely-unknown-token-xyz").matched).toBe(false);
    expect(mapProviderCategoryToUmtuba("completely-unknown-token-xyz").slug).toBe("digital-other");
  });
});
