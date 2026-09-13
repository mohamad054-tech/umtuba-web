import { describe, expect, it } from "vitest";
import { FAMILY_LAUNCH_CAPS } from "./launchAssumptions";
import { classifyLaunchFamily } from "./launchFamilies";
import { selectLaunchMix, summarizeLaunchMix } from "./launchSelect";
import type { ProfitGateV2Product } from "./profitGate";

function paid(overrides: Partial<ProfitGateV2Product> & { title: string; cj_product_id: string }): ProfitGateV2Product {
  return {
    cj_variant_id: null,
    sku: null,
    category: "Home",
    image_urls: ["https://cf.cjdropshipping.com/demo/x.jpg"],
    classification: "PAID_AD_READY",
    score: 70,
    score_breakdown: {
      margin: 70,
      profit: 70,
      delivery: 70,
      stock: 70,
      simplicity: 70,
      visual: 70,
      landed: 70,
    },
    currency: "USD",
    supplier_price_minor: 400,
    shipping_minor: 200,
    fees_minor: 0,
    landed_cost_minor: 600,
    proposed_retail_minor: 1699,
    gross_profit_minor: 1099,
    gross_margin: 0.65,
    landed_share_of_retail: 0.35,
    stock: 200,
    estimated_delivery_time: "6-9",
    delivery_days: 9,
    reasons: ["meets_paid_ad_floors"],
    flags: [],
    provider: "cj",
    source_batch: "CJ_PILOT_100_V1",
    v1_decision: "accepted",
    v1_retail_minor: 999,
    product_url: null,
    ...overrides,
  };
}

describe("launch mix selection", () => {
  it("caps near-identical silicone phone cases and cube jewelry", () => {
    const products = [
      ...Array.from({ length: 8 }, (_, i) =>
        paid({
          cj_product_id: `CASE-${i}`,
          title: `Pure Color Simple Advanced Silicone Phone Case ${i}`,
          category: "Home",
        })
      ),
      ...Array.from({ length: 6 }, (_, i) =>
        paid({
          cj_product_id: `JEW-${i}`,
          title: `Pearl Cube Crystal Zircon Earrings ${i}`,
          category: "Travel",
        })
      ),
      paid({
        cj_product_id: "SPATULA",
        title: "Silicone kitchen spatula",
        category: "Home",
      }),
    ];
    const mix = selectLaunchMix(products);
    const selected = mix.filter(
      (row) =>
        row.launch_classification === "LAUNCH_HERO" ||
        row.launch_classification === "LAUNCH_STANDARD"
    );
    expect(selected.filter((row) => row.family === "silicone_phone_case").length).toBeLessThanOrEqual(
      FAMILY_LAUNCH_CAPS.silicone_phone_case
    );
    expect(selected.filter((row) => row.family === "cube_jewelry").length).toBeLessThanOrEqual(
      FAMILY_LAUNCH_CAPS.cube_jewelry
    );
    expect(selected.some((row) => row.cj_product_id === "SPATULA")).toBe(true);
  });

  it("keeps V2 ORGANIC_ONLY and HOLDs REJECTED_V2", () => {
    const mix = selectLaunchMix([
      paid({
        cj_product_id: "ORG",
        title: "Kitchen cutter chopper",
        classification: "ORGANIC_ONLY",
        proposed_retail_minor: 3599,
        landed_cost_minor: 2334,
        gross_profit_minor: 1265,
        gross_margin: 0.35,
        delivery_days: 19,
      }),
      paid({
        cj_product_id: "REJ",
        title: "Heavy branded sofa",
        classification: "REJECTED_V2",
        landed_cost_minor: null,
        proposed_retail_minor: null,
        gross_profit_minor: null,
        gross_margin: null,
      }),
    ]);
    expect(mix.find((row) => row.cj_product_id === "ORG")?.launch_classification).toBe(
      "ORGANIC_ONLY"
    );
    expect(mix.find((row) => row.cj_product_id === "REJ")?.launch_classification).toBe("HOLD");
  });

  it("does not pad the mix when few products truly qualify", () => {
    const mix = selectLaunchMix([
      paid({ cj_product_id: "A", title: "Silicone kitchen spatula" }),
      paid({
        cj_product_id: "B",
        title: "Lithium wireless charger car phone holder",
      }),
    ]);
    const summary = summarizeLaunchMix(mix);
    expect(summary.launch_selected).toBeLessThan(60);
    expect(summary.launch_selected).toBe(1);
    expect(classifyLaunchFamily("Lithium wireless charger car phone holder")).toBe(
      "electric_or_restricted"
    );
    expect(classifyLaunchFamily("Sweet Colorful Cube Sugar Earrings")).toBe("cube_jewelry");
    expect(classifyLaunchFamily("Bamboo Toothbrush Wooden Handle")).toBe("personal_care_brush");
  });
});
