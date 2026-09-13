import {
  EXCLUSION_PATTERNS,
  MAX_DELIVERY_DAYS,
  MAX_PACK_EDGE_MM,
  MAX_WEIGHT_GRAMS,
  MIN_HEALTHY_STOCK,
  RESTRICTED_LOGISTICS_PROPS,
  SIZE_MATRIX_RE,
  TARGET_GROSS_MARGIN,
  type CjPilotCategory,
} from "./constants";
import { proposeRetailFromLanded } from "./pricing";
import type { CjPilotRecord } from "./types";

export type EvaluatorInput = {
  cjProductId: string;
  cjVariantId: string | null;
  sku: string | null;
  title: string;
  category: CjPilotCategory;
  imageUrls: string[];
  supplierPriceMinor: number | null;
  shippingMinor: number | null;
  feesMinor?: number;
  stock: number | null;
  processingTime: string | null;
  estimatedDeliveryTime: string | null;
  sourceWarehouseCountry: string | null;
  productUrl: string | null;
  weightGrams: number | null;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  variantKey: string | null;
  logisticsProps: string[];
  listedNum?: number;
};

function textBlob(input: EvaluatorInput): string {
  return [
    input.title,
    input.variantKey ?? "",
    input.sku ?? "",
    input.logisticsProps.join(" "),
  ].join(" ");
}

export function parseDeliveryMaxDays(value: string | null): number | null {
  if (!value) return null;
  const nums = [...value.matchAll(/\d+/g)].map((m) => Number(m[0]));
  if (!nums.length) return null;
  return Math.max(...nums);
}

function hasComplicatedSizeMatrix(input: EvaluatorInput): boolean {
  const key = `${input.variantKey ?? ""} ${input.title}`;
  const sizeHits = key.match(new RegExp(SIZE_MATRIX_RE.source, "gi")) ?? [];
  return sizeHits.length >= 3 || /\b(shoe size|eu size|us size|dress size)\b/i.test(key);
}

export function precheckCjPilotCandidate(
  input: EvaluatorInput
): string | null {
  const blob = textBlob(input);
  if (!input.cjProductId) return "missing_cj_product_id";
  if (!input.title.trim()) return "missing_title";
  if (!input.imageUrls.length) return "missing_images";
  for (const rule of EXCLUSION_PATTERNS) {
    if (rule.re.test(blob)) return rule.reason;
  }
  const restrictedProp = input.logisticsProps.find((prop) =>
    RESTRICTED_LOGISTICS_PROPS.has(prop.trim().toUpperCase())
  );
  if (restrictedProp) {
    return restrictedProp.includes("BATTERY")
      ? "batteries_or_restricted"
      : "dangerous_goods";
  }
  if (hasComplicatedSizeMatrix(input)) return "complicated_sizing";
  if (input.weightGrams != null && input.weightGrams > MAX_WEIGHT_GRAMS) {
    return "heavy_or_bulky";
  }
  const edges = [input.lengthMm, input.widthMm, input.heightMm].filter(
    (n): n is number => typeof n === "number"
  );
  if (edges.some((n) => n > MAX_PACK_EDGE_MM)) return "heavy_or_bulky";
  if (input.stock == null || input.stock < MIN_HEALTHY_STOCK) return "poor_inventory";
  if (input.supplierPriceMinor == null || input.supplierPriceMinor <= 0) {
    return "missing_supplier_price";
  }
  return null;
}

