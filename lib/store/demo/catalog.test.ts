import { describe, expect, it } from "vitest";
import { DEMO_CATEGORY_SLUGS, UMTUBA_DEMO_PRODUCTS } from "./catalog";
import {
  addDemoCartLine,
  assertDemoIsolation,
  demoCheckoutSandbox,
  describeDemoPdp,
  searchDemoCatalog,
  toggleDemoFavorite,
} from "./surface";

describe("Store DEMO catalog (fixture, not live inventory)", () => {
  it("ships 20–30 isolated demo products and never marks them purchasable", () => {
    expect(UMTUBA_DEMO_PRODUCTS.length).toBeGreaterThanOrEqual(20);
    expect(UMTUBA_DEMO_PRODUCTS.length).toBeLessThanOrEqual(30);
    const categories = new Set(UMTUBA_DEMO_PRODUCTS.map((product) => product.category));
    for (const slug of DEMO_CATEGORY_SLUGS) {
      expect(categories.has(slug)).toBe(true);
    }
    for (const product of UMTUBA_DEMO_PRODUCTS) {
      expect(assertDemoIsolation(product).ok).toBe(true);
      expect(product.variants.length).toBeGreaterThanOrEqual(1);
      expect(product.title).toMatch(/UMTUBA (Demo|Concept)/);
      expect(product.purchasable).toBe(false);
      expect(product.productionSellable).toBe(false);
      expect(product.realProvider).toBe("NONE");
      expect(product.rightsStatus).toBe("DEMO_ONLY");
      expect(product.imagePolicy).toBe("UMTUBA_NEUTRAL_PLACEHOLDER");
    }
  });

  it("supports search, filters, category, PDP, variants, favorites, cart sandbox, and checkout sandbox", () => {
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
    expect(pdp?.checkoutAllowed).toBe(false);
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
