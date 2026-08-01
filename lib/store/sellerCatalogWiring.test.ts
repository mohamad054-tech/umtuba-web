import { describe, expect, it } from "vitest";
import type { StoreProductRow } from "./types";
import {
  chunkIds,
  deriveSellerPayoutConfiguredFromEligibility,
  deriveSellerProfileComplete,
  loadSellerCatalogHealthFacts,
  loadSellerCatalogHealthFactsDetailed,
  uniqueIds,
} from "./sellerCatalogWiring";
import {
  buildSellerExperienceBundle,
  deriveSellerProductHealth,
} from "./sellerExperienceFoundation";

const STORE_A = "11111111-1111-4111-8111-111111111111";
const STORE_B = "22222222-2222-4222-8222-222222222222";

function product(
  overrides: Partial<StoreProductRow> & Pick<StoreProductRow, "id" | "title">
): StoreProductRow {
  return {
    store_id: STORE_A,
    slug: "slug",
    short_description: null,
    description: "A sufficiently long product description for health.",
    product_type: "digital",
    status: "draft",
    moderation_status: "pending",
    primary_category_id: "cat-1",
    brand_id: null,
    created_by: "user-1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    published_at: null,
    ...overrides,
  };
}

function makeClient(options?: {
  failTables?: Set<string>;
  mediaProductIds?: string[];
  variants?: Array<{ id: string; product_id: string }>;
  pricedVariantIds?: string[];
  digitalAssetProductIds?: string[];
}) {
  const failTables = options?.failTables ?? new Set<string>();
  let queryCount = 0;
  const client = {
    queryCount: 0,
    from(table: string) {
      const state: {
        table: string;
        ids: string[];
        eqs: Array<{ column: string; value: string }>;
      } = { table, ids: [], eqs: [] };
      const api: any = {
        select() {
          return api;
        },
        in(_col: string, ids: string[]) {
          state.ids = ids;
          return api;
        },
        eq(column: string, value: string) {
          state.eqs.push({ column, value });
          return api;
        },
        then(resolve: (v: unknown) => void) {
          queryCount += 1;
          client.queryCount = queryCount;
          if (failTables.has(state.table)) {
            resolve({
              data: null,
              error: { message: `${state.table} failed` },
            });
            return;
          }
          if (state.table === "product_media") {
            resolve({
              data: (options?.mediaProductIds ?? [])
                .filter((id) => state.ids.includes(id))
                .map((product_id) => ({ product_id, status: "active" })),
              error: null,
            });
            return;
          }
          if (state.table === "product_variants") {
            resolve({
              data: (options?.variants ?? []).filter((v) =>
                state.ids.includes(v.product_id)
              ),
              error: null,
            });
            return;
          }
          if (state.table === "product_prices") {
            resolve({
              data: (options?.pricedVariantIds ?? [])
                .filter((id) => state.ids.includes(id))
                .map((variant_id) => ({
                  variant_id,
                  status: "active",
                  amount_minor: 100,
                })),
              error: null,
            });
            return;
          }
          if (state.table === "store_digital_product_assets") {
            const storeEq = state.eqs.find((e) => e.column === "store_id");
            if (storeEq && storeEq.value !== STORE_A) {
              resolve({ data: [], error: null });
              return;
            }
            resolve({
              data: (options?.digitalAssetProductIds ?? [])
                .filter((id) => state.ids.includes(id))
                .map((product_id) => ({ product_id, status: "active" })),
              error: null,
            });
            return;
          }
          resolve({ data: [], error: null });
        },
      };
      return api;
    },
  };
  return client;
}

