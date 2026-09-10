import { describe, expect, it } from "vitest";
import { readLaunchMixFile } from "./launchCatalogFile";
import { buildApprovedDraftFile } from "./launchDraftFile";
import {
  APPROVED_HERO_COUNT,
  APPROVED_LAUNCH_COUNT,
  APPROVED_STANDARD_COUNT,
  CJ_STORE_LAUNCH_BATCH,
  customerPayloadLeaksInternals,
} from "./launchDraft";
import { createCjLaunchReadSyncPlan } from "./launchSync";
import { toCustomerCatalogItem } from "./launchStoreAdapter";
import { readProfitGateV2File } from "./profitCatalogFile";

describe("CJ 59 draft integration", () => {
  const mix = readLaunchMixFile();
  const v2 = readProfitGateV2File();

  it("maps exactly the owner-approved 59 hero+standard products as drafts", () => {
    expect(mix).not.toBeNull();
    const catalog = buildApprovedDraftFile(mix!, v2);
    expect(catalog.summary.approved_products).toBe(APPROVED_LAUNCH_COUNT);
    expect(catalog.summary.hero_products).toBe(APPROVED_HERO_COUNT);
    expect(catalog.summary.standard_products).toBe(APPROVED_STANDARD_COUNT);
    expect(catalog.summary.substituted).toBe(false);
    expect(catalog.summary.padded).toBe(false);
    expect(catalog.products).toHaveLength(59);
    expect(new Set(catalog.products.map((row) => row.identity.cj_product_id)).size).toBe(59);

    for (const row of catalog.products) {
      expect(row.identity.provider).toBe("cj");
      expect(row.identity.pilot_batch).toBe(CJ_STORE_LAUNCH_BATCH);
      expect(row.identity.cj_product_id.length).toBeGreaterThan(0);
      expect(row.store_status).toBe("draft");
      expect(row.customer.active).toBe(false);
      expect(row.customer.status).toBe("draft");
      expect(row.published_at).toBeNull();
      expect(row.marketplace_eligible).toBe(false);
    }
  });

  it("keeps internals off the customer payload and catalog item", () => {
    const catalog = buildApprovedDraftFile(mix!, v2);
    for (const row of catalog.products) {
      expect(customerPayloadLeaksInternals(row.customer)).toEqual([]);
      const item = toCustomerCatalogItem(row);
      const blob = JSON.stringify(item).toLowerCase();
      expect(blob).not.toContain("landed_cost");
      expect(blob).not.toContain("gross_margin");
      expect(blob).not.toContain("profitability_score");
      expect(blob).not.toContain("cj_product_id");
      expect(item.product.status).toBe("draft");
      expect(item.product.published_at).toBeNull();
      expect(row.customer.id.includes(row.identity.cj_product_id)).toBe(false);
      expect(row.customer.slug.includes(row.identity.cj_product_id)).toBe(false);
      expect(JSON.stringify(row.customer)).not.toContain(row.identity.cj_product_id);
    }
  });

  it("covers the five customer categories and keeps sync read-only", () => {
    const catalog = buildApprovedDraftFile(mix!, v2);
    const mixCounts = catalog.summary.category_mix;
    expect(Object.values(mixCounts).reduce((sum, n) => sum + n, 0)).toBe(59);
    expect(mixCounts.Home + mixCounts.Pet + mixCounts.Car + mixCounts.Travel + mixCounts["Beauty / Personal"]).toBe(59);
    const plan = createCjLaunchReadSyncPlan();
    expect(plan.write_calls_enabled).toBe(false);
    expect(plan.order_calls_enabled).toBe(false);
    expect(plan.endpoints).toEqual(
      expect.arrayContaining(["/v1/product/query", "/v1/logistic/freightCalculate"])
    );
    expect(plan.endpoints.some((path) => path.includes("shopping"))).toBe(false);
  });
});
