import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { CJ_CATALOG_JSON_RELATIVE_PATH, CJ_PILOT_BATCH, CJ_PROVIDER } from "./constants";
import { emptyDryRunCatalog } from "./pipeline";
import type { CjPilotCatalogFile, CjPilotRecord } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export function catalogFilePath(rootDir = process.cwd()): string {
  return join(rootDir, CJ_CATALOG_JSON_RELATIVE_PATH);
}

export function writeCjPilotCatalogFile(
  catalog: CjPilotCatalogFile,
  rootDir = process.cwd()
): string {
  const path = catalogFilePath(rootDir);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  return path;
}

export function readCjPilotCatalogFile(
  rootDir = process.cwd()
): CjPilotCatalogFile | null {
  try {
    const parsed: unknown = JSON.parse(readFileSync(catalogFilePath(rootDir), "utf8"));
    if (!isRecord(parsed)) return null;
    if (parsed.provider !== CJ_PROVIDER || parsed.pilot_batch !== CJ_PILOT_BATCH) {
      return null;
    }
    if (!Array.isArray(parsed.products)) return null;
    return parsed as CjPilotCatalogFile;
  } catch {
    return null;
  }
}

export function loadPreviewRecords(rootDir = process.cwd()): {
  catalog: CjPilotCatalogFile;
  accepted: CjPilotRecord[];
} {
  const catalog = readCjPilotCatalogFile(rootDir) ?? emptyDryRunCatalog();
  return {
    catalog,
    accepted: catalog.products.filter((row) => row.decision === "accepted"),
  };
}
