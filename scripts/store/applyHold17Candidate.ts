import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { loadStoreBrowseCatalog } from "../../lib/services/cj/expansionBrowse";
import { evaluateCatalogQa } from "../../lib/store/productLocalization/catalogQa";
import {
  readLocalizationCatalogFileFromPath,
  refreshCatalogMetrics,
} from "../../lib/store/productLocalization/catalogFile";
import { isPublishableBrowseRow, publishableStats } from "../../lib/store/productLocalization/publishable";
import type {
  LocalizationSourceProduct,
  LocalizedCatalogProduct,
} from "../../lib/store/productLocalization/types";

const ROOT = process.cwd();
const CANONICAL = resolve(ROOT, "data/cj-catalog-532-localized-final-v1.json");
const EXPECTED_SHA = "bee64499b82a957777020ebdb5e5e7626dc0b73f16ff8861abce2b9eb84d47c1";
const MANIFEST = resolve(
  ROOT,
  "docs/ai/recovery/UMTUBA_STORE_152_HOLD_RECOVERY_AUDIT_V1/auto-recoverable.json"
);
const HARD_HOLD = resolve(
  ROOT,
  "docs/ai/recovery/UMTUBA_STORE_152_HOLD_RECOVERY_AUDIT_V1/hard-hold.json"
);
const MANUAL_REVIEW = resolve(
  ROOT,
  "docs/ai/recovery/UMTUBA_STORE_152_HOLD_RECOVERY_AUDIT_V1/manual-review.json"
);
const CANDIDATE = resolve(ROOT, "data/cj-catalog-532-localized-final-v1.HOLD17_CANDIDATE.json");
const REPORT_DIR = resolve(ROOT, "docs/ai/recovery/UMTUBA_STORE_17_AUTO_RECOVERABLE_APPLY_V1");
const STUFFED_REASON = "Supplier title is keyword-stuffed or unreadable.";

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function toSource(row: LocalizedCatalogProduct): LocalizationSourceProduct {
  return {
    cj_product_id: row.cj_product_id,
    sku: row.sku,
    source: row.source,
    source_title: row.source_title,
    source_description: row.source_description,
    department: row.department,
    subcategory: row.subcategory,
    retail_price_minor: row.retail_price_minor,
    currency: row.currency,
    cover_url: row.cover_url,
    slug: row.slug,
  };
}

function fieldDiff(
  before: unknown,
  after: unknown,
  prefix = ""
): Array<{ path: string; before: unknown; after: unknown }> {
  if (Object.is(before, after)) return [];
  if (before && after && typeof before === "object" && typeof after === "object") {
    if (Array.isArray(before) && Array.isArray(after)) {
      const max = Math.max(before.length, after.length);
      const out: Array<{ path: string; before: unknown; after: unknown }> = [];
      for (let i = 0; i < max; i += 1) {
        out.push(...fieldDiff(before[i], after[i], `${prefix}[${i}]`));
      }
      return out;
    }
    if (!Array.isArray(before) && !Array.isArray(after)) {
      const a = before as Record<string, unknown>;
      const b = after as Record<string, unknown>;
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
      const out: Array<{ path: string; before: unknown; after: unknown }> = [];
      for (const key of keys) {
        out.push(...fieldDiff(a[key], b[key], prefix ? `${prefix}.${key}` : key));
      }
      return out;
    }
  }
  return [{ path: prefix || "$", before, after }];
}

