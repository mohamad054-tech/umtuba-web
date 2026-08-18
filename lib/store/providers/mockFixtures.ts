/**
 * Synthetic Store providers/products. No SHEIN/Temu/etc. No real partner data.
 */

import { emptyStoreRights, grantStoreRight } from "./rights";
import type { StoreProvider, StoreRawCatalogRecord } from "./types";

const AT = "2026-08-18T08:00:00.000Z";

export const MOCK_STORE_PROVIDER_IDS = {
  affiliate: "11111111-1111-4111-8111-111111111111",
  wholesale: "22222222-2222-4222-8222-222222222222",
  denyCatalog: "33333333-3333-4333-8333-333333333333",
} as const;

export function mockAffiliateProvider(): StoreProvider {
  let rights = emptyStoreRights(
    "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    MOCK_STORE_PROVIDER_IDS.affiliate,
    AT
  );
  rights = grantStoreRight(rights, "CATALOG_DISPLAY_ALLOWED", AT);
  rights = grantStoreRight(rights, "IMAGE_USAGE_ALLOWED", AT);
  return {
    id: MOCK_STORE_PROVIDER_IDS.affiliate,
    slug: "umtuba-mock-affiliate",
    displayName: "UMTUBA Mock Affiliate Provider",
    mode: "AFFILIATE",
    status: "ENABLED",
    dataClass: "MOCK_DATA",
    sourceType: "MOCK_PROVIDER",
    rights,
    ownership: {
      PAYMENT_OWNER: "PROVIDER",
      FULFILLMENT_OWNER: "PROVIDER",
      RETURNS_OWNER: "PROVIDER",
      CUSTOMER_SUPPORT_OWNER: "UMTUBA",
    },
    maxStaleMs: 7 * 24 * 60 * 60 * 1000,
    createdAt: AT,
    updatedAt: AT,
    disabledAt: null,
    removedAt: null,
  };
}

export function mockWholesaleProvider(): StoreProvider {
  let rights = emptyStoreRights(
    "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
    MOCK_STORE_PROVIDER_IDS.wholesale,
    AT
  );
  rights = grantStoreRight(rights, "CATALOG_DISPLAY_ALLOWED", AT);
  rights = grantStoreRight(rights, "PRICE_SYNC_ALLOWED", AT);
  rights = grantStoreRight(rights, "INVENTORY_SYNC_ALLOWED", AT);
  return {
    id: MOCK_STORE_PROVIDER_IDS.wholesale,
    slug: "umtuba-mock-wholesale",
    displayName: "UMTUBA Mock Wholesale Provider",
    mode: "WHOLESALE",
    status: "ENABLED",
    dataClass: "MOCK_DATA",
    sourceType: "MOCK_PROVIDER",
    rights,
    ownership: {
      PAYMENT_OWNER: "UMTUBA",
      FULFILLMENT_OWNER: "PROVIDER",
      RETURNS_OWNER: "PROVIDER",
      CUSTOMER_SUPPORT_OWNER: "UMTUBA",
    },
    maxStaleMs: 24 * 60 * 60 * 1000,
    createdAt: AT,
    updatedAt: AT,
    disabledAt: null,
    removedAt: null,
  };
}

export function mockDenyCatalogProvider(): StoreProvider {
  return {
    id: MOCK_STORE_PROVIDER_IDS.denyCatalog,
    slug: "umtuba-mock-deny-catalog",
    displayName: "UMTUBA Mock Deny Catalog Provider",
    mode: "CATALOG_API",
    status: "ENABLED",
    dataClass: "MOCK_DATA",
    sourceType: "MOCK_PROVIDER",
    rights: emptyStoreRights(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3",
      MOCK_STORE_PROVIDER_IDS.denyCatalog,
      AT
    ),
    ownership: {
      PAYMENT_OWNER: "UNKNOWN",
      FULFILLMENT_OWNER: "UNKNOWN",
      RETURNS_OWNER: "UNKNOWN",
      CUSTOMER_SUPPORT_OWNER: "UNKNOWN",
    },
    maxStaleMs: 24 * 60 * 60 * 1000,
    createdAt: AT,
    updatedAt: AT,
    disabledAt: null,
    removedAt: null,
  };
}

export const MOCK_STORE_CATALOG: StoreRawCatalogRecord[] = [
  {
    externalId: "mock-tote-01",
    title: "UMTUBA Mock Canvas Tote",
    description: "Synthetic tote for catalog-import QA. Not a real partner SKU.",
    sku: "MOCK-TOTE-01",
    productType: "physical",
    category: "bags",
    priceMinor: 2499,
    currency: "usd",
    onHand: 12,
    images: [{ url: "/mock/store/tote.png", alt: "UMTUBA mock canvas tote", role: "cover" }],
    variants: [
      {
        externalId: "mock-tote-01-navy",
        sku: "MOCK-TOTE-01-NAVY",
        title: "Navy",
        optionValues: { color: "navy" },
        priceMinor: 2499,
        currency: "USD",
        onHand: 8,
      },
      {
        externalId: "mock-tote-01-sand",
        sku: "MOCK-TOTE-01-SAND",
        title: "Sand",
        optionValues: { color: "sand" },
        priceMinor: 2499,
        currency: "USD",
        onHand: 4,
      },
    ],
  },
  {
    externalId: "mock-lamp-01",
    title: "UMTUBA Mock Desk Lamp",
    description: "Synthetic lamp for price/inventory normalization QA.",
    sku: "MOCK-LAMP-01",
    productType: "physical",
    category: "lighting",
    priceMinor: 5999,
    currency: "USD",
    onHand: 3,
    images: [{ url: "/mock/store/lamp.png", alt: "UMTUBA mock desk lamp" }],
  },
];

export const FORBIDDEN_BRAND_RECORD: StoreRawCatalogRecord = {
  externalId: "forbidden-shein",
  title: "SHEIN lookalike dress",
  sku: "SHEIN-X",
  priceMinor: 1000,
  currency: "USD",
};
