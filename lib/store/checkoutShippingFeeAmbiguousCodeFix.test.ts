import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const FAULTY_MIGRATION =
  "supabase/migrations/20260815_store_promotions_fulfillment_foundation_v1.sql";
const FIX_MIGRATION =
  "supabase/migrations/20260821_store_checkout_shipping_fee_ambiguous_code_fix.sql";
const SAFETY_MIGRATION =
  "supabase/migrations/20260819_store_commerce_safety_inventory_reservation_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function shippingFnBody(sql: string) {
  const start = sql.indexOf(
    "create or replace function public.checkout_compute_shipping_fee("
  );
  expect(start).toBeGreaterThanOrEqual(0);
  // Body ends at grants/revoke that follow this replace in the fix migration.
  const fromFn = sql.slice(start);
  const end = fromFn.search(/\nrevoke all on function public\.checkout_compute_shipping_fee/);
  return end > 0 ? fromFn.slice(0, end) : fromFn;
}

describe("checkout_compute_shipping_fee ambiguous code fix V1", () => {
  it("ships additive fix after promotions foundation and B1", () => {
    expect(existsSync(join(ROOT, FAULTY_MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, FIX_MIGRATION))).toBe(true);
    expect(FIX_MIGRATION).toMatch(
      /20260821_store_checkout_shipping_fee_ambiguous_code_fix/
    );
    const names = readdirSync(join(ROOT, "supabase/migrations")).filter((n) =>
      n.endsWith(".sql")
    );
    expect(names.some((n) => n.startsWith("20260820_"))).toBe(true);
    expect(names.some((n) => n.startsWith("20260821_"))).toBe(true);
  });

  it("1: fault was unqualified m.code = code; fix has no ambiguous bare code", () => {
    const faulty = shippingFnBody(read(FAULTY_MIGRATION));
    expect(faulty).toMatch(/code\s+text\s*:=/);
    expect(faulty).toMatch(/m\.code\s*=\s*code\b/);

    const fix = shippingFnBody(read(FIX_MIGRATION));
    expect(fix).not.toMatch(/\bcode\s+text\s*:=/);
    expect(fix).not.toMatch(/m\.code\s*=\s*code\b/);
    expect(fix).toMatch(/method_code_norm\s+text\s*:=/);
    expect(fix).toMatch(/m\.code\s*=\s*method_code_norm\b/);
    // No bare SQL predicate using unqualified identifier `code`.
    expect(fix).not.toMatch(/[^.\w]code\s*=\s*code[^.\w]/);
  });

  it("2–3: standard and pickup/free paths remain in body", () => {
    const fix = shippingFnBody(read(FIX_MIGRATION));
    expect(fix).toMatch(/coalesce\(p_method_code,\s*'standard'\)/);
    expect(fix).toMatch(/method_code_norm is distinct from 'standard'/);
    expect(fix).toMatch(/Shipping method not available/);
    expect(fix).toMatch(/Shipping method not found/);
    expect(fix).toMatch(/fee_minor\s*:=\s*0/);
    expect(fix).toMatch(/free_above_subtotal_minor/);
  });

  it("4: free_shipping coupon snapshot still zeroes fee", () => {
    const fix = shippingFnBody(read(FIX_MIGRATION));
    expect(fix).toMatch(
      /p_discount_snapshot->>'free_shipping'\)::boolean,\s*false\)/
    );
    expect(fix).toMatch(/fee_minor\s*:=\s*0/);
  });

  it("5: currency mismatch and fee assignment preserved (tax path untouched)", () => {
    const fix = shippingFnBody(read(FIX_MIGRATION));
    expect(fix).toMatch(/Shipping method currency mismatch/);
    expect(fix).toMatch(/fee_minor\s*:=\s*fee/);
    expect(fix).toMatch(/method_code\s*:=\s*method\.code/);
    // Fix migration must not redefine tax helper.
    expect(read(FIX_MIGRATION)).not.toMatch(
      /create or replace function public\.checkout_compute_tax/
    );
  });

  it("6: ineligible / missing method still fails closed", () => {
    const fix = shippingFnBody(read(FIX_MIGRATION));
    expect(fix).toMatch(/raise exception 'Shipping method not available'/);
    expect(fix).toMatch(/raise exception 'Shipping method not found'/);
    expect(fix).toMatch(/m\.is_active\s*=\s*true/);
  });

  it("7: migration replaces only shipping fee (+grants), no unrelated Store RPCs", () => {
    const sql = read(FIX_MIGRATION);
    expect(sql).toMatch(
      /create or replace function public\.checkout_compute_shipping_fee\(/
    );
    expect(sql).not.toMatch(/create or replace function public\.create_store_checkout_quote/);
    expect(sql).not.toMatch(/create or replace function public\.confirm_store_checkout_quote/);
    expect(sql).not.toMatch(/create or replace function public\.create_store_order_foundation/);
    expect(sql).not.toMatch(/admin_set_commerce_confirm_enabled/);
    expect(sql).toMatch(
      /grant execute on function public\.checkout_compute_shipping_fee\([\s\S]*?to service_role;/
    );
    expect(sql).toMatch(
      /revoke all on function public\.checkout_compute_shipping_fee\([\s\S]*?from public, anon, authenticated;/
    );
  });

  it("8: Commerce Gate migration unchanged by this fix file", () => {
    const fix = read(FIX_MIGRATION);
    expect(fix).not.toMatch(/commerce_confirm_enabled/);
    expect(fix).not.toMatch(/assert_store_commerce_confirm_allowed/);
    const safety = read(SAFETY_MIGRATION);
    expect(safety).toMatch(/assert_store_commerce_confirm_allowed/);
    expect(safety).toMatch(/commerce_confirm_enabled/);
  });

  it("preserves SECURITY DEFINER + search_path", () => {
    const fix = shippingFnBody(read(FIX_MIGRATION));
    expect(fix).toMatch(/security definer/i);
    expect(fix).toMatch(/set search_path\s*=\s*public/);
  });
});
