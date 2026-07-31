import { afterEach, describe, expect, it } from "vitest";
import { resetCapabilityCatalogRegistryForTests } from "../catalog";
import {
  aiPolicyRegistry,
  resetPolicyGovernanceFoundation,
} from "../policy";
import type { AiCapabilityPolicyBinding } from "../policy";
import { STRICT_QUOTA_POLICY_ID } from "../usage/policyFixtures";
import { defaultMeteringBinding } from "../usage/policyFixtures";
import {
  aiUsageQuotasBillingFoundation,
  resetUsageQuotasBillingFoundation,
} from "../usage/usageFoundation";
import {
  AI_PIPELINE_STAGES,
  buildOrchestrationResultView,
  orchestrateAiServiceRequest,
  resetAiOrchestrationFoundation,
} from "./index";

const NOW = "2026-07-31T18:00:00.000Z";

afterEach(() => {
  resetAiOrchestrationFoundation();
  resetPolicyGovernanceFoundation();
  resetUsageQuotasBillingFoundation();
  resetCapabilityCatalogRegistryForTests();
});

describe("AI Service Orchestration Foundation V1", () => {
  it("runs successful orchestration to ready_for_execution", () => {
    const result = orchestrateAiServiceRequest({
      capabilityId: "platform.translation_suggest",
      tenantId: "tenant_a",
      userId: "user_a",
      runtimeId: "shared_ai_gateway",
      nowIso: NOW,
    });
    expect(result.outcome).toBe("ready_for_execution");
    expect(result.routingPlan?.providerId).toBeTruthy();
    expect(result.invocationPlan?.planned).toBe(true);
    expect(result.invocationPlan?.adapterBoundary).toBe("not_invoked");
    expect(result.stopReason).toBeNull();
  });

  it("preserves stage ordering", () => {
    const result = orchestrateAiServiceRequest({
      capabilityId: "platform.translation_suggest",
      tenantId: "tenant_a",
      userId: "user_a",
      nowIso: NOW,
    });
    const executed = result.stages.map((s) => s.stageId);
    expect(executed).toEqual([...AI_PIPELINE_STAGES]);
  });

  it("policy stage can require approval", () => {
    const result = orchestrateAiServiceRequest({
      capabilityId: "platform.diagnostics_probe",
      tenantId: "tenant_a",
      userId: "user_a",
      nowIso: NOW,
    });
    expect(result.outcome).toBe("requires_approval");
    expect(result.stages.find((s) => s.stageId === "policy")?.status).toBe(
      "failed"
    );
    expect(result.stages.find((s) => s.stageId === "quota")?.status).toBe(
      "skipped"
    );
    expect(result.stages.find((s) => s.stageId === "audit")?.status).toBe(
      "passed"
    );
  });

  it("quota stage blocks when hard quota exceeded", () => {
    const binding = aiPolicyRegistry.getBinding(
      "platform.translation_suggest"
    ) as AiCapabilityPolicyBinding;
    aiPolicyRegistry.upsert({
      ...binding,
      meteringQuotaPolicyId: STRICT_QUOTA_POLICY_ID,
    });
    const metering = defaultMeteringBinding({
      quotaPolicyId: STRICT_QUOTA_POLICY_ID,
    });
    const actor = {
      userId: "user_a",
      tenantId: "tenant_a",
      permissions: ["usage_record" as const, "usage_read_self" as const],
    };
    for (let i = 0; i < 4; i++) {
      aiUsageQuotasBillingFoundation.recordUsage({
        actor,
        metering,
        requestId: `q${i}`,
        capabilityId: "platform.translation_suggest",
        tenantId: "tenant_a",
        userId: "user_a",
        status: "success",
        source: "shared_ai_service",
        nowIso: NOW,
      });
    }
    const blocked = orchestrateAiServiceRequest({
      capabilityId: "platform.translation_suggest",
      tenantId: "tenant_a",
      userId: "user_a",
      nowIso: NOW,
    });
    expect(blocked.outcome).toBe("blocked");
    expect(blocked.currentStage).toBe("quota");
  });

  it("routing stage failure propagates", () => {
    const result = orchestrateAiServiceRequest({
      capabilityId: "platform.translation_suggest",
      tenantId: "tenant_a",
      userId: "user_a",
      forceRoutingFailure: true,
      nowIso: NOW,
    });
    expect(result.outcome).toBe("rejected");
    expect(result.currentStage).toBe("routing");
    expect(result.stages.find((s) => s.stageId === "invocation")?.status).toBe(
      "skipped"
    );
  });

  it("invocation stage failure propagates", () => {
    const result = orchestrateAiServiceRequest({
      capabilityId: "platform.translation_suggest",
      tenantId: "tenant_a",
      userId: "user_a",
      forceInvocationFailure: true,
      nowIso: NOW,
    });
    expect(result.outcome).toBe("rejected");
    expect(result.currentStage).toBe("invocation");
  });

  it("cancellation propagates as rejected", () => {
    const result = orchestrateAiServiceRequest({
      capabilityId: "platform.translation_suggest",
      tenantId: "tenant_a",
      userId: "user_a",
      cancelRequested: true,
      nowIso: NOW,
    });
    expect(result.outcome).toBe("rejected");
    expect(result.stopReason).toMatch(/Cancellation/i);
  });

  it("rejects unknown capability at preflight", () => {
    const result = orchestrateAiServiceRequest({
      capabilityId: "does.not.exist",
      tenantId: "tenant_a",
      userId: "user_a",
      nowIso: NOW,
    });
    expect(result.outcome).toBe("rejected");
    expect(result.currentStage).toBe("preflight");
  });

  it("audit stage always records and result builder works", () => {
    const result = orchestrateAiServiceRequest({
      capabilityId: "platform.translation_suggest",
      tenantId: "tenant_a",
      userId: "user_a",
      forceRoutingFailure: true,
      nowIso: NOW,
    });
    expect(result.stages.some((s) => s.stageId === "audit")).toBe(true);
    const view = buildOrchestrationResultView(result);
    expect(view.readyForExecution).toBe(false);
    expect(view.stageSummaries.length).toBeGreaterThan(0);
  });

  it("policy approval unlocks diagnostics path to readiness", () => {
    const result = orchestrateAiServiceRequest({
      capabilityId: "platform.diagnostics_probe",
      tenantId: "tenant_a",
      userId: "user_a",
      approvalGranted: true,
      nowIso: NOW,
    });
    expect(result.outcome).toBe("ready_for_execution");
  });
});
