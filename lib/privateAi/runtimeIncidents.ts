import type {
  RuntimeIncidentSeverity,
  RuntimeIncidentType,
  RuntimeOperationalIncident,
} from "./types";

export function createRuntimeIncident(input: {
  runtimeId: string;
  type: RuntimeIncidentType;
  severity: RuntimeIncidentSeverity;
  reason: string;
  source?: string;
  actorId?: string | null;
  relatedRuntimeId?: string | null;
  metadata?: Record<string, unknown>;
  now?: string;
}): RuntimeOperationalIncident {
  const timestamp = input.now ?? new Date().toISOString();
  return {
    id: `pai_inc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    runtimeId: input.runtimeId,
    type: input.type,
    severity: input.severity,
    timestamp,
    actorId: input.actorId ?? null,
    source: input.source ?? "system",
    reason: input.reason,
    relatedRuntimeId: input.relatedRuntimeId ?? null,
    metadata: input.metadata ?? {},
  };
}

export function listIncidentsForRuntime(
  incidents: RuntimeOperationalIncident[],
  runtimeId: string,
  limit = 10
): RuntimeOperationalIncident[] {
  return incidents
    .filter((i) => i.runtimeId === runtimeId)
    .slice()
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
    .slice(0, limit);
}

export function latestOpenStyleIncident(
  incidents: RuntimeOperationalIncident[],
  runtimeId: string
): RuntimeOperationalIncident | null {
  const recent = listIncidentsForRuntime(incidents, runtimeId, 1);
  return recent[0] ?? null;
}
