/**
 * Launch-mix ad economics.
 *
 * payment_fee = round(retail * 2.9%) + $0.30   [ASSUMED_NOT_FINAL]
 * returns_risk_reserve = retail * risk_rate    [3% / 6% / 8%]
 * break_even_ad_cost = gross_profit - payment_fee - returns_risk_reserve
 * recommended_target_CPA = 55% of break-even
 * estimated_net_profit_at_target_CPA = break_even - target_CPA
 * estimated_net_margin_at_target_CPA = net_profit / retail
 *
 * High gross margin alone does NOT make a product launch-ready.
 */

import {
  ASSUMED_PAYMENT_FIXED_MINOR,
  ASSUMED_PAYMENT_PERCENT_BPS,
  MIN_BREAK_EVEN_FOR_LAUNCH_MINOR,
  MIN_NET_AT_TARGET_FOR_LAUNCH_MINOR,
  MIN_TARGET_CPA_FOR_LAUNCH_MINOR,
  PAYMENT_FEE_LABEL,
  RETURNS_RESERVE_RATE,
  TARGET_CPA_FRACTION,
  type ReturnsRiskClass,
} from "./launchAssumptions";

export type LaunchEconomics = {
  landed_cost_minor: number | null;
  final_retail_price_minor: number | null;
  gross_profit_minor: number | null;
  gross_margin: number | null;
  estimated_payment_fee_minor: number | null;
  payment_fee_label: typeof PAYMENT_FEE_LABEL;
  returns_risk_class: ReturnsRiskClass;
  returns_risk_reserve_minor: number | null;
  break_even_ad_cost_minor: number | null;
  recommended_target_cpa_minor: number | null;
  estimated_net_profit_at_target_cpa_minor: number | null;
  estimated_net_margin_at_target_cpa: number | null;
  supports_paid_ad_test: boolean;
};

export function assumedPaymentFeeMinor(retailMinor: number): number {
  return Math.round((retailMinor * ASSUMED_PAYMENT_PERCENT_BPS) / 1000) + ASSUMED_PAYMENT_FIXED_MINOR;
}

export function returnsReserveMinor(retailMinor: number, riskClass: ReturnsRiskClass): number {
  return Math.round(retailMinor * RETURNS_RESERVE_RATE[riskClass]);
}

export function classifyReturnsRisk(title: string, family: string): ReturnsRiskClass {
  const blob = `${title} ${family}`.toLowerCase();
  if (
    /\b(earrings?|necklace|pendant|bracelet|jewelry|apparel|shoe|dress)\b/.test(blob) ||
    family === "cube_jewelry" ||
    family === "other_jewelry"
  ) {
    return "high";
  }
  if (
    family === "silicone_phone_case" ||
    family === "makeup_brush_set" ||
    /\b(fashion|rhinestone|flip-flop)\b/.test(blob)
  ) {
    return "medium";
  }
  return "low";
}

export function computeLaunchEconomics(input: {
  landedCostMinor: number | null;
  retailMinor: number | null;
  grossProfitMinor: number | null;
  grossMargin: number | null;
  title: string;
  family: string;
}): LaunchEconomics {
  const risk = classifyReturnsRisk(input.title, input.family);
  if (
    input.retailMinor == null ||
    input.retailMinor <= 0 ||
    input.grossProfitMinor == null ||
    input.landedCostMinor == null
  ) {
    return {
      landed_cost_minor: input.landedCostMinor,
      final_retail_price_minor: input.retailMinor,
      gross_profit_minor: input.grossProfitMinor,
      gross_margin: input.grossMargin,
      estimated_payment_fee_minor: null,
      payment_fee_label: PAYMENT_FEE_LABEL,
      returns_risk_class: risk,
      returns_risk_reserve_minor: null,
      break_even_ad_cost_minor: null,
      recommended_target_cpa_minor: null,
      estimated_net_profit_at_target_cpa_minor: null,
      estimated_net_margin_at_target_cpa: null,
      supports_paid_ad_test: false,
    };
  }

  const payment = assumedPaymentFeeMinor(input.retailMinor);
  const reserve = returnsReserveMinor(input.retailMinor, risk);
  const breakEven = input.grossProfitMinor - payment - reserve;
  const targetCpa = Math.round(breakEven * TARGET_CPA_FRACTION);
  const net = breakEven - targetCpa;
  const netMargin = input.retailMinor > 0 ? net / input.retailMinor : null;
  const supports =
    breakEven >= MIN_BREAK_EVEN_FOR_LAUNCH_MINOR &&
    targetCpa >= MIN_TARGET_CPA_FOR_LAUNCH_MINOR &&
    net >= MIN_NET_AT_TARGET_FOR_LAUNCH_MINOR;

  return {
    landed_cost_minor: input.landedCostMinor,
    final_retail_price_minor: input.retailMinor,
    gross_profit_minor: input.grossProfitMinor,
    gross_margin: input.grossMargin,
    estimated_payment_fee_minor: payment,
    payment_fee_label: PAYMENT_FEE_LABEL,
    returns_risk_class: risk,
    returns_risk_reserve_minor: reserve,
    break_even_ad_cost_minor: breakEven,
    recommended_target_cpa_minor: targetCpa,
    estimated_net_profit_at_target_cpa_minor: net,
    estimated_net_margin_at_target_cpa: netMargin,
    supports_paid_ad_test: supports,
  };
}
