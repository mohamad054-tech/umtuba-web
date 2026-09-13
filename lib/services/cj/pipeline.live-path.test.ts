import { describe, expect, it } from "vitest";
import { createCjReadOnlyClient } from "./client";
import { runCjPilotCollection } from "./pipeline";
import { createMemoryTokenCache } from "./tokenCache";
import type { CjListV2Data, CjProductDetail } from "./types";

describe("cj pilot collection path", () => {
  it("maps fixture CJ payloads through evaluator without treating them as live imports when auth fails", async () => {
    const client = createCjReadOnlyClient({
      cache: createMemoryTokenCache(),
      fetchImpl: async () => ({
        status: 401,
        json: { result: false, message: "missing key" },
      }),
    });
    const catalog = await runCjPilotCollection({
      client,
      sleep: async () => undefined,
      now: () => new Date("2026-09-09T00:00:00.000Z"),
    });
    expect(catalog.cj_api_connected).toBe(false);
    expect(catalog.dry_run).toBe(true);
    expect(catalog.products).toEqual([]);
  });

  it("accepts a clearly-marked fixture product when the read-only client returns catalog+freight", async () => {
    const list: CjListV2Data = {
      content: [
        {
          productList: [
            {
              id: "FIX-HOME-1",
              nameEn: "Silicone kitchen spatula",
              sku: "CJFIX-HOME-1",
              bigImage: "https://cf.cjdropshipping.com/demo/spatula.jpg",
              sellPrice: "4.00",
              warehouseInventoryNum: 200,
              deliveryCycle: "2-4",
            },
          ],
        },
      ],
    };
    const detail: CjProductDetail = {
      pid: "FIX-HOME-1",
      productNameEn: "Silicone kitchen spatula",
      productImageSet: ["https://cf.cjdropshipping.com/demo/spatula.jpg"],
      sellPrice: 4,
      productProEnSet: ["COMMON"],
      variants: [
        {
          vid: "FIX-VID-1",
          variantSku: "CJFIX-HOME-1-RED",
          variantKey: "Red",
          variantWeight: 80,
          variantLength: 180,
          variantWidth: 40,
          variantHeight: 20,
          variantSellPrice: 4,
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
              data: [{ logisticAging: "7-12", logisticPrice: 2.5, logisticName: "CJPacket" }],
            },
          };
        }
        return { status: 404, json: { result: false, message: "unused" } };
      },
    });

    const catalog = await runCjPilotCollection({
      client,
      sleep: async () => undefined,
      now: () => new Date("2026-09-09T00:00:00.000Z"),
    });
    expect(catalog.cj_api_connected).toBe(true);
    expect(catalog.dry_run).toBe(false);
    expect(catalog.products.some((row) => row.cj_product_id === "FIX-HOME-1")).toBe(true);
    const accepted = catalog.products.filter((row) => row.decision === "accepted");
    expect(accepted.length).toBeGreaterThan(0);
    expect(accepted[0]?.title).toBe("Silicone kitchen spatula");
  });
});
