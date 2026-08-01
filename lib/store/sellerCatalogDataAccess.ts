/**
 * Seller Catalog Data Access Foundation V1.
 * Cursor-based, store-scoped catalog pages. No migrations / RPCs / FTS.
 */

import type {
  SellerCatalogHealthFilter,
  SellerCatalogProductTypeFilter,
  SellerCatalogSearchSortKey,
  SellerCatalogStatusFilter,
} from "./sellerCatalogSearchFiltering";
import type { StoreProductRow } from "./types";

export const SELLER_CATALOG_DATA_ACCESS_ID =
  "commerce.seller.catalog_data_access_v1" as const;

export const SELLER_CATALOG_DEFAULT_PAGE_SIZE = 25 as const;
export const SELLER_CATALOG_MIN_PAGE_SIZE = 1 as const;
export const SELLER_CATALOG_MAX_PAGE_SIZE = 100 as const;
export const SELLER_CATALOG_MAX_SEARCH_LENGTH = 80 as const;

export type SellerCatalogServerStatusFilter =
  | "all"
  | "draft"
  | "published"
  | "pending_review"
  | "rejected";

export type SellerCatalogPageRequest = {
  storeId: string;
  limit?: number;
  cursor?: string | null;
  search?: string | null;
  status?: SellerCatalogStatusFilter;
  productType?: SellerCatalogProductTypeFilter;
  sort?: SellerCatalogSearchSortKey;
  health?: SellerCatalogHealthFilter;
};

export type SellerCatalogAppliedFilters = {
  search: string;
  status: SellerCatalogStatusFilter;
  productType: SellerCatalogProductTypeFilter;
  sort: SellerCatalogSearchSortKey;
  health: SellerCatalogHealthFilter;
  /** Health/ready/needs_attention are not catalog-wide in V1. */
  healthFilterScope: "none" | "page_only";
  serverStatus: SellerCatalogServerStatusFilter;
};

export type SellerCatalogPageStats = {
  productQueryCount: number;
  variantSearchQueryCount: number;
  fetchedRowCount: number;
};

export type SellerCatalogPageSuccess = {
  ok: true;
  items: StoreProductRow[];
  nextCursor: string | null;
  hasMore: boolean;
  pageSize: number;
  applied: SellerCatalogAppliedFilters;
  stats: SellerCatalogPageStats;
};

export type SellerCatalogPageFailure = {
  ok: false;
  code:
    | "invalid_store"
    | "invalid_cursor"
    | "unsupported_sort"
    | "invalid_request"
    | "query_failed";
  message: string;
};

export type SellerCatalogPageResult =
  | SellerCatalogPageSuccess
  | SellerCatalogPageFailure;

export type SellerCatalogDecodedCursor = {
  v: 1;
  s: SellerCatalogSearchSortKey;
  k: string;
  i: string;
};

