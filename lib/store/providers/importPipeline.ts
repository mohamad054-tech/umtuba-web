/**
 * Generic catalog import — validate, normalize, map SKUs/variants, stale-protect.
 * MOCK providers/products only. Does not write unauthorized third-party catalogs.
 */

import { PRODUCT_TYPES, type ProductType } from "../types";
import { normalizeCurrencyCode, validateAmountMinor } from "../money";
import { containsForbiddenBrandToken } from "./rights";
import { assertStoreItemIsolation, buildStoreProvenance, isStaleSync } from "./provenance";
import type {
  StoreImportIssue,
  StoreImportRun,
  StoreNormalizedCatalogItem,
  StoreNormalizedImage,
  StoreNormalizedVariant,
  StoreProvider,
  StoreRawCatalogRecord,
  StoreSkuMapping,
} from "./types";

const SLUGISH = /[^a-z0-9]+/g;

function asProductType(value: unknown): ProductType {
  if (typeof value === "string" && (PRODUCT_TYPES as readonly string[]).includes(value)) {
    return value as ProductType;
  }
  return "physical";
}

function normalizeSku(providerId: string, raw: string | undefined, fallback: string): string {
  const base = (raw ?? fallback).trim().toLowerCase().replace(SLUGISH, "-").replace(/^-|-$/g, "");
  return `${providerId.slice(0, 8)}-${base || "sku"}`.slice(0, 64);
}

function rejectForbidden(record: StoreRawCatalogRecord): StoreImportIssue | null {
  const fields = [
    record.title,
    record.description,
    record.brand,
    record.sku,
    record.category,
    ...(record.images ?? []).flatMap((img) => [img.url, img.alt]),
  ];
  for (const field of fields) {
    if (containsForbiddenBrandToken(field)) {
      return {
        externalId: record.externalId || "unknown",
        code: "FORBIDDEN_THIRD_PARTY_BRAND",
        message: "Unauthorized third-party brand or marketplace token is denied.",
      };
    }
  }
  return null;
}

function normalizeImages(
  provider: StoreProvider,
  images: StoreRawCatalogRecord["images"]
): StoreNormalizedImage[] {
  const imageAllowed = provider.rights.grants.IMAGE_USAGE_ALLOWED === true;
  return (images ?? [])
    .filter((img) => (img.url ?? "").trim().length > 0)
    .map((img) => ({
      url: (img.url ?? "").trim(),
      alt: (img.alt ?? "").trim(),
      role: (img.role ?? "gallery").trim() || "gallery",
      publishable: imageAllowed && !containsForbiddenBrandToken(img.url) && !containsForbiddenBrandToken(img.alt),
    }));
}

function normalizeVariants(
  provider: StoreProvider,
  record: StoreRawCatalogRecord,
  fallbackPrice: number,
  fallbackCurrency: string,
  fallbackOnHand: number
): { variants: StoreNormalizedVariant[]; mappings: StoreSkuMapping[] } {
  const raw = record.variants?.length
    ? record.variants
    : [
        {
          externalId: `${record.externalId}:default`,
          sku: record.sku,
          title: "Default",
          priceMinor: record.priceMinor,
          currency: record.currency,
          onHand: record.onHand,
        },
      ];
  const variants: StoreNormalizedVariant[] = [];
  const mappings: StoreSkuMapping[] = [];
  for (const variant of raw) {
    const currency = normalizeCurrencyCode(variant.currency ?? fallbackCurrency);
    const priceCheck = validateAmountMinor(variant.priceMinor ?? fallbackPrice, currency);
    const priceMinor = priceCheck.ok ? priceCheck.amountMinor : fallbackPrice;
    const sku = normalizeSku(provider.id, variant.sku ?? record.sku, variant.externalId);
    variants.push({
      externalId: variant.externalId,
      sku,
      title: (variant.title ?? "Default").trim() || "Default",
      optionValues: variant.optionValues ?? {},
      priceMinor,
      currency,
      onHand: Math.max(0, Math.trunc(variant.onHand ?? fallbackOnHand)),
    });
    mappings.push({
      providerId: provider.id,
      externalSku: (variant.sku ?? record.sku ?? variant.externalId).trim(),
      internalSku: sku,
      externalVariantId: variant.externalId,
      boundVariantId: null,
    });
  }
  return { variants, mappings };
}

