/**
 * Live READ-ONLY verification of the approved 59 CJ products.
 * Never creates orders. Never prints credentials or tokens.
 */

import { REQUEST_GAP_MS } from "./constants";
import type { CjReadOnlyClient } from "./client";
import type { ApprovedDraftFile } from "./launchDraftFile";
import type { ApprovedDraftProduct } from "./launchDraft";
import { APPROVED_LAUNCH_COUNT } from "./launchDraft";
import { computeLandedCostMinor, parseUsdToMinor, pickCheapestFreight } from "./pricing";
import { evaluatePriceSafety } from "./priceSafety";
import {
  CJ_PRODUCTION_CANDIDATE_TASK_ID,
  buildProductionCandidateFile,
  type CjSyncStatus,
  type ProductionCandidateFile,
  type ProductionCandidateProduct,
} from "./productionCandidate";
import type { CjProductDetail, CjVariant } from "./types";

const MATERIAL_LANDED_RISE = 0.1;

export type LiveReadRow = {
  cj_product_id: string;
  sync_status: CjSyncStatus;
  live_verified: boolean;
  provider_available: boolean;
  stock: number | null;
  supplier_price_minor: number | null;
  shipping_minor: number | null;
  fees_minor: number;
  landed_cost_minor: number | null;
  retail_price_minor: number | null;
  gross_profit_minor: number | null;
  gross_margin: number | null;
  estimated_delivery_time: string | null;
  flags: string[];
};

export type LiveReadGateResult = {
  auth_ok: boolean;
  write_calls: 0;
  live_product_reads: number;
  live_freight_reads: number;
  substituted: false;
  products: LiveReadRow[];
};

