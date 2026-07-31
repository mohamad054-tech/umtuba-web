import { createPrivateAiAuditEntry } from "./audit";
import { createInferenceRequestRecord } from "./inferenceRequestFactory";
import {
  assertTransitionInferenceRequest,
  isClosedInferenceLifecycle,
  isTerminalInferenceLifecycle,
} from "./inferenceRequestLifecycle";
import { validateInferenceRequestContract } from "./inferenceRequestValidation";
import type {
  AiCapabilityId,
  InferenceFailureClass,
  InferenceRequestLifecycle,
  InferenceRequestRecord,
  InferenceRequester,
  InferenceStructuredOutputContract,
  InferenceStreamingContract,
  PersistedPrivateAiState,
  RuntimeCostTier,
} from "./types";

function replaceRequest(
  state: PersistedPrivateAiState,
  updated: InferenceRequestRecord,
  now: string
): PersistedPrivateAiState {
  return {
    ...state,
    schemaVersion: 6,
    inferenceRequests: (state.inferenceRequests ?? []).map((r) =>
      r.requestId === updated.requestId ? updated : r
    ),
    updatedAt: now,
  };
}

export function ensureInferenceRequestDefaults(
  state: PersistedPrivateAiState
): PersistedPrivateAiState {
  return {
    ...state,
    schemaVersion: 6,
    inferenceRequests: state.inferenceRequests ?? [],
    executionPlans: state.executionPlans ?? [],
  };
}

export function handleCreateInferenceRequest(
  state: PersistedPrivateAiState,
  input: {
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
    autoSelectRuntime?: boolean;
  }
): { state: PersistedPrivateAiState; request: InferenceRequestRecord } {
  const now = input.now ?? new Date().toISOString();
  let runtimeId = input.runtimeId ?? null;
  let modelId = input.modelId ?? null;
  let providerId = input.providerId ?? null;

  if (input.autoSelectRuntime !== false && !runtimeId) {
    const eligible = state.runtimes.find(
      (r) =>
        r.deploymentState === "ready" &&
        !r.ops.maintenance.active &&
        r.capabilityIds.includes(input.capabilityId) &&
        r.availability !== "unavailable"
    );
    if (eligible) {
      runtimeId = eligible.id;
      modelId = modelId ?? eligible.modelId;
      providerId = providerId ?? eligible.providerHint;
    }
  }

  const request = createInferenceRequestRecord({
    ...input,
    runtimeId,
    modelId,
    providerId,
    now,
  });

  if ((state.inferenceRequests ?? []).some((r) => r.requestId === request.requestId)) {
    throw new Error(`Inference request already exists: ${request.requestId}`);
  }

  const audit = createPrivateAiAuditEntry({
    action: "inference_request_created",
    actorId: input.requester.actorId,
    actorRole: input.requester.role,
    modelId: request.modelId,
    reason: null,
    now,
    detail: {
      requestId: request.requestId,
      capabilityId: request.capabilityId,
      runtimeId: request.runtimeId,
    },
  });

  const withAudit: InferenceRequestRecord = {
    ...request,
    auditEntryId: audit.id,
  };

  return {
    state: {
      ...state,
      schemaVersion: 6,
      inferenceRequests: [...(state.inferenceRequests ?? []), withAudit],
      auditTrail: [...state.auditTrail, audit],
      updatedAt: now,
    },
    request: withAudit,
  };
}

export function handleValidateInferenceRequest(
  state: PersistedPrivateAiState,
  requestId: string,
  nowIso?: string
): { state: PersistedPrivateAiState; request: InferenceRequestRecord } {
  const request = (state.inferenceRequests ?? []).find(
    (r) => r.requestId === requestId
  );
  if (!request) throw new Error(`Unknown inference request: ${requestId}`);
  const now = nowIso ?? new Date().toISOString();
  const result = validateInferenceRequestContract(request, state);

  if (!result.ok) {
    assertTransitionInferenceRequest(request.lifecycle, "rejected");
    const updated: InferenceRequestRecord = {
      ...request,
      lifecycle: "rejected",
      validationErrors: result.errors,
      rejectionReason: result.errors.join(","),
      metrics: {
        ...request.metrics,
        failureClass: "validation",
        completedAt: now,
      },
      updatedAt: now,
    };
    return { state: replaceRequest(state, updated, now), request: updated };
  }

  assertTransitionInferenceRequest(request.lifecycle, "validated");
  const updated: InferenceRequestRecord = {
    ...request,
    lifecycle: "validated",
    validationErrors: [],
    rejectionReason: null,
    metrics: {
      ...request.metrics,
      validatedAt: now,
      failureClass: "none",
    },
    updatedAt: now,
  };
  return { state: replaceRequest(state, updated, now), request: updated };
}

