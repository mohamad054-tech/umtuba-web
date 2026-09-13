/**
 * Owner-approved 59-product CJ launch → isolated Store DRAFT records.
 * Customer payloads never include landed cost, margin, CJ IDs, or scores.
 */

import { EXCLUSION_PATTERNS } from "./constants";
import type { LaunchClassification, LaunchFamily } from "./launchAssumptions";
import type { LaunchMixProduct } from "./launchSelect";

export const CJ_STORE_LAUNCH_TASK_ID = "UMTUBA_STORE_CJ_59_DRAFT_INTEGRATION_V1" as const;
export const CJ_STORE_LAUNCH_BATCH = "CJ_STORE_LAUNCH_V1" as const;
export const CJ_STORE_LAUNCH_JSON_RELATIVE_PATH = "data/cj-store-launch-approved-59.json" as const;
export const CJ_STORE_LAUNCH_STORE_ID = "00000000-0000-4000-8000-cjlaunch00001" as const;
export const CJ_STORE_LAUNCH_STORE_SLUG = "umtuba-cj-launch-v1" as const;
export const CJ_STORE_LAUNCH_STORE_NAME = "UMTUBA Store" as const;
export const APPROVED_LAUNCH_COUNT = 59;
export const APPROVED_HERO_COUNT = 15;
export const APPROVED_STANDARD_COUNT = 44;

export const CUSTOMER_STORE_CATEGORIES = [
  "Home",
  "Pet",
  "Car",
  "Travel",
  "Beauty / Personal",
] as const;
export type CustomerStoreCategory = (typeof CUSTOMER_STORE_CATEGORIES)[number];

export const CUSTOMER_LEAK_KEYS = [
  "landed_cost",
  "landed_cost_minor",
  "gross_margin",
  "gross_profit",
  "gross_profit_minor",
  "profitability_score",
  "cj_product_id",
  "cj_variant_id",
  "supplier_price_minor",
  "break_even_ad_cost_minor",
  "recommended_target_cpa_minor",
] as const;

export type DraftFlag =
  | "missing_primary_image"
  | "low_or_unknown_stock"
  | "delivery_over_12_days"
  | "suspicious_branding"
  | "missing_retail"
  | "broken_image_url";

export type CustomerDraftPayload = {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  description: string;
  category: CustomerStoreCategory;
  cover_url: string | null;
  gallery_urls: string[];
  retail_price_minor: number | null;
  currency: "USD";
  delivery_label: string;
  availability_label: string;
  status: "draft";
  active: false;
  featured_eligible: boolean;
};

export type InternalDraftIdentity = {
  provider: "cj";
  pilot_batch: typeof CJ_STORE_LAUNCH_BATCH;
  cj_product_id: string;
  cj_variant_id: string | null;
  sku: string | null;
  launch_classification: "LAUNCH_HERO" | "LAUNCH_STANDARD";
  family: LaunchFamily;
};

export type InternalEconomics = {
  landed_cost_minor: number | null;
  gross_profit_minor: number | null;
  gross_margin: number | null;
  stock: number | null;
  estimated_delivery_time: string | null;
  delivery_days: number | null;
};

export type ApprovedDraftProduct = {
  customer: CustomerDraftPayload;
  identity: InternalDraftIdentity;
  economics: InternalEconomics;
  flags: DraftFlag[];
  source_title: string;
  store_status: "draft";
  published_at: null;
  marketplace_eligible: false;
};

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "cj-launch-item";
}

