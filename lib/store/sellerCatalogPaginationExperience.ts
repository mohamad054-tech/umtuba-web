/**
 * Seller Catalog Pagination Experience V1.
 * Page-replacement UX over cursor data-access. Opaque history in URL (`ph`).
 */

import {
  buildSellerCatalogProductsHref,
  normalizeSellerCatalogPageSize,
  normalizeSellerCatalogSearch,
  SELLER_CATALOG_DEFAULT_PAGE_SIZE,
  type SellerCatalogAppliedFilters,
} from "./sellerCatalogDataAccess";
import type {
  SellerCatalogHealthFilter,
  SellerCatalogProductTypeFilter,
  SellerCatalogSearchSortKey,
  SellerCatalogStatusFilter,
} from "./sellerCatalogSearchFiltering";

export const SELLER_CATALOG_PAGINATION_EXPERIENCE_ID =
  "commerce.seller.catalog_pagination_experience_v1" as const;

/** Cap history depth to keep URLs bounded. */
export const SELLER_CATALOG_MAX_CURSOR_HISTORY = 40 as const;

export type SellerCatalogCursorHistory = {
  v: 1;
  /** Opaque cursors used to enter pages after page 1. Length = pageNumber - 1. */
  stack: string[];
};

export type SellerCatalogPaginationUrlState = {
  search: string;
  status: SellerCatalogStatusFilter;
  productType: SellerCatalogProductTypeFilter;
  sort: SellerCatalogSearchSortKey;
  health: SellerCatalogHealthFilter;
  limit: number;
  cursor: string | null;
  history: SellerCatalogCursorHistory;
  /** Local display page (1-based). Derived from history when possible. */
  pageNumber: number;
};

export type SellerCatalogResultKind =
  | "empty_catalog"
  | "no_results"
  | "page"
  | "end"
  | "invalid_cursor"
  | "load_error";

export function encodeSellerCatalogCursorHistory(
  history: SellerCatalogCursorHistory
): string {
  const stack = history.stack
    .slice(-SELLER_CATALOG_MAX_CURSOR_HISTORY)
    .map((c) => String(c ?? ""));
  const json = JSON.stringify({ v: 1, stack });
  return Buffer.from(json, "utf8").toString("base64url");
}

