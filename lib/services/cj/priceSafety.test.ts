import { describe, expect, it } from "vitest";
import {
  evaluatePriceSafety,
  reviewAfterSupplierLandedChange,
} from "./priceSafety";

describe("CJ price safety", () => {
  it("keeps a 45% / $10 item healthy", () => {
    const result = evaluatePriceSafety({
      retailMinor: 2000,
      landedCostMinor: 1000,
    });
    expect(result.safe).toBe(true);
    expect(result.reason).toBe("ok");
  });

  it("flags margin under 40% without changing retail", () => {
    const result = evaluatePriceSafety({
      retailMinor: 2000,
      landedCostMinor: 1300,
    });
    expect(result.safe).toBe(false);
    expect(result.reason).toBe("margin_below_40");
    const reviewed = reviewAfterSupplierLandedChange({
      currentRetailMinor: 2000,
      newLandedCostMinor: 1300,
    });
    expect(reviewed.action).toBe("keep_retail");
    expect(reviewed.safety.safe).toBe(false);
  });

  it("flags profit below the $8 floor", () => {
    const result = evaluatePriceSafety({
      retailMinor: 1200,
      landedCostMinor: 500,
    });
    expect(result.gross_margin ?? 0).toBeGreaterThan(0.4);
    expect(result.safe).toBe(false);
    expect(result.reason).toBe("profit_below_floor");
  });
});
