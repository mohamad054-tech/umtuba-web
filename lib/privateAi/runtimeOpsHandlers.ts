import { assertTransitionDeploymentState } from "./deploymentState";
import { decideRuntimeFailover } from "./runtimeFailoverOps";
import { evaluateRuntimeFailureDetection } from "./runtimeFailureDetection";
import { applyRuntimeHealthEvent } from "./runtimeHealth";
import { createRuntimeIncident } from "./runtimeIncidents";
import { resolveProviderRoutingPolicy } from "./providerRoutingPolicy";
import {
  cooldownUntilFrom,
  resolveRuntimeOpsPolicy,
} from "./runtimeOpsPolicy";
import { createEmptyRuntimeOpsState } from "./runtimeOpsState";
import { runtimeMayBecomeDeploymentReady } from "./runtimeReadiness";
import type {
  PersistedPrivateAiState,
  PrivateAiRuntimeRecord,
  RuntimeOperationalIncident,
  RuntimeOverrideMode,
  RuntimeSelectionCriteria,
} from "./types";

function replaceRuntime(
  state: PersistedPrivateAiState,
  updated: PrivateAiRuntimeRecord,
  now: string,
  incident?: RuntimeOperationalIncident | null
): PersistedPrivateAiState {
  return {
    ...state,
    schemaVersion: 7,
    runtimes: state.runtimes.map((r) => (r.id === updated.id ? updated : r)),
    runtimeIncidents: incident
      ? [...(state.runtimeIncidents ?? []), incident]
      : state.runtimeIncidents ?? [],
    updatedAt: now,
  };
}

export function ensureRuntimeOpsDefaults(
  state: PersistedPrivateAiState
): PersistedPrivateAiState {
  return {
    ...state,
    schemaVersion: 7,
    runtimes: (state.runtimes ?? []).map((r) => ({
      ...r,
      ops: r.ops ?? createEmptyRuntimeOpsState(),
      health: {
        ...r.health,
        consecutiveFailures: r.health.consecutiveFailures ?? 0,
        consecutiveSuccesses: r.health.consecutiveSuccesses ?? 0,
        lastHeartbeatSource: r.health.lastHeartbeatSource ?? null,
        lastLatencyMs: r.health.lastLatencyMs ?? null,
      },
    })),
    runtimeIncidents: state.runtimeIncidents ?? [],
    runtimeOpsPolicy: resolveRuntimeOpsPolicy(state.runtimeOpsPolicy),
    inferenceRequests: state.inferenceRequests ?? [],
    executionPlans: state.executionPlans ?? [],
    executionPolicy: state.executionPolicy,
    executionQuota: state.executionQuota,
    providerRoutingPolicy: resolveProviderRoutingPolicy(
      state.providerRoutingPolicy
    ),
    providerRoutingEvaluations: state.providerRoutingEvaluations ?? [],
  };
}

export function handleRecordHeartbeat(
  state: PersistedPrivateAiState,
  input: {
    runtimeId: string;
    source?: string;
    status?: "healthy" | "degraded" | "unhealthy" | "unknown";
    latencyMs?: number | null;
    at?: string;
  }
): { state: PersistedPrivateAiState; runtime: PrivateAiRuntimeRecord } {
  const runtime = state.runtimes.find((r) => r.id === input.runtimeId);
  if (!runtime) throw new Error(`Unknown runtime: ${input.runtimeId}`);
  const now = input.at ?? new Date().toISOString();
  const health = applyRuntimeHealthEvent(runtime.health, {
    kind: "heartbeat",
    at: now,
    source: input.source ?? "admin",
    latencyMs: input.latencyMs ?? null,
    status: input.status,
  });
  const updated: PrivateAiRuntimeRecord = {
    ...runtime,
    health,
    availability: health.availability,
    updatedAt: now,
  };
  return { state: replaceRuntime(state, updated, now), runtime: updated };
}

