/**
 * Store rights gate — unknown rights DENY. Rechecked at publish / checkout.
 */

import { FORBIDDEN_THIRD_PARTY_BRAND_TOKENS } from "../../partners/types";
import type {
  StoreNormalizedCatalogItem,
  StoreProvider,
  StoreProviderRight,
  StoreRightsRecord,
} from "./types";
import { STORE_PROVIDER_RIGHTS } from "./types";

export function isStoreProviderRight(value: unknown): value is StoreProviderRight {
  return (
    typeof value === "string" &&
    (STORE_PROVIDER_RIGHTS as readonly string[]).includes(value)
  );
}

export function emptyStoreRights(id: string, providerId: string, updatedAt: string): StoreRightsRecord {
  return { id, providerId, grants: {}, updatedAt };
}

export function isStoreRightGranted(
  rights: StoreRightsRecord,
  right: StoreProviderRight
): boolean {
  return rights.grants[right] === true;
}

export function denyUnknownStoreRights(rights: StoreRightsRecord): StoreRightsRecord {
  const grants: StoreRightsRecord["grants"] = {};
  for (const right of STORE_PROVIDER_RIGHTS) {
    grants[right] = rights.grants[right] === true;
  }
  return { ...rights, grants };
}

export type StoreRightsDecision =
  | { allowed: true }
  | { allowed: false; right: StoreProviderRight | "MOCK_ISOLATION" | "PROVIDER_DISABLED"; reason: string };

export function evaluateStoreRight(
  provider: StoreProvider,
  right: StoreProviderRight
): StoreRightsDecision {
  if (provider.status === "DISABLED" || provider.status === "REMOVED") {
    return {
      allowed: false,
      right: "PROVIDER_DISABLED",
      reason: "Provider is disabled or removed.",
    };
  }
  if (!isStoreRightGranted(provider.rights, right)) {
    return {
      allowed: false,
      right,
      reason: `${right} is not granted (unknown defaults to DENY).`,
    };
  }
  return { allowed: true };
}

export function containsForbiddenBrandToken(value: string | null | undefined): boolean {
  if (!value) return false;
  const hay = value.toLowerCase();
  return FORBIDDEN_THIRD_PARTY_BRAND_TOKENS.some((token) => hay.includes(token));
}

export function evaluateStoreQaCatalogGate(input: {
  provider: StoreProvider;
  item: StoreNormalizedCatalogItem;
}): StoreRightsDecision {
  const catalog = evaluateStoreRight(input.provider, "CATALOG_DISPLAY_ALLOWED");
  if (!catalog.allowed) return catalog;
  if (input.item.stale) {
    return {
      allowed: false,
      right: "PRICE_SYNC_ALLOWED",
      reason: "Stale provider data cannot be published.",
    };
  }
  return { allowed: true };
}

export function evaluateStorePublishGate(input: {
  provider: StoreProvider;
  item: StoreNormalizedCatalogItem;
}): StoreRightsDecision {
  const qa = evaluateStoreQaCatalogGate(input);
  if (!qa.allowed) return qa;
  if (input.item.dataClass === "MOCK_DATA") {
    return {
      allowed: false,
      right: "MOCK_ISOLATION",
      reason: "MOCK_DATA cannot publish into the production-purchasable catalog.",
    };
  }
  return {
    allowed: false,
    right: "MOCK_ISOLATION",
    reason: "REAL_PARTNER_DATA publish is disabled in this pre-company foundation.",
  };
}

export function evaluateStoreImagePublishGate(input: {
  provider: StoreProvider;
  item: StoreNormalizedCatalogItem;
}): StoreRightsDecision {
  const image = evaluateStoreRight(input.provider, "IMAGE_USAGE_ALLOWED");
  if (!image.allowed) return image;
  if (input.item.images.some((img) => containsForbiddenBrandToken(img.url) || containsForbiddenBrandToken(img.alt))) {
    return {
      allowed: false,
      right: "IMAGE_USAGE_ALLOWED",
      reason: "Image metadata contains a forbidden third-party brand token.",
    };
  }
  return { allowed: true };
}

export function evaluateStoreCheckoutGate(input: {
  provider: StoreProvider;
  item: StoreNormalizedCatalogItem;
}): StoreRightsDecision {
  if (input.item.dataClass === "MOCK_DATA") {
    return {
      allowed: false,
      right: "MOCK_ISOLATION",
      reason: "MOCK_DATA cannot become production-purchasable.",
    };
  }
  return evaluateStoreRight(input.provider, "CHECKOUT_ALLOWED");
}

export function revokeStoreRight(
  rights: StoreRightsRecord,
  right: StoreProviderRight,
  at: string
): StoreRightsRecord {
  return {
    ...rights,
    grants: { ...rights.grants, [right]: false },
    updatedAt: at,
  };
}

export function grantStoreRight(
  rights: StoreRightsRecord,
  right: StoreProviderRight,
  at: string
): StoreRightsRecord {
  return {
    ...rights,
    grants: { ...rights.grants, [right]: true },
    updatedAt: at,
  };
}

export function requiredStoreRightsGranted(provider: StoreProvider): boolean {
  return isStoreRightGranted(provider.rights, "CATALOG_DISPLAY_ALLOWED");
}
