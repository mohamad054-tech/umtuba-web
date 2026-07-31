import { afterEach, describe, expect, it } from "vitest";
import {
  assertTransitionInvocationLifecycle,
  buildFixtureOutputEnvelope,
  canTransitionInvocationLifecycle,
  CONTRACT_TEST_ADAPTER_ID,
  CONTRACT_TEST_FIXTURE_TEXT,
  createPrivateAiPermission,
  createPrivateAiService,
  createContractTestAdapter,
  normalizeAdapterError,
  redactSecretLikeText,
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
    prompt: "orchestration only",
    requester,
  });
  return svc.validateInferenceRequest(created.requestId);
}

function planFor(svc: ReturnType<typeof createPrivateAiService>) {
  const req = readyRequest(svc);
  return svc.dispatchExecution({ requestId: req.requestId });
}

function contractTestPlan(svc: ReturnType<typeof createPrivateAiService>) {
  Object.assign(svc.getState(), {
    runtimes: svc.getState().runtimes.map((r) =>
      r.id === "prt_external_general_primary"
        ? { ...r, providerHint: "contract-test" }
        : r
    ),
  });
  const created = svc.createInferenceRequest({
    capabilityId: "reasoning",
    prompt: "fixture",
    requester,
    providerId: "contract-test",
    runtimeId: "prt_external_general_primary",
    modelId: "pam_external_general_ref",
    autoSelectRuntime: false,
  });
  const req = svc.validateInferenceRequest(created.requestId);
  return svc.dispatchExecution({
    requestId: req.requestId,
    allowContractTestAdapter: true,
    selectRuntimeIfMissing: false,
  });
}