describe("Seller Catalog Performance Batching V1", () => {
  it("short-circuits zero products with zero queries", async () => {
    const client = makeClient();
    const result = await loadSellerCatalogHealthFactsDetailed(client as never, {
      storeId: STORE_A,
      products: [],
    });
    expect(result.facts).toEqual([]);
    expect(result.stats.queryCount).toBe(0);
    expect(client.queryCount).toBe(0);
  });

  it("keeps query count constant for 1 vs 100 products (no chunking)", async () => {
    const one = product({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      title: "One",
    });
    const many = Array.from({ length: 100 }, (_, i) => {
      const n = String(i + 1).padStart(12, "0");
      return product({
        id: `bbbbbbbb-bbbb-4bbb-8bbb-${n}`,
        title: `P${i}`,
        product_type: i % 2 === 0 ? "digital" : "physical",
        weight_grams: i % 2 === 0 ? null : 100,
      });
    });

    const variantsOne = [{ id: "v1", product_id: one.id }];
    const variantsMany = many.map((p, i) => ({
      id: `v${i}`,
      product_id: p.id,
    }));

    const clientOne = makeClient({
      mediaProductIds: [one.id],
      variants: variantsOne,
      pricedVariantIds: ["v1"],
      digitalAssetProductIds: [one.id],
    });
    const resultOne = await loadSellerCatalogHealthFactsDetailed(
      clientOne as never,
      { storeId: STORE_A, products: [one] }
    );

    const clientMany = makeClient({
      mediaProductIds: many.map((p) => p.id),
      variants: variantsMany,
      pricedVariantIds: variantsMany.map((v) => v.id),
      digitalAssetProductIds: many
        .filter((p) => p.product_type === "digital")
        .map((p) => p.id),
    });
    const resultMany = await loadSellerCatalogHealthFactsDetailed(
      clientMany as never,
      { storeId: STORE_A, products: many }
    );

    expect(resultOne.stats.queryCount).toBe(resultMany.stats.queryCount);
    expect(resultOne.stats.queryCount).toBe(4); // media + variants + digital + prices
    expect(resultMany.facts).toHaveLength(100);
    expect(resultOne.facts[0]?.hasImages).toBe(true);
    expect(resultOne.facts[0]?.hasPricing).toBe(true);
    expect(resultOne.facts[0]?.hasDigitalAsset).toBe(true);
  });

  it("dedupes product IDs and ignores wrong-store rows", async () => {
    const owned = product({
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      title: "Owned",
    });
    const foreign = product({
      id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      title: "Foreign",
      store_id: STORE_B,
    });
    const client = makeClient({
      mediaProductIds: [owned.id, foreign.id],
      variants: [
        { id: "vo", product_id: owned.id },
        { id: "vf", product_id: foreign.id },
      ],
      pricedVariantIds: ["vo", "vf"],
      digitalAssetProductIds: [owned.id, foreign.id],
    });

    const result = await loadSellerCatalogHealthFactsDetailed(client as never, {
      storeId: STORE_A,
      products: [owned, owned, foreign],
    });

    expect(result.stats.uniqueProductIds).toBe(1);
    expect(result.facts).toHaveLength(3);
    const ownedFacts = result.facts.filter((f) => f.product.id === owned.id);
    expect(ownedFacts[0]?.hasImages).toBe(true);
    const foreignFact = result.facts.find((f) => f.product.id === foreign.id)!;
    expect(foreignFact.hasImages).toBe(false);
    expect(foreignFact.hasPricing).toBe(false);
    expect(foreignFact.hasDigitalAsset).toBe(false);
  });

  it("fail-closes presence flags when a batch query fails", async () => {
    const p = product({
      id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      title: "Fail",
    });
    const client = makeClient({
      failTables: new Set(["product_media"]),
      variants: [{ id: "v1", product_id: p.id }],
      pricedVariantIds: ["v1"],
      digitalAssetProductIds: [p.id],
    });
    const result = await loadSellerCatalogHealthFactsDetailed(client as never, {
      storeId: STORE_A,
      products: [p],
    });
    expect(result.stats.batchErrors.length).toBeGreaterThan(0);
    expect(result.facts[0]?.hasImages).toBe(false);
    const health = deriveSellerProductHealth(result.facts[0]!);
    expect(health.codes).toContain("missing_images");
    expect(health.codes).not.toContain("complete");
  });

  it("keeps products with missing relations and supports mixed catalog", async () => {
    const digital = product({
      id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      title: "Digital",
      product_type: "digital",
    });
    const physical = product({
      id: "99999999-9999-4999-8999-999999999999",
      title: "Physical",
      product_type: "physical",
      weight_grams: 250,
    });
    const client = makeClient({
      mediaProductIds: [],
      variants: [
        { id: "vd", product_id: digital.id },
        { id: "vp", product_id: physical.id },
      ],
      pricedVariantIds: ["vd"],
      digitalAssetProductIds: [],
    });
    const result = await loadSellerCatalogHealthFactsDetailed(client as never, {
      storeId: STORE_A,
      products: [digital, physical],
      inventoryRows: [
        {
          productId: physical.id,
          productTitle: physical.title,
          productSlug: physical.slug,
          productStatus: physical.status,
          productType: "physical",
          variantId: "vp",
          variantTitle: "Default",
          sku: "SKU",
          variantStatus: "active",
          warehouseKey: "default",
          inventoryId: "inv-1",
          onHand: 2,
          reserved: 0,
          safetyStock: 0,
          allowBackorder: false,
          availableToSell: 2,
          inventoryUpdatedAt: null,
          missingInventory: false,
          availabilityMode: "finite",
        },
      ],
    });

    expect(result.facts).toHaveLength(2);
    const d = result.facts.find((f) => f.product.id === digital.id)!;
    const ph = result.facts.find((f) => f.product.id === physical.id)!;
    expect(d.hasImages).toBe(false);
    expect(d.hasDigitalAsset).toBe(false);
    expect(d.hasPricing).toBe(true);
    expect(ph.hasPhysicalMetadata).toBe(true);
    expect(ph.inventoryRequired).toBe(true);
    expect(ph.hasInventoryRow).toBe(true);
    expect(ph.hasPricing).toBe(false);
  });

  it("chunks IDs and uniqueIds helpers are stable", () => {
    expect(uniqueIds(["a", "a", "", "b"])).toEqual(["a", "b"]);
    expect(chunkIds(["1", "2", "3", "4"], 2)).toEqual([
      ["1", "2"],
      ["3", "4"],
    ]);
    expect(chunkIds([], 100)).toEqual([]);
  });

  it("scales query count by chunk count only (not product count)", async () => {
    const products = Array.from({ length: 101 }, (_, i) => {
      const n = String(i + 1).padStart(12, "0");
      return product({
        id: `aaaaaaaa-aaaa-4aaa-8aaa-${n}`,
        title: `Chunk${i}`,
        product_type: "physical",
        weight_grams: 10,
      });
    });
    const variants = products.map((p, i) => ({
      id: `cv${i}`,
      product_id: p.id,
    }));
    const client = makeClient({
      mediaProductIds: products.map((p) => p.id),
      variants,
      pricedVariantIds: variants.map((v) => v.id),
    });
    const result = await loadSellerCatalogHealthFactsDetailed(client as never, {
      storeId: STORE_A,
      products,
      chunkSize: 100,
    });
    // 2 chunks × (media + variants) + 2 price chunks; no digital → 6
    expect(result.stats.chunkCount).toBe(2);
    expect(result.stats.queryCount).toBe(6);
    expect(result.facts).toHaveLength(101);
  });
});

