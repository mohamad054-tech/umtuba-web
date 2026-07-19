import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PROTECTED_PREFIXES, isProtectedPath } from "../env/supabaseAuthGate";
import { APP_ROUTES } from "../../app/lib/nav/routes";
import {
  CHECKOUT_MULTI_STORE_POLICY,
  assertCheckoutGrandNonNegative,
  assertNoClientMoneyFields,
  computeCouponDiscountMinor,
  computeShippingFeeMinor,
  computeStoreCheckoutGrandTotalMinor,
  computeTaxMinor,
  evaluateCheckoutLineEligibility,
  groupCartItemsByStore,
  isCheckoutQuoteExpired,
  validateCheckoutAddress,
} from "./checkoutRules";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260812_store_checkout_foundation_v1.sql";
const ORDERS_MIGRATION =
  "supabase/migrations/20260811_store_orders_foundation_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("checkout foundation migration contracts", () => {
  it("ships checkout migration after orders foundation", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, ORDERS_MIGRATION))).toBe(true);
    expect(MIGRATION).toContain("20260812");
  });

  it("creates address, shipping, tax, coupon, quote tables with RLS", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/create table if not exists public\.buyer_addresses/);
    expect(sql).toMatch(/create table if not exists public\.store_shipping_methods/);
    expect(sql).toMatch(/create table if not exists public\.store_tax_configs/);
    expect(sql).toMatch(/create table if not exists public\.store_coupons/);
    expect(sql).toMatch(/create table if not exists public\.store_coupon_redemptions/);
    expect(sql).toMatch(/create table if not exists public\.checkout_quotes/);
    expect(sql).toMatch(/create table if not exists public\.order_discounts/);
    expect(sql).toMatch(/force row level security/);
    expect(sql).toMatch(/revoke all on public\.store_coupons from anon, public, authenticated/);
  });

  it("ships quote/confirm RPCs and owner-only order core without GUC", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/create_store_checkout_quote/);
    expect(sql).toMatch(/confirm_store_checkout_quote/);
    expect(sql).toMatch(/create_store_order_foundation_core/);
    expect(sql).not.toMatch(/umtuba\.allow_checkout_order/);
    expect(sql).not.toMatch(/set_config\(\s*'umtuba\.allow_checkout_order'/);
    expect(sql).toMatch(
      /order_id := public\.create_store_order_foundation_core\(/
    );
    expect(sql).toMatch(/Insufficient inventory for checkout/);
    expect(sql).toMatch(/Payment collection is not enabled yet/);
    expect(sql.toLowerCase()).not.toMatch(/stripe|paypal|hyperpay|myfatoorah|\btap\b/);
  });

  it("extends order snapshots as set-once immutable", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/shipping_address_snapshot/);
    expect(sql).toMatch(/Order checkout snapshots are immutable once set/);
  });
});

describe("RPC security contracts", () => {
  it("marks checkout RPCs SECURITY DEFINER with search_path = public", () => {
    const sql = read(MIGRATION);
    for (const name of [
      "create_store_checkout_quote",
      "confirm_store_checkout_quote",
      "create_store_order_foundation_core",
      "checkout_validate_coupon",
      "checkout_compute_shipping_fee",
      "checkout_compute_tax",
    ]) {
      const idx = sql.indexOf(`function public.${name}`);
      expect(idx).toBeGreaterThan(-1);
      const slice = sql.slice(idx, idx + 800);
      expect(slice).toMatch(/security definer/i);
      expect(slice).toMatch(/set search_path = public/);
    }
  });

  it("revokes EXECUTE from PUBLIC/anon on helpers and core", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(
      /revoke all on function public\.checkout_normalize_address\(jsonb\)\s+from public, anon, authenticated/
    );
    expect(sql).toMatch(
      /revoke all on function public\.create_store_order_foundation_core\([\s\S]*?\) from public, anon, authenticated, service_role/
    );
    expect(sql).toMatch(
      /revoke all on function public\.create_store_checkout_quote[\s\S]*?from public, anon/
    );
    expect(sql).toMatch(
      /revoke all on function public\.confirm_store_checkout_quote\(uuid\) from public, anon/
    );
  });

  it("rejects client money fields and derives catalog prices in core", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/unit_price_minor/);
    expect(sql).toMatch(/Reject client-supplied priced\/snapshot\/total fields/);
    expect(sql).toMatch(/Active price not found/);
  });

  it("does not expose a GUC bypass for order create", () => {
    const sql = read(MIGRATION);
    expect(sql).not.toMatch(/allow_checkout_order/);
    expect(sql).toMatch(/no GUC bypass/);
    expect(sql).toMatch(/service_role required to create store orders/);
  });
});

