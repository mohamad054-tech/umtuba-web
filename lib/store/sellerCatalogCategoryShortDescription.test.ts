import { describe, expect, it } from "vitest";
import {
  buildSellerCatalogCategoryShortDescriptionDisplay,
  formatSellerCatalogShortDescriptionPreview,
  normalizeSellerCatalogShortDescription,
  requireSellerCatalogShortDescription,
  resolveSellerCatalogCategoryLabel,
  SELLER_CATALOG_SHORT_DESCRIPTION_MAX,
} from "./sellerCatalogCategoryShortDescription";
import { validateProductDraftInput } from "./validators";
import { normalizeBulkShortDescription } from "./sellerCatalogBulkFieldEditing";

const CAT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CAT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const categories = [
  { id: CAT_A, name: "Home & Living" },
  { id: CAT_B, name: "Digital Tools" },
];

describe("Seller Catalog Category & Short Description Foundation V1", () => {
  it("normalizes empty short description to null and rejects over-length", () => {
    expect(normalizeSellerCatalogShortDescription(null)).toEqual({
      ok: true,
      value: null,
    });
    expect(normalizeSellerCatalogShortDescription("   ")).toEqual({
      ok: true,
      value: null,
    });
    expect(normalizeSellerCatalogShortDescription("  Hello card  ")).toEqual({
      ok: true,
      value: "Hello card",
    });
    const tooLong = "x".repeat(SELLER_CATALOG_SHORT_DESCRIPTION_MAX + 1);
    expect(normalizeSellerCatalogShortDescription(tooLong).ok).toBe(false);
  });

  it("requires non-empty short description for bulk replace path", () => {
    expect(requireSellerCatalogShortDescription("").ok).toBe(false);
    expect(requireSellerCatalogShortDescription("Keep").ok).toBe(true);
    expect(normalizeBulkShortDescription("Keep")).toEqual({
      ok: true,
      value: "Keep",
    });
  });

  it("resolves category labels from existing taxonomy options", () => {
    expect(
      resolveSellerCatalogCategoryLabel({
        primaryCategoryId: CAT_A,
        categories,
      })
    ).toBe("Home & Living");
    expect(
      resolveSellerCatalogCategoryLabel({
        primaryCategoryId: null,
        categories,
      })
    ).toBeNull();
    expect(
      resolveSellerCatalogCategoryLabel({
        primaryCategoryId: "missing",
        categories,
      })
    ).toBeNull();
  });

  it("builds list display with empty-value backward compatibility", () => {
    const empty = buildSellerCatalogCategoryShortDescriptionDisplay({
      primaryCategoryId: null,
      shortDescription: null,
      categories,
    });
    expect(empty.hasCategory).toBe(false);
    expect(empty.hasShortDescription).toBe(false);
    expect(empty.categoryLabel).toBeNull();
    expect(empty.shortDescriptionPreview).toBeNull();

    const filled = buildSellerCatalogCategoryShortDescriptionDisplay({
      primaryCategoryId: CAT_B,
      shortDescription: "A concise seller card blurb.",
      categories,
    });
    expect(filled.categoryLabel).toBe("Digital Tools");
    expect(filled.shortDescriptionPreview).toBe("A concise seller card blurb.");
  });

  it("previews long short descriptions without inventing storage truncate", () => {
    const long = "Word ".repeat(50).trim();
    const preview = formatSellerCatalogShortDescriptionPreview(long, 40);
    expect(preview).not.toBeNull();
    expect(preview!.endsWith("…")).toBe(true);
    expect(preview!.length).toBeLessThanOrEqual(40);
  });

  it("wires draft validation to shared short description rules", () => {
    const ok = validateProductDraftInput({
      title: "Clay Bowl",
      slug: "clay-bowl",
      shortDescription: "  Daily table bowl  ",
      description: "",
      productType: "physical",
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.value.shortDescription).toBe("Daily table bowl");
    }

    const empty = validateProductDraftInput({
      title: "Clay Bowl",
      slug: "clay-bowl",
      shortDescription: "   ",
      productType: "physical",
    });
    expect(empty.ok).toBe(true);
    if (empty.ok) {
      expect(empty.value.shortDescription).toBeNull();
    }

    const over = validateProductDraftInput({
      title: "Clay Bowl",
      slug: "clay-bowl",
      shortDescription: "y".repeat(SELLER_CATALOG_SHORT_DESCRIPTION_MAX + 1),
      productType: "physical",
    });
    expect(over.ok).toBe(false);
  });
});
