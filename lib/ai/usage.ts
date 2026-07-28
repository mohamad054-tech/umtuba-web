import type { AiUsageRecord } from "./types";

const usageRecords: AiUsageRecord[] = [];
const MAX = 2000;

export function resetAiUsageState(): void {
  usageRecords.length = 0;
}

export function recordUsage(record: AiUsageRecord): AiUsageRecord {
  usageRecords.push(record);
  if (usageRecords.length > MAX) {
    usageRecords.splice(0, usageRecords.length - MAX);
  }
  return record;
}

export function listRecentUsage(limit = 50): AiUsageRecord[] {
  return usageRecords.slice(-limit);
}

export function summarizeUsage(limit = 200): {
  runs: number;
  inputTokens: number;
  outputTokens: number;
  costAvailableRuns: number;
  costUnavailableRuns: number;
} {
  const slice = usageRecords.slice(-limit);
  let inputTokens = 0;
  let outputTokens = 0;
  let costAvailableRuns = 0;
  let costUnavailableRuns = 0;
  for (const row of slice) {
    inputTokens += row.inputTokens ?? 0;
    outputTokens += row.outputTokens ?? 0;
    if (row.costStatus === "unavailable") costUnavailableRuns += 1;
    else costAvailableRuns += 1;
  }
  return {
    runs: slice.length,
    inputTokens,
    outputTokens,
    costAvailableRuns,
    costUnavailableRuns,
  };
}

export function buildUsageRecord(input: {
  partial: Omit<
    AiUsageRecord,
    "capabilityId" | "userId" | "workspaceId" | "runId" | "billingClassification"
  >;
  capabilityId: string;
  userId: string;
  workspaceId: string | null;
  runId: string;
  billingClassification?: AiUsageRecord["billingClassification"];
}): AiUsageRecord {
  return {
    ...input.partial,
    capabilityId: input.capabilityId,
    userId: input.userId,
    workspaceId: input.workspaceId,
    runId: input.runId,
    billingClassification: input.billingClassification ?? "unbilled",
  };
}
