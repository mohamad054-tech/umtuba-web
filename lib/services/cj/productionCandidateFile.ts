import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  CJ_PRODUCTION_CANDIDATE_JSON_RELATIVE_PATH,
  CJ_PRODUCTION_CANDIDATE_TASK_ID,
  buildProductionCandidateFile,
  type ProductionCandidateFile,
} from "./productionCandidate";
import { readApprovedDraftFile, type ApprovedDraftFile } from "./launchDraftFile";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export function productionCandidateFilePath(rootDir = process.cwd()): string {
  return join(rootDir, CJ_PRODUCTION_CANDIDATE_JSON_RELATIVE_PATH);
}

export function writeProductionCandidateFile(
  catalog: ProductionCandidateFile,
  rootDir = process.cwd()
): string {
  const path = productionCandidateFilePath(rootDir);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  return path;
}

export function readProductionCandidateFile(
  rootDir = process.cwd()
): ProductionCandidateFile | null {
  try {
    const parsed: unknown = JSON.parse(
      readFileSync(productionCandidateFilePath(rootDir), "utf8")
    );
    if (!isRecord(parsed)) return null;
    if (parsed.task_id !== CJ_PRODUCTION_CANDIDATE_TASK_ID) return null;
    if (!Array.isArray(parsed.products)) return null;
    return parsed as ProductionCandidateFile;
  } catch {
    return null;
  }
}

export function buildAndWriteProductionCandidate(
  approved: ApprovedDraftFile | null = readApprovedDraftFile()
): ProductionCandidateFile {
  if (!approved) {
    throw new Error("Missing data/cj-store-launch-approved-59.json");
  }
  const catalog = buildProductionCandidateFile(approved);
  writeProductionCandidateFile(catalog);
  return catalog;
}
