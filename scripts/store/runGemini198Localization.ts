import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  localizationCatalogPath,
  localizationFinalCatalogPath,
  readLocalizationCatalogFile,
  refreshCatalogMetrics,
} from "../../lib/store/productLocalization/catalogFile";
import {
  GEMINI_LOCALIZATION_COST_CAP_USD,
  PRODUCT_LOCALIZATION_GEMINI_RETRY_V2_TASK_ID,
} from "../../lib/store/productLocalization/constants";
import { runGeminiReviewQueue } from "../../lib/store/productLocalization/geminiBatch";
import { geminiFlashModel, selectWorkingFlashGenerate } from "../../lib/store/productLocalization/geminiLocalizationClient";
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

function writeCheckpoint(catalog: LocalizationCatalogFile, products: LocalizedCatalogProduct[]): LocalizationCatalogFile {
  const metrics = refreshCatalogMetrics(products);
  const snapshot: LocalizationCatalogFile = {
    ...catalog,
    task_id: PRODUCT_LOCALIZATION_GEMINI_RETRY_V2_TASK_ID,
    provider: "gemini",
    paid_ai_used: true,
    products,
    metrics,
    paid_ai_required: metrics.manual_review_required > 0,
  };
  const finalPath = localizationFinalCatalogPath();
  mkdirSync(dirname(finalPath), { recursive: true });
  writeFileSync(finalPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  writeFileSync(localizationCatalogPath(), `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  return snapshot;
}

async function main(): Promise<void> {
  const apiKey = readGeminiKey();
  if (!apiKey) {
    process.stdout.write("WAITING_OWNER_PASTE keyLengthGt0=false\n");
    process.exit(2);
  }
  process.stdout.write("keyLengthGt0=true\n");
  const selected = await selectWorkingFlashGenerate(apiKey, [geminiFlashModel()]);
  if (selected.status === 429 || selected.quotaExhausted) {
    process.stdout.write(
      `${JSON.stringify({
        completed: 0,
        failed: 0,
        remaining: 198,
        actual_cost_usd: 0,
        last_error: "gemini_http_429",
        http_429_count: 1,
        quota_exhausted: true,
      })}\n`
    );
    process.exit(0);
  }
  if (!selected.model) {
    process.stdout.write(
      `${JSON.stringify({
        completed: 0,
        failed: 0,
        remaining: 198,
        actual_cost_usd: 0,
        last_error: `gemini_flash_${selected.status}`,
        http_429_count: 0,
        quota_exhausted: false,
      })}\n`
    );
    process.exit(1);
  }
  const catalog = readLocalizationCatalogFile();
  if (!catalog || catalog.products.length !== 532) {
    process.stdout.write("catalog_missing_or_not_532\n");
    process.exit(1);
  }
  const result = await runGeminiReviewQueue({
    catalog,
    apiKey,
    model: selected.model,
    apiVersion: selected.apiVersion,
    costCapUsd: GEMINI_LOCALIZATION_COST_CAP_USD,
    persist: (products) => {
      const snapshot = writeCheckpoint(catalog, products);
      process.stdout.write(
        `checkpoint remaining=${snapshot.metrics.manual_review_required} titles=${snapshot.metrics.titles_complete}\n`
      );
    },
  });
  const next = writeCheckpoint(result.catalog, result.catalog.products);
  const finalFile: LocalizationCatalogFile = {
    ...next,
    generated_at: new Date().toISOString(),
    paid_ai_estimate: {
      products: result.completed + result.failed,
      estimated_input_tokens: result.inputTokens,
      estimated_output_tokens: result.outputTokens,
      gemini_flash_usd: result.actualCostUsd,
      gemini_pro_usd: 0,
      note: `Actual Gemini spend $${result.actualCostUsd.toFixed(4)}. Model ${result.modelUsed}. Cap $${GEMINI_LOCALIZATION_COST_CAP_USD}.`,
    },
    next_action: result.quotaExhausted
      ? "Retry Gemini after quota resets, then resolve remaining product/IP/price review gates before production GO"
      : "resolve remaining product/IP/price review gates before production GO",
  };
  writeFileSync(localizationFinalCatalogPath(), `${JSON.stringify(finalFile, null, 2)}\n`, "utf8");
  writeFileSync(localizationCatalogPath(), `${JSON.stringify(finalFile, null, 2)}\n`, "utf8");
  process.stdout.write(
    `${JSON.stringify({
      completed: result.completed,
      failed: result.failed,
      remaining: result.remaining,
      actual_cost_usd: result.actualCostUsd,
      model: result.modelUsed,
      last_error: result.lastError,
      http_429_count: result.http429Count,
      quota_exhausted: result.quotaExhausted,
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
      titles_complete: finalFile.metrics.titles_complete,
      descriptions_complete: finalFile.metrics.descriptions_complete,
      manual_review_required: finalFile.metrics.manual_review_required,
      ip_review: finalFile.metrics.ip_review,
      price_review: finalFile.metrics.price_review,
      product_data_review: finalFile.metrics.product_data_review,
      duplicates_flagged: finalFile.metrics.duplicates_flagged,
    })}\n`
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "unknown_error";
  process.stderr.write(`${message.replace(/key=[^&\s]+/gi, "key=redacted")}\n`);
  process.exit(1);
});
