import { describe, expect, it } from "vitest";
import type { StoreProductRow } from "./types";
import {
  deriveSellerPayoutConfiguredFromEligibility,
  deriveSellerProfileComplete,
  loadSellerCatalogHealthFacts,
} from "./sellerCatalogWiring";
import {
  buildSellerExperienceBundle,
  deriveSellerProductHealth,
} from "./sellerExperienceFoundation";

function product(
  overrides: Partial<StoreProductRow> & Pick<StoreProductRow, "id" | "title">
): StoreProductRow {
  return {
    store_id: "11111111-1111-4111-8111-111111111111",
    slug: "slug",
    short_description: null,
    description: null,
    product_type: "digital",
    status: "draft",
    moderation_status: "pending",
    primary_category_id: null,
    brand_id: null,
    created_by: "user-1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    published_at: null,
    ...overrides,
  };
}

describe("Seller Catalog Wiring V1", () => {
  it("maps real media/price/digital/physical facts into health codes", async () => {
    const storeId = "11111111-1111-4111-8111-111111111111";
    const digital = product({
      id: "22222222-2222-4222-8222-222222222222",
      title: "Digital Pack",
      product_type: "digital",
      description: "A sufficiently long product description for health.",
      primary_category_id: "cat-1",
      status: "draft",
    });
    const physical = product({
      id: "33333333-3333-4333-8333-333333333333",
      title: "Physical Box",
      product_type: "physical",
      description: "A sufficiently long product description for health.",
      primary_category_id: "cat-1",
      weight_grams: 500,
      status: "draft",
    });

    const calls: string[] = [];
    const supabase = {
      from(table: string) {
        calls.push(table);
        return {
          select() {
            return this;
          },
          in() {
            return this;
          },
          eq(_col: string, val: string) {
            this._eq = val;
            return this;
          },
          then(resolve: (v: unknown) => void) {
            if (table === "product_media") {
              resolve({
                data: [{ product_id: digital.id, status: "active" }],
              });
              return;
            }
            if (table === "product_variants") {
              resolve({
                data: [
                  { id: "v1", product_id: digital.id, status: "active" },
                  { id: "v2", product_id: physical.id, status: "active" },
                ],
              });
              return;
            }
            if (table === "product_prices") {
              resolve({
                data: [{ variant_id: "v1", status: "active", amount_minor: 100 }],
              });
              return;
            }
            if (table === "store_digital_product_assets") {
              resolve({
                data: [{ product_id: digital.id, status: "active" }],
              });
              return;
            }
            resolve({ data: [] });
          },
          _eq: "" as string,
        };
      },
    };

    const facts = await loadSellerCatalogHealthFacts(supabase as never, {
      storeId,
      products: [digital, physical],
      inventoryRows: [
        {
          productId: physical.id,
          productTitle: physical.title,
          productSlug: physical.slug,
          productStatus: physical.status,
          productType: "physical",
          variantId: "v2",
          variantTitle: "Default",
          sku: "SKU",
          variantStatus: "active",
          warehouseKey: "default",
          inventoryId: "inv-1",
          onHand: 3,
          reserved: 0,
          safetyStock: 0,
          allowBackorder: false,
          availableToSell: 3,
          inventoryUpdatedAt: null,
          missingInventory: false,
          availabilityMode: "finite",
        },
      ],
    });

    expect(calls).toContain("product_media");
    expect(calls).toContain("product_prices");
    expect(calls).toContain("store_digital_product_assets");

    const digitalFacts = facts.find((f) => f.product.id === digital.id)!;
    expect(digitalFacts.hasImages).toBe(true);
    expect(digitalFacts.hasPricing).toBe(true);
    expect(digitalFacts.hasDigitalAsset).toBe(true);

    const physicalFacts = facts.find((f) => f.product.id === physical.id)!;
    expect(physicalFacts.hasPhysicalMetadata).toBe(true);
    expect(physicalFacts.inventoryRequired).toBe(true);
    expect(physicalFacts.hasInventoryRow).toBe(true);
    expect(physicalFacts.hasPricing).toBe(false);

    const health = deriveSellerProductHealth(digitalFacts);
    expect(health.codes).toContain("ready_to_publish");
    expect(health.codes).not.toContain("missing_digital_asset");
  });

  it("wires profile/payout completeness and analytics no-data note", () => {
    expect(
      deriveSellerProfileComplete({
        name: "Shop",
        slug: "shop",
        status: "active",
        verification_status: "verified",
      })
    ).toBe(true);
    expect(
      deriveSellerPayoutConfiguredFromEligibility({
        payoutEligibility: {
          overallState: "ready",
          balanceVisibilityAvailable: true,
        },
      })
    ).toBe(true);
    expect(
      deriveSellerPayoutConfiguredFromEligibility({
        payoutEligibility: { overallState: "unavailable" },
      })
    ).toBeNull();

    const bundle = buildSellerExperienceBundle({
      storeId: "11111111-1111-4111-8111-111111111111",
      storeName: "Shop",
      storeSlug: "shop",
      storeStatus: "active",
      verificationStatus: "verified",
      products: [
        product({
          id: "22222222-2222-4222-8222-222222222222",
          title: "A",
          status: "active",
          moderation_status: "approved",
          description: "A sufficiently long product description for health.",
          primary_category_id: "cat-1",
        }),
      ],
      productFacts: [
        {
          product: product({
            id: "22222222-2222-4222-8222-222222222222",
            title: "A",
            status: "active",
            moderation_status: "approved",
            description: "A sufficiently long product description for health.",
            primary_category_id: "cat-1",
          }),
          hasImages: true,
          hasPricing: true,
          hasDigitalAsset: true,
        },
      ],
      profileComplete: true,
      payoutConfigured: true,
      analytics: {},
    });

    expect(bundle.summary.publishedProducts).toBe(1);
    expect(bundle.analytics.hasData).toBe(false);
    expect(bundle.analytics.notes).toContain("No data yet");
    expect(
      bundle.storeReadiness.checklist.some((c) => c.id === "payout-configured" && c.done)
    ).toBe(true);
    expect(bundle.actionCenter.length).toBeGreaterThanOrEqual(0);
  });
});
