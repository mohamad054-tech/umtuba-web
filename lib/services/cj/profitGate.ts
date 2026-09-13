/**
 * UMTUBA Profit Gate V2 — paid-ad and organic floors.
 * Do not weaken these constants to hit a count.
 */

import {
  IRELAND_TEST_DESTINATION,
  MIN_HEALTHY_STOCK,
  type CjPilotCategory,
} from "./constants";

export const CJ_PROFIT_GATE_V2_TASK_ID = "UMTUBA_CJ_PROFIT_GATE_V2_LOCAL" as const;
export const CJ_PROFIT_GATE_V2_JSON_RELATIVE_PATH = "data/cj-profit-gate-v2.json" as const;
export const CJ_PROFIT_GATE_V2_SOURCE_V1 = "CJ_PILOT_100_V1" as const;
export const CJ_PROFIT_GATE_V2_SOURCE_EXPAND = "CJ_PROFIT_GATE_V2_EXPAND" as const;

export const PAID_MIN_GROSS_MARGIN = 0.45;
export const PAID_MIN_GROSS_PROFIT_MINOR = 800;
export const PAID_PREFERRED_GROSS_PROFIT_MINOR = 1000;
export const PAID_MAX_LANDED_SHARE = 0.55;
export const PAID_MAX_DELIVERY_DAYS = 12;

export const ORGANIC_MIN_GROSS_MARGIN = 0.35;
export const ORGANIC_MIN_GROSS_PROFIT_MINOR = 400;
export const ORGANIC_MAX_DELIVERY_DAYS = 21;

/** Impulse / paid-social catalog: required retail above this is unrealistic. */
export const PAID_UNREALISTIC_RETAIL_MINOR = 7999;
/** Organic still rejects extreme shelf prices. */
export const ORGANIC_UNREALISTIC_RETAIL_MINOR = 9999;
/** Extra guard: required retail / landed above this is flagged (does not auto-reject cheap $8-floor items). */
export const ELEVATED_MARKUP_MULTIPLE = 4;

export const STRONG_PRODUCT_TARGET = 50;
export const MAX_UNIQUE_CANDIDATES = 300;

export const PROFIT_GATE_V2_IRELAND_DEST = IRELAND_TEST_DESTINATION;

export type ProfitGateClassification = "PAID_AD_READY" | "ORGANIC_ONLY" | "REJECTED_V2";
export type ProfitGateFilter = "ALL" | ProfitGateClassification;
export type ProfitGateSourceBatch =
  | typeof CJ_PROFIT_GATE_V2_SOURCE_V1
  | typeof CJ_PROFIT_GATE_V2_SOURCE_EXPAND;

export const PROFIT_GATE_FILTERS: readonly ProfitGateFilter[] = [
  "ALL",
  "PAID_AD_READY",
  "ORGANIC_ONLY",
  "REJECTED_V2",
];

/**
 * Extra catalog keywords for expansion only (same 5 families).
 * Used when strong products < 50. Does not replace V1 keywords.
 */
export const PROFIT_GATE_V2_EXPANSION_KEYWORDS: Record<CjPilotCategory, readonly string[]> = {
  Home: ["drawer organizer", "cable organizer", "phone stand", "soap dispenser"],
  Pet: ["pet waste bag dispenser", "cat scratcher pad", "dog bowl mat"],
  Car: ["car hook hanger", "seat gap filler", "car trash bag"],
  Travel: ["passport holder", "toiletry bottle", "luggage strap"],
  Beauty: ["hair scrunchie", "makeup sponge blender", "nail cleaning brush"],
};

/** V1 hard rejects that must not be reopened by repricing. weak_margin is NOT included. */
export const V1_HARD_REJECT_REASONS = new Set([
  "missing_cj_product_id",
  "missing_title",
  "missing_images",
  "counterfeit_or_branded",
  "regulated_medical_claims",
  "supplements",
  "dangerous_goods",
  "batteries_or_restricted",
  "adult_products",
  "complicated_sizing",
  "heavy_or_bulky",
  "poor_inventory",
  "missing_supplier_price",
  "slow_delivery",
  "shipping_unavailable_to_ireland_test_dest",
]);

