/**
 * Store provider foundation V2 — provider-neutral commerce infrastructure.
 * Extends the existing Store catalog; does not replace it.
 */

import type { DataClass, SourceType } from "../../partners/types";
import type { ProductType } from "../types";

export const STORE_PROVIDER_MODES = [
  "AFFILIATE",
  "CATALOG_API",
  "DROPSHIP",
  "WHOLESALE",
  "RESELLER",
  "MARKETPLACE",
] as const;
export type StoreProviderMode = (typeof STORE_PROVIDER_MODES)[number];

export const STORE_PROVIDER_RIGHTS = [
  "CATALOG_DISPLAY_ALLOWED",
  "IMAGE_USAGE_ALLOWED",
  "PRICE_SYNC_ALLOWED",
  "INVENTORY_SYNC_ALLOWED",
  "CHECKOUT_ALLOWED",
  "RESELL_ALLOWED",
] as const;
export type StoreProviderRight = (typeof STORE_PROVIDER_RIGHTS)[number];

export const STORE_OPERATIONAL_OWNERS = [
  "PAYMENT_OWNER",
  "FULFILLMENT_OWNER",
  "RETURNS_OWNER",
  "CUSTOMER_SUPPORT_OWNER",
] as const;
export type StoreOperationalOwnerKey = (typeof STORE_OPERATIONAL_OWNERS)[number];

export const STORE_OWNERSHIP_PARTIES = [
  "UMTUBA",
  "PROVIDER",
  "SELLER",
  "UNKNOWN",
] as const;
export type StoreOwnershipParty = (typeof STORE_OWNERSHIP_PARTIES)[number];

export const STORE_PROVIDER_STATUSES = [
  "DRAFT",
  "ENABLED",
  "DISABLED",
  "REMOVED",
] as const;
export type StoreProviderStatus = (typeof STORE_PROVIDER_STATUSES)[number];

export type StoreRightsRecord = {
  id: string;
  providerId: string;
  grants: Partial<Record<StoreProviderRight, boolean>>;
  updatedAt: string;
};

export type StoreCapabilityMatrix = {
  modes: StoreProviderMode[];
  rights: StoreRightsRecord;
  ownership: Record<StoreOperationalOwnerKey, StoreOwnershipParty>;
};

export type StoreProviderAdapter = {
  mode: StoreProviderMode;
  listCapabilities(): StoreCapabilityMatrix;
  fetchCatalog(cursor?: string | null): Promise<StoreRawCatalogRecord[]>;
};

export type StoreProvider = {
  id: string;
  slug: string;
  displayName: string;
  mode: StoreProviderMode;
  status: StoreProviderStatus;
  dataClass: DataClass;
  sourceType: SourceType;
  rights: StoreRightsRecord;
  ownership: Record<StoreOperationalOwnerKey, StoreOwnershipParty>;
  maxStaleMs: number;
  createdAt: string;
  updatedAt: string;
  disabledAt: string | null;
  removedAt: string | null;
};

export type StoreProvenance = {
  providerId: string;
  externalId: string;
  sourceType: SourceType;
  rightsRecordId: string;
  dataClass: DataClass;
  syncVersion: number;
  importedAt: string;
  lastSyncedAt: string;
};

export type StoreRawVariant = {
  externalId: string;
  sku?: string;
  title?: string;
  optionValues?: Record<string, string>;
  priceMinor?: number;
  currency?: string;
  onHand?: number;
};

export type StoreRawImage = {
  url?: string;
  alt?: string;
  role?: string;
};

export type StoreRawCatalogRecord = {
  externalId: string;
  title?: string;
  description?: string;
  sku?: string;
  productType?: ProductType | string;
  category?: string;
  brand?: string;
  variants?: StoreRawVariant[];
  images?: StoreRawImage[];
  priceMinor?: number;
  currency?: string;
  onHand?: number;
  language?: string;
};

export type StoreNormalizedVariant = {
  externalId: string;
  sku: string;
  title: string;
  optionValues: Record<string, string>;
  priceMinor: number;
  currency: string;
  onHand: number;
};

export type StoreNormalizedImage = {
  url: string;
  alt: string;
  role: string;
  publishable: boolean;
};

export type StoreNormalizedCatalogItem = {
  providerId: string;
  externalId: string;
  sourceType: SourceType;
  rightsRecordId: string;
  provenance: StoreProvenance;
  dataClass: DataClass;
  syncVersion: number;
  title: string;
  description: string | null;
  sku: string;
  productType: ProductType;
  category: string | null;
  language: string;
  variants: StoreNormalizedVariant[];
  images: StoreNormalizedImage[];
  priceMinor: number;
  currency: string;
  onHand: number;
  stale: boolean;
  lastSyncedAt: string;
  /** Optional bind into the existing store_products catalog. */
  boundStoreProductId: string | null;
};

export type StoreSkuMapping = {
  providerId: string;
  externalSku: string;
  internalSku: string;
  externalVariantId: string;
  boundVariantId: string | null;
};

export type StoreImportIssue = {
  externalId: string;
  code: string;
  message: string;
};

export type StoreImportRun = {
  id: string;
  providerId: string;
  startedAt: string;
  finishedAt: string;
  accepted: StoreNormalizedCatalogItem[];
  rejected: StoreImportIssue[];
  mappings: StoreSkuMapping[];
};

export type StoreCheckoutRoute =
  | { mode: "AFFILIATE"; action: "REDIRECT_EXTERNAL"; allowed: boolean; reason: string }
  | { mode: "CATALOG_API"; action: "SYNC_THEN_CHECKOUT"; allowed: boolean; reason: string }
  | { mode: "DROPSHIP"; action: "UMTUBA_CHECKOUT_PROVIDER_FULFILL"; allowed: boolean; reason: string }
  | { mode: "WHOLESALE"; action: "B2B_QUOTE"; allowed: boolean; reason: string }
  | { mode: "RESELLER"; action: "UMTUBA_CHECKOUT_RESELL"; allowed: boolean; reason: string }
  | { mode: "MARKETPLACE"; action: "SELLER_LISTING_CHECKOUT"; allowed: boolean; reason: string };

export const STORE_RIGHTS_REQUIRED_TO_PUBLISH: StoreProviderRight[] = [
  "CATALOG_DISPLAY_ALLOWED",
];

export const ALL_UNKNOWN_STORE_RIGHTS_DEFAULT = false;