function main(): void {
  mkdirSync(REPORT_DIR, { recursive: true });

  const canonicalSha = sha256File(CANONICAL);
  if (canonicalSha !== EXPECTED_SHA) {
    process.stderr.write(
      `STOP: canonical SHA256 is ${canonicalSha}, expected ${EXPECTED_SHA}\n`
    );
    process.exit(2);
  }

  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as {
    count: number;
    products: Array<{
      id: string;
      proposed_corrections: Array<{ proposed_correction: string }>;
    }>;
  };
  const hardHold = JSON.parse(readFileSync(HARD_HOLD, "utf8")) as {
    products: Array<{ id: string }>;
  };
  const manualReview = JSON.parse(readFileSync(MANUAL_REVIEW, "utf8")) as {
    products: Array<{ id: string }>;
  };

  const autoIds = manifest.products.map((row) => row.id);
  const autoIdSet = new Set(autoIds);
  const hardHoldIds = new Set(hardHold.products.map((row) => row.id));
  const manualReviewIds = new Set(manualReview.products.map((row) => row.id));

  if (manifest.count !== 17 || autoIds.length !== 17 || autoIdSet.size !== 17) {
    process.stderr.write(
      `STOP: AUTO_RECOVERY_MANIFEST count invalid (count=${manifest.count} ids=${autoIds.length} unique=${autoIdSet.size})\n`
    );
    process.exit(2);
  }

  const overlapHard = autoIds.filter((id) => hardHoldIds.has(id));
  const overlapManual = autoIds.filter((id) => manualReviewIds.has(id));
  if (overlapHard.length || overlapManual.length) {
    process.stderr.write(
      `STOP: 17-ID overlap hard=${JSON.stringify(overlapHard)} manual=${JSON.stringify(overlapManual)}\n`
    );
    process.exit(2);
  }

  const catalog = readLocalizationCatalogFileFromPath(CANONICAL);
  if (!catalog) {
    process.stderr.write("STOP: canonical catalog failed to parse\n");
    process.exit(2);
  }

  const browse = loadStoreBrowseCatalog(ROOT);
  const browseById = new Map(browse.items.map((row) => [row.identity.cj_product_id, row]));
  const beforeStats = publishableStats(catalog.products, browseById);

  const publishableIds = new Set<string>();
  for (const row of catalog.products) {
    const browseRow = browseById.get(row.cj_product_id);
    if (browseRow && isPublishableBrowseRow(browseRow, row)) publishableIds.add(row.cj_product_id);
  }

  const inPublishable = autoIds.filter((id) => publishableIds.has(id));
  if (inPublishable.length) {
    process.stderr.write(
      `STOP: AUTO IDs already publishable: ${JSON.stringify(inPublishable)}\n`
    );
    process.exit(2);
  }
  if (beforeStats.publishable !== 380 || beforeStats.held !== 152) {
    process.stderr.write(
      `STOP: unexpected baseline publishable=${beforeStats.publishable} held=${beforeStats.held}\n`
    );
    process.exit(2);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupPath = resolve(ROOT, `data/cj-catalog-532-localized-final-v1.HOLD17-${stamp}.backup.json`);
  copyFileSync(CANONICAL, backupPath);
  const backupSha = sha256File(backupPath);
  if (backupSha !== canonicalSha) {
    process.stderr.write(`STOP: backup SHA mismatch backup=${backupSha} canonical=${canonicalSha}\n`);
    process.exit(2);
  }

  const fixed: Array<Record<string, unknown>> = [];
  const failed: Array<Record<string, unknown>> = [];
  const nextProducts = catalog.products.map((row) => {
    if (!autoIdSet.has(row.cj_product_id)) return row;

    const clean = row.localized.title_en_clean.trim();
    const documented = manifest.products.find((item) => item.id === row.cj_product_id);
    const wordCount = clean.split(/\s+/).filter(Boolean).length;
    const browseRow = browseById.get(row.cj_product_id);
    const originalQa = row.catalog_qa ?? [];
    const onlyStuffed =
      originalQa.length === 1 &&
      originalQa[0]?.flag === "PRODUCT_DATA_REVIEW" &&
      originalQa[0]?.reason === STUFFED_REASON;

    if (!clean) {
      failed.push({ id: row.cj_product_id, why: "missing title_en_clean" });
      return row;
    }
    if (wordCount >= 18) {
      failed.push({ id: row.cj_product_id, why: "title_en_clean still >= 18 words", clean, wordCount });
      return row;
    }
    if (!onlyStuffed) {
      failed.push({
        id: row.cj_product_id,
        why: "stored catalog_qa is not the single keyword-stuffed finding",
        catalog_qa: originalQa,
      });
      return row;
    }

    const updated: LocalizedCatalogProduct = { ...row, source_title: clean };
    const qa = evaluateCatalogQa({
      source: toSource(updated),
      browse: browseRow,
      localized: updated,
    });
    updated.catalog_qa = qa;

    const publishable = browseRow ? isPublishableBrowseRow(browseRow, updated) : false;
    if (!publishable || qa.some((item) => item.reason === STUFFED_REASON)) {
      failed.push({
        id: row.cj_product_id,
        why: "documented correction did not clear hold",
        clean,
        qa,
        publishable,
        visible: browseRow?.customerVisible ?? null,
        stock: browseRow?.economics.stock ?? null,
        quality_ok: updated.quality.ok,
        status: updated.status,
      });
      return row;
    }

    fixed.push({
      id: row.cj_product_id,
      source: row.source,
      status: row.status,
      source_title_before: row.source_title,
      source_title_after: clean,
      title_en_clean: clean,
      documented_correction: documented?.proposed_corrections[0]?.proposed_correction ?? null,
      catalog_qa_before: originalQa,
      catalog_qa_after: qa,
      title_ar_unchanged: true,
    });
    return updated;
  });

  const nextCatalog = {
    ...catalog,
    metrics: refreshCatalogMetrics(nextProducts),
    products: nextProducts,
  };
  writeFileSync(CANDIDATE, `${JSON.stringify(nextCatalog, null, 2)}\n`, "utf8");
  const candidateSha = sha256File(CANDIDATE);

  const afterCatalog = readLocalizationCatalogFileFromPath(CANDIDATE);
  if (!afterCatalog) {
    process.stderr.write("STOP: candidate failed to re-parse\n");
    process.exit(2);
  }
  const afterStats = publishableStats(afterCatalog.products, browseById);
  const afterCanonicalSha = sha256File(CANONICAL);

  const beforeById = new Map(catalog.products.map((row) => [row.cj_product_id, row]));
  const afterById = new Map(afterCatalog.products.map((row) => [row.cj_product_id, row]));
  const productDiffs: Array<{ id: string; fields: ReturnType<typeof fieldDiff> }> = [];
  const unrelatedChanged: string[] = [];
  const missingAfter: string[] = [];
  const addedAfter: string[] = [];

  for (const [id, before] of beforeById) {
    const after = afterById.get(id);
    if (!after) {
      missingAfter.push(id);
      continue;
    }
    const fields = fieldDiff(before, after);
    if (fields.length === 0) continue;
    productDiffs.push({ id, fields });
    if (!autoIdSet.has(id)) unrelatedChanged.push(id);
  }
  for (const id of afterById.keys()) {
    if (!beforeById.has(id)) addedAfter.push(id);
  }

  const localizedAfter = afterCatalog.products.filter(
    (row) => row.status !== "manual_review_required"
  ).length;
  const localizationReviewAfter = afterCatalog.products.filter((row) =>
    (row.catalog_qa ?? []).some((item) => item.flag === "LOCALIZATION_REVIEW")
  ).length;

  const remainingHeldIds = afterCatalog.products
    .filter((row) => {
      const browseRow = browseById.get(row.cj_product_id);
      return !(browseRow && isPublishableBrowseRow(browseRow, row));
    })
    .map((row) => row.cj_product_id);
  const remainingHeldSet = new Set(remainingHeldIds);
  const manualRemaining = [...manualReviewIds].filter((id) => remainingHeldSet.has(id)).length;
  const hardRemaining = [...hardHoldIds].filter((id) => remainingHeldSet.has(id)).length;

  const report = {
    task_id: "UMTUBA_STORE_17_AUTO_RECOVERABLE_APPLY_V1",
    generated_at: new Date().toISOString(),
    canonical_path: CANONICAL,
    canonical_sha256_before: canonicalSha,
    canonical_sha256_after: afterCanonicalSha,
    canonical_replaced: false,
    backup_path: backupPath,
    backup_sha256: backupSha,
    backup_matches_canonical: backupSha === canonicalSha,
    auto_recovery_manifest: MANIFEST,
    auto_recovery_manifest_count: autoIds.length,
    auto_ids: autoIds,
    overlap_hard_hold: overlapHard,
    overlap_manual_review: overlapManual,
    already_publishable: inPublishable,
    candidate_path: CANDIDATE,
    candidate_sha256: candidateSha,
    baseline: beforeStats,
    after: afterStats,
    publishable_gain: afterStats.publishable - beforeStats.publishable,
    localization: {
      localized_after: localizedAfter,
      localization_review_after: localizationReviewAfter,
      manual_review_required_after: afterCatalog.metrics.manual_review_required,
      metrics_localization_review: afterCatalog.metrics.localization_review,
    },
    manual_review_remaining: manualRemaining,
    hard_hold_remaining: hardRemaining,
    products_added: addedAfter.length,
    products_deleted: missingAfter.length,
    added_ids: addedAfter,
    deleted_ids: missingAfter,
    fixed_products: fixed,
    failed_to_fix: failed,
    unrelated_products_changed: unrelatedChanged,
    product_field_diffs: productDiffs,
    top_level_non_product_diff: fieldDiff(
      { ...catalog, products: undefined, metrics: undefined },
      { ...afterCatalog, products: undefined, metrics: undefined }
    ),
    metrics_diff: fieldDiff(catalog.metrics, afterCatalog.metrics),
  };

  writeFileSync(
    resolve(REPORT_DIR, "apply-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8"
  );

  process.stdout.write(
    `${JSON.stringify(
      {
        CANONICAL_SHA256_VERIFIED: canonicalSha === EXPECTED_SHA && afterCanonicalSha === EXPECTED_SHA,
        AUTO_RECOVERY_MANIFEST_VERIFIED: autoIds.length === 17 && overlapHard.length === 0,
        BACKUP_PATH: backupPath,
        BACKUP_SHA256: backupSha,
        CANDIDATE_PATH: CANDIDATE,
        CANDIDATE_SHA256: candidateSha,
        FIXED_PRODUCTS: fixed.length,
        FAILED_TO_FIX: failed,
        UNRELATED_PRODUCTS_CHANGED: unrelatedChanged,
        TOTAL_PRODUCTS: afterCatalog.products.length,
        PUBLISHABLE_AFTER: afterStats.publishable,
        HELD_AFTER: afterStats.held,
        PUBLISHABLE_GAIN: afterStats.publishable - beforeStats.publishable,
        MANUAL_REVIEW_REMAINING: manualRemaining,
        HARD_HOLD_REMAINING: hardRemaining,
        LOCALIZED_AFTER: localizedAfter,
        LOCALIZATION_REVIEW_AFTER: localizationReviewAfter,
        PRODUCTS_ADDED: addedAfter.length,
        PRODUCTS_DELETED: missingAfter.length,
        CANONICAL_SHA256_AFTER: afterCanonicalSha,
      },
      null,
      2
    )}\n`
  );
}

main();
