import { describe, expect, it } from "vitest";
import { DEMO_CATEGORY_SLUGS, UMTUBA_DEMO_PRODUCTS, getUmtubaDemoProduct } from "./catalog";
import {
  DEMO_CATALOG_STATE_FIXTURES,
  DEMO_INVENTORY_STATE_FIXTURES,
  DEMO_PRICE_CHANGE_FIXTURES,
} from "./catalogStates";
import {
  addDemoCartLine,
  assertDemoIsolation,
  demoCheckoutSandbox,
  describeDemoPdp,
  searchDemoCatalog,
  toggleDemoFavorite,
} from "./surface";

const FORBIDDEN_BRANDS = [
  "shein",
  "temu",
  "amazon",
  "aliexpress",
  "alibaba",
  "trendyol",
  "ebay",
  "dhgate",
];

describe("Store DEMO catalog (fixture, not live inventory)", () => {
  it("ships 26 isolated demo products and never marks them purchasable", () => {
    expect(UMTUBA_DEMO_PRODUCTS.length).toBe(26);
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

  it("completes sku, taxonomy, copy, variants, specs, search, filter, related, shipping, and returns", () => {
    const slugs = new Set(UMTUBA_DEMO_PRODUCTS.map((product) => product.slug));
    expect(slugs.size).toBe(26);

    for (const product of UMTUBA_DEMO_PRODUCTS) {
      expect(product.sku).toMatch(/^DEMO-[A-Z0-9-]+$/);
      expect(product.shortDescription.length).toBeGreaterThan(20);
      expect(product.description.length).toBeGreaterThan(product.shortDescription.length);
      expect(product.description).toContain("SOURCE_TYPE=DEMO");
      expect(product.taxonomy.path).toHaveLength(3);
      expect(product.specifications.length).toBeGreaterThanOrEqual(3);
      expect(product.searchKeywords.length).toBeGreaterThanOrEqual(4);
      expect(product.filterAttributes.fulfillment).toBe(
        product.productType === "digital" ? "digital" : "physical"
      );
      expect(product.filterAttributes.priceBand).toBeTruthy();
      expect(product.shipping.mode).toBe("DEMO");
      expect(product.returns.mode).toBe("DEMO");
      expect(product.relatedProductSlugs.length).toBeGreaterThanOrEqual(1);
      for (const related of product.relatedProductSlugs) {
        expect(slugs.has(related)).toBe(true);
        expect(related).not.toBe(product.slug);
      }
      for (const variant of product.variants) {
        expect(variant.sku).toMatch(/^DEMO-/);
        expect(variant.priceMinor).toBe(product.variants[0]?.priceMinor);
        if (product.productType === "digital") {
          expect(variant.onHand).toBeNull();
          expect(variant.inventoryKind).toBe("DIGITAL");
          expect(variant.stockState).toBe("DIGITAL_NOT_APPLICABLE");
          expect(product.shipping.applicable).toBe(false);
        } else {
          expect(variant.onHand).toBeTypeOf("number");
          expect(variant.inventoryKind).toBe("PHYSICAL");
          expect(variant.stockState).not.toBe("DIGITAL_NOT_APPLICABLE");
          expect(product.shipping.applicable).toBe(true);
        }
      }
      const hay = `${product.title} ${product.description} ${product.searchKeywords.join(" ")}`.toLowerCase();
      for (const token of FORBIDDEN_BRANDS) {
        expect(hay.includes(token)).toBe(false);
      }
    }
  });

  it("exposes inventory and price-change state fixtures against the same 26 products", () => {
    expect(DEMO_INVENTORY_STATE_FIXTURES.map((row) => row.id)).toEqual([
      "IN_STOCK",
      "LOW_STOCK",
      "OUT_OF_STOCK",
      "INVENTORY_CHANGED",
    ]);
    expect(DEMO_PRICE_CHANGE_FIXTURES).toHaveLength(1);
    expect(DEMO_PRICE_CHANGE_FIXTURES[0]?.id).toBe("PRICE_CHANGED");

    expect(DEMO_CATALOG_STATE_FIXTURES.IN_STOCK.stockState).toBe("IN_STOCK");
    expect((DEMO_CATALOG_STATE_FIXTURES.IN_STOCK.onHand ?? 0) >= 4).toBe(true);
    expect(DEMO_CATALOG_STATE_FIXTURES.LOW_STOCK.stockState).toBe("LOW_STOCK");
    expect(DEMO_CATALOG_STATE_FIXTURES.OUT_OF_STOCK.stockState).toBe("OUT_OF_STOCK");
    expect(DEMO_CATALOG_STATE_FIXTURES.OUT_OF_STOCK.onHand).toBe(0);
    expect(DEMO_CATALOG_STATE_FIXTURES.INVENTORY_CHANGED.previousOnHand).toBe(12);
    expect(DEMO_CATALOG_STATE_FIXTURES.INVENTORY_CHANGED.currentOnHand).toBe(6);
    expect(DEMO_CATALOG_STATE_FIXTURES.PRICE_CHANGED.previousPriceMinor).toBe(2499);
    expect(DEMO_CATALOG_STATE_FIXTURES.PRICE_CHANGED.currentPriceMinor).toBe(2199);

    for (const fixture of [...DEMO_INVENTORY_STATE_FIXTURES, ...DEMO_PRICE_CHANGE_FIXTURES]) {
      expect(getUmtubaDemoProduct(fixture.productSlug)).not.toBeNull();
    }
  });

  it("supports search, filters, category, PDP, variants, favorites, cart sandbox, and checkout sandbox", () => {
    const ready = searchDemoCatalog({ category: "fashion" });
    expect(ready.state).toBe("ready");
    expect(ready.items.length).toBeGreaterThan(0);

    const found = searchDemoCatalog({ q: "tote" });
    expect(found.items.some((item) => item.slug.includes("tote"))).toBe(true);

    const bySku = searchDemoCatalog({ q: "DEMO-STUDIO-EARBUDS" });
    expect(bySku.items.some((item) => item.slug.includes("earbuds"))).toBe(true);

    const digitalOnly = searchDemoCatalog({ fulfillment: "digital" });
    expect(digitalOnly.items.every((item) => item.productType === "digital")).toBe(true);
    expect(digitalOnly.items.length).toBe(2);

    const navy = searchDemoCatalog({ color: "navy" });
    expect(navy.items.every((item) => item.filterAttributes.color.includes("navy"))).toBe(true);

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
