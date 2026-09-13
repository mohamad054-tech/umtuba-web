/**
 * Live READ-ONLY expansion toward ~300 additional CJ products.
 * Does not overwrite the approved 59. Profit floors are not weakened.
 */

import type { CjReadOnlyClient } from "./client";
import {
  DEFAULT_ORIGIN_COUNTRY,
  EXCLUSION_PATTERNS,
  LIST_PAGE_SIZE,
  REQUEST_GAP_MS,
  type CjPilotCategory,
} from "./constants";
import {
  CJ_EXPANSION_TASK_ID,
  EXPANSION_SEARCH_KEYWORDS,
  FAMILY_CAPS,
  STORE_DEPARTMENTS,
  STORE_SUBCATEGORIES,
  TARGET_ADDITIONAL_PRODUCTS,
  familyFromTitle,
  type StoreDepartment,
} from "./expansionTaxonomy";
import { evaluateProfitGateV2 } from "./profitEvaluate";
import {
  CJ_PROFIT_GATE_V2_SOURCE_EXPAND,
  MIN_STOCK_HEALTHY,
  V2_TITLE_EXCLUSIONS,
  type ProfitGateClassification,
} from "./profitGate";
import { parseUsdToMinor, pickCheapestFreight } from "./pricing";
import type { CjListProduct, CjProductDetail, CjVariant } from "./types";

export type ExpansionAcceptedProduct = {
  provider: "cj";
  cj_product_id: string;
  cj_variant_id: string | null;
  sku: string | null;
  department: StoreDepartment;
  subcategory: string;
  family: string;
  title: string;
  description: string;
  image_urls: string[];
  retail_price_minor: number;
  landed_cost_minor: number;
  supplier_price_minor: number;
  shipping_minor: number;
  gross_profit_minor: number;
  gross_margin: number;
  currency: "USD";
  stock: number;
  estimated_delivery_time: string | null;
  delivery_days: number | null;
  availability: "in_stock";
  classification: Exclude<ProfitGateClassification, "REJECTED_V2">;
  score: number;
  last_synced_at: string;
};

export type ExpansionRejectedRow = {
  cj_product_id: string;
  title: string;
  department: StoreDepartment;
  subcategory: string;
  reasons: string[];
};

export type ExpansionCatalogFile = {
  task_id: typeof CJ_EXPANSION_TASK_ID;
  generated_at: string;
  provider: "cj";
  live_connected: boolean;
  skip_approved_ids: number;
  candidates_fetched: number;
  additional_products_accepted: number;
  paid_ad_ready: number;
  organic_only: number;
  rejected: number;
  substituted: false;
  department_counts: Record<string, number>;
  subcategory_counts: Record<string, number>;
  avg_landed_cost_major: number | null;
  avg_retail_major: number | null;
  avg_gross_margin: number | null;
  avg_delivery_days: number | null;
  taxonomy: {
    departments: readonly StoreDepartment[];
    subcategories: typeof STORE_SUBCATEGORIES;
  };
  products: ExpansionAcceptedProduct[];
  rejected_sample: ExpansionRejectedRow[];
};

function departmentToPilot(department: StoreDepartment): CjPilotCategory {
  if (department === "PET") return "Pet";
  if (department === "CAR") return "Car";
  if (department === "TRAVEL") return "Travel";
  if (department === "BEAUTY & PERSONAL") return "Beauty";
  return "Home";
}

function flattenList(data: { content?: Array<{ productList?: CjListProduct[] }> } | undefined) {
  const rows: CjListProduct[] = [];
  for (const block of data?.content ?? []) {
    for (const product of block.productList ?? []) {
      if (product.id) rows.push(product);
    }
  }
  return rows;
}

function asQty(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function variantStock(variant: CjVariant): { stock: number; country: string | null } {
  let stock = asQty(variant.inventoryNum);
  let country: string | null = null;
  for (const inventory of variant.inventories ?? []) {
    stock +=
      asQty(inventory.totalInventory) ||
      asQty(inventory.cjInventory) ||
      asQty(inventory.factoryInventory);
    if (!country && inventory.countryCode) country = inventory.countryCode;
  }
  return { stock, country };
}

function pickVariant(detail: CjProductDetail): CjVariant | null {
  const variants = detail.variants ?? [];
  const scored = variants
    .map((variant) => ({ variant, stock: variantStock(variant).stock }))
    .filter((row) => row.variant.vid)
    .sort((a, b) => b.stock - a.stock);
  return scored[0]?.variant ?? null;
}

function imageUrls(list: CjListProduct, detail: CjProductDetail | null): string[] {
  const urls = [
    ...(detail?.productImageSet ?? []),
    detail?.bigImage,
    list.bigImage,
  ].filter((url): url is string => typeof url === "string" && url.startsWith("https://"));
  return [...new Set(urls)];
}

export function finalizeAcceptedProducts(
  products: ExpansionAcceptedProduct[]
): ExpansionAcceptedProduct[] {
  const ranked = products
    .slice()
    .sort((a, b) => b.score - a.score || b.gross_margin - a.gross_margin);
  const familyCounts = new Map<string, number>();
  const seenTitles = new Set<string>();
  const kept: ExpansionAcceptedProduct[] = [];
  for (const row of ranked) {
    const family = familyFromTitle(row.title);
    const cap = FAMILY_CAPS[family] ?? 8;
    if (cap <= 0) continue;
    const norm = row.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(/\s+/)
      .slice(0, 6)
      .join(" ");
    if (seenTitles.has(norm)) continue;
    if ((familyCounts.get(family) ?? 0) >= cap) continue;
    seenTitles.add(norm);
    familyCounts.set(family, (familyCounts.get(family) ?? 0) + 1);
    kept.push({ ...row, family });
  }
  return kept;
}

function avg(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 1000) / 1000;
}

