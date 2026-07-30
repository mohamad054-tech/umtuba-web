import { describe, expect, it, vi } from "vitest";
import {
  addToWishlist,
  isProductWishlisted,
  listWishlist,
  removeFromWishlist,
} from "./wishlist";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const PRODUCT_ID = "22222222-2222-4222-8222-222222222222";
const WISHLIST_ID = "33333333-3333-4333-8333-333333333333";

function createChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  for (const method of [
    "select",
    "insert",
    "delete",
    "eq",
    "order",
    "limit",
    "maybeSingle",
    "single",
  ]) {
    chain[method] = vi.fn(self);
  }
  chain.then = undefined;
  // Terminal helpers resolve the promise-like result for await supabase.from()
  (chain as { maybeSingle: () => Promise<unknown> }).maybeSingle = vi.fn(
    async () => result
  );
  (chain as { single: () => Promise<unknown> }).single = vi.fn(
    async () => result
  );
  // For list queries that await the builder directly
  Object.defineProperty(chain, "then", {
    value: (
      onFulfilled: (value: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => Promise.resolve(result).then(onFulfilled, onRejected),
  });
  return chain;
}

describe("wishlist adapter", () => {
  it("rejects invalid product ids on add/remove", async () => {
    const supabase = { from: vi.fn() };
    await expect(
      addToWishlist(supabase as never, USER_ID, "not-a-uuid")
    ).resolves.toEqual({ ok: false, message: "Product is invalid." });
    await expect(
      removeFromWishlist(supabase as never, USER_ID, "")
    ).resolves.toEqual({ ok: false, message: "Product is invalid." });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("addToWishlist is idempotent on unique violation", async () => {
    const insertChain = createChain({
      data: null,
      error: { code: "23505", message: "duplicate" },
    });
    const updateChain = createChain({
      data: { id: WISHLIST_ID },
      error: null,
    });
    // Prefer update() on the duplicate path (listing stamp refresh).
    (updateChain as { update: unknown }).update = vi.fn(() => updateChain);
    let calls = 0;
    const supabase = {
      from: vi.fn(() => {
        calls += 1;
        return calls === 1 ? insertChain : updateChain;
      }),
    };

    const result = await addToWishlist(supabase as never, USER_ID, PRODUCT_ID);
    expect(result).toEqual({ ok: true, data: { id: WISHLIST_ID } });
    expect((updateChain as { update: ReturnType<typeof vi.fn> }).update).toHaveBeenCalledWith({
      seller_listing_id: null,
    });
  });

  it("removeFromWishlist succeeds when delete has no error", async () => {
    const chain = createChain({ data: null, error: null });
    const supabase = { from: vi.fn(() => chain) };
    await expect(
      removeFromWishlist(supabase as never, USER_ID, PRODUCT_ID)
    ).resolves.toEqual({ ok: true, data: undefined });
  });

  it("isProductWishlisted fails closed for guests and invalid ids", async () => {
    await expect(
      isProductWishlisted({ from: vi.fn() } as never, null, PRODUCT_ID)
    ).resolves.toBe(false);
    await expect(
      isProductWishlisted({ from: vi.fn() } as never, USER_ID, "bad")
    ).resolves.toBe(false);
  });

  it("listWishlist drops non-public products (fail-closed)", async () => {
    const chain = createChain({
      data: [
        {
          id: WISHLIST_ID,
          created_at: "2026-01-01T00:00:00Z",
          product_id: PRODUCT_ID,
          store_products: {
            id: PRODUCT_ID,
            store_id: "44444444-4444-4444-8444-444444444444",
            title: "Hidden",
            slug: "hidden",
            status: "draft",
            moderation_status: "pending",
            product_type: "physical",
            short_description: null,
            description: null,
            category_id: null,
            brand_id: null,
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
            stores: {
              id: "44444444-4444-4444-8444-444444444444",
              slug: "shop",
              name: "Shop",
              logo_path: null,
              status: "active",
            },
          },
        },
      ],
      error: null,
    });
    const supabase = { from: vi.fn(() => chain) };
    const listed = await listWishlist(supabase as never, USER_ID);
    expect(listed.error).toBeNull();
    expect(listed.items).toEqual([]);
  });

  it("listWishlist returns empty with error message on query failure", async () => {
    const chain = createChain({
      data: null,
      error: { message: "boom" },
    });
    const supabase = { from: vi.fn(() => chain) };
    const listed = await listWishlist(supabase as never, USER_ID);
    expect(listed.items).toEqual([]);
    expect(listed.error).toMatch(/unable to load/i);
  });
});
