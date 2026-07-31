import { deploymentStateIsRoutable } from "./deploymentState";
import {
  latestOpenStyleIncident,
  listIncidentsForRuntime,
} from "./runtimeIncidents";
import { isCooldownActive } from "./runtimeOpsPolicy";
import { evaluateRuntimeReadiness } from "./runtimeReadiness";
import { hasRuntimeOpsPermission } from "./permissions";
import type {
  PersistedPrivateAiState,
  RuntimeDiagnosticRow,
} from "./types";

/**
 * Admin diagnostics rows — contract + ops status only, no live probes.
 */
export function buildRuntimeDiagnostics(
  state: PersistedPrivateAiState,
  nowIso = new Date().toISOString()
): RuntimeDiagnosticRow[] {
  const incidents = state.runtimeIncidents ?? [];

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
      !runtime.ops.maintenance.active &&
      runtime.availability !== "unavailable" &&
      (runtime.runtimeState === "running" ||
        runtime.runtimeState === "degraded");

    const allowedOpsActions: string[] = [];
    const role = "platform_admin";
    const can = (action: string) =>
      hasRuntimeOpsPermission(state.permissions, {
        role,
        modelId: runtime.modelId,
        action,
      });

    if (can("heartbeat_record")) allowedOpsActions.push("record_heartbeat");
    if (can("runtime_operate") && runtime.deploymentState === "ready") {
      allowedOpsActions.push("mark_unhealthy");
    }
    if (can("maintenance_manage") && !runtime.ops.maintenance.active) {
      allowedOpsActions.push("enter_maintenance");
    }
    if (can("maintenance_manage") && runtime.ops.maintenance.active) {
      allowedOpsActions.push("exit_maintenance");
    }
    if (can("failover_trigger") && runtime.deploymentState === "unhealthy") {
      allowedOpsActions.push("trigger_failover");
    }
    if (can("override_manage") && runtime.ops.override.active) {
      allowedOpsActions.push("clear_override");
    }
    if (can("override_manage") && !runtime.ops.override.active) {
      allowedOpsActions.push("apply_override");
    }
    if (
      can("runtime_recover") &&
      (runtime.deploymentState === "unhealthy" ||
        runtime.deploymentState === "maintenance")
    ) {
      allowedOpsActions.push("mark_recovered");
    }

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
      consecutiveFailures: runtime.health.consecutiveFailures,
      consecutiveSuccesses: runtime.health.consecutiveSuccesses,
      lastHeartbeatAt: runtime.health.lastHeartbeatAt,
      activeIncident: latestOpenStyleIncident(incidents, runtime.id),
      activeFailoverTargetId: runtime.ops.activeFailoverTargetId,
      cooldownUntil: isCooldownActive(runtime.ops.cooldownUntil, nowIso)
        ? runtime.ops.cooldownUntil
        : null,
      maintenanceActive: runtime.ops.maintenance.active,
      overrideActive: runtime.ops.override.active,
      recentIncidents: listIncidentsForRuntime(incidents, runtime.id, 5),
      allowedOpsActions,
    };
  });
}
