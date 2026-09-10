import { describe, expect, it } from "vitest";
import {
  computeLandedCostMinor,
  parseUsdToMinor,
  proposeRetailFromLanded,
  roundCleanRetailMinor,
} from "./pricing";

describe("cj pilot pricing", () => {
  it("parses range and numeric USD prices as the first amount", () => {
    expect(parseUsdToMinor("4.00-6.50")).toBe(400);
    expect(parseUsdToMinor(9.5)).toBe(950);
  });

  it("computes landed cost as supplier + shipping + fees", () => {
    expect(
      computeLandedCostMinor({
        supplierPriceMinor: 1000,
        shippingMinor: 450,
        feesMinor: 50,
      })
    ).toBe(1500);
  });

  it("never prices below the 30% margin floor and rounds cleanly", () => {
    expect(roundCleanRetailMinor(1429)).toBe(1499);
    expect(roundCleanRetailMinor(1500)).toBe(1500);
    expect(roundCleanRetailMinor(1501)).toBe(1599);
    expect(roundCleanRetailMinor(349)).toBe(349);

    const priced = proposeRetailFromLanded(1000);
    expect(priced.proposedRetailMinor).toBeGreaterThanOrEqual(Math.ceil(1000 / 0.7));
    expect(priced.meetsMarginTarget).toBe(true);
    expect(priced.grossProfitMinor).toBe(priced.proposedRetailMinor - 1000);
    expect(priced.grossMargin).toBeCloseTo(
      priced.grossProfitMinor / priced.proposedRetailMinor
    );
    expect(priced.marketCompetitiveness).toBe("unverified");
  });
});
