import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createCjReadOnlyClient,
  createFileTokenCache,
  readCjApiKeyFromEnv,
  readCjPilotCatalogFile,
  runCjPilotCollection,
} from "../../lib/services/cj";
import { emptyProfitGateV2File, writeProfitGateV2File } from "../../lib/services/cj/profitCatalogFile";
import {
  evaluateProfitGateRecords,
  mergeUniqueV2Products,
} from "../../lib/services/cj/profitEvaluate";
import {
  CJ_PROFIT_GATE_V2_SOURCE_EXPAND,
  CJ_PROFIT_GATE_V2_SOURCE_V1,
  MAX_UNIQUE_CANDIDATES,
  PROFIT_GATE_V2_EXPANSION_KEYWORDS,
  STRONG_PRODUCT_TARGET,
} from "../../lib/services/cj/profitGate";

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
  const v1 = readCjPilotCatalogFile();
  if (!v1 || !v1.products.length) {
    throw new Error("Missing data/cj-pilot-100.json — run the V1 importer first. V1 file was not written.");
  }

  const generatedAt = new Date().toISOString();
  let products = evaluateProfitGateRecords(v1.products, CJ_PROFIT_GATE_V2_SOURCE_V1);
  let connected = v1.cj_api_connected;
  let expansionAttempted = false;
  let expansionReason: string | null = null;
  const endpoints = [...v1.endpoints_used];

  const strong = () =>
    products.filter(
      (row) => row.classification === "PAID_AD_READY" || row.classification === "ORGANIC_ONLY"
    ).length;

  if (strong() >= STRONG_PRODUCT_TARGET) {
    expansionReason = `Existing V1 dataset already produced ${strong()} strong products; no expansion.`;
  } else {
    const apiKey = readCjApiKeyFromEnv();
    if (!apiKey) {
      expansionReason =
        "Strong products below 50 and CJ_API_KEY missing; evaluated existing dataset only. Rules were not weakened.";
    } else {
      const remaining = Math.max(0, MAX_UNIQUE_CANDIDATES - products.length);
      if (remaining === 0) {
        expansionReason =
          "Already at 300 unique candidates; rules were not weakened.";
      } else {
        expansionAttempted = true;
        const client = createCjReadOnlyClient({
          apiKey,
          cache: createFileTokenCache(),
        });
        process.stdout.write(
          `CJ_PROFIT_GATE_V2 expanding remaining=${remaining} skip=${products.length}\n`
        );
        const extra = await runCjPilotCollection({
          client,
          skipProductIds: products.map((row) => row.cj_product_id),
          keywordsByCategory: PROFIT_GATE_V2_EXPANSION_KEYWORDS,
          categoryQuota: 80,
          maxUniqueRecords: remaining,
          maxDetailFetches: 200,
          maxFreightFetches: 200,
          maxFreightPerCategory: 40,
          maxListPages: 3,
        });
        connected = connected || extra.cj_api_connected;
        endpoints.push(...extra.endpoints_used);
        const extraRows = evaluateProfitGateRecords(
          extra.products,
          CJ_PROFIT_GATE_V2_SOURCE_EXPAND
        );
        products = mergeUniqueV2Products(products, extraRows);
        expansionReason = extra.cj_api_connected
          ? `Expanded with ${extraRows.length} new unique CJ candidates (read-only catalog/logistics).`
          : "Expansion auth failed; evaluated existing dataset only.";
      }
    }
  }

  const catalog = emptyProfitGateV2File({
    generatedAt,
    connected,
    expansionAttempted,
    expansionReason,
    endpoints,
    products,
  });
  writeProfitGateV2File(catalog);

  const s = catalog.summary;
  process.stdout.write(`CANDIDATES_EVALUATED=${s.candidates_evaluated}\n`);
  process.stdout.write(`PAID_AD_READY=${s.paid_ad_ready}\n`);
  process.stdout.write(`ORGANIC_ONLY=${s.organic_only}\n`);
  process.stdout.write(`REJECTED_V2=${s.rejected_v2}\n`);
  process.stdout.write(`STRONG=${s.strong_count}\n`);
  process.stdout.write(`EXPANSION_ATTEMPTED=${expansionAttempted}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unknown_error";
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
