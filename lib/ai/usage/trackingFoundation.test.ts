import { beforeEach, describe, expect, it } from "vitest";
import { AiPlatformError } from "../contracts/errors";
import { loadAiPlatformConfig } from "../config";
import { executeAiGateway } from "../gateway/execute";
import { resetAiRunState } from "../runs/lifecycle";
import { resetAiTraceState } from "../tracing/events";
import { resetAiUsageState, listRecentUsage } from "./accounting";
import { aiCostTracker } from "./costTracker";
import {
  listTrackedUsage,
  recordAiServiceUsageAfterExecution,
  recordUsageAfterExecution,
  resetUsageTrackingFoundation,
} from "./trackingFoundation";
import { AiUsageTracker } from "./usageTracker";
import { createNoopUsageTrackingExtensionHooks } from "./trackingTypes";
import { aiService } from "../services/aiService";
import { resetAiRateLimitState } from "../safety/hooks";
import { resetAiSessionState } from "../sessions/session";

const USER = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  resetAiRunState();
  resetAiTraceState();
  resetAiUsageState();
  resetAiSessionState();
  resetAiRateLimitState();
  resetUsageTrackingFoundation();
});

describe("AiCostTracker", () => {
  it("returns zero-cost for zero-rate providers", () => {
    const estimate = aiCostTracker.estimate({
      estimatedInputTokens: 1000,
      estimatedOutputTokens: 500,
      inputCostPer1M: 0,
      outputCostPer1M: 0,
    });
    expect(estimate.estimatedCostMinor).toBe(0);
    expect(estimate.costStatus).toBe("zero");
  });

  it("marks missing metrics as unavailable", () => {
    const estimate = aiCostTracker.estimate({
      estimatedInputTokens: null,
      estimatedOutputTokens: null,
    });
    expect(estimate.estimatedCostMinor).toBeNull();
    expect(estimate.costStatus).toBe("unavailable");
  });

  it("is deterministic for the same inputs", () => {
    const input = {
      estimatedInputTokens: 2_000,
      estimatedOutputTokens: 1_000,
      inputCostPer1M: 0.15,
      outputCostPer1M: 0.6,
    };
    expect(aiCostTracker.estimate(input)).toEqual(
      aiCostTracker.estimate(input)
    );
  });

  it("prefers provider-reported cost when present", () => {
    const estimate = aiCostTracker.estimate({
      estimatedInputTokens: 10,
      estimatedOutputTokens: 10,
      reportedCostMinor: 42,
      costStatus: "provider_reported",
      inputCostPer1M: 0.15,
      outputCostPer1M: 0.6,
    });
    expect(estimate.estimatedCostMinor).toBe(42);
    expect(estimate.costStatus).toBe("provider_reported");
  });
});

describe("AiUsageTracker", () => {
  it("records successful usage", () => {
    const tracker = new AiUsageTracker();
    const row = tracker.record({
      requestId: "req-1",
      capabilityId: "platform.diagnostics_probe",
      providerId: "stub",
      modelId: "stub-structured-v1",
      executionStatus: "completed",
      executionTimeMs: 12,
      estimatedInputTokens: 10,
      estimatedOutputTokens: 5,
      estimatedCostMinor: 0,
      costCurrency: "USD",
      costStatus: "zero",
      timestamp: "2026-07-29T00:00:00.000Z",
      userId: USER,
      workspaceId: null,
    });
    expect(row.requestId).toBe("req-1");
    expect(tracker.get("req-1")?.executionStatus).toBe("completed");
    expect(tracker.aggregate().completed).toBe(1);
  });

  it("records failed execution", () => {
    const tracker = new AiUsageTracker();
    tracker.record({
      requestId: "req-fail",
      capabilityId: "commerce.product_draft_assistant",
      providerId: null,
      modelId: null,
      executionStatus: "failed",
      executionTimeMs: 3,
      estimatedInputTokens: null,
      estimatedOutputTokens: null,
      estimatedCostMinor: null,
      costCurrency: null,
      costStatus: "unavailable",
      timestamp: new Date().toISOString(),
      userId: USER,
      workspaceId: null,
    });
    expect(tracker.aggregate().failed).toBe(1);
    expect(tracker.aggregate().costUnavailableRequests).toBe(1);
  });

  it("fail-closed on duplicate requestId", () => {
    const tracker = new AiUsageTracker();
    const base = {
      requestId: "dup",
      capabilityId: "x",
      providerId: "stub",
      modelId: "m",
      executionStatus: "completed" as const,
      executionTimeMs: 1,
      estimatedInputTokens: 1,
      estimatedOutputTokens: 1,
      estimatedCostMinor: 0,
      costCurrency: "USD",
      costStatus: "zero" as const,
      timestamp: new Date().toISOString(),
      userId: USER,
      workspaceId: null,
    };
    tracker.record(base);
    expect(() => tracker.record(base)).toThrow(AiPlatformError);
  });

  it("fail-closed on missing requestId", () => {
    const tracker = new AiUsageTracker();
    expect(() =>
      tracker.record({
        requestId: "  ",
        capabilityId: "x",
        providerId: null,
        modelId: null,
        executionStatus: "failed",
        executionTimeMs: 0,
        estimatedInputTokens: null,
        estimatedOutputTokens: null,
        estimatedCostMinor: null,
        costCurrency: null,
        costStatus: "unavailable",
        timestamp: new Date().toISOString(),
        userId: null,
        workspaceId: null,
      })
    ).toThrow(/requestId/i);
  });
});

