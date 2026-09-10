/**
 * Classify a CJ candidate into PAID_AD_READY / ORGANIC_ONLY / REJECTED_V2.
 * Paid and organic are mutually exclusive. Rules are never weakened to hit a count.
 */

import { EXCLUSION_PATTERNS, SIZE_MATRIX_RE } from "./constants";
import { parseDeliveryMaxDays } from "./evaluator";
import {
  MIN_STOCK_HEALTHY,
  ORGANIC_MAX_DELIVERY_DAYS,
  PAID_MAX_DELIVERY_DAYS,
  V1_HARD_REJECT_REASONS,
  V2_TITLE_EXCLUSIONS,
  type ProfitGateCandidate,
  type ProfitGateV2Product,
} from "./profitGate";
import {
  organicPricePassesMoneyGates,
  paidPricePassesMoneyGates,
  proposeOrganicRetail,
  proposePaidAdRetail,
  type ProfitProposedPrice,
} from "./profitPricing";
import { computeProfitScore } from "./profitScore";
import type { CjPilotRecord } from "./types";

function titleBlob(candidate: ProfitGateCandidate): string {
  return `${candidate.title} ${candidate.variantKey ?? ""} ${candidate.sku ?? ""}`;
}

function hasComplicatedSizing(candidate: ProfitGateCandidate): boolean {
  const key = `${candidate.variantKey ?? ""} ${candidate.title}`;
  const sizeHits = key.match(new RegExp(SIZE_MATRIX_RE.source, "gi")) ?? [];
  return sizeHits.length >= 3 || /\b(shoe size|eu size|us size|dress size)\b/i.test(key);
}

function hardRejectReasons(candidate: ProfitGateCandidate): string[] {
  const reasons: string[] = [];
  if (!candidate.cjProductId) reasons.push("missing_cj_product_id");
  if (!candidate.title.trim()) reasons.push("missing_title");
  if (!candidate.imageUrls.length) reasons.push("missing_images");

  if (candidate.v1Reason && V1_HARD_REJECT_REASONS.has(candidate.v1Reason)) {
    reasons.push(candidate.v1Reason);
  }

  const blob = titleBlob(candidate);
  for (const rule of EXCLUSION_PATTERNS) {
    if (rule.re.test(blob)) reasons.push(rule.reason);
  }
  for (const rule of V2_TITLE_EXCLUSIONS) {
    if (rule.re.test(blob)) reasons.push(rule.reason);
  }
  if (hasComplicatedSizing(candidate)) reasons.push("complicated_sizing");
  if (candidate.stock == null || candidate.stock < MIN_STOCK_HEALTHY) {
    reasons.push("poor_inventory");
  }
  if (candidate.supplierPriceMinor == null || candidate.supplierPriceMinor <= 0) {
    reasons.push("missing_supplier_price");
  }
  if (candidate.landedCostMinor == null || candidate.landedCostMinor <= 0) {
    if (candidate.shippingMinor == null) {
      reasons.push("shipping_unavailable_to_ireland_test_dest");
    } else {
      reasons.push("missing_landed_cost");
    }
  }

  return [...new Set(reasons)];
}

function paidEligibilityGaps(
  candidate: ProfitGateCandidate,
  price: ProfitProposedPrice,
  deliveryDays: number | null
): string[] {
  const gaps: string[] = [];
  if (!paidPricePassesMoneyGates(price)) {
    if (!price.meetsMarginFloor) gaps.push("paid_margin_below_45");
    if (!price.meetsProfitFloor) gaps.push("paid_profit_below_8");
    if (!price.meetsLandedShareFloor) gaps.push("paid_landed_share_above_55");
    if (price.unrealisticRetail) gaps.push("unrealistic_retail_for_paid_ads");
  }
  if (deliveryDays == null) gaps.push("delivery_unknown");
  else if (deliveryDays > PAID_MAX_DELIVERY_DAYS) gaps.push("paid_delivery_over_12_days");
  if (/\b(t-?shirt|hoodie|dress|jeans|sneaker|shoes?\b|socks?)\b/i.test(titleBlob(candidate))) {
    gaps.push("paid_return_risk_apparel");
  }
  return gaps;
}

function organicEligibilityGaps(
  price: ProfitProposedPrice,
  deliveryDays: number | null
): string[] {
  const gaps: string[] = [];
  if (!organicPricePassesMoneyGates(price)) {
    if (!price.meetsMarginFloor) gaps.push("organic_margin_below_35");
    if (!price.meetsProfitFloor) gaps.push("organic_profit_below_4");
    if (price.unrealisticRetail) gaps.push("unrealistic_retail_for_organic");
  }
  if (deliveryDays != null && deliveryDays > ORGANIC_MAX_DELIVERY_DAYS) {
    gaps.push("organic_delivery_over_21_days");
  }
  return gaps;
}

