import { evaluateRuntimeReadiness } from "./runtimeReadiness";
import { deploymentStateIsRoutable } from "./deploymentState";
import type {
  PersistedPrivateAiState,
  RuntimeDiagnosticRow,
} from "./types";

/**
 * Admin diagnostics rows — contract status only, no live probes.
 */
export function buildRuntimeDiagnostics(
  state: PersistedPrivateAiState
): RuntimeDiagnosticRow[] {
  return state.runtimes.map((runtime) => {
    const readiness = evaluateRuntimeReadiness(runtime, state);
    const failureReasons = [
      ...readiness.blockers,
      ...(runtime.health.lastFailureReason
        ? [`last_failure:${runtime.health.lastFailureReason}`]
        : []),
    ];
    const routingEligible =
      readiness.ready &&
      deploymentStateIsRoutable(runtime.deploymentState) &&
      runtime.availability !== "unavailable" &&
      (runtime.runtimeState === "running" ||
        runtime.runtimeState === "degraded");

    return {
      runtimeId: runtime.id,
      modelId: runtime.modelId,
      label: runtime.label,
      deploymentState: runtime.deploymentState,
      runtimeState: runtime.runtimeState,
      readiness,
      availability: runtime.availability,
      routingEligible,
      failureReasons,
      health: runtime.health,
    };
  });
}
