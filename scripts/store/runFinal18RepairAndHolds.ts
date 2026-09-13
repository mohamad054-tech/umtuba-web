import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { loadStoreBrowseCatalog } from "../../lib/services/cj/expansionBrowse";
import {
  localizationCatalogPath,
  localizationFinalCatalogPath,
  readLocalizationCatalogFile,
  refreshCatalogMetrics,
} from "../../lib/store/productLocalization/catalogFile";
import { auditCommercialHolds } from "../../lib/store/productLocalization/commercialHoldAudit";
import {
  GEMINI_FINAL_18_REPAIR_COST_CAP_USD,
  PRIOR_GEMINI_LOCALIZATION_COST_USD,
  PRODUCT_LOCALIZATION_FINAL_18_TASK_ID,
} from "../../lib/store/productLocalization/constants";
import { repairFinal18Localization } from "../../lib/store/productLocalization/geminiFinal18Repair";
import { publishableStats } from "../../lib/store/productLocalization/publishable";
import type { LocalizationCatalogFile, LocalizedCatalogProduct } from "../../lib/store/productLocalization/types";

function readGeminiKey(): string | null {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return null;
  const buf = readFileSync(envPath);
  const text =
    buf[0] === 0xff && buf[1] === 0xfe
      ? buf.toString("utf16le").replace(/^\uFEFF/, "")
      : buf.toString("utf8").replace(/^\uFEFF/, "");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^(?:export\s+)?GEMINI_API_KEY\s*=\s*(.*)$/i);
    if (!match) continue;
    const raw = (match[1] ?? "").replace(/^['"`“”‘’]|['"`“”‘’]$/g, "").trim();
    if (raw.length > 0) return raw;
  }
  return null;
}

function writeCatalog(catalog: LocalizationCatalogFile, products: LocalizedCatalogProduct[]): LocalizationCatalogFile {
  const metrics = refreshCatalogMetrics(products);
  const next: LocalizationCatalogFile = {
    ...catalog,
    task_id: PRODUCT_LOCALIZATION_FINAL_18_TASK_ID,
    provider: catalog.provider,
    paid_ai_used: catalog.paid_ai_used,
    products,
    metrics,
    paid_ai_required: metrics.manual_review_required > 0,
  };
  const finalPath = localizationFinalCatalogPath();
  mkdirSync(dirname(finalPath), { recursive: true });
  writeFileSync(finalPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  writeFileSync(localizationCatalogPath(), `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

async function main(): Promise<void> {
  const catalog = readLocalizationCatalogFile();
  if (!catalog || catalog.products.length !== 532) {
    process.stdout.write("catalog_missing_or_not_532\n");
    process.exit(1);
  }
  const apiKey = readGeminiKey();
  process.stdout.write(`hasKey=${Boolean(apiKey)} keyLengthGt0=${Boolean(apiKey)}\n`);

  let products = catalog.products;
  let additionalCost = 0;
  let repaired = 0;
  let quotaExhausted = false;
  let http429Count = 0;
  let lastError: string | null = null;
  let modelUsed = "none";

  if (!apiKey) {
    process.stdout.write("WAITING_OWNER_PASTE skipping_part_a\n");
  } else {
    const result = await repairFinal18Localization({
      products,
      apiKey,
      costCapUsd: GEMINI_FINAL_18_REPAIR_COST_CAP_USD,
      persist: (next) => {
        writeCatalog({ ...catalog, paid_ai_used: true, provider: "gemini" }, next);
        process.stdout.write(
          `checkpoint remaining=${next.filter((row) => row.status === "manual_review_required").length}\n`
        );
      },
    });
    products = result.products;
    additionalCost = result.actualCostUsd;
    repaired = result.repaired;
    quotaExhausted = result.quotaExhausted;
    http429Count = result.http429Count;
    lastError = result.lastError;
    modelUsed = result.modelUsed;
  }

  const browse = loadStoreBrowseCatalog();
  const browseById = new Map(browse.items.map((row) => [row.identity.cj_product_id, row]));
  products = auditCommercialHolds(products, browseById);
  const metrics = refreshCatalogMetrics(products);
  const stats = publishableStats(products, browseById);
  const syncErrors = browse.items.filter((row) => row.sync_status === "SYNC_ERROR").length;
  const snapshot: LocalizationCatalogFile = {
    ...catalog,
    task_id: PRODUCT_LOCALIZATION_FINAL_18_TASK_ID,
    generated_at: new Date().toISOString(),
    provider: apiKey ? "gemini" : catalog.provider,
    paid_ai_used: Boolean(apiKey) || catalog.paid_ai_used,
    products,
    metrics,
    paid_ai_required: metrics.manual_review_required > 0,
    paid_ai_estimate: {
      products: repaired,
      estimated_input_tokens: 0,
      estimated_output_tokens: 0,
      gemini_flash_usd: additionalCost,
      gemini_pro_usd: 0,
      note: `Additional Gemini spend $${additionalCost.toFixed(4)}. Prior $${PRIOR_GEMINI_LOCALIZATION_COST_USD}. Total $${(PRIOR_GEMINI_LOCALIZATION_COST_USD + additionalCost).toFixed(4)}. Cap $1 additional. Cap $5.`,
    },
    next_action: "owner final Store review before explicit production GO",
  };
  writeCatalog(snapshot, products);
  process.stdout.write(
    `${JSON.stringify({
      repaired,
      remaining: metrics.manual_review_required,
      titles: metrics.titles_complete,
      descriptions: metrics.descriptions_complete,
      additional_cost: additionalCost,
      total_cost: Number((PRIOR_GEMINI_LOCALIZATION_COST_USD + additionalCost).toFixed(4)),
      http_429_count: http429Count,
      quota_exhausted: quotaExhausted,
      last_error: lastError,
      publishable: stats.publishable,
      held: stats.held,
      avg_margin: stats.avgMargin,
      avg_delivery_days: stats.avgDeliveryDays,
      ip_review: metrics.ip_review,
      price_review: metrics.price_review,
      product_data_review: metrics.product_data_review,
      duplicates_flagged: metrics.duplicates_flagged,
      sync_errors: syncErrors,
      unsupported_claims: metrics.unsupported_claims,
    })}\n`
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "unknown_error";
  process.stderr.write(`${message.replace(/key=[^&\s]+/gi, "key=redacted")}\n`);
  process.exit(1);
});