type AnyClient = {
  from: (table: string) => any;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SORT_KEYS: readonly SellerCatalogSearchSortKey[] = [
  "newest",
  "oldest",
  "updated_desc",
  "updated_asc",
  "title_asc",
  "title_desc",
] as const;

const STATUS_KEYS: readonly SellerCatalogStatusFilter[] = [
  "all",
  "draft",
  "published",
  "pending_review",
  "rejected",
  "ready",
  "needs_attention",
] as const;

const TYPE_KEYS: readonly SellerCatalogProductTypeFilter[] = [
  "all",
  "digital",
  "physical",
  "other",
] as const;

const HEALTH_KEYS: readonly SellerCatalogHealthFilter[] = [
  "any",
  "missing_images",
  "missing_description",
  "missing_pricing",
  "missing_inventory",
  "missing_digital_asset",
  "missing_physical_metadata",
] as const;

function isSortKey(value: unknown): value is SellerCatalogSearchSortKey {
  return (
    typeof value === "string" &&
    (SORT_KEYS as readonly string[]).includes(value)
  );
}

function isStatusKey(value: unknown): value is SellerCatalogStatusFilter {
  return (
    typeof value === "string" &&
    (STATUS_KEYS as readonly string[]).includes(value)
  );
}

function isTypeKey(value: unknown): value is SellerCatalogProductTypeFilter {
  return (
    typeof value === "string" &&
    (TYPE_KEYS as readonly string[]).includes(value)
  );
}

function isHealthKey(value: unknown): value is SellerCatalogHealthFilter {
  return (
    typeof value === "string" &&
    (HEALTH_KEYS as readonly string[]).includes(value)
  );
}

export function normalizeSellerCatalogPageSize(raw: unknown): number {
  const n =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && raw.trim()
        ? Number(raw)
        : SELLER_CATALOG_DEFAULT_PAGE_SIZE;
  if (!Number.isFinite(n)) return SELLER_CATALOG_DEFAULT_PAGE_SIZE;
  return Math.min(
    SELLER_CATALOG_MAX_PAGE_SIZE,
    Math.max(SELLER_CATALOG_MIN_PAGE_SIZE, Math.floor(n))
  );
}

export function normalizeSellerCatalogSearch(
  raw: string | null | undefined
): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";
  return trimmed.slice(0, SELLER_CATALOG_MAX_SEARCH_LENGTH);
}

export function escapeIlikePattern(raw: string): string {
  return raw.replace(/[%_,]/g, "");
}

