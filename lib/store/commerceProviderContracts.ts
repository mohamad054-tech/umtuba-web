/**
 * Pre-company commerce provider contracts.
 *
 * Provider-neutral kinds, DENY-by-default rights, and a mock adapter only.
 * Does not import partner catalogs, call live APIs, or name retailers.
 * First-party Store (`owned` / `supplier_listing`) stays in catalogQueries —
 * this module is the future partner-integration surface, not a rewrite.
 */

export const COMMERCE_PROVIDER_KINDS = [
  "AFFILIATE",
  "CATALOG_API",
  "DROPSHIP",
  "WHOLESALE",
  "RESELLER",
  "MARKETPLACE",
] as const;
export type CommerceProviderKind = (typeof COMMERCE_PROVIDER_KINDS)[number];

export const COMMERCE_RIGHTS_FLAGS = [
  "CATALOG_DISPLAY_ALLOWED",
  "IMAGE_USAGE_ALLOWED",
  "PRICE_SYNC_ALLOWED",
] as const;
export type CommerceRightsFlag = (typeof COMMERCE_RIGHTS_FLAGS)[number];

export const COMMERCE_CHECKOUT_MODES = [
  "DISABLED",
  "UMTUBA_CHECKOUT",
  "PROVIDER_REDIRECT",
  "AFFILIATE_HANDOFF",
] as const;
export type CommerceCheckoutMode = (typeof COMMERCE_CHECKOUT_MODES)[number];

export const COMMERCE_FULFILLMENT_OWNERS = [
  "UNKNOWN",
  "UMTUBA",
  "PROVIDER",
  "SELLER",
] as const;
export type CommerceFulfillmentOwner =
  (typeof COMMERCE_FULFILLMENT_OWNERS)[number];

export const COMMERCE_RETURNS_OWNERS = [
  "UNKNOWN",
  "UMTUBA",
  "PROVIDER",
  "SELLER",
] as const;
export type CommerceReturnsOwner = (typeof COMMERCE_RETURNS_OWNERS)[number];

export type CommerceProviderRights = Record<CommerceRightsFlag, boolean>;

export type CommerceProviderDescriptor = {
  providerId: string;
  displayName: string;
  kind: CommerceProviderKind;
  rights: CommerceProviderRights;
  checkoutMode: CommerceCheckoutMode;
  fulfillmentOwner: CommerceFulfillmentOwner;
  returnsOwner: CommerceReturnsOwner;
  liveIntegrationEnabled: boolean;
};

export type CommerceOfferPreview = {
  offerId: string;
  title: string;
  purchasable: false;
  imageUrl: string | null;
  priceMinor: number | null;
  currency: string | null;
};

export type CommerceProviderListResult =
  | { ok: true; offers: readonly CommerceOfferPreview[] }
  | { ok: false; reason: "RIGHTS_DENIED" | "LIVE_DISABLED"; message: string };

export type CommerceProviderAdapter = {
  descriptor: CommerceProviderDescriptor;
  listOffers(): CommerceProviderListResult;
};

export const COMMERCE_LEGAL_COMPANY_STATUS = "PENDING" as const;

export const COMMERCE_RIGHTS_DENIED_MESSAGE =
  "This commerce right is denied until an explicit grant exists.";

export const COMMERCE_LIVE_DISABLED_MESSAGE =
  "Live commerce providers stay disabled until a legal company and partner permission exist.";

export function createDeniedCommerceRights(): CommerceProviderRights {
  return {
    CATALOG_DISPLAY_ALLOWED: false,
    IMAGE_USAGE_ALLOWED: false,
    PRICE_SYNC_ALLOWED: false,
  };
}

/**
 * Missing / unknown flags stay false. Only explicit `true` grants a right.
 */
export function normalizeCommerceRights(
  grants: Partial<CommerceProviderRights> | null | undefined
): CommerceProviderRights {
  const denied = createDeniedCommerceRights();
  if (!grants) return denied;
  return {
    CATALOG_DISPLAY_ALLOWED: grants.CATALOG_DISPLAY_ALLOWED === true,
    IMAGE_USAGE_ALLOWED: grants.IMAGE_USAGE_ALLOWED === true,
    PRICE_SYNC_ALLOWED: grants.PRICE_SYNC_ALLOWED === true,
  };
}

