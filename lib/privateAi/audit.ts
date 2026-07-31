import type {
  PrivateAiAuditTrailEntry,
  PrivateAiLifecycle,
  PrivateAiWorkflowAction,
} from "./types";

export function createPrivateAiAuditEntry(input: {
  action: PrivateAiWorkflowAction | string;
  actorId?: string | null;
  actorRole?: string | null;
  reason?: string | null;
  previousState?: PrivateAiLifecycle | null;
  newState?: PrivateAiLifecycle | null;
  modelId?: string | null;
  detail?: Record<string, unknown>;
  now?: string;
}): PrivateAiAuditTrailEntry {
  const now = input.now ?? new Date().toISOString();
  return {
    id: `pai_aud_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    actorId: input.actorId ?? null,
    actorRole: input.actorRole ?? null,
    timestamp: now,
    action: input.action,
    reason: input.reason ?? null,
    previousState: input.previousState ?? null,
    newState: input.newState ?? null,
    modelId: input.modelId ?? null,
    detail: input.detail ?? {},
  };
}
