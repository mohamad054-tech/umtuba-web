import { describe, expect, it } from "vitest";
import {
  applyGeminiCopy,
  GEMINI_BATCH_SIZE,
  GEMINI_MAX_CONCURRENCY,
  selectGeminiReviewQueue,
} from "./geminiBatch";
import type { LocalizedCatalogProduct } from "./types";

const row = {
  cj_product_id: "test-1",
  sku: null,
  source: "expansion",
  source_title: "6Pcs Silicone Food Cover",
  source_description: "Silicone covers.",
  department: "HOME",
  subcategory: "Kitchen",
  retail_price_minor: 1999,
  currency: "USD",
  cover_url: null,
  slug: null,
  localized: {
    title_en_clean: "",
    title_ar: "",
    description_en_clean: "",
    description_ar: "",
    specifications_en: [],
    specifications_ar: [],
    department_en: "",
    department_ar: "",
    subcategory_en: "",
    subcategory_ar: "",
    search_keywords_en: [],
    search_keywords_ar: [],
  },
  quality: { ok: false, findings: [] },
  status: "manual_review_required",
  review_reason: "queued",
  gold_standard_gaps: ["manual_review_required"],
  catalog_qa: [{ flag: "LOCALIZATION_REVIEW", reason: "queued" }],
} satisfies LocalizedCatalogProduct;

describe("gemini localization validation", () => {
  it("uses small serial batches", () => {
    expect(GEMINI_BATCH_SIZE).toBe(5);
    expect(GEMINI_MAX_CONCURRENCY).toBe(1);
  });

  it("selects only listed manual-review IDs", () => {
    const passed = { ...row, cj_product_id: "pass-1", status: "local_pass" as const, review_reason: null };
    const queuedA = { ...row, cj_product_id: "review-a" };
    const queuedB = { ...row, cj_product_id: "review-b" };
    expect(selectGeminiReviewQueue([passed, queuedA, queuedB], ["review-a"]).map((item) => item.cj_product_id)).toEqual([
      "review-a",
    ]);
  });

  it("keeps independent HOLD flags when Gemini copy fails", () => {
    const flagged = {
      ...row,
      catalog_qa: [
        { flag: "LOCALIZATION_REVIEW" as const, reason: "queued" },
        { flag: "IP_REVIEW" as const, reason: "brand" },
        { flag: "PRICE_REVIEW" as const, reason: "margin" },
        { flag: "PRODUCT_DATA_REVIEW" as const, reason: "facts" },
      ],
    };
    const next = applyGeminiCopy(flagged, {
      i: 1,
      title_en_clean: "6-Piece Silicone Food Cover Set",
      title_ar: "6-Piece Silicone Food Cover Set",
      description_en_clean: "A silicone food cover set with 6 pieces.",
      description_ar: "A silicone food cover set with 6 pieces.",
      specifications_en: ["Quantity: 6"],
      specifications_ar: ["Quantity: 6"],
      search_keywords_en: ["cover"],
      search_keywords_ar: ["cover"],
    });
    expect(next.catalog_qa?.some((item) => item.flag === "IP_REVIEW")).toBe(true);
    expect(next.catalog_qa?.some((item) => item.flag === "PRICE_REVIEW")).toBe(true);
    expect(next.catalog_qa?.some((item) => item.flag === "PRODUCT_DATA_REVIEW")).toBe(true);
  });

  it("rejects English-as-Arabic copy", () => {
    const next = applyGeminiCopy(row, {
      i: 1,
      title_en_clean: "6-Piece Silicone Food Cover Set",
      title_ar: "6-Piece Silicone Food Cover Set",
      description_en_clean: "A silicone food cover set with 6 pieces.",
      description_ar: "A silicone food cover set with 6 pieces.",
      specifications_en: ["Quantity: 6"],
      specifications_ar: ["Quantity: 6"],
      search_keywords_en: ["cover"],
      search_keywords_ar: ["cover"],
    });
    expect(next.status).toBe("manual_review_required");
    expect(next.catalog_qa?.some((item) => item.flag === "LOCALIZATION_REVIEW")).toBe(true);
  });
});
