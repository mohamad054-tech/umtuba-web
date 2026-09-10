import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { LOCALIZATION_FINAL_CATALOG_JSON_RELATIVE_PATH } from "../../store/productLocalization/constants";
import { CJ_EXPANSION_JSON_RELATIVE_PATH, CJ_EXPANSION_TASK_ID } from "./expansionTaxonomy";
import type { ExpansionAcceptedProduct, ExpansionCatalogFile } from "./expansionPipeline";
import { CJ_STORE_LAUNCH_JSON_RELATIVE_PATH } from "./launchDraft";
import { CJ_PRODUCTION_CANDIDATE_JSON_RELATIVE_PATH } from "./productionCandidate";

export const CJ_NEXT_EXPANSION_TASK_ID =
  "UMTUBA_STORE_NEXT_CATALOG_EXPANSION_ALL_LANGUAGES_V1" as const;
export const CJ_NEXT_EXPANSION_JSON_RELATIVE_PATH =
  "data/cj-catalog-next-expansion-all-locales-v1.json" as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export function expansionCatalogPath(rootDir = process.cwd()): string {
  return join(rootDir, CJ_EXPANSION_JSON_RELATIVE_PATH);
}

export function writeExpansionCatalogFile(
  catalog: ExpansionCatalogFile,
  rootDir = process.cwd()
): string {
  const path = expansionCatalogPath(rootDir);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  return path;
}

export function readExpansionCatalogFile(rootDir = process.cwd()): ExpansionCatalogFile | null {
  try {
    const parsed: unknown = JSON.parse(readFileSync(expansionCatalogPath(rootDir), "utf8"));
    if (!isRecord(parsed)) return null;
    if (parsed.task_id !== CJ_EXPANSION_TASK_ID) return null;
    if (!Array.isArray(parsed.products)) return null;
    return parsed as ExpansionCatalogFile;
  } catch {
    return null;
  }
}

function collectIdsFromJson(path: string, ids: Set<string>): void {
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (!isRecord(parsed) || !Array.isArray(parsed.products)) return;
    for (const row of parsed.products) {
      if (!isRecord(row)) continue;
      const identity = isRecord(row.identity) ? row.identity : row;
      const id = identity.cj_product_id;
      if (typeof id === "string" && id.trim()) ids.add(id.trim());
    }
  } catch {
    /* reserved-id files are optional for isolated tests */
  }
}

/** Approved 59 + candidate identities — expansion must never overwrite these. */
export function readReservedApprovedCjProductIds(rootDir = process.cwd()): Set<string> {
  const ids = new Set<string>();
  collectIdsFromJson(join(rootDir, CJ_STORE_LAUNCH_JSON_RELATIVE_PATH), ids);
  collectIdsFromJson(join(rootDir, CJ_PRODUCTION_CANDIDATE_JSON_RELATIVE_PATH), ids);
  return ids;
}

function isAcceptedExpansionProduct(row: unknown): row is ExpansionAcceptedProduct {
  if (!isRecord(row)) return false;
  return (
    typeof row.cj_product_id === "string" &&
    Boolean(row.cj_product_id.trim()) &&
    typeof row.title === "string" &&
    typeof row.description === "string" &&
    Array.isArray(row.image_urls) &&
    typeof row.department === "string" &&
    typeof row.subcategory === "string" &&
    typeof row.retail_price_minor === "number" &&
    typeof row.landed_cost_minor === "number" &&
    typeof row.gross_profit_minor === "number" &&
    typeof row.gross_margin === "number" &&
    typeof row.stock === "number" &&
    row.availability === "in_stock"
  );
}

export function readCanonicalStoreProductIds(rootDir = process.cwd()): Set<string> {
  const ids = new Set<string>();
  collectIdsFromJson(join(rootDir, LOCALIZATION_FINAL_CATALOG_JSON_RELATIVE_PATH), ids);
  return ids;
}

/**
 * Leftover accepted expansion SKUs that already exist in canonical but were
 * never written into the 473-row expansion-300 browse file.
 */
export function readLeftoverCanonicalExpansionProducts(
  reservedIds: ReadonlySet<string>,
  rootDir = process.cwd()
): ExpansionAcceptedProduct[] {
  try {
    const parsed: unknown = JSON.parse(
      readFileSync(join(rootDir, CJ_NEXT_EXPANSION_JSON_RELATIVE_PATH), "utf8")
    );
    if (!isRecord(parsed) || parsed.task_id !== CJ_NEXT_EXPANSION_TASK_ID) return [];
    if (!Array.isArray(parsed.products)) return [];
    const canonicalIds = readCanonicalStoreProductIds(rootDir);
    const leftover: ExpansionAcceptedProduct[] = [];
    const seen = new Set<string>();
    for (const row of parsed.products) {
      if (!isAcceptedExpansionProduct(row)) continue;
      if (reservedIds.has(row.cj_product_id) || seen.has(row.cj_product_id)) continue;
      if (!canonicalIds.has(row.cj_product_id)) continue;
      seen.add(row.cj_product_id);
      leftover.push(row);
    }
    return leftover;
  } catch {
    return [];
  }
}
