/**
 * Built-in default policies for Policy & Governance Foundation V1.
 */

import type {
  AiCapabilityPolicyBinding,
  AiGovernanceRecord,
  AiPolicyRecord,
} from "./types";
import { AI_POLICY_FOUNDATION_VERSION } from "./types";

const NOW = "1970-01-01T00:00:00.000Z";

function base(
  partial: Pick<AiPolicyRecord, "policyId" | "kind" | "displayName" | "description"> &
    Partial<AiPolicyRecord>
): AiPolicyRecord {
  return {
    version: AI_POLICY_FOUNDATION_VERSION,
    lifecycle: "active",
    enabled: true,
    effectiveFrom: NOW,
    supersedesPolicyId: null,
    tags: ["builtin"],
    ...partial,
  } as AiPolicyRecord;
}

export const DEFAULT_TENANT_POLICY_ID = "policy.tenant.default.v1";
export const DEFAULT_PROVIDER_POLICY_ID = "policy.provider.default.v1";
export const DEFAULT_RUNTIME_POLICY_ID = "policy.runtime.default.v1";
export const DEFAULT_SAFETY_POLICY_ID = "policy.safety.default.v1";
export const DEFAULT_PRIVACY_POLICY_ID = "policy.privacy.default.v1";
export const DEFAULT_MODERATION_POLICY_ID = "policy.moderation.default.v1";
export const DEFAULT_EXECUTION_POLICY_ID = "policy.execution.default.v1";
export const DEFAULT_AUDIT_POLICY_ID = "policy.audit.default.v1";
export const DEFAULT_RETENTION_POLICY_ID = "policy.retention.default.v1";
export const DEFAULT_GOVERNANCE_ID = "governance.platform.default.v1";
export const STRICT_TENANT_POLICY_ID = "policy.tenant.strict.test.v1";

export function buildDefaultPolicies(): AiPolicyRecord[] {
  return [
    base({
      policyId: DEFAULT_TENANT_POLICY_ID,
      kind: "tenant",
      displayName: "Default tenant policy",
      description: "Authenticated tenants may use executable shared capabilities.",
      tenantId: "*",
      allowAnonymous: false,
      allowedCapabilityIds: "*",
      deniedCapabilityIds: [],
      requireAuthenticatedUser: true,
      maxConcurrentInvocations: 20,
    }),
    base({
      policyId: STRICT_TENANT_POLICY_ID,
      kind: "tenant",
      displayName: "Strict test tenant policy",
      description: "Denies diagnostics and anonymous access for tests.",
      tenantId: "tenant_strict",
      allowAnonymous: false,
      allowedCapabilityIds: [
        "platform.translation_suggest",
        "commerce.product_draft_assistant",
      ],
      deniedCapabilityIds: ["platform.diagnostics_probe"],
      requireAuthenticatedUser: true,
      maxConcurrentInvocations: 2,
    }),
    base({
      policyId: DEFAULT_PROVIDER_POLICY_ID,
      kind: "provider",
      displayName: "Default provider policy",
      description: "Allows known foundation providers; blocks none by default.",
      providerId: "*",
      allowed: true,
      requireConfiguredCredentials: false,
      blockedModelIds: [],
      dataResidencyHint: null,
    }),
    base({
      policyId: "policy.provider.blocked.test.v1",
      kind: "provider",
      displayName: "Blocked provider (test)",
      description: "Test fixture that denies a provider.",
      providerId: "blocked-provider",
      allowed: false,
      requireConfiguredCredentials: true,
      blockedModelIds: ["blocked-model"],
      dataResidencyHint: "local-only",
    }),
    base({
      policyId: DEFAULT_RUNTIME_POLICY_ID,
      kind: "runtime",
      displayName: "Default runtime policy",
      description: "Shared AI gateway runtime defaults.",
      runtimeId: "*",
      allowed: true,
      allowStreaming: true,
      allowTools: true,
      maxTimeoutMs: 120_000,
    }),
    base({
      policyId: "policy.runtime.denied.test.v1",
      kind: "runtime",
      displayName: "Denied runtime (test)",
      description: "Test fixture denying a runtime.",
      runtimeId: "denied-runtime",
      allowed: false,
      allowStreaming: false,
      allowTools: false,
      maxTimeoutMs: 1_000,
    }),
    base({
      policyId: DEFAULT_SAFETY_POLICY_ID,
      kind: "safety",
      displayName: "Default safety policy",
      description: "Require pre/post execution safety checks.",
      blockDisallowedContent: true,
      requirePreExecutionChecks: true,
      requirePostExecutionChecks: true,
      rateLimitHintPerMinute: 60,
    }),
    base({
      policyId: DEFAULT_PRIVACY_POLICY_ID,
      kind: "privacy",
      displayName: "Default privacy policy",
      description: "No prompt/output persistence; PII redaction required.",
      allowPromptPersistence: false,
      allowOutputPersistence: false,
      piiRedactionRequired: true,
      crossTenantAccess: "deny",
      complianceLabels: ["platform-default"],
    }),
    base({
      policyId: DEFAULT_MODERATION_POLICY_ID,
      kind: "moderation",
      displayName: "Default moderation policy",
      description: "Moderation optional; auto-block on explicit violation.",
      requireModeration: false,
      autoBlockOnViolation: true,
      escalationRole: "admin",
    }),
    base({
      policyId: "policy.moderation.strict.v1",
      kind: "moderation",
      displayName: "Strict moderation",
      description: "Requires moderation approval before execution.",
      requireModeration: true,
      autoBlockOnViolation: true,
      escalationRole: "moderator",
    }),
    base({
      policyId: DEFAULT_EXECUTION_POLICY_ID,
      kind: "execution",
      displayName: "Default execution policy",
      description: "Timeout/retry governance defaults.",
      defaultTimeoutMs: 30_000,
      maxAttempts: 2,
      retryDelayMs: 500,
      allowCancellation: true,
      requireStructuredOutput: false,
    }),
    base({
      policyId: DEFAULT_AUDIT_POLICY_ID,
      kind: "audit",
      displayName: "Default audit policy",
      description: "Audit required with 90-day retention hint.",
      auditRequired: true,
      retainDays: 90,
      includeDecisionReasons: true,
    }),
    base({
      policyId: DEFAULT_RETENTION_POLICY_ID,
      kind: "retention",
      displayName: "Default retention policy",
      description: "Retain usage/audit metadata; never retain prompts/outputs.",
      retainUsageDays: 90,
      retainAuditDays: 90,
      retainPromptDays: 0,
      retainOutputDays: 0,
    }),
    ...buildDefaultBindings(),
  ];
}

