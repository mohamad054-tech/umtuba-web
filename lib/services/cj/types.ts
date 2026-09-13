import type { IRELAND_TEST_DESTINATION } from "./constants";
import {
  CJ_PILOT_BATCH,
  CJ_PILOT_TASK_ID,
  CJ_PROVIDER,
  type CjPilotCategory,
} from "./constants";
import type { PublicCatalogItem, StoreProductRow, StoreRow } from "../../store/types";

export type CjApiEnvelope<T> = {
  code?: number;
  result?: boolean;
  success?: boolean;
  message?: string;
  data?: T;
  requestId?: string;
};

export type CjAccessTokenPayload = {
  openId?: number;
  accessToken: string;
  accessTokenExpiryDate?: string;
  refreshToken?: string;
  refreshTokenExpiryDate?: string;
  createDate?: string;
};

export type CjCachedToken = {
  accessToken: string;
  accessTokenExpiryMs: number;
  refreshToken?: string;
  refreshTokenExpiryMs?: number;
  cachedAt: string;
};

export type CjListProduct = {
  id?: string;
  nameEn?: string;
  sku?: string;
  spu?: string;
  bigImage?: string;
  sellPrice?: string | number;
  nowPrice?: string | number;
  discountPrice?: string | number;
  listedNum?: number;
  categoryId?: string;
  threeCategoryName?: string;
  twoCategoryId?: string;
  twoCategoryName?: string;
  oneCategoryId?: string;
  oneCategoryName?: string;
  warehouseInventoryNum?: number;
  totalVerifiedInventory?: number;
  deliveryCycle?: string;
  description?: string;
  variantKeyEn?: string;
  propertyKey?: string;
};

export type CjListV2Data = {
  pageSize?: number;
  pageNumber?: number;
  totalRecords?: number;
  totalPages?: number;
  content?: Array<{
    productList?: CjListProduct[];
    keyWord?: string;
  }>;
};

export type CjVariantInventory = {
  countryCode?: string;
  totalInventory?: number;
  cjInventory?: number;
  factoryInventory?: number;
  stock?: Array<{
    inventory?: number;
    factoryInventory?: number;
  }>;
};

export type CjVariant = {
  vid?: string;
  pid?: string;
  variantNameEn?: string;
  variantSku?: string;
  variantImage?: string;
  variantKey?: string;
  variantLength?: number;
  variantWidth?: number;
  variantHeight?: number;
  variantWeight?: number;
  variantSellPrice?: number;
  inventoryNum?: number | string;
  inventories?: CjVariantInventory[];
};

export type CjProductDetail = {
  pid?: string;
  productNameEn?: string;
  productSku?: string;
  bigImage?: string;
  productImageSet?: string[];
  productWeight?: string | number;
  packingWeight?: string | number;
  categoryId?: string;
  categoryName?: string;
  sellPrice?: string | number;
  description?: string;
  productProEnSet?: string[];
  productKeyEn?: string;
  variants?: CjVariant[];
  supplierName?: string;
  supplierId?: string;
};

export type CjFreightOption = {
  logisticAging?: string;
  logisticPrice?: number;
  logisticName?: string;
  taxesFee?: number;
  clearanceOperationFee?: number;
  totalPostageFee?: number;
};

export type CjCategoryNode = {
  categoryFirstName?: string;
  categoryFirstList?: Array<{
    categorySecondName?: string;
    categorySecondList?: Array<{
      categoryId?: string;
      categoryName?: string;
    }>;
  }>;
};

export type CjPilotDecision = "accepted" | "rejected";

export type CjPilotRecord = {
  cj_product_id: string;
  cj_variant_id: string | null;
  sku: string | null;
  title: string;
  category: CjPilotCategory;
  image_urls: string[];
  supplier_price_minor: number | null;
  estimated_shipping_minor: number | null;
  estimated_fees_minor: number;
  estimated_landed_cost_minor: number | null;
  proposed_retail_price_minor: number | null;
  projected_gross_profit_minor: number | null;
  projected_gross_margin: number | null;
  currency: "USD";
  stock: number | null;
  processing_time: string | null;
  estimated_delivery_time: string | null;
  source_warehouse_country: string | null;
  product_url: string | null;
  decision: CjPilotDecision;
  reason: string;
  flags: string[];
  provider: typeof CJ_PROVIDER;
  pilot_batch: typeof CJ_PILOT_BATCH;
};

export type CjPilotSummary = {
  candidates_fetched: number;
  products_accepted: number;
  products_rejected: number;
  average_landed_cost_minor: number | null;
  average_retail_price_minor: number | null;
  average_gross_margin: number | null;
  top_10_best_margin_accepted: Array<{
    title: string;
    category: CjPilotCategory;
    projected_gross_margin: number;
    proposed_retail_price_minor: number;
    estimated_landed_cost_minor: number;
  }>;
  worst_rejection_reasons: Array<{ reason: string; count: number }>;
};

export type CjPilotCatalogFile = {
  task_id: typeof CJ_PILOT_TASK_ID;
  generated_at: string;
  cj_api_connected: boolean;
  dry_run: boolean;
  provider: typeof CJ_PROVIDER;
  pilot_batch: typeof CJ_PILOT_BATCH;
  ireland_test_destination: typeof IRELAND_TEST_DESTINATION;
  endpoints_used: string[];
  pricing_rule: {
    target_gross_margin: number;
    landed_cost_formula: string;
    gross_profit_formula: string;
    gross_margin_formula: string;
    rounding: string;
    market_competitiveness: string;
  };
  summary: CjPilotSummary;
  products: CjPilotRecord[];
};

export type CjPilotStoreCatalogItem = PublicCatalogItem & {
  provider: typeof CJ_PROVIDER;
  pilot_batch: typeof CJ_PILOT_BATCH;
  cjProductId: string;
  cjVariantId: string | null;
  landedCostMinor: number | null;
  grossMargin: number | null;
  estimatedDeliveryTime: string | null;
  acceptanceReason: string;
};

export type CjPilotStoreProduct = Pick<
  StoreProductRow,
  | "id"
  | "store_id"
  | "slug"
  | "title"
  | "short_description"
  | "description"
  | "product_type"
  | "status"
  | "moderation_status"
  | "primary_category_id"
  | "brand_id"
  | "created_by"
  | "created_at"
  | "updated_at"
  | "published_at"
  | "weight_grams"
  | "origin_country_code"
  | "marketplace_eligible"
>;

export type CjPilotStoreIdentity = Pick<
  StoreRow,
  "id" | "slug" | "name" | "logo_path" | "status"
>;

export type TokenCacheStore = {
  read(): CjCachedToken | null;
  write(token: CjCachedToken): void;
};

export type CjHttpFetcher = (
  url: string,
  init: {
    method: "GET" | "POST";
    headers: Record<string, string>;
    body?: string;
  }
) => Promise<{ status: number; json: unknown }>;
