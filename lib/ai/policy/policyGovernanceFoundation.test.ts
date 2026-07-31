import { afterEach, describe, expect, it } from "vitest";
import {
  AiPolicyEvaluationEngine,
  AiPolicyRegistry,
  aiGovernanceRegistry,
  aiPolicyRegistry,
  buildDefaultPolicies,
  resetPolicyGovernanceFoundation,
  STRICT_TENANT_POLICY_ID,
} from "./index";
import type { AiTenantPolicy } from "./types";

afterEach(() => {
  resetPolicyGovernanceFoundation();
});

describe("AI Policy & Governance Foundation V1", () => {
  it("registers builtin policies without duplicate ids", () => {
    const policies = buildDefaultPolicies();
    const ids = policies.map((p) => p.policyId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(aiPolicyRegistry.list().length).toBeGreaterThan(10);
  });

  it("resolves capability bindings", () => {
    const binding = aiPolicyRegistry.getBinding("platform.translation_suggest");
    expect(binding?.kind).toBe("capability_binding");
    expect(binding?.safetyPolicyId).toBeTruthy();
    expect(binding?.tenantPolicyId).toBeTruthy();
  });

  it("evaluates allowed tenant/capability policy", () => {
    const engine = new AiPolicyEvaluationEngine();
    const result = engine.evaluate({
      capabilityId: "platform.translation_suggest",
      tenantId: "tenant_a",
      userId: "user_a",
      runtimeId: "shared_ai_gateway",
    });
    expect(result.allowed).toBe(true);
    expect(["allowed", "warning"]).toContain(result.decision);
    expect(result.bindingPolicyId).toContain("platform.translation_suggest");
  });

  it("denies unknown capability binding fail-closed", () => {
    const result = new AiPolicyEvaluationEngine().evaluate({
      capabilityId: "unknown.capability",
      tenantId: "tenant_a",
      userId: "user_a",
    });
    expect(result.allowed).toBe(false);
    expect(result.decision).toBe("denied");
    expect(result.violations.some((v) => v.code === "policy_missing")).toBe(
      true
    );
  });

  it("enforces tenant policy allow/deny lists", () => {
    const engine = new AiPolicyEvaluationEngine();
    const denied = engine.evaluate({
      capabilityId: "platform.diagnostics_probe",
      tenantId: "tenant_strict",
      userId: "user_a",
    });
    expect(denied.allowed).toBe(false);
    expect(denied.violations.some((v) => v.code === "capability_denied")).toBe(
      true
    );

    const allowed = engine.evaluate({
      capabilityId: "platform.translation_suggest",
      tenantId: "tenant_strict",
      userId: "user_a",
    });
    expect(allowed.allowed).toBe(true);
    expect(aiPolicyRegistry.get(STRICT_TENANT_POLICY_ID)?.kind).toBe("tenant");
  });

  it("denies blocked provider and runtime", () => {
    const engine = new AiPolicyEvaluationEngine();
    const providerDenied = engine.evaluate({
      capabilityId: "platform.translation_suggest",
      tenantId: "tenant_a",
      userId: "user_a",
      providerId: "blocked-provider",
    });
    expect(providerDenied.allowed).toBe(false);
    expect(
      providerDenied.violations.some((v) => v.code === "provider_denied")
    ).toBe(true);

    const runtimeDenied = engine.evaluate({
      capabilityId: "platform.translation_suggest",
      tenantId: "tenant_a",
      userId: "user_a",
      runtimeId: "denied-runtime",
    });
    expect(runtimeDenied.allowed).toBe(false);
    expect(
      runtimeDenied.violations.some((v) => v.code === "runtime_denied")
    ).toBe(true);
  });

  it("requires approval for strict moderation bindings", () => {
    const result = new AiPolicyEvaluationEngine().evaluate({
      capabilityId: "platform.diagnostics_probe",
      tenantId: "tenant_a",
      userId: "user_a",
    });
    expect(result.decision).toBe("requires_approval");
    expect(result.requiresApproval).toBe(true);
    expect(result.allowed).toBe(false);

    const approved = new AiPolicyEvaluationEngine().evaluate({
      capabilityId: "platform.diagnostics_probe",
      tenantId: "tenant_a",
      userId: "user_a",
      approvalGranted: true,
    });
    expect(approved.allowed).toBe(true);
  });

  it("supports admin override path", () => {
    const denied = new AiPolicyEvaluationEngine().evaluate({
      capabilityId: "platform.diagnostics_probe",
      tenantId: "tenant_strict",
      userId: "admin",
      isAdmin: true,
    });
    expect(denied.decision).toBe("requires_admin_override");
    expect(denied.requiresAdminOverride).toBe(true);

    const overridden = new AiPolicyEvaluationEngine().evaluate({
      capabilityId: "platform.diagnostics_probe",
      tenantId: "tenant_strict",
      userId: "admin",
      isAdmin: true,
      adminOverride: true,
    });
    expect(overridden.allowed).toBe(true);
  });

  it("tracks policy versioning and lifecycle", () => {
    const registry = aiPolicyRegistry;
    const original = registry.get("policy.tenant.default.v1") as AiTenantPolicy;
    const next = {
      ...original,
      policyId: "policy.tenant.default.v2",
      version: "ai-policy-governance-foundation-v1+v2",
      supersedesPolicyId: original.policyId,
      displayName: "Default tenant policy v2",
    } satisfies AiTenantPolicy;
    registry.register(next);
    expect(registry.listVersions("policy.tenant.default.v1").length).toBeGreaterThan(
      1
    );
    registry.advanceLifecycle("policy.tenant.default.v1", "deprecated");
    expect(registry.get("policy.tenant.default.v1")?.lifecycle).toBe(
      "deprecated"
    );
    expect(() =>
      registry.advanceLifecycle("policy.tenant.default.v1", "draft")
    ).toThrow(/Invalid policy lifecycle/);
  });

  it("governance registry lists related policies", () => {
    const gov = aiGovernanceRegistry.list();
    expect(gov.length).toBeGreaterThan(0);
    const related = aiGovernanceRegistry.relatedPolicies(gov[0]!.policyId);
    expect(related.length).toBeGreaterThan(0);
    aiGovernanceRegistry.advanceLifecycle(gov[0]!.policyId, "deprecated");
    expect(aiGovernanceRegistry.get(gov[0]!.policyId)?.lifecycle).toBe(
      "deprecated"
    );
  });

  it("records evaluation log for auditability", () => {
    new AiPolicyEvaluationEngine().evaluate({
      capabilityId: "platform.translation_suggest",
      tenantId: "tenant_a",
      userId: "user_a",
    });
    const log = aiPolicyRegistry.listEvaluationLog(10);
    expect(log.some((e) => e.capabilityId === "platform.translation_suggest")).toBe(
      true
    );
  });

  it("rejects duplicate policy registration", () => {
    const registry = new AiPolicyRegistry();
    const existing = registry.list()[0]!;
    expect(() => registry.register({ ...existing })).toThrow(/Duplicate/i);
  });

  it("denies unauthenticated when required", () => {
    const result = new AiPolicyEvaluationEngine().evaluate({
      capabilityId: "platform.translation_suggest",
      tenantId: "tenant_a",
      userId: null,
    });
    expect(result.allowed).toBe(false);
    expect(result.violations.some((v) => v.code === "unauthenticated")).toBe(
      true
    );
  });
});
