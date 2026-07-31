import { deploymentStateIsRoutable } from "./deploymentState";
import { hasPermission } from "./permissions";
import type {
  InferenceRequestRecord,
  PersistedPrivateAiState,
} from "./types";

const ALLOWED_MODEL_LIFECYCLES = new Set(["approved", "active"]);

export type InferenceValidationResult = {
  ok: boolean;
  errors: string[];
};

/**
 * Fail-closed validation for inference request contracts.
 * Does not execute models or contact providers.
 */
export function validateInferenceRequestContract(
  request: InferenceRequestRecord,
  state: PersistedPrivateAiState
): InferenceValidationResult {
  const errors: string[] = [];

  if (!request.requestId.trim()) errors.push("request_id_required");
  if (!request.requester.tenantId.trim()) errors.push("tenant_required");
  if (!request.requester.role.trim()) errors.push("requester_role_required");
  if (!request.correlationId.trim()) errors.push("correlation_id_required");

  if (
    !request.payload.prompt.trim() ||
    request.payload.inputKind === "empty"
  ) {
    errors.push("payload_empty");
  }

  if (request.timeoutMs <= 0) errors.push("timeout_invalid");
  if (request.retry.maxAttempts < 1) errors.push("retry_max_invalid");
  if (
    request.structuredOutput.mode === "schema" &&
    !request.structuredOutput.schemaId?.trim()
  ) {
    errors.push("structured_schema_required");
  }
  if (request.streaming.enabled && !request.streaming.streamId?.trim()) {
    errors.push("stream_id_required");
  }

  const capability = state.capabilities.find(
    (c) => c.id === request.capabilityId
  );
  if (!capability) errors.push("capability_missing");

  if (request.runtimeId) {
    const runtime = state.runtimes.find((r) => r.id === request.runtimeId);
    if (!runtime) {
      errors.push("runtime_missing");
    } else {
      if (!deploymentStateIsRoutable(runtime.deploymentState)) {
        errors.push(`runtime_deployment_${runtime.deploymentState}`);
      }
      if (runtime.ops.maintenance.active) {
        errors.push("runtime_maintenance");
      }
      if (runtime.availability === "unavailable") {
        errors.push("runtime_unavailable");
      }
      if (!runtime.capabilityIds.includes(request.capabilityId)) {
        errors.push("runtime_capability_mismatch");
      }
      if (
        request.providerId &&
        runtime.providerHint &&
        runtime.providerHint !== request.providerId
      ) {
        errors.push("provider_mismatch");
      }
      if (!request.modelId) {
        // inherit check via runtime model
      } else if (runtime.modelId !== request.modelId) {
        errors.push("runtime_model_mismatch");
      }
    }
  } else {
    errors.push("runtime_required");
  }

  if (request.modelId) {
    const model = state.models.find((m) => m.id === request.modelId);
    if (!model) {
      errors.push("model_missing");
    } else {
      if (!ALLOWED_MODEL_LIFECYCLES.has(model.lifecycle)) {
        errors.push(`model_lifecycle_${model.lifecycle}`);
      }
      if (!model.capabilities.includes(request.capabilityId)) {
        errors.push("model_capability_mismatch");
      }
    }
  } else {
    errors.push("model_required");
  }

  if (!request.providerId?.trim()) {
    errors.push("provider_required");
  }

  const mayExecute =
    hasPermission(state.permissions, {
      scope: "capability",
      resourceId: request.capabilityId,
      role: request.requester.role,
      action: "inference_execute",
    }) ||
    hasPermission(state.permissions, {
      scope: "capability",
      resourceId: "*",
      role: request.requester.role,
      action: "inference_execute",
    }) ||
    hasPermission(state.permissions, {
      scope: "model",
      resourceId: request.modelId ?? "*",
      role: request.requester.role,
      action: "inference_execute",
    }) ||
    hasPermission(state.permissions, {
      scope: "model",
      resourceId: "*",
      role: request.requester.role,
      action: "inference_execute",
    }) ||
    hasPermission(state.permissions, {
      scope: "model",
      resourceId: "*",
      role: request.requester.role,
      action: "runtime_operate",
    });

  if (!mayExecute) {
    errors.push("permission_missing_inference_execute");
  }

  return { ok: errors.length === 0, errors };
}
