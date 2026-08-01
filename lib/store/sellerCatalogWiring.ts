/**
 * Seller Catalog Wiring + Performance Batching V1.
 * Batch-load catalog health facts (O(1) queries vs product count).
 * No migrations. No inventory/shipping/payment mutations.
 */

import { isFiniteInventoryProductType } from "./sellerInventoryAvailabilityFoundation";
import type { SellerInventoryRow } from "./sellerInventoryQueries";
import type { SellerProductHealthFacts } from "./sellerExperienceFoundation";
import type { StoreProductRow, StoreRow } from "./types";

export const SELLER_CATALOG_WIRING_ID =
  "commerce.seller.catalog_wiring_v1" as const;

export const SELLER_CATALOG_PERFORMANCE_BATCHING_ID =
  "commerce.seller.catalog_performance_batching_v1" as const;

/** Supabase/PostgREST URL safety — chunk large `.in()` lists. */
export const SELLER_CATALOG_ID_CHUNK_SIZE = 100 as const;

type AnyClient = {
  from: (table: string) => any;
};

export type SellerCatalogHealthLoadStats = {
  queryCount: number;
  productCount: number;
  uniqueProductIds: number;
  chunkCount: number;
  batchErrors: string[];
};

export type SellerCatalogHealthLoadResult = {
  facts: SellerProductHealthFacts[];
  stats: SellerCatalogHealthLoadStats;
};

function hasPhysicalMetadata(product: StoreProductRow): boolean {
  const weight = product.weight_grams;
  const dims =
    product.length_mm != null &&
    product.width_mm != null &&
    product.height_mm != null;
  const shippingFlag =
    product.shipping_required === true || product.shippable === true;
  const packageWeight = product.package_weight_grams != null;
  return (
    (typeof weight === "number" && weight >= 0) ||
    Boolean(dims) ||
    shippingFlag ||
    packageWeight
  );
}

export function chunkIds(
  ids: readonly string[],
  chunkSize: number = SELLER_CATALOG_ID_CHUNK_SIZE
): string[][] {
  if (ids.length === 0) return [];
  const size = Math.max(1, Math.floor(chunkSize));
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    out.push(ids.slice(i, i + size));
  }
  return out;
}

