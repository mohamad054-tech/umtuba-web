import { mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import type { PersistedStudioState } from "../types";

export function resolveStudioDataDir(override?: string): string {
  if (override) return override;
  if (process.env.UMTUBA_TRANSLATION_STUDIO_DATA_DIR) {
    return process.env.UMTUBA_TRANSLATION_STUDIO_DATA_DIR;
  }
  return join(process.cwd(), "data", "translation-studio");
}

export function studioStorePath(dataDir: string): string {
  return join(dataDir, "store.json");
}

export function readPersistedStudioState(
  dataDir: string
): PersistedStudioState | null {
  try {
    const raw = readFileSync(studioStorePath(dataDir), "utf8");
    const parsed = JSON.parse(raw) as PersistedStudioState;
    if (parsed?.schemaVersion !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writePersistedStudioState(
  dataDir: string,
  state: PersistedStudioState
): void {
  mkdirSync(dataDir, { recursive: true });
  const target = studioStorePath(dataDir);
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(temp, JSON.stringify(state, null, 2), "utf8");
  renameSync(temp, target);
  // Ensure parent exists for diagnostics
  void dirname(target);
}
