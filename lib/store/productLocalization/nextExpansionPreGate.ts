import { familyFromTitle, FAMILY_CAPS } from "../../services/cj/expansionTaxonomy";
import type { ExpansionAcceptedProduct } from "../../services/cj/expansionPipeline";
import { evaluateCatalogQa, flagDuplicateGroups } from "./catalogQa";
import type { LocalizationSourceProduct, LocalizedCatalogProduct } from "./types";

const IP_RE =
  /\b(airtag|iphone|ipad|apple|samsung|xiaomi|huawei|nike|adidas|gucci|prada|lv\b|louis vuitton|rolex|disney|hello kitty|lululemon|stanley)\b|15promax|14 pro|13 pro|12 pro/i;

const HEALTH_RE =
  /\b(heal|heals|cure|cures|treats?|medical|clinically|fda|certified organic|whiten(?:s|ing)?|anti-aging|therapeutic|immunity|lose weight)\b/i;

const APPAREL_RE =
  /\b(romper|jumpsuit|shorts|leggings|hoodie|t-?shirt|dress|bra|underwear|yoga pants)\b/i;

const CAMERA_SURVEILLANCE_RE =
  /\b(dash\s*cam|dvr|wifi wireless camera|network monitor|night vision|solar camera|reversing camera|hidden camera|usb recorder)\b/i;

const ELECTRONICS_MISFILE_RE =
  /\b(hair clip|earring|ear clip|necklace|bracelet|jewelry|jewellery|ring holder dish|ponytail)\b/i;

const SPORTS_MISFILE_RE = /\b(pet towel|dog towel|cat towel)\b/i;

function titleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .join(" ");
}

export type PreGateDecision = {
  product: ExpansionAcceptedProduct;
  accept: boolean;
  reasons: string[];
};

export function gateNewExpansionProducts(input: {
  candidates: ExpansionAcceptedProduct[];
  existing: LocalizedCatalogProduct[];
}): { accepted: ExpansionAcceptedProduct[]; rejected: PreGateDecision[]; discovered: number } {
  const existingIds = new Set(input.existing.map((row) => row.cj_product_id));
  const existingSkus = new Set(
    input.existing.map((row) => row.sku).filter((sku): sku is string => Boolean(sku))
  );
  const existingTitles = new Set(input.existing.map((row) => titleKey(row.source_title)));
  const familyCounts = new Map<string, number>();
  for (const row of input.existing) {
    const family = familyFromTitle(row.source_title);
    familyCounts.set(family, (familyCounts.get(family) ?? 0) + 1);
  }

  const decisions: PreGateDecision[] = [];
  const accepted: ExpansionAcceptedProduct[] = [];
  const batchTitles = new Set<string>();
  const batchFamily = new Map<string, number>();

  for (const product of input.candidates) {
    const reasons: string[] = [];
    if (existingIds.has(product.cj_product_id)) reasons.push("duplicate_id_vs_532");
    if (product.sku && existingSkus.has(product.sku)) reasons.push("duplicate_sku_vs_532");
    const key = titleKey(product.title);
    if (key && existingTitles.has(key)) reasons.push("near_duplicate_title_vs_532");
    if (key && batchTitles.has(key)) reasons.push("near_duplicate_title_in_batch");
    if (!product.image_urls.some((url) => url.startsWith("https://"))) reasons.push("missing_https_images");
    if (product.retail_price_minor <= 0 || product.landed_cost_minor <= 0) reasons.push("missing_price_or_cost");
    if (product.stock < 30) reasons.push("poor_inventory");
    if (!product.estimated_delivery_time && product.delivery_days == null) reasons.push("missing_delivery");
    if (IP_RE.test(product.title) || /\bpodofo\b/i.test(product.title)) reasons.push("ip_brand_risk");
    if (HEALTH_RE.test(product.title)) reasons.push("unsupported_health_claim");
    if (APPAREL_RE.test(product.title)) reasons.push("apparel_return_risk");
    if (CAMERA_SURVEILLANCE_RE.test(product.title)) reasons.push("surveillance_or_restricted_camera");
    if (product.department === "ELECTRONICS & ACCESSORIES" && ELECTRONICS_MISFILE_RE.test(product.title)) {
      reasons.push("category_mismatch_electronics");
    }
    if (product.department === "SPORTS & FITNESS" && SPORTS_MISFILE_RE.test(product.title)) {
      reasons.push("category_mismatch_sports");
    }
    const words = product.title.trim().split(/\s+/).filter(Boolean);
    if (words.length < 2 || words.length >= 18) reasons.push("incomplete_or_keyword_stuffed_title");
    const family = familyFromTitle(product.title);
    const cap = FAMILY_CAPS[family];
    const used = (familyCounts.get(family) ?? 0) + (batchFamily.get(family) ?? 0);
    if (typeof cap === "number" && used >= cap) reasons.push(`family_cap:${family}:${used}>=${cap}`);
    if (product.classification !== "PAID_AD_READY" && product.classification !== "ORGANIC_ONLY") {
      reasons.push("not_commercially_classified");
    }

    const source: LocalizationSourceProduct = {
      cj_product_id: product.cj_product_id,
      sku: product.sku,
      source: "expansion",
      source_title: product.title,
      source_description: product.description,
      department: product.department,
      subcategory: product.subcategory,
      retail_price_minor: product.retail_price_minor,
      currency: "USD",
      cover_url: product.image_urls.find((url) => url.startsWith("https://")) ?? null,
      slug: null,
    };
    const qa = evaluateCatalogQa({ source });
    for (const finding of qa) {
      if (finding.flag === "IP_REVIEW" || finding.flag === "PRODUCT_DATA_REVIEW" || finding.flag === "PRICE_REVIEW") {
        reasons.push(`${finding.flag}:${finding.reason}`);
      }
    }

    const decision = { product, accept: reasons.length === 0, reasons };
    decisions.push(decision);
    if (decision.accept) {
      accepted.push(product);
      if (key) batchTitles.add(key);
      batchFamily.set(family, (batchFamily.get(family) ?? 0) + 1);
    }
  }

  const sources = accepted.map((product) => ({
    cj_product_id: product.cj_product_id,
    sku: product.sku,
    source: "expansion" as const,
    source_title: product.title,
    source_description: product.description,
    department: product.department,
    subcategory: product.subcategory,
    retail_price_minor: product.retail_price_minor,
    currency: "USD" as const,
    cover_url: product.image_urls.find((url) => url.startsWith("https://")) ?? null,
    slug: null,
  }));
  const dups = flagDuplicateGroups(sources);
  const filtered = accepted.filter((product) => !dups.has(product.cj_product_id));
  for (const product of accepted) {
    if (dups.has(product.cj_product_id)) {
      const existing = decisions.find((row) => row.product.cj_product_id === product.cj_product_id);
      if (existing) {
        existing.accept = false;
        existing.reasons.push(dups.get(product.cj_product_id) ?? "batch_duplicate");
      }
    }
  }

  return {
    discovered: input.candidates.length,
    accepted: filtered,
    rejected: decisions.filter((row) => !row.accept),
  };
}
