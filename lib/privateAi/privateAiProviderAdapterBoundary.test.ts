import { afterEach, describe, expect, it } from "vitest";
import {
  advanceAdapterLifecycle,
  applyAdapterBoundary,
  buildExecutionInputEnvelope,
  canTransitionAdapterLifecycle,
  CONTRACT_TEST_ADAPTER_ID,
  CONTRACT_TEST_FIXTURE_TEXT,
  createContractTestAdapter,
  createExternalContractAdapter,
  createPrivateAiService,
  dispatchInferenceExecution,
  normalizeAdapterError,
  redactSecretLikeText,
  registerProviderAdapter,
  resetPrivateAiForTests,
  validateExecutionInputEnvelope,
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
    prompt: "adapter boundary only",
    requester,
  });
  return svc.validateInferenceRequest(created.requestId);
}

describe("Private AI Provider Adapter Boundary V1", () => {
  it("registers a valid adapter", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: false });
    Object.assign(svc.getState(), { providerAdapters: [] });
    const adapter = createExternalContractAdapter();
    const registered = svc.registerProviderAdapter(adapter);
    expect(registered.adapterId).toBe(adapter.adapterId);
    expect(svc.listProviderAdapters()).toHaveLength(1);
  });

  it("rejects duplicate adapter registration", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    expect(() =>
      svc.registerProviderAdapter(createExternalContractAdapter())
    ).toThrow(/Duplicate adapter/);
  });

  it("looks up adapters by provider/capability", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const hit = svc.getProviderAdapter("adapter_external_provider_contract");
    expect(hit?.providerId).toBe("external-provider-contract");
    const neg = svc.negotiateAdapter({
      providerId: "external-provider-contract",
      capabilityId: "reasoning",
      modelId: "pam_external_general_ref",
      runtimeKind: "external",
    });
    expect(neg.negotiation.ok).toBe(true);
    expect(neg.adapter?.adapterId).toBe("adapter_external_provider_contract");
  });

  it("enforces adapter lifecycle transitions", () => {
    expect(canTransitionAdapterLifecycle("ready", "degraded")).toBe(true);
    expect(canTransitionAdapterLifecycle("retired", "ready")).toBe(false);
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const next = svc.advanceAdapterLifecycle({
      adapterId: "adapter_external_provider_contract",
      to: "degraded",
    });
    expect(next.lifecycle).toBe("degraded");
    expect(() =>
      svc.advanceAdapterLifecycle({
        adapterId: "adapter_external_provider_contract",
        to: "registered",
      })
    ).toThrow(/Invalid adapter lifecycle/);
  });

  it("negotiates capability / model / runtime compatibility", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const badCap = svc.negotiateAdapter({
      providerId: "external-provider-contract",
      capabilityId: "translation",
      runtimeKind: "external",
    });
    expect(badCap.negotiation.ok).toBe(false);
    expect(
      badCap.negotiation.rejected.some((r) =>
        r.reasons.includes("capability_unsupported")
      )
    ).toBe(true);

    Object.assign(svc.getState(), {
      providerAdapters: svc.getState().providerAdapters.map((a) =>
        a.adapterId === "adapter_external_provider_contract"
          ? { ...a, supportedModels: ["pam_external_general_ref"] }
          : a
      ),
    });
    const badModel = svc.negotiateAdapter({
      providerId: "external-provider-contract",
      capabilityId: "reasoning",
      modelId: "unknown_model_xyz",
      runtimeKind: "external",
    });
    expect(
      badModel.negotiation.rejected.some((r) =>
        r.reasons.includes("model_unsupported")
      )
    ).toBe(true);
  });

  it("checks structured output and streaming compatibility", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const state = svc.getState();
    Object.assign(state, {
      providerAdapters: state.providerAdapters.map((a) =>
        a.adapterId === "adapter_external_provider_contract"
          ? {
              ...a,
              supportsStreaming: false,
              supportsStructuredOutput: false,
            }
          : a
      ),
    });
    const stream = svc.negotiateAdapter({
      providerId: "external-provider-contract",
      capabilityId: "reasoning",
      requireStreaming: true,
    });
    expect(
      stream.negotiation.rejected.some((r) =>
        r.reasons.includes("streaming_unsupported")
      )
    ).toBe(true);
    const structured = svc.negotiateAdapter({
      providerId: "external-provider-contract",
      capabilityId: "reasoning",
      requireStructuredOutput: true,
    });
    expect(
      structured.negotiation.rejected.some((r) =>
        r.reasons.includes("structured_output_unsupported")
      )
    ).toBe(true);
  });

  it("checks timeout/cancellation compatibility", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    Object.assign(svc.getState(), {
      providerAdapters: svc.getState().providerAdapters.map((a) =>
        a.adapterId === "adapter_external_provider_contract"
          ? { ...a, supportsTimeout: false, supportsCancellation: false }
          : a
      ),
    });
    const result = svc.negotiateAdapter({
      providerId: "external-provider-contract",
      capabilityId: "reasoning",
      requireTimeout: true,
      requireCancellation: true,
    });
    expect(
      result.negotiation.rejected.some((r) =>
        r.reasons.includes("timeout_unsupported")
      )
    ).toBe(true);
    expect(
      result.negotiation.rejected.some((r) =>
        r.reasons.includes("cancellation_unsupported")
      )
    ).toBe(true);
  });

  it("builds and validates execution input envelope without secrets", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const req = readyRequest(svc);
    const plan = svc.dispatchExecution({ requestId: req.requestId });
    expect(plan.inputEnvelope).not.toBeNull();
    expect(plan.inputEnvelope?.normalizedInput.hasPrompt).toBe(true);
    expect(plan.inputEnvelope?.notes).toMatch(/no secrets/i);
    expect(JSON.stringify(plan.inputEnvelope)).not.toMatch(/api[_-]?key/i);
    const check = validateExecutionInputEnvelope(plan.inputEnvelope!);
    expect(check.ok).toBe(true);
  });

  it("normalizes output envelopes and errors with redaction", () => {
    const err = normalizeAdapterError({
      class: "provider_auth_failed",
      rawDetail: "Authorization: Bearer sk-secret-123 api_key=abc",
    });
    expect(err.safeMessage).not.toMatch(/sk-secret/);
    expect(err.adminDiagnostic).toMatch(/REDACTED/);
    expect(err.redacted).toBe(true);
    expect(redactSecretLikeText("token=xyz password=1")).toMatch(/REDACTED/);
  });

  it("treats unavailable / no eligible adapter as fail-closed", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    Object.assign(svc.getState(), {
      providerAdapters: svc.getState().providerAdapters.map((a) => ({
        ...a,
        available: false,
        lifecycle: "unavailable" as const,
        readiness: {
          ready: false,
          blockers: ["unavailable"],
          evaluatedAt: new Date().toISOString(),
        },
      })),
    });
    const req = readyRequest(svc);
    const plan = svc.dispatchExecution({ requestId: req.requestId });
    expect(plan.status).toBe("blocked");
    expect(plan.adapterResolution?.ok).toBe(false);
    expect(plan.adapterResolution?.failureClass).toBeTruthy();
  });

  it("keeps contract-test adapter out of production negotiation", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const prod = svc.negotiateAdapter({
      providerId: "contract-test",
      capabilityId: "reasoning",
      allowContractTest: false,
    });
    expect(prod.negotiation.ok).toBe(false);
    expect(
      prod.negotiation.rejected.some((r) =>
        r.reasons.includes("contract_test_not_allowed")
      )
    ).toBe(true);

    const allowed = svc.negotiateAdapter({
      providerId: "contract-test",
      capabilityId: "reasoning",
      runtimeKind: "contract_test",
      allowContractTest: true,
    });
    expect(allowed.negotiation.ok).toBe(true);
    expect(allowed.adapter?.adapterId).toBe(CONTRACT_TEST_ADAPTER_ID);
  });

  it("invokes contract-test fixture only when explicitly requested", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
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
    expect(req.lifecycle).not.toBe("rejected");
    const plan = svc.dispatchExecution({
      requestId: req.requestId,
      allowContractTestAdapter: true,
      invokeContractTestAdapter: true,
      selectRuntimeIfMissing: false,
    });
    expect(plan.status).toBe("planned");
    expect(plan.adapterResolution?.adapterId).toBe(CONTRACT_TEST_ADAPTER_ID);
    expect(plan.outputEnvelope?.status).toBe("fixture_ok");
    expect(plan.outputEnvelope?.output.fixtureText).toBe(
      CONTRACT_TEST_FIXTURE_TEXT
    );
    expect(plan.notes).toMatch(/does not invoke live providers/);
  });

  it("integrates dispatcher with adapter resolution and audit linkage", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const req = readyRequest(svc);
    const plan = svc.dispatchExecution({ requestId: req.requestId });
    expect(plan.status).toBe("planned");
    expect(plan.adapterResolution?.ok).toBe(true);
    expect(plan.adapterResolution?.adapterId).toBe(
      "adapter_external_provider_contract"
    );
    expect(plan.inputEnvelope?.executionPlanId).toBe(plan.planId);
    expect(plan.outputEnvelope?.status).toBe("not_executed");
    expect(plan.adapterResolution?.auditEventId).toBeTruthy();
    expect(
      svc.listAuditTrail().some((e) => e.action === "adapter_resolved")
    ).toBe(true);
  });

  it("exposes admin-facing adapter list model", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const adapters = svc.listProviderAdapters();
    expect(adapters.length).toBeGreaterThanOrEqual(2);
    expect(adapters.some((a) => a.productionEnabled)).toBe(true);
    expect(
      adapters.some(
        (a) => a.adapterId === CONTRACT_TEST_ADAPTER_ID && !a.productionEnabled
      )
    ).toBe(true);
  });

  it("does not break prior boundary layers", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const routed = svc.evaluateProviderRouting({ capabilityId: "reasoning" });
    expect(routed.selectedRuntimeId).toBeTruthy();
    const req = readyRequest(svc);
    const direct = dispatchInferenceExecution(svc.getState(), {
      requestId: req.requestId,
    });
    expect(direct.plan.context).not.toBeNull();
    expect(direct.auditEntries.length).toBeGreaterThan(0);
  });

  it("registers via pure registry helper and advances lifecycle", () => {
    let state = createPrivateAiService({ ephemeral: true, seed: false }).getState();
    Object.assign(state, { providerAdapters: [] });
    const a = createContractTestAdapter();
    state = registerProviderAdapter(state, a);
    state = advanceAdapterLifecycle(state, a.adapterId, "disabled");
    expect(
      state.providerAdapters.find((x) => x.adapterId === a.adapterId)?.lifecycle
    ).toBe("disabled");
  });

  it("applyAdapterBoundary builds envelopes from context", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const req = readyRequest(svc);
    const planned = svc.dispatchExecution({ requestId: req.requestId });
    const again = applyAdapterBoundary({
      state: svc.getState(),
      planId: planned.planId,
      request: svc.getInferenceRequest(req.requestId)!,
      context: planned.context!,
    });
    expect(again.resolution.ok).toBe(true);
    expect(again.inputEnvelope?.adapterId).toBe(
      "adapter_external_provider_contract"
    );
    const rebuilt = buildExecutionInputEnvelope({
      planId: planned.planId,
      request: svc.getInferenceRequest(req.requestId)!,
      context: planned.context!,
      adapter: svc.getProviderAdapter("adapter_external_provider_contract")!,
    });
    expect(rebuilt.correlationId).toBe(planned.context!.correlationId);
  });
});
