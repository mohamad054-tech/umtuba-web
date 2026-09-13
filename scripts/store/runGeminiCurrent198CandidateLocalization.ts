import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { loadStoreBrowseCatalog } from "../../lib/services/cj/expansionBrowse";
import {
  localizationCatalogPath,
  localizationFinalCatalogPath,
  readLocalizationCatalogFileFromPath,
  refreshCatalogMetrics,
} from "../../lib/store/productLocalization/catalogFile";
import {
  GEMINI_LOCALIZATION_COST_CAP_USD,
  PRODUCT_LOCALIZATION_GEMINI_CURRENT_198_TASK_ID,
} from "../../lib/store/productLocalization/constants";
import {
  runGeminiReviewQueue,
  type GeminiArchiveBatch,
} from "../../lib/store/productLocalization/geminiBatch";
import { geminiFlashModel, selectWorkingFlashGenerate } from "../../lib/store/productLocalization/geminiLocalizationClient";
import { publishableStats } from "../../lib/store/productLocalization/publishable";
import type { LocalizationCatalogFile, LocalizedCatalogProduct } from "../../lib/store/productLocalization/types";

const TASK_ID = PRODUCT_LOCALIZATION_GEMINI_CURRENT_198_TASK_ID;
const EXPECTED_CANONICAL_SHA256 = "0c554bd3bc43c152fc4188e7439fd73046e44622d0a92483aeac6859e26bb9eb";
const EXPECTED_TOTAL = 532;
const EXPECTED_REVIEW = 198;
const DEFAULT_CANDIDATE_RELATIVE = "data/cj-catalog-532-localized-final-v1.GEMINI_198_CANDIDATE.json";
const DEFAULT_BACKUP_RELATIVE = "data/cj-catalog-532-localized-final-v1.RETRY_V2-2026-09-09-1759.backup.json";
const DEFAULT_PAIRED_BACKUP_RELATIVE = "data/cj-localization-catalog-v1.RETRY_V2-2026-09-09-1759.backup.json";
const RECOVERY_RELATIVE = "docs/ai/recovery/UMTUBA_STORE_GEMINI_CURRENT_198_NEW_LOCALIZATION_V1";

type InputManifestRow = {
  id: string;
  cj_product_id: string;
  sku: string | null;
  review_reason: string | null;
};

type IntegrityCounts = {
  product_ids_changed: number;
  prices_changed: number;
  costs_changed: number;
  margins_changed: number;
  commercial_flags_changed: number;
  ip_flags_changed: number;
};

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

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

function localizationReviewRows(products: LocalizedCatalogProduct[]): LocalizedCatalogProduct[] {
  return products.filter((row) => (row.catalog_qa ?? []).some((item) => item.flag === "LOCALIZATION_REVIEW"));
}

