/**
 * Profit Gate V2 ranking score (0–100).
 *
 * score =
 *   0.28 * marginScore +
 *   0.22 * profitScore +
 *   0.15 * deliveryScore +
 *   0.12 * stockScore +
 *   0.10 * simplicityScore +
 *   0.08 * visualScore +
 *   0.05 * landedScore
 *
 * Each component is 0–100. Used for ranking only — never for gating.
 *
 * - marginScore: 35% → 0, 65%+ → 100
 * - profitScore: $4 → 0, $20+ → 100
 * - deliveryScore: 1 day → 100, 14+ days → 0 (missing → 40)
 * - stockScore: 30 → 0, 500+ → 100
 * - simplicityScore: simple gadget 100; size hints 40; apparel 15
 * - visualScore: image count + short concrete title (ad-crop friendly)
 * - landedScore: landed share 55% → 0, 30% or below → 100
 */

import type { ProfitScoreBreakdown } from "./profitGate";

export const PROFIT_SCORE_WEIGHTS = {
  margin: 0.28,
  profit: 0.22,
  delivery: 0.15,
  stock: 0.12,
  simplicity: 0.1,
  visual: 0.08,
  landed: 0.05,
} as const satisfies Record<keyof ProfitScoreBreakdown, number>;

export const RANKING_FORMULA_DESCRIPTION =
  "score = 0.28*margin + 0.22*grossProfit + 0.15*deliverySpeed + 0.12*stockDepth + 0.10*simplicity + 0.08*visualAdPotential + 0.05*landedShare";

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function toScore(unit: number): number {
  return Math.round(clamp01(unit) * 1000) / 10;
}

const SIZE_HINT_RE = /\b(xxs|xs|s|m|l|xl|xxl|xxxl|2xl|3xl|size|eu\s?\d{2})\b/i;
const APPAREL_RE =
  /\b(t-?shirt|hoodie|dress|jeans|sneaker|shoes?\b|socks?|bra\b|underwear|leggings?)\b/i;

export type ScoreInput = {
  grossMargin: number | null;
  grossProfitMinor: number | null;
  deliveryDays: number | null;
  stock: number | null;
  title: string;
  imageCount: number;
  landedShareOfRetail: number | null;
  variantKey?: string | null;
};

export function scoreSimplicity(title: string, variantKey?: string | null): number {
  const blob = `${title} ${variantKey ?? ""}`;
  if (APPAREL_RE.test(blob)) return 15;
  const sizeHits = blob.match(new RegExp(SIZE_HINT_RE.source, "gi")) ?? [];
  if (sizeHits.length >= 2) return 40;
  if (SIZE_HINT_RE.test(blob)) return 70;
  return 100;
}

export function scoreVisualAdPotential(title: string, imageCount: number): number {
  const images = Math.max(0, Math.min(imageCount, 5));
  const words = title.trim().split(/\s+/).filter(Boolean).length;
  const shortTitle = words >= 2 && words <= 8 ? 30 : words <= 12 ? 15 : 0;
  return Math.min(100, 25 + images * 11 + shortTitle);
}

export function computeProfitScore(input: ScoreInput): {
  score: number;
  breakdown: ProfitScoreBreakdown;
} {
  const margin =
    input.grossMargin == null ? 0 : toScore((input.grossMargin - 0.35) / 0.3);
  const profit =
    input.grossProfitMinor == null ? 0 : toScore((input.grossProfitMinor - 400) / 1600);
  const delivery =
    input.deliveryDays == null ? 40 : toScore((14 - input.deliveryDays) / 13);
  const stock = input.stock == null ? 0 : toScore((input.stock - 30) / 470);
  const simplicity = scoreSimplicity(input.title, input.variantKey);
  const visual = scoreVisualAdPotential(input.title, input.imageCount);
  const landed =
    input.landedShareOfRetail == null
      ? 0
      : toScore((0.55 - input.landedShareOfRetail) / 0.25);

  const breakdown: ProfitScoreBreakdown = {
    margin,
    profit,
    delivery,
    stock,
    simplicity,
    visual,
    landed,
  };

  const score =
    PROFIT_SCORE_WEIGHTS.margin * breakdown.margin +
    PROFIT_SCORE_WEIGHTS.profit * breakdown.profit +
    PROFIT_SCORE_WEIGHTS.delivery * breakdown.delivery +
    PROFIT_SCORE_WEIGHTS.stock * breakdown.stock +
    PROFIT_SCORE_WEIGHTS.simplicity * breakdown.simplicity +
    PROFIT_SCORE_WEIGHTS.visual * breakdown.visual +
    PROFIT_SCORE_WEIGHTS.landed * breakdown.landed;

  return { score: Math.round(score * 10) / 10, breakdown };
}