export function handleEvaluateFailureDetection(
  state: PersistedPrivateAiState,
  runtimeId: string,
  nowIso?: string
): {
  state: PersistedPrivateAiState;
  runtime: PrivateAiRuntimeRecord;
  detection: ReturnType<typeof evaluateRuntimeFailureDetection>;
} {
  const now = nowIso ?? new Date().toISOString();
  const policy = resolveRuntimeOpsPolicy(state.runtimeOpsPolicy);
  let runtime = state.runtimes.find((r) => r.id === runtimeId);
  if (!runtime) throw new Error(`Unknown runtime: ${runtimeId}`);
  const detection = evaluateRuntimeFailureDetection(runtime, policy, now);
  let next = state;
  let incident: RuntimeOperationalIncident | null = null;

  if (detection.missedHeartbeat) {
    incident = createRuntimeIncident({
      runtimeId,
      type: "heartbeat_missed",
      severity: "warning",
      reason: "missed_heartbeat_threshold",
      source: "failure_detection",
      now,
      metadata: { reasons: detection.reasons },
    });
    next = {
      ...next,
      runtimeIncidents: [...(next.runtimeIncidents ?? []), incident],
      updatedAt: now,
    };
  }

  if (detection.shouldMarkUnhealthy) {
    assertTransitionDeploymentState(runtime.deploymentState, "unhealthy");
    runtime = {
      ...runtime,
      deploymentState: "unhealthy",
      runtimeState: "failed",
      availability: "unavailable",
      updatedAt: now,
    };
    const unhealthyIncident = createRuntimeIncident({
      runtimeId,
      type: "runtime_unhealthy",
      severity: "critical",
      reason: detection.reasons.join(","),
      source: "failure_detection",
      now,
    });
    next = replaceRuntime(next, runtime, now, unhealthyIncident);
  } else if (detection.shouldMarkOffline) {
    assertTransitionDeploymentState(runtime.deploymentState, "offline");
    runtime = {
      ...runtime,
      deploymentState: "offline",
      runtimeState: "stopped",
      availability: "unavailable",
      updatedAt: now,
    };
    const offlineIncident = createRuntimeIncident({
      runtimeId,
      type: "runtime_offline",
      severity: "critical",
      reason: detection.reasons.join(","),
      source: "failure_detection",
      now,
    });
    next = replaceRuntime(next, runtime, now, offlineIncident);
  }

  const finalRt = next.runtimes.find((r) => r.id === runtimeId)!;
  return { state: next, runtime: finalRt, detection };
}

export function handleMarkUnhealthy(
  state: PersistedPrivateAiState,
  input: {
    runtimeId: string;
    reason: string;
    actorId?: string | null;
    source?: string;
    now?: string;
  }
): { state: PersistedPrivateAiState; runtime: PrivateAiRuntimeRecord } {
  const runtime = state.runtimes.find((r) => r.id === input.runtimeId);
  if (!runtime) throw new Error(`Unknown runtime: ${input.runtimeId}`);
  const now = input.now ?? new Date().toISOString();
  assertTransitionDeploymentState(runtime.deploymentState, "unhealthy");
  if (runtime.deploymentState === "unhealthy") {
    return { state, runtime };
  }
  const health = applyRuntimeHealthEvent(runtime.health, {
    kind: "failure",
    at: now,
    reason: input.reason,
    source: input.source ?? "admin",
  });
  const updated: PrivateAiRuntimeRecord = {
    ...runtime,
    deploymentState: "unhealthy",
    runtimeState: "failed",
    availability: "unavailable",
    health,
    updatedAt: now,
  };
  const incident = createRuntimeIncident({
    runtimeId: runtime.id,
    type: "runtime_unhealthy",
    severity: "critical",
    reason: input.reason,
    actorId: input.actorId,
    source: input.source ?? "admin",
    now,
  });
  return {
    state: replaceRuntime(state, updated, now, incident),
    runtime: updated,
  };
}

