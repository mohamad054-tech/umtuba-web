import { describe, expect, it } from "vitest";
import { PAYMENT_FEE_LABEL } from "./launchAssumptions";
import {
  assumedPaymentFeeMinor,
  computeLaunchEconomics,
} from "./launchEconomics";

describe("launch mix economics", () => {
  it("uses the labeled 2.9% + $0.30 placeholder, not a live processor rate", () => {
    expect(assumedPaymentFeeMinor(1599)).toBe(Math.round((1599 * 29) / 1000) + 30);
    const priced = computeLaunchEconomics({
      landedCostMinor: 542,
      retailMinor: 1599,
      grossProfitMinor: 1057,
      grossMargin: 0.66,
      title: "Silicone kitchen spatula",
      family: "kitchen_gadget",
    });
    expect(priced.payment_fee_label).toBe(PAYMENT_FEE_LABEL);
    expect(priced.estimated_payment_fee_minor).toBe(assumedPaymentFeeMinor(1599));
    expect(priced.returns_risk_class).toBe("low");
    expect(priced.returns_risk_reserve_minor).toBe(Math.round(1599 * 0.03));
    expect(priced.break_even_ad_cost_minor).toBe(
      1057 - (priced.estimated_payment_fee_minor ?? 0) - (priced.returns_risk_reserve_minor ?? 0)
    );
    expect(priced.recommended_target_cpa_minor).toBe(
      Math.round((priced.break_even_ad_cost_minor ?? 0) * 0.55)
    );
    expect(priced.estimated_net_profit_at_target_cpa_minor).toBe(
      (priced.break_even_ad_cost_minor ?? 0) - (priced.recommended_target_cpa_minor ?? 0)
    );
    expect(priced.supports_paid_ad_test).toBe(true);
  });

  it("does not treat high margin as ad-ready when absolute contribution is thin", () => {
    const priced = computeLaunchEconomics({
      landedCostMinor: 200,
      retailMinor: 449,
      grossProfitMinor: 249,
      grossMargin: 0.55,
      title: "Tiny trinket",
      family: "useful_accessory",
    });
    expect(priced.gross_margin ?? 0).toBeGreaterThan(0.45);
    expect(priced.supports_paid_ad_test).toBe(false);
    expect(priced.break_even_ad_cost_minor ?? 0).toBeLessThan(400);
  });
});
