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

export type DemoVariant = {
  id: string;
  sku: string;
  title: string;
  optionValues: Record<string, string>;
  priceMinor: number;
  currency: "USD";
  onHand: number;
};

export type DemoProduct = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  category: DemoCategorySlug;
  productType: ProductType;
  sourceType: typeof DEMO_SOURCE_TYPE;
  rightsStatus: typeof DEMO_RIGHTS_STATUS;
  purchasable: typeof DEMO_PURCHASABLE;
  productionSellable: typeof DEMO_PRODUCTION_SELLABLE;
  realProvider: typeof DEMO_REAL_PROVIDER;
  conceptKind: "UMTUBA_OWNED_FUTURE" | "SYNTHETIC_DEMO";
  tags: string[];
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
