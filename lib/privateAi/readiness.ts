import type {
  PrivateAiReadinessResult,
  PrivateModelRecord,
  PersistedPrivateAiState,
} from "./types";

/**
 * Readiness Gate — blocks approve/activate when contracts or core fields
 * are incomplete. Does not train, fine-tune, or run inference.
 */
export function evaluatePrivateAiReadiness(
  model: PrivateModelRecord,
  state: Pick<
    PersistedPrivateAiState,
    "hardwareContracts" | "deploymentProfiles" | "routingContracts" | "capabilities"
  >
): PrivateAiReadinessResult {
  const blockers: string[] = [];

  if (!model.name.trim()) blockers.push("name_required");
  if (!model.version.trim()) blockers.push("version_required");
  if (!model.architecture.trim()) blockers.push("architecture_required");
  if (model.capabilities.length < 1) blockers.push("capability_required");
  if (model.deploymentProfileIds.length < 1) {
    blockers.push("deployment_profile_required");
  }
  if (model.routingContractIds.length < 1) {
    blockers.push("routing_contract_required");
  }

  for (const capId of model.capabilities) {
    if (!state.capabilities.some((c) => c.id === capId)) {
      blockers.push(`unknown_capability_${capId}`);
    }
  }
  for (const profileId of model.deploymentProfileIds) {
    if (!state.deploymentProfiles.some((p) => p.id === profileId)) {
      blockers.push(`unknown_deployment_profile_${profileId}`);
    }
  }
  for (const routeId of model.routingContractIds) {
    if (!state.routingContracts.some((r) => r.id === routeId)) {
      blockers.push(`unknown_routing_contract_${routeId}`);
    }
  }

  if (model.modelClass !== "external") {
    if (!model.hardwareContractId) {
      blockers.push("hardware_contract_required");
    } else if (
      !state.hardwareContracts.some((h) => h.id === model.hardwareContractId)
    ) {
      blockers.push("unknown_hardware_contract");
    }
  }

  return { ready: blockers.length === 0, blockers };
}

export function readinessRequiredForTransition(to: string): boolean {
  return to === "approved" || to === "active";
}
