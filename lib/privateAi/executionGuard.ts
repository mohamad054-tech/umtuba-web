import { deploymentStateIsRoutable } from "./deploymentState";
import { resolveExecutionPolicy, resolveExecutionQuota } from "./executionPolicy";
import { hasPermission } from "./permissions";
import type {
  ExecutionBudgetContract,
  ExecutionPolicy,
  ExecutionQuotaContract,
  InferenceRequestRecord,
  PersistedPrivateAiState,
  PrivateAiRuntimeRecord,
} from "./types";

const ALLOWED_MODEL_LIFECYCLES = new Set(["approved", "active"]);

export type ExecutionGuardResult = {
  ok: boolean;
  errors: string[];
  runtime: PrivateAiRuntimeRecord | null;
};

/**
 * Fail-closed execution guard — no provider/model invocation.
 */
export function evaluateExecutionGuard(
  request: InferenceRequestRecord,
  state: PersistedPrivateAiState,
  options?: {
    policy?: ExecutionPolicy;
    quota?: ExecutionQuotaContract;
    budget?: ExecutionBudgetContract;
  }
): ExecutionGuardResult {
  const errors: string[] = [];
  const policy = resolveExecutionPolicy(
    options?.policy ?? state.executionPolicy
  );
  const quota = resolveExecutionQuota(options?.quota ?? state.executionQuota);
  const budget = options?.budget ?? {
    tokenBudget: request.maxTokens,
    executionBudgetUnits: 1,
    estimatedTokens: request.maxTokens,
    estimatedUnits: 1,
  };

  if (!state.capabilities.some((c) => c.id === request.capabilityId)) {
    errors.push("capability_missing");
  }

  let runtime: PrivateAiRuntimeRecord | null = null;
  if (!request.runtimeId) {
    errors.push("runtime_required");
  } else {
    runtime = state.runtimes.find((r) => r.id === request.runtimeId) ?? null;
    if (!runtime) {
      errors.push("runtime_missing");
    } else {
      if (policy.requireReadyRuntime && !deploymentStateIsRoutable(runtime.deploymentState)) {
        errors.push(`runtime_not_ready_${runtime.deploymentState}`);
      }
      if (runtime.deploymentState === "offline") {
        errors.push("runtime_offline");
      }
      if (
        !policy.allowOfflineRuntime &&
        (runtime.deploymentState === "offline" ||
          runtime.availability === "unavailable")
      ) {
        errors.push("runtime_unavailable");
      }
      if (runtime.ops.maintenance.active) {
        errors.push("runtime_maintenance");
      }
      if (!runtime.capabilityIds.includes(request.capabilityId)) {
        errors.push("runtime_capability_mismatch");
      }
    }
  }

  if (!request.modelId) {
    errors.push("model_required");
  } else {
    const model = state.models.find((m) => m.id === request.modelId);
    if (!model) {
      errors.push("model_missing");
    } else if (
      policy.requireApprovedModelLifecycle &&
      !ALLOWED_MODEL_LIFECYCLES.has(model.lifecycle)
    ) {
      errors.push(`model_lifecycle_${model.lifecycle}`);
    }
  }

  if (
    request.lifecycle !== "validated" &&
    request.lifecycle !== "accepted" &&
    request.lifecycle !== "queued"
  ) {
    errors.push(`request_lifecycle_${request.lifecycle}`);
  }

  if (policy.requireInferencePermission) {
    const role = request.requester.role;
    const may =
      hasPermission(state.permissions, {
        scope: "capability",
        resourceId: request.capabilityId,
        role,
        action: "inference_execute",
      }) ||
      hasPermission(state.permissions, {
        scope: "capability",
        resourceId: "*",
        role,
        action: "inference_execute",
      }) ||
      hasPermission(state.permissions, {
        scope: "model",
        resourceId: request.modelId ?? "*",
        role,
        action: "inference_execute",
      }) ||
      hasPermission(state.permissions, {
        scope: "model",
        resourceId: "*",
        role,
        action: "inference_execute",
      }) ||
      hasPermission(state.permissions, {
        scope: "model",
        resourceId: "*",
        role,
        action: "runtime_operate",
      });
    if (!may) errors.push("permission_missing_inference_execute");
  }

  if (quota.requestsUsed >= quota.requestQuota) {
    errors.push("quota_request_exhausted");
  }
  if (quota.dailyUsed >= quota.dailyQuota) {
    errors.push("quota_daily_exhausted");
  }
  if (quota.tenantUsed >= quota.tenantQuota) {
    errors.push("quota_tenant_exhausted");
  }

  if (budget.executionBudgetUnits <= 0) {
    errors.push("budget_execution_invalid");
  }
  if (
    budget.tokenBudget != null &&
    budget.estimatedTokens != null &&
    budget.estimatedTokens > budget.tokenBudget
  ) {
    errors.push("budget_token_exceeded");
  }

  if (request.timeoutMs <= 0 || request.timeoutMs > policy.maxTimeoutMs) {
    errors.push("timeout_out_of_policy");
  }

  if (request.cancellationRequested) {
    errors.push("cancellation_already_requested");
  }

  return { ok: errors.length === 0, errors, runtime };
}