export function handleEnterMaintenance(
  state: PersistedPrivateAiState,
  input: {
    runtimeId: string;
    reason: string;
    actorId?: string | null;
    scheduledAt?: string | null;
    now?: string;
  }
): { state: PersistedPrivateAiState; runtime: PrivateAiRuntimeRecord } {
  const runtime = state.runtimes.find((r) => r.id === input.runtimeId);
  if (!runtime) throw new Error(`Unknown runtime: ${input.runtimeId}`);
  const reason = input.reason.trim();
  if (!reason) throw new Error("Reason required for maintenance");
  const now = input.now ?? new Date().toISOString();
  assertTransitionDeploymentState(runtime.deploymentState, "maintenance");
  const updated: PrivateAiRuntimeRecord = {
    ...runtime,
    deploymentState: "maintenance",
    runtimeState: "stopped",
    availability: "unavailable",
    ops: {
      ...runtime.ops,
      maintenance: {
        active: true,
        reason,
        scheduledAt: input.scheduledAt ?? null,
        enteredAt: now,
        exitedAt: null,
        actorId: input.actorId ?? null,
      },
    },
    updatedAt: now,
  };
  const incident = createRuntimeIncident({
    runtimeId: runtime.id,
    type: "maintenance_entered",
    severity: "info",
    reason,
    actorId: input.actorId,
    source: "admin",
    now,
  });
  return {
    state: replaceRuntime(state, updated, now, incident),
    runtime: updated,
  };
}

export function handleExitMaintenance(
  state: PersistedPrivateAiState,
  input: {
    runtimeId: string;
    reason: string;
    actorId?: string | null;
    now?: string;
  }
): { state: PersistedPrivateAiState; runtime: PrivateAiRuntimeRecord } {
  const runtime = state.runtimes.find((r) => r.id === input.runtimeId);
  if (!runtime) throw new Error(`Unknown runtime: ${input.runtimeId}`);
  const reason = input.reason.trim();
  if (!reason) throw new Error("Reason required to exit maintenance");
  if (!runtime.ops.maintenance.active) {
    throw new Error("Runtime is not in maintenance");
  }
  const now = input.now ?? new Date().toISOString();
  assertTransitionDeploymentState(runtime.deploymentState, "ready");
  const gate = runtimeMayBecomeDeploymentReady(
    { ...runtime, deploymentState: "ready" },
    state
  );
  if (!gate.ready) {
    throw new Error(`Cannot exit maintenance: ${gate.blockers.join(",")}`);
  }
  const updated: PrivateAiRuntimeRecord = {
    ...runtime,
    deploymentState: "ready",
    runtimeState: "running",
    availability: "available",
    ops: {
      ...runtime.ops,
      maintenance: {
        ...runtime.ops.maintenance,
        active: false,
        reason,
        exitedAt: now,
        actorId: input.actorId ?? null,
      },
    },
    updatedAt: now,
  };
  const incident = createRuntimeIncident({
    runtimeId: runtime.id,
    type: "maintenance_exited",
    severity: "info",
    reason,
    actorId: input.actorId,
    source: "admin",
    now,
  });
  return {
    state: replaceRuntime(state, updated, now, incident),
    runtime: updated,
  };
}

