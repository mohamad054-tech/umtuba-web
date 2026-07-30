import { mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { join } from "path";
import { resolveStudioDataDir } from "../persistence/fileStore";
import type { PersistedIntelligenceState } from "./types";

export function intelligenceStorePath(dataDir: string): string {
  return join(dataDir, "intelligence.json");
}

export function emptyIntelligenceState(
  now = new Date().toISOString()
): PersistedIntelligenceState {
  return {
    schemaVersion: 1,
    updatedAt: now,
    records: [],
    index: [],
    externalCandidates: [],
  };
}

export function readPersistedIntelligenceState(
  dataDir: string
): PersistedIntelligenceState | null {
  try {
    const raw = readFileSync(intelligenceStorePath(dataDir), "utf8");
    const parsed = JSON.parse(raw) as PersistedIntelligenceState;
    if (parsed?.schemaVersion !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writePersistedIntelligenceState(
  dataDir: string,
  state: PersistedIntelligenceState
): void {
  mkdirSync(dataDir, { recursive: true });
  const target = intelligenceStorePath(dataDir);
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(temp, JSON.stringify(state, null, 2), "utf8");
  renameSync(temp, target);
}

export function resolveIntelligenceDataDir(override?: string): string {
  return resolveStudioDataDir(override);
}
