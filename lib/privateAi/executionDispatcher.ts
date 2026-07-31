import { evaluateExecutionGuard } from "./executionGuard";
import {
  DEFAULT_EXECUTION_POLICY,
  resolveExecutionPolicy,
  resolveExecutionQuota,
} from "./executionPolicy";
import { evaluateProviderRouting } from "./providerRoutingEngine";
import { validateInferenceRequestContract } from "./inferenceRequestValidation";
import type {
  ExecutionBudgetContract,
  ExecutionContext,
  ExecutionErrorContract,
  ExecutionPlanRecord,
  ExecutionPlanStatus,
  InferenceRequestRecord,
  PersistedPrivateAiState,
} from "./types";

export type DispatchExecutionInput = {
  requestId: string;
  now?: string;
  budget?: Partial<ExecutionBudgetContract>;
  /** When true and request lacks runtime, attempt contract selection. */
  selectRuntimeIfMissing?: boolean;
};

export type DispatchExecutionResult = {
  plan: ExecutionPlanRecord;
  status: ExecutionPlanStatus;
};

function makeError(
  code: string,
  message: string,
  cls: ExecutionErrorContract["class"],
  retriable = false
): ExecutionErrorContract {
  return { code, message, class: cls, retriable };
}

function buildContext(
  request: InferenceRequestRecord,
  state: PersistedPrivateAiState,
  runtimeId: string,
  providerId: string,
  modelId: string,
  now: string,
  budget: ExecutionBudgetContract
): ExecutionContext {
  const policy = resolveExecutionPolicy(state.executionPolicy);
  const quota = resolveExecutionQuota(state.executionQuota);
  const timeoutMs = Math.min(
    request.timeoutMs || policy.defaultTimeoutMs,
    policy.maxTimeoutMs
  );
  return {
    requestId: request.requestId,
    runtimeId,
    providerId,
    modelId,
    capabilityId: request.capabilityId,
    tenantId: request.requester.tenantId,
    requester: request.requester,
    correlationId: request.correlationId,
    trace: {
      traceId: `tr_${request.correlationId}`,
      spanId: `sp_${request.requestId}`,
      parentSpanId: null,
    },
    policy,
    timeout: {
      timeoutMs,
      hardDeadlineAt: new Date(Date.parse(now) + timeoutMs).toISOString(),
    },
    quota,
    budget,
    cancellation: {
      cancellationTokenId: `cancel_${request.requestId}`,
      cancellable: request.streaming.cancellationSupported || true,
      cancelRequested: request.cancellationRequested,
      cancelReason: null,
    },
  };
}

/**
 * Dispatcher: Validate → Authorize/Guard → Select Runtime → Build Context → Plan.
 * Never calls a provider or executes inference.
 */