export function uniqueIds(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    const key = String(id ?? "").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

async function runInSelect(
  supabase: AnyClient,
  table: string,
  columns: string,
  idColumn: string,
  ids: readonly string[],
  extras?: Array<{ column: string; value: string }>
): Promise<{ data: unknown[] | null; error: { message?: string } | null }> {
  if (ids.length === 0) {
    return { data: [], error: null };
  }
  let q = supabase.from(table).select(columns).in(idColumn, ids);
  for (const extra of extras ?? []) {
    q = q.eq(extra.column, extra.value);
  }
  return q;
}

/**
 * Detailed loader with query-count instrumentation.
 * Fail-closed: batch errors force presence flags to false (never omit as unknown).
 */
export async function loadSellerCatalogHealthFactsDetailed(
  supabase: AnyClient,
  input: {
    storeId: string;
    products: StoreProductRow[];
    inventoryRows?: SellerInventoryRow[] | null;
    chunkSize?: number;
  }
): Promise<SellerCatalogHealthLoadResult> {
  const stats: SellerCatalogHealthLoadStats = {
    queryCount: 0,
    productCount: input.products.length,
    uniqueProductIds: 0,
    chunkCount: 0,
    batchErrors: [],
  };

  if (!input.products.length) {
    return { facts: [], stats };
  }

  const storeId = String(input.storeId ?? "").trim();
  const scopedProducts = input.products.filter(
    (p) => String(p.store_id ?? "") === storeId
  );
  const rejectedWrongStore = input.products.length - scopedProducts.length;

  const productIds = uniqueIds(scopedProducts.map((p) => p.id));
  stats.uniqueProductIds = productIds.length;
  const chunks = chunkIds(productIds, input.chunkSize);
  stats.chunkCount = chunks.length;

  const productIdSet = new Set(productIds);
  const inventoryByProduct = new Map<string, boolean>();
  for (const row of input.inventoryRows ?? []) {
    // Only accept inventory rows for products in this store catalog set.
    if (!productIdSet.has(row.productId)) continue;
    const hasRow = !row.missingInventory && row.inventoryId != null;
    const prev = inventoryByProduct.get(row.productId);
    inventoryByProduct.set(row.productId, Boolean(prev) || hasRow);
  }

  const productsWithImages = new Set<string>();
  const productsWithPricing = new Set<string>();
  const productsWithDigitalAsset = new Set<string>();
  const variantToProduct = new Map<string, string>();
  let mediaFailed = false;
  let variantsFailed = false;
  let pricesFailed = false;
  let assetsFailed = false;

  // Wave A: media + variants + digital assets (independent).
  const digitalProductIds = uniqueIds(
    scopedProducts
      .filter((p) => p.product_type === "digital")
      .map((p) => p.id)
  );
  const digitalChunks = chunkIds(digitalProductIds, input.chunkSize);

  const waveA: Array<Promise<void>> = [];

  for (const chunk of chunks) {
    waveA.push(
      (async () => {
        stats.queryCount += 1;
        const res = await runInSelect(
          supabase,
          "product_media",
          "product_id, status",
          "product_id",
          chunk,
          [{ column: "status", value: "active" }]
        );
        if (res.error) {
          mediaFailed = true;
          stats.batchErrors.push(
            res.error.message?.trim() || "product_media batch failed"
          );
          return;
        }
        for (const row of (res.data ?? []) as Array<{ product_id: string }>) {
          if (row?.product_id) productsWithImages.add(String(row.product_id));
        }
      })()
    );

    waveA.push(
      (async () => {
        stats.queryCount += 1;
        const res = await runInSelect(
          supabase,
          "product_variants",
          "id, product_id, status",
          "product_id",
          chunk
        );
        if (res.error) {
          variantsFailed = true;
          stats.batchErrors.push(
            res.error.message?.trim() || "product_variants batch failed"
          );
          return;
        }
        for (const row of (res.data ?? []) as Array<{
          id: string;
          product_id: string;
        }>) {
          if (row?.id && row?.product_id) {
            variantToProduct.set(String(row.id), String(row.product_id));
          }
        }
      })()
    );
  }

  for (const chunk of digitalChunks) {
    waveA.push(
      (async () => {
        stats.queryCount += 1;
        const res = await runInSelect(
          supabase,
          "store_digital_product_assets",
          "product_id, status",
          "product_id",
          chunk,
          [
            { column: "store_id", value: storeId },
            { column: "status", value: "active" },
          ]
        );
        if (res.error) {
          assetsFailed = true;
          stats.batchErrors.push(
            res.error.message?.trim() ||
              "store_digital_product_assets batch failed"
          );
          return;
        }
        for (const row of (res.data ?? []) as Array<{ product_id: string }>) {
          if (row?.product_id) {
            productsWithDigitalAsset.add(String(row.product_id));
          }
        }
      })()
    );
  }

  await Promise.all(waveA);

  // Wave B: prices for collected variant IDs.
  const variantIds = uniqueIds([...variantToProduct.keys()]);
  if (!variantsFailed && variantIds.length > 0) {
    const priceChunks = chunkIds(variantIds, input.chunkSize);
    await Promise.all(
      priceChunks.map(async (chunk) => {
        stats.queryCount += 1;
        const res = await runInSelect(
          supabase,
          "product_prices",
          "variant_id, status, amount_minor",
          "variant_id",
          chunk,
          [{ column: "status", value: "active" }]
        );
        if (res.error) {
          pricesFailed = true;
          stats.batchErrors.push(
            res.error.message?.trim() || "product_prices batch failed"
          );
          return;
        }
        for (const row of (res.data ?? []) as Array<{
          variant_id: string;
          amount_minor: number;
        }>) {
          const productId = variantToProduct.get(String(row.variant_id));
          if (productId && Number(row.amount_minor) >= 0) {
            productsWithPricing.add(productId);
          }
        }
      })
    );
  } else if (variantsFailed) {
    pricesFailed = true;
  }

  if (rejectedWrongStore > 0) {
    stats.batchErrors.push(
      `Ignored ${rejectedWrongStore} product(s) not owned by store.`
    );
  }

  const facts: SellerProductHealthFacts[] = input.products.map((product) => {
    const owned = String(product.store_id ?? "") === storeId;

    // Fail-closed defaults: explicit false (never omit when batching ran).
    const factsRow: SellerProductHealthFacts = {
      product,
      hasImages: false,
      hasPricing: false,
    };

    if (!owned) {
      // Wrong-store input: keep fail-closed flags; do not credit relations.
      if (isFiniteInventoryProductType(product.product_type)) {
        factsRow.inventoryRequired = true;
        factsRow.hasInventoryRow = false;
      }
      if (product.product_type === "digital") {
        factsRow.hasDigitalAsset = false;
      }
      if (product.product_type === "physical") {
        factsRow.hasPhysicalMetadata = false;
      }
      return factsRow;
    }

    factsRow.hasImages = mediaFailed
      ? false
      : productsWithImages.has(product.id);
    factsRow.hasPricing = pricesFailed || variantsFailed
      ? false
      : productsWithPricing.has(product.id);

    if (isFiniteInventoryProductType(product.product_type)) {
      factsRow.inventoryRequired = true;
      if (input.inventoryRows) {
        factsRow.hasInventoryRow = inventoryByProduct.get(product.id) === true;
      } else {
        // Inventory not provided — omit hasInventoryRow (unknown) only when
        // caller did not supply rows; do not invent stock.
      }
    }

    if (product.product_type === "digital") {
      factsRow.hasDigitalAsset = assetsFailed
        ? false
        : productsWithDigitalAsset.has(product.id);
    }

    if (product.product_type === "physical") {
      factsRow.hasPhysicalMetadata = hasPhysicalMetadata(product);
    }

    return factsRow;
  });

  return { facts, stats };
}

/**
 * Batch-load media / price / digital-asset presence for seller products.
 * Inventory presence is derived from already-loaded seller inventory rows.
 */
export async function loadSellerCatalogHealthFacts(
  supabase: AnyClient,
  input: {
    storeId: string;
    products: StoreProductRow[];
    inventoryRows?: SellerInventoryRow[] | null;
    chunkSize?: number;
  }
): Promise<SellerProductHealthFacts[]> {
  const result = await loadSellerCatalogHealthFactsDetailed(supabase, input);
  return result.facts;
}

export function deriveSellerProfileComplete(store: Pick<
  StoreRow,
  "name" | "slug" | "status" | "verification_status"
>): boolean {
  return (
    Boolean(store.name?.trim()) &&
    Boolean(store.slug?.trim()) &&
    store.status === "active" &&
    store.verification_status === "verified"
  );
}

/**
 * Use existing payout eligibility surface when present — do not invent payout state.
 */
export function deriveSellerPayoutConfiguredFromEligibility(input: {
  payoutEligibility:
    | {
        overallState?: string;
        balanceVisibilityAvailable?: boolean;
        unavailable?: boolean;
        unauthorized?: boolean;
        eligibility?: unknown;
      }
    | null
    | undefined;
}): boolean | null {
  if (!input.payoutEligibility) return null;
  if (
    input.payoutEligibility.unavailable ||
    input.payoutEligibility.unauthorized ||
    input.payoutEligibility.overallState === "unavailable" ||
    input.payoutEligibility.overallState === "unauthorized"
  ) {
    return null;
  }
  if (typeof input.payoutEligibility.balanceVisibilityAvailable === "boolean") {
    return input.payoutEligibility.balanceVisibilityAvailable;
  }
  return input.payoutEligibility.eligibility != null;
}

/**
 * Batch-load variant SKU/barcode tokens for seller catalog search.
 * Scoped to product IDs already owned by the store catalog page.
 */
export async function loadSellerCatalogVariantSearchTokens(
  supabase: AnyClient,
  input: {
    storeId: string;
    products: StoreProductRow[];
    chunkSize?: number;
  }
): Promise<{
  tokens: Array<{ productId: string; sku: string | null; barcode: string | null }>;
  queryCount: number;
  error: string | null;
}> {
  const storeId = String(input.storeId ?? "").trim();
  const owned = input.products.filter(
    (p) => String(p.store_id ?? "") === storeId
  );
  const productIds = uniqueIds(owned.map((p) => p.id));
  if (productIds.length === 0) {
    return { tokens: [], queryCount: 0, error: null };
  }

  const chunks = chunkIds(productIds, input.chunkSize);
  const tokens: Array<{
    productId: string;
    sku: string | null;
    barcode: string | null;
  }> = [];
  let queryCount = 0;
  let error: string | null = null;

  for (const chunk of chunks) {
    queryCount += 1;
    const res = await runInSelect(
      supabase,
      "product_variants",
      "product_id, sku, barcode",
      "product_id",
      chunk
    );
    if (res.error) {
      error = res.error.message?.trim() || "product_variants search tokens failed";
      // Fail closed for search enrichment: return what we have; missing tokens
      // only reduce SKU/barcode matchability — never invent cross-store rows.
      break;
    }
    for (const row of (res.data ?? []) as Array<{
      product_id: string;
      sku?: string | null;
      barcode?: string | null;
    }>) {
      const productId = String(row?.product_id ?? "");
      if (!productId) continue;
      tokens.push({
        productId,
        sku: row.sku == null ? null : String(row.sku),
        barcode: row.barcode == null ? null : String(row.barcode),
      });
    }
  }

  return { tokens, queryCount, error };
}
