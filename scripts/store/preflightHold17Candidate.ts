import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { loadStoreBrowseCatalog } from "../../lib/services/cj/expansionBrowse";
import { evaluateCatalogQa } from "../../lib/store/productLocalization/catalogQa";
import { readLocalizationCatalogFileFromPath } from "../../lib/store/productLocalization/catalogFile";
import { isPublishableBrowseRow, publishableStats } from "../../lib/store/productLocalization/publishable";
import type { LocalizationSourceProduct, LocalizedCatalogProduct } from "../../lib/store/productLocalization/types";

const ROOT = process.cwd();
const CANONICAL = resolve(ROOT, "data/cj-catalog-532-localized-final-v1.json");
const EXPECTED_SHA = "bee64499b82a957777020ebdb5e5e7626dc0b73f16ff8861abce2b9eb84d47c1";
const STUFFED_REASON = "Supplier title is keyword-stuffed or unreadable.";

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

function main(): void {
  const canonicalSha = createHash("sha256").update(readFileSync(CANONICAL)).digest("hex");
  const manifest = JSON.parse(
    readFileSync(
      resolve(ROOT, "docs/ai/recovery/UMTUBA_STORE_152_HOLD_RECOVERY_AUDIT_V1/auto-recoverable.json"),
      "utf8"
    )
  ) as { count: number; products: Array<{ id: string; proposed_corrections: Array<{ proposed_correction: string }> }> };
  const hardHold = JSON.parse(
    readFileSync(resolve(ROOT, "docs/ai/recovery/UMTUBA_STORE_152_HOLD_RECOVERY_AUDIT_V1/hard-hold.json"), "utf8")
  ) as { products: Array<{ id: string }> };
  const manualReview = JSON.parse(
    readFileSync(resolve(ROOT, "docs/ai/recovery/UMTUBA_STORE_152_HOLD_RECOVERY_AUDIT_V1/manual-review.json"), "utf8")
  ) as { products: Array<{ id: string }> };

  const catalog = readLocalizationCatalogFileFromPath(CANONICAL);
  if (!catalog) {
    process.stdout.write("catalog_missing\n");
    process.exit(1);
  }
  const browse = loadStoreBrowseCatalog(ROOT);
  const browseById = new Map(browse.items.map((row) => [row.identity.cj_product_id, row]));
  const stats = publishableStats(catalog.products, browseById);
  const autoIds = manifest.products.map((row) => row.id);
  const hardIds = new Set(hardHold.products.map((row) => row.id));
  const manualIds = new Set(manualReview.products.map((row) => row.id));
  const byId = new Map(catalog.products.map((row) => [row.cj_product_id, row]));

  const publishableIds = new Set<string>();
  for (const row of catalog.products) {
    const browseRow = browseById.get(row.cj_product_id);
    if (browseRow && isPublishableBrowseRow(browseRow, row)) publishableIds.add(row.cj_product_id);
  }

  const preview = autoIds.map((id) => {
    const row = byId.get(id);
    if (!row) return { id, missing: true };
    const clean = row.localized.title_en_clean.trim();
    const simulated: LocalizedCatalogProduct = { ...row, source_title: clean };
    const browseRow = browseById.get(id);
    const qa = evaluateCatalogQa({
      source: toSource(simulated),
      browse: browseRow,
      localized: simulated,
    });
    simulated.catalog_qa = qa;
    return {
      id,
      present: true,
      source: row.source,
      status: row.status,
      source_title: row.source_title,
      title_en_clean: clean,
      title_ar: row.localized.title_ar,
      word_count_clean: clean.split(/\s+/).filter(Boolean).length,
      catalog_qa: row.catalog_qa ?? [],
      simulated_qa: qa,
      currently_publishable: publishableIds.has(id),
      would_be_publishable: browseRow ? isPublishableBrowseRow(browseRow, simulated) : false,
      visible: browseRow?.customerVisible ?? null,
      stock: browseRow?.economics.stock ?? null,
      quality_ok: row.quality.ok,
      in_hard_hold: hardIds.has(id),
      in_manual_review: manualIds.has(id),
      stuffed_cleared: !qa.some((item) => item.reason === STUFFED_REASON),
    };
  });

  process.stdout.write(
    `${JSON.stringify(
      {
        canonical_sha256: canonicalSha,
        sha_ok: canonicalSha === EXPECTED_SHA,
        manifest_count: manifest.count,
        auto_ids: autoIds.length,
        unique_auto_ids: new Set(autoIds).size,
        overlap_hard: autoIds.filter((id) => hardIds.has(id)),
        overlap_manual: autoIds.filter((id) => manualIds.has(id)),
        already_publishable: autoIds.filter((id) => publishableIds.has(id)),
        baseline_publishable: stats.publishable,
        baseline_held: stats.held,
        localized: catalog.products.filter((row) => row.status !== "manual_review_required").length,
        localization_review: catalog.metrics.localization_review,
        preview,
      },
      null,
      2
    )}\n`
  );
}

main();
