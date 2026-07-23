import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ADS_DELIVERY_ENABLED } from "./constants";
import {
  ADS_INVENTORY_BRIDGE_AUTHORITY,
  mapDeliverableRowsToInventoryBridge,
  type AdsDeliverableBridgeRow,
} from "./inventoryBridge";
import * as platform from "./platform";
import { ADS_CANDIDATE_SELECTION_CONTRACT_VERSION } from "./platform/candidateSelection";

vi.mock("server-only", () => ({}));

const loadAdsInventoryBridgeForAdvertiser = vi.hoisted(() => vi.fn());
const assertPlatformAdminDb = vi.hoisted(() => vi.fn());

vi.mock("./inventoryBridge", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./inventoryBridge")>();
  return {
    ...actual,
    loadAdsInventoryBridgeForAdvertiser,
  };
});

vi.mock("./adminAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./adminAuth")>();
  return {
    ...actual,
    assertPlatformAdminDb,
  };
});

import {
  ADS_DIAGNOSTIC_RUNNER_AUTHORITY,
  ADS_DIAGNOSTIC_RUNNER_CONTRACT_VERSION,
  buildDiagnosticCanonicalStackInput,
  isAdsDiagnosticCorrelationId,
  isAdsDiagnosticUuid,
  parseAdsDiagnosticRequestV1,
  scopeDiagnosticSelectionInventory,
} from "./diagnosticRunner";
import { executeAdsDiagnosticRunnerV1 } from "./diagnosticRunnerServer";
import * as adsIndex from "./index";

const ROOT = path.join(__dirname, "..", "..");
const RUNNER_SOURCE = readFileSync(
  path.join(__dirname, "diagnosticRunner.ts"),
  "utf8"
);
const SERVER_SOURCE = readFileSync(
  path.join(__dirname, "diagnosticRunnerServer.ts"),
  "utf8"
);
const INDEX_SOURCE = readFileSync(path.join(__dirname, "index.ts"), "utf8");
const PAGE_SOURCE = readFileSync(
  path.join(ROOT, "app/admin/ads/diagnostics/page.tsx"),
  "utf8"
);
const NOW = "2026-07-23T12:00:00.000Z";
const ADMIN_UUID = "11111111-1111-4111-8111-111111111111";
const ADVERTISER_UUID = "22222222-2222-4222-8222-222222222222";
const CAMPAIGN_UUID = "33333333-3333-4333-8333-333333333333";
const AD_SET_UUID = "44444444-4444-4444-8444-444444444444";
const AD_UUID = "55555555-5555-4555-8555-555555555555";
const CREATIVE_UUID = "66666666-6666-4666-8666-666666666666";

function bridgeRow(
  overrides: Partial<AdsDeliverableBridgeRow> = {}
): AdsDeliverableBridgeRow {
  return {
    adId: AD_UUID,
    adStatus: "approved",
    adSetId: AD_SET_UUID,
    adSetStatus: "approved",
    campaignId: CAMPAIGN_UUID,
    campaignStatus: "approved",
    advertiserAccountId: ADVERTISER_UUID,
    advertiserStatus: "approved",
    creativeId: CREATIVE_UUID,
    creativeStatus: "approved",
    creativeType: "video",
    placements: ["watch_feed"],
    countries: ["US"],
    languages: ["en"],
    devices: ["mobile"],
    ageMin: 18,
    startAt: "2026-07-01T00:00:00.000Z",
    endAt: "2026-08-01T00:00:00.000Z",
    dailyBudgetMinor: 10_000,
    totalBudgetMinor: 100_000,
    spentMinor: 0,
    createdAt: NOW,
    updatedAt: NOW,
    revision: 1,
    ...overrides,
  };
}

function validRequest(overrides: Record<string, unknown> = {}) {
  return {
    contractVersion: ADS_DIAGNOSTIC_RUNNER_CONTRACT_VERSION,
    advertiserAccountId: ADVERTISER_UUID,
    placement: "watch_feed",
    currentTimestamp: NOW,
    ...overrides,
  };
}

function mockAdminClient(userId: string = ADMIN_UUID) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
    from: vi.fn(() => {
      throw new Error("authorized runner must not query tables directly");
    }),
    rpc: vi.fn(() => {
      throw new Error("authorized runner must not call mutating RPCs");
    }),
  };
}

