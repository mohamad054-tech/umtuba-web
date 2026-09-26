import { describe, expect, it } from "vitest";
import { DISCOUNT_PERCENTS, STORE_PRODUCTS, exactDiscountPrices } from "./banks";

describe("guess the discount", () => {
  it("makes the sale price an exact percent of the old price", () => {
    for (const product of STORE_PRODUCTS) {
      for (const pct of DISCOUNT_PERCENTS) {
        const { old, sale } = exactDiscountPrices(product.price, pct);
        expect(Number.isInteger(old)).toBe(true);
        expect(Number.isInteger(sale)).toBe(true);
        expect(sale).toBeGreaterThan(0);
        expect(sale).toBeLessThan(old);
        expect((old - sale) * 100).toBe(old * pct);
        expect(Math.abs(old - product.price)).toBeLessThanOrEqual(20);
      }
    }
  });
});
