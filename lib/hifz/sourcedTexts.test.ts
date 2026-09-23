import { describe, expect, it } from "vitest";
import {
  ASH_SHAMS_OMITTED_LOCALES,
  ASH_SHAMS_SOURCED_EDITIONS,
  mappingForLocale,
  resolveMeaningsLocale,
} from "./sourcedEditionMap";
import {
  getMeaningsForLocale,
  getMuyassarTafsir,
} from "./sourcedTexts";
import {
  HIFZ_SHAMS_PERMANENT_REDIRECT,
  LEARNING_QURAN_ROUTES,
  LEGACY_HIFZ_SHAMS_PATH,
} from "./routes";
import { SUPPORTED_LOCALES } from "../i18n/locales";
import { ROBOTS_DISALLOW_PATHS, SITEMAP_STATIC_ROUTES } from "../site/indexing";

describe("learning quran routes", () => {
  it("keeps permanent redirect from legacy hifz path", () => {
    expect(LEGACY_HIFZ_SHAMS_PATH).toBe("/hifz/shams");
    expect(HIFZ_SHAMS_PERMANENT_REDIRECT).toEqual({
      source: "/hifz/shams",
      destination: "/learning/quran/shams",
      permanent: true,
    });
    expect(LEARNING_QURAN_ROUTES.shams).toBe("/learning/quran/shams");
    expect(LEARNING_QURAN_ROUTES.section).toBe("/learning/quran");
  });

  it("keeps quran surfaces out of sitemap and in robots disallow", () => {
    expect(SITEMAP_STATIC_ROUTES).not.toContain("/learning/quran");
    expect(SITEMAP_STATIC_ROUTES).not.toContain("/learning/quran/shams");
    expect(SITEMAP_STATIC_ROUTES).not.toContain("/hifz/shams");
    expect(ROBOTS_DISALLOW_PATHS).toContain("/learning/quran");
    expect(ROBOTS_DISALLOW_PATHS).toContain("/hifz");
  });
});

describe("sourced edition map", () => {
  it("maps every supported locale to a source or an explicit omit", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const mapped = mappingForLocale(locale);
      if (locale === "ko") {
        expect(mapped).toBeNull();
        expect(ASH_SHAMS_OMITTED_LOCALES).toContain("ko");
      } else {
        expect(mapped, locale).not.toBeNull();
        expect(mapped!.locale).toBe(locale);
      }
    }
  });

  it("prefers mukhtasar keys where used and never treats Arabic as meanings", () => {
    expect(mappingForLocale("ar")?.kind).toBe("tafsir");
    expect(mappingForLocale("ar")?.quranEncKey).toBe("arabic_moyassar");
    expect(resolveMeaningsLocale("ar")).toBeNull();
    expect(mappingForLocale("en")?.quranEncKey).toBe("english_mokhtasar");
    expect(mappingForLocale("de")?.quranEncKey).toBe("german_bubenheim");
    expect(mappingForLocale("pt")?.quranEncKey).toBe("portuguese_nasr");
    expect(ASH_SHAMS_SOURCED_EDITIONS.every((e) => e.dataFile.length > 0)).toBe(
      true,
    );
  });
});

describe("sourced texts (downloaded only)", () => {
  it("loads 15 ayat of التفسير الميسر without empty strings", () => {
    for (let n = 1; n <= 15; n++) {
      const row = getMuyassarTafsir(n);
      expect(row, `ayah ${n}`).not.toBeNull();
      expect(row!.text.trim().length).toBeGreaterThan(0);
      expect(row!.source.crossCheckWordByWord100Percent).toBe(true);
      expect(row!.source.displayNameAr).toContain("الميسر");
    }
  });

  it("loads meanings for English and omits Korean (no verified source)", () => {
    const en = getMeaningsForLocale("en", 1);
    expect(en).not.toBeNull();
    expect(en!.text.trim().length).toBeGreaterThan(0);
    expect(en!.source.kind).toBe("meanings");
    expect(getMeaningsForLocale("ko", 1)).toBeNull();
  });
});
