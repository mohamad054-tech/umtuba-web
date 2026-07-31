/**
 * AI Policy & Governance Foundation V1 — contracts only.
 * No inference, network, training, or financial mutations.
 */

export const AI_POLICY_FOUNDATION_SCHEMA_VERSION = 1 as const;
export const AI_POLICY_FOUNDATION_VERSION = "ai-policy-governance-foundation-v1";

export type AiPolicyKind =
  | "tenant"
  | "provider"
  | "runtime"
  | "safety"
  | "privacy"
  | "moderation"
  | "execution"
  | "audit"
  | "retention"
  | "capability_binding"
  | "governance";

export type AiPolicyLifecycle =
  | "draft"
  | "active"
  | "deprecated"
  | "retired";

export type AiPolicyDecisionKind =
  | "allowed"
  | "denied"
  | "warning"
  | "requires_approval"
  | "requires_admin_override";

export type AiPolicyBase = {
  policyId: string;
  kind: AiPolicyKind;
  version: string;
  displayName: string;
  description: string;
  lifecycle: AiPolicyLifecycle;
  enabled: boolean;
  effectiveFrom: string;
  supersedesPolicyId: string | null;
  tags: string[];
};

export type AiTenantPolicy = AiPolicyBase & {
  kind: "tenant";
  tenantId: string | "*";
  allowAnonymous: boolean;
  allowedCapabilityIds: string[] | "*";
  deniedCapabilityIds: string[];
  requireAuthenticatedUser: boolean;
  maxConcurrentInvocations: number | null;
};

export type AiProviderPolicy = AiPolicyBase & {
  kind: "provider";
  providerId: string | "*";
  allowed: boolean;
  requireConfiguredCredentials: boolean;
  blockedModelIds: string[];
  dataResidencyHint: string | null;
};

export type AiRuntimePolicy = AiPolicyBase & {
  kind: "runtime";
  runtimeId: string | "*";
  allowed: boolean;
  allowStreaming: boolean;
  allowTools: boolean;
  maxTimeoutMs: number;
};

export type AiSafetyPolicy = AiPolicyBase & {
  kind: "safety";
  blockDisallowedContent: boolean;
  requirePreExecutionChecks: boolean;
  requirePostExecutionChecks: boolean;
  rateLimitHintPerMinute: number | null;
};

export type AiPrivacyPolicy = AiPolicyBase & {
  kind: "privacy";
  allowPromptPersistence: boolean;
  allowOutputPersistence: boolean;
  piiRedactionRequired: boolean;
  crossTenantAccess: "deny" | "admin_only";
  complianceLabels: string[];
};

export type AiModerationPolicy = AiPolicyBase & {
  kind: "moderation";
  requireModeration: boolean;
  autoBlockOnViolation: boolean;
  escalationRole: "admin" | "moderator" | "none";
};

export type AiExecutionGovernancePolicy = AiPolicyBase & {
  kind: "execution";
  defaultTimeoutMs: number;
  maxAttempts: number;
  retryDelayMs: number;
  allowCancellation: boolean;
  requireStructuredOutput: boolean;
};

export type AiAuditGovernancePolicy = AiPolicyBase & {
  kind: "audit";
  auditRequired: boolean;
  retainDays: number | null;
  includeDecisionReasons: boolean;
};

export type AiRetentionPolicy = AiPolicyBase & {
  kind: "retention";
  retainUsageDays: number | null;
  retainAuditDays: number | null;
  retainPromptDays: number;
  retainOutputDays: number;
};

export type AiCapabilityPolicyBinding = AiPolicyBase & {
  kind: "capability_binding";
  capabilityId: string;
  tenantPolicyId: string;
  providerPolicyId: string;
  runtimePolicyId: string;
  safetyPolicyId: string;
  privacyPolicyId: string;
  moderationPolicyId: string;
  executionPolicyId: string;
  auditPolicyId: string;
  retentionPolicyId: string;
  meteringQuotaPolicyId: string | null;
  meteringBudgetPolicyId: string | null;
};

export type AiGovernanceRecord = AiPolicyBase & {
  kind: "governance";
  owner: string;
  reviewCadenceDays: number | null;
  approvalRequiredForChanges: boolean;
  relatedPolicyIds: string[];
};

export type AiPolicyRecord =
  | AiTenantPolicy
  | AiProviderPolicy
  | AiRuntimePolicy
  | AiSafetyPolicy
  | AiPrivacyPolicy
  | AiModerationPolicy
  | AiExecutionGovernancePolicy
  | AiAuditGovernancePolicy
  | AiRetentionPolicy
  | AiCapabilityPolicyBinding
  | AiGovernanceRecord;

export type AiPolicyViolationCode =
  | "tenant_denied"
  | "capability_denied"
  | "provider_denied"
  | "runtime_denied"
  | "safety_denied"
  | "privacy_denied"
  | "moderation_required"
  | "execution_denied"
  | "unauthenticated"
  | "policy_missing"
  | "policy_disabled"
  | "lifecycle_inactive"
  | "override_required";

export type AiPolicyViolation = {
  code: AiPolicyViolationCode;
  message: string;
  policyId: string | null;
  policyVersion: string | null;
  severity: "info" | "warning" | "blocking";
};

export type AiPolicyEvaluationRequest = {
  capabilityId: string;
  tenantId: string;
  userId: string | null;
  providerId?: string | null;
  runtimeId?: string | null;
  modelId?: string | null;
  isAdmin?: boolean;
  adminOverride?: boolean;
  approvalGranted?: boolean;
  nowIso?: string;
};

export type AiPolicyDecisionResult = {
  decision: AiPolicyDecisionKind;
  allowed: boolean;
  violations: AiPolicyViolation[];
  warnings: string[];
  bindingPolicyId: string | null;
  effectivePolicyVersion: string;
  evaluatedAt: string;
  requiresApproval: boolean;
  requiresAdminOverride: boolean;
  snapshot: {
    tenantPolicyId: string | null;
    providerPolicyId: string | null;
    runtimePolicyId: string | null;
    safetyPolicyId: string | null;
    privacyPolicyId: string | null;
    moderationPolicyId: string | null;
    executionPolicyId: string | null;
    auditPolicyId: string | null;
    retentionPolicyId: string | null;
  };
};

export type AiPolicyFoundationState = {
  schemaVersion: typeof AI_POLICY_FOUNDATION_SCHEMA_VERSION;
  policies: AiPolicyRecord[];
  governance: AiGovernanceRecord[];
  evaluationLog: Array<{
    at: string;
    capabilityId: string;
    tenantId: string;
    decision: AiPolicyDecisionKind;
    violationCodes: AiPolicyViolationCode[];
  }>;
};
