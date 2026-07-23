import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { ADS_DELIVERY_ENABLED } from "../constants";
import * as adsIndex from "../index";
import * as platform from "../platform";
import {
  ADS_FEATURE_FLAGS,
  ADS_KILL_SWITCHES,
  ADS_OPERATIONS_ACTIVATION_AUTHORITY,
  ADS_PLATFORM_ACTIVE_OPERATIONAL_STATE,
  appendAdsOpsAuditRecord,
  assertAdsNotProductionEligible,
  evaluateAdsFeatureFlagChange,
  evaluateAdsKillSwitchChange,
  evaluateAdsOperationalStateTransition,
  evaluateAdsOperationsReadiness,
  getAdsAdminOperationsInspectionBundle,
  getAdsFeatureFlagsSnapshot,
  getAdsKillSwitchesSnapshot,
  getAdsOperationalStateSnapshot,
  getAdsOperationsHealthReport,
  isAdsFeatureFlagEnabled,
  isAdsKillSwitchBlocking,
  listAdsOpsAuditRecords,
  proposeAdsFeatureFlagChange,
  proposeAdsKillSwitchChange,
  proposeAdsOperationalStateChange,
  resetAdsOpsAuditRecordsForTests,
} from "./index";

const ROOT = path.join(__dirname, "..", "..", "..");
const OPS_DIR = path.join(__dirname);
const INDEX_SOURCE = readFileSync(
  path.join(ROOT, "lib/ads/index.ts"),
  "utf8"
);

function readOps(rel: string) {
  return readFileSync(path.join(OPS_DIR, rel), "utf8");
}

const NOW = "2026-07-24T00:00:00.000Z";
const ACTOR = {
  actorRef: "admin-ops-test",
  correlationId: "ops-corr-1",
  recordedAt: NOW,
};