describe("Ads Diagnostic Runner authorization boundary", () => {
  beforeEach(() => {
    loadAdsInventoryBridgeForAdvertiser.mockReset();
    assertPlatformAdminDb.mockReset();
  });

  it("rejects non-admin DB authorization", async () => {
    assertPlatformAdminDb.mockResolvedValue(false);
    const outcome = await executeAdsDiagnosticRunnerV1(
      mockAdminClient() as never,
      { adminUserId: ADMIN_UUID, request: validRequest() }
    );
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.message).toMatch(/platform admins/i);
    expect(loadAdsInventoryBridgeForAdvertiser).not.toHaveBeenCalled();
  });

  it("rejects forged platformAdminVerified / gate fields in the request", async () => {
    assertPlatformAdminDb.mockResolvedValue(true);
    const forged = await executeAdsDiagnosticRunnerV1(
      mockAdminClient() as never,
      {
        adminUserId: ADMIN_UUID,
        request: {
          ...validRequest(),
          platformAdminVerified: true,
          gate: { platformAdminVerified: true },
        },
      }
    );
    expect(forged.ok).toBe(false);
    if (forged.ok) return;
    expect(forged.message).toMatch(/Forbidden|Unknown|platform/i);
    expect(loadAdsInventoryBridgeForAdvertiser).not.toHaveBeenCalled();
  });

  it("rejects session mismatch even if DB admin would pass", async () => {
    assertPlatformAdminDb.mockResolvedValue(true);
    const outcome = await executeAdsDiagnosticRunnerV1(
      mockAdminClient("99999999-9999-4999-8999-999999999999") as never,
      { adminUserId: ADMIN_UUID, request: validRequest() }
    );
    expect(outcome.ok).toBe(false);
    expect(assertPlatformAdminDb).not.toHaveBeenCalled();
    expect(loadAdsInventoryBridgeForAdvertiser).not.toHaveBeenCalled();
  });

  it("has no public gate constructor and does not flat-export execution", () => {
    expect(RUNNER_SOURCE).not.toMatch(/createAdsDiagnosticAdminGate/);
    expect(RUNNER_SOURCE).not.toMatch(/platformAdminVerified:\s*true as const/);
    expect(SERVER_SOURCE).toMatch(/assertPlatformAdminDb/);
    expect(SERVER_SOURCE).toMatch(/import "server-only"/);
    expect(INDEX_SOURCE).not.toMatch(
      /from ["'].*diagnosticRunnerServer["']/
    );
    expect(INDEX_SOURCE).not.toMatch(
      /export\s*\{[^}]*executeAdsDiagnosticRunnerV1/
    );
    expect(INDEX_SOURCE).not.toMatch(/createAdsDiagnosticAdminGate/);
    expect(INDEX_SOURCE).not.toMatch(/runAdsDiagnosticRunnerV1/);
    expect(adsIndex).not.toHaveProperty("executeAdsDiagnosticRunnerV1");
    expect(adsIndex).not.toHaveProperty("createAdsDiagnosticAdminGate");
    expect(adsIndex).not.toHaveProperty("runAdsDiagnosticRunnerV1");
    expect(PAGE_SOURCE).toMatch(/executeAdsDiagnosticRunnerV1/);
    expect(PAGE_SOURCE).toMatch(/diagnosticRunnerServer/);
    expect(PAGE_SOURCE).not.toMatch(/createAdsDiagnosticAdminGate/);
    expect(PAGE_SOURCE).not.toMatch(/runAdsDiagnosticRunnerV1/);
  });

  it("fails closed on malformed UUIDs and invalid correlation ids", () => {
    expect(isAdsDiagnosticUuid("not-a-uuid")).toBe(false);
    expect(isAdsDiagnosticUuid(ADVERTISER_UUID)).toBe(true);
    expect(isAdsDiagnosticCorrelationId("a".repeat(129))).toBe(false);
    expect(isAdsDiagnosticCorrelationId("bad id with spaces")).toBe(false);
    expect(isAdsDiagnosticCorrelationId("diag.ok_1:2-3")).toBe(true);

    expect(
      parseAdsDiagnosticRequestV1(
        validRequest({ advertiserAccountId: "bad" })
      ).ok
    ).toBe(false);
    expect(
      parseAdsDiagnosticRequestV1(validRequest({ campaignId: "bad" })).ok
    ).toBe(false);
    expect(
      parseAdsDiagnosticRequestV1(
        validRequest({ correlationId: "no spaces allowed" })
      ).ok
    ).toBe(false);
    expect(
      parseAdsDiagnosticRequestV1(validRequest({ candidateLimit: 0 })).ok
    ).toBe(false);
    expect(
      parseAdsDiagnosticRequestV1(validRequest({ candidateLimit: 65 })).ok
    ).toBe(false);
    expect(parseAdsDiagnosticRequestV1(validRequest({ evil: true })).ok).toBe(
      false
    );
  });

  it("executes for a valid admin without mutations and keeps kill switches closed", async () => {
    const mapped = mapDeliverableRowsToInventoryBridge({
      rows: [bridgeRow()],
      sourceId: "src-e2e",
      revision: 1,
      currentTimestamp: NOW,
    });
    expect(mapped.valid).toBe(true);
    if (!mapped.valid) return;

    assertPlatformAdminDb.mockResolvedValue(true);
    loadAdsInventoryBridgeForAdvertiser.mockResolvedValue({
      ok: true,
      result: mapped.result,
    });

    const supabase = mockAdminClient();
    const outcome = await executeAdsDiagnosticRunnerV1(supabase as never, {
      adminUserId: ADMIN_UUID,
      request: validRequest({ correlationId: "diag.e2e-1" }),
    });

    expect(assertPlatformAdminDb).toHaveBeenCalledTimes(1);
    expect(loadAdsInventoryBridgeForAdvertiser).toHaveBeenCalledTimes(1);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.report.inventorySource).toBe("inventory_bridge_v1");
    expect(outcome.report.decisionEngine).toBe("runAdsCanonicalStackV1");
    expect(outcome.report.productionAccepted).toBe(false);
    expect(outcome.report.deliveryEnabled).toBe(false);
    expect(outcome.report.billingEnabled).toBe(false);
    expect(outcome.report.mutatesDatabase).toBe(false);
    expect(outcome.report.triggersMeasurementIngestion).toBe(false);
    expect(outcome.report.triggersBilling).toBe(false);
    expect(outcome.report.rendersAds).toBe(false);
    expect(outcome.report.canonicalOutcomeValid).toBe(true);
    expect(outcome.report.deliveryGate).not.toBeNull();
    expect(outcome.report.deliveryGate?.passed).toBe(false);
    expect(outcome.report.provenance?.bindingTokenAuthoritative).toBe(false);
    expect(
      outcome.report.provenance?.bindingToken.length ?? 999
    ).toBeLessThanOrEqual(128);
    expect(outcome.report.provenance?.bindingToken.includes("|")).toBe(false);
    expect(outcome.report.loadedCandidates[0]?.provenanceFingerprint).toMatch(
      /^ap1:/
    );
    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});

describe("Ads Diagnostic Runner contracts", () => {
  it("scopes inventory from the bridge only and feeds canonical stack", () => {
    const mapped = mapDeliverableRowsToInventoryBridge({
      rows: [
        bridgeRow(),
        bridgeRow({
          adId: "77777777-7777-4777-8777-777777777777",
          placements: ["search_results"],
          creativeType: "image",
          creativeId: "88888888-8888-4888-8888-888888888888",
        }),
      ],
      sourceId: "src-1",
      revision: 1,
      currentTimestamp: NOW,
    });
    expect(mapped.valid).toBe(true);
    if (!mapped.valid) return;
    expect(
      mapped.result.selectionInventory.candidates[0]?.provenanceIdentity
        ?.provenanceFingerprint
    ).toMatch(/^ap1:/);

    const scoped = scopeDiagnosticSelectionInventory({
      bridge: mapped.result,
      placementId: "WATCH_FEED",
      campaignId: CAMPAIGN_UUID,
      adSetId: null,
      candidateLimit: 10,
      sourceId: "diag-src",
    });
    expect(scoped.contractVersion).toBe(ADS_CANDIDATE_SELECTION_CONTRACT_VERSION);
    expect(scoped.candidates).toHaveLength(1);

    const stackInput = buildDiagnosticCanonicalStackInput({
      inventory: scoped,
      placementId: "WATCH_FEED",
      correlationId: "diag-corr-1",
      currentTimestamp: NOW,
    });
    const outcome = platform.runAdsCanonicalStackV1(stackInput);
    if (!outcome.valid) {
      expect.fail(outcome.issues.join("; "));
    }
    expect(outcome.valid).toBe(true);
    expect(outcome.result.authoritativeDecisionPath).toBe(true);
    expect(outcome.result.productionAccepted).toBe(false);
    expect(outcome.result.deliveryEnabled).toBe(false);
    expect(outcome.result.billingEnabled).toBe(false);
    expect(outcome.result.provenance?.bindingToken.length).toBeLessThanOrEqual(
      128
    );
    expect(outcome.result.provenance?.domainPlacement).toBe("watch_feed");
  });

  it("keeps authority flags closed and source exclusivity intact", () => {
    expect(ADS_DELIVERY_ENABLED).toBe(false);
    expect(ADS_DIAGNOSTIC_RUNNER_AUTHORITY.productionAccepted).toBe(false);
    expect(ADS_INVENTORY_BRIDGE_AUTHORITY.productionAccepted).toBe(false);
    expect(SERVER_SOURCE).toMatch(/loadAdsInventoryBridgeForAdvertiser/);
    expect(SERVER_SOURCE).toMatch(/runAdsCanonicalStackV1/);
    expect(SERVER_SOURCE).not.toMatch(/runAdsStackPipelineV1/);
    expect(SERVER_SOURCE).not.toMatch(/runInternalDeliveryPilot/);
    expect(SERVER_SOURCE).not.toMatch(/\.insert\(/);
    expect(SERVER_SOURCE).not.toMatch(/\.update\(/);
    expect(SERVER_SOURCE).not.toMatch(/\.delete\(/);
    expect(SERVER_SOURCE).not.toMatch(/ueos|chargeWallet|ingestEvent/i);
    expect(typeof platform.runAdsCanonicalStackV1).toBe("function");
  });
});
