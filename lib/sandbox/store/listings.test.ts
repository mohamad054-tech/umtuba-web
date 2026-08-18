import { describe, expect, it } from "vitest";
import { UMTUBA_DEMO_PRODUCTS } from "../../store/demo/catalog";
import { SANDBOX_STORE_LISTINGS } from "../fixtures/store";
import {
  displayOnHand,
  getStoreListingView,
  STORE_LISTING_VIEWS,
} from "./listings";

describe("sandbox store listings", () => {
  it("keeps 26 DEMO products with DEMO_ONLY rights and no real provider", () => {
    expect(UMTUBA_DEMO_PRODUCTS).toHaveLength(26);
    expect(STORE_LISTING_VIEWS).toHaveLength(26);
    expect(SANDBOX_STORE_LISTINGS).toHaveLength(26);
    for (const listing of STORE_LISTING_VIEWS) {
      expect(listing.product.sourceType).toBe("DEMO");
      expect(listing.product.rightsStatus).toBe("DEMO_ONLY");
      expect(listing.product.realProvider).toBe("NONE");
      expect(listing.product.purchasable).toBe(false);
      expect(listing.purchasableInProduction).toBe(false);
      expect(listing.realInventory).toBe(false);
    }
  });

  it("attributes UMTUBA_OWNED listings to the platform actor, not Demo Supplier A", () => {
    const owned = STORE_LISTING_VIEWS.filter((row) => row.commerceMode === "UMTUBA_OWNED");
    expect(owned.length).toBeGreaterThan(0);
    for (const listing of owned) {
      expect(listing.actorId).toBe("umtuba-owned");
      expect(listing.actor.displayName).toBe("UMTUBA");
      expect(listing.actor.kind).toBe("platform");
    }
  });

  it("hides onHand for digital SKUs", () => {
    const digital = STORE_LISTING_VIEWS.filter((row) => row.stockKind === "digital");
    expect(digital.length).toBeGreaterThan(0);
    for (const listing of digital) {
      expect(listing.product.productType).toBe("digital");
      expect(displayOnHand(listing)).toBeNull();
    }
    const physical = STORE_LISTING_VIEWS.find((row) => row.stockKind === "physical");
    expect(displayOnHand(physical!)).toBeTypeOf("number");
  });

  it("builds unique geometric art instead of a shared placeholder URL", () => {
    const hues = new Set(STORE_LISTING_VIEWS.map((row) => row.art.hue));
    expect(hues.size).toBeGreaterThan(10);
    for (const listing of STORE_LISTING_VIEWS) {
      expect(listing.art.motif).toBeTruthy();
      expect(listing.shopperDescription).not.toMatch(/SOURCE_TYPE=DEMO/);
    }
  });

  it("resolves listings by slug", () => {
    const first = STORE_LISTING_VIEWS[0]!;
    expect(getStoreListingView(first.product.slug)?.product.id).toBe(first.product.id);
  });
});
