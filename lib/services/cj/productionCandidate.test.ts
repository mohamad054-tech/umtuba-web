import { describe, expect, it } from "vitest";
import { readApprovedDraftFile } from "./launchDraftFile";
import { customerPayloadLeaksInternals } from "./launchDraft";
import {
  buildProductionCandidateFile,
  isCustomerVisibleLaunchProduct,
  partitionLaunchCatalog,
} from "./productionCandidate";
import { readProductionCandidateFile } from "./productionCandidateFile";
import { toCustomerCatalogItem } from "./launchStoreAdapter";

describe("CJ production candidate", () => {
  const approved = readApprovedDraftFile();

  it("keeps exactly the 59 approved products as unpublished drafts", () => {
    expect(approved).not.toBeNull();
    const catalog = buildProductionCandidateFile(approved!);
    expect(catalog.summary.approved_products).toBe(59);
    expect(catalog.summary.hero_products).toBe(15);
    expect(catalog.summary.standard_products).toBe(44);
    expect(catalog.summary.substituted).toBe(false);
    expect(catalog.publication.live_store_published).toBe(false);
    expect(catalog.publication.fulfillment_enabled).toBe(false);
    expect(catalog.live_audit.status).toBe("PENDING_KEY_ROTATION");
    expect(catalog.products.every((row) => row.live_verified === false)).toBe(true);
    expect(catalog.products.every((row) => row.store_status === "draft")).toBe(true);
    expect(new Set(catalog.products.map((row) => row.identity.cj_product_id)).size).toBe(59);
  });

  it("hides live SYNC_ERROR rows from the customer catalog without substituting", () => {
    const live = readProductionCandidateFile();
    expect(live).not.toBeNull();
    const { visible, hidden } = partitionLaunchCatalog(live!.products);
    expect(live!.summary.last_known_healthy).toBe(59);
    expect(live!.summary.last_known_sync_error).toBe(0);
    expect(visible).toHaveLength(59);
    expect(hidden).toHaveLength(0);
    expect(visible.every((row) => row.sync_status === "HEALTHY")).toBe(true);
    expect(new Set(live!.products.map((row) => row.identity.cj_product_id)).size).toBe(59);
    expect(isCustomerVisibleLaunchProduct({ sync_status: "SYNC_ERROR" })).toBe(false);
    expect(isCustomerVisibleLaunchProduct({ sync_status: "OUT_OF_STOCK" })).toBe(false);
    expect(isCustomerVisibleLaunchProduct({ sync_status: "PROVIDER_UNAVAILABLE" })).toBe(
      false
    );
    const syntheticHidden = partitionLaunchCatalog([
      live!.products[0],
      { ...live!.products[0], sync_status: "SYNC_ERROR" as const },
    ]);
    expect(syntheticHidden.visible).toHaveLength(1);
    expect(syntheticHidden.hidden).toHaveLength(1);
    expect(toCustomerCatalogItem(syntheticHidden.hidden[0]).available).toBe(0);
    const customerBlob = JSON.stringify(visible.map((row) => row.customer)).toLowerCase();
    expect(customerBlob).not.toContain("landed_cost");
    expect(customerBlob).not.toContain("gross_margin");
    expect(customerBlob).not.toContain("cj_product_id");
    expect(customerBlob).not.toContain("sync_error");
  });

  it("does not leak internals on the customer payload or catalog item", () => {
    const catalog = buildProductionCandidateFile(approved!);
    for (const row of catalog.products) {
      expect(customerPayloadLeaksInternals(row.customer)).toEqual([]);
      const item = toCustomerCatalogItem({
        customer: row.customer,
        economics: row.economics,
      });
      const blob = JSON.stringify(item).toLowerCase();
      expect(blob).not.toContain("landed_cost");
      expect(blob).not.toContain("gross_margin");
      expect(blob).not.toContain("cj_product_id");
      expect(blob).not.toContain("target_cpa");
    }
  });
});
