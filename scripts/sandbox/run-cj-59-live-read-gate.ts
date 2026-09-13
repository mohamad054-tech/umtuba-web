/**
 * Live READ-ONLY 59-product gate. Loads .env.local silently.
 * Prints counts only — never prints CJ_API_KEY, accessToken, or refreshToken.
 *
 *   npx tsx scripts/sandbox/run-cj-59-live-read-gate.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createCjReadOnlyClient } from "../../lib/services/cj/client";
import { isCjOrderFulfillmentEnabled } from "../../lib/services/cj/fulfillmentGuard";
import { canUseLiveCjReadSync, liveCjReadSyncBlockReason } from "../../lib/services/cj/keyRotation";
import { readApprovedDraftFile } from "../../lib/services/cj/launchDraftFile";
import {
  mergeLiveReadIntoCandidate,
  runApproved59LiveRead,
  summarizeLiveEconomics,
} from "../../lib/services/cj/liveReadGate";
import { writeProductionCandidateFile } from "../../lib/services/cj/productionCandidateFile";
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
    if (key.startsWith("CJ_")) {
      process.env[key] = value;
      continue;
    }
    if (process.env[key] === undefined || process.env[key] === "") {
      process.env[key] = value;
    }
  }
}

async function main() {
  loadEnvLocalSilently();
  const blocked = liveCjReadSyncBlockReason();
  const fulfillment = isCjOrderFulfillmentEnabled();
  process.stdout.write(`ROTATED_ACK=${canUseLiveCjReadSync()}\n`);
  process.stdout.write(`FULFILLMENT_ENABLED=${fulfillment}\n`);
  if (blocked) {
    process.stdout.write(`NEW_CJ_AUTH=FAIL\n`);
    process.stdout.write(`STATUS=${blocked}\n`);
    process.exitCode = 2;
    return;
  }
  if (fulfillment) {
    process.stdout.write("NEW_CJ_AUTH=FAIL\n");
    process.stdout.write("STATUS=FULFILLMENT_MUST_STAY_FALSE\n");
    process.exitCode = 2;
    return;
  }

  const approved = readApprovedDraftFile();
  if (!approved) {
    process.stdout.write("NEW_CJ_AUTH=FAIL\n");
    process.stdout.write("STATUS=MISSING_APPROVED_59\n");
    process.exitCode = 2;
    return;
  }

  const client = createCjReadOnlyClient({
    apiKey: process.env.CJ_API_KEY,
    cache: createFileTokenCache(),
  });
  const auth = await client.authenticate();
  if (!auth.ok) {
    const raw = auth.message || "unknown";
    const lower = raw.toLowerCase();
    let kind = raw.startsWith("CJ ") ? "client_other" : "vendor_other";
    if (raw.startsWith("CJ request timed out") || lower.includes("timeout")) kind = "timeout";
    else if (raw.startsWith("CJ_API_KEY is missing") || lower.includes("missing")) kind = "missing_key";
    else if (raw.startsWith("CJ request failed")) kind = "request_failed";
    else if (raw.startsWith("CJ response missing")) kind = "missing_data";
    else if (
      lower.includes("invalid") ||
      lower.includes("unauthorized") ||
      lower.includes("forbidden") ||
      lower.includes("api key")
    ) {
      kind = "rejected_key";
    }
    process.stdout.write("NEW_CJ_AUTH=FAIL\n");
    process.stdout.write(`AUTH_FAIL_KIND=${kind}\n`);
    process.stdout.write(`AUTH_MESSAGE_LEN=${raw.length}\n`);
    const live = await runApproved59LiveRead({
      client: {
        ...client,
        authenticate: async () => auth,
      },
      approved,
      sleep: async () => undefined,
    });
    const catalog = mergeLiveReadIntoCandidate(approved, live);
    writeProductionCandidateFile(catalog);
    process.stdout.write(`LIVE_AUDIT=${catalog.live_audit.status}\n`);
    process.exitCode = 2;
    return;
  }
  process.stdout.write("NEW_CJ_AUTH=PASS\n");

  const gapMs = Number(process.env.CJ_READ_GAP_MS);
  const sleep =
    Number.isFinite(gapMs) && gapMs >= 250
      ? (_ms: number) => new Promise<void>((resolve) => setTimeout(resolve, gapMs))
      : undefined;
  const live = await runApproved59LiveRead({ client, approved, sleep });
  process.stdout.write(`NEW_CJ_AUTH_CONFIRM=${live.auth_ok ? "PASS" : "FAIL"}\n`);
  process.stdout.write(`WRITE_CALLS=${live.write_calls}\n`);
  process.stdout.write(`LIVE_PRODUCT_READS=${live.live_product_reads}\n`);
  process.stdout.write(`LIVE_FREIGHT_READS=${live.live_freight_reads}\n`);

  const catalog = mergeLiveReadIntoCandidate(approved, live);
  writeProductionCandidateFile(catalog);
  const s = catalog.summary;
  const econ = summarizeLiveEconomics(live.products);
  process.stdout.write(`APPROVED_PRODUCTS=${s.approved_products}\n`);
  process.stdout.write(`PRODUCTS_HEALTHY=${s.last_known_healthy}\n`);
  process.stdout.write(`PRODUCTS_PRICE_REVIEW=${s.last_known_price_review}\n`);
  process.stdout.write(`PRODUCTS_OUT_OF_STOCK=${s.last_known_out_of_stock}\n`);
  process.stdout.write(`PRODUCTS_PROVIDER_UNAVAILABLE=${s.last_known_provider_unavailable}\n`);
  process.stdout.write(`PRODUCTS_SYNC_ERROR=${s.last_known_sync_error}\n`);
  process.stdout.write(`HERO_PRODUCTS=${s.hero_products}\n`);
  process.stdout.write(`STANDARD_PRODUCTS=${s.standard_products}\n`);
  process.stdout.write(`AVG_CURRENT_LANDED_COST=${econ.avg_landed_major ?? "n/a"}\n`);
  process.stdout.write(`AVG_CURRENT_GROSS_MARGIN=${econ.avg_gross_margin ?? "n/a"}\n`);
  process.stdout.write(`LIVE_AUDIT=${catalog.live_audit.status}\n`);
  process.stdout.write(`SUBSTITUTED=${s.substituted}\n`);
  if (!live.auth_ok) process.exitCode = 2;
}

void main();
