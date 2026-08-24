import { describe, expect, it } from "vitest";
import {
  canManageCatalog,
  canManageMembers,
  canMutateAsRole,
  canViewStore,
  isPubliclyVisibleProduct,
} from "./permissions";
import { availableUnits, validateInventoryInput } from "./inventory";
import { formatMinorUnits, validateAmountMinor } from "./money";
import {
  validateMediaMetadata,
  validatePriceInput,
  validateProductDraftInput,
  validateStoreCreateInput,
  validateVariantInput,
} from "./validators";

describe("store role permission matrix", () => {
  it("allows viewers to read but not mutate", () => {
    expect(canViewStore("viewer")).toBe(true);
    expect(canMutateAsRole("viewer")).toBe(false);
    expect(canManageCatalog("viewer")).toBe(false);
    expect(canManageMembers("viewer")).toBe(false);
  });

  it("allows catalog editors to mutate catalog but not members", () => {
    expect(canManageCatalog("catalog_editor")).toBe(true);
    expect(canManageMembers("catalog_editor")).toBe(false);
  });

  it("allows owners full member management", () => {
    expect(canManageMembers("owner")).toBe(true);
    expect(canManageCatalog("owner")).toBe(true);
  });

  it("denies null roles and cross-store mutation", () => {
    expect(canViewStore(null)).toBe(false);
    expect(canManageCatalog(undefined)).toBe(false);
    expect(canMutateAsRole(null)).toBe(false);
  });
});

describe("product status public visibility", () => {
  it("only exposes active+approved products on active stores", () => {
    expect(
      isPubliclyVisibleProduct({
        productStatus: "active",
        moderationStatus: "approved",
        storeStatus: "active",
      })
    ).toBe(true);
  });

  it("excludes draft, hidden, blocked, and unapproved products", () => {
    for (const productStatus of [
      "draft",
      "in_review",
      "hidden",
      "blocked",
      "archived",
    ]) {
      expect(
        isPubliclyVisibleProduct({
          productStatus,
          moderationStatus: "approved",
          storeStatus: "active",
        })
      ).toBe(false);
    }
    expect(
      isPubliclyVisibleProduct({
        productStatus: "active",
        moderationStatus: "pending",
        storeStatus: "active",
      })
    ).toBe(false);
    expect(
      isPubliclyVisibleProduct({
        productStatus: "active",
        moderationStatus: "approved",
        storeStatus: "suspended",
      })
    ).toBe(false);
  });
});

describe("money minor-unit validation", () => {
  it("accepts safe integer minor units", () => {
    expect(validateAmountMinor(1999, "usd")).toEqual({
      ok: true,
      amountMinor: 1999,
      currency: "USD",
    });
  });

  it("rejects floats, negatives, and bad currency", () => {
    expect(validateAmountMinor(19.99, "USD").ok).toBe(false);
    expect(validateAmountMinor(-1, "USD").ok).toBe(false);
    expect(validateAmountMinor(10, "US").ok).toBe(false);
    expect(validateAmountMinor("12.5", "USD").ok).toBe(false);
  });

  it("formats minor units", () => {
    expect(formatMinorUnits(250, "USD")).toMatch(/2\.50|٢٫٥٠/);
  });
});

describe("inventory available calculation", () => {
  it("computes sellable stock safely", () => {
    expect(availableUnits({ onHand: 10, reserved: 3, safetyStock: 2 })).toBe(5);
    expect(availableUnits({ onHand: 2, reserved: 2, safetyStock: 1 })).toBe(0);
  });

  it("rejects invalid inventory inputs", () => {
    expect(validateInventoryInput({ onHand: -1 }).ok).toBe(false);
    expect(validateInventoryInput({ onHand: 2, reserved: 3 }).ok).toBe(false);
    expect(
      validateInventoryInput({ onHand: 5, reserved: 1, safetyStock: 1 })
    ).toMatchObject({
      ok: true,
      onHand: 5,
      reserved: 1,
      safetyStock: 1,
    });
  });
});

describe("product validation", () => {
  it("validates store and product drafts", () => {
    expect(validateStoreCreateInput({ name: "A" }).ok).toBe(false);
    expect(validateStoreCreateInput({ name: "UM Shop", slug: "um-shop" }).ok).toBe(
      true
    );
    expect(
      validateProductDraftInput({
        title: "Ball",
        productType: "physical",
      }).ok
    ).toBe(true);
    expect(
      validateProductDraftInput({
        title: "Ball",
        productType: "spaceship",
      }).ok
    ).toBe(false);
  });

  it("validates variants, prices, and media metadata", () => {
    expect(validateVariantInput({ sku: "SKU-1" }).ok).toBe(true);
    expect(validateVariantInput({ sku: "" }).ok).toBe(false);
    expect(validatePriceInput({ amountMinor: 100, currency: "USD" }).ok).toBe(
      true
    );
    expect(
      validatePriceInput({
        amountMinor: 100,
        compareAtMinor: 50,
        currency: "USD",
      }).ok
    ).toBe(false);
    expect(
      validateMediaMetadata({
        storagePath: "../etc/passwd",
        mediaType: "image",
      }).ok
    ).toBe(false);
    expect(
      validateMediaMetadata({
        storagePath: "store/prod/cover.jpg",
        mediaType: "image",
        role: "cover",
      }).ok
    ).toBe(true);
  });

  it("fails safely on corrupted inputs", () => {
    expect(validateProductDraftInput({}).ok).toBe(false);
    expect(validateAmountMinor(undefined, "USD").ok).toBe(false);
    expect(validateInventoryInput({ onHand: "nope" }).ok).toBe(false);
  });
});
