import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PRECOMPANY_FOUNDATION_MIGRATION } from "../../partners/types";
import {
  FORBIDDEN_BRAND_RECORD,
  MOCK_STORE_CATALOG,
  mockAffiliateProvider,
  mockDenyCatalogProvider,
  mockWholesaleProvider,
} from "./mockFixtures";
import { importStoreCatalog } from "./importPipeline";
import { canBecomeProductionPurchasable, mockItemDisplaySafe } from "./mockIsolation";
import { buildStoreProvenance } from "./provenance";
import {
  createStoreProviderRegistry,
  disableStoreProvider,
  listStoreCapabilityMatrix,
  registerStoreProvider,
  removeStoreProvider,
} from "./registry";
import {
  evaluateStoreCheckoutGate,
  evaluateStoreImagePublishGate,
  evaluateStoreQaCatalogGate,
  evaluateStoreRight,
  revokeStoreRight,
} from "./rights";
import { STORE_OPERATIONAL_OWNERS, STORE_PROVIDER_MODES, STORE_PROVIDER_RIGHTS } from "./types";

const ROOT = process.cwd();
const MIGRATION = `supabase/migrations/${PRECOMPANY_FOUNDATION_MIGRATION}`;

describe("Store provider foundation V2 — contracts", () => {
  it("exposes modes, rights, and operational ownership", () => {
    expect([...STORE_PROVIDER_MODES]).toEqual([
      "AFFILIATE",
      "CATALOG_API",
      "DROPSHIP",
      "WHOLESALE",
      "RESELLER",
      "MARKETPLACE",
    ]);
    expect([...STORE_PROVIDER_RIGHTS]).toEqual([
      "CATALOG_DISPLAY_ALLOWED",
      "IMAGE_USAGE_ALLOWED",
      "PRICE_SYNC_ALLOWED",
      "INVENTORY_SYNC_ALLOWED",
      "CHECKOUT_ALLOWED",
      "RESELL_ALLOWED",
    ]);
    expect([...STORE_OPERATIONAL_OWNERS]).toEqual([
      "PAYMENT_OWNER",
      "FULFILLMENT_OWNER",
      "RETURNS_OWNER",
      "CUSTOMER_SUPPORT_OWNER",
    ]);
  });

  it("ships the local pre-company migration", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    const sql = readFileSync(join(ROOT, MIGRATION), "utf8");
    expect(sql).toMatch(/create table if not exists public\.commerce_providers/);
    expect(sql).toMatch(/CATALOG_DISPLAY_ALLOWED/);
    expect(sql).toMatch(/force row level security/);
    expect(sql).not.toMatch(/api_key|client_secret|password\s+text/i);
  });
});

describe("Store catalog import", () => {
  it("normalizes mock catalog, maps SKUs/variants, and stamps provenance", () => {
    const provider = mockAffiliateProvider();
    const run = importStoreCatalog({
      runId: "run-store-1",
      provider,
      records: MOCK_STORE_CATALOG,
      at: "2026-08-18T08:00:00.000Z",
    });
    expect(run.rejected).toEqual([]);
    expect(run.accepted).toHaveLength(2);
    expect(run.mappings.length).toBeGreaterThanOrEqual(3);
    const tote = run.accepted[0];
    expect(tote.providerId).toBe(provider.id);
    expect(tote.externalId).toBe("mock-tote-01");
    expect(tote.rightsRecordId).toBe(provider.rights.id);
    expect(tote.provenance.syncVersion).toBe(1);
    expect(tote.currency).toBe("USD");
    expect(tote.variants).toHaveLength(2);
    expect(tote.sku).toContain("mock-tote");
    const isolation = buildStoreProvenance({
      provider,
      externalId: tote.externalId,
      syncVersion: 1,
      importedAt: tote.provenance.importedAt,
      lastSyncedAt: tote.lastSyncedAt,
    });
    expect(isolation.rightsRecordId).toBe(provider.rights.id);
  });

  it("rejects unauthorized third-party brand tokens", () => {
    const run = importStoreCatalog({
      runId: "run-forbidden",
      provider: mockAffiliateProvider(),
      records: [FORBIDDEN_BRAND_RECORD],
      at: "2026-08-18T08:00:00.000Z",
    });
    expect(run.accepted).toHaveLength(0);
    expect(run.rejected[0]?.code).toBe("FORBIDDEN_THIRD_PARTY_BRAND");
  });
});

describe("Store rights and mock isolation", () => {
  it("denies catalog publish when CATALOG_DISPLAY_ALLOWED is unknown", () => {
    const provider = mockDenyCatalogProvider();
    const run = importStoreCatalog({
      runId: "run-deny",
      provider,
      records: MOCK_STORE_CATALOG.slice(0, 1),
      at: "2026-08-18T08:00:00.000Z",
    });
    const decision = evaluateStoreQaCatalogGate({ provider, item: run.accepted[0] });
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      expect(decision.right).toBe("CATALOG_DISPLAY_ALLOWED");
    }
  });

  it("denies image publish without IMAGE_USAGE_ALLOWED", () => {
    const provider = mockWholesaleProvider();
    expect(evaluateStoreRight(provider, "IMAGE_USAGE_ALLOWED").allowed).toBe(false);
    const run = importStoreCatalog({
      runId: "run-img",
      provider,
      records: MOCK_STORE_CATALOG.slice(0, 1),
      at: "2026-08-18T08:00:00.000Z",
    });
    const image = evaluateStoreImagePublishGate({ provider, item: run.accepted[0] });
    expect(image.allowed).toBe(false);
    expect(run.accepted[0].images.every((img) => img.publishable === false)).toBe(true);
  });

  it("keeps MOCK items non-purchasable and display-safe", () => {
    const provider = mockAffiliateProvider();
    const run = importStoreCatalog({
      runId: "run-mock",
      provider,
      records: MOCK_STORE_CATALOG,
      at: "2026-08-18T08:00:00.000Z",
    });
    expect(canBecomeProductionPurchasable({ dataClass: "MOCK_DATA" })).toBe(false);
    expect(evaluateStoreCheckoutGate({ provider, item: run.accepted[0] }).allowed).toBe(false);
    expect(mockItemDisplaySafe(run.accepted[0]).ok).toBe(true);
  });

  it("unpublishes on disable/remove without dropping import audit", () => {
    const registry = createStoreProviderRegistry();
    let provider = mockAffiliateProvider();
    expect(registerStoreProvider(registry, provider).ok).toBe(true);
    expect(listStoreCapabilityMatrix(provider).rights.id).toBe(provider.rights.id);
    provider = disableStoreProvider(provider, "2026-08-18T09:00:00.000Z");
    expect(provider.status).toBe("DISABLED");
    expect(evaluateStoreRight(provider, "CATALOG_DISPLAY_ALLOWED").allowed).toBe(false);
    provider = removeStoreProvider(provider, "2026-08-18T10:00:00.000Z");
    expect(provider.status).toBe("REMOVED");
    const revoked = revokeStoreRight(provider.rights, "CATALOG_DISPLAY_ALLOWED", "2026-08-18T10:00:00.000Z");
    expect(revoked.grants.CATALOG_DISPLAY_ALLOWED).toBe(false);
  });
});
