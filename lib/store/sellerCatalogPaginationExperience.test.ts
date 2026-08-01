import { describe, expect, it } from "vitest";
import {
  buildNextPaginationHref,
  buildPreviousPaginationHref,
  buildSellerCatalogFilterResetHref,
  buildSellerCatalogPaginationHref,
  decodeSellerCatalogCursorHistory,
  deriveSellerCatalogResultKind,
  encodeSellerCatalogCursorHistory,
  parseSellerCatalogPaginationUrlState,
  sellerCatalogPaginationLabels,
} from "./sellerCatalogPaginationExperience";
import type { SellerCatalogAppliedFilters } from "./sellerCatalogDataAccess";

const applied: SellerCatalogAppliedFilters = {
  search: "",
  status: "all",
  productType: "all",
  sort: "updated_desc",
  health: "any",
  healthFilterScope: "none",
  serverStatus: "all",
};

describe("Seller Catalog Pagination Experience V1", () => {
  it("encodes and decodes cursor history fail-closed", () => {
    const encoded = encodeSellerCatalogCursorHistory({
      v: 1,
      stack: ["", "cursor-a"],
    });
    expect(decodeSellerCatalogCursorHistory(encoded)).toEqual({
      v: 1,
      stack: ["", "cursor-a"],
    });
    expect(decodeSellerCatalogCursorHistory("%%%")).toEqual({
      v: 1,
      stack: [],
    });
  });

  it("preserves filters in href and clears cursor on filter reset", () => {
    const href = buildSellerCatalogPaginationHref({
      search: "lamp",
      status: "draft",
      sort: "newest",
      cursor: "abc",
      history: { v: 1, stack: [""] },
      pageNumber: 2,
    });
    expect(href).toContain("q=lamp");
    expect(href).toContain("status=draft");
    expect(href).toContain("sort=newest");
    expect(href).toContain("cursor=abc");
    expect(href).toContain("ph=");
    expect(href).toContain("p=2");

    const reset = buildSellerCatalogFilterResetHref({
      search: "lamp",
      status: "draft",
      sort: "newest",
    });
    expect(reset).toContain("q=lamp");
    expect(reset).not.toContain("cursor=");
    expect(reset).not.toContain("ph=");
    expect(reset).not.toContain("p=");
  });

  it("builds next/previous with history stack", () => {
    const next = buildNextPaginationHref({
      applied,
      pageSize: 25,
      currentCursor: null,
      nextCursor: "c1",
      history: { v: 1, stack: [] },
      pageNumber: 1,
    });
    expect(next).toContain("cursor=c1");
    expect(next).toContain("p=2");

    const paginated = parseSellerCatalogPaginationUrlState(
      new URLSearchParams(next.split("?")[1] ?? ""),
      {
        ...applied,
        cursor: "c1",
        limit: 25,
      }
    );
    expect(paginated.pageNumber).toBe(2);
    expect(paginated.history.stack).toEqual([""]);

    const prev = buildPreviousPaginationHref({
      applied,
      pageSize: 25,
      history: paginated.history,
      pageNumber: 2,
    });
    expect(prev).toBeTruthy();
    expect(prev).not.toContain("cursor=");
    expect(prev).not.toContain("p=");
  });

  it("disables previous on first page and next at end", () => {
    const first = sellerCatalogPaginationLabels({
      pageNumber: 1,
      itemCount: 10,
      hasMore: true,
      kind: "page",
    });
    expect(first.previousDisabled).toBe(true);
    expect(first.nextDisabled).toBe(false);
    expect(first.pageLabel).toBe("Page 1");

    const end = sellerCatalogPaginationLabels({
      pageNumber: 3,
      itemCount: 4,
      hasMore: false,
      kind: "end",
    });
    expect(end.nextDisabled).toBe(true);
    expect(end.previousDisabled).toBe(false);
    expect(end.statusLabel).toContain("No more products");
  });

  it("classifies empty / no-results / end / invalid cursor", () => {
    expect(
      deriveSellerCatalogResultKind({
        productCount: 0,
        hasMore: false,
        pageNumber: 1,
        applied,
      })
    ).toBe("empty_catalog");

    expect(
      deriveSellerCatalogResultKind({
        productCount: 0,
        hasMore: false,
        pageNumber: 1,
        applied: { ...applied, search: "zzz" },
      })
    ).toBe("no_results");

    expect(
      deriveSellerCatalogResultKind({
        productCount: 5,
        hasMore: false,
        pageNumber: 2,
        applied,
      })
    ).toBe("end");

    expect(
      deriveSellerCatalogResultKind({
        productCount: 0,
        hasMore: false,
        pageNumber: 1,
        applied,
        errorCode: "invalid_cursor",
      })
    ).toBe("invalid_cursor");
  });

  it("does not put storeId in pagination URLs", () => {
    const href = buildSellerCatalogPaginationHref({
      search: "x",
      cursor: "c",
      history: { v: 1, stack: ["a"] },
      pageNumber: 2,
    });
    expect(href.toLowerCase()).not.toContain("storeid");
    expect(href).not.toContain("store_id");
  });
});
