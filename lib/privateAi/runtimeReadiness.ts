import { deploymentStateIsRoutable } from "./deploymentState";
import { hasPermission } from "./permissions";
import type {
  PersistedPrivateAiState,
  PrivateAiRuntimeRecord,
  PrivateModelRecord,
  RuntimeReadinessResult,
} from "./types";

const ALLOWED_MODEL_LIFECYCLES = new Set(["approved", "active"]);

/**
 * Runtime readiness — blocks "ready for routing" when contracts are incomplete.
 * No inference / training / live probes.
 */
export function evaluateRuntimeReadiness(
  runtime: PrivateAiRuntimeRecord,
  state: Pick<
    PersistedPrivateAiState,
    "models" | "capabilities" | "hardwareContracts" | "permissions"
  >
): RuntimeReadinessResult {
  const blockers: string[] = [];
  const model = state.models.find((m) => m.id === runtime.modelId) ?? null;

  if (!model) {
    blockers.push("model_missing");
  } else if (!ALLOWED_MODEL_LIFECYCLES.has(model.lifecycle)) {
    blockers.push(`lifecycle_invalid_${model.lifecycle}`);
  }

  if (runtime.capabilityIds.length < 1) {
    blockers.push("capability_required");
  } else {
    for (const capId of runtime.capabilityIds) {
      if (!state.capabilities.some((c) => c.id === capId)) {
        blockers.push(`unknown_capability_${capId}`);
      }
      if (model && !model.capabilities.includes(capId)) {
        blockers.push(`model_missing_capability_${capId}`);
      }
    }
  }

  if (!deploymentStateIsRoutable(runtime.deploymentState)) {
    blockers.push(`deployment_not_ready_${runtime.deploymentState}`);
  }

  const mayOperate =
    hasPermission(state.permissions, {
      scope: "model",
      resourceId: runtime.modelId,
      role: "platform_admin",
      action: "runtime_operate",
    }) ||
    hasPermission(state.permissions, {
      scope: "model",
      resourceId: "*",
      role: "platform_admin",
      action: "runtime_operate",
    }) ||
    hasPermission(state.permissions, {
      scope: "model",
      resourceId: "*",
      role: "platform_admin",
      action: "lifecycle_update",
    });

  if (!mayOperate) {
    blockers.push("permission_missing_runtime_operate");
  }

  if (modelNeedsHardware(model)) {
    const hwId = runtime.hardwareContractId ?? model?.hardwareContractId ?? null;
    if (!hwId) {
      blockers.push("hardware_contract_required");
    } else if (!state.hardwareContracts.some((h) => h.id === hwId)) {
      blockers.push("unknown_hardware_contract");
    }
  }

  return { ready: blockers.length === 0, blockers };
}

function modelNeedsHardware(model: PrivateModelRecord | null): boolean {
  if (!model) return true;
  return model.modelClass !== "external";
}

export function runtimeMayBecomeDeploymentReady(
  runtime: PrivateAiRuntimeRecord,
  state: Pick<
    PersistedPrivateAiState,
    "models" | "capabilities" | "hardwareContracts" | "permissions"
  >
): RuntimeReadinessResult {
  /** Evaluate readiness as if deployment were already ready (gate before transition). */
  const projected: PrivateAiRuntimeRecord = {
    ...runtime,
    deploymentState: "ready",
  };
  return evaluateRuntimeReadiness(projected, state);
}