function assertSafeOutputPath(outputPath: string, extraForbidden: string[] = []): void {
  const resolved = resolve(outputPath);
  const forbidden = [
    resolve(localizationFinalCatalogPath()),
    resolve(localizationCatalogPath()),
    ...extraForbidden.map((path) => resolve(path)),
  ];
  if (forbidden.includes(resolved)) {
    throw new Error("refusing_to_write_canonical_live_or_backup_path");
  }
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function copyImmutable(src: string, dest: string, expectedHash: string): string {
  if (existsSync(dest)) {
    const existing = sha256File(dest);
    if (existing !== expectedHash) {
      throw new Error(`backup_exists_with_unexpected_hash dest=${dest}`);
    }
    return existing;
  }
  copyFileSync(src, dest);
  const hash = sha256File(dest);
  if (hash !== expectedHash) {
    throw new Error(`backup_hash_mismatch dest=${dest}`);
  }
  return hash;
}

function commercialFlagKey(row: LocalizedCatalogProduct): string {
  return (row.catalog_qa ?? [])
    .filter((item) => item.flag !== "LOCALIZATION_REVIEW")
    .map((item) => `${item.flag}:${item.reason}`)
    .sort()
    .join("|");
}

function ipFlagKey(row: LocalizedCatalogProduct): string {
  return (row.catalog_qa ?? [])
    .filter((item) => item.flag === "IP_REVIEW")
    .map((item) => item.reason)
    .sort()
    .join("|");
}

function compareIntegrity(
  before: LocalizedCatalogProduct[],
  after: LocalizedCatalogProduct[]
): IntegrityCounts {
  const beforeById = new Map(before.map((row) => [row.cj_product_id, row]));
  const afterIds = new Set(after.map((row) => row.cj_product_id));
  let product_ids_changed = 0;
  if (before.length !== after.length) product_ids_changed += Math.abs(before.length - after.length);
  for (const row of before) {
    if (!afterIds.has(row.cj_product_id)) product_ids_changed += 1;
  }
  for (const row of after) {
    if (!beforeById.has(row.cj_product_id)) product_ids_changed += 1;
  }
  let prices_changed = 0;
  let costs_changed = 0;
  let margins_changed = 0;
  let commercial_flags_changed = 0;
  let ip_flags_changed = 0;
  for (const next of after) {
    const prev = beforeById.get(next.cj_product_id);
    if (!prev) continue;
    if (prev.retail_price_minor !== next.retail_price_minor || prev.currency !== next.currency) {
      prices_changed += 1;
    }
    const prevRecord = prev as unknown as Record<string, unknown>;
    const nextRecord = next as unknown as Record<string, unknown>;
    for (const key of ["landed_cost_minor", "supplier_cost_minor", "cost_minor"]) {
      if (prevRecord[key] !== nextRecord[key] && (key in prevRecord || key in nextRecord)) {
        costs_changed += 1;
        break;
      }
    }
    for (const key of ["gross_margin", "margin"]) {
      if (prevRecord[key] !== nextRecord[key] && (key in prevRecord || key in nextRecord)) {
        margins_changed += 1;
        break;
      }
    }
    if (commercialFlagKey(prev) !== commercialFlagKey(next)) commercial_flags_changed += 1;
    if (ipFlagKey(prev) !== ipFlagKey(next)) ip_flags_changed += 1;
  }
  return {
    product_ids_changed,
    prices_changed,
    costs_changed,
    margins_changed,
    commercial_flags_changed,
    ip_flags_changed,
  };
}

function writeCandidateFile(catalog: LocalizationCatalogFile, products: LocalizedCatalogProduct[], outputPath: string): LocalizationCatalogFile {
  assertSafeOutputPath(outputPath);
  const metrics = refreshCatalogMetrics(products);
  const snapshot: LocalizationCatalogFile = {
    ...catalog,
    task_id: TASK_ID,
    provider: "gemini",
    paid_ai_used: true,
    products,
    metrics,
    paid_ai_required: metrics.manual_review_required > 0,
  };
  writeJson(outputPath, snapshot);
  return snapshot;
}

function mainArgs(): { outputPath: string; idsPath: string } {
  const args = process.argv.slice(2);
  let outputPath = join(process.cwd(), DEFAULT_CANDIDATE_RELATIVE);
  let idsPath = join(process.cwd(), RECOVERY_RELATIVE, "input-198-ids.json");
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const next = args[i + 1];
    if (arg === "--output" && next) {
      outputPath = resolve(next);
      i += 1;
    } else if (arg === "--ids" && next) {
      idsPath = resolve(next);
      i += 1;
    }
  }
  return { outputPath, idsPath };
}

