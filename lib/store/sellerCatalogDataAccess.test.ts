import { describe, expect, it } from "vitest";
import {
  buildCursorFromProduct,
  buildSellerCatalogProductsHref,
  decodeSellerCatalogCursor,
  encodeSellerCatalogCursor,
  listSellerCatalogPageFromMemory,
  normalizeSellerCatalogPageRequest,
  normalizeSellerCatalogPageSize,
  parseSellerCatalogUrlState,
  SELLER_CATALOG_DEFAULT_PAGE_SIZE,
  SELLER_CATALOG_MAX_PAGE_SIZE,
} from "./sellerCatalogDataAccess";
import type { StoreProductRow } from "./types";

const STORE_A = "11111111-1111-4111-8111-111111111111";
const STORE_B = "22222222-2222-4222-8222-222222222222";

function product(
  overrides: Partial<StoreProductRow> & Pick<StoreProductRow, "id" | "title">
): StoreProductRow {
  return {
    store_id: STORE_A,
    slug: "slug",
    short_description: null,
    description: "desc",
    product_type: "digital",
    status: "draft",
    moderation_status: "pending",
    primary_category_id: null,
    brand_id: null,
    created_by: "user-1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    published_at: null,
    ...overrides,
  };
}

function manyProducts(count: number, storeId = STORE_A): StoreProductRow[] {
  return Array.from({ length: count }, (_, i) => {
    const n = String(i + 1).padStart(12, "0");
    const day = String((i % 28) + 1).padStart(2, "0");
    return product({
      id: `aaaaaaaa-aaaa-4aaa-8aaa-${n}`,
      title: `Product ${String(i).padStart(4, "0")}`,
      store_id: storeId,
      created_at: `2026-01-${day}T00:00:00Z`,
      updated_at: `2026-02-${day}T00:00:00Z`,
      status: i % 5 === 0 ? "active" : "draft",
      product_type: i % 2 === 0 ? "digital" : "physical",
    });
  });
}

