/**
 * Recalculate expansion summary after live fills. Does not call CJ.
 * Never prints secrets.
 */

import { readReservedApprovedCjProductIds, readExpansionCatalogFile, writeExpansionCatalogFile } from "../../lib/services/cj/expansionFile";
import { finalizeAcceptedProducts } from "../../lib/services/cj/expansionPipeline";
import { STORE_DEPARTMENTS } from "../../lib/services/cj/expansionTaxonomy";

const listedAcrossPasses = 620 + 280 + 180 + 60;
const rejectedAcrossPasses = 195 + 108 + 64 + 38;

function avg(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 1000) / 1000;
}

function main() {
  const catalog = readExpansionCatalogFile();
  if (!catalog) throw new Error("missing expansion catalog");
  const reserved = readReservedApprovedCjProductIds();
  const products = finalizeAcceptedProducts(catalog.products);
  const overlap = products.filter((row) => reserved.has(row.cj_product_id));
  if (overlap.length) {
    throw new Error(`expansion overlapped approved 59 by ${overlap.length}`);
  }
  const ids = new Set(products.map((row) => row.cj_product_id));
  if (ids.size !== products.length) {
    throw new Error("duplicate expansion product ids");
  }
  const deptCounts = Object.fromEntries(STORE_DEPARTMENTS.map((dept) => [dept, 0]));
  const subCounts: Record<string, number> = {};
  for (const row of products) {
    deptCounts[row.department] += 1;
    const key = `${row.department}::${row.subcategory}`;
    subCounts[key] = (subCounts[key] ?? 0) + 1;
  }
  const paid = products.filter((row) => row.classification === "PAID_AD_READY").length;
  const organic = products.filter((row) => row.classification === "ORGANIC_ONLY").length;
  const next = {
    ...catalog,
    candidates_fetched: listedAcrossPasses,
    additional_products_accepted: products.length,
    paid_ad_ready: paid,
    organic_only: organic,
    rejected: rejectedAcrossPasses,
    substituted: false as const,
    department_counts: deptCounts,
    subcategory_counts: subCounts,
    avg_landed_cost_major: avg(products.map((row) => row.landed_cost_minor / 100)),
    avg_retail_major: avg(products.map((row) => row.retail_price_minor / 100)),
    avg_gross_margin: avg(products.map((row) => row.gross_margin)),
    avg_delivery_days: avg(
      products.map((row) => row.delivery_days).filter((value): value is number => value != null)
    ),
    products,
  };
  writeExpansionCatalogFile(next);
  const top = [...products]
    .sort((a, b) => b.score - a.score || b.gross_margin - a.gross_margin)
    .slice(0, 30)
    .map((row, index) => `${index + 1}. ${row.title} (${row.department} / ${row.subcategory})`);
  process.stdout.write(`ADDITIONAL_PRODUCTS_ACCEPTED=${products.length}\n`);
  process.stdout.write(`PAID_AD_READY=${paid}\n`);
  process.stdout.write(`ORGANIC_ONLY=${organic}\n`);
  process.stdout.write(`REJECTED=${rejectedAcrossPasses}\n`);
  process.stdout.write(`CANDIDATES_FETCHED=${listedAcrossPasses}\n`);
  process.stdout.write(`OVERLAP_WITH_59=0\n`);
  process.stdout.write(`DEPARTMENTS_WITH_PRODUCTS=${STORE_DEPARTMENTS.filter((dept) => deptCounts[dept] > 0).length}\n`);
  process.stdout.write(`AVG_LANDED_COST=${next.avg_landed_cost_major}\n`);
  process.stdout.write(`AVG_RETAIL=${next.avg_retail_major}\n`);
  process.stdout.write(`AVG_GROSS_MARGIN=${next.avg_gross_margin}\n`);
  process.stdout.write(`AVG_DELIVERY_DAYS=${next.avg_delivery_days}\n`);
  process.stdout.write("DEPARTMENT_COUNTS=\n");
  for (const [dept, count] of Object.entries(deptCounts)) {
    process.stdout.write(`  ${dept}=${count}\n`);
  }
  process.stdout.write("TOP_30_PRODUCTS=\n");
  for (const line of top) process.stdout.write(`  ${line}\n`);
}

main();
