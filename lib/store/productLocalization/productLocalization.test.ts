import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { formatCurrency } from "../../i18n/format";
import { formatMinorUnits } from "../money";
import {
  loadLocalizationCatalogSources,
  selectLocalizationQaSample,
} from "./catalogSource";
import {
  LOCALIZATION_QA_SAMPLE_IDS,
  LOCALIZATION_QA_SAMPLE_SIZE,
  PRODUCT_LOCALIZATION_TASK_ID,
} from "./constants";
import { EDITORIAL_SAMPLE_COPY } from "./editorialSample";
import { hasArabicScript } from "./facts";
import { createLocalProductLocalizationProvider } from "./localProvider";
import { createGeminiProductLocalizationProvider } from "./paidProviders";
import { createProductLocalizationProvider, readProductLocalizationProviderId } from "./provider";
import { evaluateLocalizationQuality } from "./qualityGate";
import { buildLocalizationQaSampleFile, readLocalizationQaSampleFile } from "./sampleFile";
import { assertTaxonomyLocaleComplete } from "./taxonomyLocale";

const REQUIRED_FIELDS = [
  "title_en_clean",
  "title_ar",
  "description_en_clean",
  "description_ar",
  "specifications_en",
  "specifications_ar",
  "department_en",
  "department_ar",
  "subcategory_en",
  "subcategory_ar",
  "search_keywords_en",
  "search_keywords_ar",
] as const;

function fixtureSource(overrides: Partial<Parameters<typeof evaluateLocalizationQuality>[0]> = {}) {
  return {
    source_title: "6Pcs Food Silicone Cover Fresh-keeping Dish Stretchy Lid Cap Reusable Wrap Organization Storage Tool Kitchen Accessories",
    source_description: "Kitchen gadget draft.",
    ...overrides,
  };
}

describe("product localization sample", () => {
  it("loads the frozen 20-product sample across multiple departments", () => {
    const { products, expansionCount } = loadLocalizationCatalogSources();
    const sample = selectLocalizationQaSample(products);
    expect(sample).toHaveLength(LOCALIZATION_QA_SAMPLE_SIZE);
    expect(sample.map((row) => row.cj_product_id)).toEqual([...LOCALIZATION_QA_SAMPLE_IDS]);
    expect(sample.some((row) => row.source === "approved_59")).toBe(true);
    expect(sample.some((row) => row.source === "expansion")).toBe(true);
    const departments = new Set(sample.map((row) => row.department));
    expect(departments.size).toBeGreaterThanOrEqual(4);
    expect(expansionCount).toBeGreaterThan(0);
  });

  it("stores every required locale field on editorial copy", () => {
    expect(Object.keys(EDITORIAL_SAMPLE_COPY)).toHaveLength(LOCALIZATION_QA_SAMPLE_SIZE);
    for (const [id, copy] of Object.entries(EDITORIAL_SAMPLE_COPY)) {
      for (const field of REQUIRED_FIELDS) {
        const value = copy[field];
        if (Array.isArray(value)) {
          expect(value.length, `${id} ${field}`).toBeGreaterThan(0);
        } else {
          expect(String(value).trim(), `${id} ${field}`).not.toBe("");
        }
      }
      expect(hasArabicScript(copy.title_ar), id).toBe(true);
      expect(hasArabicScript(copy.description_ar), id).toBe(true);
      expect(copy.title_ar).not.toBe(copy.title_en_clean);
    }
  });

  it("passes the quality gate for every editorial sample product", () => {
    const { products } = loadLocalizationCatalogSources();
    const sample = selectLocalizationQaSample(products);
    const provider = createLocalProductLocalizationProvider();
    for (const source of sample) {
      const copy = provider.localize(source);
      const gate = evaluateLocalizationQuality(source, copy);
      expect(gate.findings, source.cj_product_id).toEqual([]);
      expect(gate.ok, source.cj_product_id).toBe(true);
    }
  });

  it("builds a QA file that matches the persisted JSON artifact", () => {
    const built = buildLocalizationQaSampleFile("2026-09-09T00:00:00.000Z");
    const persisted = readLocalizationQaSampleFile();
    expect(persisted).not.toBeNull();
    expect(built.task_id).toBe(PRODUCT_LOCALIZATION_TASK_ID);
    expect(built.provider).toBe("local");
    expect(built.paid_ai_used).toBe(false);
    expect(built.sample_size).toBe(20);
    expect(built.quality_gate.status).toBe("PASS");
    expect(persisted?.products.map((row) => row.cj_product_id)).toEqual(
      built.products.map((row) => row.cj_product_id)
    );
    expect(persisted?.products.map((row) => row.localized.title_ar)).toEqual(
      built.products.map((row) => row.localized.title_ar)
    );
  });
});

