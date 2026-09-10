/**
 * Isolated CJ dropship pilot — hard firewall.
 * Read-only catalog/logistics only. Never create orders or take payments.
 */

export const CJ_PILOT_TASK_ID = "UMTUBA_CJ_PILOT_100_PRODUCTS_LOCAL_V1" as const;
export const CJ_PILOT_BATCH = "CJ_PILOT_100_V1" as const;
export const CJ_PROVIDER = "cj" as const;

export const PRODUCTION_CHANGED = false;
export const CJ_ORDER_CREATED = false;
export const PAYMENT_ACTION = false;
export const DEPLOYED = false;
export const LIVE_STORE_PUBLISH_ENABLED = false;
export const CJ_WRITE_CALLS_ENABLED = false;

export const CJ_API_BASE_URL = "https://developers.cjdropshipping.com/api2.0" as const;

export const CJ_ENDPOINTS = {
  getAccessToken: "/v1/authentication/getAccessToken",
  refreshAccessToken: "/v1/authentication/refreshAccessToken",
  getCategory: "/v1/product/getCategory",
  listV2: "/v1/product/listV2",
  productQuery: "/v1/product/query",
  variantQueryByVid: "/v1/product/variant/queryByVid",
  stockQueryByVid: "/v1/product/stock/queryByVid",
  stockQueryBySku: "/v1/product/stock/queryBySku",
  freightCalculate: "/v1/logistic/freightCalculate",
} as const;

export const CJ_FORBIDDEN_WRITE_PATHS = [
  "/v1/shopping/order",
  "/v1/shopping/order/createOrder",
  "/v1/shopping/order/createOrderV2",
  "/v1/logistic/createOrder",
  "/v1/payment",
  "/v1/product/addToMyProduct",
  "/v1/authentication/logout",
] as const;

/** Official access-token lifetime when expiry is missing. Docs: typically 15 days. */
export const CJ_ACCESS_TOKEN_TTL_MS = 15 * 24 * 60 * 60 * 1000;
export const CJ_TOKEN_REFRESH_SKEW_MS = 60 * 60 * 1000;

/** Local gitignored cache. Never commit. */
export const CJ_TOKEN_CACHE_RELATIVE_PATH = ".local/cj/token-cache.json" as const;

export const CJ_CATALOG_JSON_RELATIVE_PATH = "data/cj-pilot-100.json" as const;

export const TARGET_GROSS_MARGIN = 0.3;
export const TARGET_LANDED_SHARE_OF_RETAIL = 0.5;
export const MIN_HEALTHY_STOCK = 30;
export const MAX_WEIGHT_GRAMS = 800;
export const MAX_PACK_EDGE_MM = 400;
export const MAX_DELIVERY_DAYS = 21;
export const MIN_LISTED_NUM = 1;
export const CATEGORY_QUOTA = 20;
export const PILOT_CATEGORIES = [
  "Home",
  "Pet",
  "Car",
  "Travel",
  "Beauty",
] as const;
export type CjPilotCategory = (typeof PILOT_CATEGORIES)[number];

/**
 * TEST destination only. Dublin Eircode routing key D02.
 * Not a personal address. No street, name, or phone.
 */
export const IRELAND_TEST_DESTINATION = {
  countryCode: "IE",
  countryName: "Ireland",
  locality: "Dublin",
  postcode: "D02",
  label:
    "TEST destination only — Ireland / Dublin Eircode routing key D02. Not a personal address.",
} as const;

export const DEFAULT_ORIGIN_COUNTRY = "CN" as const;
export const CATALOG_CURRENCY = "USD" as const;

export const CJ_PILOT_STORE_ID = "00000000-0000-4000-8000-cjpilot100001" as const;
export const CJ_PILOT_STORE_SLUG = "umtuba-cj-pilot-100-v1" as const;
export const CJ_PILOT_STORE_NAME = "UMTUBA CJ Pilot (SANDBOX)" as const;

export const CATEGORY_SEARCH_KEYWORDS: Record<CjPilotCategory, readonly string[]> = {
  Home: ["silicone kitchen utensil", "LED night light", "desk organizer"],
  Pet: ["pet grooming brush", "cat toy wand", "silicone pet bowl"],
  Car: ["car phone holder", "car seat organizer", "car vent clip"],
  Travel: ["packing cube", "luggage tag", "travel bottle set"],
  Beauty: [
    "makeup brush set",
    "hair claw clip",
    "makeup pouch",
    "makeup sponge",
    "cosmetic mirror",
  ],
};

export const EXCLUSION_PATTERNS: readonly { reason: string; re: RegExp }[] = [
  { reason: "counterfeit_or_branded", re: /\b(nike|adidas|gucci|louis vuitton|\blv\b|rolex|apple|iphone|samsung|sony|disney|nintendo|pokemon|hermes|chanel|prada|dior|supreme|yeezy|air jordan|new balance|puma)\b/i },
  { reason: "regulated_medical_claims", re: /\b(cure|treats?|anti-?cancer|prescription|medical device|blood pressure|glucose|insulin)\b/i },
  { reason: "supplements", re: /\b(supplement|vitamin|capsule|tablet|gummy vitamins?|protein powder|creatine|cbd|thc|melatonin|collagen powder)\b/i },
  { reason: "dangerous_goods", re: /\b(explosive|flammable|pepper spray|taser|firearm|ammunition|gasoline|lighter fluid)\b/i },
  { reason: "batteries_or_restricted", re: /\b(lithium|battery pack|power bank|e-?scooter|hoverboard)\b/i },
  { reason: "adult_products", re: /\b(sex toy|dildo|vibrator|adult only|erotic)\b/i },
  { reason: "complicated_sizing", re: /\b(shoe size|eu size|us size|dress size|pants size)\b/i },
  { reason: "heavy_or_bulky", re: /\b(mattress|sofa|wardrobe|treadmill|refrigerator|washing machine)\b/i },
];

export const RESTRICTED_LOGISTICS_PROPS = new Set([
  "BATTERY",
  "WITH_BATTERY",
  "PURE_BATTERY",
  "LIQUID",
  "POWDER",
  "MAGNET",
  "KNIFE",
  "SHARP",
  "ADULT",
  "DANGEROUS",
  "FLAMMABLE",
]);

export const SIZE_MATRIX_RE =
  /\b(xxs|xs|s|m|l|xl|xxl|xxxl|2xl|3xl|4xl|eu\s?\d{2}|us\s?\d{1,2})\b/i;

export const REQUEST_GAP_MS = 1100;
export const LIST_PAGE_SIZE = 20;
export const MAX_DETAIL_FETCHES = 160;
export const MAX_FREIGHT_FETCHES = 160;
export const MAX_FREIGHT_PER_CATEGORY = 30;
export const MAX_LIST_PAGES = 2;
