import { loadStoreBrowseCatalog } from "../../lib/services/cj/expansionBrowse";
import { readLocalizationCatalogFile } from "../../lib/store/productLocalization/catalogFile";
import { isPublishableBrowseRow, publishableStats } from "../../lib/store/productLocalization/publishable";

function main(): void {
  const catalog = readLocalizationCatalogFile();
  if (!catalog) {
    process.stdout.write("catalog_missing\n");
    process.exit(1);
  }
  const browse = loadStoreBrowseCatalog();
  const browseById = new Map(browse.items.map((row) => [row.identity.cj_product_id, row]));
  const stats = publishableStats(catalog.products, browseById);
  const syncErrors = browse.items.filter((row) => row.sync_status === "SYNC_ERROR").length;

  const reasonCounts = new Map<string, number>();
  const flagCounts = new Map<string, number>();
  const held: Array<{
    id: string;
    title: string;
    dept: string;
    status: string;
    flags: string[];
    reasons: string[];
    stock: number | null;
    margin: number | null;
    retail: number | null;
    landed: number | null;
    visible: boolean | null;
  }> = [];

  for (const row of catalog.products) {
    const browseRow = browseById.get(row.cj_product_id);
    const publishable = browseRow ? isPublishableBrowseRow(browseRow, row) : false;
    for (const item of row.catalog_qa ?? []) {
      flagCounts.set(item.flag, (flagCounts.get(item.flag) ?? 0) + 1);
    }
    if (publishable) continue;
    const reasons = (row.catalog_qa ?? []).map((item) => `${item.flag}: ${item.reason}`);
    if (row.status === "manual_review_required" && row.review_reason) {
      reasons.push(`REVIEW: ${row.review_reason}`);
    }
    if (reasons.length === 0) reasons.push("NO_QA_FLAG_BUT_NOT_PUBLISHABLE");
    for (const reason of reasons) {
      reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
    }
    held.push({
      id: row.cj_product_id,
      title: row.source_title,
      dept: row.department,
      status: row.status,
      flags: [...new Set((row.catalog_qa ?? []).map((item) => item.flag))],
      reasons,
      stock: browseRow?.economics.stock ?? null,
      margin: browseRow?.economics.gross_margin ?? null,
      retail: browseRow?.customer.retail_price_minor ?? row.retail_price_minor,
      landed: browseRow?.economics.landed_cost_minor ?? null,
      visible: browseRow?.customerVisible ?? null,
    });
  }

  const metrics = catalog.metrics;
  process.stdout.write(
    `${JSON.stringify(
      {
        task_id: catalog.task_id,
        total_products: catalog.products.length,
        localized_not_manual: catalog.products.filter((row) => row.status !== "manual_review_required").length,
        manual_review: metrics.manual_review_required,
        publishable: stats.publishable,
        held: stats.held,
        avg_margin: stats.avgMargin,
        avg_delivery_days: stats.avgDeliveryDays,
        ip_review: metrics.ip_review,
        price_review: metrics.price_review,
        product_data_review: metrics.product_data_review,
        localization_review: metrics.localization_review,
        duplicates_flagged: metrics.duplicates_flagged,
        shipping_review: metrics.shipping_review,
        unavailable: metrics.unavailable,
        sync_errors: syncErrors,
        browse_count: browse.items.length,
        flag_counts: Object.fromEntries(flagCounts),
        reason_counts: Object.fromEntries([...reasonCounts.entries()].sort((a, b) => b[1] - a[1])),
      },
      null,
      2
    )}\n`
  );
  process.stdout.write("\n--- HELD DETAIL ---\n");
  for (const row of held) {
    process.stdout.write(
      `${JSON.stringify({
        id: row.id,
        dept: row.dept,
        status: row.status,
        flags: row.flags,
        reasons: row.reasons,
        stock: row.stock,
        margin: row.margin,
        retail: row.retail,
        landed: row.landed,
        visible: row.visible,
        title: row.title,
      })}\n`
    );
  }
}

main();