describe("buyer address + quote RLS", () => {
  it("scopes buyer addresses to auth.uid() with WITH CHECK", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/Buyers manage own addresses/);
    expect(sql).toMatch(/user_id = \(select auth\.uid\(\)\)/);
    expect(sql).toMatch(/with check \(/);
  });

  it("lets buyers read only own quotes and blocks client writes", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/Buyers read own checkout quotes/);
    expect(sql).toMatch(
      /revoke insert, update, delete on public\.checkout_quotes from authenticated/
    );
  });

  it("keeps coupon tables locked from authenticated clients", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(
      /revoke all on public\.store_coupons from anon, public, authenticated/
    );
    expect(sql).toMatch(/Buyers read own coupon redemptions/);
  });
});

describe("quote expiry + idempotency + confirm hardening", () => {
  it("enforces expired quotes cannot be confirmed", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/Checkout quote has expired/);
    expect(sql).toMatch(/expires_at <= timezone\('utc', now\(\)\)/);
    expect(sql).toMatch(/set status = 'expired'/);
  });

  it("rejects expired/confirmed idempotency key reuse for new open quotes", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/Only open, non-expired quotes are reusable/);
    expect(sql).toMatch(/Checkout quote idempotency key already used/);
  });

  it("recalculates live totals and rejects catalog/shipping/tax/coupon drift", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/Catalog prices changed since quote; refresh checkout/);
    expect(sql).toMatch(/Shipping fee changed since quote; refresh checkout/);
    expect(sql).toMatch(/Tax changed since quote; refresh checkout/);
    expect(sql).toMatch(/Coupon totals changed since quote; refresh checkout/);
    expect(sql).toMatch(/Checkout totals changed since quote; refresh checkout/);
  });

  it("returns idempotent confirm for already-confirmed quotes", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/'idempotent', true/);
    expect(sql).toMatch(/q\.status = 'confirmed'/);
  });

  it("locks inventory rows and rejects insufficient stock races", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/from public\.product_inventory inv/);
    expect(sql).toMatch(/for update/);
    expect(sql).toMatch(/Insufficient inventory for checkout/);
  });
});

describe("shipping / tax / coupon SQL contracts", () => {
  it("derives shipping server-side and rejects invalid methods", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/checkout_compute_shipping_fee/);
    expect(sql).toMatch(/Shipping method not found/);
    expect(sql).toMatch(/Shipping method not available/);
    expect(sql).toMatch(/free_above_subtotal_minor/);
  });

  it("uses integer minor-unit tax math with inclusive/exclusive paths", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/rate_bps/);
    expect(sql).toMatch(/tax_minor/);
    expect(sql).toMatch(/inclusive/);
    expect(sql).not.toMatch(/\bdouble precision\b/);
    expect(sql).not.toMatch(/\breal\b.*tax/i);
  });

  it("enforces coupon limits under row lock and unique order redemption", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/for update/);
    expect(sql).toMatch(/Coupon usage limit reached/);
    expect(sql).toMatch(/Coupon per-user limit reached/);
    expect(sql).toMatch(/Coupon usage limit race/);
    expect(sql).toMatch(
      /constraint store_coupon_redemptions_coupon_order_uidx unique \(coupon_id, order_id\)/
    );
    expect(sql).toMatch(/At most one coupon redemption per checkout quote/);
  });
});

describe("multi-store atomic rollback", () => {
  it("documents and implements all-or-nothing confirm", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/ATOMIC/i);
    expect(sql).toMatch(/rolls back every store/);
    expect(CHECKOUT_MULTI_STORE_POLICY.mode).toBe("atomic_across_stores");
  });
});

