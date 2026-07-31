import type { PrivateAiDeploymentState } from "./types";

/**
 * Legal deployment-state transitions only.
 * No provisioning, training, or inference is performed.
 */
const FORWARD: Record<PrivateAiDeploymentState, PrivateAiDeploymentState[]> = {
  pending: ["provisioning", "offline", "retired"],
  provisioning: ["ready", "unhealthy", "offline", "retired"],
  ready: ["unhealthy", "maintenance", "offline", "retired"],
  unhealthy: ["ready", "maintenance", "offline", "provisioning", "retired"],
  maintenance: ["ready", "offline", "retired"],
  offline: ["pending", "provisioning", "retired"],
  retired: [],
};

export const PRIVATE_AI_DEPLOYMENT_STATE_ORDER: PrivateAiDeploymentState[] = [
  "pending",
  "provisioning",
  "ready",
  "unhealthy",
  "maintenance",
  "offline",
  "retired",
];

export function canTransitionDeploymentState(
  from: PrivateAiDeploymentState,
  to: PrivateAiDeploymentState
): boolean {
  if (from === to) return true;
  return FORWARD[from]?.includes(to) ?? false;
}

export function assertTransitionDeploymentState(
  from: PrivateAiDeploymentState,
  to: PrivateAiDeploymentState
): void {
  if (!canTransitionDeploymentState(from, to)) {
    throw new Error(`Invalid deployment transition: ${from} → ${to}`);
  }
}

export function listAllowedDeploymentTransitions(
  from: PrivateAiDeploymentState
): PrivateAiDeploymentState[] {
  return [...(FORWARD[from] ?? [])];
}

export function deploymentStateIsRoutable(
  state: PrivateAiDeploymentState
): boolean {
  return state === "ready";
}