export function handleTriggerFailover(
  state: PersistedPrivateAiState,
  input: {
    runtimeId: string;
    reason: string;
    actorId?: string | null;
    criteria?: Partial<RuntimeSelectionCriteria>;
    now?: string;
  }
): {
  state: PersistedPrivateAiState;
  source: PrivateAiRuntimeRecord;
  target: PrivateAiRuntimeRecord | null;
  ok: boolean;
  reason: string;
} {
  const source = state.runtimes.find((r) => r.id === input.runtimeId);
  if (!source) throw new Error(`Unknown runtime: ${input.runtimeId}`);
  const now = input.now ?? new Date().toISOString();
  const policy = resolveRuntimeOpsPolicy(state.runtimeOpsPolicy);
  const decision = decideRuntimeFailover(
    state,
    source,
    policy,
    now,
    input.criteria
  );

  if (!decision.ok || !decision.target) {
    const incident = createRuntimeIncident({
      runtimeId: source.id,
      type: "failover_unavailable",
      severity: "critical",
      reason: decision.reason,
      actorId: input.actorId,
      source: "admin",
      now,
      metadata: { rejected: decision.rejected },
    });
    return {
      state: {
        ...state,
        runtimeIncidents: [...(state.runtimeIncidents ?? []), incident],
        updatedAt: now,
      },
      source,
      target: null,
      ok: false,
      reason: decision.reason,
    };
  }

  const cooldownUntil = cooldownUntilFrom(now, policy.cooldownMs);
  const updatedSource: PrivateAiRuntimeRecord = {
    ...source,
    deploymentState:
      source.deploymentState === "ready" ? "unhealthy" : source.deploymentState,
    runtimeState: "failed",
    availability: "unavailable",
    ops: {
      ...source.ops,
      activeFailoverTargetId: decision.target.id,
      lastFailoverAt: now,
      lastFailoverFromId: source.id,
      cooldownUntil,
      retryCount: source.ops.retryCount + 1,
    },
    updatedAt: now,
  };

  if (source.deploymentState === "ready") {
    assertTransitionDeploymentState("ready", "unhealthy");
  }

  const incident = createRuntimeIncident({
    runtimeId: source.id,
    type: "failover_triggered",
    severity: "warning",
    reason: input.reason || decision.reason,
    actorId: input.actorId,
    source: "admin",
    relatedRuntimeId: decision.target.id,
    now,
  });

  let next = replaceRuntime(state, updatedSource, now, incident);
  // keep target ready; annotate lastFailoverFrom for visibility
  const targetUpdated: PrivateAiRuntimeRecord = {
    ...decision.target,
    ops: {
      ...decision.target.ops,
      lastFailoverFromId: source.id,
    },
    updatedAt: now,
  };
  next = replaceRuntime(next, targetUpdated, now);
  return {
    state: next,
    source: updatedSource,
    target: targetUpdated,
    ok: true,
    reason: decision.reason,
  };
}

export function handleMarkRecovered(
  state: PersistedPrivateAiState,
  input: {
    runtimeId: string;
    reason: string;
    actorId?: string | null;
    now?: string;
    force?: boolean;
  }
): { state: PersistedPrivateAiState; runtime: PrivateAiRuntimeRecord } {
  const runtime = state.runtimes.find((r) => r.id === input.runtimeId);
  if (!runtime) throw new Error(`Unknown runtime: ${input.runtimeId}`);
  const now = input.now ?? new Date().toISOString();
  const policy = resolveRuntimeOpsPolicy(state.runtimeOpsPolicy);

  if (
    runtime.ops.override.active &&
    runtime.ops.override.mode === "force_unhealthy" &&
    !input.force
  ) {
    throw new Error("Manual override force_unhealthy blocks recovery");
  }

  const graceActive =
    runtime.ops.lastFailoverAt &&
    Date.parse(now) - Date.parse(runtime.ops.lastFailoverAt) <
      policy.recoveryGraceMs;
  if (graceActive && !input.force) {
    throw new Error("Recovery grace period active");
  }

  const observations = runtime.ops.healthyObservationCount;
  const successes = runtime.health.consecutiveSuccesses;
  if (
    !input.force &&
    (observations < policy.consecutiveSuccessThreshold ||
      successes < policy.consecutiveSuccessThreshold)
  ) {
    throw new Error(
      `Recovery requires ${policy.consecutiveSuccessThreshold} healthy observations`
    );
  }

  assertTransitionDeploymentState(runtime.deploymentState, "ready");
  const gate = runtimeMayBecomeDeploymentReady(
    { ...runtime, deploymentState: "ready" },
    state
  );
  if (!gate.ready) {
    throw new Error(`Recovery blocked: ${gate.blockers.join(",")}`);
  }

  const updated: PrivateAiRuntimeRecord = {
    ...runtime,
    deploymentState: "ready",
    runtimeState: "running",
    availability: "available",
    health: {
      ...runtime.health,
      status: "healthy",
      availability: "available",
      lastSuccessAt: now,
      consecutiveFailures: 0,
    },
    ops: {
      ...runtime.ops,
      activeFailoverTargetId: null,
      healthyObservationCount: 0,
      retryCount: 0,
      // preserve override if still active
    },
    updatedAt: now,
  };
  const incident = createRuntimeIncident({
    runtimeId: runtime.id,
    type: "runtime_recovered",
    severity: "info",
    reason: input.reason,
    actorId: input.actorId,
    source: "admin",
    now,
  });
  return {
    state: replaceRuntime(state, updated, now, incident),
    runtime: updated,
  };
}

