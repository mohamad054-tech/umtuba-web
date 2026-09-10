import { describe, expect, it } from "vitest";
import { evaluateCjPilotCandidate, summarizeCjPilotRecords } from "./evaluator";
import type { EvaluatorInput } from "./evaluator";

function base(overrides: Partial<EvaluatorInput> = {}): EvaluatorInput {
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
    stock: 120,
    processingTime: "2-4",
    estimatedDeliveryTime: "7-12",
    sourceWarehouseCountry: "CN",
    productUrl: "https://cjdropshipping.com/product/PID-HOME-1.html",
    weightGrams: 120,
    lengthMm: 180,
    widthMm: 40,
    heightMm: 20,
    variantKey: "Red",
    logisticsProps: ["COMMON"],
    ...overrides,
  };
}

describe("cj pilot evaluator", () => {
  it("accepts a lightweight in-stock item that meets the margin rule", () => {
    const accepted = evaluateCjPilotCandidate(base());
    expect(accepted.decision).toBe("accepted");
    expect(accepted.provider).toBe("cj");
    expect(accepted.pilot_batch).toBe("CJ_PILOT_100_V1");
    expect(accepted.projected_gross_margin ?? 0).toBeGreaterThanOrEqual(0.3);
    expect(accepted.flags).toContain("market_competitiveness_unverified");
  });

  it("rejects branded, medical, heavy, low-stock, and unsellable-margin goods", () => {
    expect(evaluateCjPilotCandidate(base({ title: "Nike replica bag" })).reason).toBe(
      "counterfeit_or_branded"
    );
    expect(evaluateCjPilotCandidate(base({ title: "Vitamin C capsules" })).reason).toBe(
      "supplements"
    );
    expect(evaluateCjPilotCandidate(base({ weightGrams: 2500 })).reason).toBe(
      "heavy_or_bulky"
    );
    expect(evaluateCjPilotCandidate(base({ stock: 4 })).reason).toBe("poor_inventory");
    expect(evaluateCjPilotCandidate(base({ stock: 0, shippingMinor: 250 })).reason).toBe(
      "poor_inventory"
    );
    expect(evaluateCjPilotCandidate(base({ shippingMinor: null })).reason).toBe(
      "shipping_unavailable_to_ireland_test_dest"
    );
    expect(
      evaluateCjPilotCandidate(
        base({
          title: "Travel tee XS S M L XL XXL",
          variantKey: "XS-S-M-L-XL",
        })
      ).reason
    ).toBe("complicated_sizing");
  });

  it("summarizes accepted and rejected counts without inventing products", () => {
    const rows = [
      evaluateCjPilotCandidate(base()),
      evaluateCjPilotCandidate(base({ cjProductId: "PID-2", title: "CBD oil" })),
    ];
    const summary = summarizeCjPilotRecords(rows);
    expect(summary.candidates_fetched).toBe(2);
    expect(summary.products_accepted).toBe(1);
    expect(summary.products_rejected).toBe(1);
    expect(summary.worst_rejection_reasons[0]?.reason).toBe("supplements");
  });
});