async function main(): Promise<void> {
  const { outputPath, idsPath } = mainArgs();
  const canonicalPath = localizationFinalCatalogPath();
  const pairedPath = localizationCatalogPath();
  const backupPath = join(process.cwd(), DEFAULT_BACKUP_RELATIVE);
  const pairedBackupPath = join(process.cwd(), DEFAULT_PAIRED_BACKUP_RELATIVE);
  const recoveryDir = join(process.cwd(), RECOVERY_RELATIVE);
  const successPath = join(recoveryDir, "success-ids.json");
  const failurePath = join(recoveryDir, "failure-ids.json");
  const archivePath = join(recoveryDir, "gemini-archive.json");
  const auditPath = join(recoveryDir, "candidate-audit.json");

  assertSafeOutputPath(outputPath, [backupPath, pairedBackupPath, idsPath, successPath, failurePath, archivePath]);

  const canonicalHash = sha256File(canonicalPath);
  if (canonicalHash !== EXPECTED_CANONICAL_SHA256) {
    process.stdout.write(
      `${JSON.stringify({
        status: "BLOCKED_PREFLIGHT",
        reason: "canonical_sha256_mismatch",
        canonical_sha256: canonicalHash,
        expected: EXPECTED_CANONICAL_SHA256,
        gemini_input_products: 0,
      })}\n`
    );
    process.exit(2);
  }

  const catalog = readLocalizationCatalogFileFromPath(canonicalPath);
  if (!catalog || catalog.products.length !== EXPECTED_TOTAL) {
    process.stdout.write(
      `${JSON.stringify({
        status: "BLOCKED_PREFLIGHT",
        reason: "catalog_missing_or_not_532",
        gemini_input_products: 0,
      })}\n`
    );
    process.exit(2);
  }

  const reviewRows = localizationReviewRows(catalog.products);
  const manualRows = catalog.products.filter((row) => row.status === "manual_review_required");
  if (reviewRows.length !== EXPECTED_REVIEW || catalog.metrics.localization_review !== EXPECTED_REVIEW) {
    process.stdout.write(
      `${JSON.stringify({
        status: "BLOCKED_PREFLIGHT",
        reason: "localization_review_not_198",
        localization_review: reviewRows.length,
        metrics_localization_review: catalog.metrics.localization_review,
        gemini_input_products: 0,
      })}\n`
    );
    process.exit(2);
  }
  if (manualRows.length !== EXPECTED_REVIEW) {
    process.stdout.write(
      `${JSON.stringify({
        status: "BLOCKED_PREFLIGHT",
        reason: "manual_review_not_198",
        manual_review_required: manualRows.length,
        gemini_input_products: 0,
      })}\n`
    );
    process.exit(2);
  }

  const backupHash = copyImmutable(canonicalPath, backupPath, EXPECTED_CANONICAL_SHA256);
  const pairedHash = sha256File(pairedPath);
  if (pairedHash === EXPECTED_CANONICAL_SHA256) {
    copyImmutable(pairedPath, pairedBackupPath, EXPECTED_CANONICAL_SHA256);
  }

  const inputRows: InputManifestRow[] = reviewRows
    .map((row) => ({
      id: row.cj_product_id,
      cj_product_id: row.cj_product_id,
      sku: row.sku,
      review_reason: row.review_reason,
    }))
    .sort((a, b) => a.cj_product_id.localeCompare(b.cj_product_id));
  writeJson(idsPath, {
    task_id: TASK_ID,
    generated_at: new Date().toISOString(),
    canonical_sha256: canonicalHash,
    definition: "catalog_qa.flag === LOCALIZATION_REVIEW (same as metrics.localization_review)",
    count: inputRows.length,
    products: inputRows,
  });

  const inputIds = inputRows.map((row) => row.cj_product_id);
  const localizedIds = new Set(
    catalog.products.filter((row) => row.status !== "manual_review_required").map((row) => row.cj_product_id)
  );
  if (inputIds.some((id) => localizedIds.has(id))) {
    process.stdout.write(
      `${JSON.stringify({
        status: "BLOCKED_PREFLIGHT",
        reason: "input_includes_already_localized",
        gemini_input_products: 0,
      })}\n`
    );
    process.exit(2);
  }

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
        status: "GEMINI_RATE_LIMITED",
        completed: 0,
        failed: 0,
        remaining: EXPECTED_REVIEW,
        actual_cost_usd: 0,
        last_error: "gemini_http_429",
        http_429_count: 1,
        quota_exhausted: true,
        canonical_sha256: sha256File(canonicalPath),
      })}\n`
    );
    process.exit(0);
  }
  if (!selected.model) {
    process.stdout.write(
      `${JSON.stringify({
        status: "GEMINI_MODEL_UNAVAILABLE",
        completed: 0,
        failed: 0,
        remaining: EXPECTED_REVIEW,
        actual_cost_usd: 0,
        last_error: `gemini_flash_${selected.status}`,
        canonical_sha256: sha256File(canonicalPath),
      })}\n`
    );
    process.exit(1);
  }

  const archive: GeminiArchiveBatch[] = [];
  const result = await runGeminiReviewQueue({
    catalog,
    apiKey,
    model: selected.model,
    apiVersion: selected.apiVersion,
    costCapUsd: GEMINI_LOCALIZATION_COST_CAP_USD,
    productIds: inputIds,
    persist: (products) => {
      writeCandidateFile(catalog, products, outputPath);
      const success = products.filter(
        (row) => inputIds.includes(row.cj_product_id) && row.status === "local_pass"
      );
      const failed = products.filter(
        (row) => inputIds.includes(row.cj_product_id) && row.status === "manual_review_required"
      );
      writeJson(successPath, {
        task_id: TASK_ID,
        count: success.length,
        products: success
          .map((row) => ({
            id: row.cj_product_id,
            cj_product_id: row.cj_product_id,
            sku: row.sku,
            review_reason: row.review_reason,
          }))
          .sort((a, b) => a.cj_product_id.localeCompare(b.cj_product_id)),
      });
      writeJson(failurePath, {
        task_id: TASK_ID,
        count: failed.length,
        products: failed
          .map((row) => ({
            id: row.cj_product_id,
            cj_product_id: row.cj_product_id,
            sku: row.sku,
            review_reason: row.review_reason,
            gold_standard_gaps: row.gold_standard_gaps,
          }))
          .sort((a, b) => a.cj_product_id.localeCompare(b.cj_product_id)),
      });
    },
    onArchiveBatch: (entry) => {
      archive.push(entry);
      writeJson(archivePath, {
        task_id: TASK_ID,
        model: selected.model,
        batches: archive,
      });
    },
  });

  const next = writeCandidateFile(result.catalog, result.catalog.products, outputPath);
  const finalFile: LocalizationCatalogFile = {
    ...next,
    generated_at: new Date().toISOString(),
    paid_ai_estimate: {
      products: result.completed + result.failed,
      estimated_input_tokens: result.inputTokens,
      estimated_output_tokens: result.outputTokens,
      gemini_flash_usd: result.actualCostUsd,
      gemini_pro_usd: 0,
      note: `Actual Gemini spend $${result.actualCostUsd.toFixed(4)}. Model ${result.modelUsed}. Cap $${GEMINI_LOCALIZATION_COST_CAP_USD}. Candidate only; canonical not written.`,
    },
    next_action: "OWNER_REVIEW_BEFORE_CANONICAL_REPLACEMENT",
  };
  writeJson(outputPath, finalFile);
  writeJson(archivePath, {
    task_id: TASK_ID,
    model: result.modelUsed,
    actual_cost_usd: result.actualCostUsd,
    input_tokens: result.inputTokens,
    output_tokens: result.outputTokens,
    last_error: result.lastError,
    http_429_count: result.http429Count,
    quota_exhausted: result.quotaExhausted,
    batches: archive,
  });

  const success = finalFile.products.filter(
    (row) => inputIds.includes(row.cj_product_id) && row.status === "local_pass"
  );
  const failed = finalFile.products.filter(
    (row) => inputIds.includes(row.cj_product_id) && row.status === "manual_review_required"
  );
  writeJson(successPath, {
    task_id: TASK_ID,
    count: success.length,
    products: success
      .map((row) => ({
        id: row.cj_product_id,
        cj_product_id: row.cj_product_id,
        sku: row.sku,
        review_reason: row.review_reason,
      }))
      .sort((a, b) => a.cj_product_id.localeCompare(b.cj_product_id)),
  });
  writeJson(failurePath, {
    task_id: TASK_ID,
    count: failed.length,
    products: failed
      .map((row) => ({
        id: row.cj_product_id,
        cj_product_id: row.cj_product_id,
        sku: row.sku,
        review_reason: row.review_reason,
        gold_standard_gaps: row.gold_standard_gaps,
      }))
      .sort((a, b) => a.cj_product_id.localeCompare(b.cj_product_id)),
  });

  const browse = loadStoreBrowseCatalog();
  const browseById = new Map(browse.items.map((row) => [row.identity.cj_product_id, row]));
  const stats = publishableStats(finalFile.products, browseById);
  const integrity = compareIntegrity(catalog.products, finalFile.products);
  const canonicalAfter = sha256File(canonicalPath);
  writeJson(auditPath, {
    task_id: TASK_ID,
    candidate_path: outputPath,
    candidate_sha256: sha256File(outputPath),
    total_products: finalFile.products.length,
    localized_total: finalFile.products.filter((row) => row.status !== "manual_review_required").length,
    localization_review: finalFile.metrics.localization_review,
    manual_review_required: finalFile.metrics.manual_review_required,
    publishable: stats.publishable,
    held: stats.held,
    avg_publishable_margin: stats.avgMargin,
    integrity,
    canonical_sha256_after: canonicalAfter,
    canonical_unchanged: canonicalAfter === EXPECTED_CANONICAL_SHA256,
  });

  process.stdout.write(
    `${JSON.stringify({
      status: result.quotaExhausted ? "GEMINI_RATE_LIMITED" : "GEMINI_COMPLETE",
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
      localization_review: finalFile.metrics.localization_review,
      publishable: stats.publishable,
      held: stats.held,
      avg_publishable_margin: stats.avgMargin,
      backup_path: backupPath,
      backup_sha256: backupHash,
      input_manifest_path: idsPath,
      success_manifest_path: successPath,
      failure_manifest_path: failurePath,
      gemini_archive_path: archivePath,
      candidate_path: outputPath,
      candidate_sha256: sha256File(outputPath),
      integrity,
      canonical_sha256_after: canonicalAfter,
      canonical_unchanged: canonicalAfter === EXPECTED_CANONICAL_SHA256,
    })}\n`
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "unknown_error";
  process.stderr.write(`${message.replace(/key=[^&\s]+/gi, "key=redacted")}\n`);
  process.exit(1);
});