describe("Private AI Inference Invocation Orchestration V1", () => {
  it("creates an invocation from an execution plan", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const plan = planFor(svc);
    const inv = svc.orchestrateInvocation({ planId: plan.planId });
    expect(inv.invocationId).toMatch(/^inv_/);
    expect(inv.requestId).toBe(plan.requestId);
    expect(inv.executionPlanId).toBe(plan.planId);
    expect(inv.attemptNumber).toBe(1);
    expect(svc.listInvocations()).toHaveLength(1);
  });

  it("enforces legal lifecycle transitions only", () => {
    expect(canTransitionInvocationLifecycle("created", "validating")).toBe(
      true
    );
    expect(canTransitionInvocationLifecycle("succeeded", "failed")).toBe(
      false
    );
    expect(() =>
      assertTransitionInvocationLifecycle("blocked", "ready")
    ).toThrow(/Invalid invocation lifecycle/);
  });

  it("resolves adapter metadata and keeps production adapters non-executable", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const plan = planFor(svc);
    expect(plan.adapterResolution?.ok).toBe(true);
    const inv = svc.orchestrateInvocation({ planId: plan.planId });
    expect(inv.lifecycle).toBe("blocked");
    expect(inv.normalizedResult?.finishReason).toBe(
      "production_adapter_non_executable"
    );
    expect(inv.normalizedResult?.fixtureOnly).toBe(false);
    expect(inv.adapterId).toBe("adapter_external_provider_contract");
  });

  it("runs contract-test full path to fixture success", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const plan = contractTestPlan(svc);
    expect(plan.adapterResolution?.adapterId).toBe(CONTRACT_TEST_ADAPTER_ID);
    const inv = svc.orchestrateInvocation({
      planId: plan.planId,
      allowContractTest: true,
      invokeContractTest: true,
    });
    expect(inv.lifecycle).toBe("succeeded");
    expect(inv.outputEnvelope?.output.fixtureText).toBe(
      CONTRACT_TEST_FIXTURE_TEXT
    );
    expect(inv.normalizedResult?.outputStatus).toBe("fixture_ok");
    expect(inv.normalizedResult?.fixtureOnly).toBe(true);
    const actions = svc.listAuditTrail().map((e) => e.action);
    expect(actions).toContain("invocation_created");
    expect(actions).toContain("invocation_started");
    expect(actions).toContain("adapter_invocation_requested");
    expect(actions).toContain("adapter_result_received");
    expect(actions).toContain("invocation_succeeded");
  });

  it("reuses idempotent and active duplicate invocations", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const plan = planFor(svc);
    // Keep an active attempt via timeout→retry_scheduled
    const first = svc.orchestrateInvocation({
      planId: plan.planId,
      forceTimeoutBefore: true,
      maxAttempts: 3,
      idempotencyKey: "idem-1",
    });
    expect(first.lifecycle).toBe("retry_scheduled");
    const dupActive = svc.orchestrateInvocation({
      planId: plan.planId,
      idempotencyKey: "other",
    });
    expect(dupActive.invocationId).toBe(first.invocationId);
    const dupIdem = svc.orchestrateInvocation({
      planId: plan.planId,
      idempotencyKey: "idem-1",
    });
    expect(dupIdem.invocationId).toBe(first.invocationId);
    expect(
      svc.listAuditTrail().some((e) => e.action === "duplicate_invocation_reused")
    ).toBe(true);
  });

  it("handles timeout before invocation and retry eligibility", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const plan = planFor(svc);
    const inv = svc.orchestrateInvocation({
      planId: plan.planId,
      forceTimeoutBefore: true,
      maxAttempts: 2,
    });
    expect(inv.timeout.timedOut).toBe(true);
    expect(inv.timeout.classification).toBe("timeout_before_invocation");
    expect(["retry_scheduled", "timed_out"]).toContain(inv.lifecycle);
    expect(inv.retry.eligible).toBe(true);
  });

  it("exhausts when max attempts reached on timeout", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const plan = planFor(svc);
    const inv = svc.orchestrateInvocation({
      planId: plan.planId,
      forceTimeoutBefore: true,
      maxAttempts: 1,
    });
    expect(inv.lifecycle).toBe("exhausted");
    expect(
      svc.listAuditTrail().some((e) => e.action === "invocation_exhausted")
    ).toBe(true);
  });

  it("suppresses retry during cooldown", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const plan = planFor(svc);
    const inv = svc.orchestrateInvocation({
      planId: plan.planId,
      forceTimeoutBefore: true,
      maxAttempts: 3,
      retryCooldownMs: 60_000,
      now: "2026-07-31T12:00:00.000Z",
    });
    expect(inv.lifecycle).toBe("retry_scheduled");
    expect(() =>
      svc.scheduleInvocationRetry({
        invocationId: inv.invocationId,
        now: "2026-07-31T12:00:10.000Z",
      })
    ).toThrow(/cooldown/);
  });

  it("cancels before invocation when requested", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const plan = planFor(svc);
    const inv = svc.orchestrateInvocation({
      planId: plan.planId,
      cancelRequested: true,
      cancelReason: "user_abort",
    });
    expect(inv.lifecycle).toBe("cancelled");
    expect(inv.cancellation.accepted).toBe(true);
    expect(inv.normalizedResult?.finishReason).toBe(
      "cancelled_before_invocation"
    );
  });

  it("rejects cancellation when adapter lacks cancellation support", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const plan = planFor(svc);
    const adapter = svc
      .getState()
      .providerAdapters.find(
        (a) => a.adapterId === "adapter_external_provider_contract"
      );
    expect(adapter).toBeTruthy();
    adapter!.supportsCancellation = false;
    const inv = svc.orchestrateInvocation({
      planId: plan.planId,
      cancelRequested: true,
    });
    // cancellation rejected; continues to production non-executable block
    expect(inv.cancellation.rejected).toBe(true);
    expect(inv.cancellation.reason).toBe("adapter_cancellation_unsupported");
    expect(inv.lifecycle).toBe("blocked");
  });

  it("marks timed_out via admin helper and schedules retry metadata", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    // Create a retry_scheduled then move to ready, then mark timed out
    const plan = planFor(svc);
    const timed = svc.orchestrateInvocation({
      planId: plan.planId,
      forceTimeoutBefore: true,
      maxAttempts: 3,
      now: "2026-07-31T12:00:00.000Z",
      retryCooldownMs: 1,
    });
    const retried = svc.scheduleInvocationRetry({
      invocationId: timed.invocationId,
      now: "2026-07-31T12:00:01.000Z",
      cooldownMs: 1,
    });
    expect(retried.lifecycle).toBe("ready");
    const marked = svc.markInvocationTimedOut({
      invocationId: retried.invocationId,
      phase: "awaiting_result",
    });
    expect(marked.lifecycle).toBe("timed_out");
  });

  it("normalizes failures with secret redaction", () => {
    const err = normalizeAdapterError({
      class: "provider_auth_failed",
      rawDetail: "Bearer sk-live-secret api_key=abc",
    });
    expect(err.adminDiagnostic).toMatch(/REDACTED/);
    expect(redactSecretLikeText("password=x")).toMatch(/REDACTED/);
    expect(err.safeMessage).not.toMatch(/sk-live/);
  });

  it("normalizes structured-output-invalid fixture result", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const plan = planFor(svc);
    const req = svc.getInferenceRequest(plan.requestId)!;
    Object.assign(req, {
      structuredOutput: {
        mode: "json",
        schemaId: "s1",
        schemaVersion: "1",
        validateOutput: true,
      },
    });
    const out = buildFixtureOutputEnvelope({
      planId: plan.planId,
      request: req,
      context: plan.context!,
      adapter: createContractTestAdapter(),
      fixtureText: "not-json",
    });
    expect(out.status).toBe("fixture_error");
    expect(out.failure?.class).toBe("structured_output_invalid");
  });

  it("enforces invocation_create permission", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const plan = planFor(svc);
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
    expect(() =>
      svc.orchestrateInvocation({ planId: plan.planId })
    ).toThrow(/invocation_create/);
  });

  it("exposes admin list model for invocations", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const plan = planFor(svc);
    svc.orchestrateInvocation({ planId: plan.planId });
    expect(svc.listInvocations()[0]?.normalizedResult).toBeTruthy();
    expect(svc.getInvocation(svc.listInvocations()[0]!.invocationId)).not.toBeNull();
  });

  it("does not break adapter boundary / routing / execution / requests / runtime ops", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const routed = svc.evaluateProviderRouting({ capabilityId: "reasoning" });
    expect(routed.selectedRuntimeId).toBeTruthy();
    const req = readyRequest(svc);
    const plan = svc.dispatchExecution({ requestId: req.requestId });
    expect(plan.status).toBe("planned");
    expect(plan.adapterResolution?.ok).toBe(true);
    expect(plan.inputEnvelope).not.toBeNull();
    const inv = svc.orchestrateInvocation({ planId: plan.planId });
    expect(inv.executionPlanId).toBe(plan.planId);
    expect(svc.listRuntimes().length).toBeGreaterThan(0);
    expect(svc.listInferenceRequests().length).toBeGreaterThan(0);
  });

  it("treats non-retryable production block as terminal blocked", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const plan = planFor(svc);
    const inv = svc.orchestrateInvocation({ planId: plan.planId });
    expect(inv.lifecycle).toBe("blocked");
    expect(inv.normalizedResult?.retryable).toBe(false);
    expect(inv.active).toBe(false);
  });
});