describe("Seller Catalog Data Access Foundation V1", () => {
  it("normalizes default request and clamps limit", () => {
    const ok = normalizeSellerCatalogPageRequest({ storeId: STORE_A });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.value.pageSize).toBe(SELLER_CATALOG_DEFAULT_PAGE_SIZE);
    expect(ok.value.sort).toBe("updated_desc");
    expect(normalizeSellerCatalogPageSize(0)).toBe(1);
    expect(normalizeSellerCatalogPageSize(999)).toBe(
      SELLER_CATALOG_MAX_PAGE_SIZE
    );
    expect(normalizeSellerCatalogPageRequest({ storeId: "bad" }).ok).toBe(
      false
    );
  });

  it("parses URL state with safe defaults", () => {
    const parsed = parseSellerCatalogUrlState(
      new URLSearchParams(
        "q=Lamp&status=nope&type=physical&sort=newest&health=missing_images&limit=10"
      )
    );
    expect(parsed.search).toBe("Lamp");
    expect(parsed.status).toBe("all");
    expect(parsed.productType).toBe("physical");
    expect(parsed.sort).toBe("newest");
    expect(parsed.health).toBe("missing_images");
    expect(parsed.limit).toBe(10);
  });

  it("rejects invalid cursors and sort mismatches fail-closed", () => {
    expect(decodeSellerCatalogCursor("%%%").ok).toBe(false);
    const cursor = encodeSellerCatalogCursor({
      v: 1,
      s: "newest",
      k: "2026-01-01T00:00:00Z",
      i: "aaaaaaaa-aaaa-4aaa-8aaa-000000000001",
    });
    const page = listSellerCatalogPageFromMemory(
      { rows: manyProducts(3) },
      { storeId: STORE_A, cursor, sort: "oldest" }
    );
    expect(page.ok).toBe(false);
    if (!page.ok) expect(page.code).toBe("invalid_cursor");
  });

  it("returns first page and stable next pages without duplicates or skips", () => {
    // Equal updated_at for first three — tie-breaker by id must not skip/dup.
    const rows = [
      product({
        id: "aaaaaaaa-aaaa-4aaa-8aaa-000000000003",
        title: "C",
        updated_at: "2026-03-01T00:00:00Z",
        created_at: "2026-01-03T00:00:00Z",
      }),
      product({
        id: "aaaaaaaa-aaaa-4aaa-8aaa-000000000001",
        title: "A",
        updated_at: "2026-03-01T00:00:00Z",
        created_at: "2026-01-01T00:00:00Z",
      }),
      product({
        id: "aaaaaaaa-aaaa-4aaa-8aaa-000000000002",
        title: "B",
        updated_at: "2026-03-01T00:00:00Z",
        created_at: "2026-01-02T00:00:00Z",
      }),
      product({
        id: "aaaaaaaa-aaaa-4aaa-8aaa-000000000004",
        title: "D",
        updated_at: "2026-02-01T00:00:00Z",
        created_at: "2026-01-04T00:00:00Z",
      }),
    ];

    const first = listSellerCatalogPageFromMemory(
      { rows },
      { storeId: STORE_A, limit: 2, sort: "updated_desc" }
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.items.map((i) => i.id)).toEqual([
      "aaaaaaaa-aaaa-4aaa-8aaa-000000000003",
      "aaaaaaaa-aaaa-4aaa-8aaa-000000000002",
    ]);
    expect(first.hasMore).toBe(true);
    expect(first.nextCursor).toBeTruthy();

    const second = listSellerCatalogPageFromMemory(
      { rows },
      {
        storeId: STORE_A,
        limit: 2,
        sort: "updated_desc",
        cursor: first.nextCursor,
      }
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.items.map((i) => i.id)).toEqual([
      "aaaaaaaa-aaaa-4aaa-8aaa-000000000001",
      "aaaaaaaa-aaaa-4aaa-8aaa-000000000004",
    ]);

    const allIds = [...first.items, ...second.items].map((i) => i.id);
    expect(new Set(allIds).size).toBe(4);
  });

  it("keeps page size constant for 10 vs 10000 catalogs (query-count evidence)", () => {
    const small = listSellerCatalogPageFromMemory(
      { rows: manyProducts(10) },
      { storeId: STORE_A, limit: 25 }
    );
    const large = listSellerCatalogPageFromMemory(
      { rows: manyProducts(10_000) },
      { storeId: STORE_A, limit: 25 }
    );
    expect(small.ok && large.ok).toBe(true);
    if (!small.ok || !large.ok) return;
    expect(small.items.length).toBe(10);
    expect(large.items.length).toBe(25);
    expect(small.stats.productQueryCount).toBe(large.stats.productQueryCount);
    expect(small.hasMore).toBe(false);
    expect(large.hasMore).toBe(true);
    expect(large.stats.fetchedRowCount).toBe(26); // pageSize + 1
  });

  it("supports search, status, type, combined filters, and empty catalog", () => {
    expect(
      listSellerCatalogPageFromMemory(
        { rows: [] },
        { storeId: STORE_A }
      ).ok === true &&
        (
          listSellerCatalogPageFromMemory(
            { rows: [] },
            { storeId: STORE_A }
          ) as { ok: true; items: unknown[] }
        ).items.length === 0
    ).toBe(true);

    const rows = [
      product({
        id: "aaaaaaaa-aaaa-4aaa-8aaa-000000000010",
        title: "Amber Lamp",
        status: "draft",
        product_type: "physical",
      }),
      product({
        id: "aaaaaaaa-aaaa-4aaa-8aaa-000000000011",
        title: "Blue Vase",
        status: "active",
        product_type: "digital",
      }),
    ];
    const search = listSellerCatalogPageFromMemory(
      {
        rows,
        variants: [
          {
            productId: "aaaaaaaa-aaaa-4aaa-8aaa-000000000010",
            sku: "LAMP-1",
            barcode: null,
          },
        ],
      },
      { storeId: STORE_A, search: "lamp-1" }
    );
    expect(search.ok).toBe(true);
    if (!search.ok) return;
    expect(search.items.map((i) => i.id)).toEqual([
      "aaaaaaaa-aaaa-4aaa-8aaa-000000000010",
    ]);
    expect(search.stats.variantSearchQueryCount).toBe(1);

    const filtered = listSellerCatalogPageFromMemory(
      { rows },
      {
        storeId: STORE_A,
        status: "published",
        productType: "digital",
        search: "Blue",
      }
    );
    expect(filtered.ok).toBe(true);
    if (!filtered.ok) return;
    expect(filtered.items).toHaveLength(1);
    expect(filtered.applied.serverStatus).toBe("published");
  });

  it("blocks cross-store leakage", () => {
    const rows = [
      product({
        id: "aaaaaaaa-aaaa-4aaa-8aaa-000000000020",
        title: "Mine",
      }),
      product({
        id: "bbbbbbbb-bbbb-4bbb-8bbb-000000000021",
        title: "Theirs",
        store_id: STORE_B,
      }),
    ];
    const page = listSellerCatalogPageFromMemory(
      { rows },
      { storeId: STORE_A, search: "Theirs" }
    );
    expect(page.ok).toBe(true);
    if (!page.ok) return;
    expect(page.items).toEqual([]);
  });

  it("builds href without trusting store id from query params", () => {
    const href = buildSellerCatalogProductsHref({
      search: "bowl",
      status: "draft",
      cursor: buildCursorFromProduct(
        product({
          id: "aaaaaaaa-aaaa-4aaa-8aaa-000000000030",
          title: "X",
        }),
        "updated_desc"
      ),
    });
    expect(href.startsWith("/seller/store/products?")).toBe(true);
    expect(href).toContain("q=bowl");
    expect(href).toContain("status=draft");
    expect(href).not.toContain("storeId");
  });

  it("marks ready/health filters as page_only scope", () => {
    const page = listSellerCatalogPageFromMemory(
      { rows: manyProducts(3) },
      { storeId: STORE_A, status: "ready", health: "missing_images" }
    );
    expect(page.ok).toBe(true);
    if (!page.ok) return;
    expect(page.applied.healthFilterScope).toBe("page_only");
    expect(page.applied.serverStatus).toBe("all");
  });
});
