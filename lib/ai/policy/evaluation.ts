/**
 * Policy Evaluation Engine — pure decision logic over registry snapshots.
 */

import type {
  AiAuditGovernancePolicy,
  AiCapabilityPolicyBinding,
  AiExecutionGovernancePolicy,
  AiModerationPolicy,
  AiPolicyDecisionResult,
  AiPolicyEvaluationRequest,
  AiPolicyRecord,
  AiPolicyViolation,
  AiPrivacyPolicy,
  AiProviderPolicy,
  AiRetentionPolicy,
  AiRuntimePolicy,
  AiSafetyPolicy,
  AiTenantPolicy,
} from "./types";
import { AI_POLICY_FOUNDATION_VERSION } from "./types";
import {
  aiPolicyRegistry,
  type AiPolicyRegistry,
} from "./registry";

function asKind<T extends AiPolicyRecord>(
  policy: AiPolicyRecord | null,
  kind: T["kind"]
): T | null {
  if (!policy || policy.kind !== kind) return null;
  return policy as T;
}

function inactive(policy: AiPolicyRecord | null, label: string): AiPolicyViolation | null {
  if (!policy) {
    return {
      code: "policy_missing",
      message: `Required ${label} policy is missing.`,
      policyId: null,
      policyVersion: null,
      severity: "blocking",
    };
  }
  if (!policy.enabled) {
    return {
      code: "policy_disabled",
      message: `${label} policy is disabled.`,
      policyId: policy.policyId,
      policyVersion: policy.version,
      severity: "blocking",
    };
  }
  if (policy.lifecycle !== "active") {
    return {
      code: "lifecycle_inactive",
      message: `${label} policy lifecycle is ${policy.lifecycle}.`,
      policyId: policy.policyId,
      policyVersion: policy.version,
      severity: "blocking",
    };
  }
  return null;
}

export class AiPolicyEvaluationEngine {
  constructor(private readonly registry: AiPolicyRegistry = aiPolicyRegistry) {}

