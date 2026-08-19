import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES } from "./locales";
import { MESSAGE_CATALOGS } from "./messages/catalogs";
import { storeArMessages, storeEnMessages } from "./messages/storeCatalogs";
import type { StoreMessages } from "./messages/types";
import { translate } from "./translate";

const LEAKED_CHROME_KEYS: Array<keyof StoreMessages> = [
  "store.chrome.shop",
  "store.chrome.catalog",
  "store.chrome.favorites",
  "store.chrome.orders",
  "store.chrome.searchPlaceholder",
  "store.chrome.searchSubmit",
  "store.hero.shopTitle",
  "store.hero.browseProducts",
  "store.hero.browseCatalog",
  "store.trust.oneSeller",
  "store.trust.quotedAtCheckout",
  "store.trust.catalogPrices",
  "store.empty.catalogTitle",
];

const ARABIC_LETTER = /[\u0600-\u06FF]/;

describe("Store localization catalogs", () => {
  it("provides every store key in all six locales", () => {
    const keys = Object.keys(storeEnMessages);
    expect(keys.length).toBeGreaterThan(100);
    for (const locale of SUPPORTED_LOCALES) {
      const catalog = MESSAGE_CATALOGS[locale];
      for (const key of keys) {
        const value = catalog[key as keyof typeof catalog];
        expect(typeof value, `${locale} ${key}`).toBe("string");
        expect(String(value).length, `${locale} ${key}`).toBeGreaterThan(0);
      }
    }
  });

  it("renders Arabic Store chrome instead of the leaked English strings", () => {
    for (const key of LEAKED_CHROME_KEYS) {
      const ar = translate("ar", key);
      const en = storeEnMessages[key];
      expect(ar).not.toBe(en);
      expect(ar).toMatch(ARABIC_LETTER);
    }
    expect(translate("ar", "store.chrome.orders")).toBe("الطلبات");
    expect(translate("ar", "store.chrome.favorites")).toBe("المفضلة");
    expect(translate("ar", "store.hero.shopTitle")).toContain("UMTUBA");
  });

  it("keeps UMTUBA untranslated in Arabic Store chrome", () => {
    expect(storeArMessages["store.shell.subtitle"]).toBe("UMTUBA");
    expect(storeArMessages["store.hero.shopTitle"]).toContain("UMTUBA");
    expect(storeArMessages["store.home.sellOnUmtuba"]).toContain("UMTUBA");
  });
});

describe("Store English-leakage source scan", () => {
  it("does not hardcode the reproduced English chrome in buyer surfaces", () => {
    const files = [
      "app/components/store/StoreChrome.tsx",
      "app/components/store/StoreTrustStrip.tsx",
      "app/components/store/HeroCarousel.tsx",
      "app/store/page.tsx",
      "app/store/[storeSlug]/page.tsx",
      "app/components/store/StoreProfileTabs.tsx",
    ];
    const forbidden = [
      '"Orders"',
      '"Favorites"',
      '"Catalog"',
      '"Shop UMTUBA"',
      '"Browse catalog"',
      '"Browse products"',
      '"Search products"',
      '"Catalog is quiet right now"',
      '"Catalog prices"',
      '"Quoted at checkout"',
      '"One seller, one order"',
      ">About<",
      ">Currency<",
      ">Country<",
      ">Verified<",
    ];
    const root = resolve(process.cwd());
    for (const file of files) {
      const source = readFileSync(resolve(root, file), "utf8");
      for (const token of forbidden) {
        expect(source.includes(token), `${file} still contains ${token}`).toBe(
          false
        );
      }
    }
  });
});
