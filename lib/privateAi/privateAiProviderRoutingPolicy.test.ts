import { afterEach, describe, expect, it } from "vitest";
import {
  createPrivateAiService,
  evaluateProviderRouting,
  resetPrivateAiForTests,
  type ProviderCatalogEntry,
} from "./index";
import { createEmptyRuntimeOpsState } from "./runtimeOpsState";

afterEach(() => {
  resetPrivateAiForTests();
});

function dualReasoningCatalog(): ProviderCatalogEntry[] {
  return [
    {
      id: "external-provider-contract",
      label: "External",
      priority: 10,
      capabilities: ["reasoning"],
      regions: ["eu-central", "eu-west"],
      costTier: "standard",
      enabled: true,
      notes: "",
    },
    {
      id: "umtuba-private",
      label: "Private",
      priority: 20,
      capabilities: ["reasoning", "translation"],
      regions: ["eu-central"],
      costTier: "low",
      enabled: true,
      notes: "",
    },
    {
      id: "umtuba-local",
      label: "Local",
      priority: 30,
      capabilities: ["reasoning"],
      regions: ["us-east"],
      costTier: "premium",
      enabled: true,
      notes: "",
    },
  ];
}

function makeReadySecondaryRuntime(
  svc: ReturnType<typeof createPrivateAiService>
) {
  const state = svc.getState();
  const model = state.models.find((m) => m.id === "pam_external_general_ref");
  if (!model) throw new Error("missing seed model");
  Object.assign(state, {
    models: state.models.map((m) =>
      m.id === "pam_umtuba_translator_private"
        ? {
            ...m,
            lifecycle: "approved" as const,
            capabilities: ["translation", "reasoning"] as typeof m.capabilities,
          }
        : m
    ),
    runtimes: [
      ...state.runtimes,
      {
        id: "prt_private_reasoning_ready",
        modelId: "pam_umtuba_translator_private",
        label: "Private Reasoning Ready",
        providerHint: "umtuba-private",
        region: "eu-central",
        costTier: "low" as const,
        priority: 15,
        deploymentState: "ready" as const,
        runtimeState: "running" as const,
        capabilityIds: ["reasoning" as const],
        hardwareContractId: "hw_gpu_internal",
        deploymentProfileId: "internal" as const,
        routingContractIds: ["route_reasoning_v1"],
        availability: "available" as const,
        health: {
          ...state.runtimes[0]!.health,
          status: "healthy" as const,
          availability: "available" as const,
        },
        failoverRuntimeIds: [],
        ops: createEmptyRuntimeOpsState(),
        notes: "Test runtime",
        createdAt: state.updatedAt,
        updatedAt: state.updatedAt,
      },
      {
        id: "prt_local_reasoning_ready",
        modelId: "pam_external_general_ref",
        label: "Local Reasoning Ready",
        providerHint: "umtuba-local",
        region: "us-east",
        costTier: "premium" as const,
        priority: 25,
        deploymentState: "ready" as const,
        runtimeState: "running" as const,
        capabilityIds: ["reasoning" as const],
        hardwareContractId: null,
        deploymentProfileId: "internal" as const,
        routingContractIds: ["route_reasoning_v1"],
        availability: "available" as const,
        health: {
          ...state.runtimes[0]!.health,
          status: "healthy" as const,
          availability: "available" as const,
        },
        failoverRuntimeIds: [],
        ops: createEmptyRuntimeOpsState(),
        notes: "Test runtime",
        createdAt: state.updatedAt,
        updatedAt: state.updatedAt,
      },
    ],
  });
}

