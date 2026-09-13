/**
 * READ-ONLY CJ discovery for UMTUBA_STORE_NEXT_CATALOG_EXPANSION_ALL_LANGUAGES_V1.
 * Does not overwrite the 300 expansion file or the 532 canonical catalog.
 * Never prints CJ_API_KEY / tokens / .env.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createCjReadOnlyClient, hasCjApiKey, readCjApiKeyFromEnv } from "../../lib/services/cj/client";
import { runCatalogExpansion, type ExpansionCatalogFile } from "../../lib/services/cj/expansionPipeline";
import {
  EXPANSION_SEARCH_KEYWORDS,
  type StoreDepartment,
} from "../../lib/services/cj/expansionTaxonomy";
import { createFileTokenCache } from "../../lib/services/cj/tokenCache";

const TASK_ID = "UMTUBA_STORE_NEXT_CATALOG_EXPANSION_ALL_LANGUAGES_V1";
const OUTPUT_RELATIVE = "data/cj-catalog-next-expansion-all-locales-v1.json";
const CANONICAL_RELATIVE = "data/cj-catalog-532-localized-final-v1.json";
const DEPARTMENTS: StoreDepartment[] = [
  "ELECTRONICS & ACCESSORIES",
  "SPORTS & FITNESS",
  "GARDEN & OUTDOOR",
];

function loadEnvLocalSilently(): void {
  const path = join(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!key.startsWith("CJ_")) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined || process.env[key] === "") {
      process.env[key] = value;
    }
  }
}

function readCanonicalSkipIds(): Set<string> {
  const parsed: unknown = JSON.parse(readFileSync(join(process.cwd(), CANONICAL_RELATIVE), "utf8"));
  const ids = new Set<string>();
  if (!parsed || typeof parsed !== "object") return ids;
  const products = (parsed as { products?: unknown }).products;
  if (!Array.isArray(products)) return ids;
  for (const row of products) {
    if (!row || typeof row !== "object") continue;
    const id = (row as { cj_product_id?: unknown }).cj_product_id;
    if (typeof id === "string" && id.trim()) ids.add(id.trim());
  }
  return ids;
}

function writeOutput(catalog: ExpansionCatalogFile): void {
  const path = join(process.cwd(), OUTPUT_RELATIVE);
  mkdirSync(dirname(path), { recursive: true });
  const stamped = {
    ...catalog,
    task_id: TASK_ID,
    source_note:
      "New live READ-ONLY CJ expansion. Skips all 532 canonical IDs. Does not overwrite cj-catalog-expansion-300-v1.json.",
  };
  writeFileSync(path, `${JSON.stringify(stamped, null, 2)}\n`, "utf8");
}

async function main(): Promise<void> {
  loadEnvLocalSilently();
  const skip = readCanonicalSkipIds();
  const apiKey = readCjApiKeyFromEnv();
  if (!hasCjApiKey(apiKey)) {
    process.stdout.write("CJ_API_KEY_PRESENT=false\n");
    process.stdout.write("STATUS=BLOCKED_NO_SAFE_SOURCE\n");
    process.exit(2);
  }
  process.stdout.write(`CJ_API_KEY_PRESENT=true\nSKIP_CANONICAL_IDS=${skip.size}\n`);
  process.stdout.write(`DEPARTMENTS=${DEPARTMENTS.join("|")}\nTARGET=30\n`);

  const client = createCjReadOnlyClient({
    apiKey,
    cache: createFileTokenCache(),
  });
  const catalog = await runCatalogExpansion({
    client,
    skipProductIds: skip,
    seedProducts: [],
    departments: DEPARTMENTS,
    keywordsByDepartment: EXPANSION_SEARCH_KEYWORDS,
    target: 30,
    deptCap: 12,
    subCap: 4,
    maxListPages: 1,
    maxDetailFetches: 180,
    maxFreightFetches: 140,
    gapMs: 450,
    onProgress: (snapshot) => {
      writeOutput(snapshot);
      process.stdout.write(
        `PROGRESS accepted=${snapshot.additional_products_accepted} paid=${snapshot.paid_ad_ready} organic=${snapshot.organic_only} rejected=${snapshot.rejected} listed=${snapshot.candidates_fetched}\n`
      );
    },
  });
  writeOutput(catalog);
  process.stdout.write(
    `FINAL accepted=${catalog.additional_products_accepted} paid=${catalog.paid_ad_ready} organic=${catalog.organic_only} rejected=${catalog.rejected} listed=${catalog.candidates_fetched}\n`
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unknown_error";
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
