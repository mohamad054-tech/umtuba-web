import { describe, expect, it } from "vitest";
import {
  applyResolutionToCandidateProduct,
  classifyInputFailure,
} from "./syncErrorResolution";
import { readProductionCandidateFile } from "./productionCandidateFile";

describe("CJ 8 sync-error resolution", () => {
  it("classifies prior live flags", () => {
    expect(classifyInputFailure(["live_product_query_failed"])).toBe(
      "product_query_failure"
    );
    expect(classifyInputFailure(["live_freight_or_price_missing"])).toBe(
      "freight_missing"
    );
  });

  it("marks unresolved rows held/inactive without substituting the 59", () => {
    const catalog = readProductionCandidateFile();
    expect(catalog).not.toBeNull();
    expect(catalog!.products).toHaveLength(59);
    const first = catalog!.products[0];
    const updated = applyResolutionToCandidateProduct(first, {
      slug: first.customer.slug,
      title: first.customer.title,
      category: first.customer.category,
      sku: first.identity.sku,
      input_flags: first.flags,
      input_kind: "product_query_failure",
      resolved: false,
      failure_kind: "product_query_failure",
      live: {
        cj_product_id: first.identity.cj_product_id,
        sync_status: "SYNC_ERROR",
        live_verified: false,
        provider_available: false,
        stock: null,
        supplier_price_minor: null,
        shipping_minor: null,
        fees_minor: 0,
        landed_cost_minor: null,
        retail_price_minor: first.customer.retail_price_minor,
        gross_profit_minor: null,
        gross_margin: null,
        estimated_delivery_time: null,
        flags: ["unresolved_sync_error"],
      },
      replacement_candidates: [],
    });
    expect(updated.identity.cj_product_id).toBe(first.identity.cj_product_id);
    expect(updated.customer.availability_label).toBe("Unavailable");
    expect(updated.flags).toContain("held_inactive");
    expect(updated.featured_eligible).toBe(false);
  });
});