describe("checkout address validation", () => {
  it("accepts a valid international address", () => {
    const result = validateCheckoutAddress({
      full_name: "Ada Lovelace",
      phone: "+1 202-555-0100",
      email: "ada@example.com",
      country_code: "us",
      region: "DC",
      city: "Washington",
      postal_code: "20001",
      address_line1: "1 Analytics Ave",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.address.country_code).toBe("US");
  });

  it("rejects incomplete addresses", () => {
    expect(
      validateCheckoutAddress({
        full_name: "A",
        phone: "",
        country_code: "USA",
        city: "",
        address_line1: "",
      }).ok
    ).toBe(false);
  });
});

describe("shipping / tax / coupon helpers", () => {
  it("applies free-shipping threshold", () => {
    expect(
      computeShippingFeeMinor({
        feeMinor: 1500,
        freeAboveSubtotalMinor: 10000,
        subtotalMinor: 10000,
      })
    ).toBe(0);
    expect(
      computeShippingFeeMinor({
        feeMinor: 1500,
        freeAboveSubtotalMinor: 10000,
        subtotalMinor: 9999,
      })
    ).toBe(1500);
  });

  it("computes tax-exclusive and tax-inclusive amounts with integers only", () => {
    const exclusive = computeTaxMinor({
      taxableMinor: 10000,
      rateBps: 1000,
      inclusive: false,
      enabled: true,
    });
    expect(exclusive.taxMinor).toBe(1000);
    expect(exclusive.grandMerchandiseMinor).toBe(11000);
    expect(Number.isInteger(exclusive.taxMinor)).toBe(true);

    const inclusive = computeTaxMinor({
      taxableMinor: 11000,
      rateBps: 1000,
      inclusive: true,
      enabled: true,
    });
    expect(inclusive.taxMinor).toBe(1000);
    expect(inclusive.grandMerchandiseMinor).toBe(11000);
  });

  it("caps coupon discounts and never exceeds subtotal or goes negative", () => {
    expect(
      computeCouponDiscountMinor({
        discountType: "percent",
        percentBps: 5000,
        subtotalMinor: 1000,
        maxDiscountMinor: 200,
      })
    ).toBe(200);
    expect(
      computeCouponDiscountMinor({
        discountType: "fixed",
        fixedAmountMinor: 5000,
        subtotalMinor: 1000,
      })
    ).toBe(1000);
    expect(
      assertCheckoutGrandNonNegative(
        computeStoreCheckoutGrandTotalMinor({
          subtotalMinor: 1000,
          discountTotalMinor: 1000,
          taxTotalMinor: 0,
          shippingTotalMinor: 0,
          taxInclusive: false,
        })
      ).ok
    ).toBe(true);
    expect(assertCheckoutGrandNonNegative(-1).ok).toBe(false);
  });

  it("keeps grand totals non-negative", () => {
    expect(
      assertCheckoutGrandNonNegative(
        computeStoreCheckoutGrandTotalMinor({
          subtotalMinor: 1000,
          discountTotalMinor: 200,
          taxTotalMinor: 50,
          shippingTotalMinor: 100,
          taxInclusive: false,
        })
      ).ok
    ).toBe(true);
  });
});

describe("cart validation + multi-store grouping", () => {
  it("rejects empty/inactive/inventory failures", () => {
    expect(
      evaluateCheckoutLineEligibility({
        storeStatus: "active",
        productStatus: "draft",
        moderationStatus: "approved",
        variantStatus: "active",
        priceStatus: "active",
        priceAmountMinor: 100,
        priceCurrency: "USD",
        cartCurrency: "USD",
        quantity: 1,
        onHand: 5,
        reserved: 0,
        safetyStock: 0,
        allowBackorder: false,
      }).ok
    ).toBe(false);

    expect(
      evaluateCheckoutLineEligibility({
        storeStatus: "active",
        productStatus: "active",
        moderationStatus: "approved",
        variantStatus: "active",
        priceStatus: "active",
        priceAmountMinor: 100,
        priceCurrency: "USD",
        cartCurrency: "USD",
        quantity: 3,
        onHand: 2,
        reserved: 0,
        safetyStock: 0,
        allowBackorder: false,
      }).ok
    ).toBe(false);

    expect(
      evaluateCheckoutLineEligibility({
        storeStatus: "active",
        productStatus: "active",
        moderationStatus: "approved",
        variantStatus: "active",
        priceStatus: "active",
        priceAmountMinor: 100,
        priceCurrency: "EUR",
        cartCurrency: "USD",
        quantity: 1,
        onHand: 5,
        reserved: 0,
        safetyStock: 0,
        allowBackorder: false,
      }).ok
    ).toBe(false);
  });

  it("groups mixed-store carts and documents atomic confirm policy", () => {
    const groups = groupCartItemsByStore([
      { storeId: "a", id: "1" },
      { storeId: "b", id: "2" },
      { storeId: "a", id: "3" },
    ]);
    expect(groups.get("a")).toHaveLength(2);
    expect(groups.get("b")).toHaveLength(1);
    expect(CHECKOUT_MULTI_STORE_POLICY.mode).toBe("atomic_across_stores");
  });

  it("rejects client money fields and expired quotes", () => {
    expect(assertNoClientMoneyFields({ quantity: 1 }).ok).toBe(true);
    expect(
      assertNoClientMoneyFields({ unit_price_minor: 100, quantity: 1 }).ok
    ).toBe(false);
    expect(
      assertNoClientMoneyFields({
        grand_total_minor: 999,
        quantity: 1,
      }).ok
    ).toBe(false);
    expect(
      isCheckoutQuoteExpired(new Date(Date.now() - 1000).toISOString())
    ).toBe(true);
    expect(
      isCheckoutQuoteExpired(new Date(Date.now() + 60_000).toISOString())
    ).toBe(false);
  });
});

describe("checkout route protection", () => {
  it("protects /store/checkout and exposes APP_ROUTES.storeCheckout", () => {
    expect(APP_ROUTES.storeCheckout).toBe("/store/checkout");
    expect(PROTECTED_PREFIXES).toContain("/store/checkout");
    expect(isProtectedPath("/store/checkout")).toBe(true);
  });
});
