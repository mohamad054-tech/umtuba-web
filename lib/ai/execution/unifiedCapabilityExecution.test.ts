import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resetCapabilityCatalogRegistryForTests } from "../catalog";
import { AI_PIPELINE_STAGES } from "../orchestration";
import { resetAiOrchestrationFoundation } from "../orchestration";
import { resetPolicyGovernanceFoundation } from "../policy";
import { resetUsageQuotasBillingFoundation } from "../usage/usageFoundation";
import {
  executeUnifiedCapability,
  isUnifiedExecutionReady,
  resetUnifiedCapabilityExecution,
} from "./index";

const NOW = "2026-07-31T20:00:00.000Z";

afterEach(() => {
  resetUnifiedCapabilityExecution();
  resetAiOrchestrationFoundation();
  resetPolicyGovernanceFoundation();
  resetUsageQuotasBillingFoundation();
  resetCapabilityCatalogRegistryForTests();
});

describe("AI Unified Capability Execution V1", () => {
  it("runs end-to-end pipeline to ready_for_execution", () => {
    const result = executeUnifiedCapability({
      capabilityId: "platform.translation_suggest",
      tenantId: "tenant_a",
      userId: "user_a",
      runtimeId: "shared_ai_gateway",
      nowIso: NOW,
    });
    expect(result.result).toBe("ready_for_execution");
    expect(result.state).toBe("execution_ready");
    expect(isUnifiedExecutionReady(result)).toBe(true);
    expect(result.adapter.boundary).toBe("ready");
    expect(result.invocation.status).toBe("ready");
    expect(result.routing?.providerId).toBeTruthy();
  });

  it("preserves orchestration stage ordering", () => {
    const result = executeUnifiedCapability({
      capabilityId: "platform.translation_suggest",
      tenantId: "tenant_a",
      userId: "user_a",
      nowIso: NOW,
    });
    expect(result.orchestration?.stages.map((s) => s.stageId)).toEqual([
      ...AI_PIPELINE_STAGES,
    ]);
  });

  it("integrates policy (requires approval)", () => {
    const result = executeUnifiedCapability({
      capabilityId: "platform.diagnostics_probe",
      tenantId: "tenant_a",
      userId: "user_a",
      nowIso: NOW,
    });
    expect(result.result).toBe("requires_approval");
    expect(result.error?.code).toBe("policy_denied");
    expect(result.state).toBe("blocked");
  });

  it("integrates quota / blocked path via unknown capability", () => {
    const result = executeUnifiedCapability({
      capabilityId: "missing.capability",
      tenantId: "tenant_a",
      userId: "user_a",
      nowIso: NOW,
    });
    expect(result.result).toBe("rejected");
    expect(result.error?.code).toBe("capability_unknown");
  });

  it("integrates routing and adapter/invocation plans", () => {
    const result = executeUnifiedCapability({
      capabilityId: "commerce.product_draft_assistant",
      tenantId: "tenant_a",
      userId: "user_a",
      nowIso: NOW,
    });
    expect(result.result).toBe("ready_for_execution");
    expect(result.routing?.runtimeId).toBeTruthy();
    expect(result.adapter.note).toMatch(/Adapter Boundary/i);
    expect(result.invocation.note).toMatch(/Invocation/i);
  });

  it("builds unified result, errors, audit, metrics, and trace", () => {
    const result = executeUnifiedCapability({
      capabilityId: "platform.translation_suggest",
      tenantId: "tenant_a",
      userId: "user_a",
      cancelRequested: true,
      nowIso: NOW,
    });
    expect(result.result).toBe("rejected");
    expect(result.error).toBeTruthy();
    expect(result.audit.executionId).toBe(result.executionId);
    expect(result.metrics.totalStages).toBeGreaterThan(0);
    expect(result.trace[0]?.state).toBe("received");
    expect(result.trace.some((t) => t.state === "validated")).toBe(true);
  });

  it("rejects invalid unified entry", () => {
    const result = executeUnifiedCapability({
      capabilityId: "",
      tenantId: "tenant_a",
      userId: "user_a",
      nowIso: NOW,
    });
    expect(result.result).toBe("rejected");
    expect(result.error?.code).toBe("invalid_request");
  });

  it("architecture guard: aiService enters only via unified execution", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/ai/services/aiService.ts"),
      "utf8"
    );
    expect(src).toMatch(/executeUnifiedCapability/);
    expect(src).toMatch(/isUnifiedExecutionReady/);
    // Direct orchestration bypass removed from aiService entry.
    expect(src).not.toMatch(/orchestrateAiServiceRequest\(/);
  });
});
