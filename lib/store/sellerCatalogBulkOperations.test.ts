import { describe, expect, it } from "vitest";
import {
  buildSellerCatalogBulkSummary,
  clearBulkSelection,
  deriveSellerCatalogBulkToolbar,
  filterBulkSelectionToStore,
  mergeBulkPlanWithExecutionResults,
  planSellerCatalogBulkOperation,
  selectAllVisibleBulkItems,
  toggleBulkSelection,
  type SellerCatalogBulkSelectionItem,
} from "./sellerCatalogBulkOperations";

const STORE_A = "11111111-1111-4111-8111-111111111111";
const STORE_B = "22222222-2222-4222-8222-222222222222";

function item(
  overrides: Partial<SellerCatalogBulkSelectionItem> & { id: string }
): SellerCatalogBulkSelectionItem {
  return {
    title: "Product",
    status: "draft",
    storeId: STORE_A,
    ...overrides,
  };
}

describe("Seller Catalog Bulk Operations Foundation V1", () => {
  it("toggles selection, select-all visible, and clear", () => {
    let selected = clearBulkSelection();
    selected = toggleBulkSelection(
      selected,
      item({ id: "a", title: "A" }),
      true,
      STORE_A
    );
    selected = toggleBulkSelection(
      selected,
      item({ id: "b", title: "B", status: "active" }),
      true,
      STORE_A
    );
    expect(Object.keys(selected)).toEqual(["a", "b"]);

    selected = selectAllVisibleBulkItems(
      selected,
      [item({ id: "c", title: "C" }), item({ id: "a", title: "A" })],
      STORE_A
    );
    expect(Object.keys(selected).sort()).toEqual(["a", "b", "c"]);

    selected = clearBulkSelection();
    expect(selected).toEqual({});
  });

  it("rejects cross-store selection and planning", () => {
    const selected = toggleBulkSelection(
      {},
      item({ id: "x", storeId: STORE_B }),
      true,
      STORE_A
    );
    expect(selected).toEqual({});

    const filtered = filterBulkSelectionToStore(
      [item({ id: "ok" }), item({ id: "bad", storeId: STORE_B })],
      STORE_A
    );
    expect(filtered.owned.map((i) => i.id)).toEqual(["ok"]);
    expect(filtered.rejected[0]?.reason).toContain("store scope");
  });

  it("plans submit and archive with skips for ineligible statuses", () => {
    const plan = planSellerCatalogBulkOperation({
      operation: "submit_review",
      storeId: STORE_A,
      items: [
        item({ id: "1", status: "draft" }),
        item({ id: "2", status: "active" }),
      ],
    });
    expect(plan.eligible.map((i) => i.id)).toEqual(["1"]);
    expect(plan.skipped.map((i) => i.id)).toEqual(["2"]);

    const archive = planSellerCatalogBulkOperation({
      operation: "archive",
      storeId: STORE_A,
      items: [
        item({ id: "1", status: "draft" }),
        item({ id: "2", status: "archived" }),
      ],
    });
    expect(archive.eligible.map((i) => i.id)).toEqual(["1"]);
    expect(archive.skipped[0]?.reason).toContain("archived");
  });

  it("keeps publish/unpublish/restore disabled and deferred", () => {
    const toolbar = deriveSellerCatalogBulkToolbar({ selectedCount: 2 });
    const publish = toolbar.find((a) => a.id === "publish");
    const unpublish = toolbar.find((a) => a.id === "unpublish");
    const restore = toolbar.find((a) => a.id === "restore");
    expect(publish?.enabled).toBe(false);
    expect(unpublish?.enabled).toBe(false);
    expect(restore?.enabled).toBe(false);
    expect(publish?.reason).toMatch(/cannot self-publish/i);

    const plan = planSellerCatalogBulkOperation({
      operation: "publish",
      storeId: STORE_A,
      items: [item({ id: "1" })],
    });
    expect(plan.supported).toBe(false);
    expect(plan.eligible).toEqual([]);
  });

  it("merges mixed success/failure/skipped into partial summary", () => {
    const plan = planSellerCatalogBulkOperation({
      operation: "archive",
      storeId: STORE_A,
      items: [
        item({ id: "1", status: "draft", title: "One" }),
        item({ id: "2", status: "archived", title: "Two" }),
        item({ id: "3", status: "active", title: "Three" }),
      ],
    });
    const summary = mergeBulkPlanWithExecutionResults({
      plan,
      execution: [
        { productId: "1", ok: true },
        { productId: "3", ok: false, message: "Unable to archive product." },
      ],
    });
    expect(summary.succeeded).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.skipped).toBe(1);
    expect(summary.overall).toBe("partial");
  });

  it("builds empty and full-success summaries", () => {
    expect(
      buildSellerCatalogBulkSummary({
        operation: "submit_review",
        results: [],
      }).overall
    ).toBe("empty");
    expect(
      buildSellerCatalogBulkSummary({
        operation: "submit_review",
        results: [{ productId: "1", outcome: "success" }],
      }).overall
    ).toBe("success");
  });

  it("preserves prior page selections when selecting visible page items", () => {
    let selected = toggleBulkSelection(
      {},
      item({ id: "page1-a" }),
      true,
      STORE_A
    );
    selected = selectAllVisibleBulkItems(
      selected,
      [item({ id: "page2-a" }), item({ id: "page2-b" })],
      STORE_A
    );
    expect(Object.keys(selected).sort()).toEqual([
      "page1-a",
      "page2-a",
      "page2-b",
    ]);
  });
});
