import { evaluatePriceSafety } from "../../services/cj/priceSafety";
import type { StoreBrowseProduct } from "../../services/cj/expansionBrowse";
import type { LocalizationSourceProduct, LocalizedCatalogProduct } from "./types";

export const CATALOG_QA_FLAGS = [
  "LOCALIZATION_REVIEW",
  "PRODUCT_DATA_REVIEW",
  "IP_REVIEW",
  "PRICE_REVIEW",
  "SHIPPING_REVIEW",
  "UNAVAILABLE",
] as const;
export type CatalogQaFlag = (typeof CATALOG_QA_FLAGS)[number];

export type CatalogQaFinding = {
  flag: CatalogQaFlag;
  reason: string;
};

const IP_RE =
  /\b(airtag|iphone|ipad|apple|samsung|xiaomi|huawei|nike|adidas|gucci|prada|lv\b|louis vuitton|rolex|disney|hello kitty|lululemon|stanley)\b|15promax|14 pro|13 pro|12 pro/i;

const CATEGORY_MISMATCH: Array<{ dept: string; re: RegExp; note: string }> = [
  { dept: "GARDEN & OUTDOOR", re: /night lamp|night light|microphone|stool|clipper|watch|phone/, note: "Garden listing title does not describe a garden tool." },
  { dept: "TRAVEL", re: /cat |dog |puppy|kitten|pet sleeping|fish tank|bacterium|stockings|garbage|ashbin/, note: "Travel listing title describes a different product family." },
  { dept: "KIDS & TOYS", re: /wallet|men's|garment bag|duffle|makeup storage|parrot/, note: "Kids listing title describes adult or unrelated goods." },
  { dept: "SPORTS & FITNESS", re: /watch strap|baby waist stool|denim strap skirt/, note: "Sports listing title is not a workout accessory." },
  { dept: "BEAUTY & PERSONAL", re: /briefcase|hammock|dog foot|dog scratch|talking watch|obd|delphi/, note: "Beauty listing title is misclassified or unsafe." },
  { dept: "FASHION", re: /cat toy|dog chewing|pillowcase|eye black/, note: "Fashion listing title describes a different product family." },
  { dept: "HOME", re: /xhorse|obd2|iphone6s power cable|pet mat|licking/, note: "Home listing title is a cable, diagnostic, or pet item." },
  { dept: "PET", re: /bamboo joint handle|bag strap|tote bag|letter double layer/, note: "Pet listing title describes bag hardware." },
  { dept: "CAR", re: /led headlight|electrocardiogram|awning|work lights/, note: "Car listing may be decorative lighting or unrelated hardware." },
  { dept: "ELECTRONICS & ACCESSORIES", re: /airtag|golf scribing|tie clip/, note: "Electronics listing title may be IP-restricted or a fashion clip." },
];

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, " ")
    .replace(/\b(wholesale|new|hot|sale|product|supplies|accessories|gadget|gadgets)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function evaluateCatalogQa(input: {
  source: LocalizationSourceProduct;
  browse?: StoreBrowseProduct;
  localized?: LocalizedCatalogProduct;
}): CatalogQaFinding[] {
  const findings: CatalogQaFinding[] = [];
  const title = input.source.source_title;
  const words = title.trim().split(/\s+/).filter(Boolean);

  if (input.localized?.status === "manual_review_required") {
    findings.push({
      flag: "LOCALIZATION_REVIEW",
      reason: input.localized.review_reason ?? "No gold-standard local copy.",
    });
  }

  if (words.length < 2 || /^\d+$/.test(title.trim()) || /(.)\1{5,}/.test(title)) {
    findings.push({ flag: "PRODUCT_DATA_REVIEW", reason: "Supplier title is empty, numeric-only, or garbled." });
  }
  if (words.length >= 18) {
    findings.push({ flag: "PRODUCT_DATA_REVIEW", reason: "Supplier title is keyword-stuffed or unreadable." });
  }
  if (!input.source.cover_url || !input.source.cover_url.startsWith("https://")) {
    findings.push({ flag: "PRODUCT_DATA_REVIEW", reason: "Cover image is missing or not an https URL." });
  }

  if (IP_RE.test(title)) {
    findings.push({ flag: "IP_REVIEW", reason: "Title mentions a restricted brand, platform mark, or model family." });
  }

  for (const rule of CATEGORY_MISMATCH) {
    if (input.source.department === rule.dept && rule.re.test(title.toLowerCase())) {
      findings.push({ flag: "PRODUCT_DATA_REVIEW", reason: rule.note });
    }
  }

  const browse = input.browse;
  if (browse) {
    if (!browse.customerVisible) {
      findings.push({ flag: "UNAVAILABLE", reason: "Listing is hidden or not purchasable." });
    }
    if ((browse.economics.stock ?? 0) <= 0) {
      findings.push({ flag: "UNAVAILABLE", reason: "Stock is zero or missing." });
    }
    if (!browse.economics.estimated_delivery_time && browse.economics.delivery_days == null) {
      findings.push({ flag: "SHIPPING_REVIEW", reason: "No delivery window is supplied." });
    }
    const price = evaluatePriceSafety({
      retailMinor: browse.customer.retail_price_minor,
      landedCostMinor: browse.economics.landed_cost_minor,
      grossProfitMinor: browse.economics.gross_profit_minor,
      grossMargin: browse.economics.gross_margin,
    });
    if (!price.safe) {
      findings.push({ flag: "PRICE_REVIEW", reason: `Price safety: ${price.reason}.` });
    }
  } else if (input.source.retail_price_minor <= 0) {
    findings.push({ flag: "PRICE_REVIEW", reason: "Retail price is missing." });
  }

  return findings;
}

export function flagDuplicateGroups(products: LocalizationSourceProduct[]): Map<string, string> {
  const groups = new Map<string, string[]>();
  for (const row of products) {
    const key = normalizeTitle(row.source_title).split(" ").slice(0, 5).join(" ");
    if (key.length < 8) continue;
    const list = groups.get(key) ?? [];
    list.push(row.cj_product_id);
    groups.set(key, list);
  }
  const byId = new Map<string, string>();
  for (const [key, ids] of groups) {
    if (ids.length < 2) continue;
    for (const id of ids) byId.set(id, `Near-duplicate title group (${ids.length}): ${key}`);
  }
  return byId;
}

export function summarizeCatalogQa(findingsById: Map<string, CatalogQaFinding[]>): Record<CatalogQaFlag | "duplicates_flagged", number> {
  const counts: Record<CatalogQaFlag | "duplicates_flagged", number> = {
    LOCALIZATION_REVIEW: 0,
    PRODUCT_DATA_REVIEW: 0,
    IP_REVIEW: 0,
    PRICE_REVIEW: 0,
    SHIPPING_REVIEW: 0,
    UNAVAILABLE: 0,
    duplicates_flagged: 0,
  };
  for (const findings of findingsById.values()) {
    const flags = new Set(findings.map((row) => row.flag));
    for (const flag of flags) counts[flag] += 1;
    if (findings.some((row) => row.reason.startsWith("Near-duplicate"))) {
      counts.duplicates_flagged += 1;
    }
  }
  return counts;
}
