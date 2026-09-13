import { describe, expect, it } from "vitest";
import { readApprovedDraftFile } from "./launchDraftFile";
import {
  mergeLiveReadIntoCandidate,
  runApproved59LiveRead,
  type LiveReadGateResult,
} from "./liveReadGate";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CjReadOnlyClient } from "./client";

function mockClient(input: {
  authOk?: boolean;
  stock?: number;
  sellPrice?: number;
  freight?: number;
}): CjReadOnlyClient {
  return {
    authenticate: async () =>
      input.authOk === false
        ? { ok: false as const, message: "auth failed" }
        : { ok: true as const, data: "test-token-not-real" },
    listUsedEndpoints: () => [],
    getCategories: async () => ({ ok: true as const, data: [] }),
    listProductsV2: async () => ({ ok: true as const, data: {} }),
    queryProduct: async (pid: string) => ({
      ok: true as const,
      data: {
        pid,
        sellPrice: input.sellPrice ?? 8,
        bigImage: "https://cf.cjdropshipping.com/test.jpg",
        productImageSet: ["https://cf.cjdropshipping.com/test.jpg"],
        variants: [
          {
            vid: "vid-1",
            variantSellPrice: input.sellPrice ?? 8,
            inventoryNum: input.stock ?? 40,
            inventories: [],
          },
        ],
      },
    }),
    freightToIreland: async () => ({
      ok: true as const,
      data: [{ logisticPrice: input.freight ?? 4, logisticAging: "6-9" }],
    }),
    queryProductBySku: async () => ({ ok: false as const, message: "unused" }),
    queryProductByVariantSku: async () => ({ ok: false as const, message: "unused" }),
    queryVariantByVid: async () => ({ ok: false as const, message: "unused" }),
    queryStockByVid: async () => ({ ok: false as const, message: "unused" }),
    queryStockBySku: async () => ({ ok: false as const, message: "unused" }),
  };
}

describe("CJ live read-only 59 gate", () => {
  it("classifies a healthy live row and never substitutes", async () => {
    const approved = readApprovedDraftFile();
    expect(approved).not.toBeNull();
    const first = approved!.products[0];
    const slim = {
      ...approved!,
      products: approved!.products.map((row, index) =>
        index === 0
          ? {
              ...row,
              identity: { ...row.identity, cj_variant_id: "vid-1" },
              customer: { ...row.customer, retail_price_minor: 4099 },
            }
          : row
      ),
    };
    const result = await runApproved59LiveRead({
      client: mockClient({ stock: 50, sellPrice: 8, freight: 4 }),
      approved: { ...slim, products: [slim.products[0], ...slim.products.slice(1)] },
      sleep: async () => undefined,
    });
    expect(result.auth_ok).toBe(true);
    expect(result.write_calls).toBe(0);
    expect(result.substituted).toBe(false);
    expect(result.products).toHaveLength(59);
    expect(result.products[0].cj_product_id).toBe(first.identity.cj_product_id);
    expect(result.products[0].sync_status).toBe("HEALTHY");
    expect(result.products[0].live_verified).toBe(true);
  });

  it("flags zero stock and price-review without changing the approved set", async () => {
    const approved = readApprovedDraftFile();
    const zero = await runApproved59LiveRead({
      client: mockClient({ stock: 0, sellPrice: 8, freight: 4 }),
      approved: approved!,
      sleep: async () => undefined,
    });
    expect(zero.products.every((row) => row.sync_status === "OUT_OF_STOCK")).toBe(true);
    expect(new Set(zero.products.map((row) => row.cj_product_id)).size).toBe(59);

    const review = await runApproved59LiveRead({
      client: mockClient({ stock: 20, sellPrice: 20, freight: 10 }),
      approved: {
        ...approved!,
        products: approved!.products.map((row) => ({
          ...row,
          customer: { ...row.customer, retail_price_minor: 2500 },
        })),
      },
      sleep: async () => undefined,
    });
    expect(review.products.every((row) => row.sync_status === "PRICE_REVIEW")).toBe(true);
  });

  it("does not reference forbidden write paths and refuses auth-fail as unverified", async () => {
    const src = readFileSync(join(__dirname, "liveReadGate.ts"), "utf8");
    expect(src).not.toMatch(/createOrder/i);
    expect(src).not.toMatch(/shopping\/order/i);
    const approved = readApprovedDraftFile();
    const failed = await runApproved59LiveRead({
      client: mockClient({ authOk: false }),
      approved: approved!,
      sleep: async () => undefined,
    });
    expect(failed.auth_ok).toBe(false);
    expect(failed.live_product_reads).toBe(0);
    expect(failed.products.every((row) => row.sync_status === "SYNC_ERROR")).toBe(true);

    const merged: LiveReadGateResult = failed;
    const catalog = mergeLiveReadIntoCandidate(approved!, merged);
    expect(catalog.publication.live_store_published).toBe(false);
    expect(catalog.summary.approved_products).toBe(59);
    expect(catalog.live_audit.status).toBe("AUTH_FAILED");
    expect(catalog.summary.last_known_healthy).toBe(59);
  });
});
