import { describe, expect, it } from "vitest";
import { loadStoreBrowseCatalog } from "../../services/cj/expansionBrowse";
import { hasArabicScript } from "./facts";
import {
  applyCustomerLocalization,
  loadCustomerLocalizationLookup,
} from "./customerOverlay";

describe("applyCustomerLocalization", () => {
  it("binds card title and description to localized AR/EN fields", () => {
    const catalog = loadStoreBrowseCatalog();
    const lookup = loadCustomerLocalizationLookup();
    const row = catalog.items.find((item) => lookup.has(item.identity.cj_product_id));
    expect(row).toBeTruthy();
    const copy = lookup.get(row!.identity.cj_product_id);
    expect(copy).toBeTruthy();

    const ar = applyCustomerLocalization(row!, "ar", lookup);
    const en = applyCustomerLocalization(row!, "en", lookup);

    expect(ar.catalogItem.product.title).toBe(copy!.title_ar);
    expect(ar.catalogItem.product.description).toBe(copy!.description_ar);
    expect(ar.catalogItem.product.short_description).toBe(copy!.description_ar);
    expect(ar.customer.description).toBe(copy!.description_ar);
    expect(hasArabicScript(ar.catalogItem.product.title)).toBe(true);
    expect(hasArabicScript(String(ar.catalogItem.product.short_description))).toBe(true);

    expect(en.catalogItem.product.title).toBe(copy!.title_en_clean);
    expect(en.catalogItem.product.description).toBe(copy!.description_en_clean);
    expect(en.catalogItem.product.short_description).toBe(copy!.description_en_clean);
    expect(en.customer.title).toBe(copy!.title_en_clean);
  });

  it("binds non-English locales from by_locale and does not fake English as localized", () => {
    const catalog = loadStoreBrowseCatalog();
    const lookup = loadCustomerLocalizationLookup();
    const row = catalog.items.find((item) => {
      const copy = lookup.get(item.identity.cj_product_id);
      return Boolean(copy?.by_locale?.fr?.title && copy.by_locale.fr.title !== copy.title_en_clean);
    });
    expect(row).toBeTruthy();
    const copy = lookup.get(row!.identity.cj_product_id);
    expect(copy?.by_locale?.fr?.title).toBeTruthy();

    const fr = applyCustomerLocalization(row!, "fr", lookup);
    expect(fr.catalogItem.product.title).toBe(copy!.by_locale!.fr!.title);
    expect(fr.catalogItem.product.title).not.toBe(copy!.title_en_clean);
    expect(fr.catalogItem.product.description).toBe(copy!.by_locale!.fr!.description);
  });
});
