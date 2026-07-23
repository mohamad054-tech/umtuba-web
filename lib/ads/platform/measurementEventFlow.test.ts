import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ADS_MEASUREMENT_EVENT_FLOW_CONTRACT_VERSION,
  ADS_MEASUREMENT_EVENT_FLOW_INPUT_ALLOWED_FIELDS,
  ADS_MEASUREMENT_EVENT_FLOW_STAGES,
  buildAdsMeasurementPackageFromResolvedHandle,
  runAdsMeasurementEventFlow,
  validateAdsMeasurementEventFlowResult,
} from "./measurementEventFlow";
import {
  ADS_REPORTING_HANDLE_VERSION,
  freezeAdsReportingHandlePayload,
  type AdsReportingHandlePayload,
} from "./reportingHandle";
import type { AdsReportingHandleResolutionEntry } from "./reportingHandleResolution";
import {
  ADS_VIEWABILITY_MIN_IN_VIEW_RATIO,
  ADS_VIEWABILITY_MIN_VISIBLE_MS,
} from "./measurementPipeline";

const SOURCE = readFileSync(
  path.join(__dirname, "measurementEventFlow.ts"),
  "utf8"
);

const CURRENT_TIMESTAMP = "2026-07-22T12:00:00.000Z";
const ISSUED_AT = "2026-07-22T11:30:00.000Z";
const EXPIRES_AT = "2026-07-22T12:30:00.000Z";

function payload(
  overrides: Partial<AdsReportingHandlePayload> &
    Record<string, unknown> = {}
): AdsReportingHandlePayload {
  return freezeAdsReportingHandlePayload({
    version: ADS_REPORTING_HANDLE_VERSION,
    handleId: "handle-flow-1",
    eventPermissions: ["impression", "qualified_view", "click"],
    bindings: {
      placementId: "WATCH_FEED",
      candidateRef: "candidate-ref-1",
      campaignRef: "campaign-ref-1",
      adSetRef: "ad-set-ref-1",
      creativeRef: "creative-ref-1",
    },
    lifecycleState: "active",
    issuedAt: ISSUED_AT,
    expiresAt: EXPIRES_AT,
    keyId: "key-flow-1",
    nonce: "nonce-flow-1",
    productionEnabled: false,
    ...overrides,
  } as AdsReportingHandlePayload);
}

function registryFor(
  token: string,
  eventPermissions: AdsReportingHandlePayload["eventPermissions"] = [
    "impression",
    "qualified_view",
    "click",
  ]
): readonly AdsReportingHandleResolutionEntry[] {
  return Object.freeze([
    {
      token,
      payload: payload({ eventPermissions: [...eventPermissions] }),
    },
  ]);
}

