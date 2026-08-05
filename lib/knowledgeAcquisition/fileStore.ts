import { mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { join } from "path";
import type { PersistedKnowledgeAcquisitionState } from "./types";

export function resolveKnowledgeAcquisitionDataDir(override?: string): string {
  if (override) return override;
  if (process.env.UMTUBA_KNOWLEDGE_ACQUISITION_DATA_DIR) {
    return process.env.UMTUBA_KNOWLEDGE_ACQUISITION_DATA_DIR;
  }
  return join(process.cwd(), "data", "knowledge-acquisition");
}

export function knowledgeAcquisitionStorePath(dataDir: string): string {
  return join(dataDir, "registry.json");
}

export function emptyKnowledgeAcquisitionState(
  now = new Date().toISOString()
): PersistedKnowledgeAcquisitionState {
  return {
    schemaVersion: 1,
    updatedAt: now,
    sources: [],
    assets: [],
    datasets: [],
    graphNodes: [],
    graphEdges: [],
    history: [],
  };
}

export function readPersistedKnowledgeAcquisitionState(
  dataDir: string
): PersistedKnowledgeAcquisitionState | null {
  try {
    const raw = readFileSync(knowledgeAcquisitionStorePath(dataDir), "utf8");
    const parsed = JSON.parse(raw) as PersistedKnowledgeAcquisitionState;
    if (parsed?.schemaVersion !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writePersistedKnowledgeAcquisitionState(
  dataDir: string,
  state: PersistedKnowledgeAcquisitionState
): void {
  mkdirSync(dataDir, { recursive: true });
  const target = knowledgeAcquisitionStorePath(dataDir);
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(temp, JSON.stringify(state, null, 2), "utf8");
  renameSync(temp, target);
}
