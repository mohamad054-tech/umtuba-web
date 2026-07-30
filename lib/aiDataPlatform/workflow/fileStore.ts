import { mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { join } from "path";
import { resolveAiDataPlatformDataDir } from "../fileStore";
import type { PersistedAiDataWorkflowState } from "./types";

export function resolveAiDataWorkflowDataDir(override?: string): string {
  return resolveAiDataPlatformDataDir(override);
}

export function aiDataWorkflowStorePath(dataDir: string): string {
  return join(dataDir, "workflow.json");
}

export function emptyAiDataWorkflowState(
  now = new Date().toISOString()
): PersistedAiDataWorkflowState {
  return {
    schemaVersion: 1,
    updatedAt: now,
    datasets: [],
    versions: [],
    experimentCandidates: [],
    modelCandidates: [],
    auditTrail: [],
  };
}

export function readPersistedAiDataWorkflowState(
  dataDir: string
): PersistedAiDataWorkflowState | null {
  try {
    const raw = readFileSync(aiDataWorkflowStorePath(dataDir), "utf8");
    const parsed = JSON.parse(raw) as PersistedAiDataWorkflowState;
    if (parsed?.schemaVersion !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writePersistedAiDataWorkflowState(
  dataDir: string,
  state: PersistedAiDataWorkflowState
): void {
  mkdirSync(dataDir, { recursive: true });
  const target = aiDataWorkflowStorePath(dataDir);
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(temp, JSON.stringify(state, null, 2), "utf8");
  renameSync(temp, target);
}
