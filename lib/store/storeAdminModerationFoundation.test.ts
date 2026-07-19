import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isPlatformAdminUser } from "./adminAuth";
import {
  STORE_ADMIN_REVIEW_RPCS,
  assertProductModerationAction,
  assertSellerApplicationAction,
  assertStoreEligibleForProductApproval,
  mapStoreAdminRpcError,
  validateRejectionReason,
} from "./adminReview";
import { APP_ROUTES } from "../../app/lib/nav/routes";
import { PROTECTED_PREFIXES } from "../env/supabaseAuthGate";
import type { User } from "@supabase/supabase-js";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260809_store_admin_moderation_foundation_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function fakeUser(partial: Partial<User> & { id: string }): User {
  return {
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "",
    ...partial,
  } as User;
}

describe("store admin permissions", () => {
  it("denies unauthenticated and ordinary users via JWT hint helper", () => {
    expect(isPlatformAdminUser(null)).toBe(false);
    expect(
      isPlatformAdminUser(
        fakeUser({
          id: "u1",
          app_metadata: {},
        })
      )
    ).toBe(false);
    expect(
      isPlatformAdminUser(
        fakeUser({
          id: "u1",
          app_metadata: { role: "admin" },
        })
      )
    ).toBe(false);
  });

  it("recognizes platform admin JWT claims as UX hints only", () => {
    expect(
      isPlatformAdminUser(
        fakeUser({
          id: "u1",
          app_metadata: { platform_admin: true },
        })
      )
    ).toBe(true);
  });
});

describe("store admin workflow contracts", () => {
  it("allows approve/reject only from pending seller applications", () => {
    expect(assertSellerApplicationAction("pending", "approve").ok).toBe(true);
    expect(assertSellerApplicationAction("pending", "reject").ok).toBe(true);
    expect(assertSellerApplicationAction("approved", "approve").ok).toBe(false);
    expect(assertSellerApplicationAction("rejected", "reject").ok).toBe(false);
  });

  it("requires a rejection reason", () => {
    expect(validateRejectionReason("").ok).toBe(false);
    expect(validateRejectionReason("no").ok).toBe(false);
    expect(validateRejectionReason("Incomplete business details").ok).toBe(
      true
    );
  });

  it("allows product approve only when awaiting moderation", () => {
    expect(
      assertProductModerationAction("in_review", "pending", "approve").ok
    ).toBe(true);
    expect(
      assertProductModerationAction("active", "approved", "approve").ok
    ).toBe(false);
    expect(
      assertProductModerationAction("draft", "pending", "approve").ok
    ).toBe(false);
  });

  it("allows product approve only for active + verified stores", () => {
    expect(assertStoreEligibleForProductApproval("active", "verified").ok).toBe(
      true
    );
    expect(
      assertStoreEligibleForProductApproval("suspended", "verified").ok
    ).toBe(false);
    expect(assertStoreEligibleForProductApproval("hidden", "verified").ok).toBe(
      false
    );
    expect(
      assertStoreEligibleForProductApproval("active", "unverified").ok
    ).toBe(false);
    expect(assertStoreEligibleForProductApproval("active", "pending").ok).toBe(
      false
    );
  });

  it("maps store eligibility DB errors without exposing raw SQL", () => {
    expect(
      mapStoreAdminRpcError(
        'Store is not eligible for product approval',
        "Unable to approve product."
      )
    ).toBe("This store is not eligible for product approval.");
    expect(
      mapStoreAdminRpcError(
        'ERROR:  P0001: Store is not eligible for product approval\nCONTEXT: PL/pgSQL',
        "Unable to approve product."
      )
    ).toBe("This store is not eligible for product approval.");
    expect(
      mapStoreAdminRpcError("permission denied for table stores", "fallback")
    ).toBe("fallback");
  });

  it("supports suspend for pending or approved seller applications", () => {
    expect(assertSellerApplicationAction("pending", "suspend").ok).toBe(true);
    expect(assertSellerApplicationAction("approved", "suspend").ok).toBe(true);
    expect(assertSellerApplicationAction("suspended", "suspend").ok).toBe(
      false
    );
  });
});

