import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PROTECTED_PREFIXES, isProtectedPath } from "../env/supabaseAuthGate";
import { PRODUCT_STATUSES, PRODUCT_TYPES } from "./types";
import { canManageSellerCatalog } from "./sellerApplications";
import {
  APP_ROUTES,
  buildSellerProductHref,
  buildStoreProductIdHref,
  buildStoreShopIdHref,
} from "../../app/lib/nav/routes";

const ROOT = process.cwd();

function readRepoFile(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("marketplace foundation migration contracts", () => {
  const sql = readRepoFile(
    "supabase/migrations/20260802_store_marketplace_foundation_v1.sql"
  );

  it("ships a seller applications table with a fail-closed review workflow", () => {
    expect(sql).toMatch(/create table if not exists public\.seller_applications/);
    expect(sql).toMatch(
      /check \(status in \('pending', 'approved', 'rejected', 'suspended'\)\)/
    );
    expect(sql).toMatch(/seller_applications_one_open_per_user_uidx/);
    expect(sql).toMatch(/approve_seller_application/);
    expect(sql).toMatch(/reject_seller_application/);
    expect(sql).toMatch(/suspend_seller_application/);
    expect(sql).toMatch(/auth\.role\(\) is distinct from 'service_role'/);
    expect(sql).toMatch(
      /revoke all on function public\.approve_seller_application\(uuid\) from anon, authenticated;/
    );
    expect(sql).toMatch(
      /grant execute on function public\.approve_seller_application\(uuid\) to service_role;/
    );
  });

  it("adds public store profile fields (city + contacts)", () => {
    expect(sql).toMatch(/add column if not exists city text/);
    expect(sql).toMatch(/add column if not exists public_contact_email text/);
    expect(sql).toMatch(/add column if not exists public_contact_phone text/);
    expect(sql).toMatch(/add column if not exists public_contact_url text/);
  });

  it("adds category sort order and orders by it", () => {
    expect(sql).toMatch(
      /alter table public\.product_categories\s+add column if not exists sort_order integer/
    );
  });

  it("expands product type/status and adds logistics + verified-store gating", () => {
    expect(sql).toMatch(/'physical', 'digital', 'service', 'subscription', 'bundle', 'booking'/);
    expect(sql).toMatch(
      /'draft', 'in_review', 'pending_review', 'active', 'rejected',\s*\n\s*'paused', 'hidden', 'blocked', 'archived'/
    );
    expect(sql).toMatch(/add column if not exists weight_grams integer/);
    expect(sql).toMatch(/add column if not exists origin_country_code text/);
    expect(sql).toMatch(/sync_store_product_item_type/);
    expect(sql).toMatch(/enforce_verified_store_for_products/);
    expect(sql).toMatch(/Store must be verified before managing products/);
  });

  it("ships a wishlist table with owner-only RLS", () => {
    expect(sql).toMatch(/create table if not exists public\.store_wishlist_items/);
    expect(sql).toMatch(/store_wishlist_items_unique_product/);
    expect(sql).toMatch(/"Users manage own wishlist items"/);
    expect(sql).toMatch(
      /revoke delete on public\.store_wishlist_items from anon;/
    );
  });

  it("enables RLS on every new table", () => {
    expect(sql).toMatch(
      /alter table public\.seller_applications enable row level security;/
    );
    expect(sql).toMatch(
      /alter table public\.store_wishlist_items enable row level security;/
    );
  });
});

describe("marketplace foundation domain types", () => {
  it("adds booking to product types and expands product statuses", () => {
    expect(PRODUCT_TYPES).toContain("booking");
    expect(PRODUCT_STATUSES).toContain("pending_review");
    expect(PRODUCT_STATUSES).toContain("paused");
    expect(PRODUCT_STATUSES).toContain("rejected");
  });
});

describe("seller catalog gate", () => {
  it("requires both a catalog role and a verified store", () => {
    expect(
      canManageSellerCatalog({
        role: "catalog_editor",
        storeVerificationStatus: "verified",
      })
    ).toBe(true);
    expect(
      canManageSellerCatalog({
        role: "catalog_editor",
        storeVerificationStatus: "unverified",
      })
    ).toBe(false);
    expect(
      canManageSellerCatalog({ role: "viewer", storeVerificationStatus: "verified" })
    ).toBe(false);
    expect(
      canManageSellerCatalog({ role: null, storeVerificationStatus: "verified" })
    ).toBe(false);
  });
});

describe("marketplace foundation routes", () => {
  it("adds seller and wishlist routes", () => {
    expect(APP_ROUTES.seller).toBe("/seller");
    expect(APP_ROUTES.sellerApply).toBe("/seller/apply");
    expect(APP_ROUTES.sellerProducts).toBe("/seller/products");
    expect(APP_ROUTES.storeWishlist).toBe("/store/wishlist");
  });

  it("builds id-based store/product redirect hrefs", () => {
    const productId = "11111111-1111-1111-1111-111111111111";
    const storeId = "22222222-2222-2222-2222-222222222222";
    expect(buildStoreProductIdHref(productId)).toBe(`/store/products/${productId}`);
    expect(buildStoreShopIdHref(storeId)).toBe(`/store/shops/${storeId}`);
    expect(buildSellerProductHref(productId)).toBe(
      `/seller/store/products/${productId}/edit`
    );
  });

  it("sanitizes non-UUID ids to avoid path injection", () => {
    expect(buildStoreProductIdHref("../../etc/passwd")).toBe("/store/products/");
  });
});

describe("marketplace foundation auth gate", () => {
  it("protects the seller area and the wishlist, keeps public store browsable", () => {
    expect(PROTECTED_PREFIXES).toContain("/seller");
    expect(PROTECTED_PREFIXES).toContain("/store/wishlist");
    expect(isProtectedPath("/seller")).toBe(true);
    expect(isProtectedPath("/seller/apply")).toBe(true);
    expect(isProtectedPath("/store/wishlist")).toBe(true);
    expect(isProtectedPath("/store")).toBe(false);
    expect(isProtectedPath(`/store/${"acme"}`)).toBe(false);
  });
});

describe("store creation redirects to the seller application", () => {
  it("sellerStore.createStoreForUser fails closed and points at /seller/apply", () => {
    const src = readRepoFile("lib/store/sellerStore.ts");
    expect(src).toMatch(/export async function createStoreForUser/);
    expect(src).toMatch(/ok: false/);
    expect(src).toMatch(/\/seller\/apply/);
  });

  it("storeCatalog.createStoreAction redirects to /seller/apply and drops the direct-create import", () => {
    const src = readRepoFile("app/actions/storeCatalog.ts");
    expect(src).toMatch(/export async function createStoreAction/);
    expect(src).toMatch(/redirect\(APP_ROUTES\.sellerApply\)/);
    expect(src).not.toMatch(/createStoreForUser/);
  });

  it("createDraftProduct is gated on a verified store", () => {
    const src = readRepoFile("lib/store/sellerStore.ts");
    expect(src).toMatch(/canManageSellerCatalog/);
    expect(src).toMatch(/verification_status/);
  });
});

describe("Arabic shop CTA", () => {
  it("ShopBadge shows the Arabic shop-products CTA with a visible count", () => {
    const badge = readRepoFile("app/components/video/commerce/ShopBadge.tsx");
    expect(badge).toMatch(/تسوّق المنتجات/);
    expect(badge).toMatch(/count <= 0/);
    expect(badge).toMatch(/\{count\}/);
  });
});

describe("wishlist domain module", () => {
  it("exposes list/add/remove/isProductWishlisted", () => {
    const src = readRepoFile("lib/store/wishlist.ts");
    expect(src).toMatch(/export async function listWishlist/);
    expect(src).toMatch(/export async function addToWishlist/);
    expect(src).toMatch(/export async function removeFromWishlist/);
    expect(src).toMatch(/export async function isProductWishlisted/);
  });
});

describe("seller applications domain module", () => {
  it("exposes applyToBecomeSeller/getLatestSellerApplication/canManageSellerCatalog", () => {
    const src = readRepoFile("lib/store/sellerApplications.ts");
    expect(src).toMatch(/export async function applyToBecomeSeller/);
    expect(src).toMatch(/export async function getLatestSellerApplication/);
    expect(src).toMatch(/export function canManageSellerCatalog/);
  });
});
