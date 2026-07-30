import type { AcquisitionHistoryEntry } from "./types";

export function createAcquisitionHistoryEntry(input: {
  entityType: AcquisitionHistoryEntry["entityType"];
  entityId: string;
  action: string;
  actorId?: string | null;
  detail?: Record<string, unknown>;
  now?: string;
}): AcquisitionHistoryEntry {
  const now = input.now ?? new Date().toISOString();
  return {
    id: `hist_${input.entityType}_${input.entityId}_${now.replace(/[:.]/g, "")}`,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    actorId: input.actorId ?? null,
    detail: input.detail ?? {},
    createdAt: now,
  };
}