describe("Ads Measurement Event Flow V1", () => {
  it("exposes contract version, stages, and allowed fields", () => {
    expect(ADS_MEASUREMENT_EVENT_FLOW_CONTRACT_VERSION).toBe("v1");
    expect([...ADS_MEASUREMENT_EVENT_FLOW_STAGES]).toEqual([
      "resolve_handle",
      "validate_event",
      "prepare_package",
      "run_pipeline",
      "result",
    ]);
    expect([...ADS_MEASUREMENT_EVENT_FLOW_INPUT_ALLOWED_FIELDS]).toEqual([
      "eventType",
      "reportingHandle",
      "currentTimestamp",
      "registry",
      "seenDedupeKeys",
      "viewabilitySignal",
    ]);
  });

  it("accepts an impression measurement event flow", () => {
    const token = "arh_v1_flow_imp_1";
    const outcome = runAdsMeasurementEventFlow({
      eventType: "impression",
      reportingHandle: { version: ADS_REPORTING_HANDLE_VERSION, token },
      currentTimestamp: CURRENT_TIMESTAMP,
      registry: registryFor(token, ["impression"]),
    });

    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.flowAccepted).toBe(true);
    expect(outcome.result.flowRejected).toBe(false);
    expect(outcome.result.flowStage).toBe("result");
    expect(outcome.result.eventType).toBe("impression");
    expect(outcome.result.pipelineResult?.measurementAccepted).toBe(true);
    expect(outcome.result.measurementPackage).toEqual(
      buildAdsMeasurementPackageFromResolvedHandle({
        eventType: "impression",
        selectedCandidateId: "candidate-ref-1",
        reportingHandleToken: token,
      })
    );
    expect(outcome.result.productionEnabled).toBe(false);
    expect(outcome.result.measurementEnabled).toBe(false);
    expect(validateAdsMeasurementEventFlowResult(outcome.result)).toEqual({
      valid: true,
    });
  });

  it("accepts a click measurement event flow", () => {
    const token = "arh_v1_flow_clk_1";
    const outcome = runAdsMeasurementEventFlow({
      eventType: "click",
      reportingHandle: token,
      currentTimestamp: CURRENT_TIMESTAMP,
      registry: registryFor(token, ["click"]),
    });
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.flowAccepted).toBe(true);
    expect(outcome.result.eventType).toBe("click");
    expect(outcome.result.pipelineResult?.normalizedPackage?.eventType).toBe(
      "click"
    );
  });

  it("accepts a viewability (qualified_view) measurement event flow", () => {
    const token = "arh_v1_flow_view_1";
    const outcome = runAdsMeasurementEventFlow({
      eventType: "qualified_view",
      reportingHandle: token,
      currentTimestamp: CURRENT_TIMESTAMP,
      registry: registryFor(token, ["qualified_view"]),
      viewabilitySignal: {
        inViewRatio: ADS_VIEWABILITY_MIN_IN_VIEW_RATIO,
        visibleMs: ADS_VIEWABILITY_MIN_VISIBLE_MS,
      },
    });
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.flowAccepted).toBe(true);
    expect(outcome.result.eventType).toBe("qualified_view");
    expect(outcome.result.pipelineResult?.measurementAccepted).toBe(true);
  });

  it("rejects unresolved handles and sub-threshold viewability", () => {
    const missing = runAdsMeasurementEventFlow({
      eventType: "impression",
      reportingHandle: "arh_v1_missing",
      currentTimestamp: CURRENT_TIMESTAMP,
      registry: registryFor("arh_v1_other", ["impression"]),
    });
    expect(missing.valid).toBe(true);
    if (!missing.valid) return;
    expect(missing.result.flowRejected).toBe(true);
    expect(missing.result.flowStage).toBe("resolve_handle");

    const lowView = runAdsMeasurementEventFlow({
      eventType: "qualified_view",
      reportingHandle: "arh_v1_flow_view_low",
      currentTimestamp: CURRENT_TIMESTAMP,
      registry: registryFor("arh_v1_flow_view_low", ["qualified_view"]),
      viewabilitySignal: {
        inViewRatio: 0.1,
        visibleMs: 100,
      },
    });
    expect(lowView.valid).toBe(true);
    if (!lowView.valid) return;
    expect(lowView.result.flowRejected).toBe(true);
    expect(lowView.result.flowStage).toBe("run_pipeline");
  });

  it("deduplicates repeated events via seenDedupeKeys", () => {
    const token = "arh_v1_flow_dedupe_1";
    const input = {
      eventType: "impression" as const,
      reportingHandle: token,
      currentTimestamp: CURRENT_TIMESTAMP,
      registry: registryFor(token, ["impression"]),
    };
    const first = runAdsMeasurementEventFlow(input);
    expect(first.valid).toBe(true);
    if (!first.valid) return;
    expect(first.result.flowAccepted).toBe(true);

    const duplicate = runAdsMeasurementEventFlow({
      ...input,
      seenDedupeKeys: [first.result.measurementPackage!.dedupeKey],
    });
    expect(duplicate.valid).toBe(true);
    if (!duplicate.valid) return;
    expect(duplicate.result.flowRejected).toBe(true);
    expect(duplicate.result.flowStage).toBe("run_pipeline");
    expect(duplicate.result.pipelineResult?.pipelineStage).toBe("deduplicate");
  });

  it("rejects unknown fields and keeps flags disabled", () => {
    expect(
      runAdsMeasurementEventFlow({
        eventType: "impression",
        reportingHandle: "arh_v1_x",
        currentTimestamp: CURRENT_TIMESTAMP,
        registry: [],
        sink: true,
      }).valid
    ).toBe(false);

    const token = "arh_v1_flow_flags_1";
    const outcome = runAdsMeasurementEventFlow({
      eventType: "impression",
      reportingHandle: token,
      currentTimestamp: CURRENT_TIMESTAMP,
      registry: registryFor(token, ["impression"]),
    });
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.productionEnabled).toBe(false);
    expect(outcome.result.measurementEnabled).toBe(false);
  });

  it("has no storage, network, database, or product wiring", () => {
    expect(SOURCE).not.toMatch(/from ["']@\//);
    expect(SOURCE).not.toMatch(/from ["']\.\.\//);
    expect(SOURCE).not.toMatch(
      /from ["'][^"']*\/(watch|discover|live|store|world|messenger|games|learning|search|notifications)(\/|["'])/i
    );
    expect(SOURCE).not.toMatch(
      /from ["'][^"']*supabase[^"']*["']|require\(["'][^"']*supabase|createClient\s*\(/i
    );
    expect(SOURCE).not.toMatch(/\bfetch\s*\(|\baxios\b/);
    expect(SOURCE).not.toMatch(/Math\.random|Date\.now|performance\.now/);
    expect(SOURCE).toMatch(/productionEnabled: false/);
    expect(SOURCE).toMatch(/measurementEnabled: false/);
    expect(SOURCE).toMatch(/runAdsMeasurementEventFlow/);
    expect(SOURCE).toMatch(/resolveAdsReportingHandle/);
  });
});