describe("store admin migration + route protection", () => {
  it("ships admin moderation migration with platform-admin RPCs", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    const sql = read(MIGRATION);
    expect(sql).toMatch(/require_platform_admin/);
    expect(sql).toMatch(/is_platform_admin/);
    for (const rpc of STORE_ADMIN_REVIEW_RPCS) {
      expect(sql).toContain(rpc);
    }
    expect(sql).toMatch(
      /grant execute on function public\.admin_approve_seller_application\(uuid\) to authenticated, service_role;/
    );
    expect(sql).toMatch(
      /grant execute on function public\.admin_approve_store_product\(uuid\) to authenticated, service_role;/
    );
    expect(sql).not.toMatch(
      /grant execute on function public\.admin_approve_seller_application\(uuid\) to anon/
    );
    expect(sql).toMatch(/Rejection reason is required/);
    expect(sql).toMatch(/Product is not awaiting moderation/);
    expect(sql).toMatch(/Store is not eligible for product approval/);
    expect(sql).toMatch(/s\.status = 'active'/);
    expect(sql).toMatch(/s\.verification_status = 'verified'/);
    expect(sql).toMatch(/store_status is distinct from 'active'/);
    expect(sql).toMatch(/store_verification is distinct from 'verified'/);
    // Blocked approval must raise before the product UPDATE.
    const approveFn = sql.slice(
      sql.indexOf("create or replace function public.admin_approve_store_product")
    );
    const eligibilityIdx = approveFn.indexOf(
      "Store is not eligible for product approval"
    );
    const updateIdx = approveFn.indexOf("update public.store_products");
    expect(eligibilityIdx).toBeGreaterThan(-1);
    expect(updateIdx).toBeGreaterThan(eligibilityIdx);
    // Legacy service_role automation RPCs remain elsewhere; this migration
    // must not grant authenticated execute on them.
    expect(sql).not.toMatch(
      /grant execute on function public\.approve_seller_application/
    );
    expect(sql).not.toMatch(
      /grant execute on function public\.approve_store_product/
    );
  });

  it("excludes inactive/unverified stores from the approvable product queue", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(
      /-- Approvable queue: exclude inactive \/ suspended \/ unverified stores\./
    );
    expect(sql).toMatch(
      /and s\.status = 'active'\s*\n\s*and s\.verification_status = 'verified'/
    );
  });

  it("protects admin store routes under /admin", () => {
    expect(APP_ROUTES.adminStore).toBe("/admin/store");
    expect(APP_ROUTES.adminStoreSellers).toBe("/admin/store/sellers");
    expect(APP_ROUTES.adminStoreProducts).toBe("/admin/store/products");
    expect(PROTECTED_PREFIXES).toContain("/admin");
    expect(existsSync(join(ROOT, "app/admin/store/page.tsx"))).toBe(true);
    expect(existsSync(join(ROOT, "app/admin/store/sellers/page.tsx"))).toBe(
      true
    );
    expect(existsSync(join(ROOT, "app/admin/store/products/page.tsx"))).toBe(
      true
    );
  });

  it("gates admin pages and actions via DB RPC; keeps service-role out of app code", () => {
    const gate = read("app/admin/store/requireAdminStore.ts");
    const actions = read("app/actions/storeAdmin.ts");
    const auth = read("lib/store/adminAuth.ts");
    const review = read("lib/store/adminReview.ts");
    const queries = read("lib/store/adminQueries.ts");
    const menu = read("app/lib/nav/userMenuItems.ts");
    const top = read("app/components/AppTopNav.tsx");

    expect(auth).toMatch(/assertPlatformAdminDb/);
    expect(gate).toMatch(/assertPlatformAdminDb/);
    expect(actions).toMatch(/assertPlatformAdminDb/);
    expect(actions).toMatch(/requirePlatformAdmin/);
    expect(actions).toMatch(/approveSellerApplicationAction/);
    expect(actions).toMatch(/rejectSellerApplicationAction/);
    expect(actions).toMatch(/approveStoreProductAction/);
    expect(actions).not.toMatch(/formData\.get\(["']reviewer/);
    expect(review).toMatch(/admin_approve_seller_application/);
    expect(review).toMatch(/admin_reject_seller_application/);
    expect(review).toMatch(/admin_approve_store_product/);
    expect(queries).toMatch(/admin_store_moderation_queue_counts/);
    expect(actions).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(review).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(queries).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(gate).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(menu).not.toMatch(/adminStore/);
    expect(top).not.toMatch(/adminStore/);
  });

  it("documents reject reason requirement in the reject seller action", () => {
    const actions = read("app/actions/storeAdmin.ts");
    expect(actions).toMatch(/validateRejectionReason/);
    expect(actions).toMatch(/rejectSellerApplicationAction/);
  });
});

describe("unrelated store foundations remain intact", () => {
  it("keeps marketplace and cart foundation migrations and routes", () => {
    expect(
      existsSync(
        join(
          ROOT,
          "supabase/migrations/20260802_store_marketplace_foundation_v1.sql"
        )
      )
    ).toBe(true);
    expect(
      existsSync(
        join(ROOT, "supabase/migrations/20260729_store_cart_foundation_v1.sql")
      )
    ).toBe(true);
    expect(APP_ROUTES.store).toBe("/store");
    expect(APP_ROUTES.storeCart).toBe("/store/cart");
    expect(APP_ROUTES.storeWishlist).toBe("/store/wishlist");
    expect(APP_ROUTES.sellerApply).toBe("/seller/apply");
  });
});
