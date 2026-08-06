import type {
  RuntimeAvailability,
  RuntimeErrorClass,
  RuntimeHealthSnapshot,
} from "./types";

export function createEmptyRuntimeHealth(
  notes = "No live health probes — contract snapshot only."
): RuntimeHealthSnapshot {
  return {
    status: "unknown",
    lastHeartbeatAt: null,
    lastSuccessAt: null,
    lastFailureAt: null,
    lastFailureReason: null,
    errorClass: "none",
    availability: "unknown",
    notes,
  };
}

export function classifyRuntimeError(reason: string | null): RuntimeErrorClass {
  if (!reason) return "none";
  const r = reason.toLowerCase();
  if (r.includes("timeout") || r.includes("timed out")) return "timeout";
  if (r.includes("auth") || r.includes("unauthorized") || r.includes("forbidden")) {
    return "auth";
  }
  if (r.includes("capacity") || r.includes("overload") || r.includes("quota")) {
    return "capacity";
  }
  if (r.includes("config") || r.includes("misconfig")) return "config";
  if (r.includes("dependency") || r.includes("upstream")) return "dependency";
  return "unknown";
}

export function availabilityFromHealthStatus(
  status: RuntimeHealthSnapshot["status"]
): RuntimeAvailability {
  switch (status) {
    case "healthy":
      return "available";
    case "degraded":
      return "degraded";
    case "unhealthy":
      return "unavailable";
    default:
      return "unknown";
  }
}

/**
 * Record a synthetic health event into a snapshot.
 * Does not ping any server.
 */
export function applyRuntimeHealthEvent(
  current: RuntimeHealthSnapshot,
  input: {
    kind: "heartbeat" | "success" | "failure";
    at?: string;
    reason?: string | null;
    status?: RuntimeHealthSnapshot["status"];
  }
): RuntimeHealthSnapshot {
  const at = input.at ?? new Date().toISOString();
  if (input.kind === "heartbeat") {
    const status = input.status ?? (current.status === "unknown" ? "healthy" : current.status);
    return {
      ...current,
      status,
      lastHeartbeatAt: at,
      availability: availabilityFromHealthStatus(status),
      notes: current.notes,
    };
  }
  if (input.kind === "success") {
    const status = input.status ?? "healthy";
    return {
      ...current,
      status,
      lastHeartbeatAt: at,
      lastSuccessAt: at,
      errorClass: "none",
      lastFailureReason: null,
      availability: availabilityFromHealthStatus(status),
    };
  }
  const reason = input.reason?.trim() || "unspecified_failure";
  const status = input.status ?? "unhealthy";
  return {
    ...current,
    status,
    lastHeartbeatAt: at,
    lastFailureAt: at,
    lastFailureReason: reason,
    errorClass: classifyRuntimeError(reason),
    availability: availabilityFromHealthStatus(status),
  };
}