describe("Seller Catalog Wiring V1 regressions", () => {
  it("maps real media/price/digital/physical facts into health codes", async () => {
    const digital = product({
      id: "22222222-2222-4222-8222-222222222222",
      title: "Digital Pack",
      product_type: "digital",
    });
    const physical = product({
      id: "33333333-3333-4333-8333-333333333333",
      title: "Physical Box",
      product_type: "physical",
      weight_grams: 500,
    });

    const calls: string[] = [];
    const supabase = {
      from(table: string) {
        calls.push(table);
        return {
          select() {
            return this;
          },
          in() {
            return this;
          },
          eq(_col: string, val: string) {
            this._eq = val;
            return this;
          },
          then(resolve: (v: unknown) => void) {
            if (table === "product_media") {
              resolve({
                data: [{ product_id: digital.id, status: "active" }],
                error: null,
              });
              return;
            }
            if (table === "product_variants") {
              resolve({
                data: [
                  { id: "v1", product_id: digital.id, status: "active" },
                  { id: "v2", product_id: physical.id, status: "active" },
                ],
                error: null,
              });
              return;
            }
            if (table === "product_prices") {
              resolve({
                data: [
                  { variant_id: "v1", status: "active", amount_minor: 100 },
                ],
                error: null,
              });
              return;
            }
            if (table === "store_digital_product_assets") {
              resolve({
                data: [{ product_id: digital.id, status: "active" }],
                error: null,
              });
              return;
            }
            resolve({ data: [], error: null });
          },
          _eq: "" as string,
        };
      },
    };

    const facts = await loadSellerCatalogHealthFacts(supabase as never, {
      storeId: STORE_A,
      products: [digital, physical],
      inventoryRows: [
        {
          productId: physical.id,
          productTitle: physical.title,
          productSlug: physical.slug,
          productStatus: physical.status,
          productType: "physical",
          variantId: "v2",
          variantTitle: "Default",
          sku: "SKU",
          variantStatus: "active",
          warehouseKey: "default",
          inventoryId: "inv-1",
          onHand: 3,
          reserved: 0,
          safetyStock: 0,
          allowBackorder: false,
          availableToSell: 3,
          inventoryUpdatedAt: null,
          missingInventory: false,
          availabilityMode: "finite",
        },
      ],
    });

    expect(calls).toContain("product_media");
    expect(calls).toContain("product_prices");
    expect(calls).toContain("store_digital_product_assets");

    const digitalFacts = facts.find((f) => f.product.id === digital.id)!;
    expect(digitalFacts.hasImages).toBe(true);
    expect(digitalFacts.hasPricing).toBe(true);
    expect(digitalFacts.hasDigitalAsset).toBe(true);

    const physicalFacts = facts.find((f) => f.product.id === physical.id)!;
    expect(physicalFacts.hasPhysicalMetadata).toBe(true);
    expect(physicalFacts.inventoryRequired).toBe(true);
    expect(physicalFacts.hasInventoryRow).toBe(true);
    expect(physicalFacts.hasPricing).toBe(false);

    const health = deriveSellerProductHealth(digitalFacts);
    expect(health.codes).toContain("ready_to_publish");
    expect(health.codes).not.toContain("missing_digital_asset");
  });

  it("wires profile/payout completeness and analytics no-data note", () => {
    expect(
      deriveSellerProfileComplete({
        name: "Shop",
        slug: "shop",
        status: "active",
        verification_status: "verified",
      })
    ).toBe(true);
    expect(
      deriveSellerPayoutConfiguredFromEligibility({
        payoutEligibility: {
          overallState: "ready",
          balanceVisibilityAvailable: true,
        },
      })
    ).toBe(true);
    expect(
      deriveSellerPayoutConfiguredFromEligibility({
        payoutEligibility: { overallState: "unavailable" },
      })
    ).toBeNull();

    const bundle = buildSellerExperienceBundle({
      storeId: STORE_A,
      storeName: "Shop",
      storeSlug: "shop",
      storeStatus: "active",
      verificationStatus: "verified",
      products: [
        product({
          id: "22222222-2222-4222-8222-222222222222",
          title: "A",
          status: "active",
          moderation_status: "approved",
        }),
      ],
      productFacts: [
        {
          product: product({
            id: "22222222-2222-4222-8222-222222222222",
            title: "A",
            status: "active",
            moderation_status: "approved",
          }),
          hasImages: true,
          hasPricing: true,
          hasDigitalAsset: true,
        },
      ],
      profileComplete: true,
      payoutConfigured: true,
      analytics: {},
    });

    expect(bundle.summary.publishedProducts).toBe(1);
    expect(bundle.analytics.hasData).toBe(false);
    expect(bundle.analytics.notes).toContain("No data yet");
    expect(
      bundle.storeReadiness.checklist.some(
        (c) => c.id === "payout-configured" && c.done
      )
    ).toBe(true);
    expect(bundle.actionCenter.length).toBeGreaterThanOrEqual(0);
  });
});
