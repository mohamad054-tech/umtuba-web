import { mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { join } from "path";
import type { PersistedAiDataPlatformState } from "./types";

export function resolveAiDataPlatformDataDir(override?: string): string {
  if (override) return override;
  if (process.env.UMTUBA_AI_DATA_PLATFORM_DATA_DIR) {
    return process.env.UMTUBA_AI_DATA_PLATFORM_DATA_DIR;
  }
  return join(process.cwd(), "data", "ai-data-platform");
}

export function aiDataPlatformStorePath(dataDir: string): string {
  return join(dataDir, "registry.json");
}

export function emptyAiDataPlatformState(
  now = new Date().toISOString()
): PersistedAiDataPlatformState {
  return {
    schemaVersion: 1,
    updatedAt: now,
    datasets: [],
    versions: [],
    evaluationSets: [],
    experiments: [],
    models: [],
    promotionQueue: [],
  };
}

export function readPersistedAiDataPlatformState(
  dataDir: string
): PersistedAiDataPlatformState | null {
  try {
    const raw = readFileSync(aiDataPlatformStorePath(dataDir), "utf8");
    const parsed = JSON.parse(raw) as PersistedAiDataPlatformState;
    if (parsed?.schemaVersion !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writePersistedAiDataPlatformState(
  dataDir: string,
  state: PersistedAiDataPlatformState
): void {
  mkdirSync(dataDir, { recursive: true });
  const target = aiDataPlatformStorePath(dataDir);
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(temp, JSON.stringify(state, null, 2), "utf8");
  renameSync(temp, target);
}
