/**
 * Focused regression tests for Marketplace Listing Provenance Hardening V1.
 */

import { describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { buildStoreProductIdHref } from "../../app/lib/nav/routes";
import {
  getPublicProductById,
  resolvePublicProductByListingId,
} from "./catalogQueries";
import {
  assertOptionalSellerListingId,
  buildStoreProductIdHrefWithListing,
  catalogItemBuyerPdpPath,
  parseSellerListingIdFromSearchParam,
  STORE_PRODUCT_LISTING_QUERY_PARAM,
} from "./listingProvenance";
import { addToWishlist, listWishlist } from "./wishlist";

const ROOT = join(__dirname, "../..");
const MIGRATION =
  "supabase/migrations/20260875_store_marketplace_listing_provenance_hardening_v1.sql";

const USER = "11111111-1111-4111-8111-111111111111";
const PRODUCT = "22222222-2222-4222-8222-222222222222";
const LISTING = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_LISTING = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const OWNER_STORE = "33333333-3333-4333-8333-333333333333";
const SELLER_STORE = "44444444-4444-4444-8444-444444444444";
const VARIANT = "55555555-5555-4555-8555-555555555555";
const WISHLIST_ID = "66666666-6666-4666-8666-666666666666";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Listing provenance hardening — migration", () => {
  it("ships as 20260875 after marketplace checkout alignment", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(readdirSync(join(ROOT, "supabase/migrations"))).toContain(
      "20260875_store_marketplace_listing_provenance_hardening_v1.sql"
    );
    const sql = read(MIGRATION);
    expect(sql).toMatch(/seller_listing_id/);
    expect(sql).toMatch(/store_wishlist_items/);
    expect(sql).toMatch(/store_seller_listings/);
    expect(sql).not.toMatch(/create table/i);
  });
});

describe("Listing provenance — pure helpers", () => {
  it("rejects malformed and ambiguous listing identity fail-closed", () => {
    expect(assertOptionalSellerListingId(null)).toEqual({
      ok: true,
      sellerListingId: null,
    });
    expect(assertOptionalSellerListingId("not-uuid").ok).toBe(false);
    expect(parseSellerListingIdFromSearchParam([LISTING, OTHER_LISTING]).ok).toBe(
      false
    );
    expect(parseSellerListingIdFromSearchParam(LISTING)).toEqual({
      ok: true,
      sellerListingId: LISTING,
    });
  });

  it("id href carries listing query when present", () => {
    expect(buildStoreProductIdHref(PRODUCT)).toBe(`/store/products/${PRODUCT}`);
    expect(buildStoreProductIdHref(PRODUCT, LISTING)).toBe(
      `/store/products/${PRODUCT}?listing=${LISTING}`
    );
    expect(buildStoreProductIdHrefWithListing(PRODUCT, LISTING)).toContain(
      `${STORE_PRODUCT_LISTING_QUERY_PARAM}=`
    );
    expect(
      catalogItemBuyerPdpPath({
        storeSlug: "reseller",
        productSlug: "widget",
      })
    ).toBe("/store/reseller/product/widget");
  });
});

describe("Listing provenance — id-based PDP resolution", () => {
  it("owned path resolves owner store without listing", async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: PRODUCT,
                slug: "widget",
                status: "active",
                moderation_status: "approved",
                stores: { slug: "supplier", status: "active" },
              },
              error: null,
            }),
          }),
        }),
      })),
      rpc: vi.fn(),
    };
    const resolved = await getPublicProductById(supabase as never, PRODUCT);
    expect(resolved).toEqual({
      storeSlug: "supplier",
      productSlug: "widget",
      sellerListingId: null,
    });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("listing path resolves seller storefront and stamps listing id", async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "store_seller_listings") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: LISTING,
                    status: "active",
                    source_product_id: PRODUCT,
                    seller_store_id: SELLER_STORE,
                    supplier_store_id: OWNER_STORE,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "store_products") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: PRODUCT,
                    slug: "widget",
                    status: "active",
                    moderation_status: "approved",
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "stores") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: SELLER_STORE,
                      slug: "reseller",
                      status: "active",
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
      rpc: vi.fn(async () => ({ data: true, error: null })),
    };

    const resolved = await resolvePublicProductByListingId(
      supabase as never,
      PRODUCT,
      LISTING
    );
    expect(resolved).toEqual({
      storeSlug: "reseller",
      productSlug: "widget",
      sellerListingId: LISTING,
    });
    expect(supabase.rpc).toHaveBeenCalledWith("store_listing_allows_seller_sale", {
      p_seller_store_id: SELLER_STORE,
      p_product_id: PRODUCT,
      p_listing_id: LISTING,
    });
  });

  it("mismatched listing→product fails closed (no owned fallback)", async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: LISTING,
                status: "active",
                source_product_id: OTHER_LISTING,
                seller_store_id: SELLER_STORE,
                supplier_store_id: OWNER_STORE,
              },
              error: null,
            }),
          }),
        }),
      })),
      rpc: vi.fn(),
    };
    const resolved = await getPublicProductById(supabase as never, PRODUCT, {
      sellerListingId: LISTING,
    });
    expect(resolved).toBeNull();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});