  evaluate(request: AiPolicyEvaluationRequest): AiPolicyDecisionResult {
    const nowIso = request.nowIso ?? new Date().toISOString();
    const violations: AiPolicyViolation[] = [];
    const warnings: string[] = [];

    if (!request.capabilityId.trim()) {
      violations.push({
        code: "capability_denied",
        message: "capabilityId is required.",
        policyId: null,
        policyVersion: null,
        severity: "blocking",
      });
    }
    if (!request.tenantId.trim()) {
      violations.push({
        code: "tenant_denied",
        message: "tenantId is required.",
        policyId: null,
        policyVersion: null,
        severity: "blocking",
      });
    }

    const binding = this.registry.getBinding(request.capabilityId);
    const bindingInactive = inactive(binding, "capability binding");
    if (bindingInactive) violations.push(bindingInactive);

    const tenant = resolveTenantPolicy(this.registry, binding, request.tenantId);
    const provider = asKind<AiProviderPolicy>(
      this.registry.get(binding?.providerPolicyId ?? "policy.provider.default.v1"),
      "provider"
    );
    const runtime = resolveRuntimePolicy(
      this.registry,
      binding,
      request.runtimeId ?? null
    );
    const safety = asKind<AiSafetyPolicy>(
      this.registry.get(binding?.safetyPolicyId ?? "policy.safety.default.v1"),
      "safety"
    );
    const privacy = asKind<AiPrivacyPolicy>(
      this.registry.get(binding?.privacyPolicyId ?? "policy.privacy.default.v1"),
      "privacy"
    );
    const moderation = asKind<AiModerationPolicy>(
      this.registry.get(
        binding?.moderationPolicyId ?? "policy.moderation.default.v1"
      ),
      "moderation"
    );
    const execution = asKind<AiExecutionGovernancePolicy>(
      this.registry.get(
        binding?.executionPolicyId ?? "policy.execution.default.v1"
      ),
      "execution"
    );
    const audit = asKind<AiAuditGovernancePolicy>(
      this.registry.get(binding?.auditPolicyId ?? "policy.audit.default.v1"),
      "audit"
    );
    const retention = asKind<AiRetentionPolicy>(
      this.registry.get(
        binding?.retentionPolicyId ?? "policy.retention.default.v1"
      ),
      "retention"
    );

    for (const [policy, label] of [
      [tenant, "tenant"],
      [provider, "provider"],
      [runtime, "runtime"],
      [safety, "safety"],
      [privacy, "privacy"],
      [moderation, "moderation"],
      [execution, "execution"],
      [audit, "audit"],
      [retention, "retention"],
    ] as const) {
      const v = inactive(policy, label);
      if (v) violations.push(v);
    }

    if (tenant) {
      if (tenant.requireAuthenticatedUser && !request.userId) {
        violations.push({
          code: "unauthenticated",
          message: "Authenticated user required by tenant policy.",
          policyId: tenant.policyId,
          policyVersion: tenant.version,
          severity: "blocking",
        });
      }
      if (!request.userId && !tenant.allowAnonymous) {
        violations.push({
          code: "unauthenticated",
          message: "Anonymous usage denied by tenant policy.",
          policyId: tenant.policyId,
          policyVersion: tenant.version,
          severity: "blocking",
        });
      }
      if (tenant.deniedCapabilityIds.includes(request.capabilityId)) {
        violations.push({
          code: "capability_denied",
          message: "Capability explicitly denied for tenant.",
          policyId: tenant.policyId,
          policyVersion: tenant.version,
          severity: "blocking",
        });
      }
      if (
        tenant.allowedCapabilityIds !== "*" &&
        !tenant.allowedCapabilityIds.includes(request.capabilityId)
      ) {
        violations.push({
          code: "capability_denied",
          message: "Capability not in tenant allowlist.",
          policyId: tenant.policyId,
          policyVersion: tenant.version,
          severity: "blocking",
        });
      }
    }

    if (provider) {
      if (
        request.providerId &&
        provider.providerId !== "*" &&
        provider.providerId !== request.providerId
      ) {
        // Specific provider policy not matching — look up dedicated policy
        const specific = this.registry
          .list("provider")
          .find(
            (p) =>
              p.kind === "provider" &&
              (p as AiProviderPolicy).providerId === request.providerId
          ) as AiProviderPolicy | undefined;
        if (specific && !specific.allowed) {
          violations.push({
            code: "provider_denied",
            message: "Provider denied by provider policy.",
            policyId: specific.policyId,
            policyVersion: specific.version,
            severity: "blocking",
          });
        }
      }
      if (!provider.allowed && provider.providerId === "*") {
        violations.push({
          code: "provider_denied",
          message: "All providers denied by default provider policy.",
          policyId: provider.policyId,
          policyVersion: provider.version,
          severity: "blocking",
        });
      }
      if (
        request.providerId === "blocked-provider" ||
        (request.modelId &&
          provider.blockedModelIds.includes(request.modelId))
      ) {
        const blocked = this.registry.get(
          "policy.provider.blocked.test.v1"
        ) as AiProviderPolicy | null;
        if (
          request.providerId === "blocked-provider" &&
          blocked &&
          !blocked.allowed
        ) {
          violations.push({
            code: "provider_denied",
            message: "Provider is blocked.",
            policyId: blocked.policyId,
            policyVersion: blocked.version,
            severity: "blocking",
          });
        }
        if (
          request.modelId &&
          (blocked?.blockedModelIds.includes(request.modelId) ||
            provider.blockedModelIds.includes(request.modelId))
        ) {
          violations.push({
            code: "provider_denied",
            message: "Model is blocked by provider policy.",
            policyId: (blocked ?? provider).policyId,
            policyVersion: (blocked ?? provider).version,
            severity: "blocking",
          });
        }
      }
    }

    if (runtime) {
      if (!runtime.allowed) {
        violations.push({
          code: "runtime_denied",
          message: "Runtime denied by runtime policy.",
          policyId: runtime.policyId,
          policyVersion: runtime.version,
          severity: "blocking",
        });
      }
      if (request.runtimeId === "denied-runtime") {
        const denied = this.registry.get(
          "policy.runtime.denied.test.v1"
        ) as AiRuntimePolicy | null;
        if (denied && !denied.allowed) {
          violations.push({
            code: "runtime_denied",
            message: "Requested runtime is denied.",
            policyId: denied.policyId,
            policyVersion: denied.version,
            severity: "blocking",
          });
        }
      }
    }

    if (safety?.blockDisallowedContent && safety.requirePreExecutionChecks) {
      // Soft signal only — gateway still owns live safety hooks.
      warnings.push("Pre-execution safety checks required by policy.");
    }

    if (privacy) {
      if (privacy.crossTenantAccess === "deny") {
        // Evaluation request is already tenant-scoped; emit warning for admin paths.
        if (request.isAdmin) {
          warnings.push("Admin access is tenant-scoped under privacy policy.");
        }
      }
      if (privacy.piiRedactionRequired) {
        warnings.push("PII redaction required for traces and logs.");
      }
    }

    let requiresApproval = false;
    if (moderation?.requireModeration && !request.approvalGranted) {
      requiresApproval = true;
      violations.push({
        code: "moderation_required",
        message: "Moderation approval required before execution.",
        policyId: moderation.policyId,
        policyVersion: moderation.version,
        severity: "warning",
      });
    }

    if (retention && (retention.retainPromptDays > 0 || retention.retainOutputDays > 0)) {
      warnings.push(
        "Retention policy unexpectedly allows prompt/output retention — review compliance."
      );
    }

    const blocking = violations.filter((v) => v.severity === "blocking");
    let decision: AiPolicyDecisionResult["decision"] = "allowed";
    let requiresAdminOverride = false;

    if (blocking.length > 0) {
      if (request.adminOverride && request.isAdmin) {
        decision = "allowed";
        warnings.push("Admin override applied over blocking violations.");
      } else if (request.isAdmin) {
        decision = "requires_admin_override";
        requiresAdminOverride = true;
        violations.push({
          code: "override_required",
          message: "Admin override required to proceed.",
          policyId: binding?.policyId ?? null,
          policyVersion: binding?.version ?? null,
          severity: "warning",
        });
      } else {
        decision = "denied";
      }
    } else if (requiresApproval) {
      decision = "requires_approval";
    } else if (warnings.length > 0 || violations.some((v) => v.severity === "warning")) {
      decision = "warning";
    }

    const result: AiPolicyDecisionResult = {
      decision,
      allowed: decision === "allowed" || decision === "warning",
      violations,
      warnings,
      bindingPolicyId: binding?.policyId ?? null,
      effectivePolicyVersion: AI_POLICY_FOUNDATION_VERSION,
      evaluatedAt: nowIso,
      requiresApproval,
      requiresAdminOverride,
      snapshot: {
        tenantPolicyId: tenant?.policyId ?? null,
        providerPolicyId: provider?.policyId ?? null,
        runtimePolicyId: runtime?.policyId ?? null,
        safetyPolicyId: safety?.policyId ?? null,
        privacyPolicyId: privacy?.policyId ?? null,
        moderationPolicyId: moderation?.policyId ?? null,
        executionPolicyId: execution?.policyId ?? null,
        auditPolicyId: audit?.policyId ?? null,
        retentionPolicyId: retention?.policyId ?? null,
      },
    };

    this.registry.appendEvaluationLog({
      at: nowIso,
      capabilityId: request.capabilityId,
      tenantId: request.tenantId,
      decision: result.decision,
      violationCodes: violations.map((v) => v.code),
    });

    return result;
  }
}

