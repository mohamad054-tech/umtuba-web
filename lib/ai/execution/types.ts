/**
 * AI Unified Capability Execution V1 — contracts.
 * Chains catalog → policy → quota → orchestration → routing → adapter → invocation.
 * No live inference / network / provider execution.
 */

import type { AiOrchestrationPipelineResult } from "../orchestration";

export const AI_UNIFIED_EXECUTION_VERSION =
  "ai-unified-capability-execution-v1";

export type AiUnifiedExecutionState =
  | "received"
  | "validated"
  | "policy_checked"
  | "quota_checked"
  | "routed"
  | "invocation_ready"
  | "execution_ready"
  | "blocked"
  | "rejected";

export type AiUnifiedResultKind =
  | "success"
  | "blocked"
  | "rejected"
  | "requires_approval"
  | "ready_for_execution";

export type AiUnifiedErrorCode =
  | "unauthenticated"
  | "invalid_request"
  | "capability_unknown"
  | "policy_denied"
  | "quota_denied"
  | "routing_failed"
  | "adapter_not_ready"
  | "invocation_not_ready"
  | "pipeline_rejected"
  | "cancelled"
  | "internal";

export type AiUnifiedRequest = {
  requestId?: string;
  capabilityId: string;
  tenantId: string;
  userId: string | null;
  providerId?: string | null;
  runtimeId?: string | null;
  modelId?: string | null;
  correlationId?: string | null;
  surface?: string | null;
  productDomain?: string | null;
  cancelRequested?: boolean;
  approvalGranted?: boolean;
  adminOverride?: boolean;
  isAdmin?: boolean;
  nowIso?: string;
};

export type AiUnifiedContext = {
  requestId: string;
  executionId: string;
  tenantId: string;
  userId: string | null;
  capabilityId: string;
  correlationId: string | null;
  surface: string | null;
  productDomain: string | null;
  receivedAt: string;
};

export type AiUnifiedError = {
  code: AiUnifiedErrorCode;
  message: string;
  stage: AiUnifiedExecutionState | null;
  retryable: boolean;
};

export type AiUnifiedMetrics = {
  totalStages: number;
  passedStages: number;
  failedStages: number;
  skippedStages: number;
  durationMs: number;
  policyCount: number;
};

export type AiUnifiedTraceEvent = {
  at: string;
  state: AiUnifiedExecutionState;
  summary: string;
};

export type AiUnifiedAuditRecord = {
  auditId: string;
  executionId: string;
  requestId: string;
  capabilityId: string;
  tenantId: string;
  userId: string | null;
  result: AiUnifiedResultKind;
  state: AiUnifiedExecutionState;
  stopReason: string | null;
  appliedPolicyIds: string[];
  createdAt: string;
};

export type AiUnifiedCapabilityExecutionResult = {
  executionId: string;
  requestId: string;
  context: AiUnifiedContext;
  state: AiUnifiedExecutionState;
  result: AiUnifiedResultKind;
  error: AiUnifiedError | null;
  orchestration: AiOrchestrationPipelineResult | null;
  routing: {
    providerId: string | null;
    runtimeId: string | null;
    modelId: string | null;
  } | null;
  adapter: {
    boundary: "ready" | "not_invoked" | "blocked";
    note: string;
  };
  invocation: {
    status: "ready" | "not_invoked" | "blocked";
    note: string;
  };
  audit: AiUnifiedAuditRecord;
  metrics: AiUnifiedMetrics;
  trace: AiUnifiedTraceEvent[];
  version: string;
  createdAt: string;
  finishedAt: string;
};
