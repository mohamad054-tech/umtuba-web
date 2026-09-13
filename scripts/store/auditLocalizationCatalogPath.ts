import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadStoreBrowseCatalog } from "../../lib/services/cj/expansionBrowse";
import { readLocalizationCatalogFileFromPath } from "../../lib/store/productLocalization/catalogFile";
import { isPublishableBrowseRow, publishableStats } from "../../lib/store/productLocalization/publishable";

function main(): void {
  const catalogArg = process.argv[2];
  if (!catalogArg) {
    process.stderr.write("usage: npx tsx scripts/store/auditLocalizationCatalogPath.ts <catalog.json>\n");
    process.exit(1);
  }
  const catalogPath = resolve(catalogArg);
  const catalog = readLocalizationCatalogFileFromPath(catalogPath);
  if (!catalog) {
    process.stdout.write("catalog_missing_or_unparsed\n");
    process.exit(1);
  }
  const browse = loadStoreBrowseCatalog();
  const browseById = new Map(browse.items.map((row) => [row.identity.cj_product_id, row]));
  const stats = publishableStats(catalog.products, browseById);
  const reasonCounts = new Map<string, number>();
  const flagCounts = new Map<string, number>();
  let heldDetail = 0;
  for (const row of catalog.products) {
    const browseRow = browseById.get(row.cj_product_id);
    const publishable = browseRow ? isPublishableBrowseRow(browseRow, row) : false;
    for (const item of row.catalog_qa ?? []) {
      flagCounts.set(item.flag, (flagCounts.get(item.flag) ?? 0) + 1);
    }
    if (publishable) continue;
    heldDetail += 1;
    const reasons = (row.catalog_qa ?? []).map((item) => `${item.flag}: ${item.reason}`);
    if (row.status === "manual_review_required" && row.review_reason) {
      reasons.push(`REVIEW: ${row.review_reason}`);
    }
    if (reasons.length === 0) reasons.push("NO_QA_FLAG_BUT_NOT_PUBLISHABLE");
    for (const reason of reasons) {
      reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
    }
  }
  const metrics = catalog.metrics;
  process.stdout.write(
    `${JSON.stringify(
      {
        catalog_path: catalogPath,
        task_id: catalog.task_id,
        bytes: readFileSync(catalogPath).length,
        total_products: catalog.products.length,
        localized_not_manual: catalog.products.filter((row) => row.status !== "manual_review_required").length,
        manual_review: metrics.manual_review_required,
        localization_review: metrics.localization_review,
        publishable: stats.publishable,
        held: stats.held,
        held_detail_rows: heldDetail,
        avg_margin: stats.avgMargin,
        avg_delivery_days: stats.avgDeliveryDays,
        ip_review: metrics.ip_review,
        price_review: metrics.price_review,
        product_data_review: metrics.product_data_review,
        duplicates_flagged: metrics.duplicates_flagged,
        shipping_review: metrics.shipping_review,
        unavailable: metrics.unavailable,
        flag_counts: Object.fromEntries(flagCounts),
        reason_counts: Object.fromEntries([...reasonCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40)),
      },
      null,
      2
    )}\n`
  );
}

main();
