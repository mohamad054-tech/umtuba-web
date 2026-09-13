import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createCjReadOnlyClient,
  createFileTokenCache,
  emptyCatalogFile,
  emptyDryRunCatalog,
  PILOT_CATEGORIES,
  readCjApiKeyFromEnv,
  readCjPilotCatalogFile,
  runCjPilotCollection,
  writeCjPilotCatalogFile,
} from "../../lib/services/cj";

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

async function main() {
  loadEnvLocalSilently();
  const apiKey = readCjApiKeyFromEnv();
  if (!apiKey) {
    const catalog = emptyDryRunCatalog();
    writeCjPilotCatalogFile(catalog);
    console.log("CJ_API_CONNECTED=NO");
    console.log("Wrote dry-run catalog to data/cj-pilot-100.json");
    console.log("Place the owner key in .env.local as CJ_API_KEY= and re-run this script.");
    return;
  }

  const client = createCjReadOnlyClient({
    apiKey,
    cache: createFileTokenCache(),
  });
  const onlyArg = process.argv.find((arg) => arg.startsWith("--only="));
  const onlyRaw = onlyArg?.slice("--only=".length);
  const onlyCategories = onlyRaw
    ? onlyRaw
        .split(",")
        .map((value) => value.trim())
        .filter((value): value is (typeof PILOT_CATEGORIES)[number] =>
          (PILOT_CATEGORIES as readonly string[]).includes(value)
        )
    : undefined;

  const fresh = await runCjPilotCollection({
    client,
    categories: onlyCategories,
  });
  const previous = onlyCategories?.length ? readCjPilotCatalogFile() : null;
  const catalog =
    previous && onlyCategories?.length
      ? emptyCatalogFile({
          generatedAt: fresh.generated_at,
          connected: fresh.cj_api_connected || previous.cj_api_connected,
          dryRun: false,
          endpoints: [...previous.endpoints_used, ...fresh.endpoints_used],
          records: [
            ...previous.products.filter(
              (row) => !onlyCategories.includes(row.category)
            ),
            ...fresh.products,
          ],
        })
      : fresh;
  writeCjPilotCatalogFile(catalog);
  console.log(`CJ_API_CONNECTED=${catalog.cj_api_connected ? "YES" : "NO"}`);
  console.log(`CANDIDATES_FETCHED=${catalog.summary.candidates_fetched}`);
  console.log(`PRODUCTS_ACCEPTED=${catalog.summary.products_accepted}`);
  console.log(`PRODUCTS_REJECTED=${catalog.summary.products_rejected}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unknown error";
  console.error(message);
  process.exitCode = 1;
});