describe("Ads Operations & Activation Foundation V1", () => {
  beforeEach(() => {
    resetAdsOpsAuditRecordsForTests();
  });

  it("keeps operational state frozen in development and rejects production", () => {
    const snapshot = getAdsOperationalStateSnapshot();
    expect(snapshot.activeState).toBe("development");
    expect(snapshot.activeState).toBe(ADS_PLATFORM_ACTIVE_OPERATIONAL_STATE);
    expect(snapshot.productionStateSelectable).toBe(false);
    expect(snapshot.productionEnabled).toBe(false);
    expect(snapshot.deliveryEnabled).toBe(false);
    expect(snapshot.billingEnabled).toBe(false);

    expect(
      evaluateAdsOperationalStateTransition({
        from: "development",
        to: "production",
      }).ok
    ).toBe(false);
    expect(
      evaluateAdsOperationalStateTransition({
        from: "development",
        to: "qa",
      }).ok
    ).toBe(false);
  });

  it("centralizes feature flags and refuses delivery/billing enablement", () => {
    const flags = getAdsFeatureFlagsSnapshot();
    expect(flags.flags).toEqual(ADS_FEATURE_FLAGS);
    expect(flags.flags.delivery).toBe(false);
    expect(flags.flags.billing).toBe(false);
    expect(flags.deliveryEnabled).toBe(false);
    expect(flags.billingEnabled).toBe(false);
    expect(isAdsFeatureFlagEnabled("diagnostics")).toBe(true);
    expect(isAdsFeatureFlagEnabled("delivery")).toBe(false);
    expect(isAdsFeatureFlagEnabled("billing")).toBe(false);

    expect(
      evaluateAdsFeatureFlagChange({ key: "delivery", enabled: true }).ok
    ).toBe(false);
    expect(
      evaluateAdsFeatureFlagChange({ key: "billing", enabled: true }).ok
    ).toBe(false);
    expect(
      evaluateAdsFeatureFlagChange({ key: "diagnostics", enabled: false }).ok
    ).toBe(true);
  });

  it("keeps permanent kill switches engaged and fail closed", () => {
    const switches = getAdsKillSwitchesSnapshot();
    expect(switches.globalServingBlocked).toBe(true);
    expect(switches.billingBlocked).toBe(true);
    expect(switches.measurementIngestionBlocked).toBe(true);
    expect(ADS_KILL_SWITCHES.globalServing.engaged).toBe(true);
    expect(isAdsKillSwitchBlocking("globalServing")).toBe(true);
    expect(isAdsKillSwitchBlocking("billing")).toBe(true);
    expect(isAdsKillSwitchBlocking("measurementIngestion")).toBe(true);

    expect(
      evaluateAdsKillSwitchChange({
        key: "globalServing",
        engaged: false,
      }).ok
    ).toBe(false);
    expect(
      evaluateAdsKillSwitchChange({
        key: "billing",
        engaged: false,
      }).ok
    ).toBe(false);
    expect(
      evaluateAdsKillSwitchChange({
        key: "measurementIngestion",
        engaged: false,
      }).ok
    ).toBe(false);
  });

  it("reports readiness with productionEligible permanently false", () => {
    const report = evaluateAdsOperationsReadiness();
    expect(report.productionEligible).toBe(false);
    expect(report.productionEnabled).toBe(false);
    expect(report.productionAccepted).toBe(false);
    expect(report.authoritativeProductionServing).toBe(false);
    expect(report.billingEnabled).toBe(false);
    expect(report.deliveryEnabled).toBe(false);
    expect(report.enabledFoundations).toContain("canonical_stack");
    expect(report.enabledFoundations).toContain("diagnostics");
    expect(report.enabledFoundations).toContain("provenance");
    expect(report.disabledFoundations).toContain("billing");
    expect(report.blockingConditions.length).toBeGreaterThan(0);
    expect(assertAdsNotProductionEligible(report)).toEqual({ ok: true });
  });

  it("reports read-only foundation health without opening production", () => {
    const health = getAdsOperationsHealthReport();
    expect(health.readOnly).toBe(true);
    expect(health.overall).toBe("healthy");
    expect(health.productionEnabled).toBe(false);
    expect(health.deliveryEnabled).toBe(false);
    expect(health.billingEnabled).toBe(false);
    const ids = health.components.map((c) => c.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "canonical_stack",
        "diagnostics",
        "measurement",
        "billing",
        "inventory",
        "provenance",
      ])
    );
    expect(health.components.find((c) => c.id === "billing")?.status).toBe(
      "disabled"
    );
  });

  it("records immutable ops audit entries without applying production effects", () => {
    const appended = appendAdsOpsAuditRecord({
      eventType: "feature_flag_change",
      actorRef: "ops-actor",
      correlationId: "corr-1",
      summary: "audit test",
      accepted: false,
      details: { key: "delivery", enabled: true },
      recordedAt: NOW,
    });
    expect(appended.ok).toBe(true);
    if (!appended.ok) return;
    expect(appended.record.applied).toBe(false);
    expect(appended.record.productionEnabled).toBe(false);
    expect(appended.record.deliveryEnabled).toBe(false);
    expect(listAdsOpsAuditRecords()).toHaveLength(1);
    expect(Object.isFrozen(appended.record)).toBe(true);
  });

  it("exposes admin ops contracts that audit proposals and never apply them", () => {
    const rejectedDelivery = proposeAdsFeatureFlagChange({
      ...ACTOR,
      key: "delivery",
      enabled: true,
    });
    expect(rejectedDelivery.ok).toBe(false);

    const rejectedServing = proposeAdsKillSwitchChange({
      ...ACTOR,
      key: "globalServing",
      engaged: false,
    });
    expect(rejectedServing.ok).toBe(false);

    const rejectedProduction = proposeAdsOperationalStateChange({
      ...ACTOR,
      from: "development",
      to: "production",
    });
    expect(rejectedProduction.ok).toBe(false);

    const bundle = getAdsAdminOperationsInspectionBundle();
    expect(bundle.productionEligible).toBe(false);
    expect(bundle.deliveryEnabled).toBe(false);
    expect(bundle.billingEnabled).toBe(false);
    expect(bundle.readiness.productionEligible).toBe(false);
    expect(listAdsOpsAuditRecords().length).toBeGreaterThanOrEqual(3);
    for (const record of listAdsOpsAuditRecords()) {
      expect(record.applied).toBe(false);
      expect(record.productionEnabled).toBe(false);
    }
  });

  it("preserves kill switches, canonical stack authority, and export safety", () => {
    expect(ADS_DELIVERY_ENABLED).toBe(false);
    expect(ADS_OPERATIONS_ACTIVATION_AUTHORITY.productionEnabled).toBe(false);
    expect(ADS_OPERATIONS_ACTIVATION_AUTHORITY.deliveryEnabled).toBe(false);
    expect(ADS_OPERATIONS_ACTIVATION_AUTHORITY.billingEnabled).toBe(false);
    expect(typeof platform.runAdsCanonicalStackV1).toBe("function");
    expect(INDEX_SOURCE).toMatch(/from ["'].\/operations["']/);
    expect(adsIndex).toHaveProperty("evaluateAdsOperationsReadiness");
    expect(adsIndex).toHaveProperty("getAdsKillSwitchesSnapshot");

    const sources = [
      readOps("featureFlags.ts"),
      readOps("killSwitches.ts"),
      readOps("readiness.ts"),
      readOps("health.ts"),
      readOps("adminContracts.ts"),
    ].join("\n");
    expect(sources).not.toMatch(/ADS_DELIVERY_ENABLED\s*=\s*true/);
    expect(sources).not.toMatch(/productionEligible:\s*true/);
    expect(sources).not.toMatch(/deliveryEnabled:\s*true/);
    expect(sources).not.toMatch(/billingEnabled:\s*true/);
    expect(sources).not.toMatch(/stripe|paypal|adyen/i);
    expect(sources).not.toMatch(/\.insert\(|\.update\(|\.delete\(/);
  });
});
