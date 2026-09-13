import { describe, expect, it } from "vitest";
import { formatMinorUnits } from "../../store/money";
import { estimateEarnablePointsFromRetail } from "../../store/umPointsPurchaseRewards";
import { createCjReadOnlyClient } from "./client";
import {
  customerBrowseLeaksInternals,
  expansionToBrowseProduct,
  filterBrowseCatalog,
  loadStoreBrowseCatalog,
  parseDepartment,
} from "./expansionBrowse";
import { emptyExpansionCatalog, finalizeAcceptedProducts, runCatalogExpansion } from "./expansionPipeline";
import {
  STORE_DEPARTMENTS,
  STORE_SUBCATEGORIES,
  assertTaxonomyComplete,
  mapLaunchCategoryToDepartment,
} from "./expansionTaxonomy";
import { readApprovedDraftFile } from "./launchDraftFile";
import { isCustomerVisibleLaunchProduct, partitionLaunchCatalog } from "./productionCandidate";
import { createMemoryTokenCache } from "./tokenCache";
import type { CjListV2Data, CjProductDetail } from "./types";
import type { ExpansionAcceptedProduct } from "./expansionPipeline";

function fixtureAccepted(
  overrides: Partial<ExpansionAcceptedProduct> = {}
): ExpansionAcceptedProduct {
  return {
    provider: "cj",
    cj_product_id: "EXP-FIX-1",
    cj_variant_id: "EXP-VID-1",
    sku: "EXP-SKU-1",
    department: "HOME",
    subcategory: "Kitchen",
    family: "silicone_spatula_set",
    title: "Silicone spatula set",
    description: "Silicone spatula set. HOME / Kitchen.",
    image_urls: ["https://cf.cjdropshipping.com/demo/spatula.jpg"],
    retail_price_minor: 1999,
    landed_cost_minor: 700,
    supplier_price_minor: 400,
    shipping_minor: 300,
    gross_profit_minor: 1299,
    gross_margin: 0.65,
    currency: "USD",
    stock: 80,
    estimated_delivery_time: "5-8",
    delivery_days: 8,
    availability: "in_stock",
    classification: "PAID_AD_READY",
    score: 88,
    last_synced_at: "2026-09-09T00:00:00.000Z",
    ...overrides,
  };
}

