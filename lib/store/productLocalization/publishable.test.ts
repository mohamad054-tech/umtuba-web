import { describe, expect, it } from "vitest";
import { isPublishableLocalizedRow } from "./publishable";
import type { LocalizedCatalogProduct } from "./types";

const base = {
  cj_product_id: "pub-1",
  sku: null,
  source: "expansion",
  source_title: "Silicone Cover",
  source_description: "Silicone cover.",
  department: "HOME",
  subcategory: "Kitchen",
  retail_price_minor: 1999,
  currency: "USD",
  cover_url: "https://example.com/cover.jpg",
  slug: "cover",
  localized: {
    title_en_clean: "Silicone Food Cover",
    title_ar: "غطاء طعام من السيليكون",
    description_en_clean: "A silicone food cover.",
    description_ar: "غطاء طعام من السيليكون للاستخدام اليومي.",
    specifications_en: ["Material: Silicone"],
    specifications_ar: ["الخامة: السيليكون"],
    department_en: "Home",
    department_ar: "المنزل",
    subcategory_en: "Kitchen",
    subcategory_ar: "المطبخ",
    search_keywords_en: ["cover"],
    search_keywords_ar: ["غطاء"],
  },
  quality: { ok: true, findings: [] },
  status: "local_pass",
  review_reason: null,
  gold_standard_gaps: [],
  catalog_qa: [],
} satisfies LocalizedCatalogProduct;

describe("publishable gate", () => {
  it("rejects localization review and commercial HOLDs", () => {
    expect(isPublishableLocalizedRow(base)).toBe(true);
    expect(
      isPublishableLocalizedRow({
        ...base,
        status: "manual_review_required",
        catalog_qa: [{ flag: "LOCALIZATION_REVIEW", reason: "queued" }],
      })
    ).toBe(false);
    expect(
      isPublishableLocalizedRow({
        ...base,
        catalog_qa: [{ flag: "IP_REVIEW", reason: "brand" }],
      })
    ).toBe(false);
    expect(
      isPublishableLocalizedRow({
        ...base,
        catalog_qa: [{ flag: "PRICE_REVIEW", reason: "margin" }],
      })
    ).toBe(false);
  });
});