export function handleApplyOverride(
  state: PersistedPrivateAiState,
  input: {
    runtimeId: string;
    mode: RuntimeOverrideMode;
    reason: string;
    actorId?: string | null;
    now?: string;
  }
): { state: PersistedPrivateAiState; runtime: PrivateAiRuntimeRecord } {
  const runtime = state.runtimes.find((r) => r.id === input.runtimeId);
  if (!runtime) throw new Error(`Unknown runtime: ${input.runtimeId}`);
  const reason = input.reason.trim();
  if (!reason) throw new Error("Reason required for override");
  const now = input.now ?? new Date().toISOString();
  const updated: PrivateAiRuntimeRecord = {
    ...runtime,
    ops: {
      ...runtime.ops,
      override: {
        active: true,
        mode: input.mode,
        reason,
        actorId: input.actorId ?? null,
        appliedAt: now,
      },
    },
    updatedAt: now,
  };
  const incident = createRuntimeIncident({
    runtimeId: runtime.id,
    type: "manual_override_applied",
    severity: "warning",
    reason,
    actorId: input.actorId,
    source: "admin",
    now,
    metadata: { mode: input.mode },
  });
  return {
    state: replaceRuntime(state, updated, now, incident),
    runtime: updated,
  };
}

export function handleClearOverride(
  state: PersistedPrivateAiState,
  input: {
    runtimeId: string;
    reason: string;
    actorId?: string | null;
    now?: string;
  }
): { state: PersistedPrivateAiState; runtime: PrivateAiRuntimeRecord } {
  const runtime = state.runtimes.find((r) => r.id === input.runtimeId);
  if (!runtime) throw new Error(`Unknown runtime: ${input.runtimeId}`);
  if (!runtime.ops.override.active) {
    throw new Error("No active override");
  }
  const reason = input.reason.trim();
  if (!reason) throw new Error("Reason required to clear override");
  const now = input.now ?? new Date().toISOString();
  const updated: PrivateAiRuntimeRecord = {
    ...runtime,
    ops: {
      ...runtime.ops,
      override: {
        active: false,
        mode: null,
        reason: null,
        actorId: null,
        appliedAt: null,
      },
    },
    updatedAt: now,
  };
  const incident = createRuntimeIncident({
    runtimeId: runtime.id,
    type: "manual_override_cleared",
    severity: "info",
    reason,
    actorId: input.actorId,
    source: "admin",
    now,
  });
  return {
    state: replaceRuntime(state, updated, now, incident),
    runtime: updated,
  };
}

export function handleRecordSuccessObservation(
  state: PersistedPrivateAiState,
  input: { runtimeId: string; at?: string; source?: string }
): { state: PersistedPrivateAiState; runtime: PrivateAiRuntimeRecord } {
  const runtime = state.runtimes.find((r) => r.id === input.runtimeId);
  if (!runtime) throw new Error(`Unknown runtime: ${input.runtimeId}`);
  const now = input.at ?? new Date().toISOString();
  const health = applyRuntimeHealthEvent(runtime.health, {
    kind: "success",
    at: now,
    source: input.source ?? "admin",
  });
  const updated: PrivateAiRuntimeRecord = {
    ...runtime,
    health,
    availability: health.availability,
    ops: {
      ...runtime.ops,
      healthyObservationCount: runtime.ops.healthyObservationCount + 1,
    },
    updatedAt: now,
  };
  return { state: replaceRuntime(state, updated, now), runtime: updated };
}
