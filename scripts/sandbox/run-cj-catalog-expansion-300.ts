/**
 * Live READ-ONLY CJ catalog expansion toward ~300 additional products.
 * Never prints CJ_API_KEY / tokens / .env. Fail-closed if the key is missing.
 * Does not overwrite data/cj-store-launch-approved-59.json.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createCjReadOnlyClient, hasCjApiKey, readCjApiKeyFromEnv } from "../../lib/services/cj/client";
import {
  emptyExpansionCatalog,
  finalizeAcceptedProducts,
  runCatalogExpansion,
} from "../../lib/services/cj/expansionPipeline";
import { STORE_DEPARTMENTS, type StoreDepartment } from "../../lib/services/cj/expansionTaxonomy";
import {
  readExpansionCatalogFile,
  readReservedApprovedCjProductIds,
  writeExpansionCatalogFile,
} from "../../lib/services/cj/expansionFile";
import { createFileTokenCache } from "../../lib/services/cj/tokenCache";

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

function printCounts(label: string, catalog: ReturnType<typeof emptyExpansionCatalog>): void {
  process.stdout.write(
    `${label} accepted=${catalog.additional_products_accepted} paid=${catalog.paid_ad_ready} organic=${catalog.organic_only} rejected=${catalog.rejected} listed=${catalog.candidates_fetched}\n`
  );
}

async function main() {
  loadEnvLocalSilently();
  const skip = readReservedApprovedCjProductIds();
  const apiKey = readCjApiKeyFromEnv();
  if (!hasCjApiKey(apiKey)) {
    const empty = emptyExpansionCatalog({ skipProductIds: skip.size, connected: false });
    writeExpansionCatalogFile(empty);
    process.stdout.write("CJ_API_KEY_PRESENT=false\n");
    process.stdout.write("ADDITIONAL_PRODUCTS_ACCEPTED=0\n");
    process.stdout.write("FAIL_CLOSED=missing_key\n");
    process.exit(2);
  }

  const existing = readExpansionCatalogFile();
  const fillEmpty = process.argv.includes("--fill-empty");
  const seed = fillEmpty
    ? finalizeAcceptedProducts(existing?.products ?? [])
    : (existing?.products ?? []);
  const present = new Set(seed.map((row) => row.department));
  const emptyDepartments = STORE_DEPARTMENTS.filter((dept) => !present.has(dept));
  const departments: StoreDepartment[] | undefined = fillEmpty ? emptyDepartments : undefined;
  const target = fillEmpty
    ? seed.length + Math.max(20, emptyDepartments.length * 16)
    : 300;
  process.stdout.write(
    `CJ_API_KEY_PRESENT=true\nSKIP_APPROVED_IDS=${skip.size}\nSEED_ACCEPTED=${seed.length}\nFILL_EMPTY=${fillEmpty}\nTARGET=${target}\n`
  );
  const client = createCjReadOnlyClient({
    apiKey,
    cache: createFileTokenCache(),
  });
  const catalog = await runCatalogExpansion({
    client,
    skipProductIds: skip,
    seedProducts: seed,
    departments,
    target,
    gapMs: 450,
    onProgress: (snapshot) => {
      writeExpansionCatalogFile(snapshot);
      printCounts("PROGRESS", snapshot);
    },
  });
  writeExpansionCatalogFile(catalog);
  printCounts("FINAL", catalog);
  process.stdout.write(`CANDIDATES_FETCHED=${catalog.candidates_fetched}\n`);
  process.stdout.write(`ADDITIONAL_PRODUCTS_ACCEPTED=${catalog.additional_products_accepted}\n`);
  process.stdout.write(`PAID_AD_READY=${catalog.paid_ad_ready}\n`);
  process.stdout.write(`ORGANIC_ONLY=${catalog.organic_only}\n`);
  process.stdout.write(`REJECTED=${catalog.rejected}\n`);
  process.stdout.write(`AVG_LANDED_COST=${catalog.avg_landed_cost_major ?? "n/a"}\n`);
  process.stdout.write(`AVG_RETAIL=${catalog.avg_retail_major ?? "n/a"}\n`);
  process.stdout.write(`AVG_GROSS_MARGIN=${catalog.avg_gross_margin ?? "n/a"}\n`);
  process.stdout.write(`AVG_DELIVERY_DAYS=${catalog.avg_delivery_days ?? "n/a"}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unknown_error";
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
