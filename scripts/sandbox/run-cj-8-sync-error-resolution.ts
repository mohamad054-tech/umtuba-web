/**
 * Bounded read-only retry of the 8 SYNC_ERROR products.
 * Prints counts and titles only — never keys or tokens.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createCjReadOnlyClient } from "../../lib/services/cj/client";
import { isCjOrderFulfillmentEnabled } from "../../lib/services/cj/fulfillmentGuard";
import { readApprovedDraftFile } from "../../lib/services/cj/launchDraftFile";
import {
  readProductionCandidateFile,
  writeProductionCandidateFile,
} from "../../lib/services/cj/productionCandidateFile";
import {
  applyResolutionToCandidateProduct,
  recoverSyncErrorProduct,
  suggestReplacementCandidates,
  SYNC_ERROR_RESOLUTION_TASK_ID,
  type ResolvedSyncItem,
} from "../../lib/services/cj/syncErrorResolution";
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
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key.startsWith("CJ_")) process.env[key] = value;
  }
}

async function main() {
  loadEnvLocalSilently();
  process.stdout.write(`FULFILLMENT_ENABLED=${isCjOrderFulfillmentEnabled()}\n`);
  if (isCjOrderFulfillmentEnabled()) {
    process.stdout.write("STATUS=FULFILLMENT_MUST_STAY_FALSE\n");
    process.exitCode = 2;
    return;
  }

  const approved = readApprovedDraftFile();
  const candidate = readProductionCandidateFile();
  if (!approved || !candidate) {
    process.stdout.write("STATUS=MISSING_CANDIDATE\n");
    process.exitCode = 2;
    return;
  }

  const errors = candidate.products.filter((row) => row.sync_status === "SYNC_ERROR");
  process.stdout.write(`SYNC_ERRORS_INPUT=${errors.length}\n`);
  const client = createCjReadOnlyClient({
    apiKey: process.env.CJ_API_KEY,
    cache: createFileTokenCache(),
  });
  const auth = await client.authenticate();
  process.stdout.write(`NEW_CJ_AUTH=${auth.ok ? "PASS" : "FAIL"}\n`);
  if (!auth.ok) {
    process.exitCode = 2;
    return;
  }

  const gapMs = Number(process.env.CJ_READ_GAP_MS);
  const wait = Number.isFinite(gapMs) && gapMs >= 250 ? gapMs : 500;
  const results: ResolvedSyncItem[] = [];

  for (const row of errors) {
    const draft = approved.products.find(
      (item) => item.identity.cj_product_id === row.identity.cj_product_id
    );
    if (!draft) continue;
    const recovered = await recoverSyncErrorProduct({
      client,
      product: draft,
      inputFlags: row.flags,
      gapMs: wait,
    });
    if (
      !recovered.resolved &&
      (recovered.failure_kind === "product_query_failure" ||
        recovered.failure_kind === "malformed_provider_data")
    ) {
      recovered.replacement_candidates = await suggestReplacementCandidates({
        client,
        product: draft,
        gapMs: wait,
      });
    }
    results.push(recovered);
    process.stdout.write(
      `ITEM=${recovered.slug} RESOLVED=${recovered.resolved} KIND=${recovered.failure_kind ?? recovered.live.sync_status} REPL=${recovered.replacement_candidates.length}\n`
    );
  }

  const byId = new Map(results.map((row) => [row.live.cj_product_id, row]));
  candidate.products = candidate.products.map((row) => {
    const recovered = byId.get(row.identity.cj_product_id);
    return recovered ? applyResolutionToCandidateProduct(row, recovered) : row;
  });

  const healthy = candidate.products.filter((row) => row.sync_status === "HEALTHY");
  const unresolved = candidate.products.filter((row) =>
    row.flags.includes("unresolved_sync_error")
  );
  candidate.summary.last_known_healthy = healthy.length;
  candidate.summary.last_known_price_review = candidate.products.filter(
    (row) => row.sync_status === "PRICE_REVIEW"
  ).length;
  candidate.summary.last_known_out_of_stock = candidate.products.filter(
    (row) => row.sync_status === "OUT_OF_STOCK"
  ).length;
  candidate.summary.last_known_provider_unavailable = candidate.products.filter(
    (row) => row.sync_status === "PROVIDER_UNAVAILABLE"
  ).length;
  candidate.summary.last_known_sync_error = candidate.products.filter(
    (row) => row.sync_status === "SYNC_ERROR"
  ).length;
  candidate.live_audit = {
    status: unresolved.length === 0 ? "LIVE_VERIFIED" : "PARTIAL",
    note: `${SYNC_ERROR_RESOLUTION_TASK_ID}: resolved ${results.filter((row) => row.resolved).length} of ${results.length} sync errors.`,
  };
  writeProductionCandidateFile(candidate);

  const reportPath = join(process.cwd(), "data/cj-8-sync-error-resolution-v1.json");
  writeFileSync(
    reportPath,
    `${JSON.stringify(
      {
        task_id: SYNC_ERROR_RESOLUTION_TASK_ID,
        generated_at: new Date().toISOString(),
        input: errors.length,
        resolved: results.filter((row) => row.resolved).length,
        unresolved: results.filter((row) => !row.resolved).length,
        items: results.map((row) => ({
          slug: row.slug,
          title: row.title,
          category: row.category,
          sku: row.sku,
          input_kind: row.input_kind,
          resolved: row.resolved,
          failure_kind: row.failure_kind,
          sync_status: row.live.sync_status,
          replacement_candidates: row.replacement_candidates,
        })),
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  const landed = healthy
    .map((row) => row.economics.landed_cost_minor)
    .filter((value): value is number => value != null);
  const margins = healthy
    .map((row) => row.economics.gross_margin)
    .filter((value): value is number => value != null);
  process.stdout.write(`RESOLVED=${results.filter((row) => row.resolved).length}\n`);
  process.stdout.write(`UNRESOLVED=${results.filter((row) => !row.resolved).length}\n`);
  process.stdout.write(`HEALTHY_TOTAL=${healthy.length}\n`);
  process.stdout.write(
    `AVG_LANDED_COST_HEALTHY=${
      landed.length
        ? Math.round(landed.reduce((sum, value) => sum + value, 0) / landed.length) / 100
        : "n/a"
    }\n`
  );
  process.stdout.write(
    `AVG_GROSS_MARGIN_HEALTHY=${
      margins.length
        ? Math.round((margins.reduce((sum, value) => sum + value, 0) / margins.length) * 1000) /
          1000
        : "n/a"
    }\n`
  );
  process.stdout.write(
    `REPLACEMENT_CANDIDATES=${results.reduce((sum, row) => sum + row.replacement_candidates.length, 0)}\n`
  );
}

void main();