/** Quote PostgREST filter values that contain reserved characters. */
export function quotePostgrestValue(raw: string): string {
  if (/^[A-Za-z0-9_.:-]+$/.test(raw)) return raw;
  return `"${raw.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function toServerStatusFilter(
  status: SellerCatalogStatusFilter
): SellerCatalogServerStatusFilter {
  switch (status) {
    case "draft":
    case "published":
    case "pending_review":
    case "rejected":
      return status;
    default:
      return "all";
  }
}

export function healthRequiresPageLocalFilter(
  status: SellerCatalogStatusFilter,
  health: SellerCatalogHealthFilter
): boolean {
  return (
    status === "ready" ||
    status === "needs_attention" ||
    health !== "any"
  );
}

export function encodeSellerCatalogCursor(
  cursor: SellerCatalogDecodedCursor
): string {
  const json = JSON.stringify({
    v: 1,
    s: cursor.s,
    k: cursor.k,
    i: cursor.i,
  });
  return Buffer.from(json, "utf8").toString("base64url");
}

export function decodeSellerCatalogCursor(
  raw: string | null | undefined
):
  | { ok: true; cursor: SellerCatalogDecodedCursor }
  | { ok: false; message: string } {
  const value = String(raw ?? "").trim();
  if (!value) {
    return { ok: false, message: "Missing catalog cursor." };
  }
  try {
    const json = Buffer.from(value, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as {
      v?: unknown;
      s?: unknown;
      k?: unknown;
      i?: unknown;
    };
    if (parsed.v !== 1) {
      return { ok: false, message: "Unsupported catalog cursor version." };
    }
    if (!isSortKey(parsed.s)) {
      return { ok: false, message: "Catalog cursor sort is invalid." };
    }
    if (typeof parsed.k !== "string" || !parsed.k) {
      return { ok: false, message: "Catalog cursor key is invalid." };
    }
    if (typeof parsed.i !== "string" || !UUID_RE.test(parsed.i)) {
      return { ok: false, message: "Catalog cursor id is invalid." };
    }
    return {
      ok: true,
      cursor: { v: 1, s: parsed.s, k: parsed.k, i: parsed.i },
    };
  } catch {
    return { ok: false, message: "Catalog cursor is malformed." };
  }
}

export function sortKeyValueForProduct(
  product: Pick<StoreProductRow, "id" | "title" | "created_at" | "updated_at">,
  sort: SellerCatalogSearchSortKey
): string {
  switch (sort) {
    case "newest":
    case "oldest":
      return product.created_at;
    case "updated_desc":
    case "updated_asc":
      return product.updated_at;
    case "title_asc":
    case "title_desc":
      return product.title;
    default:
      return product.updated_at;
  }
}

export function buildCursorFromProduct(
  product: Pick<StoreProductRow, "id" | "title" | "created_at" | "updated_at">,
  sort: SellerCatalogSearchSortKey
): string {
  return encodeSellerCatalogCursor({
    v: 1,
    s: sort,
    k: sortKeyValueForProduct(product, sort),
    i: product.id,
  });
}

export type NormalizedSellerCatalogPageRequest = {
  storeId: string;
  pageSize: number;
  cursor: string | null;
  search: string;
  status: SellerCatalogStatusFilter;
  productType: SellerCatalogProductTypeFilter;
  sort: SellerCatalogSearchSortKey;
  health: SellerCatalogHealthFilter;
  serverStatus: SellerCatalogServerStatusFilter;
  healthFilterScope: "none" | "page_only";
};

export function normalizeSellerCatalogPageRequest(
  input: SellerCatalogPageRequest
):
  | { ok: true; value: NormalizedSellerCatalogPageRequest }
  | { ok: false; code: "invalid_store" | "invalid_request"; message: string } {
  const storeId = String(input.storeId ?? "").trim();
  if (!storeId || !UUID_RE.test(storeId)) {
    return {
      ok: false,
      code: "invalid_store",
      message: "A valid store id is required.",
    };
  }

  const status = isStatusKey(input.status) ? input.status : "all";
  const productType = isTypeKey(input.productType) ? input.productType : "all";
  const sort = isSortKey(input.sort) ? input.sort : "updated_desc";
  const health = isHealthKey(input.health) ? input.health : "any";
  const search = normalizeSellerCatalogSearch(input.search);
  const pageSize = normalizeSellerCatalogPageSize(input.limit);
  const cursorRaw = input.cursor == null ? null : String(input.cursor).trim();
  const cursor = cursorRaw ? cursorRaw : null;

  return {
    ok: true,
    value: {
      storeId,
      pageSize,
      cursor,
      search,
      status,
      productType,
      sort,
      health,
      serverStatus: toServerStatusFilter(status),
      healthFilterScope: healthRequiresPageLocalFilter(status, health)
        ? "page_only"
        : "none",
    },
  };
}

export function parseSellerCatalogUrlState(
  params: URLSearchParams | Record<string, string | string[] | undefined>
): Omit<SellerCatalogPageRequest, "storeId"> {
  const get = (key: string): string | undefined => {
    if (params instanceof URLSearchParams) {
      return params.get(key) ?? undefined;
    }
    const raw = params[key];
    if (Array.isArray(raw)) return raw[0];
    return raw;
  };

  const statusRaw = get("status");
  const typeRaw = get("type");
  const sortRaw = get("sort");
  const healthRaw = get("health");
  const limitRaw = get("limit");
  const cursorRaw = get("cursor");
  const searchRaw = get("q") ?? get("search");

  return {
    search: normalizeSellerCatalogSearch(searchRaw),
    status: isStatusKey(statusRaw) ? statusRaw : "all",
    productType: isTypeKey(typeRaw) ? typeRaw : "all",
    sort: isSortKey(sortRaw) ? sortRaw : "updated_desc",
    health: isHealthKey(healthRaw) ? healthRaw : "any",
    limit: normalizeSellerCatalogPageSize(limitRaw),
    cursor: cursorRaw?.trim() || null,
  };
}

export function buildSellerCatalogProductsHref(input: {
  basePath?: string;
  search?: string | null;
  status?: SellerCatalogStatusFilter;
  productType?: SellerCatalogProductTypeFilter;
  sort?: SellerCatalogSearchSortKey;
  health?: SellerCatalogHealthFilter;
  limit?: number;
  cursor?: string | null;
}): string {
  const base = input.basePath ?? "/seller/store/products";
  const qs = new URLSearchParams();
  const search = normalizeSellerCatalogSearch(input.search);
  if (search) qs.set("q", search);
  if (input.status && input.status !== "all") qs.set("status", input.status);
  if (input.productType && input.productType !== "all") {
    qs.set("type", input.productType);
  }
  if (input.sort && input.sort !== "updated_desc") qs.set("sort", input.sort);
  if (input.health && input.health !== "any") qs.set("health", input.health);
  if (
    input.limit != null &&
    input.limit !== SELLER_CATALOG_DEFAULT_PAGE_SIZE
  ) {
    qs.set("limit", String(normalizeSellerCatalogPageSize(input.limit)));
  }
  if (input.cursor?.trim()) qs.set("cursor", input.cursor.trim());
  const query = qs.toString();
  return query ? `${base}?${query}` : base;
}

function compareForSort(
  a: StoreProductRow,
  b: StoreProductRow,
  sort: SellerCatalogSearchSortKey
): number {
  const dir =
    sort === "oldest" || sort === "updated_asc" || sort === "title_asc"
      ? 1
      : -1;
  const keyA = sortKeyValueForProduct(a, sort);
  const keyB = sortKeyValueForProduct(b, sort);
  if (keyA !== keyB) {
    return keyA < keyB ? -1 * dir : 1 * dir;
  }
  if (a.id === b.id) return 0;
  // Tie-breaker: always stable by id in the same direction as primary sort.
  return a.id < b.id ? -1 * dir : 1 * dir;
}

function passesServerStatus(
  row: StoreProductRow,
  status: SellerCatalogServerStatusFilter
): boolean {
  if (status === "all") return true;
  if (status === "draft") return row.status === "draft";
  if (status === "published") return row.status === "active";
  if (status === "pending_review") {
    return row.status === "in_review" || row.status === "pending_review";
  }
  if (status === "rejected") {
    return row.status === "rejected" || row.moderation_status === "rejected";
  }
  return true;
}

function passesProductType(
  row: StoreProductRow,
  productType: SellerCatalogProductTypeFilter
): boolean {
  if (productType === "all") return true;
  const type = String(row.product_type ?? "").toLowerCase();
  if (productType === "digital") return type === "digital";
  if (productType === "physical") return type === "physical";
  return type !== "digital" && type !== "physical";
}

function passesTextSearch(row: StoreProductRow, search: string): boolean {
  if (!search) return true;
  const q = search.toLowerCase();
  if (row.id.toLowerCase().includes(q)) return true;
  if (row.title.toLowerCase().includes(q)) return true;
  if (row.slug.toLowerCase().includes(q)) return true;
  if ((row.short_description ?? "").toLowerCase().includes(q)) return true;
  return false;
}

function isAfterCursor(
  row: StoreProductRow,
  cursor: SellerCatalogDecodedCursor,
  sort: SellerCatalogSearchSortKey
): boolean {
  const key = sortKeyValueForProduct(row, sort);
  const asc =
    sort === "oldest" || sort === "updated_asc" || sort === "title_asc";
  if (asc) {
    if (key > cursor.k) return true;
    if (key < cursor.k) return false;
    return row.id > cursor.i;
  }
  if (key < cursor.k) return true;
  if (key > cursor.k) return false;
  return row.id < cursor.i;
}

export type SellerCatalogMemorySource = {
  rows: StoreProductRow[];
  /** Optional variant tokens for SKU/barcode search evidence. */
  variants?: Array<{ productId: string; sku: string | null; barcode: string | null }>;
};

/**
 * Pure in-memory page loader for tests and deterministic evidence.
 * Mirrors server semantics: store scope, filters, keyset cursor, pageSize+1.
 */
export function listSellerCatalogPageFromMemory(
  source: SellerCatalogMemorySource,
  request: SellerCatalogPageRequest
): SellerCatalogPageResult {
  const normalized = normalizeSellerCatalogPageRequest(request);
  if (!normalized.ok) {
    return {
      ok: false,
      code: normalized.code,
      message: normalized.message,
    };
  }
  const req = normalized.value;
  let productQueryCount = 1;
  let variantSearchQueryCount = 0;

  let decoded: SellerCatalogDecodedCursor | null = null;
  if (req.cursor) {
    const parsed = decodeSellerCatalogCursor(req.cursor);
    if (!parsed.ok) {
      return { ok: false, code: "invalid_cursor", message: parsed.message };
    }
    if (parsed.cursor.s !== req.sort) {
      return {
        ok: false,
        code: "invalid_cursor",
        message: "Catalog cursor sort does not match request sort.",
      };
    }
    decoded = parsed.cursor;
  }

  let skuMatchedIds: Set<string> | null = null;
  if (req.search) {
    const q = req.search.toLowerCase();
    const ownedIds = new Set(
      source.rows
        .filter((r) => r.store_id === req.storeId)
        .map((r) => r.id)
    );
    const hits = new Set<string>();
    for (const variant of source.variants ?? []) {
      if (!ownedIds.has(variant.productId)) continue;
      const sku = String(variant.sku ?? "").toLowerCase();
      const barcode = String(variant.barcode ?? "").toLowerCase();
      if (sku.includes(q) || barcode.includes(q)) {
        hits.add(variant.productId);
      }
    }
    if ((source.variants?.length ?? 0) > 0) {
      variantSearchQueryCount = 1;
    }
    skuMatchedIds = hits;
  }

  let filtered = source.rows.filter((row) => {
    if (row.store_id !== req.storeId) return false;
    if (!passesServerStatus(row, req.serverStatus)) return false;
    if (!passesProductType(row, req.productType)) return false;
    const textHit = passesTextSearch(row, req.search);
    const skuHit = skuMatchedIds ? skuMatchedIds.has(row.id) : false;
    if (req.search && !textHit && !skuHit) return false;
    if (decoded && !isAfterCursor(row, decoded, req.sort)) return false;
    return true;
  });

  filtered = [...filtered].sort((a, b) => compareForSort(a, b, req.sort));

  const fetchLimit = req.pageSize + 1;
  const fetched = filtered.slice(0, fetchLimit);
  const hasMore = fetched.length > req.pageSize;
  const page = hasMore ? fetched.slice(0, req.pageSize) : fetched;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last ? buildCursorFromProduct(last, req.sort) : null;

  return {
    ok: true,
    items: page,
    nextCursor,
    hasMore,
    pageSize: req.pageSize,
    applied: {
      search: req.search,
      status: req.status,
      productType: req.productType,
      sort: req.sort,
      health: req.health,
      healthFilterScope: req.healthFilterScope,
      serverStatus: req.serverStatus,
    },
    stats: {
      productQueryCount,
      variantSearchQueryCount,
      fetchedRowCount: fetched.length,
    },
  };
}

/**
 * Supabase-backed catalog page. Store id must already be authorized by caller.
 */
export async function listSellerCatalogPage(
  supabase: AnyClient,
  request: SellerCatalogPageRequest
): Promise<SellerCatalogPageResult> {
  const normalized = normalizeSellerCatalogPageRequest(request);
  if (!normalized.ok) {
    return {
      ok: false,
      code: normalized.code,
      message: normalized.message,
    };
  }
  const req = normalized.value;

  let decoded: SellerCatalogDecodedCursor | null = null;
  if (req.cursor) {
    const parsed = decodeSellerCatalogCursor(req.cursor);
    if (!parsed.ok) {
      return { ok: false, code: "invalid_cursor", message: parsed.message };
    }
    if (parsed.cursor.s !== req.sort) {
      return {
        ok: false,
        code: "invalid_cursor",
        message: "Catalog cursor sort does not match request sort.",
      };
    }
    decoded = parsed.cursor;
  }

  let variantSearchQueryCount = 0;
  let productIdIn: string[] | null = null;

  if (req.search) {
    const pattern = escapeIlikePattern(req.search);
    if (pattern) {
      variantSearchQueryCount += 1;
      // No store_id on variants — collect candidate product_ids then intersect
      // with store-scoped product query below (never expand store scope).
      const { data: variantRows, error: variantError } = await supabase
        .from("product_variants")
        .select("product_id")
        .or(`sku.ilike.%${pattern}%,barcode.ilike.%${pattern}%`)
        .limit(500);

      if (variantError) {
        console.error("listSellerCatalogPage variant search", variantError);
      } else {
        productIdIn = Array.from(
          new Set(
            ((variantRows ?? []) as Array<{ product_id: string }>).map((r) =>
              String(r.product_id)
            )
          )
        );
      }
    }
  }

  const ascending =
    req.sort === "oldest" ||
    req.sort === "updated_asc" ||
    req.sort === "title_asc";
  const primaryColumn =
    req.sort === "newest" || req.sort === "oldest"
      ? "created_at"
      : req.sort === "title_asc" || req.sort === "title_desc"
        ? "title"
        : "updated_at";

  let query = supabase
    .from("store_products")
    .select("*")
    .eq("store_id", req.storeId)
    .order(primaryColumn, { ascending })
    .order("id", { ascending })
    .limit(req.pageSize + 1);

  if (req.serverStatus === "draft") {
    query = query.eq("status", "draft");
  } else if (req.serverStatus === "published") {
    query = query.eq("status", "active");
  } else if (req.serverStatus === "pending_review") {
    query = query.in("status", ["in_review", "pending_review"]);
  } else if (req.serverStatus === "rejected") {
    query = query.or("status.eq.rejected,moderation_status.eq.rejected");
  }

  if (req.productType === "digital" || req.productType === "physical") {
    query = query.eq("product_type", req.productType);
  } else if (req.productType === "other") {
    query = query.not("product_type", "in", "(digital,physical)");
  }

  if (req.search) {
    const pattern = escapeIlikePattern(req.search);
    if (pattern) {
      const parts = [
        `title.ilike.%${pattern}%`,
        `slug.ilike.%${pattern}%`,
      ];
      if (UUID_RE.test(pattern)) {
        parts.push(`id.eq.${pattern}`);
      }
      if (productIdIn && productIdIn.length > 0) {
        parts.push(`id.in.(${productIdIn.join(",")})`);
      }
      query = query.or(parts.join(","));
    }
  }

  if (decoded) {
    const opPrimary = ascending ? "gt" : "lt";
    const opId = ascending ? "gt" : "lt";
    const key = quotePostgrestValue(decoded.k);
    // PostgREST keyset: (primary > k) OR (primary = k AND id > i) [asc]
    query = query.or(
      `and(${primaryColumn}.eq.${key},id.${opId}.${decoded.i}),${primaryColumn}.${opPrimary}.${key}`
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error("listSellerCatalogPage", error);
    return {
      ok: false,
      code: "query_failed",
      message: error.message || "Could not load seller catalog page.",
    };
  }

  const rows = ((data ?? []) as StoreProductRow[]).filter(
    (row) => String(row.store_id) === req.storeId
  );
  const hasMore = rows.length > req.pageSize;
  const page = hasMore ? rows.slice(0, req.pageSize) : rows;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last ? buildCursorFromProduct(last, req.sort) : null;

  return {
    ok: true,
    items: page,
    nextCursor,
    hasMore,
    pageSize: req.pageSize,
    applied: {
      search: req.search,
      status: req.status,
      productType: req.productType,
      sort: req.sort,
      health: req.health,
      healthFilterScope: req.healthFilterScope,
      serverStatus: req.serverStatus,
    },
    stats: {
      productQueryCount: 1,
      variantSearchQueryCount,
      fetchedRowCount: rows.length,
    },
  };
}