export function buildDefaultBindings(): AiCapabilityPolicyBinding[] {
  const ids = [
    "commerce.product_draft_assistant",
    "platform.translation_suggest",
    "platform.diagnostics_probe",
    "assistant.runtime_turn",
    "learning.tutor.explain_lesson",
    "learning.tutor.summarize_lesson",
    "learning.tutor.answer_question",
    "learning.tutor.generate_practice",
    "learning.tutor.explain_wrong_answer",
    "learning.tutor.give_hint",
    "learning.tutor.explain_again",
  ];
  return ids.map((capabilityId) =>
    base({
      policyId: `binding.${capabilityId}.v1`,
      kind: "capability_binding",
      displayName: `Binding · ${capabilityId}`,
      description: `Capability policy binding for ${capabilityId}`,
      capabilityId,
      tenantPolicyId: DEFAULT_TENANT_POLICY_ID,
      providerPolicyId: DEFAULT_PROVIDER_POLICY_ID,
      runtimePolicyId: DEFAULT_RUNTIME_POLICY_ID,
      safetyPolicyId: DEFAULT_SAFETY_POLICY_ID,
      privacyPolicyId: DEFAULT_PRIVACY_POLICY_ID,
      moderationPolicyId:
        capabilityId === "platform.diagnostics_probe"
          ? "policy.moderation.strict.v1"
          : DEFAULT_MODERATION_POLICY_ID,
      executionPolicyId: DEFAULT_EXECUTION_POLICY_ID,
      auditPolicyId: DEFAULT_AUDIT_POLICY_ID,
      retentionPolicyId: DEFAULT_RETENTION_POLICY_ID,
      meteringQuotaPolicyId: "quota.default.v1",
      meteringBudgetPolicyId: "budget.default.v1",
    }) as AiCapabilityPolicyBinding
  );
}

export function buildDefaultGovernance(): AiGovernanceRecord[] {
  return [
    base({
      policyId: DEFAULT_GOVERNANCE_ID,
      kind: "governance",
      displayName: "Platform AI governance",
      description: "Owns default AI policy set for Shared AI surfaces.",
      owner: "platform",
      reviewCadenceDays: 90,
      approvalRequiredForChanges: true,
      relatedPolicyIds: [
        DEFAULT_TENANT_POLICY_ID,
        DEFAULT_PROVIDER_POLICY_ID,
        DEFAULT_RUNTIME_POLICY_ID,
        DEFAULT_SAFETY_POLICY_ID,
        DEFAULT_PRIVACY_POLICY_ID,
        DEFAULT_MODERATION_POLICY_ID,
        DEFAULT_EXECUTION_POLICY_ID,
        DEFAULT_AUDIT_POLICY_ID,
        DEFAULT_RETENTION_POLICY_ID,
      ],
    }) as AiGovernanceRecord,
  ];
}
