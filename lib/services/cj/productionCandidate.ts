/**
 * Unpublished production candidate for the owner-approved 59 CJ products.
 * Last-known statuses from approved JSON — NOT live-verified.
 */

import type { ApprovedDraftProduct } from "./launchDraft";
import type { ApprovedDraftFile } from "./launchDraftFile";
import {
  APPROVED_HERO_COUNT,
  APPROVED_LAUNCH_COUNT,
  APPROVED_STANDARD_COUNT,
  customerPayloadLeaksInternals,
  type CustomerDraftPayload,
} from "./launchDraft";
import { evaluatePriceSafety } from "./priceSafety";

export const CJ_PRODUCTION_CANDIDATE_TASK_ID =
  "UMTUBA_STORE_CJ_59_PRODUCTION_READINESS_V1" as const;
export const CJ_PRODUCTION_CANDIDATE_JSON_RELATIVE_PATH =
  "data/cj-store-launch-candidate-v1.json" as const;

export const CJ_SYNC_STATUSES = [
  "HEALTHY",
  "PRICE_REVIEW",
  "OUT_OF_STOCK",
  "PROVIDER_UNAVAILABLE",
  "SYNC_ERROR",
] as const;
export type CjSyncStatus = (typeof CJ_SYNC_STATUSES)[number];

/** Live statuses that must never appear as a customer-purchasable offer. */
export const CUSTOMER_HIDDEN_SYNC_STATUSES = [
  "SYNC_ERROR",
  "OUT_OF_STOCK",
  "PROVIDER_UNAVAILABLE",
] as const satisfies readonly CjSyncStatus[];

export function isCustomerPurchasableSyncStatus(
  status: CjSyncStatus
): boolean {
  return status === "HEALTHY" || status === "PRICE_REVIEW";
}

export function isCustomerVisibleLaunchProduct(product: {
  sync_status?: CjSyncStatus;
  provider_available?: boolean;
  customer?: { availability_label?: string };
}): boolean {
  if (product.sync_status) {
    return isCustomerPurchasableSyncStatus(product.sync_status);
  }
  if (product.provider_available === false) return false;
  if (product.customer?.availability_label === "Unavailable") return false;
  return true;
}

export function partitionLaunchCatalog<T extends {
  sync_status?: CjSyncStatus;
  provider_available?: boolean;
  customer?: { availability_label?: string };
}>(products: readonly T[]): { visible: T[]; hidden: T[] } {
  const visible: T[] = [];
  const hidden: T[] = [];
  for (const row of products) {
    if (isCustomerVisibleLaunchProduct(row)) visible.push(row);
    else hidden.push(row);
  }
  return { visible, hidden };
}

export type ProductionCandidateProduct = {
  customer: CustomerDraftPayload;
  identity: ApprovedDraftProduct["identity"];
  economics: ApprovedDraftProduct["economics"];
  store_status: "draft";
  published_at: null;
  marketplace_eligible: false;
  featured_eligible: boolean;
  sync_status: CjSyncStatus;
  sync_basis: "last_known_approved_json" | "live_cj_read";
  live_verified: boolean;
  last_synced_at: string | null;
  provider_available: boolean;
  flags: string[];
};

export type ProductionCandidateFile = {
  task_id: typeof CJ_PRODUCTION_CANDIDATE_TASK_ID;
  generated_at: string;
  provider: "cj";
  publication: {
    status: "draft";
    active: false;
    live_store_published: false;
    checkout_enabled: false;
    fulfillment_enabled: false;
  };
  live_audit: {
    status: "PENDING_KEY_ROTATION" | "LIVE_VERIFIED" | "AUTH_FAILED" | "PARTIAL";
    note: string;
  };
  summary: {
    approved_products: number;
    hero_products: number;
    standard_products: number;
    last_known_healthy: number;
    last_known_price_review: number;
    last_known_out_of_stock: number;
    last_known_provider_unavailable: number;
    last_known_sync_error: number;
    substituted: false;
    padded: false;
  };
  products: ProductionCandidateProduct[];
};