function attachPrice(
  product: ProfitGateV2Product,
  price: ProfitProposedPrice | null
): ProfitGateV2Product {
  if (!price) return product;
  return {
    ...product,
    proposed_retail_minor: price.proposedRetailMinor,
    gross_profit_minor: price.grossProfitMinor,
    gross_margin: price.grossMargin,
    landed_share_of_retail: price.landedShareOfRetail,
    flags: [...new Set([...product.flags, ...price.flags])],
  };
}

export function candidateFromPilotRecord(
  record: CjPilotRecord,
  sourceBatch: ProfitGateV2Product["source_batch"] = "CJ_PILOT_100_V1"
): ProfitGateCandidate {
  const landed =
    record.estimated_landed_cost_minor ??
    (record.supplier_price_minor != null && record.estimated_shipping_minor != null
      ? record.supplier_price_minor +
        record.estimated_shipping_minor +
        (record.estimated_fees_minor ?? 0)
      : null);
  return {
    cjProductId: record.cj_product_id,
    cjVariantId: record.cj_variant_id,
    sku: record.sku,
    title: record.title,
    category: record.category,
    imageUrls: record.image_urls,
    supplierPriceMinor: record.supplier_price_minor,
    shippingMinor: record.estimated_shipping_minor,
    feesMinor: record.estimated_fees_minor ?? 0,
    landedCostMinor: landed,
    stock: record.stock,
    estimatedDeliveryTime: record.estimated_delivery_time,
    productUrl: record.product_url,
    v1Decision: record.decision,
    v1Reason: record.reason,
    v1RetailMinor: record.proposed_retail_price_minor,
    sourceBatch,
  };
}

export function evaluateProfitGateV2(candidate: ProfitGateCandidate): ProfitGateV2Product {
  const deliveryDays = parseDeliveryMaxDays(candidate.estimatedDeliveryTime);
  const hard = hardRejectReasons(candidate);
  const flags = ["v2_retail_recalculated", "market_competitiveness_unverified"];

  const base: ProfitGateV2Product = {
    cj_product_id: candidate.cjProductId,
    cj_variant_id: candidate.cjVariantId ?? null,
    sku: candidate.sku ?? null,
    title: candidate.title.trim(),
    category: candidate.category,
    image_urls: candidate.imageUrls,
    classification: "REJECTED_V2",
    score: 0,
    score_breakdown: {
      margin: 0,
      profit: 0,
      delivery: 0,
      stock: 0,
      simplicity: 0,
      visual: 0,
      landed: 0,
    },
    currency: "USD",
    supplier_price_minor: candidate.supplierPriceMinor,
    shipping_minor: candidate.shippingMinor,
    fees_minor: candidate.feesMinor,
    landed_cost_minor: candidate.landedCostMinor,
    proposed_retail_minor: null,
    gross_profit_minor: null,
    gross_margin: null,
    landed_share_of_retail: null,
    stock: candidate.stock,
    estimated_delivery_time: candidate.estimatedDeliveryTime,
    delivery_days: deliveryDays,
    reasons: hard,
    flags,
    provider: "cj",
    source_batch: candidate.sourceBatch,
    v1_decision: candidate.v1Decision ?? null,
    v1_retail_minor: candidate.v1RetailMinor ?? null,
    product_url: candidate.productUrl ?? null,
  };

  if (hard.length) {
    const scored = computeProfitScore({
      grossMargin: null,
      grossProfitMinor: null,
      deliveryDays,
      stock: candidate.stock,
      title: candidate.title,
      imageCount: candidate.imageUrls.length,
      landedShareOfRetail: null,
      variantKey: candidate.variantKey,
    });
    return { ...base, score: scored.score, score_breakdown: scored.breakdown };
  }

  const landed = candidate.landedCostMinor as number;
  const paidPrice = proposePaidAdRetail(landed);
  const organicPrice = proposeOrganicRetail(landed);
  const paidGaps = paidEligibilityGaps(candidate, paidPrice, deliveryDays);
  const organicGaps = organicEligibilityGaps(organicPrice, deliveryDays);

  if (paidGaps.length === 0) {
    const priced = attachPrice(base, paidPrice);
    const scored = computeProfitScore({
      grossMargin: paidPrice.grossMargin,
      grossProfitMinor: paidPrice.grossProfitMinor,
      deliveryDays,
      stock: candidate.stock,
      title: candidate.title,
      imageCount: candidate.imageUrls.length,
      landedShareOfRetail: paidPrice.landedShareOfRetail,
      variantKey: candidate.variantKey,
    });
    return {
      ...priced,
      classification: "PAID_AD_READY",
      reasons: ["meets_paid_ad_floors"],
      score: scored.score,
      score_breakdown: scored.breakdown,
    };
  }

  if (organicGaps.length === 0) {
    const priced = attachPrice(base, organicPrice);
    const scored = computeProfitScore({
      grossMargin: organicPrice.grossMargin,
      grossProfitMinor: organicPrice.grossProfitMinor,
      deliveryDays,
      stock: candidate.stock,
      title: candidate.title,
      imageCount: candidate.imageUrls.length,
      landedShareOfRetail: organicPrice.landedShareOfRetail,
      variantKey: candidate.variantKey,
    });
    return {
      ...priced,
      classification: "ORGANIC_ONLY",
      reasons: ["meets_organic_floors_only", ...paidGaps],
      flags: [...priced.flags, "ORGANIC_ONLY"],
      score: scored.score,
      score_breakdown: scored.breakdown,
    };
  }

  const fallback = attachPrice(base, organicPrice.unrealisticRetail ? paidPrice : organicPrice);
  const scored = computeProfitScore({
    grossMargin: fallback.gross_margin,
    grossProfitMinor: fallback.gross_profit_minor,
    deliveryDays,
    stock: candidate.stock,
    title: candidate.title,
    imageCount: candidate.imageUrls.length,
    landedShareOfRetail: fallback.landed_share_of_retail,
    variantKey: candidate.variantKey,
  });
  return {
    ...fallback,
    classification: "REJECTED_V2",
    reasons: [...paidGaps, ...organicGaps],
    score: scored.score,
    score_breakdown: scored.breakdown,
  };
}

