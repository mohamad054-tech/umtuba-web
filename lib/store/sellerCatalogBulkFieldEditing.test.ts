import { describe, expect, it } from "vitest";
import {
  assertBulkFieldEditBatchSize,
  buildBulkFieldUpdateDraftPayload,
  buildSellerCatalogBulkFieldSummary,
  deferredSellerCatalogBulkFieldReason,
  deriveSellerCatalogBulkFieldToolbar,
  isSellerCatalogBulkFieldSupported,
  mergeBulkFieldPlanWithExecutionResults,
  normalizeBulkCategoryId,
  normalizeBulkShortDescription,
  parseSellerCatalogBulkFieldId,
  planSellerCatalogBulkFieldEdit,
  SELLER_CATALOG_BULK_FIELD_EDIT_MAX,
  type SellerCatalogBulkFieldSelectionItem,
} from "./sellerCatalogBulkFieldEditing";
import {
  clearBulkSelection,
  selectAllVisibleBulkItems,
  toggleBulkSelection,
} from "./sellerCatalogBulkOperations";

const STORE_A = "11111111-1111-4111-8111-111111111111";
const STORE_B = "22222222-2222-4222-8222-222222222222";
const CAT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CAT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function item(
  overrides: Partial<SellerCatalogBulkFieldSelectionItem> & { id: string }
): SellerCatalogBulkFieldSelectionItem {
  return {
    title: "Product",
    status: "draft",
    storeId: STORE_A,
    primaryCategoryId: null,
    shortDescription: null,
    ...overrides,
  };
}