function titleHardRejects(title: string): string[] {
  const reasons: string[] = [];
  for (const rule of EXCLUSION_PATTERNS) {
    if (rule.re.test(title)) reasons.push(rule.reason);
  }
  for (const rule of V2_TITLE_EXCLUSIONS) {
    if (rule.re.test(title)) reasons.push(rule.reason);
  }
  return [...new Set(reasons)];
}

function isRateLimited(message: string): boolean {
  return /429|rate.?limit|too many|try again/i.test(message);
}

export type ExpansionSleep = (ms: number) => Promise<void>;

export async function runCatalogExpansion(options: {
  client: CjReadOnlyClient;
  skipProductIds: ReadonlySet<string>;
  target?: number;
  gapMs?: number;
  maxDetailFetches?: number;
  maxFreightFetches?: number;
  maxListPages?: number;
  departments?: readonly StoreDepartment[];
  keywordsByDepartment?: Partial<
    Record<StoreDepartment, Partial<Record<string, readonly string[]>>>
  >;
  deptCap?: number;
  subCap?: number;
  sleep?: ExpansionSleep;
  now?: () => string;
  seedProducts?: ExpansionAcceptedProduct[];
  onProgress?: (snapshot: ExpansionCatalogFile) => void;
}): Promise<ExpansionCatalogFile> {
  const target = options.target ?? TARGET_ADDITIONAL_PRODUCTS;
  const gapMs = options.gapMs ?? REQUEST_GAP_MS;
  const maxDetails = options.maxDetailFetches ?? 900;
  const maxFreight = options.maxFreightFetches ?? 720;
  const maxListPages = options.maxListPages ?? 2;
  const deptCap = options.deptCap ?? 48;
  const subCap = options.subCap ?? 14;
  const sleep: ExpansionSleep =
    options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const generatedAt = options.now?.() ?? new Date().toISOString();
  const departments = options.departments ?? STORE_DEPARTMENTS;
  const keywordsByDepartment = options.keywordsByDepartment ?? EXPANSION_SEARCH_KEYWORDS;

  const accepted: ExpansionAcceptedProduct[] = [...(options.seedProducts ?? [])];
  const rejected: ExpansionRejectedRow[] = [];
  const seen = new Set<string>(options.skipProductIds);
  const familyCounts = new Map<string, number>();
  const deptCounts = new Map<StoreDepartment, number>();
  const subCounts = new Map<string, number>();
  for (const row of accepted) {
    seen.add(row.cj_product_id);
    familyCounts.set(row.family, (familyCounts.get(row.family) ?? 0) + 1);
    deptCounts.set(row.department, (deptCounts.get(row.department) ?? 0) + 1);
    const subKey = `${row.department}::${row.subcategory}`;
    subCounts.set(subKey, (subCounts.get(subKey) ?? 0) + 1);
  }
  let listed = 0;
  let detailsUsed = 0;
  let freightUsed = 0;

  const snapshot = (): ExpansionCatalogFile =>
    summarizeExpansion({
      accepted,
      rejected,
      listed,
      skipCount: options.skipProductIds.size,
      generatedAt,
      connected: true,
      deptCounts,
      subCounts,
    });

  async function withRetry<T>(
    run: () => Promise<{ ok: boolean; message?: string; data?: T }>
  ): Promise<{ ok: boolean; message?: string; data?: T }> {
    let last = await run();
    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (last.ok || !isRateLimited(last.message ?? "")) break;
      await sleep(gapMs * (attempt + 2));
      last = await run();
    }
    return last;
  }

  for (const department of departments) {
    if (accepted.length >= target) break;
    const subs = keywordsByDepartment[department] ?? {};
    for (const [subcategory, keywords] of Object.entries(subs)) {
      if (accepted.length >= target) break;
      if ((deptCounts.get(department) ?? 0) >= deptCap) break;
      if ((subCounts.get(`${department}::${subcategory}`) ?? 0) >= subCap) continue;

      for (const keyword of keywords ?? []) {
        if (accepted.length >= target) break;
        for (let pageNum = 1; pageNum <= maxListPages; pageNum += 1) {
          if (accepted.length >= target) break;
          if ((subCounts.get(`${department}::${subcategory}`) ?? 0) >= subCap) break;
          await sleep(gapMs);
          const page = await withRetry(() =>
            options.client.listProductsV2({
              keyWord: keyword,
              page: pageNum,
              size: LIST_PAGE_SIZE,
            })
          );
          const rows = page.ok && page.data ? flattenList(page.data) : [];
          listed += rows.length;
          if (!rows.length) break;

          for (const product of rows) {
            if (accepted.length >= target) break;
            const productId = product.id;
            if (!productId || seen.has(productId)) continue;
            seen.add(productId);

            const listTitle = product.nameEn ?? "Untitled";
            const preReasons = titleHardRejects(listTitle);
            if (preReasons.length) {
              rejected.push({
                cj_product_id: productId,
                title: listTitle,
                department,
                subcategory,
                reasons: preReasons,
              });
              continue;
            }

            const listStock =
              asQty(product.warehouseInventoryNum) || asQty(product.totalVerifiedInventory);
            if (listStock > 0 && listStock < MIN_STOCK_HEALTHY) {
              rejected.push({
                cj_product_id: productId,
                title: listTitle,
                department,
                subcategory,
                reasons: ["poor_inventory"],
              });
              continue;
            }

            if (detailsUsed >= maxDetails) break;
            await sleep(gapMs);
            const queried = await withRetry(() => options.client.queryProduct(productId));
            detailsUsed += 1;
            const detail = queried.ok ? (queried.data as CjProductDetail | undefined) ?? null : null;
            const variant = detail ? pickVariant(detail) : null;
            const stockInfo = variant ? variantStock(variant) : { stock: 0, country: null };
            const stock =
              stockInfo.stock ||
              asQty(product.warehouseInventoryNum) ||
              asQty(product.totalVerifiedInventory);
            const title = detail?.productNameEn ?? product.nameEn ?? "Untitled";
            const images = imageUrls(product, detail);
            const supplier =
              parseUsdToMinor(variant?.variantSellPrice) ??
              parseUsdToMinor(detail?.sellPrice) ??
              parseUsdToMinor(product.nowPrice) ??
              parseUsdToMinor(product.sellPrice);

            if (stock < MIN_STOCK_HEALTHY || supplier == null || !variant?.vid || !images.length) {
              rejected.push({
                cj_product_id: productId,
                title,
                department,
                subcategory,
                reasons: [
                  ...(stock < MIN_STOCK_HEALTHY ? ["poor_inventory"] : []),
                  ...(supplier == null ? ["missing_supplier_price"] : []),
                  ...(!variant?.vid ? ["missing_variant"] : []),
                  ...(!images.length ? ["missing_images"] : []),
                ],
              });
              continue;
            }

            let shippingMinor: number | null = null;
            let feesMinor = 0;
            let delivery = product.deliveryCycle ?? null;
            if (freightUsed < maxFreight) {
              await sleep(gapMs);
              const freight = await withRetry(() =>
                options.client.freightToIreland({
                  vid: variant.vid as string,
                  startCountryCode: stockInfo.country ?? DEFAULT_ORIGIN_COUNTRY,
                })
              );
              freightUsed += 1;
              if (freight.ok && freight.data) {
                const cheapest = pickCheapestFreight(freight.data);
                if (cheapest) {
                  shippingMinor = cheapest.shippingMinor;
                  feesMinor = cheapest.feesMinor;
                  delivery = cheapest.aging ?? delivery;
                }
              }
            }

            const landed =
              supplier != null && shippingMinor != null ? supplier + shippingMinor + feesMinor : null;
            const judged = evaluateProfitGateV2({
              cjProductId: productId,
              cjVariantId: variant.vid ?? null,
              sku: variant.variantSku ?? product.sku ?? null,
              title,
              category: departmentToPilot(department),
              imageUrls: images,
              supplierPriceMinor: supplier,
              shippingMinor,
              feesMinor,
              landedCostMinor: landed,
              stock,
              estimatedDeliveryTime: delivery,
              variantKey: variant.variantKey ?? product.variantKeyEn ?? null,
              productUrl: `https://cjdropshipping.com/product/${productId}.html`,
              sourceBatch: CJ_PROFIT_GATE_V2_SOURCE_EXPAND,
            });

            if (
              judged.classification === "REJECTED_V2" ||
              judged.proposed_retail_minor == null ||
              judged.landed_cost_minor == null ||
              judged.gross_profit_minor == null ||
              judged.gross_margin == null
            ) {
              rejected.push({
                cj_product_id: productId,
                title,
                department,
                subcategory,
                reasons: judged.reasons,
              });
              continue;
            }

            const family = familyFromTitle(title);
            const cap = FAMILY_CAPS[family] ?? 12;
            if ((familyCounts.get(family) ?? 0) >= cap) {
              rejected.push({
                cj_product_id: productId,
                title,
                department,
                subcategory,
                reasons: ["family_cap"],
              });
              continue;
            }

            accepted.push({
              provider: "cj",
              cj_product_id: productId,
              cj_variant_id: judged.cj_variant_id,
              sku: judged.sku,
              department,
              subcategory,
              family,
              title,
              description: `${title}. ${department} / ${subcategory}. Physical product.`,
              image_urls: images,
              retail_price_minor: judged.proposed_retail_minor,
              landed_cost_minor: judged.landed_cost_minor,
              supplier_price_minor: judged.supplier_price_minor ?? 0,
              shipping_minor: judged.shipping_minor ?? 0,
              gross_profit_minor: judged.gross_profit_minor,
              gross_margin: judged.gross_margin,
              currency: "USD",
              stock,
              estimated_delivery_time: judged.estimated_delivery_time,
              delivery_days: judged.delivery_days,
              availability: "in_stock",
              classification: judged.classification,
              score: judged.score,
              last_synced_at: generatedAt,
            });
            familyCounts.set(family, (familyCounts.get(family) ?? 0) + 1);
            deptCounts.set(department, (deptCounts.get(department) ?? 0) + 1);
            subCounts.set(
              `${department}::${subcategory}`,
              (subCounts.get(`${department}::${subcategory}`) ?? 0) + 1
            );
            if (accepted.length % 10 === 0) options.onProgress?.(snapshot());
          }
        }
      }
    }
  }

  const finalized = finalizeAcceptedProducts(accepted);
  const finalDept = new Map<StoreDepartment, number>();
  const finalSub = new Map<string, number>();
  for (const row of finalized) {
    finalDept.set(row.department, (finalDept.get(row.department) ?? 0) + 1);
    const key = `${row.department}::${row.subcategory}`;
    finalSub.set(key, (finalSub.get(key) ?? 0) + 1);
  }
  return summarizeExpansion({
    accepted: finalized,
    rejected,
    listed,
    skipCount: options.skipProductIds.size,
    generatedAt,
    connected: true,
    deptCounts: finalDept,
    subCounts: finalSub,
  });
}