export function handleAdvanceInferenceRequest(
  state: PersistedPrivateAiState,
  input: {
    requestId: string;
    to: InferenceRequestLifecycle;
    reason?: string | null;
    now?: string;
    failureClass?: InferenceFailureClass;
  }
): { state: PersistedPrivateAiState; request: InferenceRequestRecord } {
  const request = (state.inferenceRequests ?? []).find(
    (r) => r.requestId === input.requestId
  );
  if (!request) throw new Error(`Unknown inference request: ${input.requestId}`);
  if (
    isClosedInferenceLifecycle(request.lifecycle) &&
    request.lifecycle !== input.to &&
    !(
      (request.lifecycle === "failed" || request.lifecycle === "timed_out") &&
      input.to === "queued"
    )
  ) {
    throw new Error(`Request already closed: ${request.lifecycle}`);
  }
  assertTransitionInferenceRequest(request.lifecycle, input.to);
  if (request.lifecycle === input.to) return { state, request };

  const now = input.now ?? new Date().toISOString();
  const metrics = { ...request.metrics };

  if (input.to === "accepted") metrics.acceptedAt = now;
  if (input.to === "running") metrics.startedAt = now;
  if (
    input.to === "completed" ||
    input.to === "failed" ||
    input.to === "cancelled" ||
    input.to === "rejected" ||
    input.to === "timed_out"
  ) {
    metrics.completedAt = now;
    const start = metrics.startedAt ?? metrics.acceptedAt ?? metrics.createdAt;
    metrics.latencyMs = Date.parse(now) - Date.parse(start);
  }
  if (input.to === "failed") {
    metrics.failureClass = input.failureClass ?? "runtime";
  } else if (input.to === "timed_out") {
    metrics.failureClass = "timeout";
  } else if (input.to === "cancelled") {
    metrics.failureClass = "cancelled";
  } else if (input.to === "rejected") {
    metrics.failureClass = input.failureClass ?? "validation";
  }

  const updated: InferenceRequestRecord = {
    ...request,
    lifecycle: input.to,
    rejectionReason:
      input.to === "rejected"
        ? input.reason ?? request.rejectionReason
        : request.rejectionReason,
    failureReason:
      input.to === "failed" || input.to === "timed_out"
        ? input.reason ?? request.failureReason
        : request.failureReason,
    cancellationRequested:
      input.to === "cancelled" ? true : request.cancellationRequested,
    metrics,
    updatedAt: now,
  };

  return { state: replaceRequest(state, updated, now), request: updated };
}

export function handleCancelInferenceRequest(
  state: PersistedPrivateAiState,
  input: { requestId: string; reason?: string; now?: string }
): { state: PersistedPrivateAiState; request: InferenceRequestRecord } {
  const request = (state.inferenceRequests ?? []).find(
    (r) => r.requestId === input.requestId
  );
  if (!request) throw new Error(`Unknown inference request: ${input.requestId}`);
  const now = input.now ?? new Date().toISOString();

  if (isClosedInferenceLifecycle(request.lifecycle)) {
    throw new Error(`Cannot cancel closed request: ${request.lifecycle}`);
  }

  if (!request.streaming.cancellationSupported && request.streaming.enabled) {
    throw new Error("Cancellation not supported for this stream contract");
  }

  return handleAdvanceInferenceRequest(state, {
    requestId: input.requestId,
    to: "cancelled",
    reason: input.reason ?? "cancelled_by_requester",
    now,
    failureClass: "cancelled",
  });
}

export function handleTimeoutInferenceRequest(
  state: PersistedPrivateAiState,
  input: { requestId: string; now?: string }
): { state: PersistedPrivateAiState; request: InferenceRequestRecord } {
  const request = (state.inferenceRequests ?? []).find(
    (r) => r.requestId === input.requestId
  );
  if (!request) throw new Error(`Unknown inference request: ${input.requestId}`);
  const now = input.now ?? new Date().toISOString();
  const elapsed =
    Date.parse(now) -
    Date.parse(request.metrics.startedAt ?? request.metrics.createdAt);
  if (elapsed < request.timeoutMs) {
    throw new Error("Request has not exceeded timeout metadata");
  }
  return handleAdvanceInferenceRequest(state, {
    requestId: input.requestId,
    to: "timed_out",
    reason: `timeout_exceeded_${request.timeoutMs}ms`,
    now,
    failureClass: "timeout",
  });
}

export function handleRetryInferenceMetadata(
  state: PersistedPrivateAiState,
  input: { requestId: string; now?: string }
): { state: PersistedPrivateAiState; request: InferenceRequestRecord } {
  const request = (state.inferenceRequests ?? []).find(
    (r) => r.requestId === input.requestId
  );
  if (!request) throw new Error(`Unknown inference request: ${input.requestId}`);
  if (request.retry.attempt >= request.retry.maxAttempts) {
    throw new Error("Max retry attempts exceeded");
  }
  if (request.lifecycle !== "failed" && request.lifecycle !== "timed_out") {
    throw new Error("Retry metadata only from failed/timed_out contracts");
  }
  const now = input.now ?? new Date().toISOString();
  assertTransitionInferenceRequest(request.lifecycle, "queued");
  const updated: InferenceRequestRecord = {
    ...request,
    lifecycle: "queued",
    failureReason: null,
    retry: {
      ...request.retry,
      attempt: request.retry.attempt + 1,
      lastRetryAt: now,
    },
    metrics: {
      ...request.metrics,
      failureClass: "none",
      completedAt: null,
      startedAt: null,
    },
    updatedAt: now,
  };
  return { state: replaceRequest(state, updated, now), request: updated };
}