/** Opaque public id — must not embed the raw CJ product id. */
export function opaquePublicToken(cjProductId: string): string {
  let hash = 2166136261;
  for (let i = 0; i < cjProductId.length; i += 1) {
    hash ^= cjProductId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function isolatedDraftProductId(cjProductId: string): string {
  const token = opaquePublicToken(cjProductId);
  return `00000000-4000-8000-8000-${token.padEnd(12, "a")}`;
}

export function cleanCustomerTitle(raw: string): string {
  const cleaned = raw
    .replace(/\b(wholesale|new product|ins fashion temperament)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[,.\-\s]+|[,.\-\s]+$/g, "")
    .trim();
  if (cleaned.length <= 72) return cleaned;
  return `${cleaned.slice(0, 69).replace(/\s+\S*$/, "")}…`;
}

export function toCustomerCategory(
  category: LaunchMixProduct["category"],
  family: LaunchFamily
): CustomerStoreCategory {
  if (family === "personal_care_brush" || category === "Beauty") return "Beauty / Personal";
  return category;
}

export function customerDeliveryLabel(delivery: string | null, days: number | null): string {
  if (delivery && days != null) return `Typically ${delivery} days to Ireland`;
  if (delivery) return `Typically ${delivery} days`;
  return "Delivery estimate pending";
}

export function customerAvailabilityLabel(stock: number | null): string {
  if (stock == null) return "Availability on request";
  if (stock <= 0) return "Unavailable";
  if (stock <= 3) return `${stock} left`;
  return "In stock";
}

function customerDescription(input: {
  title: string;
  category: CustomerStoreCategory;
  deliveryLabel: string;
}): string {
  return [
    input.title,
    `Category: ${input.category}.`,
    "Physical product for everyday use.",
    input.deliveryLabel + ".",
    "This listing is a draft and is not for sale.",
  ].join(" ");
}

export function collectDraftFlags(product: LaunchMixProduct): DraftFlag[] {
  const flags: DraftFlag[] = [];
  const images = product.image_urls.filter((url) => url.startsWith("https://"));
  if (!images.length) flags.push("missing_primary_image");
  if (product.image_urls.some((url) => !url.startsWith("https://"))) flags.push("broken_image_url");
  if (product.stock == null || product.stock < 30) flags.push("low_or_unknown_stock");
  if (product.delivery_days != null && product.delivery_days > 12) {
    flags.push("delivery_over_12_days");
  }
  if (product.economics.final_retail_price_minor == null) flags.push("missing_retail");
  const blob = product.title;
  for (const rule of EXCLUSION_PATTERNS) {
    if (rule.re.test(blob)) {
      flags.push("suspicious_branding");
      break;
    }
  }
  return [...new Set(flags)];
}

export function isApprovedLaunchClassification(
  value: LaunchClassification
): value is "LAUNCH_HERO" | "LAUNCH_STANDARD" {
  return value === "LAUNCH_HERO" || value === "LAUNCH_STANDARD";
}

export function approvedLaunchProducts(
  products: readonly LaunchMixProduct[]
): LaunchMixProduct[] {
  return products.filter((row) => isApprovedLaunchClassification(row.launch_classification));
}

export function toApprovedDraftProduct(
  product: LaunchMixProduct,
  identityExtras?: { cjVariantId?: string | null; sku?: string | null }
): ApprovedDraftProduct {
  if (!isApprovedLaunchClassification(product.launch_classification)) {
    throw new Error(`Refusing non-selected product ${product.cj_product_id}`);
  }
  const title = cleanCustomerTitle(product.title);
  const category = toCustomerCategory(product.category, product.family);
  const gallery = product.image_urls.filter((url) => url.startsWith("https://"));
  const deliveryLabel = customerDeliveryLabel(
    product.estimated_delivery_time,
    product.delivery_days
  );
  const id = isolatedDraftProductId(product.cj_product_id);
  const slug = `${slugify(title)}-${opaquePublicToken(product.cj_product_id)}`;

  return {
    customer: {
      id,
      slug,
      title,
      short_description: `${category} · Draft listing`,
      description: customerDescription({ title, category, deliveryLabel }),
      category,
      cover_url: gallery[0] ?? null,
      gallery_urls: gallery,
      retail_price_minor: product.economics.final_retail_price_minor,
      currency: "USD",
      delivery_label: deliveryLabel,
      availability_label: customerAvailabilityLabel(product.stock),
      status: "draft",
      active: false,
      featured_eligible: product.launch_classification === "LAUNCH_HERO",
    },
    identity: {
      provider: "cj",
      pilot_batch: CJ_STORE_LAUNCH_BATCH,
      cj_product_id: product.cj_product_id,
      cj_variant_id: identityExtras?.cjVariantId ?? null,
      sku: identityExtras?.sku ?? null,
      launch_classification: product.launch_classification,
      family: product.family,
    },
    economics: {
      landed_cost_minor: product.economics.landed_cost_minor,
      gross_profit_minor: product.economics.gross_profit_minor,
      gross_margin: product.economics.gross_margin,
      stock: product.stock,
      estimated_delivery_time: product.estimated_delivery_time,
      delivery_days: product.delivery_days,
    },
    flags: collectDraftFlags(product),
    source_title: product.title,
    store_status: "draft",
    published_at: null,
    marketplace_eligible: false,
  };
}

/**
 * Customer JSON must not contain these keys at any depth.
 * Identity/economics live in sibling objects, never inside `customer`.
 */
export function customerPayloadLeaksInternals(payload: CustomerDraftPayload): string[] {
  const blob = JSON.stringify(payload).toLowerCase();
  return CUSTOMER_LEAK_KEYS.filter((key) => blob.includes(key.toLowerCase()));
}
