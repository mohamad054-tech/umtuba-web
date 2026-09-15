/**
 * UMTUBA-owned DEMO catalog types.
 * Not real partner inventory. Cannot become production-purchasable.
 */

import type { ProductType } from "../types";

export const DEMO_CATEGORY_SLUGS = [
  "electronics",
  "fashion",
  "home",
  "beauty",
  "sports",
  "books",
  "accessories",
  "kids",
  "automotive-accessories",
  "office",
  "digital-other",
] as const;

export type DemoCategorySlug = (typeof DEMO_CATEGORY_SLUGS)[number];

export const DEMO_SOURCE_TYPE = "DEMO" as const;
export const DEMO_RIGHTS_STATUS = "DEMO_ONLY" as const;
export const DEMO_PURCHASABLE = false;
export const DEMO_PRODUCTION_SELLABLE = false;
export const DEMO_REAL_PROVIDER = "NONE" as const;
export const DEMO_IMAGE_POLICY = "UMTUBA_NEUTRAL_PLACEHOLDER" as const;

export const DEMO_INVENTORY_KINDS = ["PHYSICAL", "DIGITAL"] as const;
export type DemoInventoryKind = (typeof DEMO_INVENTORY_KINDS)[number];

export const DEMO_STOCK_STATES = [
  "IN_STOCK",
  "LOW_STOCK",
  "OUT_OF_STOCK",
  "DIGITAL_NOT_APPLICABLE",
] as const;
export type DemoStockState = (typeof DEMO_STOCK_STATES)[number];

export const DEMO_PRICE_BANDS = ["under-15", "15-30", "30-50", "over-50"] as const;
export type DemoPriceBand = (typeof DEMO_PRICE_BANDS)[number];

export type DemoSpecification = {
  name: string;
  value: string;
};

export type DemoShippingInfo = {
  mode: "DEMO";
  applicable: boolean;
  methodLabel: string;
  etaLabel: string;
  amountMinor: number | null;
  note: string;
};

export type DemoReturnsInfo = {
  mode: "DEMO";
  applicable: boolean;
  windowDays: number | null;
  label: string;
  note: string;
};

export type DemoFilterAttributes = {
  color: string[];
  size: string[];
  material: string[];
  audience: string[];
  fulfillment: "physical" | "digital";
  priceBand: DemoPriceBand;
};

export type DemoTaxonomy = {
  department: string;
  category: string;
  subcategory: string;
  path: readonly [string, string, string];
};

export type DemoVariant = {
  id: string;
  sku: string;
  title: string;
  optionValues: Record<string, string>;
  priceMinor: number;
  currency: "USD";
  onHand: number | null;
  inventoryKind: DemoInventoryKind;
  stockState: DemoStockState;
};

export type DemoProduct = {
  id: string;
  slug: string;
  sku: string;
  title: string;
  shortDescription: string;
  description: string;
  category: DemoCategorySlug;
  taxonomy: DemoTaxonomy;
  productType: ProductType;
  sourceType: typeof DEMO_SOURCE_TYPE;
  rightsStatus: typeof DEMO_RIGHTS_STATUS;
  purchasable: typeof DEMO_PURCHASABLE;
  productionSellable: typeof DEMO_PRODUCTION_SELLABLE;
  realProvider: typeof DEMO_REAL_PROVIDER;
  conceptKind: "UMTUBA_OWNED_FUTURE" | "SYNTHETIC_DEMO";
  tags: string[];
  searchKeywords: string[];
  filterAttributes: DemoFilterAttributes;
  specifications: DemoSpecification[];
  shipping: DemoShippingInfo;
  returns: DemoReturnsInfo;
  relatedProductSlugs: string[];
  variants: DemoVariant[];
  imageAlt: string;
  imageRole: "cover";
  imagePolicy: typeof DEMO_IMAGE_POLICY;
};

export type DemoCatalogUiState = "ready" | "empty" | "loading" | "error";

export type DemoPdp = {
  product: DemoProduct;
  purchasable: false;
  checkoutAllowed: false;
  label: "UMTUBA Demo Catalog — not real partner inventory";
};

export type DemoCartLine = {
  productId: string;
  variantId: string;
  quantity: number;
};

export type DemoCheckoutSandbox = {
  allowed: false;
  reason: "DEMO products cannot become production-purchasable.";
  liveCheckoutInvented: false;
};
