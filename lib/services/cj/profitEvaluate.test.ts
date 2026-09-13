import { describe, expect, it } from "vitest";
import { evaluateProfitGateV2 } from "./profitEvaluate";
import type { ProfitGateCandidate } from "./profitGate";

function candidate(overrides: Partial<ProfitGateCandidate> = {}): ProfitGateCandidate {
  return {
    cjProductId: "PID-HOME-1",
    cjVariantId: "VID-1",
    sku: "CJSILICONE-01",
    title: "Silicone kitchen spatula",
    category: "Home",
    imageUrls: ["https://cf.cjdropshipping.com/demo/spatula.jpg"],
    supplierPriceMinor: 400,
    shippingMinor: 250,
    feesMinor: 0,
    landedCostMinor: 650,
    stock: 120,
    estimatedDeliveryTime: "7-11",
    sourceBatch: "CJ_PILOT_100_V1",
    v1Decision: "accepted",
    v1Reason: "meets_pilot_rules_margin_32",
    v1RetailMinor: 999,
    ...overrides,
  };
}

describe("profit gate V2 classification", () => {
  it("classifies a simple in-stock Ireland-shippable item as PAID_AD_READY after repricing", () => {
    const row = evaluateProfitGateV2(candidate());
    expect(row.classification).toBe("PAID_AD_READY");
    expect(row.provider).toBe("cj");
    expect(row.gross_margin ?? 0).toBeGreaterThanOrEqual(0.45);
    expect(row.gross_profit_minor ?? 0).toBeGreaterThanOrEqual(800);
    expect(row.proposed_retail_minor).not.toBe(999);
    expect(row.reasons).toContain("meets_paid_ad_floors");
  });

  it("marks ORGANIC_ONLY when delivery is too slow for paid ads but money still clears 35%/$4", () => {
    const row = evaluateProfitGateV2(
      candidate({ estimatedDeliveryTime: "14-16", cjProductId: "PID-SLOW" })
    );
    expect(row.classification).toBe("ORGANIC_ONLY");
    expect(row.flags).toContain("ORGANIC_ONLY");
    expect(row.gross_margin ?? 0).toBeGreaterThanOrEqual(0.35);
    expect(row.gross_profit_minor ?? 0).toBeGreaterThanOrEqual(400);
    expect(row.reasons).toContain("paid_delivery_over_12_days");
    expect(row.reasons).toContain("meets_organic_floors_only");
  });

  it("does not mix a paid product into ORGANIC_ONLY", () => {
    const paid = evaluateProfitGateV2(candidate());
    const organic = evaluateProfitGateV2(
      candidate({ estimatedDeliveryTime: "14-16", cjProductId: "PID-ORG" })
    );
    expect(paid.classification).toBe("PAID_AD_READY");
    expect(organic.classification).toBe("ORGANIC_ONLY");
    expect(paid.classification).not.toBe(organic.classification);
  });

  it("rejects branded, battery, sizing, and low-stock items without weakening floors", () => {
    expect(evaluateProfitGateV2(candidate({ title: "Nike replica bag" })).classification).toBe(
      "REJECTED_V2"
    );
    expect(
      evaluateProfitGateV2(candidate({ title: "Lithium power bank" })).reasons
    ).toContain("batteries_or_restricted");
    expect(
      evaluateProfitGateV2(
        candidate({
          title: "Travel tee XS S M L XL XXL",
          variantKey: "XS-S-M-L-XL",
        })
      ).reasons
    ).toContain("complicated_sizing");
    expect(evaluateProfitGateV2(candidate({ stock: 8 })).reasons).toContain("poor_inventory");
    expect(
      evaluateProfitGateV2(candidate({ shippingMinor: null, landedCostMinor: null })).reasons
    ).toContain("shipping_unavailable_to_ireland_test_dest");
  });

  it("does not reopen a V1 hard reject just by raising retail", () => {
    const row = evaluateProfitGateV2(
      candidate({
        v1Decision: "rejected",
        v1Reason: "batteries_or_restricted",
        title: "USB desk lamp",
      })
    );
    expect(row.classification).toBe("REJECTED_V2");
    expect(row.reasons).toContain("batteries_or_restricted");
  });
});
