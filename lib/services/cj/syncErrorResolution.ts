/**
 * Bounded read-only recovery for the 8 live SYNC_ERROR products.
 * Never substitutes into the approved set. Never writes orders.
 */

import type { CjReadOnlyClient } from "./client";
import { EXCLUSION_PATTERNS, REQUEST_GAP_MS } from "./constants";
import type { ApprovedDraftProduct } from "./launchDraft";
import { classifyLiveRow, type LiveReadRow } from "./liveReadGate";
import { parseUsdToMinor, pickCheapestFreight } from "./pricing";
import { PAID_MIN_GROSS_MARGIN, PAID_MIN_GROSS_PROFIT_MINOR } from "./profitGate";
import type { ProductionCandidateProduct } from "./productionCandidate";
import type { CjProductDetail, CjVariant } from "./types";

export const SYNC_ERROR_RESOLUTION_TASK_ID =
  "UMTUBA_CJ_8_SYNC_ERROR_RESOLUTION_V1" as const;

export type SyncFailureKind =
  | "product_query_failure"
  | "variant_query_failure"
  | "freight_missing"
  | "supplier_price_missing"
  | "shipping_route_unavailable"
  | "malformed_provider_data"
  | "transient_api_failure";

export type ReplacementCandidate = {
  title: string;
  category: string;
  cj_product_id: string;
  sku: string | null;
  estimated_landed_minor: number | null;
  projected_margin: number | null;
  projected_profit_minor: number | null;
  delivery: string | null;
  owner_review_only: true;
  auto_approved: false;
};

export type ResolvedSyncItem = {
  slug: string;
  title: string;
  category: string;
  sku: string | null;
  input_flags: string[];
  input_kind: SyncFailureKind;
  resolved: boolean;
  failure_kind: SyncFailureKind | null;
  live: LiveReadRow;
  replacement_candidates: ReplacementCandidate[];
};

const MAX_STEP_ATTEMPTS = 2;
const MAX_REPLACEMENTS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function classifyInputFailure(flags: string[]): SyncFailureKind {
  if (flags.includes("live_product_query_failed")) return "product_query_failure";
  if (flags.includes("live_variant_missing")) return "variant_query_failure";
  if (flags.includes("live_freight_or_price_missing")) return "freight_missing";
  return "transient_api_failure";
}

function looksMalformedPid(pid: string): boolean {
  return /[A-Fa-f]/.test(pid) && pid.includes("-");
}

function isTransientMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("timeout") || lower.includes("timed out") || lower.includes("abort");
}

async function withRetry<T>(
  run: () => Promise<{ ok: boolean; data?: T; message?: string }>,
  gapMs: number
): Promise<{ ok: true; data: T } | { ok: false; message: string; transient: boolean }> {
  let last = "request_failed";
  let transient = false;
  for (let attempt = 0; attempt < MAX_STEP_ATTEMPTS; attempt += 1) {
    if (attempt > 0) await sleep(gapMs);
    const result = await run();
    if (result.ok && result.data !== undefined) return { ok: true, data: result.data };
    last = result.message || "request_failed";
    transient = isTransientMessage(last);
  }
  return { ok: false, message: last, transient };
}

