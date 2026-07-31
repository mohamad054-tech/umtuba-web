import type {
  AiCapabilityId,
  InferenceRequestRecord,
  InferenceRequester,
  InferenceStructuredOutputContract,
  InferenceStreamingContract,
  RuntimeCostTier,
} from "./types";

export function createInferenceRequestRecord(input: {
  requestId?: string;
  capabilityId: AiCapabilityId;
  providerId?: string | null;
  runtimeId?: string | null;
  modelId?: string | null;
  requester: InferenceRequester;
  correlationId?: string;
  priority?: number;
  costTier?: RuntimeCostTier;
  timeoutMs?: number;
  maxTokens?: number | null;
  prompt?: string;
  inputKind?: "text" | "messages" | "empty";
  messageCount?: number;
  streaming?: Partial<InferenceStreamingContract>;
  structuredOutput?: Partial<InferenceStructuredOutputContract>;
  maxAttempts?: number;
  retryDelayMs?: number;
  notes?: string;
  now?: string;
}): InferenceRequestRecord {
  const now = input.now ?? new Date().toISOString();
  const requestId =
    input.requestId ??
    `irq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const streamingEnabled = input.streaming?.enabled ?? false;

  return {
    requestId,
    capabilityId: input.capabilityId,
    providerId: input.providerId ?? null,
    runtimeId: input.runtimeId ?? null,
    modelId: input.modelId ?? null,
    requester: {
      actorId: input.requester.actorId ?? null,
      role: input.requester.role,
      tenantId: input.requester.tenantId,
      sessionId: input.requester.sessionId ?? null,
    },
    correlationId:
      input.correlationId ??
      `corr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    priority: input.priority ?? 100,
    costTier: input.costTier ?? "standard",
    timeoutMs: input.timeoutMs ?? 30_000,
    maxTokens: input.maxTokens ?? null,
    streaming: {
      enabled: streamingEnabled,
      streamId:
        input.streaming?.streamId ??
        (streamingEnabled ? `stream_${requestId}` : null),
      chunkSequenceStart: input.streaming?.chunkSequenceStart ?? 0,
      completionMarker: input.streaming?.completionMarker ?? "[DONE]",
      cancellationSupported: input.streaming?.cancellationSupported ?? true,
      backpressureHint: input.streaming?.backpressureHint ?? "none",
      maxBufferedChunks: input.streaming?.maxBufferedChunks ?? null,
    },
    structuredOutput: {
      mode: input.structuredOutput?.mode ?? "none",
      schemaId: input.structuredOutput?.schemaId ?? null,
      schemaVersion: input.structuredOutput?.schemaVersion ?? null,
      validateOutput: input.structuredOutput?.validateOutput ?? false,
    },
    cancellationRequested: false,
    retry: {
      attempt: 1,
      maxAttempts: input.maxAttempts ?? 3,
      retryDelayMs: input.retryDelayMs ?? 1_000,
      lastRetryAt: null,
    },
    lifecycle: "pending",
    payload: {
      prompt: input.prompt ?? "",
      inputKind:
        input.inputKind ??
        (input.prompt && input.prompt.trim() ? "text" : "empty"),
      messageCount: input.messageCount ?? 0,
    },
    validationErrors: [],
    rejectionReason: null,
    failureReason: null,
    auditEntryId: null,
    metrics: {
      createdAt: now,
      validatedAt: null,
      acceptedAt: null,
      startedAt: null,
      completedAt: null,
      latencyMs: null,
      failureClass: "none",
    },
    notes:
      input.notes ??
      "Inference request contract only — no model execution.",
    createdAt: now,
    updatedAt: now,
  };
}