describe("CJ catalog expansion taxonomy and browse", () => {
  it("keeps the exact 10 departments and required subcategories", () => {
    assertTaxonomyComplete();
    expect(STORE_DEPARTMENTS).toHaveLength(10);
    expect(STORE_SUBCATEGORIES.HOME).toEqual([
      "Kitchen",
      "Baking",
      "Storage & Organization",
      "Cleaning",
      "Bathroom",
      "Lighting",
      "Home Decor",
      "Small Home Accessories",
    ]);
    expect(STORE_SUBCATEGORIES.FASHION).toHaveLength(7);
    expect(STORE_SUBCATEGORIES["GARDEN & OUTDOOR"]).toContain("Solar / Outdoor Accessories");
    expect(parseDepartment("HOME")).toBe("HOME");
    expect(parseDepartment("nope")).toBe("ALL");
    expect(mapLaunchCategoryToDepartment("Pet")).toEqual({
      department: "PET",
      subcategory: "Bowls & Feeding",
    });
    const deduped = finalizeAcceptedProducts([
      fixtureAccepted({ title: "Garlic Press One", score: 80 }),
      fixtureAccepted({ cj_product_id: "EXP-FIX-2", title: "Garlic Press Two", score: 70 }),
      fixtureAccepted({ cj_product_id: "EXP-FIX-3", title: "Garlic Press Three", score: 60 }),
      fixtureAccepted({ cj_product_id: "EXP-FIX-4", title: "Garlic Press Four", score: 50 }),
      fixtureAccepted({ cj_product_id: "EXP-FIX-5", title: "Garlic Press Five", score: 40 }),
      fixtureAccepted({
        cj_product_id: "EXP-FIX-KNIFE",
        title: "Pattern Kitchen Knife",
        score: 90,
      }),
    ]);
    expect(deduped.every((row) => row.family !== "kitchen_knife")).toBe(true);
    expect(deduped.filter((row) => row.family === "garlic_press")).toHaveLength(4);
  });

  it("includes leftover canonical expansion SKUs so browse covers 540", () => {
    const leftoverIds = [
      "2412210206111611700",
      "2409240350571624600",
      "2D644825-4547-4EA6-9C8D-22E3DC3CFFE8",
      "DCB495CC-80F8-4ED9-B5BD-26E39B751776",
      "1380094536965033984",
      "1607997452471250944",
      "38396C3B-40FA-4EE3-9FE2-60FE32A2DE24",
      "2508140725141623900",
    ];
    const catalog = loadStoreBrowseCatalog();
    const ids = catalog.items.map((row) => row.identity.cj_product_id);
    expect(catalog.items).toHaveLength(540);
    expect(new Set(ids).size).toBe(540);
    expect(catalog.approvedCount + catalog.expansionCount).toBe(540);
    for (const id of leftoverIds) {
      const row = catalog.items.find((item) => item.identity.cj_product_id === id);
      expect(row, id).toBeTruthy();
      expect(row?.source).toBe("expansion");
      expect(row?.customerVisible).toBe(true);
      expect((row?.economics.stock ?? 0) > 0).toBe(true);
    }
  });

  it("does not overwrite the approved 59 identities", () => {
    const approved = readApprovedDraftFile();
    expect(approved).not.toBeNull();
    expect(approved!.products).toHaveLength(59);
    const ids = approved!.products.map((row) => row.identity.cj_product_id);
    expect(new Set(ids).size).toBe(59);
    expect(emptyExpansionCatalog({ skipProductIds: 59 }).skip_approved_ids).toBe(59);
  });

  it("hides unavailable products from the customer listing without substitution", () => {
    const visible = expansionToBrowseProduct(fixtureAccepted());
    const hidden = expansionToBrowseProduct(
      fixtureAccepted({
        cj_product_id: "EXP-FIX-HIDDEN",
        availability: "in_stock",
        stock: 0,
        title: "Hidden spatula",
      })
    );
    hidden.customerVisible = false;
    hidden.customer.availability_label = "Unavailable";
    hidden.sync_status = "OUT_OF_STOCK";

    const listed = filterBrowseCatalog([visible, hidden], { admin: false });
    expect(listed.map((row) => row.customer.title)).toEqual(["Silicone spatula set"]);
    expect(
      filterBrowseCatalog([visible], { query: "kitchen", admin: false }).map((row) => row.customer.title)
    ).toEqual(["Silicone spatula set"]);
    expect(filterBrowseCatalog([visible], { query: "no-such-item", admin: false })).toEqual([]);
    expect(listed.some((row) => row.customer.title === "Hidden spatula")).toBe(false);

    const { visible: purchasable, hidden: held } = partitionLaunchCatalog([
      { sync_status: "HEALTHY" as const },
      { sync_status: "SYNC_ERROR" as const },
    ]);
    expect(purchasable).toHaveLength(1);
    expect(held).toHaveLength(1);
    expect(isCustomerVisibleLaunchProduct({ sync_status: "OUT_OF_STOCK" })).toBe(false);
  });

  it("keeps internals off the customer browse payload", () => {
    const row = expansionToBrowseProduct(fixtureAccepted());
    expect(customerBrowseLeaksInternals(row.customer)).toEqual([]);
    const blob = JSON.stringify(row.catalogItem).toLowerCase();
    expect(blob).not.toContain("landed_cost");
    expect(blob).not.toContain("gross_margin");
    expect(blob).not.toContain("cj_product_id");
    expect(blob).not.toContain("profitability_score");
    expect(JSON.stringify(row.customer)).not.toContain(row.identity.cj_product_id);
    expect(row.customer.id.includes(row.identity.cj_product_id)).toBe(false);
  });

  it("estimates UM Points as floor of $1 eligible spend and formats AR/EN currency", () => {
    const row = expansionToBrowseProduct(fixtureAccepted({ retail_price_minor: 4999 }));
    expect(
      estimateEarnablePointsFromRetail({
        amountMinor: row.customer.retail_price_minor,
        currency: "USD",
      })
    ).toBe(49);
    expect(
      estimateEarnablePointsFromRetail({ amountMinor: 99, currency: "USD" })
    ).toBe(0);
    expect(formatMinorUnits(4999, "USD", "en")).toBe("$49.99");
    expect(formatMinorUnits(4999, "USD", "ar")).toBe("49.99 US$");
  });

  it("accepts a fixture CJ product and skips reserved plus branded titles", async () => {
    const list: CjListV2Data = {
      content: [
        {
          productList: [
            {
              id: "RESERVED-59",
              nameEn: "Already approved spatula",
              bigImage: "https://cf.cjdropshipping.com/demo/old.jpg",
              sellPrice: "4.00",
              warehouseInventoryNum: 200,
              deliveryCycle: "3-6",
            },
            {
              id: "NIKE-BAG",
              nameEn: "Nike replica tote bag",
              bigImage: "https://cf.cjdropshipping.com/demo/nike.jpg",
              sellPrice: "6.00",
              warehouseInventoryNum: 200,
            },
            {
              id: "EXP-HOME-1",
              nameEn: "Silicone kitchen spatula",
              sku: "EXP-HOME-1",
              bigImage: "https://cf.cjdropshipping.com/demo/spatula.jpg",
              sellPrice: "4.00",
              warehouseInventoryNum: 200,
              deliveryCycle: "3-6",
            },
          ],
        },
      ],
    };
    const detail: CjProductDetail = {
      pid: "EXP-HOME-1",
      productNameEn: "Silicone kitchen spatula",
      productImageSet: ["https://cf.cjdropshipping.com/demo/spatula.jpg"],
      sellPrice: 4,
      variants: [
        {
          vid: "EXP-VID-1",
          variantSku: "EXP-HOME-1-RED",
          variantKey: "Red",
          variantSellPrice: 4,
          inventoryNum: 200,
          inventories: [{ countryCode: "CN", totalInventory: 200 }],
        },
      ],
    };
    const client = createCjReadOnlyClient({
      apiKey: "fixture-not-a-real-key",
      cache: createMemoryTokenCache(),
      fetchImpl: async (url) => {
        if (url.includes("/authentication/getAccessToken")) {
          return {
            status: 200,
            json: {
              result: true,
              data: {
                accessToken: "fixture-access-token",
                accessTokenExpiryDate: "2099-01-01T00:00:00.000Z",
              },
            },
          };
        }
        if (url.includes("/product/listV2")) {
          return { status: 200, json: { result: true, data: list } };
        }
        if (url.includes("/product/query")) {
          return { status: 200, json: { result: true, data: detail } };
        }
        if (url.includes("/logistic/freightCalculate")) {
          return {
            status: 200,
            json: {
              result: true,
              data: [{ logisticAging: "5-8", logisticPrice: 3.2, logisticName: "CJPacket" }],
            },
          };
        }
        return { status: 404, json: { result: false, message: "unused" } };
      },
    });

    const catalog = await runCatalogExpansion({
      client,
      skipProductIds: new Set(["RESERVED-59"]),
      target: 5,
      gapMs: 0,
      maxListPages: 1,
      departments: ["HOME"],
      keywordsByDepartment: {
        HOME: { Kitchen: ["silicone spatula set"] },
      },
      sleep: async () => undefined,
      now: () => "2026-09-09T00:00:00.000Z",
    });

    expect(catalog.skip_approved_ids).toBe(1);
    expect(catalog.products.map((row) => row.cj_product_id)).toEqual(["EXP-HOME-1"]);
    expect(catalog.products[0]?.department).toBe("HOME");
    expect(catalog.products[0]?.subcategory).toBe("Kitchen");
    expect(catalog.substituted).toBe(false);
    expect(catalog.rejected).toBeGreaterThanOrEqual(1);
  });
});
