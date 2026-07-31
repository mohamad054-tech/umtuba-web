/**
 * AI Service Orchestration Foundation V1 — contracts.
 * Unifies catalog → policy → quota → routing → invocation planning.
 * Does not perform live inference or network calls.
 */

export const AI_ORCHESTRATION_FOUNDATION_VERSION =
  "ai-service-orchestration-foundation-v1";

export const AI_PIPELINE_STAGES = [
  "preflight",
  "policy",
  "quota",
  "routing",
  "invocation",
  "postprocessing",
  "audit",
] as const;

export type AiPipelineStageId = (typeof AI_PIPELINE_STAGES)[number];

export type AiPipelineOutcome =
  | "accepted"
  | "rejected"
  | "blocked"
  | "requires_approval"
  | "ready_for_execution";

export type AiPipelineStageStatus =
  | "pending"
  | "running"
  | "passed"
  | "failed"
  | "skipped"
  | "cancelled";

export type AiPipelineStageResult = {
  stageId: AiPipelineStageId;
  status: AiPipelineStageStatus;
  startedAt: string;
  finishedAt: string | null;
  summary: string;
  details: Record<string, string | number | boolean | null>;
  stopReason: string | null;
  policyId: string | null;
};

export type AiOrchestrationRequest = {
  requestId?: string;
  capabilityId: string;
  tenantId: string;
  userId: string | null;
  providerId?: string | null;
  runtimeId?: string | null;
  modelId?: string | null;
  correlationId?: string | null;
  /** When true, pipeline stops as cancelled at the current stage. */
  cancelRequested?: boolean;
  /** Force routing/invocation planning failure for tests. */
  forceRoutingFailure?: boolean;
  forceInvocationFailure?: boolean;
  nowIso?: string;
  isAdmin?: boolean;
  approvalGranted?: boolean;
  adminOverride?: boolean;
};

export type AiOrchestrationPipelineResult = {
  orchestrationId: string;
  requestId: string;
  capabilityId: string;
  tenantId: string;
  userId: string | null;
  outcome: AiPipelineOutcome;
  currentStage: AiPipelineStageId | null;
  stopReason: string | null;
  appliedPolicyIds: string[];
  stages: AiPipelineStageResult[];
  routingPlan: {
    providerId: string | null;
    runtimeId: string | null;
    modelId: string | null;
    routeSource: "catalog_hint" | "routing_engine" | "none";
  } | null;
  invocationPlan: {
    planned: boolean;
    executableNow: boolean;
    adapterBoundary: "ready" | "not_invoked";
    note: string;
  } | null;
  version: string;
  createdAt: string;
  finishedAt: string;
};