export function dispatchInferenceExecution(
  state: PersistedPrivateAiState,
  input: DispatchExecutionInput
): DispatchExecutionResult {
  const now = input.now ?? new Date().toISOString();
  const planId = `epl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const request = (state.inferenceRequests ?? []).find(
    (r) => r.requestId === input.requestId
  );

  const baseSession = {
    sessionId: `exs_${input.requestId}`,
    requestId: input.requestId,
    openedAt: now,
    closedAt: null as string | null,
    status: "blocked" as ExecutionPlanStatus,
  };

  if (!request) {
    const plan: ExecutionPlanRecord = {
      planId,
      requestId: input.requestId,
      status: "failed_before_dispatch",
      context: null,
      session: { ...baseSession, status: "failed_before_dispatch", closedAt: now },
      guardErrors: ["request_missing"],
      error: makeError("request_missing", "Unknown inference request", "unknown"),
      selectedRuntimeId: null,
      notes: "Execution boundary — no provider call.",
      createdAt: now,
      updatedAt: now,
    };
    return { plan, status: plan.status };
  }

  // 1) Validate request contract
  const validation = validateInferenceRequestContract(request, state);
  if (!validation.ok) {
    const plan: ExecutionPlanRecord = {
      planId,
      requestId: request.requestId,
      status: "blocked",
      context: null,
      session: { ...baseSession, status: "blocked", closedAt: now },
      guardErrors: validation.errors,
      error: makeError(
        "validation_failed",
        validation.errors.join(","),
        "guard"
      ),
      selectedRuntimeId: request.runtimeId,
      notes: "Blocked at validation — no provider call.",
      createdAt: now,
      updatedAt: now,
    };
    return { plan, status: plan.status };
  }

  // Working copy for optional runtime selection (not persisted here)
  let working: InferenceRequestRecord = { ...request };

  if (
    input.selectRuntimeIfMissing !== false &&
    !working.runtimeId
  ) {
    const routed = evaluateProviderRouting(state, {
      capabilityId: working.capabilityId,
      tenantId: working.requester.tenantId,
      preferredProviderId: working.providerId,
      preferCostTier: working.costTier,
      now,
    });
    if (routed.selectedRuntimeId) {
      const rt = state.runtimes.find((r) => r.id === routed.selectedRuntimeId);
      working = {
        ...working,
        runtimeId: routed.selectedRuntimeId,
        modelId: working.modelId ?? rt?.modelId ?? null,
        providerId: working.providerId ?? routed.selectedProviderId,
      };
    }
  }

  const budget: ExecutionBudgetContract = {
    tokenBudget: input.budget?.tokenBudget ?? working.maxTokens,
    executionBudgetUnits: input.budget?.executionBudgetUnits ?? 1,
    estimatedTokens:
      input.budget?.estimatedTokens ?? working.maxTokens ?? null,
    estimatedUnits: input.budget?.estimatedUnits ?? 1,
  };

  // 2) Guard (authorize + runtime/lifecycle/quota/budget)
  const guard = evaluateExecutionGuard(working, state, { budget });
  if (!guard.ok || !guard.runtime) {
    const plan: ExecutionPlanRecord = {
      planId,
      requestId: working.requestId,
      status: "blocked",
      context: null,
      session: { ...baseSession, status: "blocked", closedAt: now },
      guardErrors: guard.errors,
      error: makeError(
        "guard_blocked",
        guard.errors.join(","),
        guard.errors.some((e) => e.startsWith("quota_"))
          ? "quota"
          : guard.errors.some((e) => e.startsWith("budget_"))
            ? "budget"
            : guard.errors.some((e) => e.startsWith("permission_"))
              ? "authorization"
              : "guard"
      ),
      selectedRuntimeId: working.runtimeId,
      notes: "Blocked by execution guard — no provider call.",
      createdAt: now,
      updatedAt: now,
    };
    return { plan, status: plan.status };
  }

  if (working.cancellationRequested) {
    const plan: ExecutionPlanRecord = {
      planId,
      requestId: working.requestId,
      status: "cancelled",
      context: null,
      session: { ...baseSession, status: "cancelled", closedAt: now },
      guardErrors: ["cancellation_already_requested"],
      error: makeError(
        "cancelled",
        "Cancellation requested before dispatch",
        "cancellation"
      ),
      selectedRuntimeId: working.runtimeId,
      notes: "Cancelled before dispatch — no provider call.",
      createdAt: now,
      updatedAt: now,
    };
    return { plan, status: plan.status };
  }

  const providerId =
    working.providerId ?? guard.runtime.providerHint ?? "unknown_provider";
  const modelId = working.modelId ?? guard.runtime.modelId;
  const context = buildContext(
    working,
    state,
    guard.runtime.id,
    providerId,
    modelId,
    now,
    budget
  );

  const status: ExecutionPlanStatus =
    working.lifecycle === "queued" ? "queued" : "planned";

  const plan: ExecutionPlanRecord = {
    planId,
    requestId: working.requestId,
    status,
    context,
    session: {
      ...baseSession,
      status,
      closedAt: null,
    },
    guardErrors: [],
    error: null,
    selectedRuntimeId: guard.runtime.id,
    notes:
      "Execution plan only — dispatcher does not invoke providers or models.",
    createdAt: now,
    updatedAt: now,
  };

  // silence unused default import lint if any
  void DEFAULT_EXECUTION_POLICY;

  return { plan, status };
}
