import { describe, expect, it } from "vitest";
import { REQUIRED_STORE_LOCALES } from "./requiredLocales";
import { evaluateLocaleCompleteness } from "./localeCompleteness";
import { assertAllLocaleTaxonomyComplete, departmentLabel } from "./taxonomyLocale";
import type { LocalizedProductCopy } from "./types";

function copy(): LocalizedProductCopy {
  return {
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
    by_locale: {
      en: {
        title: "Garden Hand Trowel",
        description: "A small garden hand trowel for planting.",
        specifications: ["Form: hand trowel"],
        department: "Garden & Outdoor",
        subcategory: "Garden Tools",
        search_keywords: ["trowel"],
      },
      ar: {
        title: "مجرفة يدوية للحديقة",
        description: "مجرفة يدوية صغيرة للحديقة تُستخدم في الزراعة.",
        specifications: ["الشكل: مجرفة يدوية"],
        department: "الحديقة والخارج",
        subcategory: "أدوات الحديقة",
        search_keywords: ["مجرفة"],
      },
      fr: {
        title: "Transplantoir de jardin",
        description: "Un petit transplantoir de jardin pour planter.",
        specifications: ["Forme : transplantoir"],
        department: "Jardin et extérieur",
        subcategory: "Outils de jardin",
        search_keywords: ["transplantoir"],
      },
      es: {
        title: "Paleta de jardín",
        description: "Una paleta de jardín pequeña para plantar.",
        specifications: ["Forma: paleta"],
        department: "Jardín y exterior",
        subcategory: "Herramientas de jardín",
        search_keywords: ["paleta"],
      },
      de: {
        title: "Garten-Handschaufel",
        description: "Eine kleine Garten-Handschaufel zum Pflanzen.",
        specifications: ["Form: Handschaufel"],
        department: "Garten und Outdoor",
        subcategory: "Gartenwerkzeug",
        search_keywords: ["Handschaufel"],
      },
      pt: {
        title: "Pazinha de jardim",
        description: "Uma pazinha de jardim pequena para plantar.",
        specifications: ["Forma: pazinha"],
        department: "Jardim e exterior",
        subcategory: "Ferramentas de jardim",
        search_keywords: ["pazinha"],
      },
      id: {
        title: "Sekop tangan kebun",
        description: "Sekop tangan kebun kecil untuk menanam.",
        specifications: ["Bentuk: sekop tangan"],
        department: "Taman dan outdoor",
        subcategory: "Alat taman",
        search_keywords: ["sekop"],
      },
      hi: {
        title: "बगीचे का हैंड ट्रॉवेल",
        description: "रोपण के लिए एक छोटा बगीचे का हैंड ट्रॉवेल।",
        specifications: ["आकार: हैंड ट्रॉवेल"],
        department: "बगीचा और आउटडोर",
        subcategory: "बागवानी उपकरण",
        search_keywords: ["ट्रॉवेल"],
      },
      ru: {
        title: "Садовая совок",
        description: "Небольшой садовый совок для посадки.",
        specifications: ["Форма: совок"],
        department: "Сад и улица",
        subcategory: "Садовые инструменты",
        search_keywords: ["совок"],
      },
      tr: {
        title: "Bahçe eli küreği",
        description: "Dikim için küçük bir bahçe eli küreği.",
        specifications: ["Biçim: el küreği"],
        department: "Bahçe ve açık hava",
        subcategory: "Bahçe aletleri",
        search_keywords: ["kürek"],
      },
      "zh-CN": {
        title: "园艺手铲",
        description: "用于栽种的小型园艺手铲。",
        specifications: ["形态：手铲"],
        department: "园艺与户外",
        subcategory: "园艺工具",
        search_keywords: ["手铲"],
      },
      ja: {
        title: "ガーデンハンドトロウェル",
        description: "植え付け用の小さなガーデンハンドトロウェル。",
        specifications: ["形状：ハンドトロウェル"],
        department: "ガーデン＆アウトドア",
        subcategory: "園芸用具",
        search_keywords: ["トロウェル"],
      },
      ko: {
        title: "정원용 핸드 트로웰",
        description: "심기용 작은 정원 핸드 트로웰.",
        specifications: ["형태: 핸드 트로웰"],
        department: "가든 & 아웃도어",
        subcategory: "정원 도구",
        search_keywords: ["트로웰"],
      },
    },
  };
}

describe("all-locale store completeness", () => {
  it("uses the thirteen store locales", () => {
    expect([...REQUIRED_STORE_LOCALES]).toEqual([
      "ar",
      "en",
      "fr",
      "es",
      "de",
      "pt",
      "id",
      "hi",
      "ru",
      "tr",
      "zh-CN",
      "ja",
      "ko",
    ]);
    assertAllLocaleTaxonomyComplete();
    expect(departmentLabel("GARDEN & OUTDOOR", "fr")).toBe("Jardin et extérieur");
    expect(departmentLabel("GARDEN & OUTDOOR", "ja")).toBe("ガーデン＆アウトドア");
  });

  it("requires every locale before a new product is complete", () => {
    const full = evaluateLocaleCompleteness(copy());
    expect(full.complete).toBe(true);
    expect(full.coverage).toBe(1);
    const missingDe = copy();
    delete missingDe.by_locale?.de;
    const incomplete = evaluateLocaleCompleteness(missingDe);
    expect(incomplete.complete).toBe(false);
    expect(incomplete.failed_locales.some((row) => row.locale === "de")).toBe(true);
  });
});
