import { describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES } from "../i18n/locales";
import {
  bundledCityCopy,
  resolveCityDisplayName,
  resolveCityOverview,
} from "./cityCatalogCopy";

describe("World city copy v2", () => {
  const bundle = bundledCityCopy();

  it("covers every expansion and pilot city in product locales", () => {
    expect(bundle.cities.length).toBeGreaterThanOrEqual(50);
    expect(bundle.reserved_locales).toEqual([
      "tr",
      "id",
      "zh",
      "hi",
      "ja",
      "ru",
      "ko",
    ]);
    for (const city of bundle.cities) {
      expect(city.overview.length).toBeGreaterThan(20);
      for (const locale of ["ar", "fr", "es", "de", "pt"] as const) {
        expect(city.overview_i18n[locale]?.length).toBeGreaterThan(20);
        expect(city.name_i18n[locale]?.length).toBeGreaterThan(1);
      }
    }
  });

  it("resolves localized overviews without falling back to English", () => {
    const ar = resolveCityOverview(bundle, "paris", "ar", null);
    const en = resolveCityOverview(bundle, "paris", "en", null);
    expect(ar).toMatch(/باريس/);
    expect(en).toMatch(/Paris is the capital of France/);
    expect(ar).not.toBe(en);
    expect(resolveCityDisplayName(bundle, "cairo", "ar", "Cairo")).toBe(
      "القاهرة"
    );
  });

  it("keeps chrome locales covered for catalog copy lookup", () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(
        resolveCityOverview(bundle, "amman", locale, "Amman")
      ).toBeTruthy();
    }
  });
});