describe("Private AI Provider Routing Policy V1", () => {
  it("selects preferred eligible provider with runtime", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    makeReadySecondaryRuntime(svc);
    svc.updateProviderRoutingPolicy({
      providers: dualReasoningCatalog(),
      preferredProviderId: "external-provider-contract",
      blacklist: [],
      whitelist: null,
    });
    const result = svc.evaluateProviderRouting({ capabilityId: "reasoning" });
    expect(result.selectedProviderId).toBe("external-provider-contract");
    expect(result.selectedRuntimeId).toBe("prt_external_general_primary");
    expect(result.selectionReason).toBe("preferred_provider");
    expect(result.policyVersion).toBe("provider-routing-v1");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("builds fallback chain after selected provider", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    makeReadySecondaryRuntime(svc);
    svc.updateProviderRoutingPolicy({
      providers: dualReasoningCatalog(),
      preferredProviderId: "external-provider-contract",
      fallbackProviderIds: ["umtuba-private", "umtuba-local"],
    });
    const result = evaluateProviderRouting(svc.getState(), {
      capabilityId: "reasoning",
    });
    expect(result.selectedProviderId).toBe("external-provider-contract");
    expect(result.fallbackChain[0]).toBe("umtuba-private");
    expect(result.fallbackChain).toContain("umtuba-local");
  });

  it("respects blacklist", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    makeReadySecondaryRuntime(svc);
    svc.updateProviderRoutingPolicy({
      providers: dualReasoningCatalog(),
      preferredProviderId: "external-provider-contract",
      blacklist: ["external-provider-contract"],
    });
    const result = evaluateProviderRouting(svc.getState(), {
      capabilityId: "reasoning",
    });
    expect(result.selectedProviderId).toBe("umtuba-private");
    expect(
      result.rejected.some(
        (r) =>
          r.providerId === "external-provider-contract" &&
          r.reasons.includes("blacklisted")
      )
    ).toBe(true);
  });

  it("respects whitelist", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    makeReadySecondaryRuntime(svc);
    svc.updateProviderRoutingPolicy({
      providers: dualReasoningCatalog(),
      preferredProviderId: "external-provider-contract",
      whitelist: ["umtuba-private"],
    });
    const result = evaluateProviderRouting(svc.getState(), {
      capabilityId: "reasoning",
    });
    expect(result.selectedProviderId).toBe("umtuba-private");
    expect(
      result.rejected.some((r) => r.reasons.includes("not_whitelisted"))
    ).toBe(true);
  });

  it("rejects providers in maintenance", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    makeReadySecondaryRuntime(svc);
    const state = svc.getState();
    Object.assign(state, {
      runtimes: state.runtimes.map((r) =>
        r.id === "prt_external_general_primary"
          ? {
              ...r,
              ops: {
                ...r.ops,
                maintenance: {
                  active: true,
                  reason: "patch",
                  scheduledAt: null,
                  enteredAt: state.updatedAt,
                },
              },
            }
          : r
      ),
    });
    svc.updateProviderRoutingPolicy({
      providers: dualReasoningCatalog(),
      preferredProviderId: "external-provider-contract",
      respectMaintenance: true,
    });
    const result = evaluateProviderRouting(svc.getState(), {
      capabilityId: "reasoning",
    });
    expect(result.selectedProviderId).not.toBe("external-provider-contract");
    expect(
      result.rejected.some(
        (r) =>
          r.providerId === "external-provider-contract" &&
          r.reasons.includes("maintenance")
      )
    ).toBe(true);
  });

  it("rejects providers in cooldown", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    makeReadySecondaryRuntime(svc);
    const now = "2026-07-31T12:00:00.000Z";
    const state = svc.getState();
    Object.assign(state, {
      runtimes: state.runtimes.map((r) =>
        r.id === "prt_external_general_primary"
          ? {
              ...r,
              ops: {
                ...r.ops,
                cooldownUntil: "2026-07-31T12:30:00.000Z",
              },
            }
          : r
      ),
    });
    svc.updateProviderRoutingPolicy({
      providers: dualReasoningCatalog(),
      preferredProviderId: "external-provider-contract",
      respectCooldown: true,
    });
    const result = evaluateProviderRouting(svc.getState(), {
      capabilityId: "reasoning",
      now,
    });
    expect(
      result.rejected.some((r) => r.reasons.includes("cooldown_active"))
    ).toBe(true);
    expect(result.selectedProviderId).toBe("umtuba-private");
  });

  it("rejects region mismatches", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    makeReadySecondaryRuntime(svc);
    svc.updateProviderRoutingPolicy({
      providers: dualReasoningCatalog(),
      preferredProviderId: null,
      preferRegion: "us-east",
    });
    const result = evaluateProviderRouting(svc.getState(), {
      capabilityId: "reasoning",
      region: "us-east",
    });
    expect(result.selectedProviderId).toBe("umtuba-local");
    expect(
      result.rejected.some((r) => r.reasons.includes("region_mismatch"))
    ).toBe(true);
  });

  it("enforces cost tier / budget policy", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    makeReadySecondaryRuntime(svc);
    svc.updateProviderRoutingPolicy({
      providers: dualReasoningCatalog(),
      preferredProviderId: "umtuba-local",
      maxCostTier: "standard",
      allowPremiumCost: false,
    });
    const result = evaluateProviderRouting(svc.getState(), {
      capabilityId: "reasoning",
    });
    expect(
      result.rejected.some(
        (r) =>
          r.providerId === "umtuba-local" &&
          (r.reasons.includes("budget_policy_cost_exceeded") ||
            r.reasons.includes("cost_tier_blocked"))
      )
    ).toBe(true);
    expect(result.selectedProviderId).not.toBe("umtuba-local");
  });

  it("honors manual override fail-closed", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    makeReadySecondaryRuntime(svc);
    svc.updateProviderRoutingPolicy({
      providers: dualReasoningCatalog(),
      preferredProviderId: "external-provider-contract",
      manualOverrideProviderId: "umtuba-private",
    });
    const ok = evaluateProviderRouting(svc.getState(), {
      capabilityId: "reasoning",
    });
    expect(ok.selectedProviderId).toBe("umtuba-private");
    expect(ok.selectionReason).toBe("manual_override");

    svc.updateProviderRoutingPolicy({
      manualOverrideProviderId: "external-provider-contract",
      blacklist: ["external-provider-contract"],
    });
    const blocked = evaluateProviderRouting(svc.getState(), {
      capabilityId: "reasoning",
    });
    expect(blocked.selectedProviderId).toBeNull();
    expect(blocked.selectionReason).toBe("manual_override_blocked");
  });

  it("honors tenant preferred provider policy", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    makeReadySecondaryRuntime(svc);
    svc.updateProviderRoutingPolicy({
      providers: dualReasoningCatalog(),
      preferredProviderId: "external-provider-contract",
      tenantPreferredProviders: {
        tenant_a: "umtuba-private",
      },
    });
    const result = evaluateProviderRouting(svc.getState(), {
      capabilityId: "reasoning",
      tenantId: "tenant_a",
    });
    expect(result.selectedProviderId).toBe("umtuba-private");
    expect(result.selectionReason).toBe("tenant_policy");
  });

  it("rejects when runtime readiness or deployment not ready", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    makeReadySecondaryRuntime(svc);
    const state = svc.getState();
    Object.assign(state, {
      runtimes: state.runtimes.map((r) =>
        r.providerHint === "umtuba-private"
          ? { ...r, deploymentState: "pending" as const }
          : r.id === "prt_external_general_primary"
            ? { ...r, deploymentState: "offline" as const }
            : r
      ),
    });
    svc.updateProviderRoutingPolicy({
      providers: dualReasoningCatalog(),
      preferredProviderId: "external-provider-contract",
      whitelist: ["external-provider-contract", "umtuba-private"],
    });
    const result = evaluateProviderRouting(svc.getState(), {
      capabilityId: "reasoning",
    });
    expect(
      result.rejected.some((r) =>
        r.reasons.some(
          (x) =>
            x.startsWith("deployment_") || x.startsWith("readiness_deployment_")
        )
      )
    ).toBe(true);
  });

  it("respects failure suppression window", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    makeReadySecondaryRuntime(svc);
    const now = "2026-07-31T12:00:00.000Z";
    const state = svc.getState();
    Object.assign(state, {
      runtimes: state.runtimes.map((r) =>
        r.id === "prt_external_general_primary"
          ? {
              ...r,
              ops: {
                ...r.ops,
                lastFailoverAt: "2026-07-31T11:59:45.000Z",
              },
            }
          : r
      ),
    });
    svc.updateProviderRoutingPolicy({
      providers: dualReasoningCatalog(),
      preferredProviderId: "external-provider-contract",
      respectFailureSuppression: true,
    });
    const result = evaluateProviderRouting(svc.getState(), {
      capabilityId: "reasoning",
      now,
    });
    expect(
      result.rejected.some((r) => r.reasons.includes("failure_suppressed"))
    ).toBe(true);
    expect(result.selectedProviderId).toBe("umtuba-private");
  });

  it("does not invoke providers — policy evaluation only", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const result = svc.evaluateProviderRouting({ capabilityId: "reasoning" });
    expect(result.evaluatedAt).toBeTruthy();
    expect(svc.listProviderRoutingEvaluations()[0]?.selectedProviderId).toBe(
      result.selectedProviderId
    );
    expect(svc.listExecutionPlans()).toHaveLength(0);
  });
});
