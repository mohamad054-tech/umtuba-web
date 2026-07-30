/**
 * Store catalog query-layer performance regressions.
 * Counts Supabase round-trips for batch enrichment (N+1 guard).
 */

import { describe, expect, it, vi } from "vitest";
import {
  enrichPublicCatalogRows,
  STORE_PRODUCT_PUBLIC_COLUMNS,
} from "./catalogQueries";
import type { StoreProductRow, StoreRow } from "./types";

vi.mock("./productMediaUrl", () => ({
  createAuthorizedProductMediaSignedUrl: vi.fn(
    async (_client: unknown, input: { storagePath: string }) =>
      `signed:${input.storagePath}`
  ),
}));

type CatalogRow = StoreProductRow & {
  stores: Pick<StoreRow, "id" | "slug" | "name" | "logo_path" | "status">;
};

function makeRow(index: number): CatalogRow {
  const id = `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
  const storeId = "11111111-1111-4111-8111-111111111111";
  return {
    id,
    store_id: storeId,
    slug: `product-${index}`,
    title: `Product ${index}`,
    short_description: "desc",
    description: "long",
    product_type: "physical",
    status: "active",
    moderation_status: "approved",
    primary_category_id: null,
    brand_id: null,
    created_by: "22222222-2222-4222-8222-222222222222",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    published_at: "2026-01-01T00:00:00Z",
    stores: {
      id: storeId,
      slug: "demo-store",
      name: "Demo",
      logo_path: null,
      status: "active",
    },
  };
}

function createCountingClient(productCount: number) {
  let fromCalls = 0;
  const media = Array.from({ length: productCount }, (_, i) => {
    const productId = makeRow(i + 1).id;
    return {
      product_id: productId,
      storage_path: `stores/s/products/${productId}/cover.jpg`,
      role: "cover",
      status: "active",
      sort_order: 0,
    };
  });
  const variants = Array.from({ length: productCount }, (_, i) => {
    const productId = makeRow(i + 1).id;
    return {
      id: `33333333-3333-4333-8333-${String(i + 1).padStart(12, "0")}`,
      product_id: productId,
      created_at: "2026-01-01T00:00:00Z",
    };
  });
  const prices = variants.map((v) => ({
    variant_id: v.id,
    amount_minor: 1000,
    compare_at_amount_minor: 1500,
    currency: "USD",
    created_at: "2026-01-02T00:00:00Z",
  }));
  const inventories = variants.map((v) => ({
    variant_id: v.id,
    on_hand: 10,
    reserved: 1,
    safety_stock: 0,
  }));

  function chain(result: unknown) {
    const api: Record<string, unknown> = {};
    const methods = [
      "select",
      "in",
      "eq",
      "order",
      "limit",
      "maybeSingle",
    ];
    for (const method of methods) {
      api[method] = () => api;
    }
    // Terminal thenable
    api.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject);
    return api;
  }

  return {
    stats: {
      get fromCalls() {
        return fromCalls;
      },
    },
    from(table: string) {
      fromCalls += 1;
      if (table === "product_media") return chain({ data: media, error: null });
      if (table === "product_variants")
        return chain({ data: variants, error: null });
      if (table === "product_prices") return chain({ data: prices, error: null });
      if (table === "product_inventory")
        return chain({ data: inventories, error: null });
      throw new Error(`unexpected table ${table}`);
    },
  };
}

describe("catalogQueries batch enrichment", () => {
  it("exposes explicit product columns (no SELECT *)", () => {
    expect(STORE_PRODUCT_PUBLIC_COLUMNS).toContain("id");
    expect(STORE_PRODUCT_PUBLIC_COLUMNS).toContain("marketplace_eligible");
    expect(STORE_PRODUCT_PUBLIC_COLUMNS).not.toMatch(/\*/);
  });

  it("uses a fixed number of table round-trips for N products (no N+1)", async () => {
    const N = 48;
    const client = createCountingClient(N);
    const rows = Array.from({ length: N }, (_, i) => makeRow(i + 1));

    const items = await enrichPublicCatalogRows(client as never, rows);

    expect(items).toHaveLength(N);
    expect(items[0].priceMinor).toBe(1000);
    expect(items[0].available).toBe(9);
    expect(items[0].coverUrl).toMatch(/^signed:/);

    // media + variants (parallel) + prices + inventory (parallel) = 4 from() calls
    expect(client.stats.fromCalls).toBe(4);

    // Legacy N+1 lower bound was ~3–5 queries per product (≥144 for N=48).
    expect(client.stats.fromCalls).toBeLessThan(N);
  });

  it("scales flatly from 3 to 48 products", async () => {
    const small = createCountingClient(3);
    await enrichPublicCatalogRows(
      small as never,
      Array.from({ length: 3 }, (_, i) => makeRow(i + 1))
    );
    const large = createCountingClient(48);
    await enrichPublicCatalogRows(
      large as never,
      Array.from({ length: 48 }, (_, i) => makeRow(i + 1))
    );
    expect(small.stats.fromCalls).toBe(4);
    expect(large.stats.fromCalls).toBe(4);
  });
});
