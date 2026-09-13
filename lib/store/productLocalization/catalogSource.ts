import { CJ_EXPANSION_JSON_RELATIVE_PATH } from "../../services/cj/expansionTaxonomy";
import { readExpansionCatalogFile } from "../../services/cj/expansionFile";
import { mapLaunchCategoryToDepartment } from "../../services/cj/expansionTaxonomy";
import { CJ_STORE_LAUNCH_JSON_RELATIVE_PATH } from "../../services/cj/launchDraft";
import { readApprovedDraftFile } from "../../services/cj/launchDraftFile";
import { LOCALIZATION_QA_SAMPLE_IDS } from "./constants";
import type { LocalizationSourceProduct } from "./types";

export function loadLocalizationCatalogSources(rootDir = process.cwd()): {
  products: LocalizationSourceProduct[];
  expansionCount: number;
} {
  const approved = readApprovedDraftFile(rootDir);
  const expansion = readExpansionCatalogFile(rootDir);
  const products: LocalizationSourceProduct[] = [];

  for (const row of approved?.products ?? []) {
    const mapped = mapLaunchCategoryToDepartment(row.customer.category);
    products.push({
      cj_product_id: row.identity.cj_product_id,
      sku: row.identity.sku,
      source: "approved_59",
      source_title: row.source_title || row.customer.title,
      source_description: row.customer.description,
      department: mapped.department,
      subcategory: mapped.subcategory,
      retail_price_minor: row.customer.retail_price_minor ?? 0,
      currency: "USD",
      cover_url: row.customer.cover_url,
      slug: row.customer.slug,
    });
  }

  const reserved = new Set(products.map((row) => row.cj_product_id));
  for (const row of expansion?.products ?? []) {
    if (reserved.has(row.cj_product_id)) continue;
    products.push({
      cj_product_id: row.cj_product_id,
      sku: row.sku,
      source: "expansion",
      source_title: row.title,
      source_description: row.description,
      department: row.department,
      subcategory: row.subcategory,
      retail_price_minor: row.retail_price_minor,
      currency: "USD",
      cover_url: row.image_urls.find((url) => url.startsWith("https://")) ?? null,
      slug: null,
    });
  }

  return {
    products,
    expansionCount: expansion?.products.length ?? 0,
  };
}

export function selectLocalizationQaSample(
  products: LocalizationSourceProduct[]
): LocalizationSourceProduct[] {
  const byId = new Map(products.map((row) => [row.cj_product_id, row]));
  const selected: LocalizationSourceProduct[] = [];
  for (const id of LOCALIZATION_QA_SAMPLE_IDS) {
    const row = byId.get(id);
    if (row) selected.push(row);
  }
  return selected;
}

export function catalogSourceNote(expansionCount: number): string {
  if (expansionCount < 50) {
    return `Expansion is incomplete (${expansionCount} accepted, Kitchen-heavy). Sampled ${LOCALIZATION_QA_SAMPLE_IDS.length} products from the approved 59 plus whatever expansion exists. Do not localize the full catalog until the owner approves this 20-sample.`;
  }
  return `Sampled ${LOCALIZATION_QA_SAMPLE_IDS.length} representative products from the approved 59 plus expansion. Do not localize the full catalog until the owner approves this 20-sample.`;
}

export { CJ_EXPANSION_JSON_RELATIVE_PATH, CJ_STORE_LAUNCH_JSON_RELATIVE_PATH };