function stockFromUnknown(data: unknown): number {
  if (!data || typeof data !== "object") return 0;
  const row = data as Record<string, unknown>;
  const direct = [row.inventory, row.totalInventory, row.inventoryNum, row.cjInventory];
  for (const value of direct) {
    const n = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  if (Array.isArray(row.list)) {
    let sum = 0;
    for (const item of row.list) {
      sum += stockFromUnknown(item);
    }
    return sum;
  }
  return 0;
}

function pickVariant(detail: CjProductDetail, product: ApprovedDraftProduct): CjVariant | null {
  const variants = detail.variants ?? [];
  if (product.identity.cj_variant_id) {
    const exact = variants.find((row) => row.vid === product.identity.cj_variant_id);
    if (exact) return exact;
  }
  if (product.identity.sku) {
    const sku = variants.find((row) => row.variantSku === product.identity.sku);
    if (sku) return sku;
  }
  return variants[0] ?? null;
}

async function loadProductDetail(
  client: CjReadOnlyClient,
  product: ApprovedDraftProduct,
  gapMs: number
): Promise<
  | { ok: true; detail: CjProductDetail; via: "pid" | "variantSku" | "productSku" }
  | { ok: false; kind: SyncFailureKind }
> {
  const pid = product.identity.cj_product_id;
  if (!looksMalformedPid(pid)) {
    const byPid = await withRetry(() => client.queryProduct(pid), gapMs);
    if (byPid.ok) return { ok: true, detail: byPid.data, via: "pid" };
    if (byPid.transient) return { ok: false, kind: "transient_api_failure" };
  }

  if (product.identity.sku) {
    await sleep(gapMs);
    const byVariant = await withRetry(
      () => client.queryProductByVariantSku(product.identity.sku!),
      gapMs
    );
    if (byVariant.ok) return { ok: true, detail: byVariant.data, via: "variantSku" };
    await sleep(gapMs);
    const bySku = await withRetry(() => client.queryProductBySku(product.identity.sku!), gapMs);
    if (bySku.ok) return { ok: true, detail: bySku.data, via: "productSku" };
  }

  if (looksMalformedPid(pid)) return { ok: false, kind: "malformed_provider_data" };
  return { ok: false, kind: "product_query_failure" };
}

export async function recoverSyncErrorProduct(options: {
  client: CjReadOnlyClient;
  product: ApprovedDraftProduct;
  inputFlags: string[];
  gapMs?: number;
}): Promise<ResolvedSyncItem> {
  const gapMs = options.gapMs ?? REQUEST_GAP_MS;
  const inputKind = classifyInputFailure(options.inputFlags);
  const base = {
    slug: options.product.customer.slug,
    title: options.product.customer.title,
    category: options.product.customer.category,
    sku: options.product.identity.sku,
    input_flags: options.inputFlags,
    input_kind: inputKind,
    replacement_candidates: [] as ReplacementCandidate[],
  };

  const loaded = await loadProductDetail(options.client, options.product, gapMs);
  if (!loaded.ok) {
    const live = classifyLiveRow({
      product: options.product,
      queryOk: false,
      detail: null,
      freightOk: false,
      shippingMinor: null,
      feesMinor: 0,
      delivery: null,
    });
    return {
      ...base,
      resolved: false,
      failure_kind: loaded.kind,
      live: { ...live, flags: [...live.flags, "unresolved_sync_error", loaded.kind] },
    };
  }

  let variant = pickVariant(loaded.detail, options.product);
  if (!variant?.vid && options.product.identity.cj_variant_id) {
    await sleep(gapMs);
    const variantQuery = await withRetry(
      () => options.client.queryVariantByVid(options.product.identity.cj_variant_id!),
      gapMs
    );
    if (!variantQuery.ok) {
      const live = classifyLiveRow({
        product: options.product,
        queryOk: true,
        detail: loaded.detail,
        freightOk: false,
        shippingMinor: null,
        feesMinor: 0,
        delivery: null,
      });
      return {
        ...base,
        resolved: false,
        failure_kind: variantQuery.transient ? "transient_api_failure" : "variant_query_failure",
        live: {
          ...live,
          sync_status: "SYNC_ERROR",
          flags: [...live.flags, "unresolved_sync_error", "variant_query_failure"],
        },
      };
    }
  }

  variant = pickVariant(loaded.detail, options.product);
  if (variant?.vid) {
    await sleep(gapMs);
    const stock = await options.client.queryStockByVid(variant.vid);
    if (stock.ok) {
      const qty = stockFromUnknown(stock.data);
      if (qty > 0) variant = { ...variant, inventoryNum: qty };
    } else if (options.product.identity.sku) {
      await sleep(gapMs);
      const stockSku = await options.client.queryStockBySku(options.product.identity.sku);
      if (stockSku.ok) {
        const qty = stockFromUnknown(stockSku.data);
        if (qty > 0) variant = { ...variant, inventoryNum: qty };
      }
    }
  }

  const detail: CjProductDetail = {
    ...loaded.detail,
    variants: (loaded.detail.variants ?? []).map((row) =>
      variant && row.vid === variant.vid ? variant : row
    ),
  };

  let freightOk = false;
  let shippingMinor: number | null = null;
  let feesMinor = 0;
  let delivery: string | null = options.product.economics.estimated_delivery_time;
  let freightKind: SyncFailureKind | null = null;

  if (variant?.vid) {
    await sleep(gapMs);
    const freight = await withRetry(
      () => options.client.freightToIreland({ vid: variant!.vid! }),
      gapMs
    );
    if (freight.ok) {
      const cheapest = pickCheapestFreight(freight.data);
      if (cheapest) {
        freightOk = true;
        shippingMinor = cheapest.shippingMinor;
        feesMinor = cheapest.feesMinor;
        delivery = cheapest.aging ?? delivery;
      } else {
        freightKind = "shipping_route_unavailable";
      }
    } else {
      freightKind = freight.transient ? "transient_api_failure" : "freight_missing";
    }
  }

  const supplier =
    parseUsdToMinor(variant?.variantSellPrice) ?? parseUsdToMinor(detail.sellPrice);
  const live = classifyLiveRow({
    product: options.product,
    queryOk: true,
    detail,
    freightOk,
    shippingMinor,
    feesMinor,
    delivery,
  });

  if (live.sync_status === "HEALTHY" || live.sync_status === "PRICE_REVIEW") {
    return { ...base, resolved: true, failure_kind: null, live };
  }
  if (live.sync_status === "OUT_OF_STOCK" || live.sync_status === "PROVIDER_UNAVAILABLE") {
    return { ...base, resolved: true, failure_kind: null, live };
  }

  let kind: SyncFailureKind =
    freightKind ??
    (supplier == null ? "supplier_price_missing" : "freight_missing");
  if (!variant?.vid) kind = "variant_query_failure";
  return {
    ...base,
    resolved: false,
    failure_kind: kind,
    live: { ...live, flags: [...live.flags, "unresolved_sync_error", kind] },
  };
}

export async function suggestReplacementCandidates(options: {
  client: CjReadOnlyClient;
  product: ApprovedDraftProduct;
  gapMs?: number;
}): Promise<ReplacementCandidate[]> {
  const gapMs = options.gapMs ?? REQUEST_GAP_MS;
  const keyword = options.product.customer.category.split(" / ")[0];
  await sleep(gapMs);
  const listed = await options.client.listProductsV2({
    keyWord: keyword,
    page: 1,
    size: 10,
  });
  if (!listed.ok) return [];

  const rows =
    listed.data.content?.flatMap((block) => block.productList ?? []) ?? [];
  const out: ReplacementCandidate[] = [];
  for (const row of rows) {
    if (out.length >= MAX_REPLACEMENTS) break;
    if (!row.id || row.id === options.product.identity.cj_product_id) continue;
    const blob = `${row.nameEn ?? ""} ${row.description ?? ""}`;
    if (EXCLUSION_PATTERNS.some((rule) => rule.re.test(blob))) continue;
    await sleep(gapMs);
    const detail = await options.client.queryProduct(row.id);
    if (!detail.ok) continue;
    const variant = detail.data.variants?.[0];
    if (!variant?.vid) continue;
    const supplier =
      parseUsdToMinor(variant.variantSellPrice) ?? parseUsdToMinor(detail.data.sellPrice);
    if (supplier == null) continue;
    await sleep(gapMs);
    const freight = await options.client.freightToIreland({ vid: variant.vid });
    if (!freight.ok) continue;
    const cheapest = pickCheapestFreight(freight.data);
    if (!cheapest) continue;
    const landed = supplier + cheapest.shippingMinor + cheapest.feesMinor;
    const retail = options.product.customer.retail_price_minor ?? Math.ceil(landed / 0.55);
    const profit = retail - landed;
    const margin = retail > 0 ? profit / retail : 0;
    if (margin + 1e-9 < PAID_MIN_GROSS_MARGIN) continue;
    if (profit < PAID_MIN_GROSS_PROFIT_MINOR) continue;
    out.push({
      title: row.nameEn ?? "Untitled",
      category: options.product.customer.category,
      cj_product_id: row.id,
      sku: variant.variantSku ?? row.sku ?? null,
      estimated_landed_minor: landed,
      projected_margin: Math.round(margin * 1000) / 1000,
      projected_profit_minor: profit,
      delivery: cheapest.aging,
      owner_review_only: true,
      auto_approved: false,
    });
  }
  return out;
}

export function applyResolutionToCandidateProduct(
  row: ProductionCandidateProduct,
  resolved: ResolvedSyncItem
): ProductionCandidateProduct {
  const held = !resolved.resolved || resolved.live.sync_status === "SYNC_ERROR";
  const availability =
    held || !resolved.live.provider_available || resolved.live.sync_status === "OUT_OF_STOCK"
      ? "Unavailable"
      : "In stock";
  return {
    ...row,
    customer: {
      ...row.customer,
      availability_label: availability,
      delivery_label: resolved.live.estimated_delivery_time
        ? `Typically ${resolved.live.estimated_delivery_time} days to Ireland`
        : row.customer.delivery_label,
      featured_eligible: held ? false : row.customer.featured_eligible,
    },
    economics: {
      ...row.economics,
      landed_cost_minor: resolved.live.landed_cost_minor ?? row.economics.landed_cost_minor,
      gross_profit_minor: resolved.live.gross_profit_minor ?? row.economics.gross_profit_minor,
      gross_margin: resolved.live.gross_margin ?? row.economics.gross_margin,
      stock: resolved.live.stock ?? row.economics.stock,
      estimated_delivery_time:
        resolved.live.estimated_delivery_time ?? row.economics.estimated_delivery_time,
    },
    featured_eligible: held ? false : row.featured_eligible,
    sync_status: resolved.live.sync_status,
    sync_basis: "live_cj_read",
    live_verified: resolved.live.live_verified,
    last_synced_at: new Date().toISOString(),
    provider_available: resolved.live.provider_available && !held,
    flags: held
      ? [...resolved.live.flags, "held_inactive", "unresolved_sync_error"]
      : resolved.live.flags.filter((flag) => flag !== "unresolved_sync_error"),
  };
}
