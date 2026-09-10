import { describe, expect, it } from "vitest";
import {
  ORGANIC_MIN_GROSS_MARGIN,
  ORGANIC_MIN_GROSS_PROFIT_MINOR,
  PAID_MAX_LANDED_SHARE,
  PAID_MIN_GROSS_MARGIN,
  PAID_MIN_GROSS_PROFIT_MINOR,
} from "./profitGate";
import {
  organicPricePassesMoneyGates,
  paidPricePassesMoneyGates,
  proposeOrganicRetail,
  proposePaidAdRetail,
} from "./profitPricing";

describe("profit gate V2 pricing", () => {
  it("recalculates paid retail to hit 45% margin, $8 profit, and 55% landed share", () => {
    const priced = proposePaidAdRetail(1047);
    expect(priced.lane).toBe("paid");
    expect(priced.proposedRetailMinor % 100 === 49 || priced.proposedRetailMinor % 100 === 99 || priced.proposedRetailMinor % 100 === 0).toBe(true);
    expect(priced.grossMargin + 1e-9).toBeGreaterThanOrEqual(PAID_MIN_GROSS_MARGIN);
    expect(priced.grossProfitMinor).toBeGreaterThanOrEqual(PAID_MIN_GROSS_PROFIT_MINOR);
    expect(priced.landedShareOfRetail).toBeLessThanOrEqual(PAID_MAX_LANDED_SHARE + 1e-9);
    expect(priced.grossProfitMinor).toBe(priced.proposedRetailMinor - 1047);
    expect(paidPricePassesMoneyGates(priced)).toBe(true);
  });

  it("prefers $10 gross profit when that stays under the impulse cap", () => {
    const priced = proposePaidAdRetail(600);
    expect(priced.grossProfitMinor).toBeGreaterThanOrEqual(1000);
    expect(priced.prefersTenDollarProfit).toBe(true);
    expect(priced.unrealisticRetail).toBe(false);
  });

  it("flags an unrealistic paid retail instead of inventing a sellable price", () => {
    const priced = proposePaidAdRetail(5000);
    expect(priced.unrealisticRetail).toBe(true);
    expect(paidPricePassesMoneyGates(priced)).toBe(false);
  });

  it("keeps organic floors at 35% and $4 and does not use the paid lane", () => {
    const priced = proposeOrganicRetail(1047);
    expect(priced.lane).toBe("organic");
    expect(priced.grossMargin + 1e-9).toBeGreaterThanOrEqual(ORGANIC_MIN_GROSS_MARGIN);
    expect(priced.grossProfitMinor).toBeGreaterThanOrEqual(ORGANIC_MIN_GROSS_PROFIT_MINOR);
    expect(priced.proposedRetailMinor).toBeLessThan(proposePaidAdRetail(1047).proposedRetailMinor);
    expect(organicPricePassesMoneyGates(priced)).toBe(true);
    expect(paidPricePassesMoneyGates(priced)).toBe(false);
  });
});