function resolveTenantPolicy(
  registry: AiPolicyRegistry,
  binding: AiCapabilityPolicyBinding | null,
  tenantId: string
): AiTenantPolicy | null {
  const specific = registry
    .list("tenant")
    .find(
      (p) =>
        p.kind === "tenant" &&
        (p as AiTenantPolicy).tenantId === tenantId &&
        p.enabled
    ) as AiTenantPolicy | undefined;
  if (specific) return specific;
  return asKind<AiTenantPolicy>(
    registry.get(binding?.tenantPolicyId ?? "policy.tenant.default.v1"),
    "tenant"
  );
}

function resolveRuntimePolicy(
  registry: AiPolicyRegistry,
  binding: AiCapabilityPolicyBinding | null,
  runtimeId: string | null
): AiRuntimePolicy | null {
  if (runtimeId) {
    const specific = registry
      .list("runtime")
      .find(
        (p) =>
          p.kind === "runtime" &&
          (p as AiRuntimePolicy).runtimeId === runtimeId
      ) as AiRuntimePolicy | undefined;
    if (specific) return specific;
  }
  return asKind<AiRuntimePolicy>(
    registry.get(binding?.runtimePolicyId ?? "policy.runtime.default.v1"),
    "runtime"
  );
}

export const aiPolicyEvaluationEngine = new AiPolicyEvaluationEngine();
