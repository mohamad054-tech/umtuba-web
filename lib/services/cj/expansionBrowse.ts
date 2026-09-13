/**
 * Unified customer browse catalog: approved 59 + expansion.
 * Customer payloads never include landed/margin/score/CJ ids.
 */

import {
  CUSTOMER_LEAK_KEYS,
  cleanCustomerTitle,
  customerAvailabilityLabel,
  customerDeliveryLabel,
  isolatedDraftProductId,
  opaquePublicToken,
  type CustomerDraftPayload,
  type CustomerStoreCategory,
} from "./launchDraft";
import { toCustomerCatalogItem } from "./launchStoreAdapter";
import {
  isCustomerVisibleLaunchProduct,
  type CjSyncStatus,
} from "./productionCandidate";
import { readApprovedDraftFile } from "./launchDraftFile";
import { readProductionCandidateFile } from "./productionCandidateFile";
import type { ExpansionAcceptedProduct } from "./expansionPipeline";
import { readExpansionCatalogFile, readLeftoverCanonicalExpansionProducts } from "./expansionFile";
import {
  STORE_DEPARTMENTS,
  STORE_SUBCATEGORIES,
  mapLaunchCategoryToDepartment,
  type StoreDepartment,
} from "./expansionTaxonomy";
import type { PublicCatalogItem } from "../../store/types";

export const STORE_RAILS = ["featured", "new", "top_picks", "best_deals"] as const;
export type StoreRail = (typeof STORE_RAILS)[number];

export type StoreBrowseProduct = {
  source: "approved_59" | "expansion";
  department: StoreDepartment;
  subcategory: string;
  classification: string;
  score: number;
  customerVisible: boolean;
  customer: CustomerDraftPayload;
  catalogItem: PublicCatalogItem;
  identity: {
    provider: "cj";
    cj_product_id: string;
    cj_variant_id: string | null;
    sku: string | null;
  };
  economics: {
    landed_cost_minor: number | null;
    gross_profit_minor: number | null;
    gross_margin: number | null;
    stock: number | null;
    estimated_delivery_time: string | null;
    delivery_days: number | null;
  };
  rails: {
    featured: boolean;
    isNew: boolean;
    topPick: boolean;
    bestDeal: boolean;
  };
  sync_status?: CjSyncStatus;
};

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "store-item";
}

function departmentToCustomerCategory(department: StoreDepartment): CustomerStoreCategory {
  if (department === "PET") return "Pet";
  if (department === "CAR") return "Car";
  if (department === "TRAVEL") return "Travel";
  if (department === "BEAUTY & PERSONAL") return "Beauty / Personal";
  return "Home";
}

export function customerBrowseLeaksInternals(payload: object): string[] {
  const blob = JSON.stringify(payload).toLowerCase();
  return CUSTOMER_LEAK_KEYS.filter((key) => blob.includes(key.toLowerCase()));
}

export function expansionToBrowseProduct(product: ExpansionAcceptedProduct): StoreBrowseProduct {
  const title = cleanCustomerTitle(product.title);
  const category = departmentToCustomerCategory(product.department);
  const gallery = product.image_urls.filter((url) => url.startsWith("https://"));
  const deliveryLabel = customerDeliveryLabel(
    product.estimated_delivery_time,
    product.delivery_days
  );
  const id = isolatedDraftProductId(product.cj_product_id);
  const slug = `${slugify(title)}-${opaquePublicToken(product.cj_product_id)}`;
  const customer: CustomerDraftPayload = {
    id,
    slug,
    title,
    short_description: `${product.department} · ${product.subcategory}`,
    description: [
      title,
      `Department: ${product.department}.`,
      `Subcategory: ${product.subcategory}.`,
      "Physical product for everyday use.",
      `${deliveryLabel}.`,
      "This listing is a draft and is not for sale.",
    ].join(" "),
    category,
    cover_url: gallery[0] ?? null,
    gallery_urls: gallery,
    retail_price_minor: product.retail_price_minor,
    currency: "USD",
    delivery_label: deliveryLabel,
    availability_label: customerAvailabilityLabel(product.stock),
    status: "draft",
    active: false,
    featured_eligible: product.classification === "PAID_AD_READY",
  };
  const draftLike = {
    customer,
    economics: {
      landed_cost_minor: product.landed_cost_minor,
      gross_profit_minor: product.gross_profit_minor,
      gross_margin: product.gross_margin,
      stock: product.stock,
      estimated_delivery_time: product.estimated_delivery_time,
      delivery_days: product.delivery_days,
    },
  };
  return {
    source: "expansion",
    department: product.department,
    subcategory: product.subcategory,
    classification: product.classification,
    score: product.score,
    customerVisible: product.availability === "in_stock" && product.stock > 0,
    customer,
    catalogItem: toCustomerCatalogItem(draftLike),
    identity: {
      provider: "cj",
      cj_product_id: product.cj_product_id,
      cj_variant_id: product.cj_variant_id,
      sku: product.sku,
    },
    economics: draftLike.economics,
    rails: { featured: false, isNew: true, topPick: false, bestDeal: false },
  };
}