export function evaluateProfitGateRecords(
  records: readonly CjPilotRecord[],
  sourceBatch: ProfitGateV2Product["source_batch"] = "CJ_PILOT_100_V1"
): ProfitGateV2Product[] {
  return records.map((row) =>
    evaluateProfitGateV2(candidateFromPilotRecord(row, sourceBatch))
  );
}

export function mergeUniqueV2Products(
  existing: readonly ProfitGateV2Product[],
  incoming: readonly ProfitGateV2Product[]
): ProfitGateV2Product[] {
  const seen = new Set(existing.map((row) => row.cj_product_id));
  const merged = [...existing];
  for (const row of incoming) {
    if (seen.has(row.cj_product_id)) continue;
    seen.add(row.cj_product_id);
    merged.push(row);
  }
  return merged;
}

export function summarizeProfitGateV2(products: readonly ProfitGateV2Product[]) {
  const paid = products.filter((row) => row.classification === "PAID_AD_READY");
  const organic = products.filter((row) => row.classification === "ORGANIC_ONLY");
  const rejected = products.filter((row) => row.classification === "REJECTED_V2");
  const avg = (values: number[]) =>
    values.length ? values.reduce((sum, n) => sum + n, 0) / values.length : null;

  const reasonCounts = new Map<string, number>();
  for (const row of rejected) {
    for (const reason of row.reasons) {
      reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
    }
  }

  const strong = [...paid, ...organic].sort((a, b) => b.score - a.score);

  return {
    candidates_evaluated: products.length,
    paid_ad_ready: paid.length,
    organic_only: organic.length,
    rejected_v2: rejected.length,
    strong_count: paid.length + organic.length,
    avg_margin_paid_ad_ready: avg(paid.map((row) => row.gross_margin ?? 0)),
    avg_gross_profit_paid_ad_ready_minor: avg(
      paid.map((row) => row.gross_profit_minor ?? 0)
    ),
    avg_delivery_days_paid_ad_ready: avg(
      paid.map((row) => row.delivery_days).filter((n): n is number => n != null)
    ),
    top_20: strong.slice(0, 20).map((row) => ({
      title: row.title,
      category: row.category,
      classification: row.classification,
      score: row.score,
      proposed_retail_minor: row.proposed_retail_minor ?? 0,
      landed_cost_minor: row.landed_cost_minor ?? 0,
      gross_profit_minor: row.gross_profit_minor ?? 0,
      gross_margin: row.gross_margin ?? 0,
    })),
    rejection_reasons: [...reasonCounts.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12),
  };
}
