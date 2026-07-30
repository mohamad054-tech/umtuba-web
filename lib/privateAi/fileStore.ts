import { mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { join } from "path";
import type { PersistedPrivateAiState } from "./types";

export function resolvePrivateAiDataDir(override?: string): string {
  if (override) return override;
  if (process.env.UMTUBA_PRIVATE_AI_DATA_DIR) {
    return process.env.UMTUBA_PRIVATE_AI_DATA_DIR;
  }
  return join(process.cwd(), "data", "private-ai");
}

export function privateAiStorePath(dataDir: string): string {
  return join(dataDir, "registry.json");
}

export function emptyPrivateAiState(
  now = new Date().toISOString()
): PersistedPrivateAiState {
  return {
    schemaVersion: 1,
    updatedAt: now,
    models: [],
    capabilities: [],
    hardwareContracts: [],
    deploymentProfiles: [],
    routingContracts: [],
    permissions: [],
  };
}

export function readPersistedPrivateAiState(
  dataDir: string
): PersistedPrivateAiState | null {
  try {
    const raw = readFileSync(privateAiStorePath(dataDir), "utf8");
    const parsed = JSON.parse(raw) as PersistedPrivateAiState;
    if (parsed?.schemaVersion !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writePersistedPrivateAiState(
  dataDir: string,
  state: PersistedPrivateAiState
): void {
  mkdirSync(dataDir, { recursive: true });
  const target = privateAiStorePath(dataDir);
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(temp, JSON.stringify(state, null, 2), "utf8");
  renameSync(temp, target);
}
