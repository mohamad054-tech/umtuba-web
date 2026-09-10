import type { StoreBrowseProduct } from "../../services/cj/expansionBrowse";
import { evaluateCatalogQa, flagDuplicateGroups } from "./catalogQa";
import type { LocalizationSourceProduct, LocalizedCatalogProduct } from "./types";

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

function duplicateScore(row: LocalizedCatalogProduct, browse?: StoreBrowseProduct): number {
  const margin = browse?.economics.gross_margin ?? 0;
  const profit = browse?.economics.gross_profit_minor ?? 0;
  const stock = browse?.economics.stock ?? 0;
  const days = browse?.economics.delivery_days;
  const deliveryScore = days == null ? 0 : Math.max(0, 20 - days);
  const imageScore = row.cover_url?.startsWith("https://") ? 5 : 0;
  const localizedScore = row.status === "manual_review_required" ? 0 : 8;
  return margin * 100 + profit / 100 + (stock > 0 ? 10 : 0) + deliveryScore + imageScore + localizedScore;
}

export function auditCommercialHolds(
  products: LocalizedCatalogProduct[],
  browseById: Map<string, StoreBrowseProduct>
): LocalizedCatalogProduct[] {
  const sources = products.map(toSource);
  const duplicateReasons = flagDuplicateGroups(sources);
  const groups = new Map<string, string[]>();
  for (const [id, reason] of duplicateReasons) {
    const list = groups.get(reason) ?? [];
    list.push(id);
    groups.set(reason, list);
  }
  const winners = new Set<string>();
  for (const ids of groups.values()) {
    const ranked = ids
      .map((id) => products.find((row) => row.cj_product_id === id))
      .filter((row): row is LocalizedCatalogProduct => Boolean(row))
      .sort(
        (a, b) =>
          duplicateScore(b, browseById.get(b.cj_product_id)) -
          duplicateScore(a, browseById.get(a.cj_product_id))
      );
    if (ranked[0]) winners.add(ranked[0].cj_product_id);
  }

  return products.map((row) => {
    const browse = browseById.get(row.cj_product_id);
    const qa = evaluateCatalogQa({
      source: toSource(row),
      browse,
      localized: row,
    }).filter((item) => !item.reason.startsWith("Near-duplicate"));
    const dup = duplicateReasons.get(row.cj_product_id);
    if (dup && !winners.has(row.cj_product_id)) {
      qa.push({
        flag: "PRODUCT_DATA_REVIEW",
        reason: `Near-duplicate weaker listing retained as HOLD: ${dup}`,
      });
    }
    return { ...row, catalog_qa: qa };
  });
}
