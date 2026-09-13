import {
  CATEGORY_QUOTA,
  CATEGORY_SEARCH_KEYWORDS,
  CJ_ENDPOINTS,
  CJ_PILOT_BATCH,
  CJ_PILOT_TASK_ID,
  CJ_PROVIDER,
  DEFAULT_ORIGIN_COUNTRY,
  IRELAND_TEST_DESTINATION,
  LIST_PAGE_SIZE,
  MAX_DETAIL_FETCHES,
  MAX_FREIGHT_FETCHES,
  MAX_FREIGHT_PER_CATEGORY,
  MAX_LIST_PAGES,
  PILOT_CATEGORIES,
  REQUEST_GAP_MS,
  TARGET_GROSS_MARGIN,
  type CjPilotCategory,
} from "./constants";
import {
  evaluateCjPilotCandidate,
  precheckCjPilotCandidate,
  summarizeCjPilotRecords,
} from "./evaluator";
import { parseUsdToMinor, pickCheapestFreight } from "./pricing";
import type { CjReadOnlyClient } from "./client";
import type {
  CjListProduct,
  CjPilotCatalogFile,
  CjPilotRecord,
  CjProductDetail,
  CjVariant,
} from "./types";

export type PipelineSleep = (ms: number) => Promise<void>;

export type RunCjPilotOptions = {
  client: CjReadOnlyClient;
  connectedHint?: boolean;
  now?: () => Date;
  sleep?: PipelineSleep;
  categories?: readonly CjPilotCategory[];
  skipProductIds?: readonly string[];
  categoryQuota?: number;
  keywordsByCategory?: Partial<Record<CjPilotCategory, readonly string[]>>;
  maxDetailFetches?: number;
  maxFreightFetches?: number;
  maxFreightPerCategory?: number;
  maxListPages?: number;
  maxUniqueRecords?: number;
};

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function productUrl(id: string): string {
  return `https://cjdropshipping.com/product/${id}.html`;
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
  let stock = 0;
  let country: string | null = null;
  for (const inventory of variant.inventories ?? []) {
    const qty =
      asQty(inventory.totalInventory) ||
      asQty(inventory.cjInventory) ||
      asQty(inventory.factoryInventory);
    stock += qty;
    if (!country && inventory.countryCode) country = inventory.countryCode;
  }
  return { stock, country };
}

function pickPilotVariant(detail: CjProductDetail): CjVariant | null {
  const variants = detail.variants ?? [];
  if (!variants.length) return null;
  const scored = variants
    .map((variant) => {
      const { stock, country } = variantStock(variant);
      return { variant, stock, country, weight: variant.variantWeight ?? Number.POSITIVE_INFINITY };
    })
    .filter((row) => row.variant.vid)
    .sort((a, b) => b.stock - a.stock || a.weight - b.weight);
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

function parseWeightGrams(value: string | number | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const first = Number(value.split("-")[0]);
    return Number.isFinite(first) ? first : null;
  }
  return null;
}