describe("recordUsageAfterExecution foundation", () => {
  it("combines usage + cost trackers deterministically", () => {
    const a = recordUsageAfterExecution({
      requestId: "r1",
      capabilityId: "platform.diagnostics_probe",
      providerId: "stub",
      modelId: "stub-structured-v1",
      executionStatus: "completed",
      executionTimeMs: 9,
      estimatedInputTokens: 100,
      estimatedOutputTokens: 50,
      inputCostPer1M: 0,
      outputCostPer1M: 0,
      userId: USER,
    });
    const b = recordUsageAfterExecution({
      requestId: "r2",
      capabilityId: "platform.diagnostics_probe",
      providerId: "stub",
      modelId: "stub-structured-v1",
      executionStatus: "completed",
      executionTimeMs: 9,
      estimatedInputTokens: 100,
      estimatedOutputTokens: 50,
      inputCostPer1M: 0,
      outputCostPer1M: 0,
      userId: USER,
    });
    expect(a.costStatus).toBe("zero");
    expect(b.costStatus).toBe("zero");
    expect(a.estimatedCostMinor).toBe(b.estimatedCostMinor);
    expect(listTrackedUsage()).toHaveLength(2);
  });

  it("exposes noop extension hooks for billing/quotas/analytics", () => {
    const hooks = createNoopUsageTrackingExtensionHooks();
    expect(() => hooks.onBilling?.({} as never)).not.toThrow();
    expect(() => hooks.onQuota?.({} as never)).not.toThrow();
    expect(() => hooks.onDashboard?.({} as never)).not.toThrow();
    expect(() => hooks.onAnalytics?.({} as never)).not.toThrow();
    expect(() => hooks.onTenantAccounting?.({} as never)).not.toThrow();
  });

  it("aiService dedupes when gateway already tracked the run", async () => {
    const gateway = await executeAiGateway(
      USER,
      {
        capabilityId: "platform.diagnostics_probe",
        promptId: "platform.diagnostics_probe",
        userInput: "ping",
        outputMode: "structured_json",
        context: {
          productDomain: "platform",
          surface: "test",
          dataClassification: "internal",
          allowedCapabilities: ["platform.diagnostics_probe"],
          allowedToolIds: [],
        },
        _test: { forceStub: true, bypassRateLimit: true },
      },
      {
        config: loadAiPlatformConfig({
          mode: "stub",
          allowStub: true,
          openaiApiKey: null,
        }),
        capabilityEligible: true,
      }
    );
    expect(gateway.ok).toBe(true);
    if (!gateway.ok) return;
    const before = listTrackedUsage().length;
    const again = recordAiServiceUsageAfterExecution({
      requestId: gateway.data.runId,
      capabilityId: "platform.diagnostics_probe",
      executionStatus: "completed",
      executionTimeMs: 1,
      userId: USER,
    });
    expect(again?.requestId).toBe(gateway.data.runId);
    expect(listTrackedUsage()).toHaveLength(before);
    expect(listRecentUsage().length).toBeGreaterThan(0);
  });

  it("records via aiService after diagnostics execution", async () => {
    const result = await aiService.runCapability(
      {
        capabilityId: "platform.diagnostics_probe",
        input: { text: "ping" },
        context: { productDomain: "platform", surface: "test.usage" },
      },
      { supabase: {} as never, userId: USER, forceStub: true }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const tracked = listTrackedUsage().find(
      (r) => r.requestId === result.data.runId
    );
    expect(tracked).toBeTruthy();
    expect(tracked?.capabilityId).toBe("platform.diagnostics_probe");
    expect(tracked?.executionStatus).toBe("completed");
  });
});
