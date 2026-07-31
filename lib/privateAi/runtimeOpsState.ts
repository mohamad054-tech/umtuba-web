import type {
  RuntimeMaintenanceMeta,
  RuntimeManualOverride,
  RuntimeOpsState,
} from "./types";

export function emptyMaintenanceMeta(): RuntimeMaintenanceMeta {
  return {
    active: false,
    reason: null,
    scheduledAt: null,
    enteredAt: null,
    exitedAt: null,
    actorId: null,
  };
}

export function emptyManualOverride(): RuntimeManualOverride {
  return {
    active: false,
    mode: null,
    reason: null,
    actorId: null,
    appliedAt: null,
  };
}

export function createEmptyRuntimeOpsState(): RuntimeOpsState {
  return {
    maintenance: emptyMaintenanceMeta(),
    override: emptyManualOverride(),
    activeFailoverTargetId: null,
    lastFailoverAt: null,
    lastFailoverFromId: null,
    cooldownUntil: null,
    healthyObservationCount: 0,
    retryCount: 0,
  };
}
