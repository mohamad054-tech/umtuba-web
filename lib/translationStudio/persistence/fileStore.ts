import {
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "fs";
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

export function readPersistedStudioStateFromFile(
  filePath: string
): PersistedStudioState | null {
  try {
    const raw = readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as PersistedStudioState;
    if (parsed?.schemaVersion !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writePersistedStudioStateToFile(
  filePath: string,
  state: PersistedStudioState
): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const temp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(temp, JSON.stringify(state, null, 2), "utf8");
  renameSync(temp, filePath);
}

export function removePersistedStudioStateFile(filePath: string): boolean {
  try {
    unlinkSync(filePath);
    return true;
  } catch {
    return false;
  }
}

export function readPersistedStudioState(
  dataDir: string
): PersistedStudioState | null {
  return readPersistedStudioStateFromFile(studioStorePath(dataDir));
}

export function writePersistedStudioState(
  dataDir: string,
  state: PersistedStudioState
): void {
  writePersistedStudioStateToFile(studioStorePath(dataDir), state);
}