export function evaluateCjPilotCandidate(input: EvaluatorInput): CjPilotRecord {
  const flags: string[] = ["market_competitiveness_unverified"];

  const reject = (reason: string, extra?: Partial<CjPilotRecord>): CjPilotRecord =>
    baseRecord(input, {
      decision: "rejected",
      reason,
      flags,
      ...extra,
    });

  const early = precheckCjPilotCandidate(input);
  if (early) return reject(early);

  const deliveryDays = parseDeliveryMaxDays(input.estimatedDeliveryTime);
  if (deliveryDays != null && deliveryDays > MAX_DELIVERY_DAYS) {
    return reject("slow_delivery");
  }
  if (input.shippingMinor == null) {
    return reject("shipping_unavailable_to_ireland_test_dest");
  }

  const landedCostMinor =
    (input.supplierPriceMinor ?? 0) + input.shippingMinor + (input.feesMinor ?? 0);
  const priced = proposeRetailFromLanded(landedCostMinor);
  if (!priced.meetsMarginTarget) {
    return reject("weak_margin", {
      estimated_landed_cost_minor: landedCostMinor,
      proposed_retail_price_minor: priced.proposedRetailMinor,
      projected_gross_profit_minor: priced.grossProfitMinor,
      projected_gross_margin: priced.grossMargin,
    });
  }
  if (!priced.meetsLandedShareTarget) {
    flags.push("landed_share_above_50_percent_but_margin_ok");
  }

  return baseRecord(input, {
    decision: "accepted",
    reason: `meets_pilot_rules_margin_${Math.round(priced.grossMargin * 100)}`,
    flags,
    estimated_landed_cost_minor: priced.landedCostMinor,
    proposed_retail_price_minor: priced.proposedRetailMinor,
    projected_gross_profit_minor: priced.grossProfitMinor,
    projected_gross_margin: priced.grossMargin,
  });
}

function baseRecord(
  input: EvaluatorInput,
  extra: Partial<CjPilotRecord> & { decision: CjPilotRecord["decision"]; reason: string; flags: string[] }
): CjPilotRecord {
  const landed =
    extra.estimated_landed_cost_minor ??
    (input.supplierPriceMinor != null && input.shippingMinor != null
      ? input.supplierPriceMinor + input.shippingMinor + (input.feesMinor ?? 0)
      : null);
  return {
    cj_product_id: input.cjProductId,
    cj_variant_id: input.cjVariantId,
    sku: input.sku,
    title: input.title.trim(),
    category: input.category,
    image_urls: input.imageUrls,
    supplier_price_minor: input.supplierPriceMinor,
    estimated_shipping_minor: input.shippingMinor,
    estimated_fees_minor: input.feesMinor ?? 0,
    estimated_landed_cost_minor: landed,
    proposed_retail_price_minor: extra.proposed_retail_price_minor ?? null,
    projected_gross_profit_minor: extra.projected_gross_profit_minor ?? null,
    projected_gross_margin: extra.projected_gross_margin ?? null,
    currency: "USD",
    stock: input.stock,
    processing_time: input.processingTime,
    estimated_delivery_time: input.estimatedDeliveryTime,
    source_warehouse_country: input.sourceWarehouseCountry,
    product_url: input.productUrl,
    decision: extra.decision,
    reason: extra.reason,
    flags: extra.flags,
    provider: "cj",
    pilot_batch: "CJ_PILOT_100_V1",
  };
}

export function summarizeCjPilotRecords(records: readonly CjPilotRecord[]) {
  const accepted = records.filter((row) => row.decision === "accepted");
  const rejected = records.filter((row) => row.decision === "rejected");
  const avg = (values: number[]) =>
    values.length ? values.reduce((sum, n) => sum + n, 0) / values.length : null;

  const reasonCounts = new Map<string, number>();
  for (const row of rejected) {
    reasonCounts.set(row.reason, (reasonCounts.get(row.reason) ?? 0) + 1);
  }

  return {
    candidates_fetched: records.length,
    products_accepted: accepted.length,
    products_rejected: rejected.length,
    average_landed_cost_minor: avg(
      accepted
        .map((row) => row.estimated_landed_cost_minor)
        .filter((n): n is number => n != null)
    ),
    average_retail_price_minor: avg(
      accepted
        .map((row) => row.proposed_retail_price_minor)
        .filter((n): n is number => n != null)
    ),
    average_gross_margin: avg(
      accepted
        .map((row) => row.projected_gross_margin)
        .filter((n): n is number => n != null)
    ),
    top_10_best_margin_accepted: [...accepted]
      .sort((a, b) => (b.projected_gross_margin ?? 0) - (a.projected_gross_margin ?? 0))
      .slice(0, 10)
      .map((row) => ({
        title: row.title,
        category: row.category,
        projected_gross_margin: row.projected_gross_margin ?? 0,
        proposed_retail_price_minor: row.proposed_retail_price_minor ?? 0,
        estimated_landed_cost_minor: row.estimated_landed_cost_minor ?? 0,
      })),
    worst_rejection_reasons: [...reasonCounts.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
  };
}
