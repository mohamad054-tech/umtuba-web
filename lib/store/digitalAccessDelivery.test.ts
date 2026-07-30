/**
 * Focused tests — Commerce Buyer Digital Access Delivery V1.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  STORE_DIGITAL_ACCESS_SIGNED_URL_TTL_SECONDS,
  STORE_PRODUCT_MEDIA_SIGNED_URL_TTL_SECONDS,
  buildStoreDigitalProductAssetPath,
  isOwnedStoreDigitalProductAssetPath,
} from "./mediaConstants";
import {
  DIGITAL_ACCESS_DELIVERY_ID,
  mintBuyerDigitalAccessSignedUrl,
  resolveDigitalDeliveryAvailability,
} from "./digitalAccessDelivery";

const ROOT = join(__dirname, "../..");
const BUYER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const ENTITLEMENT = "33333333-3333-4333-8333-333333333333";
const ORDER = "44444444-4444-4444-8444-444444444444";
const ORDER_ITEM = "55555555-5555-4555-8555-555555555555";
const PRODUCT = "66666666-6666-4666-8666-666666666666";
const STORE = "77777777-7777-4777-8777-777777777777";
const FILE = "88888888-8888-4888-8888-888888888888";
const SAFE_PATH = buildStoreDigitalProductAssetPath(
  STORE,
  PRODUCT,
  FILE,
  "pdf"
);

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("Digital access delivery — path and TTL contracts", () => {
  it("bounds signed URL TTL to existing media convention", () => {
    expect(STORE_DIGITAL_ACCESS_SIGNED_URL_TTL_SECONDS).toBe(
      STORE_PRODUCT_MEDIA_SIGNED_URL_TTL_SECONDS
    );
    expect(STORE_DIGITAL_ACCESS_SIGNED_URL_TTL_SECONDS).toBeLessThanOrEqual(
      15 * 60
    );
    expect(STORE_DIGITAL_ACCESS_SIGNED_URL_TTL_SECONDS).toBeGreaterThan(0);
    expect(DIGITAL_ACCESS_DELIVERY_ID).toMatch(/buyer_access_delivery/);
  });

  it("accepts owned digital paths and rejects traversal or foreign prefixes", () => {
    expect(isOwnedStoreDigitalProductAssetPath(STORE, PRODUCT, SAFE_PATH)).toBe(
      true
    );
    expect(
      isOwnedStoreDigitalProductAssetPath(
        STORE,
        PRODUCT,
        `stores/${STORE}/products/${PRODUCT}/digital/../secret.pdf`
      )
    ).toBe(false);
    expect(
      isOwnedStoreDigitalProductAssetPath(
        STORE,
        PRODUCT,
        `stores/${OTHER}/products/${PRODUCT}/digital/${FILE}.pdf`
      )
    ).toBe(false);
    expect(
      isOwnedStoreDigitalProductAssetPath(STORE, PRODUCT, SAFE_PATH + "/extra")
    ).toBe(false);
  });
});

describe("Digital access delivery — migration", () => {
  it("adds the smallest digital asset pointer table with FORCE RLS", () => {
    const migrations = readdirSync(join(ROOT, "supabase/migrations"));
    expect(
      migrations.some((f) => f.includes("20260878_store_digital_access_delivery"))
    ).toBe(true);
    const sql = read(
      "supabase/migrations/20260878_store_digital_access_delivery_v1.sql"
    );
    expect(sql).toMatch(/create table if not exists public\.store_digital_product_assets/);
    expect(sql).toMatch(/force row level security/i);
    expect(sql).toMatch(
      /revoke all on public\.store_digital_product_assets\s+from public, anon, authenticated/i
    );
    expect(sql).not.toMatch(/payout|carrier|warehouse_pick|shipping_label/i);
  });
});

describe("Digital access delivery — availability probe", () => {
  it("marks physical products unsupported and missing assets unavailable", async () => {
    const admin = {
      from: vi.fn((table: string) => {
        if (table === "store_products") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: PRODUCT,
                    store_id: STORE,
                    product_type: "physical",
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }),
        };
      }),
    };
    expect(
      await resolveDigitalDeliveryAvailability(admin as never, {
        productId: PRODUCT,
        storeId: STORE,
        entitlementStatus: "active",
      })
    ).toBe("unsupported");
  });
});

describe("Digital access delivery — minting", () => {
  function mockUserEntitlement(row: Record<string, unknown> | null) {
    return {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: row, error: null }),
          }),
        }),
      })),
    };
  }

  function mockAdmin(opts: {
    productType?: string;
    asset?: { storage_path: string; status: string; title?: string } | null;
    orderItemOk?: boolean;
    signedUrl?: string | null;
    signError?: { message: string } | null;
  }) {
    const storage = {
      from: vi.fn(() => ({
        createSignedUrl: vi.fn(async () => ({
          data: opts.signedUrl ? { signedUrl: opts.signedUrl } : null,
          error: opts.signError ?? null,
        })),
      })),
    };
    return {
      storage,
      from: vi.fn((table: string) => {
        if (table === "store_products") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: PRODUCT,
                    store_id: STORE,
                    product_type: opts.productType ?? "digital",
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "order_items") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data:
                    opts.orderItemOk === false
                      ? null
                      : {
                          id: ORDER_ITEM,
                          order_id: ORDER,
                          product_id: PRODUCT,
                        },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "store_digital_product_assets") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: opts.asset === undefined
                      ? {
                          storage_path: SAFE_PATH,
                          status: "active",
                          title: "Lesson pack",
                        }
                      : opts.asset,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    };
  }

  it("authenticated entitled buyer receives short-lived access", async () => {
    const user = mockUserEntitlement({
      id: ENTITLEMENT,
      buyer_id: BUYER,
      order_id: ORDER,
      order_item_id: ORDER_ITEM,
      product_id: PRODUCT,
      store_id: STORE,
      status: "active",
      title_snapshot: "Lesson pack",
    });
    const admin = mockAdmin({
      signedUrl: "https://signed.example/access?token=abc",
    });
    const result = await mintBuyerDigitalAccessSignedUrl(
      user as never,
      { entitlementId: ENTITLEMENT, userId: BUYER },
      { admin: admin as never }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.signedUrl).toMatch(/^https:\/\//);
    expect(result.expiresInSeconds).toBe(
      STORE_DIGITAL_ACCESS_SIGNED_URL_TTL_SECONDS
    );
    expect(JSON.stringify(result)).not.toMatch(/stores\//);
    expect(JSON.stringify(result)).not.toMatch(/SERVICE_ROLE|sk_/i);
  });

  it("unauthenticated access fails closed", async () => {
    const result = await mintBuyerDigitalAccessSignedUrl(
      mockUserEntitlement(null) as never,
      { entitlementId: ENTITLEMENT, userId: null }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("unauthenticated");
  });

  it("another buyer cannot access", async () => {
    const user = mockUserEntitlement({
      id: ENTITLEMENT,
      buyer_id: BUYER,
      order_id: ORDER,
      order_item_id: ORDER_ITEM,
      product_id: PRODUCT,
      store_id: STORE,
      status: "active",
      title_snapshot: "Lesson pack",
    });
    const result = await mintBuyerDigitalAccessSignedUrl(
      user as never,
      { entitlementId: ENTITLEMENT, userId: OTHER },
      { admin: mockAdmin({}) as never }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("not_owner");
  });

  it("inactive entitlement fails closed", async () => {
    const user = mockUserEntitlement({
      id: ENTITLEMENT,
      buyer_id: BUYER,
      order_id: ORDER,
      order_item_id: ORDER_ITEM,
      product_id: PRODUCT,
      store_id: STORE,
      status: "revoked",
      title_snapshot: "Lesson pack",
    });
    const result = await mintBuyerDigitalAccessSignedUrl(
      user as never,
      { entitlementId: ENTITLEMENT, userId: BUYER },
      { admin: mockAdmin({}) as never }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("entitlement_inactive");
  });

  it("forged unsafe storage path fails closed", async () => {
    const user = mockUserEntitlement({
      id: ENTITLEMENT,
      buyer_id: BUYER,
      order_id: ORDER,
      order_item_id: ORDER_ITEM,
      product_id: PRODUCT,
      store_id: STORE,
      status: "active",
      title_snapshot: "Lesson pack",
    });
    const result = await mintBuyerDigitalAccessSignedUrl(
      user as never,
      { entitlementId: ENTITLEMENT, userId: BUYER },
      {
        admin: mockAdmin({
          asset: {
            storage_path: `stores/${STORE}/products/${PRODUCT}/evil.pdf`,
            status: "active",
          },
        }) as never,
      }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("unsafe_path");
  });

  it("physical product fails closed", async () => {
    const user = mockUserEntitlement({
      id: ENTITLEMENT,
      buyer_id: BUYER,
      order_id: ORDER,
      order_item_id: ORDER_ITEM,
      product_id: PRODUCT,
      store_id: STORE,
      status: "active",
      title_snapshot: "Lesson pack",
    });
    const result = await mintBuyerDigitalAccessSignedUrl(
      user as never,
      { entitlementId: ENTITLEMENT, userId: BUYER },
      { admin: mockAdmin({ productType: "physical" }) as never }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("physical_product");
  });

  it("missing asset fails truthfully", async () => {
    const user = mockUserEntitlement({
      id: ENTITLEMENT,
      buyer_id: BUYER,
      order_id: ORDER,
      order_item_id: ORDER_ITEM,
      product_id: PRODUCT,
      store_id: STORE,
      status: "active",
      title_snapshot: "Lesson pack",
    });
    const result = await mintBuyerDigitalAccessSignedUrl(
      user as never,
      { entitlementId: ENTITLEMENT, userId: BUYER },
      { admin: mockAdmin({ asset: null }) as never }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("asset_missing");
  });

  it("does not mutate entitlement rows and keeps signing server-only", () => {
    const src = read("lib/store/digitalAccessDelivery.ts");
    expect(src).not.toMatch(
      /\.from\(["']store_digital_entitlements["']\)[\s\S]{0,120}\.(update|delete|insert)\(/
    );
    expect(src).toMatch(/createSignedUrl/);
    expect(src).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(src).not.toMatch(/console\.log\([^\)]*signedUrl/);

    const actions = read("app/actions/storeOrders.ts");
    expect(actions).toMatch(/mintBuyerDigitalAccessSignedUrl/);
    expect(actions).not.toMatch(/storage_path/);

    const checkout = read("app/components/store/CheckoutClient.tsx");
    expect(checkout).not.toMatch(/mintBuyerDigitalAccess|createSignedUrl/);

    expect(
      existsSync(join(ROOT, "app/components/store/BuyerDigitalAccessButton.tsx"))
    ).toBe(true);
    expect(read("app/components/store/OrderDetailView.tsx")).toMatch(
      /BuyerDigitalAccessButton/
    );
  });
});
