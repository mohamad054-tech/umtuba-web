import { describe, expect, it } from "vitest";
import { emptyDryRunCatalog } from "./pipeline";

describe("cj pilot dry-run catalog", () => {
  it("emits the isolated schema without fabricated imported products", () => {
    const catalog = emptyDryRunCatalog("2026-09-09T00:00:00.000Z");
    expect(catalog.task_id).toBe("UMTUBA_CJ_PILOT_100_PRODUCTS_LOCAL_V1");
    expect(catalog.provider).toBe("cj");
    expect(catalog.pilot_batch).toBe("CJ_PILOT_100_V1");
    expect(catalog.cj_api_connected).toBe(false);
    expect(catalog.dry_run).toBe(true);
    expect(catalog.products).toEqual([]);
    expect(catalog.summary.candidates_fetched).toBe(0);
    expect(catalog.ireland_test_destination).toMatchObject({
      countryCode: "IE",
      postcode: "D02",
    });
    expect(catalog.endpoints_used).toContain("/v1/product/listV2");
    expect(catalog.endpoints_used).toContain("/v1/logistic/freightCalculate");
  });
});
