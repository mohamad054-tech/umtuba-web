/**
 * UMTUBA AI Core Platform Foundation V1 — shared contracts.
 * Product domains consume these; they must not invent parallel AI cores.
 */

export const AI_DATA_CLASSIFICATIONS = [
  "public",
  "internal",
  "confidential",
  "restricted",
] as const;
export type AiDataClassification = (typeof AI_DATA_CLASSIFICATIONS)[number];

export const AI_CAPABILITY_IDS = [
  "commerce.product_draft_assistant",
  "platform.diagnostics_probe",
  "assistant.runtime_turn",
] as const;
export type AiCapabilityId = (typeof AI_CAPABILITY_IDS)[number] | (string & {});

export const AI_OUTPUT_MODES = [
  "text",
  "structured_json",
  "blocked",
] as const;
export type AiOutputMode = (typeof AI_OUTPUT_MODES)[number];

export const AI_RUN_STATUSES = [
  "requested",
  "validated",
  "routed",
  "executing",
  "tool_waiting",
  "tool_executing",
  "completed",
  "failed",
  "blocked",
  "cancelled",
] as const;
export type AiRunStatus = (typeof AI_RUN_STATUSES)[number];

export const AI_PROMPT_STATUSES = [
  "draft",
  "active",
  "deprecated",
] as const;
export type AiPromptStatus = (typeof AI_PROMPT_STATUSES)[number];

export const AI_MODALITIES = ["text", "image", "audio"] as const;
export type AiModality = (typeof AI_MODALITIES)[number];

export const AI_LATENCY_CLASSES = ["low", "standard", "batch"] as const;
export type AiLatencyClass = (typeof AI_LATENCY_CLASSES)[number];

export const AI_COST_CLASSES = ["economy", "standard", "premium"] as const;
export type AiCostClass = (typeof AI_COST_CLASSES)[number];

export type AiResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: AiErrorCode; message: string };

export type AiErrorCode =
  | "unauthenticated"
  | "permission_denied"
  | "invalid_input"
  | "prompt_missing"
  | "prompt_deprecated"
  | "no_provider_configured"
  | "provider_unavailable"
  | "model_unavailable"
  | "no_eligible_route"
  | "context_too_large"
  | "timeout"
  | "rate_limited"
  | "safety_block"
  | "tool_denied"
  | "tool_failure"
  | "invalid_structured_output"
  | "session_missing"
  | "memory_unavailable"
  | "trace_write_failure"
  | "evaluation_write_failure"
  | "partial_completion"
  | "configuration_invalid"
  | "provider_error"
  | "cancelled";

export type AiContextEnvelope = {
  userId: string;
  workspaceId?: string | null;
  storeId?: string | null;
  courseId?: string | null;
  projectId?: string | null;
  productDomain: string;
  surface: string;
  role?: string | null;
  locale?: string | null;
  timezone?: string | null;
  sessionId?: string | null;
  conversationId?: string | null;
  resourceRefs?: Array<{ type: string; id: string }>;
  dataClassification: AiDataClassification;
  allowedCapabilities: string[];
  allowedToolIds: string[];
  traceId: string;
};

export type AiGatewayRequest = {
  capabilityId: AiCapabilityId;
  promptId: string;
  promptVersion?: string;
  userInput: string;
  context: Partial<AiContextEnvelope> & {
    productDomain: string;
    surface: string;
    dataClassification: AiDataClassification;
  };
  outputMode: AiOutputMode;
  allowedToolIds?: string[];
  preferredProviderId?: string;
  preferredModelId?: string;
  sessionId?: string;
  metadata?: Record<string, string | number | boolean | null>;
  /** Test/injected override — never from clients. */
  _test?: {
    forceStub?: boolean;
    bypassRateLimit?: boolean;
    nowMs?: number;
  };
};

export type AiUsageRecord = {
  inputTokens: number | null;
  outputTokens: number | null;
  cachedTokens: number | null;
  audioUnits: number | null;
  imageUnits: number | null;
  costMinor: number | null;
  costCurrency: string | null;
  costStatus: "provider_reported" | "estimated" | "unavailable";
  modelId: string;
  providerId: string;
  capabilityId: string;
  userId: string;
  workspaceId: string | null;
  runId: string;
  billingClassification: "internal" | "product" | "unbilled";
};

export type AiToolCallSummary = {
  toolId: string;
  authorized: boolean;
  success: boolean;
  message?: string;
};

export type AiSafetyOutcome = {
  allowed: boolean;
  stage: "pre" | "post";
  reasons: string[];
  redactions: string[];
};

export type AiRouteDecision = {
  providerId: string;
  modelId: string;
  reason: string;
  fallbackUsed: boolean;
  candidatesConsidered: string[];
};

export type AiGatewaySuccess = {
  runId: string;
  traceId: string;
  status: Extract<AiRunStatus, "completed">;
  outputMode: AiOutputMode;
  text: string | null;
  structured: Record<string, unknown> | null;
  providerId: string;
  modelId: string;
  promptId: string;
  promptVersion: string;
  route: AiRouteDecision;
  usage: AiUsageRecord;
  safety: AiSafetyOutcome;
  toolCalls: AiToolCallSummary[];
  latencyMs: number;
};

export type AiRunRecord = {
  id: string;
  traceId: string;
  userId: string;
  capabilityId: string;
  promptId: string;
  promptVersion: string;
  providerId: string | null;
  modelId: string | null;
  status: AiRunStatus;
  startedAt: string;
  finishedAt: string | null;
  usage: AiUsageRecord | null;
  errorCode: AiErrorCode | null;
  errorMessage: string | null;
  safety: AiSafetyOutcome | null;
  toolCalls: AiToolCallSummary[];
  parentRunId: string | null;
  sessionId: string | null;
  dataClassification: AiDataClassification;
};

export type AiTraceEventType =
  | "gateway_receipt"
  | "prompt_resolution"
  | "route_decision"
  | "provider_attempt"
  | "provider_fallback"
  | "tool_call_request"
  | "tool_call_authorization"
  | "tool_result"
  | "safety_block"
  | "completion"
  | "failure";

export type AiTraceEvent = {
  id: string;
  runId: string;
  traceId: string;
  type: AiTraceEventType;
  at: string;
  summary: string;
  detail: Record<string, unknown>;
};