export function importStoreCatalog(input: {
  runId: string;
  provider: StoreProvider;
  records: readonly StoreRawCatalogRecord[];
  at: string;
  nowMs?: number;
  syncVersion?: number;
}): StoreImportRun {
  const accepted: StoreNormalizedCatalogItem[] = [];
  const rejected: StoreImportIssue[] = [];
  const mappings: StoreSkuMapping[] = [];
  const seenExternal = new Set<string>();
  const nowMs = input.nowMs ?? Date.parse(input.at);
  const syncVersion = input.syncVersion ?? 1;

  for (const record of input.records) {
    const externalId = (record.externalId ?? "").trim();
    if (!externalId) {
      rejected.push({ externalId: "unknown", code: "MISSING_EXTERNAL_ID", message: "external_id is required." });
      continue;
    }
    if (seenExternal.has(externalId)) {
      rejected.push({ externalId, code: "DUPLICATE_EXTERNAL_ID", message: "Duplicate external_id in this import." });
      continue;
    }
    seenExternal.add(externalId);

    const forbidden = rejectForbidden(record);
    if (forbidden) {
      rejected.push(forbidden);
      continue;
    }

    const title = (record.title ?? "").trim();
    if (title.length < 2 || title.length > 200) {
      rejected.push({ externalId, code: "INVALID_TITLE", message: "title must be 2–200 characters." });
      continue;
    }

    const currency = normalizeCurrencyCode(record.currency ?? "USD");
    const priceCheck = validateAmountMinor(record.priceMinor ?? 0, currency);
    if (!priceCheck.ok) {
      rejected.push({ externalId, code: "INVALID_PRICE", message: priceCheck.message });
      continue;
    }

    const { variants, mappings: variantMappings } = normalizeVariants(
      input.provider,
      record,
      priceCheck.amountMinor,
      currency,
      Math.max(0, Math.trunc(record.onHand ?? 0))
    );

    const provenance = buildStoreProvenance({
      provider: input.provider,
      externalId,
      syncVersion,
      importedAt: input.at,
      lastSyncedAt: input.at,
    });
    const item: StoreNormalizedCatalogItem = {
      providerId: input.provider.id,
      externalId,
      sourceType: input.provider.sourceType,
      rightsRecordId: input.provider.rights.id,
      provenance,
      dataClass: input.provider.dataClass,
      syncVersion,
      title,
      description: (record.description ?? "").trim() || null,
      sku: normalizeSku(input.provider.id, record.sku, externalId),
      productType: asProductType(record.productType),
      category: (record.category ?? "").trim() || null,
      language: (record.language ?? "en").trim() || "en",
      variants,
      images: normalizeImages(input.provider, record.images),
      priceMinor: priceCheck.amountMinor,
      currency,
      onHand: Math.max(0, Math.trunc(record.onHand ?? 0)),
      stale: isStaleSync(input.at, input.provider.maxStaleMs, nowMs),
      lastSyncedAt: input.at,
      boundStoreProductId: null,
    };

    const isolation = assertStoreItemIsolation(item, input.provider);
    if (!isolation.ok) {
      rejected.push({ externalId, code: "PROVENANCE_ISOLATION", message: isolation.message });
      continue;
    }

    accepted.push(item);
    mappings.push(...variantMappings);
  }

  return {
    id: input.runId,
    providerId: input.provider.id,
    startedAt: input.at,
    finishedAt: input.at,
    accepted,
    rejected,
    mappings,
  };
}

export function unpublishProviderItems(
  items: readonly StoreNormalizedCatalogItem[]
): StoreNormalizedCatalogItem[] {
  return items.map((item) => ({ ...item, boundStoreProductId: null }));
}
