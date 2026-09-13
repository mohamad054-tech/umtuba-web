import { describe, expect, it } from "vitest";
import { applyMissingLocaleDrafts, parseMissingLocaleCopyList } from "./geminiLocaleBackfill";
import { evaluateLocaleCompleteness } from "./localeCompleteness";
import type { LocalizedCatalogProduct } from "./types";

const row: LocalizedCatalogProduct = {
  cj_product_id: "backfill-1",
  sku: null,
  source: "expansion",
  source_title: "Garden Hand Trowel",
  source_description: "A small garden hand trowel for planting.",
  department: "GARDEN & OUTDOOR",
  subcategory: "Garden Tools",
  retail_price_minor: 1299,
  currency: "USD",
  cover_url: "https://example.com/trowel.jpg",
  slug: "trowel",
  localized: {
    title_en_clean: "Garden Hand Trowel",
    title_ar: "مجرفة يدوية للحديقة",
    description_en_clean: "A small garden hand trowel for planting.",
    description_ar: "مجرفة يدوية صغيرة للحديقة تُستخدم في الزراعة.",
    specifications_en: ["Form: hand trowel"],
    specifications_ar: ["الشكل: مجرفة يدوية"],
    department_en: "Garden & Outdoor",
    department_ar: "الحديقة والخارج",
    subcategory_en: "Garden Tools",
    subcategory_ar: "أدوات الحديقة",
    search_keywords_en: ["trowel"],
    search_keywords_ar: ["مجرفة"],
  },
  quality: { ok: true, findings: [] },
  status: "local_pass",
  review_reason: null,
  gold_standard_gaps: [],
  catalog_qa: [],
};

describe("gemini locale backfill", () => {
  it("parses missing locales and ignores ar/en even if returned", () => {
    const parsed = parseMissingLocaleCopyList({
      products: [
        {
          i: 1,
          locales: {
            ar: { title: "should ignore", description: "should ignore", specifications: [], search_keywords: [] },
            id: {
              title: "Sekop tangan kebun",
              description: "Sekop tangan kebun kecil untuk menanam.",
              specifications: ["Bentuk: sekop tangan"],
              search_keywords: ["sekop"],
            },
          },
        },
      ],
    });
    expect(parsed[0]?.locales.ar).toBeUndefined();
    expect(parsed[0]?.locales.id?.title).toBe("Sekop tangan kebun");
  });

  it("merges only requested locales and keeps approved Arabic and English", () => {
    const next = applyMissingLocaleDrafts(
      row,
      {
        i: 1,
        locales: {
          id: {
            title: "Sekop tangan kebun",
            description: "Sekop tangan kebun kecil untuk menanam.",
            specifications: ["Bentuk: sekop tangan"],
            search_keywords: ["sekop"],
          },
        },
      },
      ["id"]
    );
    expect(next.localized.title_en_clean).toBe(row.localized.title_en_clean);
    expect(next.localized.title_ar).toBe(row.localized.title_ar);
    expect(next.localized.by_locale?.id?.title).toBe("Sekop tangan kebun");
    expect(next.localized.by_locale?.en?.title).toBe("Garden Hand Trowel");
    expect(evaluateLocaleCompleteness(next.localized).passed_locales).toEqual(
      expect.arrayContaining(["ar", "en", "id"])
    );
    expect(next.retail_price_minor).toBe(1299);
  });

  it("accepts comma decimals that match source 1.5 values", () => {
    const decimalRow: LocalizedCatalogProduct = {
      ...row,
      localized: {
        ...row.localized,
        title_en_clean: "1.5L Floating Pet Bowl",
        description_en_clean: "A 1.5L floating pet bowl for daily use.",
        specifications_en: ["Capacity: 1.5L"],
      },
    };
    const next = applyMissingLocaleDrafts(
      decimalRow,
      {
        i: 1,
        locales: {
          de: {
            title: "1,5L Schwimmender Napf",
            description: "Ein 1,5L schwimmender Napf für den täglichen Gebrauch.",
            specifications: ["Fassungsvermögen: 1,5L"],
            search_keywords: ["Napf"],
          },
        },
      },
      ["de"]
    );
    expect(next.localized.by_locale?.de?.title).toBe("1,5L Schwimmender Napf");
  });

  it("accepts German copy that uses aus instead of an article", () => {
    const next = applyMissingLocaleDrafts(
      row,
      {
        i: 1,
        locales: {
          de: {
            title: "Garten-Handschaufel",
            description: "Kompakte Handschaufel aus Edelstahl zum Pflanzen.",
            specifications: ["Form: Handschaufel"],
            search_keywords: ["Handschaufel"],
          },
        },
      },
      ["de"]
    );
    expect(next.localized.by_locale?.de?.title).toBe("Garten-Handschaufel");
  });

  it("treats English number words as source facts", () => {
    const numbered: LocalizedCatalogProduct = {
      ...row,
      localized: {
        ...row.localized,
        title_en_clean: "Five-Piece Bottle Set",
        description_en_clean: "A five-piece 280mL bottle set.",
        specifications_en: ["Pieces: five", "Capacity: 280mL"],
      },
    };
    const next = applyMissingLocaleDrafts(
      numbered,
      {
        i: 1,
        locales: {
          de: {
            title: "5-teiliges Flaschenset",
            description: "Ein 5-teiliges 280mL Flaschenset.",
            specifications: ["Teile: 5", "Fassungsvermögen: 280mL"],
            search_keywords: ["Flaschenset"],
          },
        },
      },
      ["de"]
    );
    expect(next.localized.by_locale?.de?.title).toBe("5-teiliges Flaschenset");
  });
});
