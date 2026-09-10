/**
 * Price safety for the unpublished CJ Store candidate.
 * Never auto-lowers retail or publishes an unsafe price.
 */

export const PRICE_SAFETY_MIN_GROSS_MARGIN = 0.4;
export const PRICE_SAFETY_MIN_GROSS_PROFIT_MINOR = 800;

export type PriceSafetyInput = {
  retailMinor: number | null;
  landedCostMinor: number | null;
  grossProfitMinor?: number | null;
  grossMargin?: number | null;
};

export type PriceSafetyResult = {
  safe: boolean;
  reason: "ok" | "missing_economics" | "margin_below_40" | "profit_below_floor";
  gross_margin: number | null;
  gross_profit_minor: number | null;
};

export function evaluatePriceSafety(input: PriceSafetyInput): PriceSafetyResult {
  if (
    input.retailMinor == null ||
    input.retailMinor <= 0 ||
    input.landedCostMinor == null ||
    input.landedCostMinor < 0
  ) {
    return {
      safe: false,
      reason: "missing_economics",
      gross_margin: null,
      gross_profit_minor: null,
    };
  }

  const profit =
    input.grossProfitMinor ?? input.retailMinor - input.landedCostMinor;
  const margin = input.grossMargin ?? profit / input.retailMinor;

  if (margin + 1e-9 < PRICE_SAFETY_MIN_GROSS_MARGIN) {
    return {
      safe: false,
      reason: "margin_below_40",
      gross_margin: margin,
      gross_profit_minor: profit,
    };
  }
  if (profit < PRICE_SAFETY_MIN_GROSS_PROFIT_MINOR) {
    return {
      safe: false,
      reason: "profit_below_floor",
      gross_margin: margin,
      gross_profit_minor: profit,
    };
  }
  return {
    safe: true,
    reason: "ok",
    gross_margin: margin,
    gross_profit_minor: profit,
  };
}

/** If supplier/landed rose, keep current retail and flag — do not auto-repricing. */
export function reviewAfterSupplierLandedChange(input: {
  currentRetailMinor: number;
  newLandedCostMinor: number;
}): { action: "keep_retail"; safety: PriceSafetyResult } {
  return {
    action: "keep_retail",
    safety: evaluatePriceSafety({
      retailMinor: input.currentRetailMinor,
      landedCostMinor: input.newLandedCostMinor,
    }),
  };
}