describe("Seller Catalog Bulk Field Editing Foundation V1", () => {
  it("allowlists only category and short_description", () => {
    expect(isSellerCatalogBulkFieldSupported("category")).toBe(true);
    expect(isSellerCatalogBulkFieldSupported("short_description")).toBe(true);
    expect(isSellerCatalogBulkFieldSupported("tags")).toBe(false);
    expect(isSellerCatalogBulkFieldSupported("visibility")).toBe(false);
    expect(isSellerCatalogBulkFieldSupported("price")).toBe(false);
    expect(isSellerCatalogBulkFieldSupported("stock_quantity")).toBe(false);
    expect(parseSellerCatalogBulkFieldId("not_a_field")).toBeNull();
    expect(deferredSellerCatalogBulkFieldReason("tags")).toMatch(/tags/i);
  });

  it("rejects unsupported field and invalid operation in plan", () => {
    const tags = planSellerCatalogBulkFieldEdit({
      field: "tags",
      operation: "add",
      storeId: STORE_A,
      items: [item({ id: "1" })],
    });
    expect(tags.supported).toBe(false);
    expect(tags.eligible).toHaveLength(0);

    const badOp = planSellerCatalogBulkFieldEdit({
      field: "category",
      operation: "add",
      storeId: STORE_A,
      items: [item({ id: "1" })],
    });
    expect(badOp.supported).toBe(false);
    expect(badOp.deferredReason).toMatch(/not allowed/i);
  });

  it("plans category replace and clear with no-ops", () => {
    const replace = planSellerCatalogBulkFieldEdit({
      field: "category",
      operation: "replace",
      storeId: STORE_A,
      items: [
        item({ id: "1", primaryCategoryId: CAT_A }),
        item({ id: "2", primaryCategoryId: CAT_B }),
        item({ id: "3", status: "active", primaryCategoryId: CAT_A }),
      ],
      categoryId: CAT_B,
      categoryFound: true,
      categoryStatus: "active",
    });
    expect(replace.supported).toBe(true);
    expect(replace.eligible.map((r) => r.id)).toEqual(["1"]);
    expect(replace.skipped.some((r) => r.id === "2" && /no-op/i.test(r.reason))).toBe(
      true
    );
    expect(replace.skipped.some((r) => r.id === "3")).toBe(true);
    expect(replace.expectedImpact).toMatch(/1 product/);

    const clear = planSellerCatalogBulkFieldEdit({
      field: "category",
      operation: "clear",
      storeId: STORE_A,
      items: [
        item({ id: "a", primaryCategoryId: CAT_A }),
        item({ id: "b", primaryCategoryId: null }),
      ],
    });
    expect(clear.eligible.map((r) => r.id)).toEqual(["a"]);
    expect(clear.skipped[0]?.reason).toMatch(/already empty/i);
  });

  it("plans short_description add-like replace/clear and rejects empty replace", () => {
    const replace = planSellerCatalogBulkFieldEdit({
      field: "short_description",
      operation: "replace",
      storeId: STORE_A,
      items: [
        item({ id: "1", shortDescription: "Old" }),
        item({ id: "2", shortDescription: "Same" }),
      ],
      shortDescription: "Same",
    });
    expect(replace.eligible.map((r) => r.id)).toEqual(["1"]);
    expect(replace.skipped[0]?.reason).toMatch(/no-op/i);

    const empty = planSellerCatalogBulkFieldEdit({
      field: "short_description",
      operation: "replace",
      storeId: STORE_A,
      items: [item({ id: "1" })],
      shortDescription: "   ",
    });
    expect(empty.supported).toBe(false);

    const clear = planSellerCatalogBulkFieldEdit({
      field: "short_description",
      operation: "clear",
      storeId: STORE_A,
      items: [
        item({ id: "1", shortDescription: "Text" }),
        item({ id: "2", shortDescription: null }),
      ],
    });
    expect(clear.eligible.map((r) => r.id)).toEqual(["1"]);
  });

  it("protects cross-store and dedupes duplicate ids", () => {
    const plan = planSellerCatalogBulkFieldEdit({
      field: "category",
      operation: "clear",
      storeId: STORE_A,
      items: [
        item({ id: "1", primaryCategoryId: CAT_A }),
        item({ id: "1", primaryCategoryId: CAT_A }),
        item({ id: "x", storeId: STORE_B, primaryCategoryId: CAT_A }),
      ],
    });
    expect(plan.selectedCount).toBe(2);
    expect(plan.eligible.map((r) => r.id)).toEqual(["1"]);
    expect(plan.skipped.some((r) => r.id === "x")).toBe(true);
  });

  it("enforces max batch size", () => {
    expect(assertBulkFieldEditBatchSize(0).ok).toBe(false);
    expect(assertBulkFieldEditBatchSize(SELLER_CATALOG_BULK_FIELD_EDIT_MAX).ok).toBe(
      true
    );
    expect(
      assertBulkFieldEditBatchSize(SELLER_CATALOG_BULK_FIELD_EDIT_MAX + 1).ok
    ).toBe(false);

    const items = Array.from({ length: SELLER_CATALOG_BULK_FIELD_EDIT_MAX + 1 }, (_, i) =>
      item({ id: `p-${i}`, primaryCategoryId: CAT_A })
    );
    const plan = planSellerCatalogBulkFieldEdit({
      field: "category",
      operation: "clear",
      storeId: STORE_A,
      items,
    });
    expect(plan.supported).toBe(false);
    expect(plan.eligible).toHaveLength(0);
  });

  it("builds preview counts and partial success summary", () => {
    const plan = planSellerCatalogBulkFieldEdit({
      field: "short_description",
      operation: "replace",
      storeId: STORE_A,
      items: [
        item({ id: "ok", shortDescription: "a" }),
        item({ id: "skip", shortDescription: "keep" }),
        item({ id: "fail", shortDescription: "b" }),
      ],
      shortDescription: "keep",
    });
    expect(plan.eligible).toHaveLength(2);
    expect(plan.skipped).toHaveLength(1);
    expect(plan.warnings.length).toBeGreaterThan(0);

    const summary = mergeBulkFieldPlanWithExecutionResults({
      plan,
      execution: [
        { productId: "ok", ok: true },
        { productId: "fail", ok: false, message: "Unable to update product." },
      ],
    });
    expect(summary.overall).toBe("partial");
    expect(summary.succeeded).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.skipped).toBe(1);

    expect(
      buildSellerCatalogBulkFieldSummary({
        field: "category",
        operation: "replace",
        results: [
          { productId: "1", outcome: "success" },
          { productId: "2", outcome: "success" },
        ],
      }).overall
    ).toBe("success");
  });

  it("builds updateDraftProduct payloads and validates values", () => {
    expect(
      buildBulkFieldUpdateDraftPayload({
        field: "category",
        operation: "replace",
        categoryId: CAT_A,
      })
    ).toEqual({ categoryId: CAT_A });
    expect(
      buildBulkFieldUpdateDraftPayload({
        field: "category",
        operation: "clear",
      })
    ).toEqual({ clearPrimaryCategory: true });
    expect(
      buildBulkFieldUpdateDraftPayload({
        field: "short_description",
        operation: "clear",
      })
    ).toEqual({ shortDescription: "" });

    expect(normalizeBulkCategoryId("bad").ok).toBe(false);
    expect(normalizeBulkCategoryId(CAT_A).ok).toBe(true);
    expect(normalizeBulkShortDescription("").ok).toBe(false);
    expect(normalizeBulkShortDescription("  hi  ").ok).toBe(true);
  });

  it("disables unsupported fields in field toolbar and keeps selection model", () => {
    const empty = deriveSellerCatalogBulkFieldToolbar({ selectedCount: 0 });
    expect(empty.every((row) => !row.enabled)).toBe(true);

    const toolbar = deriveSellerCatalogBulkFieldToolbar({ selectedCount: 2 });
    expect(toolbar.find((r) => r.id === "category")?.enabled).toBe(true);
    expect(toolbar.find((r) => r.id === "tags")?.enabled).toBe(false);
    expect(toolbar.find((r) => r.id === "visibility")?.reason).toMatch(
      /deferred/i
    );

    let selected = clearBulkSelection();
    selected = toggleBulkSelection(
      selected,
      item({ id: "a" }),
      true,
      STORE_A
    );
    selected = selectAllVisibleBulkItems(
      selected,
      [item({ id: "b" }), item({ id: "a" })],
      STORE_A
    );
    expect(Object.keys(selected).sort()).toEqual(["a", "b"]);
  });

  it("rejects invalid category when categoryFound is false", () => {
    const plan = planSellerCatalogBulkFieldEdit({
      field: "category",
      operation: "replace",
      storeId: STORE_A,
      items: [item({ id: "1" })],
      categoryId: CAT_A,
      categoryFound: false,
    });
    expect(plan.supported).toBe(false);
    expect(plan.deferredReason).toMatch(/not found/i);
  });
});
