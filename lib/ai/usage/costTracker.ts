/**
 * Independent Cost Tracker — estimates cost from token metrics + rates.
 * In-memory Foundation only (no billing side effects in V1).
 */

import type { AiUsageCostStatus } from "./trackingTypes";

export type AiCostEstimateInput = {
  estimatedInputTokens: number | null | undefined;
  estimatedOutputTokens: number | null | undefined;
  /** Provider-reported or prior cost in minor currency units. */
  reportedCostMinor?: number | null;
  costCurrency?: string | null;
  costStatus?: AiUsageCostStatus | null;
  inputCostPer1M?: number | null;
  outputCostPer1M?: number | null;
};

export type AiCostEstimate = {
  estimatedCostMinor: number | null;
  costCurrency: string | null;
  costStatus: AiUsageCostStatus;
};

function tokensToMinorUsd(
  tokens: number,
  usdPer1M: number
): number {
  // Store as micro-USD integer-ish: USD * 10_000 (minor with 4dp) would be unusual;
  // existing platform uses costMinor as provider-reported cents-like integer.
  // Use 1/100 of a USD cent? Existing stub uses 0. Keep USD * 10000 as "minor"
  // when estimating from per-1M rates: (tokens / 1e6) * rate * 10000 ≈ tenths of cents.
  // Prefer: costMinor = round((tokens/1e6) * usdPer1M * 100) → cents.
  return Math.round((tokens / 1_000_000) * usdPer1M * 100);
}

export class AiCostTracker {
  /**
   * Deterministic cost resolution.
   * - Prefer provider-reported / explicit cost when present.
   * - Else estimate from rates when tokens + rates available.
   * - Zero rates → zero cost.
   * - Otherwise unavailable (fail-open on metrics, never invent numbers).
   */
  estimate(input: AiCostEstimateInput): AiCostEstimate {
    const currency = input.costCurrency?.trim() || "USD";

    if (
      input.reportedCostMinor != null &&
      Number.isFinite(input.reportedCostMinor)
    ) {
      if (input.reportedCostMinor === 0) {
        return {
          estimatedCostMinor: 0,
          costCurrency: currency,
          costStatus: input.costStatus === "provider_reported"
            ? "provider_reported"
            : "zero",
        };
      }
      return {
        estimatedCostMinor: input.reportedCostMinor,
        costCurrency: currency,
        costStatus: input.costStatus ?? "provider_reported",
      };
    }

    const inTok = input.estimatedInputTokens;
    const outTok = input.estimatedOutputTokens;
    const inRate = input.inputCostPer1M;
    const outRate = input.outputCostPer1M;

    const hasTokens =
      (inTok != null && Number.isFinite(inTok)) ||
      (outTok != null && Number.isFinite(outTok));
    const hasRates =
      (inRate != null && Number.isFinite(inRate)) ||
      (outRate != null && Number.isFinite(outRate));

    if (!hasTokens) {
      return {
        estimatedCostMinor: null,
        costCurrency: null,
        costStatus: "unavailable",
      };
    }

    if (hasRates) {
      const inCost =
        inTok != null && inRate != null
          ? tokensToMinorUsd(inTok, inRate)
          : 0;
      const outCost =
        outTok != null && outRate != null
          ? tokensToMinorUsd(outTok, outRate)
          : 0;
      const total = inCost + outCost;
      return {
        estimatedCostMinor: total,
        costCurrency: currency,
        costStatus: total === 0 ? "zero" : "estimated",
      };
    }

    // Tokens present but no rates and no reported cost.
    if (inRate === 0 && outRate === 0) {
      return {
        estimatedCostMinor: 0,
        costCurrency: currency,
        costStatus: "zero",
      };
    }

    return {
      estimatedCostMinor: null,
      costCurrency: null,
      costStatus: "unavailable",
    };
  }
}

export const aiCostTracker = new AiCostTracker();
