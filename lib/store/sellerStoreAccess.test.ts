import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isApprovedSellerStore,
  isSellerApplicationAwaitingReview,
  resolveSellerStoreAccess,
  sellerStoreAccessRedirectPath,
} from "./sellerStoreAccess";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function membership(status: string, verification: string) {
  return { store: { status, verification_status: verification } };
}

describe("seller store access resolution", () => {
  it("grants full Seller Center only for active + verified stores", () => {
    expect(
      isApprovedSellerStore({
        storeStatus: "active",
        verificationStatus: "verified",
      })
    ).toBe(true);
    expect(
      isApprovedSellerStore({
        storeStatus: "active",
        verificationStatus: "unverified",
      })
    ).toBe(false);
    expect(
      isApprovedSellerStore({
        storeStatus: "suspended",
        verificationStatus: "verified",
      })
    ).toBe(false);
  });

  it("treats pending and pending_review application labels as awaiting review", () => {
    expect(isSellerApplicationAwaitingReview("pending")).toBe(true);
    expect(isSellerApplicationAwaitingReview("pending_review")).toBe(true);
    expect(isSellerApplicationAwaitingReview("draft")).toBe(false);
    expect(isSellerApplicationAwaitingReview("approved")).toBe(false);
  });

  it("keeps pending sellers on setup/pending surfaces only", () => {
    expect(
      resolveSellerStoreAccess({
        membership: null,
        application: { status: "pending" },
      })
    ).toBe("pending_review");
    expect(
      resolveSellerStoreAccess({
        membership: null,
        application: { status: "pending_review" },
      })
    ).toBe("pending_review");
    expect(
      resolveSellerStoreAccess({
        membership: membership("active", "unverified"),
        application: { status: "pending" },
      })
    ).toBe("pending_review");
    expect(sellerStoreAccessRedirectPath("pending_review")).toBe("/seller");
  });

  it("sends draft / never-applied users to setup, not Seller Center", () => {
    expect(
      resolveSellerStoreAccess({ membership: null, application: null })
    ).toBe("setup");
    expect(
      resolveSellerStoreAccess({
        membership: null,
        application: { status: "draft" },
      })
    ).toBe("setup");
    expect(sellerStoreAccessRedirectPath("setup")).toBe("/seller/setup");
  });

  it("does not treat rejected or suspended as approved", () => {
    expect(
      resolveSellerStoreAccess({
        membership: null,
        application: { status: "rejected" },
      })
    ).toBe("rejected");
    expect(
      resolveSellerStoreAccess({
        membership: membership("suspended", "verified"),
        application: { status: "approved" },
      })
    ).toBe("suspended");
    expect(sellerStoreAccessRedirectPath("rejected")).toBe("/seller");
    expect(sellerStoreAccessRedirectPath("suspended")).toBe("/seller");
  });

  it("allows approved verified membership into Seller Center", () => {
    expect(
      resolveSellerStoreAccess({
        membership: membership("active", "verified"),
        application: { status: "approved" },
      })
    ).toBe("approved");
    expect(sellerStoreAccessRedirectPath("approved")).toBe("/seller/store");
  });
});

describe("seller store access wiring", () => {
  it("gates every /seller/store route through the approved-store layout", () => {
    const layout = read("app/seller/store/layout.tsx");
    const gate = read("app/seller/store/requireApprovedSellerStore.ts");
    const hub = read("app/seller/page.tsx");

    expect(existsSync(join(ROOT, "app/seller/store/layout.tsx"))).toBe(true);
    expect(layout).toMatch(/requireApprovedSellerStoreSession/);
    expect(gate).toMatch(/resolveSellerStoreAccess/);
    expect(gate).toMatch(/sellerStoreAccessRedirectPath/);
    expect(gate).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(hub).toMatch(/resolveSellerStoreAccess/);
    expect(hub).toMatch(/access === "approved"/);
  });
});
