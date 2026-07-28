import { randomUUID } from "crypto";
import type {
  AiErrorCode,
  AiRunRecord,
  AiRunStatus,
  AiSafetyOutcome,
  AiToolCallSummary,
  AiUsageRecord,
  AiDataClassification,
} from "./types";

const runs = new Map<string, AiRunRecord>();

export function resetAiRunState(): void {
  runs.clear();
}

export function createRun(input: {
  traceId: string;
  userId: string;
  capabilityId: string;
  promptId: string;
  promptVersion: string;
  sessionId?: string | null;
  dataClassification: AiDataClassification;
  parentRunId?: string | null;
}): AiRunRecord {
  const run: AiRunRecord = {
    id: randomUUID(),
    traceId: input.traceId,
    userId: input.userId,
    capabilityId: input.capabilityId,
    promptId: input.promptId,
    promptVersion: input.promptVersion,
    providerId: null,
    modelId: null,
    status: "requested",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    usage: null,
    errorCode: null,
    errorMessage: null,
    safety: null,
    toolCalls: [],
    parentRunId: input.parentRunId ?? null,
    sessionId: input.sessionId ?? null,
    dataClassification: input.dataClassification,
  };
  runs.set(run.id, run);
  return run;
}

export function updateRunStatus(
  runId: string,
  status: AiRunStatus,
  patch?: Partial<
    Pick<
      AiRunRecord,
      | "providerId"
      | "modelId"
      | "usage"
      | "errorCode"
      | "errorMessage"
      | "safety"
      | "toolCalls"
    >
  >
): AiRunRecord {
  const run = runs.get(runId);
  if (!run) {
    throw new Error(`Unknown run ${runId}`);
  }
  run.status = status;
  if (patch) Object.assign(run, patch);
  if (
    status === "completed" ||
    status === "failed" ||
    status === "blocked" ||
    status === "cancelled"
  ) {
    run.finishedAt = new Date().toISOString();
  }
  return run;
}

export function completeRun(input: {
  runId: string;
  providerId: string;
  modelId: string;
  usage: AiUsageRecord;
  safety: AiSafetyOutcome;
  toolCalls: AiToolCallSummary[];
}): AiRunRecord {
  return updateRunStatus(input.runId, "completed", {
    providerId: input.providerId,
    modelId: input.modelId,
    usage: input.usage,
    safety: input.safety,
    toolCalls: input.toolCalls,
  });
}

export function failRun(input: {
  runId: string;
  status: Extract<AiRunStatus, "failed" | "blocked" | "cancelled">;
  code: AiErrorCode;
  message: string;
  safety?: AiSafetyOutcome | null;
}): AiRunRecord {
  return updateRunStatus(input.runId, input.status, {
    errorCode: input.code,
    errorMessage: input.message,
    safety: input.safety ?? null,
  });
}

export function getRun(runId: string): AiRunRecord | null {
  return runs.get(runId) ?? null;
}

export function listRecentRuns(limit = 50): AiRunRecord[] {
  return [...runs.values()]
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .slice(-limit);
}

export function summarizeRunFailures(limit = 200): {
  failed: number;
  blocked: number;
  completed: number;
} {
  const slice = listRecentRuns(limit);
  return {
    failed: slice.filter((r) => r.status === "failed").length,
    blocked: slice.filter((r) => r.status === "blocked").length,
    completed: slice.filter((r) => r.status === "completed").length,
  };
}
