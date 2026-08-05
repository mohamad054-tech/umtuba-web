import type { AuditTrailEntry, DatasetWorkflowAction } from "./types";

export function createAuditTrailEntry(input: {
  action: DatasetWorkflowAction | string;
  actorId?: string | null;
  reason?: string | null;
  previousState?: string | null;
  newState?: string | null;
  datasetId?: string | null;
  versionId?: string | null;
  detail?: Record<string, unknown>;
  now?: string;
}): AuditTrailEntry {
  const now = input.now ?? new Date().toISOString();
  return {
    id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    actorId: input.actorId ?? null,
    timestamp: now,
    action: input.action,
    reason: input.reason ?? null,
    previousState: input.previousState ?? null,
    newState: input.newState ?? null,
    datasetId: input.datasetId ?? null,
    versionId: input.versionId ?? null,
    detail: input.detail ?? {},
  };
}
