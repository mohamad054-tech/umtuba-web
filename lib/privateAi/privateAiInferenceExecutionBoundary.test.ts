import { afterEach, describe, expect, it } from "vitest";
import {
  createPrivateAiPermission,
  createPrivateAiService,
  dispatchInferenceExecution,
  evaluateExecutionGuard,
  resetPrivateAiForTests,
} from "./index";

afterEach(() => {
  resetPrivateAiForTests();
});

const requester = {
  actorId: "user_1",
  role: "platform_admin",
  tenantId: "tenant_umtuba",
  sessionId: "sess_1",
};

function readyRequest(svc: ReturnType<typeof createPrivateAiService>) {
  const created = svc.createInferenceRequest({
    capabilityId: "reasoning",
    prompt: "plan only",
    requester,
  });
  return svc.validateInferenceRequest(created.requestId);
}

describe("Private AI Inference Execution Boundary V1", () => {
  it("builds execution context via dispatcher without provider calls", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const req = readyRequest(svc);
    const plan = svc.dispatchExecution({ requestId: req.requestId });
    expect(plan.status).toBe("planned");
    expect(plan.context).not.toBeNull();
    expect(plan.context?.requestId).toBe(req.requestId);
    expect(plan.context?.runtimeId).toBe("prt_external_general_primary");
    expect(plan.context?.trace.traceId).toContain(req.correlationId);
    expect(plan.context?.timeout.timeoutMs).toBeGreaterThan(0);
    expect(plan.context?.cancellation.cancellationTokenId).toContain(
      req.requestId
    );
    expect(plan.notes).toMatch(/does not invoke/);
  });

  it("blocks invalid runtime / lifecycle / permissions fail-closed", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const pending = svc.createInferenceRequest({
      capabilityId: "translation",
      prompt: "x",
      requester,
      runtimeId: "prt_translator_pending",
      modelId: "pam_umtuba_translator_private",
      providerId: "umtuba-private",
      autoSelectRuntime: false,
    });
    // force validated-like guard input by advancing validation (will reject)
    const rejected = svc.validateInferenceRequest(pending.requestId);
    expect(rejected.lifecycle).toBe("rejected");

    const valid = readyRequest(svc);
    Object.assign(svc.getState(), {
      permissions: [
        createPrivateAiPermission({
          id: "ro",
          scope: "model",
          resourceId: "*",
          role: "platform_admin",
          actions: ["read"],
          granted: true,
        }),
      ],
    });
    const guard = evaluateExecutionGuard(valid, svc.getState());
    expect(guard.ok).toBe(false);
    expect(guard.errors).toContain("permission_missing_inference_execute");

    const plan = dispatchInferenceExecution(svc.getState(), {
      requestId: valid.requestId,
    });
    expect(plan.status).toBe("blocked");
  });

  it("blocks exhausted quota and invalid budget", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const req = readyRequest(svc);
    Object.assign(svc.getState(), {
      executionQuota: {
        ...svc.getExecutionQuota(),
        requestsUsed: 100,
        requestQuota: 100,
      },
    });
    const quotaPlan = svc.dispatchExecution({ requestId: req.requestId });
    expect(quotaPlan.status).toBe("blocked");
    expect(quotaPlan.guardErrors).toContain("quota_request_exhausted");

    Object.assign(svc.getState(), {
      executionQuota: svc.getExecutionQuota(),
    });
    // reset quota for budget test
    const state = svc.getState();
    state.executionQuota = {
      requestQuota: 100,
      dailyQuota: 1000,
      tenantQuota: 5000,
      requestsUsed: 0,
      dailyUsed: 0,
      tenantUsed: 0,
    };
    const budgetPlan = svc.dispatchExecution({
      requestId: req.requestId,
      budget: {
        tokenBudget: 10,
        estimatedTokens: 100,
        executionBudgetUnits: 1,
        estimatedUnits: 1,
      },
    });
    expect(budgetPlan.status).toBe("blocked");
    expect(budgetPlan.guardErrors).toContain("budget_token_exceeded");
  });

  it("respects timeout and cancellation metadata contracts", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const req = svc.createInferenceRequest({
      capabilityId: "reasoning",
      prompt: "timeout",
      requester,
      timeoutMs: 500,
    });
    const validated = svc.validateInferenceRequest(req.requestId);
    // over max policy
    validated.timeoutMs = 999_999;
    const over = evaluateExecutionGuard(validated, svc.getState());
    expect(over.errors).toContain("timeout_out_of_policy");

    const cancellable = readyRequest(svc);
    cancellable.cancellationRequested = true;
    const cancelPlan = dispatchInferenceExecution(svc.getState(), {
      requestId: cancellable.requestId,
    });
    // guard catches cancellation; dispatcher may also return cancelled
    expect(["blocked", "cancelled"]).toContain(cancelPlan.status);
  });

  it("returns queued plan status when request lifecycle is queued", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const req = readyRequest(svc);
    svc.advanceInferenceRequest({ requestId: req.requestId, to: "accepted" });
    svc.advanceInferenceRequest({ requestId: req.requestId, to: "queued" });
    const plan = svc.dispatchExecution({ requestId: req.requestId });
    expect(plan.status).toBe("queued");
    expect(plan.context?.budget.executionBudgetUnits).toBe(1);
  });

  it("lists execution plans for admin models", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const req = readyRequest(svc);
    const plan = svc.dispatchExecution({ requestId: req.requestId });
    expect(svc.listExecutionPlans().some((p) => p.planId === plan.planId)).toBe(
      true
    );
    expect(svc.getExecutionPlan(plan.planId)?.selectedRuntimeId).toBe(
      "prt_external_general_primary"
    );
  });

  it("fails before dispatch for unknown request id", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const plan = svc.dispatchExecution({ requestId: "irq_missing" });
    expect(plan.status).toBe("failed_before_dispatch");
    expect(plan.error?.code).toBe("request_missing");
  });
});
