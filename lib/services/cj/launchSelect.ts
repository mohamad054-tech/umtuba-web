/**
 * Select the local launch assortment from Profit Gate V2 products.
 * Quality over count: never pad to 60. Diversity caps never rise to hit a target.
 */

import type { CjPilotCategory } from "./constants";
import {
  CATEGORY_LAUNCH_MAX,
  HERO_COUNT_TARGET,
  HERO_MAX,
  HERO_MIN,
  HERO_MIN_BREAK_EVEN_MINOR,
  HERO_MIN_NET_MINOR,
  LAUNCH_SELECTED_MAX,
  type LaunchClassification,
  type LaunchFamily,
} from "./launchAssumptions";
import { computeLaunchEconomics, type LaunchEconomics } from "./launchEconomics";
import {
  classifyLaunchFamily,
  familyCap,
  isFamilyBlockedFromLaunch,
} from "./launchFamilies";
import type { ProfitGateV2Product } from "./profitGate";

export type LaunchMixProduct = {
  cj_product_id: string;
  title: string;
  category: CjPilotCategory;
  image_urls: string[];
  v2_classification: ProfitGateV2Product["classification"];
  launch_classification: LaunchClassification;
  family: LaunchFamily;
  v2_score: number;
  profitability_score: number;
  currency: "USD";
  stock: number | null;
  estimated_delivery_time: string | null;
  delivery_days: number | null;
  provider: "cj";
  hold_reasons: string[];
  economics: LaunchEconomics;
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function demoPotential(title: string, family: LaunchFamily): number {
  const t = title.toLowerCase();
  let score = 40;
  if (
    /\b(holder|organizer|mold|brush|bowl|strainer|pad|lid|spatula|clamp|feeder)\b/.test(t)
  ) {
    score += 25;
  }
  if (family === "silicone_phone_case" || family === "cube_jewelry") score -= 15;
  if (family === "kitchen_gadget" || family === "car_organizer") score += 10;
  if (title.trim().split(/\s+/).length <= 10) score += 10;
  return Math.max(0, Math.min(100, score));
}

export function computeProfitabilityScore(
  product: ProfitGateV2Product,
  economics: LaunchEconomics,
  family: LaunchFamily
): number {
  const be = economics.break_even_ad_cost_minor ?? 0;
  const net = economics.estimated_net_profit_at_target_cpa_minor ?? 0;
  const breakEvenScore = clamp01((be - 200) / 1000) * 100;
  const netScore = clamp01((net - 100) / 600) * 100;
  const demo = demoPotential(product.title, family);
  const delivery =
    product.delivery_days == null ? 40 : clamp01((14 - product.delivery_days) / 13) * 100;
  const stock = product.stock == null ? 0 : clamp01((product.stock - 30) / 470) * 100;
  return (
    Math.round(
      (0.3 * breakEvenScore +
        0.2 * netScore +
        0.15 * product.score +
        0.15 * demo +
        0.1 * delivery +
        0.1 * stock) *
        10
    ) / 10
  );
}

function toLaunchRow(product: ProfitGateV2Product): LaunchMixProduct {
  const family = classifyLaunchFamily(product.title);
  const economics = computeLaunchEconomics({
    landedCostMinor: product.landed_cost_minor,
    retailMinor: product.proposed_retail_minor,
    grossProfitMinor: product.gross_profit_minor,
    grossMargin: product.gross_margin,
    title: product.title,
    family,
  });
  return {
    cj_product_id: product.cj_product_id,
    title: product.title,
    category: product.category,
    image_urls: product.image_urls,
    v2_classification: product.classification,
    launch_classification: "HOLD",
    family,
    v2_score: product.score,
    profitability_score: computeProfitabilityScore(product, economics, family),
    currency: "USD",
    stock: product.stock,
    estimated_delivery_time: product.estimated_delivery_time,
    delivery_days: product.delivery_days,
    provider: "cj",
    hold_reasons: [],
    economics,
  };
}

function launchEligible(row: LaunchMixProduct): string[] {
  const gaps: string[] = [];
  if (row.v2_classification === "REJECTED_V2") gaps.push("v2_rejected");
  if (row.v2_classification === "ORGANIC_ONLY") gaps.push("v2_organic_only");
  if (isFamilyBlockedFromLaunch(row.family)) gaps.push(`family_blocked_${row.family}`);
  if (!row.economics.supports_paid_ad_test) gaps.push("ad_contribution_too_thin");
  if (row.v2_classification !== "PAID_AD_READY") gaps.push("not_v2_paid_ad_ready");
  return gaps;
}

export function selectLaunchMix(products: readonly ProfitGateV2Product[]): LaunchMixProduct[] {
  const rows = products.map(toLaunchRow);
  const familyUsed = new Map<LaunchFamily, number>();
  const categoryUsed = new Map<CjPilotCategory, number>();
  const selectedIds = new Set<string>();

  const candidates = rows
    .filter((row) => launchEligible(row).length === 0)
    .sort((a, b) => b.profitability_score - a.profitability_score || b.v2_score - a.v2_score);

  for (const row of candidates) {
    if (selectedIds.size >= LAUNCH_SELECTED_MAX) break;
    const familyCount = familyUsed.get(row.family) ?? 0;
    if (familyCount >= familyCap(row.family)) {
      row.hold_reasons.push(`diversity_cap_${row.family}`);
      continue;
    }
    const categoryCount = categoryUsed.get(row.category) ?? 0;
    if (categoryCount >= CATEGORY_LAUNCH_MAX) {
      row.hold_reasons.push("category_diversity_cap");
      continue;
    }
    selectedIds.add(row.cj_product_id);
    familyUsed.set(row.family, familyCount + 1);
    categoryUsed.set(row.category, categoryCount + 1);
  }

  const selected = rows
    .filter((row) => selectedIds.has(row.cj_product_id))
    .sort((a, b) => b.profitability_score - a.profitability_score);

  const heroEligible = selected.filter(
    (row) =>
      (row.economics.break_even_ad_cost_minor ?? 0) >= HERO_MIN_BREAK_EVEN_MINOR &&
      (row.economics.estimated_net_profit_at_target_cpa_minor ?? 0) >= HERO_MIN_NET_MINOR
  );
  const heroTake =
    heroEligible.length >= HERO_MIN
      ? Math.min(HERO_MAX, Math.max(HERO_MIN, Math.min(HERO_COUNT_TARGET, heroEligible.length)))
      : Math.min(HERO_MAX, heroEligible.length);
  const heroIds = new Set(heroEligible.slice(0, heroTake).map((row) => row.cj_product_id));

  for (const row of rows) {
    if (row.v2_classification === "ORGANIC_ONLY") {
      row.launch_classification = "ORGANIC_ONLY";
      row.hold_reasons = ["kept_v2_organic_only"];
      continue;
    }
    if (selectedIds.has(row.cj_product_id)) {
      row.launch_classification = heroIds.has(row.cj_product_id)
        ? "LAUNCH_HERO"
        : "LAUNCH_STANDARD";
      row.hold_reasons = [];
      continue;
    }
    const gaps = launchEligible(row);
    if (row.v2_classification === "PAID_AD_READY" && row.hold_reasons.length === 0) {
      row.hold_reasons = gaps.length ? gaps : ["not_selected_for_launch_mix"];
    } else if (gaps.length) {
      row.hold_reasons = [...new Set([...row.hold_reasons, ...gaps])];
    }
    if (
      row.v2_classification === "PAID_AD_READY" &&
      gaps.includes("ad_contribution_too_thin") &&
      (row.economics.gross_margin ?? 0) >= 0.35 &&
      (row.economics.gross_profit_minor ?? 0) >= 400
    ) {
      row.launch_classification = "ORGANIC_ONLY";
      row.hold_reasons.push("fails_paid_ad_contribution");
    } else {
      row.launch_classification = "HOLD";
    }
  }

  return rows.sort((a, b) => {
    const rank = (c: LaunchClassification) =>
      c === "LAUNCH_HERO" ? 0 : c === "LAUNCH_STANDARD" ? 1 : c === "ORGANIC_ONLY" ? 2 : 3;
    return rank(a.launch_classification) - rank(b.launch_classification) ||
      b.profitability_score - a.profitability_score;
  });
}

export function summarizeLaunchMix(products: readonly LaunchMixProduct[]) {
  const selected = products.filter(
    (row) =>
      row.launch_classification === "LAUNCH_HERO" ||
      row.launch_classification === "LAUNCH_STANDARD"
  );
  const hero = products.filter((row) => row.launch_classification === "LAUNCH_HERO");
  const standard = products.filter((row) => row.launch_classification === "LAUNCH_STANDARD");
  const organic = products.filter((row) => row.launch_classification === "ORGANIC_ONLY");
  const hold = products.filter((row) => row.launch_classification === "HOLD");
  const avg = (values: number[]) =>
    values.length ? values.reduce((sum, n) => sum + n, 0) / values.length : null;

  const categoryMix = {
    Home: 0,
    Pet: 0,
    Car: 0,
    Travel: 0,
    Beauty: 0,
  } as Record<CjPilotCategory, number>;
  for (const row of selected) {
    categoryMix[row.category] += 1;
  }

  const familyMix: Record<string, number> = {};
  for (const row of selected) {
    familyMix[row.family] = (familyMix[row.family] ?? 0) + 1;
  }

  return {
    candidates_input: products.length,
    launch_selected: selected.length,
    launch_hero: hero.length,
    launch_standard: standard.length,
    organic_only: organic.length,
    hold: hold.length,
    category_mix: categoryMix,
    family_mix: familyMix,
    avg_retail_minor: avg(selected.map((row) => row.economics.final_retail_price_minor ?? 0)),
    avg_landed_cost_minor: avg(selected.map((row) => row.economics.landed_cost_minor ?? 0)),
    avg_gross_margin: avg(selected.map((row) => row.economics.gross_margin ?? 0)),
    avg_break_even_ad_cost_minor: avg(
      selected.map((row) => row.economics.break_even_ad_cost_minor ?? 0)
    ),
    avg_target_cpa_minor: avg(
      selected.map((row) => row.economics.recommended_target_cpa_minor ?? 0)
    ),
    avg_estimated_net_profit_minor: avg(
      selected.map((row) => row.economics.estimated_net_profit_at_target_cpa_minor ?? 0)
    ),
    top_20: selected.slice(0, 20).map((row) => ({
      title: row.title,
      category: row.category,
      family: row.family,
      launch_classification: row.launch_classification,
      profitability_score: row.profitability_score,
      final_retail_price_minor: row.economics.final_retail_price_minor ?? 0,
      landed_cost_minor: row.economics.landed_cost_minor ?? 0,
      gross_profit_minor: row.economics.gross_profit_minor ?? 0,
      gross_margin: row.economics.gross_margin ?? 0,
      break_even_ad_cost_minor: row.economics.break_even_ad_cost_minor ?? 0,
      recommended_target_cpa_minor: row.economics.recommended_target_cpa_minor ?? 0,
      estimated_net_profit_at_target_cpa_minor:
        row.economics.estimated_net_profit_at_target_cpa_minor ?? 0,
    })),
  };
}