function summarizeExpansion(input: {
  accepted: ExpansionAcceptedProduct[];
  rejected: ExpansionRejectedRow[];
  listed: number;
  skipCount: number;
  generatedAt: string;
  connected: boolean;
  deptCounts: Map<StoreDepartment, number>;
  subCounts: Map<string, number>;
}): ExpansionCatalogFile {
  const paid = input.accepted.filter((row) => row.classification === "PAID_AD_READY");
  const organic = input.accepted.filter((row) => row.classification === "ORGANIC_ONLY");
  return {
    task_id: CJ_EXPANSION_TASK_ID,
    generated_at: input.generatedAt,
    provider: "cj",
    live_connected: input.connected,
    skip_approved_ids: input.skipCount,
    candidates_fetched: input.listed,
    additional_products_accepted: input.accepted.length,
    paid_ad_ready: paid.length,
    organic_only: organic.length,
    rejected: input.rejected.length,
    substituted: false,
    department_counts: Object.fromEntries(
      STORE_DEPARTMENTS.map((dept) => [dept, input.deptCounts.get(dept) ?? 0])
    ),
    subcategory_counts: Object.fromEntries([...input.subCounts.entries()]),
    avg_landed_cost_major: avg(input.accepted.map((row) => row.landed_cost_minor / 100)),
    avg_retail_major: avg(input.accepted.map((row) => row.retail_price_minor / 100)),
    avg_gross_margin: avg(input.accepted.map((row) => row.gross_margin)),
    avg_delivery_days: avg(
      input.accepted
        .map((row) => row.delivery_days)
        .filter((value): value is number => value != null)
    ),
    taxonomy: {
      departments: STORE_DEPARTMENTS,
      subcategories: STORE_SUBCATEGORIES,
    },
    products: input.accepted,
    rejected_sample: input.rejected.slice(0, 40),
  };
}

export function emptyExpansionCatalog(input: {
  skipProductIds: number;
  generatedAt?: string;
  connected?: boolean;
}): ExpansionCatalogFile {
  return summarizeExpansion({
    accepted: [],
    rejected: [],
    listed: 0,
    skipCount: input.skipProductIds,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    connected: input.connected ?? false,
    deptCounts: new Map(),
    subCounts: new Map(),
  });
}
