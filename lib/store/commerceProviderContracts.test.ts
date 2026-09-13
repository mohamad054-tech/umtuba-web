import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  COMMERCE_CHECKOUT_MODES,
  COMMERCE_FULFILLMENT_OWNERS,
  COMMERCE_LEGAL_COMPANY_STATUS,
  COMMERCE_LIVE_DISABLED_MESSAGE,
  COMMERCE_PROVIDER_KINDS,
  COMMERCE_RETURNS_OWNERS,
  COMMERCE_RIGHTS_DENIED_MESSAGE,
  COMMERCE_RIGHTS_FLAGS,
  assertCommerceLiveIntegrationAllowed,
  createDeniedCommerceRights,
  createMockCommerceProviderAdapter,
  isCommerceProviderKind,
  isCommerceRightAllowed,
  normalizeCommerceRights,
} from "./commerceProviderContracts";

const ROOT = process.cwd();
const NAMED_RETAILER_RE =
  /shein|temu|aliexpress|alibaba|trendyol|amazon|ebay|dhgate|coursera|udemy|skillshare/i;

describe("commerce provider contracts", () => {
  it("exposes the six provider-neutral kinds and DENY-by-default rights", () => {
    expect([...COMMERCE_PROVIDER_KINDS]).toEqual([
      "AFFILIATE",
      "CATALOG_API",
      "DROPSHIP",
      "WHOLESALE",
      "RESELLER",
      "MARKETPLACE",
    ]);
    expect([...COMMERCE_RIGHTS_FLAGS]).toEqual([
      "CATALOG_DISPLAY_ALLOWED",
      "IMAGE_USAGE_ALLOWED",
      "PRICE_SYNC_ALLOWED",
    ]);
    expect(createDeniedCommerceRights()).toEqual({
      CATALOG_DISPLAY_ALLOWED: false,
      IMAGE_USAGE_ALLOWED: false,
      PRICE_SYNC_ALLOWED: false,
    });
    expect(COMMERCE_CHECKOUT_MODES[0]).toBe("DISABLED");
    expect(COMMERCE_FULFILLMENT_OWNERS[0]).toBe("UNKNOWN");
    expect(COMMERCE_RETURNS_OWNERS[0]).toBe("UNKNOWN");
  });

  it("treats missing, unknown, and false flags as DENY", () => {
    expect(
      isCommerceRightAllowed(undefined, "CATALOG_DISPLAY_ALLOWED")
    ).toBe(false);
    expect(
      isCommerceRightAllowed(
        normalizeCommerceRights({}),
        "CATALOG_DISPLAY_ALLOWED"
      )
    ).toBe(false);
    expect(
      isCommerceRightAllowed(
        normalizeCommerceRights({ CATALOG_DISPLAY_ALLOWED: false }),
        "CATALOG_DISPLAY_ALLOWED"
      )
    ).toBe(false);
    expect(
      isCommerceRightAllowed(
        normalizeCommerceRights({ CATALOG_DISPLAY_ALLOWED: true }),
        "CATALOG_DISPLAY_ALLOWED"
      )
    ).toBe(true);
    expect(
      isCommerceRightAllowed(
        normalizeCommerceRights({ CATALOG_DISPLAY_ALLOWED: true }),
        "IMAGE_USAGE_ALLOWED"
      )
    ).toBe(false);
    expect(isCommerceProviderKind("AFFILIATE")).toBe(true);
    expect(isCommerceProviderKind("SHEIN")).toBe(false);
  });

  it("blocks live integration while company status is PENDING", () => {
    expect(COMMERCE_LEGAL_COMPANY_STATUS).toBe("PENDING");
    expect(assertCommerceLiveIntegrationAllowed()).toEqual({
      ok: false,
      reason: "LEGAL_COMPANY_PENDING",
      message: COMMERCE_LIVE_DISABLED_MESSAGE,
    });
    expect(
      assertCommerceLiveIntegrationAllowed({
        legalCompanyStatus: "READY",
        partnerPermissionGranted: false,
      })
    ).toEqual({
      ok: false,
      reason: "PARTNER_PERMISSION_REQUIRED",
      message: COMMERCE_LIVE_DISABLED_MESSAGE,
    });
    expect(
      assertCommerceLiveIntegrationAllowed({
        legalCompanyStatus: "READY",
        partnerPermissionGranted: true,
      }).ok
    ).toBe(true);
  });

  it("keeps the mock adapter empty, non-purchasable, and rights-gated", () => {
    const denied = createMockCommerceProviderAdapter({
      providerId: "mock-affiliate",
      displayName: "Mock affiliate",
      kind: "AFFILIATE",
    });
    expect(denied.descriptor.checkoutMode).toBe("DISABLED");
    expect(denied.descriptor.liveIntegrationEnabled).toBe(false);
    expect(denied.listOffers()).toEqual({
      ok: false,
      reason: "RIGHTS_DENIED",
      message: COMMERCE_RIGHTS_DENIED_MESSAGE,
    });

    const displayOnly = createMockCommerceProviderAdapter({
      providerId: "mock-catalog",
      displayName: "Mock catalog",
      kind: "CATALOG_API",
      rights: { CATALOG_DISPLAY_ALLOWED: true },
      fixtures: [
        {
          offerId: "mock:demo-offer",
          title: "Demo offer (non-purchasable)",
          imageUrl: "https://example.invalid/demo.png",
          priceMinor: 1999,
          currency: "USD",
        },
      ],
    });
    const listed = displayOnly.listOffers();
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    expect(listed.offers).toHaveLength(1);
    expect(listed.offers[0]).toEqual({
      offerId: "mock:demo-offer",
      title: "Demo offer (non-purchasable)",
      purchasable: false,
      imageUrl: null,
      priceMinor: null,
      currency: null,
    });

    const emptyAllowed = createMockCommerceProviderAdapter({
      providerId: "mock-empty",
      displayName: "Mock empty",
      kind: "WHOLESALE",
      rights: { CATALOG_DISPLAY_ALLOWED: true },
    });
    expect(emptyAllowed.listOffers()).toEqual({ ok: true, offers: [] });
  });

  it("does not hardcode named retailers into the contract module", () => {
    const source = readFileSync(
      join(ROOT, "lib/store/commerceProviderContracts.ts"),
      "utf8"
    );
    expect(source).not.toMatch(NAMED_RETAILER_RE);
  });
});