export function decodeSellerCatalogCursorHistory(
  raw: string | null | undefined
): SellerCatalogCursorHistory {
  const value = String(raw ?? "").trim();
  if (!value) return { v: 1, stack: [] };
  try {
    const json = Buffer.from(value, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as { v?: unknown; stack?: unknown };
    if (parsed.v !== 1 || !Array.isArray(parsed.stack)) {
      return { v: 1, stack: [] };
    }
    const stack = parsed.stack
      .filter((entry): entry is string => typeof entry === "string")
      .slice(-SELLER_CATALOG_MAX_CURSOR_HISTORY);
    return { v: 1, stack };
  } catch {
    // Fail-closed: ignore corrupt history; do not expand scope.
    return { v: 1, stack: [] };
  }
}

function getParam(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
  key: string
): string | undefined {
  if (params instanceof URLSearchParams) {
    return params.get(key) ?? undefined;
  }
  const raw = params[key];
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

export function parseSellerCatalogPaginationUrlState(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
  catalogUrlState: {
    search?: string | null;
    status?: SellerCatalogStatusFilter;
    productType?: SellerCatalogProductTypeFilter;
    sort?: SellerCatalogSearchSortKey;
    health?: SellerCatalogHealthFilter;
    limit?: number;
    cursor?: string | null;
  }
): SellerCatalogPaginationUrlState {
  const history = decodeSellerCatalogCursorHistory(getParam(params, "ph"));
  const cursor = catalogUrlState.cursor?.trim() || null;
  // Display page is derived from opaque history length (not trusted alone).
  const pageNumber = cursor ? history.stack.length + 1 : 1;

  return {
    search: normalizeSellerCatalogSearch(catalogUrlState.search),
    status: catalogUrlState.status ?? "all",
    productType: catalogUrlState.productType ?? "all",
    sort: catalogUrlState.sort ?? "updated_desc",
    health: catalogUrlState.health ?? "any",
    limit: normalizeSellerCatalogPageSize(catalogUrlState.limit),
    cursor,
    history,
    pageNumber: Math.max(1, pageNumber),
  };
}

export function buildSellerCatalogPaginationHref(input: {
  search?: string | null;
  status?: SellerCatalogStatusFilter;
  productType?: SellerCatalogProductTypeFilter;
  sort?: SellerCatalogSearchSortKey;
  health?: SellerCatalogHealthFilter;
  limit?: number;
  cursor?: string | null;
  history?: SellerCatalogCursorHistory | null;
  pageNumber?: number;
}): string {
  const base = buildSellerCatalogProductsHref({
    search: input.search,
    status: input.status,
    productType: input.productType,
    sort: input.sort,
    health: input.health,
    limit: input.limit,
    cursor: input.cursor,
  });
  const history = input.history ?? { v: 1 as const, stack: [] };
  const qs = new URLSearchParams(base.includes("?") ? base.split("?")[1] : "");
  if (history.stack.length > 0) {
    qs.set("ph", encodeSellerCatalogCursorHistory(history));
  }
  const pageNumber =
    input.pageNumber ??
    (input.cursor?.trim() ? history.stack.length + 1 : 1);
  if (pageNumber > 1) {
    qs.set("p", String(pageNumber));
  }
  const path = base.split("?")[0] || "/seller/store/products";
  const query = qs.toString();
  return query ? `${path}?${query}` : path;
}

/** Filter/search/sort changes always reset to page 1 (clear cursor + history). */
export function buildSellerCatalogFilterResetHref(input: {
  search?: string | null;
  status?: SellerCatalogStatusFilter;
  productType?: SellerCatalogProductTypeFilter;
  sort?: SellerCatalogSearchSortKey;
  health?: SellerCatalogHealthFilter;
  limit?: number;
}): string {
  return buildSellerCatalogPaginationHref({
    ...input,
    cursor: null,
    history: { v: 1, stack: [] },
    pageNumber: 1,
  });
}

export function buildNextPaginationHref(input: {
  applied: SellerCatalogAppliedFilters;
  pageSize: number;
  currentCursor: string | null;
  nextCursor: string;
  history: SellerCatalogCursorHistory;
  pageNumber: number;
}): string {
  const stack = [
    ...input.history.stack,
    input.currentCursor?.trim() ? input.currentCursor.trim() : "",
  ].slice(-SELLER_CATALOG_MAX_CURSOR_HISTORY);
  return buildSellerCatalogPaginationHref({
    search: input.applied.search,
    status: input.applied.status,
    productType: input.applied.productType,
    sort: input.applied.sort,
    health: input.applied.health,
    limit: input.pageSize,
    cursor: input.nextCursor,
    history: { v: 1, stack },
    pageNumber: input.pageNumber + 1,
  });
}

export function buildPreviousPaginationHref(input: {
  applied: SellerCatalogAppliedFilters;
  pageSize: number;
  history: SellerCatalogCursorHistory;
  pageNumber: number;
}): string | null {
  if (input.pageNumber <= 1 && input.history.stack.length === 0) {
    return null;
  }
  if (input.history.stack.length === 0) {
    // Cursor present without history — return to first page safely.
    return buildSellerCatalogFilterResetHref({
      search: input.applied.search,
      status: input.applied.status,
      productType: input.applied.productType,
      sort: input.applied.sort,
      health: input.applied.health,
      limit: input.pageSize,
    });
  }
  const stack = [...input.history.stack];
  const previousCursorRaw = stack.pop() ?? "";
  const previousCursor = previousCursorRaw.trim() ? previousCursorRaw : null;
  return buildSellerCatalogPaginationHref({
    search: input.applied.search,
    status: input.applied.status,
    productType: input.applied.productType,
    sort: input.applied.sort,
    health: input.applied.health,
    limit: input.pageSize,
    cursor: previousCursor,
    history: { v: 1, stack },
    pageNumber: Math.max(1, input.pageNumber - 1),
  });
}

export function deriveSellerCatalogResultKind(input: {
  productCount: number;
  hasMore: boolean;
  pageNumber: number;
  applied: SellerCatalogAppliedFilters;
  errorCode?: string | null;
}): SellerCatalogResultKind {
  if (input.errorCode === "invalid_cursor") return "invalid_cursor";
  if (input.errorCode) return "load_error";

  const filtersActive =
    Boolean(input.applied.search) ||
    input.applied.status !== "all" ||
    input.applied.productType !== "all" ||
    input.applied.health !== "any";

  if (input.productCount === 0 && !filtersActive && input.pageNumber <= 1) {
    return "empty_catalog";
  }
  if (input.productCount === 0 && filtersActive) {
    return "no_results";
  }
  if (input.productCount === 0 && input.pageNumber > 1) {
    return "no_results";
  }
  if (!input.hasMore) return "end";
  return "page";
}

export function sellerCatalogPaginationLabels(input: {
  pageNumber: number;
  itemCount: number;
  hasMore: boolean;
  kind: SellerCatalogResultKind;
}): {
  pageLabel: string;
  statusLabel: string;
  nextLabel: string;
  previousLabel: string;
  nextDisabled: boolean;
  previousDisabled: boolean;
} {
  const pageLabel = `Page ${Math.max(1, input.pageNumber)}`;
  let statusLabel = `Showing ${input.itemCount} item${input.itemCount === 1 ? "" : "s"}`;
  if (input.kind === "empty_catalog") {
    statusLabel = "No products yet";
  } else if (input.kind === "no_results") {
    statusLabel = "No products match these filters";
  } else if (input.kind === "end") {
    statusLabel = `${statusLabel} · No more products`;
  } else if (input.hasMore) {
    statusLabel = `${statusLabel} · More available`;
  }

  return {
    pageLabel,
    statusLabel,
    nextLabel: "Next",
    previousLabel: "Previous",
    nextDisabled: !input.hasMore,
    previousDisabled: input.pageNumber <= 1,
  };
}

export function defaultPaginationPageSize(): number {
  return SELLER_CATALOG_DEFAULT_PAGE_SIZE;
}