export async function runCjPilotCollection(
  options: RunCjPilotOptions
): Promise<CjPilotCatalogFile> {
  const sleep = options.sleep ?? defaultSleep;
  const generatedAt = (options.now ?? (() => new Date()))().toISOString();
  const records: CjPilotRecord[] = [];
  const seen = new Set<string>(options.skipProductIds ?? []);
  let detailsUsed = 0;
  let freightUsed = 0;
  const freightByCategory = new Map<CjPilotCategory, number>();
  let connected = options.connectedHint ?? false;
  const categories = options.categories?.length
    ? options.categories
    : PILOT_CATEGORIES;
  const categoryQuota = options.categoryQuota ?? CATEGORY_QUOTA;
  const maxDetailFetches = options.maxDetailFetches ?? MAX_DETAIL_FETCHES;
  const maxFreightFetches = options.maxFreightFetches ?? MAX_FREIGHT_FETCHES;
  const maxFreightPerCategory = options.maxFreightPerCategory ?? MAX_FREIGHT_PER_CATEGORY;
  const maxListPages = options.maxListPages ?? MAX_LIST_PAGES;
  const maxUniqueRecords = options.maxUniqueRecords ?? Number.POSITIVE_INFINITY;

  const auth = await options.client.authenticate();
  if (!auth.ok) {
    return emptyCatalogFile({
      generatedAt,
      connected: false,
      dryRun: true,
      endpoints: options.client.listUsedEndpoints(),
      records: [],
    });
  }
  connected = true;
  process.stdout.write("CJ_PILOT auth=ok\n");

  for (const category of categories) {
    let acceptedInCategory = 0;
    const keywords = options.keywordsByCategory?.[category] ?? CATEGORY_SEARCH_KEYWORDS[category];
    for (const keyword of keywords) {
      if (acceptedInCategory >= categoryQuota) break;
      if (records.length >= maxUniqueRecords) break;
      for (let page = 1; page <= maxListPages; page += 1) {
        if (acceptedInCategory >= categoryQuota) break;
        if (records.length >= maxUniqueRecords) break;
        await sleep(REQUEST_GAP_MS);
        const listed = await options.client.listProductsV2({
          keyWord: keyword,
          page,
          size: LIST_PAGE_SIZE,
        });
        if (!listed.ok) {
          process.stdout.write(`CJ_PILOT list_fail category=${category}\n`);
          break;
        }
        const listedRows = flattenList(listed.data);
        process.stdout.write(
          `CJ_PILOT listed category=${category} page=${page} count=${listedRows.length}\n`
        );
        if (!listedRows.length) break;

        for (const product of listedRows) {
          if (acceptedInCategory >= categoryQuota) break;
          if (records.length >= maxUniqueRecords) break;
          const productId = product.id;
          if (!productId || seen.has(productId)) continue;
          seen.add(productId);

          let detail: CjProductDetail | null = null;
          if (detailsUsed < maxDetailFetches) {
            await sleep(REQUEST_GAP_MS);
            const queried = await options.client.queryProduct(productId);
            detailsUsed += 1;
            if (queried.ok) detail = queried.data;
          }

          const variant = detail ? pickPilotVariant(detail) : null;
          const variantInfo = variant
            ? variantStock(variant)
            : { stock: 0, country: null };
          const listStock =
            asQty(product.warehouseInventoryNum) ||
            asQty(product.totalVerifiedInventory);
          const stock = variantInfo.stock > 0 ? variantInfo.stock : listStock;
          const country = variantInfo.country;

          const supplierPriceMinor =
            parseUsdToMinor(variant?.variantSellPrice) ??
            parseUsdToMinor(detail?.sellPrice) ??
            parseUsdToMinor(product.nowPrice) ??
            parseUsdToMinor(product.sellPrice);

          const draftInput = {
            cjProductId: productId,
            cjVariantId: variant?.vid ?? null,
            sku: variant?.variantSku ?? product.sku ?? product.spu ?? null,
            title: detail?.productNameEn ?? product.nameEn ?? "Untitled CJ product",
            category,
            imageUrls: imageUrls(product, detail),
            supplierPriceMinor,
            shippingMinor: null as number | null,
            feesMinor: 0,
            stock,
            processingTime: product.deliveryCycle ?? null,
            estimatedDeliveryTime: product.deliveryCycle ?? null,
            sourceWarehouseCountry: country,
            productUrl: productUrl(productId),
            weightGrams:
              parseWeightGrams(variant?.variantWeight) ??
              parseWeightGrams(detail?.packingWeight) ??
              parseWeightGrams(detail?.productWeight),
            lengthMm: variant?.variantLength ?? null,
            widthMm: variant?.variantWidth ?? null,
            heightMm: variant?.variantHeight ?? null,
            variantKey: variant?.variantKey ?? product.variantKeyEn ?? null,
            logisticsProps: detail?.productProEnSet ?? [],
            listedNum: product.listedNum,
          };

          const early = precheckCjPilotCandidate(draftInput);
          if (early) {
            records.push(evaluateCjPilotCandidate(draftInput));
            continue;
          }

          let shippingMinor: number | null = null;
          let feesMinor = 0;
          let delivery = product.deliveryCycle ?? null;
          const categoryFreight = freightByCategory.get(category) ?? 0;
          if (
            variant?.vid &&
            freightUsed < maxFreightFetches &&
            categoryFreight < maxFreightPerCategory
          ) {
            await sleep(REQUEST_GAP_MS);
            const freight = await options.client.freightToIreland({
              vid: variant.vid,
              startCountryCode: country ?? DEFAULT_ORIGIN_COUNTRY,
            });
            freightUsed += 1;
            freightByCategory.set(category, categoryFreight + 1);
            if (freight.ok) {
              const cheapest = pickCheapestFreight(freight.data);
              if (cheapest) {
                shippingMinor = cheapest.shippingMinor;
                feesMinor = cheapest.feesMinor;
                delivery = cheapest.aging ?? delivery;
              }
            }
          }

          const record = evaluateCjPilotCandidate({
            ...draftInput,
            shippingMinor,
            feesMinor,
            estimatedDeliveryTime: delivery,
          });
          records.push(record);
          if (record.decision === "accepted") acceptedInCategory += 1;
        }
      }
    }
    process.stdout.write(
      `CJ_PILOT category=${category} accepted=${acceptedInCategory} scanned=${records.filter((row) => row.category === category).length}\n`
    );
  }

  return emptyCatalogFile({
    generatedAt,
    connected,
    dryRun: false,
    endpoints: uniqueEndpoints(options.client.listUsedEndpoints()),
    records,
  });
}