describe("product localization quality gate", () => {
  const good = EDITORIAL_SAMPLE_COPY["1642738075405537280"];

  it("flags an empty Arabic title", () => {
    const gate = evaluateLocalizationQuality(fixtureSource(), { ...good, title_ar: "   " });
    expect(gate.ok).toBe(false);
    expect(gate.findings.some((row) => row.code === "empty_arabic_title")).toBe(true);
  });

  it("flags an identical Arabic/English title", () => {
    const gate = evaluateLocalizationQuality(fixtureSource(), {
      ...good,
      title_ar: good.title_en_clean,
    });
    expect(gate.findings.some((row) => row.code === "identical_arabic_english_title")).toBe(true);
  });

  it("flags leftover supplier keyword spam", () => {
    const gate = evaluateLocalizationQuality(fixtureSource(), {
      ...good,
      title_en_clean:
        "6Pcs Food Silicone Cover Fresh-keeping Dish Stretchy Lid Kitchen Accessories Kitchen Gadgets",
    });
    expect(gate.findings.some((row) => row.code === "untranslated_supplier_spam")).toBe(true);
  });

  it("flags a lost quantity", () => {
    const gate = evaluateLocalizationQuality(fixtureSource(), {
      ...good,
      title_en_clean: "Reusable Silicone Food Cover Set",
      title_ar: "طقم أغطية سيليكون قابلة لإعادة الاستخدام",
      description_en_clean: "Silicone covers for dishes.",
      description_ar: "أغطية سيليكون للأطباق.",
      specifications_en: ["Material: silicone"],
      specifications_ar: ["الخامة: سيليكون"],
    });
    expect(gate.findings.some((row) => row.code === "lost_quantity")).toBe(true);
  });

  it("flags a lost dimension", () => {
    const gate = evaluateLocalizationQuality(
      { source_title: "Silicone mat 30cm x 20cm", source_description: "" },
      {
        ...good,
        title_en_clean: "Silicone baking mat",
        title_ar: "سجادة سيليكون للخَبز",
        description_en_clean: "A silicone mat.",
        description_ar: "سجادة من السيليكون.",
        specifications_en: ["Material: silicone"],
        specifications_ar: ["الخامة: سيليكون"],
      }
    );
    expect(gate.findings.some((row) => row.code === "lost_dimension")).toBe(true);
  });

  it("flags a changed numeric value", () => {
    const gate = evaluateLocalizationQuality(fixtureSource(), {
      ...good,
      specifications_en: [...good.specifications_en, "Quantity: 8 pieces"],
    });
    expect(gate.findings.some((row) => row.code === "changed_numeric_value")).toBe(true);
  });

  it("flags an unsupported medical claim", () => {
    const gate = evaluateLocalizationQuality(fixtureSource(), {
      ...good,
      description_en_clean: `${good.description_en_clean} Clinically proven to heal skin.`,
    });
    expect(gate.findings.some((row) => row.code === "unsupported_claim")).toBe(true);
  });

  it("flags malformed RTL currency artifacts", () => {
    const gate = evaluateLocalizationQuality(fixtureSource(), {
      ...good,
      description_ar: `${good.description_ar} السعر $US ٤٩`,
    });
    expect(gate.findings.some((row) => row.code === "malformed_rtl")).toBe(true);
  });

  it("flags suspicious MT artifacts", () => {
    const gate = evaluateLocalizationQuality(fixtureSource(), {
      ...good,
      description_ar: `${good.description_ar} the ال kitchen gadgets`,
    });
    expect(gate.findings.some((row) => row.code === "suspicious_mt_artifact")).toBe(true);
  });
});

describe("product localization provider", () => {
  it("defaults to the local provider and does not call paid APIs", () => {
    expect(readProductLocalizationProviderId({ PRODUCT_LOCALIZATION_PROVIDER: undefined })).toBe(
      "local"
    );
    expect(createProductLocalizationProvider("local").id).toBe("local");
    expect(() => createGeminiProductLocalizationProvider().localize({
      cj_product_id: "x",
      sku: null,
      source: "approved_59",
      source_title: "Silicone spatula",
      source_description: "",
      department: "HOME",
      subcategory: "Kitchen",
      retail_price_minor: 1999,
      currency: "USD",
      cover_url: null,
      slug: null,
    })).toThrow(/Paid product localization providers are disabled/);
  });

  it("keeps paid provider modules free of API key reads", () => {
    const src = readFileSync(join(process.cwd(), "lib/store/productLocalization/paidProviders.ts"), "utf8");
    expect(src).not.toMatch(/OPENAI_API_KEY|GEMINI_API_KEY|process\.env/);
    expect(src).not.toMatch(/generativelanguage|api\.openai\.com/);
  });

  it("rule-based fallback is not good enough for professional Arabic", () => {
    const provider = createLocalProductLocalizationProvider();
    const copy = provider.localize({
      cj_product_id: "NOT-IN-EDITORIAL",
      sku: null,
      source: "expansion",
      source_title: "XHORSE HDS Cable OBD2 Diagnostic Cable",
      source_description: "HOME / Kitchen.",
      department: "HOME",
      subcategory: "Kitchen",
      retail_price_minor: 2099,
      currency: "USD",
      cover_url: null,
      slug: null,
    });
    const gate = evaluateLocalizationQuality(
      {
        source_title: "XHORSE HDS Cable OBD2 Diagnostic Cable",
        source_description: "HOME / Kitchen.",
      },
      copy
    );
    expect(gate.ok).toBe(false);
  });
});

describe("store locale money on the QA sample", () => {
  it("formats EN and AR currency without inventing prices", () => {
    expect(formatCurrency("en", 49.99, "USD")).toBe("$49.99");
    expect(formatCurrency("ar", 49.99, "USD")).toBe("49.99 US$");
    expect(formatMinorUnits(4999, "USD")).toMatch(/49\.99/);
    assertTaxonomyLocaleComplete();
  });
});
