import { describe, expect, it } from "vitest";
import { routeStoreCheckout } from "./checkoutRouting";
import { importStoreCatalog } from "./importPipeline";
import { MOCK_STORE_CATALOG, mockAffiliateProvider, mockDenyCatalogProvider } from "./mockFixtures";
import { createStoreProviderRegistry, registerStoreProvider } from "./registry";
import {
  evaluateStoreImagePublishGate,
  evaluateStorePublishGate,
  evaluateStoreQaCatalogGate,
} from "./rights";
import { buildMockCatalogSurface, recheckStoreCheckout } from "./runtimeGates";

describe("Mock Store E2E", () => {
  it("runs mock provider → import → normalize → rights → catalog → PDP → checkout routing", () => {
    const registry = createStoreProviderRegistry();
    const provider = mockAffiliateProvider();
    expect(registerStoreProvider(registry, provider).ok).toBe(true);

    const imported = importStoreCatalog({
      runId: "e2e-store",
      provider,
      records: MOCK_STORE_CATALOG,
      at: "2026-08-18T08:00:00.000Z",
    });
    expect(imported.rejected).toEqual([]);
    expect(imported.accepted.every((item) => item.provenance.providerId === provider.id)).toBe(true);

    const surface = buildMockCatalogSurface(imported.accepted);
    expect(surface.items).toHaveLength(2);
    expect(surface.pdp[0].mockLabel).toMatch(/Mock Catalog/);
    expect(surface.pdp[0].purchasable).toBe(false);

    const qa = evaluateStoreQaCatalogGate({ provider, item: imported.accepted[0] });
    expect(qa.allowed).toBe(true);
    const publish = evaluateStorePublishGate({ provider, item: imported.accepted[0] });
    expect(publish.allowed).toBe(false);

    const checkout = recheckStoreCheckout(provider, imported.accepted[0]);
    expect(checkout.rights.allowed).toBe(false);
    const routed = routeStoreCheckout({ provider, item: imported.accepted[0] });
    expect(routed.mode).toBe("AFFILIATE");
    expect(routed.action).toBe("REDIRECT_EXTERNAL");
    expect(routed.allowed).toBe(false);
  });

  it("denies catalog publish when catalog rights are missing", () => {
    const provider = mockDenyCatalogProvider();
    const imported = importStoreCatalog({
      runId: "e2e-deny-catalog",
      provider,
      records: MOCK_STORE_CATALOG.slice(0, 1),
      at: "2026-08-18T08:00:00.000Z",
    });
    const publish = evaluateStoreQaCatalogGate({ provider, item: imported.accepted[0] });
    expect(publish.allowed).toBe(false);
    if (!publish.allowed) {
      expect(publish.right).toBe("CATALOG_DISPLAY_ALLOWED");
    }
  });

  it("denies image publish when image rights are missing", () => {
    const provider = mockDenyCatalogProvider();
    const imported = importStoreCatalog({
      runId: "e2e-deny-image",
      provider,
      records: MOCK_STORE_CATALOG.slice(0, 1),
      at: "2026-08-18T08:00:00.000Z",
    });
    const images = evaluateStoreImagePublishGate({ provider, item: imported.accepted[0] });
    expect(images.allowed).toBe(false);
  });
});