export const V2_TITLE_EXCLUSIONS: readonly { reason: string; re: RegExp }[] = [
  {
    reason: "trademark_or_suspicious",
    re: /\b(lego|barbie|harry potter|marvel|star wars|hello kitty|stanley cup|yeti\b|dyson|airpods|crocs?|herm[eè]s|lululemon|off-white)\b/i,
  },
  {
    reason: "batteries_or_restricted",
    re: /\b(lithium|battery pack|power bank|18650|e-?scooter|hoverboard)\b/i,
  },
  {
    reason: "apparel_return_risk",
    re: /\b(t-?shirt|hoodie|sweatshirt|dress|jeans|sneaker|shoes?\b|socks?|bra\b|underwear|leggings?|pants size)\b/i,
  },
];

export const MIN_STOCK_HEALTHY = MIN_HEALTHY_STOCK;

export type ProfitScoreBreakdown = {
  margin: number;
  profit: number;
  delivery: number;
  stock: number;
  simplicity: number;
  visual: number;
  landed: number;
};

export type ProfitGateCandidate = {
  cjProductId: string;
  cjVariantId?: string | null;
  sku?: string | null;
  title: string;
  category: CjPilotCategory;
  imageUrls: string[];
  supplierPriceMinor: number | null;
  shippingMinor: number | null;
  feesMinor: number;
  landedCostMinor: number | null;
  stock: number | null;
  estimatedDeliveryTime: string | null;
  variantKey?: string | null;
  listedNum?: number;
  productUrl?: string | null;
  v1Decision?: "accepted" | "rejected";
  v1Reason?: string;
  v1RetailMinor?: number | null;
  sourceBatch: ProfitGateSourceBatch;
};

export type ProfitGateV2Product = {
  cj_product_id: string;
  cj_variant_id: string | null;
  sku: string | null;
  title: string;
  category: CjPilotCategory;
  image_urls: string[];
  classification: ProfitGateClassification;
  score: number;
  score_breakdown: ProfitScoreBreakdown;
  currency: "USD";
  supplier_price_minor: number | null;
  shipping_minor: number | null;
  fees_minor: number;
  landed_cost_minor: number | null;
  proposed_retail_minor: number | null;
  gross_profit_minor: number | null;
  gross_margin: number | null;
  landed_share_of_retail: number | null;
  stock: number | null;
  estimated_delivery_time: string | null;
  delivery_days: number | null;
  reasons: string[];
  flags: string[];
  provider: "cj";
  source_batch: ProfitGateSourceBatch;
  v1_decision: "accepted" | "rejected" | null;
  v1_retail_minor: number | null;
  product_url: string | null;
};

export type ProfitGateV2File = {
  task_id: typeof CJ_PROFIT_GATE_V2_TASK_ID;
  generated_at: string;
  provider: "cj";
  cj_api_connected: boolean;
  expansion_attempted: boolean;
  expansion_reason: string | null;
  ireland_test_destination: typeof IRELAND_TEST_DESTINATION;
  ranking_formula: {
    description: string;
    weights: Record<keyof ProfitScoreBreakdown, number>;
    notes: string[];
  };
  pricing_rule: {
    landed_cost_formula: string;
    gross_profit_formula: string;
    gross_margin_formula: string;
    rounding: string;
    paid_floors: string;
    organic_floors: string;
    prior_retail: string;
  };
  gates: {
    paid_ad_ready: string[];
    organic_only: string[];
    do_not_weaken: true;
  };
  endpoints_used: string[];
  summary: {
    candidates_evaluated: number;
    paid_ad_ready: number;
    organic_only: number;
    rejected_v2: number;
    strong_count: number;
    avg_margin_paid_ad_ready: number | null;
    avg_gross_profit_paid_ad_ready_minor: number | null;
    avg_delivery_days_paid_ad_ready: number | null;
    top_20: Array<{
      title: string;
      category: CjPilotCategory;
      classification: ProfitGateClassification;
      score: number;
      proposed_retail_minor: number;
      landed_cost_minor: number;
      gross_profit_minor: number;
      gross_margin: number;
    }>;
    rejection_reasons: Array<{ reason: string; count: number }>;
  };
  products: ProfitGateV2Product[];
};