describe("Listing provenance — wishlist → PDP", () => {
  it("addToWishlist rejects invalid listing identity", async () => {
    const result = await addToWishlist(
      { from: vi.fn(), rpc: vi.fn() } as never,
      USER,
      PRODUCT,
      "bad-listing"
    );
    expect(result.ok).toBe(false);
  });

  it("addToWishlist stamps seller_listing_id when listing is valid", async () => {
    const insertPayload: Record<string, unknown>[] = [];
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "store_seller_listings") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: LISTING,
                    status: "active",
                    source_product_id: PRODUCT,
                    seller_store_id: SELLER_STORE,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "store_wishlist_items") {
          return {
            insert: (payload: Record<string, unknown>) => {
              insertPayload.push(payload);
              return {
                select: () => ({
                  single: async () => ({
                    data: { id: WISHLIST_ID },
                    error: null,
                  }),
                }),
              };
            },
          };
        }
        throw new Error(`unexpected ${table}`);
      }),
      rpc: vi.fn(async () => ({ data: true, error: null })),
    };

    const result = await addToWishlist(
      supabase as never,
      USER,
      PRODUCT,
      LISTING
    );
    expect(result.ok).toBe(true);
    expect(insertPayload[0]).toMatchObject({
      user_id: USER,
      product_id: PRODUCT,
      seller_listing_id: LISTING,
    });
  });

  it("listWishlist drops invalid listing provenance fail-closed", async () => {
    const chain: Record<string, unknown> = {};
    const self = () => chain;
    for (const method of ["select", "eq", "order", "limit"]) {
      chain[method] = vi.fn(self);
    }
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => unknown) =>
        Promise.resolve(
          resolve({
            data: [
              {
                id: WISHLIST_ID,
                created_at: "2026-01-01T00:00:00Z",
                product_id: PRODUCT,
                seller_listing_id: "not-a-uuid",
                store_products: {
                  id: PRODUCT,
                  store_id: OWNER_STORE,
                  title: "Widget",
                  slug: "widget",
                  status: "active",
                  moderation_status: "approved",
                  product_type: "physical",
                  short_description: null,
                  description: null,
                  category_id: null,
                  brand_id: null,
                  created_at: "2026-01-01T00:00:00Z",
                  updated_at: "2026-01-01T00:00:00Z",
                  stores: {
                    id: OWNER_STORE,
                    slug: "supplier",
                    name: "Supplier",
                    logo_path: null,
                    status: "active",
                  },
                },
              },
            ],
            error: null,
          })
        ),
    });

    const listed = await listWishlist(
      { from: vi.fn(() => chain), rpc: vi.fn() } as never,
      USER
    );
    expect(listed.error).toBeNull();
    expect(listed.items).toEqual([]);
  });
});

describe("Listing provenance — cart / checkout continuity contracts", () => {
  it("cart add + summary preserve seller_listing_id field names", () => {
    const cartSrc = read("lib/store/cart.ts");
    expect(cartSrc).toMatch(/seller_listing_id/);
    expect(cartSrc).toMatch(/sellerListingId/);
    expect(cartSrc).toMatch(/stampedListingId/);
    const checkoutSql = read(
      "supabase/migrations/20260870_store_marketplace_listing_checkout_alignment_v1.sql"
    );
    expect(checkoutSql).toMatch(/seller_listing_id/);
    expect(checkoutSql).toMatch(/ci\.seller_listing_id/);
  });

  it("marketplace listing → cart stamp contract remains listing-aware", () => {
    const pdp = read(
      "app/store/[storeSlug]/product/[productSlug]/ProductDetailClient.tsx"
    );
    expect(pdp).toMatch(/sellerListingId:\s*detail\.sellerListingId/);
    expect(pdp).toMatch(/sellerListingId=\{detail\.sellerListingId/);
    const card = read("app/components/store/ProductCard.tsx");
    expect(card).toMatch(/sellerListingId=\{item\.sellerListingId/);
  });

  it("direct non-marketplace products remain valid without listing", () => {
    expect(assertOptionalSellerListingId(undefined)).toEqual({
      ok: true,
      sellerListingId: null,
    });
    expect(buildStoreProductIdHref(PRODUCT, null)).toBe(
      `/store/products/${PRODUCT}`
    );
    expect(VARIANT).toMatch(/5555/);
  });
});
