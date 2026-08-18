import { describe, expect, it } from "vitest";
import { UMTUBA_STORE_CATEGORY_SLUGS } from "../categories/taxonomy";
import { routeStoreCheckout } from "./checkoutRouting";
import { importStoreCatalog } from "./importPipeline";
import { applyUmtubaCategoryMapping, MOCK_PROVIDER_A_CATALOG, mockNoResellProvider, mockProviderA } from "./mockProviderA";
import { mockDenyCatalogProvider, mockWholesaleProvider } from "./mockFixtures";
import { canBecomeProductionPurchasable } from "./mockIsolation";
import { createStoreProviderRegistry, registerStoreProvider } from "./registry";
import {
  evaluateStoreCheckoutGate,
  evaluateStoreImagePublishGate,
  evaluateStorePublishGate,
  evaluateStoreQaCatalogGate,
  evaluateStoreRight,
} from "./rights";
import { buildMockCatalogSurface } from "./runtimeGates";

describe("Mock provider A import", () => {
  it("imports 25 products, normalizes categories, and keeps them off production checkout", () => {
    const provider = mockProviderA();
    expect(registerStoreProvider(createStoreProviderRegistry(), provider).ok).toBe(true);
    expect(MOCK_PROVIDER_A_CATALOG).toHaveLength(25);

    const run = importStoreCatalog({
      runId: "mock-a-import",
      provider,
      records: MOCK_PROVIDER_A_CATALOG,
      at: "2026-08-18T12:00:00.000Z",
    });
    expect(run.rejected).toEqual([]);
    expect(run.accepted).toHaveLength(25);
    expect(run.accepted.every((item) => item.provenance.providerId === provider.id)).toBe(true);
    expect(run.accepted.every((item) => item.dataClass === "MOCK_DATA")).toBe(true);

    const mapped = applyUmtubaCategoryMapping(run.accepted);
    const slugs = new Set(mapped.map((item) => item.category));
    for (const slug of slugs) {
      expect(UMTUBA_STORE_CATEGORY_SLUGS.includes(slug as (typeof UMTUBA_STORE_CATEGORY_SLUGS)[number])).toBe(true);
    }
    expect(slugs.size).toBeGreaterThanOrEqual(8);

    expect(evaluateStoreQaCatalogGate({ provider, item: mapped[0] }).allowed).toBe(true);
    expect(evaluateStorePublishGate({ provider, item: mapped[0] }).allowed).toBe(false);
    expect(evaluateStoreCheckoutGate({ provider, item: mapped[0] }).allowed).toBe(false);
    expect(canBecomeProductionPurchasable({ dataClass: "MOCK_DATA" })).toBe(false);

    const surface = buildMockCatalogSurface(mapped);
    expect(surface.items).toHaveLength(25);
    expect(surface.pdp.every((pdp) => pdp.purchasable === false)).toBe(true);
  });
});

describe("Store negative rights", () => {
  it("denies NO_CATALOG_RIGHTS, NO_IMAGE_RIGHTS, and NO_RESELL_RIGHTS", () => {
    const noCatalog = mockDenyCatalogProvider();
    const catalogRun = importStoreCatalog({
      runId: "neg-catalog",
      provider: noCatalog,
      records: MOCK_PROVIDER_A_CATALOG.slice(0, 1),
      at: "2026-08-18T12:00:00.000Z",
    });
    const catalog = evaluateStoreQaCatalogGate({ provider: noCatalog, item: catalogRun.accepted[0] });
    expect(catalog.allowed).toBe(false);
    if (!catalog.allowed) expect(catalog.right).toBe("CATALOG_DISPLAY_ALLOWED");

    const noImage = mockWholesaleProvider();
    const imageRun = importStoreCatalog({
      runId: "neg-image",
      provider: noImage,
      records: MOCK_PROVIDER_A_CATALOG.slice(0, 1),
      at: "2026-08-18T12:00:00.000Z",
    });
    const images = evaluateStoreImagePublishGate({ provider: noImage, item: imageRun.accepted[0] });
    expect(images.allowed).toBe(false);
    if (!images.allowed) expect(images.right).toBe("IMAGE_USAGE_ALLOWED");

    const noResell = mockNoResellProvider();
    expect(evaluateStoreRight(noResell, "RESELL_ALLOWED").allowed).toBe(false);
    const resellRun = importStoreCatalog({
      runId: "neg-resell",
      provider: noResell,
      records: MOCK_PROVIDER_A_CATALOG.slice(0, 1),
      at: "2026-08-18T12:00:00.000Z",
    });
    const routed = routeStoreCheckout({ provider: noResell, item: resellRun.accepted[0] });
    expect(routed.mode).toBe("RESELLER");
    expect(routed.allowed).toBe(false);
    expect(routed.reason).toMatch(/RESELL_ALLOWED|MOCK_DATA|purchasable/i);
  });
});