export function emptyCatalogFile(input: {
  generatedAt: string;
  connected: boolean;
  dryRun: boolean;
  endpoints: string[];
  records: CjPilotRecord[];
}): CjPilotCatalogFile {
  return {
    task_id: CJ_PILOT_TASK_ID,
    generated_at: input.generatedAt,
    cj_api_connected: input.connected,
    dry_run: input.dryRun,
    provider: CJ_PROVIDER,
    pilot_batch: CJ_PILOT_BATCH,
    ireland_test_destination: IRELAND_TEST_DESTINATION,
    endpoints_used: uniqueEndpoints(input.endpoints),
    pricing_rule: {
      target_gross_margin: TARGET_GROSS_MARGIN,
      landed_cost_formula: "supplier_price + estimated_shipping_to_IE + documented_api_fees",
      gross_profit_formula: "retail - landed",
      gross_margin_formula: "gross_profit / retail",
      rounding: "never below landed/(1-0.30); clean .49/.99 or whole dollars",
      market_competitiveness:
        "unverified — CJ list-page margin is ignored; no third-party market scrape",
    },
    summary: summarizeCjPilotRecords(input.records),
    products: input.records,
  };
}

function uniqueEndpoints(paths: string[]): string[] {
  const known = new Set(Object.values(CJ_ENDPOINTS));
  return [...new Set(paths.filter((path) => known.has(path as (typeof CJ_ENDPOINTS)[keyof typeof CJ_ENDPOINTS])))].sort();
}

export function emptyDryRunCatalog(generatedAt = new Date().toISOString()): CjPilotCatalogFile {
  return emptyCatalogFile({
    generatedAt,
    connected: false,
    dryRun: true,
    endpoints: [
      CJ_ENDPOINTS.getAccessToken,
      CJ_ENDPOINTS.refreshAccessToken,
      CJ_ENDPOINTS.getCategory,
      CJ_ENDPOINTS.listV2,
      CJ_ENDPOINTS.productQuery,
      CJ_ENDPOINTS.freightCalculate,
    ],
    records: [],
  });
}

export type { CjPilotCategory };
