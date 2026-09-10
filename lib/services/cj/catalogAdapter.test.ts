import { describe, expect, it } from "vitest";
import { acceptedPilotCatalogItems, toIsolatedStoreCatalogItem } from "./catalogAdapter";
import { evaluateCjPilotCandidate } from "./evaluator";

describe("cj pilot catalog adapter", () => {
  it("maps accepted records onto isolated Store-compatible draft items", () => {
    const record = evaluateCjPilotCandidate({
      cjProductId: "04A22450-67F0-4617-A132-E7AE7F8963B0",
      cjVariantId: "VID-9",
      sku: "CJHOME-9",
      title: "LED night light",
      category: "Home",
      imageUrls: ["https://cf.cjdropshipping.com/demo/light.jpg"],
      supplierPriceMinor: 350,
      shippingMinor: 200,
      stock: 80,
      processingTime: "1-3",
      estimatedDeliveryTime: "6-10",
      sourceWarehouseCountry: "CN",
      productUrl: "https://cjdropshipping.com/product/04A22450.html",
      weightGrams: 90,
      lengthMm: 80,
      widthMm: 80,
      heightMm: 60,
      variantKey: "Warm",
      logisticsProps: ["COMMON"],
    });
    const item = toIsolatedStoreCatalogItem(record);
    expect(item.provider).toBe("cj");
    expect(item.pilot_batch).toBe("CJ_PILOT_100_V1");
    expect(item.product.status).toBe("draft");
    expect(item.product.published_at).toBeNull();
    expect(item.store.slug).toBe("umtuba-cj-pilot-100-v1");
    expect(item.priceMinor).toBe(record.proposed_retail_price_minor);
    expect(item.coverUrl).toBe("https://cf.cjdropshipping.com/demo/light.jpg");
    expect(acceptedPilotCatalogItems([record, { ...record, decision: "rejected" }])).toHaveLength(
      1
    );
  });
});