export function classifyLastKnownSyncStatus(
  product: ApprovedDraftProduct
): { status: CjSyncStatus; flags: string[] } {
  const flags = [...product.flags];
  const stock = product.economics.stock;
  if (stock != null && stock <= 0) {
    return { status: "OUT_OF_STOCK", flags: [...flags, "last_known_zero_stock"] };
  }
  if (product.economics.landed_cost_minor == null || product.customer.retail_price_minor == null) {
    return {
      status: "PROVIDER_UNAVAILABLE",
      flags: [...flags, "last_known_missing_landed_or_retail"],
    };
  }
  const safety = evaluatePriceSafety({
    retailMinor: product.customer.retail_price_minor,
    landedCostMinor: product.economics.landed_cost_minor,
    grossProfitMinor: product.economics.gross_profit_minor,
    grossMargin: product.economics.gross_margin,
  });
  if (!safety.safe) {
    return { status: "PRICE_REVIEW", flags: [...flags, safety.reason] };
  }
  if (product.flags.includes("missing_primary_image") || product.flags.includes("broken_image_url")) {
    return { status: "SYNC_ERROR", flags };
  }
  return { status: "HEALTHY", flags };
}

export function buildProductionCandidateFile(
  approved: ApprovedDraftFile,
  generatedAt = new Date().toISOString()
): ProductionCandidateFile {
  if (approved.products.length !== APPROVED_LAUNCH_COUNT) {
    throw new Error(`Expected ${APPROVED_LAUNCH_COUNT} approved products`);
  }
  const products: ProductionCandidateProduct[] = approved.products.map((row) => {
    const leaks = customerPayloadLeaksInternals(row.customer);
    if (leaks.length) {
      throw new Error(`Customer payload leak on ${row.customer.slug}`);
    }
    const classified = classifyLastKnownSyncStatus(row);
    return {
      customer: row.customer,
      identity: row.identity,
      economics: row.economics,
      store_status: "draft",
      published_at: null,
      marketplace_eligible: false,
      featured_eligible: row.customer.featured_eligible,
      sync_status: classified.status,
      sync_basis: "last_known_approved_json",
      live_verified: false,
      last_synced_at: approved.generated_at,
      provider_available: classified.status !== "PROVIDER_UNAVAILABLE" && classified.status !== "OUT_OF_STOCK",
      flags: classified.flags,
    };
  });

  const hero = products.filter((row) => row.identity.launch_classification === "LAUNCH_HERO");
  const standard = products.filter((row) => row.identity.launch_classification === "LAUNCH_STANDARD");
  if (hero.length !== APPROVED_HERO_COUNT || standard.length !== APPROVED_STANDARD_COUNT) {
    throw new Error("Hero/standard counts drifted from the approved 15/44 set");
  }

  const count = (status: CjSyncStatus) =>
    products.filter((row) => row.sync_status === status).length;

  return {
    task_id: CJ_PRODUCTION_CANDIDATE_TASK_ID,
    generated_at: generatedAt,
    provider: "cj",
    publication: {
      status: "draft",
      active: false,
      live_store_published: false,
      checkout_enabled: false,
      fulfillment_enabled: false,
    },
    live_audit: {
      status: "PENDING_KEY_ROTATION",
      note: "Existing CJ API key is treated as compromised. Live catalog/freight audit is forbidden until a rotated server secret is installed and CJ_API_KEY_ROTATED=true.",
    },
    summary: {
      approved_products: products.length,
      hero_products: hero.length,
      standard_products: standard.length,
      last_known_healthy: count("HEALTHY"),
      last_known_price_review: count("PRICE_REVIEW"),
      last_known_out_of_stock: count("OUT_OF_STOCK"),
      last_known_provider_unavailable: count("PROVIDER_UNAVAILABLE"),
      last_known_sync_error: count("SYNC_ERROR"),
      substituted: false,
      padded: false,
    },
    products,
  };
}

export function customerFacingCandidate(product: ProductionCandidateProduct): CustomerDraftPayload {
  return product.customer;
}