function asQty(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function variantStock(variant: CjVariant): number {
  const direct = asQty(variant.inventoryNum);
  if (direct > 0) return direct;
  let stock = 0;
  for (const inventory of variant.inventories ?? []) {
    stock +=
      asQty(inventory.totalInventory) ||
      asQty(inventory.cjInventory) ||
      asQty(inventory.factoryInventory);
    for (const row of inventory.stock ?? []) {
      stock += asQty(row.inventory) || asQty(row.factoryInventory);
    }
  }
  return stock > 0 ? stock : direct;
}

function pickApprovedVariant(
  detail: CjProductDetail,
  identity: ApprovedDraftProduct["identity"]
): CjVariant | null {
  const variants = detail.variants ?? [];
  if (identity.cj_variant_id) {
    const exact = variants.find((row) => row.vid === identity.cj_variant_id);
    if (exact) return exact;
  }
  if (identity.sku) {
    const skuMatch = variants.find((row) => row.variantSku === identity.sku);
    if (skuMatch) return skuMatch;
  }
  return variants[0] ?? null;
}

export function classifyLiveRow(input: {
  product: ApprovedDraftProduct;
  queryOk: boolean;
  detail: CjProductDetail | null;
  freightOk: boolean;
  shippingMinor: number | null;
  feesMinor: number;
  delivery: string | null;
}): LiveReadRow {
  const retail = input.product.customer.retail_price_minor;
  const flags: string[] = [...input.product.flags];
  const base = {
    cj_product_id: input.product.identity.cj_product_id,
    retail_price_minor: retail,
  };

  if (!input.queryOk || !input.detail) {
    return {
      ...base,
      sync_status: "SYNC_ERROR",
      live_verified: false,
      provider_available: false,
      stock: null,
      supplier_price_minor: null,
      shipping_minor: null,
      fees_minor: 0,
      landed_cost_minor: null,
      gross_profit_minor: null,
      gross_margin: null,
      estimated_delivery_time: null,
      flags: [...flags, "live_product_query_failed"],
    };
  }

  const variant = pickApprovedVariant(input.detail, input.product.identity);
  if (!variant?.vid) {
    return {
      ...base,
      sync_status: "PROVIDER_UNAVAILABLE",
      live_verified: true,
      provider_available: false,
      stock: 0,
      supplier_price_minor: null,
      shipping_minor: null,
      fees_minor: 0,
      landed_cost_minor: null,
      gross_profit_minor: null,
      gross_margin: null,
      estimated_delivery_time: null,
      flags: [...flags, "live_variant_missing"],
    };
  }

  const stock = variantStock(variant);
  const supplier =
    parseUsdToMinor(variant.variantSellPrice) ?? parseUsdToMinor(input.detail.sellPrice);
  const hasImage = Boolean(
    (typeof variant.variantImage === "string" && variant.variantImage.startsWith("https://")) ||
      (typeof input.detail.bigImage === "string" && input.detail.bigImage.startsWith("https://")) ||
      (input.detail.productImageSet ?? []).some(
        (url) => typeof url === "string" && url.startsWith("https://")
      )
  );
  if (!hasImage) flags.push("missing_primary_image");

  if (stock <= 0) {
    return {
      ...base,
      sync_status: "OUT_OF_STOCK",
      live_verified: true,
      provider_available: false,
      stock,
      supplier_price_minor: supplier,
      shipping_minor: input.shippingMinor,
      fees_minor: input.feesMinor,
      landed_cost_minor: null,
      gross_profit_minor: null,
      gross_margin: null,
      estimated_delivery_time: input.delivery,
      flags: [...flags, "live_zero_stock"],
    };
  }

  if (!input.freightOk || input.shippingMinor == null || supplier == null || retail == null) {
    return {
      ...base,
      sync_status: "SYNC_ERROR",
      live_verified: true,
      provider_available: true,
      stock,
      supplier_price_minor: supplier,
      shipping_minor: input.shippingMinor,
      fees_minor: input.feesMinor,
      landed_cost_minor: null,
      gross_profit_minor: null,
      gross_margin: null,
      estimated_delivery_time: input.delivery,
      flags: [...flags, "live_freight_or_price_missing"],
    };
  }

  const landed = computeLandedCostMinor({
    supplierPriceMinor: supplier,
    shippingMinor: input.shippingMinor,
    feesMinor: input.feesMinor,
  });
  const previousLanded = input.product.economics.landed_cost_minor;
  if (
    previousLanded != null &&
    previousLanded > 0 &&
    (landed - previousLanded) / previousLanded >= MATERIAL_LANDED_RISE
  ) {
    flags.push("material_landed_increase");
  }

  const safety = evaluatePriceSafety({
    retailMinor: retail,
    landedCostMinor: landed,
  });
  const status: CjSyncStatus = !hasImage
    ? "SYNC_ERROR"
    : safety.safe
      ? "HEALTHY"
      : "PRICE_REVIEW";
  if (!safety.safe) flags.push(safety.reason);

  return {
    ...base,
    sync_status: status,
    live_verified: true,
    provider_available: true,
    stock,
    supplier_price_minor: supplier,
    shipping_minor: input.shippingMinor,
    fees_minor: input.feesMinor,
    landed_cost_minor: landed,
    gross_profit_minor: safety.gross_profit_minor,
    gross_margin: safety.gross_margin,
    estimated_delivery_time: input.delivery,
    flags,
  };
}

export async function runApproved59LiveRead(
  options: {
    client: CjReadOnlyClient;
    approved: ApprovedDraftFile;
    sleep?: (ms: number) => Promise<void>;
  }
): Promise<LiveReadGateResult> {
  if (options.approved.products.length !== APPROVED_LAUNCH_COUNT) {
    throw new Error(`Expected ${APPROVED_LAUNCH_COUNT} approved products`);
  }
  const sleep = options.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const auth = await options.client.authenticate();
  if (!auth.ok) {
    return {
      auth_ok: false,
      write_calls: 0,
      live_product_reads: 0,
      live_freight_reads: 0,
      substituted: false,
      products: options.approved.products.map((product) =>
        classifyLiveRow({
          product,
          queryOk: false,
          detail: null,
          freightOk: false,
          shippingMinor: null,
          feesMinor: 0,
          delivery: null,
        })
      ),
    };
  }

  const products: LiveReadRow[] = [];
  let liveProductReads = 0;
  let liveFreightReads = 0;

  for (const product of options.approved.products) {
    await sleep(REQUEST_GAP_MS);
    const queried = await options.client.queryProduct(product.identity.cj_product_id);
    liveProductReads += 1;
    const detail = queried.ok ? queried.data : null;
    const variant = detail ? pickApprovedVariant(detail, product.identity) : null;

    let freightOk = false;
    let shippingMinor: number | null = null;
    let feesMinor = 0;
    let delivery: string | null = product.economics.estimated_delivery_time;

    if (queried.ok && variant?.vid) {
      await sleep(REQUEST_GAP_MS);
      const freight = await options.client.freightToIreland({ vid: variant.vid });
      liveFreightReads += 1;
      if (freight.ok) {
        const cheapest = pickCheapestFreight(freight.data);
        if (cheapest) {
          freightOk = true;
          shippingMinor = cheapest.shippingMinor;
          feesMinor = cheapest.feesMinor;
          delivery = cheapest.aging ?? delivery;
        }
      }
    }

    products.push(
      classifyLiveRow({
        product,
        queryOk: queried.ok,
        detail,
        freightOk,
        shippingMinor,
        feesMinor,
        delivery,
      })
    );
  }

  const ids = new Set(products.map((row) => row.cj_product_id));
  if (ids.size !== APPROVED_LAUNCH_COUNT) {
    throw new Error("Live read drifted from the approved 59-product set");
  }

  return {
    auth_ok: true,
    write_calls: 0,
    live_product_reads: liveProductReads,
    live_freight_reads: liveFreightReads,
    substituted: false,
    products,
  };
}

function availabilityLabel(row: LiveReadRow): string {
  if (
    row.sync_status === "OUT_OF_STOCK" ||
    row.sync_status === "PROVIDER_UNAVAILABLE" ||
    row.sync_status === "SYNC_ERROR" ||
    !row.provider_available
  ) {
    return "Unavailable";
  }
  if (row.stock != null && row.stock > 0) return "In stock";
  return "Unavailable";
}

function deliveryLabel(row: LiveReadRow, fallback: string): string {
  if (!row.estimated_delivery_time) return fallback;
  return `Typically ${row.estimated_delivery_time} days to Ireland`;
}

export function mergeLiveReadIntoCandidate(
  approved: ApprovedDraftFile,
  live: LiveReadGateResult,
  generatedAt = new Date().toISOString()
): ProductionCandidateFile {
  const baseline = buildProductionCandidateFile(approved, generatedAt);
  const byId = new Map(live.products.map((row) => [row.cj_product_id, row]));
  if (!live.auth_ok) {
    return {
      ...baseline,
      generated_at: generatedAt,
      live_audit: {
        status: "AUTH_FAILED",
        note: "Live authentication failed. Last-known approved-59 statuses retained. Not live-verified.",
      },
    };
  }

  const products: ProductionCandidateProduct[] = baseline.products.map((row) => {
    const liveRow = byId.get(row.identity.cj_product_id);
    if (!liveRow) return row;
    return {
      ...row,
      customer: {
        ...row.customer,
        availability_label: availabilityLabel(liveRow),
        delivery_label: deliveryLabel(liveRow, row.customer.delivery_label),
      },
      economics: {
        ...row.economics,
        landed_cost_minor: liveRow.landed_cost_minor ?? row.economics.landed_cost_minor,
        gross_profit_minor: liveRow.gross_profit_minor ?? row.economics.gross_profit_minor,
        gross_margin: liveRow.gross_margin ?? row.economics.gross_margin,
        stock: liveRow.stock ?? row.economics.stock,
        estimated_delivery_time:
          liveRow.estimated_delivery_time ?? row.economics.estimated_delivery_time,
      },
      sync_status: liveRow.sync_status,
      sync_basis: live.auth_ok ? "live_cj_read" : row.sync_basis,
      live_verified: liveRow.live_verified,
      last_synced_at: generatedAt,
      provider_available: liveRow.provider_available,
      flags: liveRow.flags,
    };
  });

  const count = (status: CjSyncStatus) =>
    products.filter((row) => row.sync_status === status).length;
  const verified = products.filter((row) => row.live_verified).length;
  const auditStatus = !live.auth_ok
    ? "AUTH_FAILED"
    : verified === APPROVED_LAUNCH_COUNT
      ? "LIVE_VERIFIED"
      : "PARTIAL";

  return {
    ...baseline,
    task_id: CJ_PRODUCTION_CANDIDATE_TASK_ID,
    generated_at: generatedAt,
    live_audit: {
      status: auditStatus,
      note:
        auditStatus === "LIVE_VERIFIED"
          ? "Live read-only verification against rotated server key. Ireland TEST dest IE/Dublin/D02. No orders."
          : "Live read incomplete or auth failed. Do not treat counts as fully live-verified.",
    },
    summary: {
      ...baseline.summary,
      last_known_healthy: count("HEALTHY"),
      last_known_price_review: count("PRICE_REVIEW"),
      last_known_out_of_stock: count("OUT_OF_STOCK"),
      last_known_provider_unavailable: count("PROVIDER_UNAVAILABLE"),
      last_known_sync_error: count("SYNC_ERROR"),
      substituted: false,
      padded: false,
    },
    products,
  };
}

export function summarizeLiveEconomics(products: LiveReadRow[]): {
  avg_landed_major: number | null;
  avg_gross_margin: number | null;
} {
  const landed = products
    .map((row) => row.landed_cost_minor)
    .filter((value): value is number => value != null);
  const margins = products
    .map((row) => row.gross_margin)
    .filter((value): value is number => value != null);
  return {
    avg_landed_major: landed.length
      ? Math.round(landed.reduce((sum, value) => sum + value, 0) / landed.length) / 100
      : null,
    avg_gross_margin: margins.length
      ? Math.round((margins.reduce((sum, value) => sum + value, 0) / margins.length) * 1000) / 1000
      : null,
  };
}
