import { describe, expect, it } from "vitest";
import { computeProfitScore, PROFIT_SCORE_WEIGHTS } from "./profitScore";

describe("profit gate V2 score", () => {
  it("weights sum to 1.00", () => {
    const sum = Object.values(PROFIT_SCORE_WEIGHTS).reduce((acc, n) => acc + n, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it("ranks a high-margin fast-delivery item above a thin slow one", () => {
    const strong = computeProfitScore({
      grossMargin: 0.55,
      grossProfitMinor: 1200,
      deliveryDays: 7,
      stock: 400,
      title: "Silicone kitchen spatula",
      imageCount: 4,
      landedShareOfRetail: 0.45,
    });
    const weak = computeProfitScore({
      grossMargin: 0.36,
      grossProfitMinor: 420,
      deliveryDays: 18,
      stock: 35,
      title: "Generic item XS S M L XL",
      imageCount: 1,
      landedShareOfRetail: 0.64,
    });
    expect(strong.score).toBeGreaterThan(weak.score);
    expect(strong.breakdown.margin).toBeGreaterThan(weak.breakdown.margin);
    expect(strong.breakdown.delivery).toBeGreaterThan(weak.breakdown.delivery);
    expect(strong.breakdown.simplicity).toBeGreaterThan(weak.breakdown.simplicity);
  });
});