export function isCommerceRightAllowed(
  rights: CommerceProviderRights | null | undefined,
  flag: CommerceRightsFlag
): boolean {
  if (!rights) return false;
  return rights[flag] === true;
}

export function isCommerceProviderKind(
  value: unknown
): value is CommerceProviderKind {
  return (
    typeof value === "string" &&
    (COMMERCE_PROVIDER_KINDS as readonly string[]).includes(value)
  );
}

export function assertCommerceLiveIntegrationAllowed(input?: {
  legalCompanyStatus?: string;
  partnerPermissionGranted?: boolean;
}): { ok: true } | { ok: false; reason: string; message: string } {
  const company = input?.legalCompanyStatus ?? COMMERCE_LEGAL_COMPANY_STATUS;
  if (company !== "READY") {
    return {
      ok: false,
      reason: "LEGAL_COMPANY_PENDING",
      message: COMMERCE_LIVE_DISABLED_MESSAGE,
    };
  }
  if (input?.partnerPermissionGranted !== true) {
    return {
      ok: false,
      reason: "PARTNER_PERMISSION_REQUIRED",
      message: COMMERCE_LIVE_DISABLED_MESSAGE,
    };
  }
  return { ok: true };
}

function sanitizeMockOffer(
  fixture: {
    offerId: string;
    title: string;
    imageUrl?: string | null;
    priceMinor?: number | null;
    currency?: string | null;
  },
  rights: CommerceProviderRights
): CommerceOfferPreview {
  return {
    offerId: fixture.offerId,
    title: fixture.title,
    purchasable: false,
    imageUrl: isCommerceRightAllowed(rights, "IMAGE_USAGE_ALLOWED")
      ? (fixture.imageUrl ?? null)
      : null,
    priceMinor: isCommerceRightAllowed(rights, "PRICE_SYNC_ALLOWED")
      ? (fixture.priceMinor ?? null)
      : null,
    currency: isCommerceRightAllowed(rights, "PRICE_SYNC_ALLOWED")
      ? (fixture.currency ?? null)
      : null,
  };
}

export type MockCommerceOfferFixture = {
  offerId: string;
  title: string;
  imageUrl?: string | null;
  priceMinor?: number | null;
  currency?: string | null;
};

/**
 * In-memory adapter. Default catalog is empty. Fixtures are never purchasable
 * and must not be real third-party SKUs.
 */
export function createMockCommerceProviderAdapter(input: {
  providerId: string;
  displayName: string;
  kind: CommerceProviderKind;
  rights?: Partial<CommerceProviderRights>;
  checkoutMode?: CommerceCheckoutMode;
  fulfillmentOwner?: CommerceFulfillmentOwner;
  returnsOwner?: CommerceReturnsOwner;
  fixtures?: readonly MockCommerceOfferFixture[];
}): CommerceProviderAdapter {
  const rights = normalizeCommerceRights(input.rights);
  const descriptor: CommerceProviderDescriptor = {
    providerId: input.providerId.trim(),
    displayName: input.displayName.trim(),
    kind: input.kind,
    rights,
    checkoutMode: input.checkoutMode ?? "DISABLED",
    fulfillmentOwner: input.fulfillmentOwner ?? "UNKNOWN",
    returnsOwner: input.returnsOwner ?? "UNKNOWN",
    liveIntegrationEnabled: false,
  };

  return {
    descriptor,
    listOffers(): CommerceProviderListResult {
      if (descriptor.liveIntegrationEnabled) {
        return {
          ok: false,
          reason: "LIVE_DISABLED",
          message: COMMERCE_LIVE_DISABLED_MESSAGE,
        };
      }
      if (!isCommerceRightAllowed(rights, "CATALOG_DISPLAY_ALLOWED")) {
        return {
          ok: false,
          reason: "RIGHTS_DENIED",
          message: COMMERCE_RIGHTS_DENIED_MESSAGE,
        };
      }
      const fixtures = input.fixtures ?? [];
      return {
        ok: true,
        offers: fixtures.map((fixture) => sanitizeMockOffer(fixture, rights)),
      };
    },
  };
}
