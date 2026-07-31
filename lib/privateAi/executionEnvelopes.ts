import { normalizeAdapterError, redactSecretLikeText } from "./adapterErrors";
import type {
  ExecutionContext,
  ExecutionInputEnvelope,
  ExecutionOutputEnvelope,
  InferenceRequestRecord,
  NormalizedAdapterError,
  ProviderAdapterContract,
} from "./types";

function estimatePayloadBytes(request: InferenceRequestRecord): number {
  const promptLen = request.payload.prompt?.length ?? 0;
  const msgEstimate = (request.payload.messageCount ?? 0) * 64;
  return promptLen + msgEstimate;
}

/**
 * Build adapter input envelope from execution context + request.
 * Never embeds secrets or raw API keys.
 */
export function buildExecutionInputEnvelope(input: {
  planId: string;
  request: InferenceRequestRecord;
  context: ExecutionContext;
  adapter: ProviderAdapterContract;
}): ExecutionInputEnvelope {
  const { planId, request, context, adapter } = input;
  const prompt = request.payload.prompt ?? "";
  const redactedPromptNote = redactSecretLikeText(prompt);
  const redactionApplied = redactedPromptNote !== prompt;

  return {
    requestId: request.requestId,
    executionPlanId: planId,
    providerId: context.providerId,
    runtimeId: context.runtimeId,
    modelId: context.modelId,
    capabilityId: context.capabilityId,
    adapterId: adapter.adapterId,
    tenantId: context.tenantId,
    requester: {
      actorId: context.requester.actorId,
      role: context.requester.role,
      tenantId: context.requester.tenantId,
      sessionId: context.requester.sessionId,
    },
    normalizedInput: {
      kind: request.payload.inputKind,
      promptChars: prompt.length,
      messageCount: request.payload.messageCount ?? 0,
      hasPrompt: prompt.length > 0,
    },
    structuredOutput: { ...request.structuredOutput },
    streaming: { ...request.streaming },
    timeout: { ...context.timeout },
    cancellation: { ...context.cancellation },
    retry: { ...request.retry },
    correlationId: context.correlationId,
    trace: { ...context.trace },
    payloadBytesEstimate: estimatePayloadBytes(request),
    maxPayloadBytes: adapter.maxPayloadBytes,
    redactionApplied,
    notes:
      "Adapter input envelope — no secrets; prompt content not forwarded as raw text.",
  };
}

export function buildNotExecutedOutputEnvelope(input: {
  planId: string;
  request: InferenceRequestRecord;
  context: ExecutionContext;
  adapterId: string | null;
  notes?: string;
  now?: string;
}): ExecutionOutputEnvelope {
  const now = input.now ?? new Date().toISOString();
  return {
    status: "not_executed",
    requestId: input.request.requestId,
    executionPlanId: input.planId,
    providerId: input.context.providerId,
    runtimeId: input.context.runtimeId,
    modelId: input.context.modelId,
    adapterId: input.adapterId,
    output: {
      kind: "empty",
      fixtureText: null,
      structuredValid: null,
    },
    usage: {
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
    },
    latencyMs: null,
    finishReason: "adapter_boundary_stop",
    retryable: false,
    failure: null,
    providerSafeDiagnostic: null,
    correlationId: input.context.correlationId,
    auditEventId: null,
    notes:
      input.notes ??
      "Stopped at adapter boundary — no provider invoke, no inference.",
    createdAt: now,
  };
}

export function buildFixtureOutputEnvelope(input: {
  planId: string;
  request: InferenceRequestRecord;
  context: ExecutionContext;
  adapter: ProviderAdapterContract;
  fixtureText: string;
  latencyMs?: number;
  auditEventId?: string | null;
  failure?: NormalizedAdapterError | null;
  now?: string;
}): ExecutionOutputEnvelope {
  const now = input.now ?? new Date().toISOString();
  const structuredRequired =
    input.request.structuredOutput.mode !== "none" ||
    input.request.structuredOutput.validateOutput;
  const structuredValid = structuredRequired
    ? input.fixtureText.trim().startsWith("{")
    : null;

  if (input.failure) {
    return {
      status: "fixture_error",
      requestId: input.request.requestId,
      executionPlanId: input.planId,
      providerId: input.context.providerId,
      runtimeId: input.context.runtimeId,
      modelId: input.context.modelId,
      adapterId: input.adapter.adapterId,
      output: {
        kind: "empty",
        fixtureText: null,
        structuredValid: false,
      },
      usage: { inputTokens: null, outputTokens: null, totalTokens: null },
      latencyMs: input.latencyMs ?? 0,
      finishReason: "error",
      retryable: input.failure.retryable,
      failure: input.failure,
      providerSafeDiagnostic: input.failure.adminDiagnostic,
      correlationId: input.context.correlationId,
      auditEventId: input.auditEventId ?? null,
      notes: "Contract-test adapter fixture error — no network.",
      createdAt: now,
    };
  }

  if (structuredRequired && structuredValid === false) {
    const failure = normalizeAdapterError({
      class: "structured_output_invalid",
      adminDiagnostic: "fixture structured output missing object shape",
    });
    return {
      status: "fixture_error",
      requestId: input.request.requestId,
      executionPlanId: input.planId,
      providerId: input.context.providerId,
      runtimeId: input.context.runtimeId,
      modelId: input.context.modelId,
      adapterId: input.adapter.adapterId,
      output: {
        kind: "structured",
        fixtureText: input.fixtureText,
        structuredValid: false,
      },
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      latencyMs: input.latencyMs ?? 1,
      finishReason: "structured_invalid",
      retryable: false,
      failure,
      providerSafeDiagnostic: failure.adminDiagnostic,
      correlationId: input.context.correlationId,
      auditEventId: input.auditEventId ?? null,
      notes: "Contract-test structured validation failed — no network.",
      createdAt: now,
    };
  }

  return {
    status: "fixture_ok",
    requestId: input.request.requestId,
    executionPlanId: input.planId,
    providerId: input.context.providerId,
    runtimeId: input.context.runtimeId,
    modelId: input.context.modelId,
    adapterId: input.adapter.adapterId,
    output: {
      kind: structuredRequired ? "structured" : "text",
      fixtureText: input.fixtureText,
      structuredValid,
    },
    usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    latencyMs: input.latencyMs ?? 1,
    finishReason: "stop",
    retryable: false,
    failure: null,
    providerSafeDiagnostic: "contract_test_fixture",
    correlationId: input.context.correlationId,
    auditEventId: input.auditEventId ?? null,
    notes: "Contract-test adapter fixture — no network, no model load.",
    createdAt: now,
  };
}

export function validateExecutionInputEnvelope(
  envelope: ExecutionInputEnvelope
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!envelope.requestId) errors.push("requestId_required");
  if (!envelope.executionPlanId) errors.push("executionPlanId_required");
  if (!envelope.adapterId) errors.push("adapterId_required");
  if (!envelope.providerId) errors.push("providerId_required");
  if (!envelope.runtimeId) errors.push("runtimeId_required");
  if (!envelope.modelId) errors.push("modelId_required");
  if (envelope.payloadBytesEstimate > envelope.maxPayloadBytes) {
    errors.push("payload_size_exceeded");
  }
  if (envelope.timeout.timeoutMs <= 0) errors.push("timeout_invalid");
  return { ok: errors.length === 0, errors };
}