function approvedToBrowseProduct(row: {
  customer: CustomerDraftPayload;
  identity: { cj_product_id: string; cj_variant_id: string | null; sku: string | null };
  economics: StoreBrowseProduct["economics"];
  sync_status?: CjSyncStatus;
  provider_available?: boolean;
  featured_eligible?: boolean;
}): StoreBrowseProduct {
  const mapped = mapLaunchCategoryToDepartment(row.customer.category);
  const customerVisible = isCustomerVisibleLaunchProduct(row);
  return {
    source: "approved_59",
    department: mapped.department,
    subcategory: mapped.subcategory,
    classification: row.customer.featured_eligible ? "LAUNCH_HERO" : "LAUNCH_STANDARD",
    score: row.customer.featured_eligible ? 90 : 70,
    customerVisible,
    customer: row.customer,
    catalogItem: toCustomerCatalogItem(row),
    identity: {
      provider: "cj",
      cj_product_id: row.identity.cj_product_id,
      cj_variant_id: row.identity.cj_variant_id,
      sku: row.identity.sku,
    },
    economics: row.economics,
    rails: {
      featured: Boolean(row.customer.featured_eligible || row.featured_eligible),
      isNew: false,
      topPick: Boolean(row.customer.featured_eligible),
      bestDeal: false,
    },
    sync_status: row.sync_status,
  };
}

function assignRails(items: StoreBrowseProduct[]): StoreBrowseProduct[] {
  const visible = items.filter((row) => row.customerVisible);
  const featured = new Set(
    [
      ...items.filter((row) => row.customer.featured_eligible || row.rails.featured),
      ...visible
        .filter((row) => row.classification === "PAID_AD_READY")
        .sort((a, b) => b.score - a.score)
        .slice(0, 24),
    ].map((row) => row.customer.id)
  );
  const top = new Set(
    visible
      .slice()
      .sort((a, b) => b.score - a.score)
      .slice(0, 24)
      .map((row) => row.customer.id)
  );
  const deals = new Set(
    visible
      .filter((row) => row.economics.gross_margin != null)
      .slice()
      .sort((a, b) => (b.economics.gross_margin ?? 0) - (a.economics.gross_margin ?? 0))
      .slice(0, 24)
      .map((row) => row.customer.id)
  );
  return items.map((row) => ({
    ...row,
    rails: {
      featured: featured.has(row.customer.id),
      isNew: row.source === "expansion",
      topPick: top.has(row.customer.id),
      bestDeal: deals.has(row.customer.id),
    },
  }));
}

export function loadStoreBrowseCatalog(rootDir = process.cwd()): {
  items: StoreBrowseProduct[];
  approvedCount: number;
  expansionCount: number;
  reservedSkipped: number;
} {
  const approved = readProductionCandidateFile(rootDir) ?? readApprovedDraftFile(rootDir);
  const expansion = readExpansionCatalogFile(rootDir);
  const reserved = new Set(
    (approved?.products ?? []).map((row) => row.identity.cj_product_id)
  );
  const fromApproved = (approved?.products ?? []).map((row) => approvedToBrowseProduct(row));
  let reservedSkipped = 0;
  const fromExpansion: StoreBrowseProduct[] = [];
  for (const product of expansion?.products ?? []) {
    if (reserved.has(product.cj_product_id)) {
      reservedSkipped += 1;
      continue;
    }
    reserved.add(product.cj_product_id);
    fromExpansion.push(expansionToBrowseProduct(product));
  }
  for (const product of readLeftoverCanonicalExpansionProducts(reserved, rootDir)) {
    reserved.add(product.cj_product_id);
    fromExpansion.push(expansionToBrowseProduct(product));
  }
  return {
    items: assignRails([...fromApproved, ...fromExpansion]),
    approvedCount: fromApproved.length,
    expansionCount: fromExpansion.length,
    reservedSkipped,
  };
}

export type BrowseFilter = {
  department?: StoreDepartment | "ALL";
  subcategory?: string;
  query?: string;
  rail?: StoreRail | "ALL";
  admin?: boolean;
};

export function filterBrowseCatalog(
  items: readonly StoreBrowseProduct[],
  filter: BrowseFilter
): StoreBrowseProduct[] {
  const dept = filter.department ?? "ALL";
  const rail = filter.rail ?? "ALL";
  const q = filter.query?.trim().toLowerCase() ?? "";
  return items.filter((row) => {
    if (!filter.admin && !row.customerVisible) return false;
    if (dept !== "ALL" && row.department !== dept) return false;
    if (filter.subcategory && row.subcategory !== filter.subcategory) return false;
    if (rail === "featured" && !row.rails.featured) return false;
    if (rail === "new" && !row.rails.isNew) return false;
    if (rail === "top_picks" && !row.rails.topPick) return false;
    if (rail === "best_deals" && !row.rails.bestDeal) return false;
    if (q) {
      const hay = [
        row.customer.title,
        row.customer.description,
        row.customer.short_description,
        row.department,
        row.subcategory,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function parseDepartment(raw: string | undefined): StoreDepartment | "ALL" {
  if (raw && (STORE_DEPARTMENTS as readonly string[]).includes(raw)) {
    return raw as StoreDepartment;
  }
  return "ALL";
}

export function parseRail(raw: string | undefined): StoreRail | "ALL" {
  if (raw && (STORE_RAILS as readonly string[]).includes(raw)) {
    return raw as StoreRail;
  }
  return "ALL";
}

export function subcategoriesFor(department: StoreDepartment | "ALL"): readonly string[] {
  if (department === "ALL") return [];
  return STORE_SUBCATEGORIES[department];
}

export function findBrowseProductBySlug(
  items: readonly StoreBrowseProduct[],
  slug: string
): StoreBrowseProduct | undefined {
  return items.find((row) => row.customer.slug === slug);
}
