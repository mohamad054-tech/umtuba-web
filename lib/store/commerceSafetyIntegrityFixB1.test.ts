import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const BASE_MIGRATION =
  "supabase/migrations/20260819_store_commerce_safety_inventory_reservation_v1.sql";
const FIX_MIGRATION =
  "supabase/migrations/20260820_store_commerce_safety_integrity_fix_b1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function directCreateSql() {
  // Effective definition is the B1 fix migration (CREATE OR REPLACE).
  return read(FIX_MIGRATION);
}

function baseSql() {
  return read(BASE_MIGRATION);
}

describe("Commerce Safety Integrity Fix B1", () => {
  it("ships additive fix migration after reservation V1", () => {
    expect(existsSync(join(ROOT, BASE_MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, FIX_MIGRATION))).toBe(true);
    expect(FIX_MIGRATION).toMatch(/20260820_store_commerce_safety_integrity_fix_b1/);
  });

  it("1–2: order create still goes through core (initial + idempotent order identity)", () => {
    const sql = directCreateSql();
    expect(sql).toMatch(/create_store_order_foundation_core\(/);
    expect(sql).toMatch(/p_idempotency_key/);
    // Core (orders foundation / checkout) owns order-level idempotent return.
    const coreMig = read(
      "supabase/migrations/20260812_store_checkout_foundation_v1.sql"
    );
    expect(coreMig).toMatch(/where o\.idempotency_key = idem_key/);
    expect(coreMig).toMatch(/if existing_order_id is not null then/);
  });

  it("3–4: retry uses stable reservation keys (no gen_random_uuid session mint)", () => {
    const sql = directCreateSql();
    const fn = sql.slice(
      sql.indexOf("create or replace function public.create_store_order_foundation(")
    );
    expect(fn).not.toMatch(/session_id\s+uuid\s*:=\s*gen_random_uuid\s*\(\s*\)/);
    expect(fn).not.toMatch(/gen_random_uuid\s*\(/);
    expect(fn).toMatch(/session_id\s*:=\s*order_id/);
    expect(fn).toMatch(
      /'direct:'\s*\|\|\s*order_id::text\s*\|\|\s*':' \|\|\s*variant_id::text/
    );
    expect(fn).toMatch(/create_active_inventory_reservation\(/);
  });

  it("3–4: active reservation helper dedupes by unique idempotency_key", () => {
    const sql = baseSql();
    expect(sql).toMatch(
      /constraint inventory_reservations_idempotency_key_uidx unique \(idempotency_key\)/
    );
    const create = sql.slice(
      sql.indexOf(
        "create or replace function public.create_active_inventory_reservation"
      )
    );
    expect(create).toMatch(/where idempotency_key = p_idempotency_key/);
    expect(create).toMatch(/for update/i);
    expect(create).toMatch(/return existing/);
    expect(create).toMatch(/reserved = reserved \+ p_quantity/);
  });

  it("5: concurrency safety relies on unique order + reservation keys", () => {
    const base = baseSql();
    // Order idempotency unique path in core + reservation unique key.
    expect(base).toMatch(/idempotency_key/);
    expect(base).toMatch(
      /constraint inventory_reservations_idempotency_key_uidx unique \(idempotency_key\)/
    );
    const fix = directCreateSql();
    expect(fix).toMatch(/'direct:' \|\| order_id::text/);
  });

  it("6: failed transaction leaves no partial reservation (single plpgsql txn)", () => {
    const sql = directCreateSql();
    // One SECURITY DEFINER function body: core + all reservation inserts.
    // Any exception rolls back the entire call (Postgres function atomicity).
    expect(sql).toMatch(/language plpgsql/);
    expect(sql).toMatch(/create_store_order_foundation_core/);
    expect(sql).toMatch(/create_active_inventory_reservation/);
    expect(sql).not.toMatch(/autonomous|dblink|commit\s*;/i);
  });

  it("7: reservation expiry release path unchanged and service_role only", () => {
    const sql = baseSql();
    const expire = sql.slice(
      sql.indexOf("create or replace function public.expire_inventory_reservations")
    );
    expect(expire).toMatch(/transition_inventory_reservation/);
    expect(expire).toMatch(/reservation_ttl_expired/);
    expect(sql).toMatch(
      /grant execute on function public\.expire_inventory_reservations\(integer\)\s+to service_role;/
    );
    expect(directCreateSql()).not.toMatch(/expire_inventory_reservations/);
  });

  it("8: buyer cancellation release path unchanged", () => {
    const sql = baseSql();
    const buyer = sql.slice(
      sql.indexOf("create or replace function public.buyer_cancel_store_order")
    );
    expect(buyer).toMatch(/release_inventory_reservations_for_order/);
    expect(buyer).toMatch(/payment_status is distinct from 'pending'/);
    expect(directCreateSql()).not.toMatch(/buyer_cancel_store_order/);
  });

  it("9: commerce gate still enforced on direct create", () => {
    const sql = directCreateSql();
    expect(sql).toMatch(/assert_store_commerce_confirm_allowed/);
  });

  it("10: authorization still enforced (service_role only on direct create)", () => {
    const sql = directCreateSql();
    expect(sql).toMatch(/service_role required to create store orders/);
    expect(sql).toMatch(
      /revoke all on function public\.create_store_order_foundation\([\s\S]*?from public, anon, authenticated;/
    );
    expect(sql).toMatch(
      /grant execute on function public\.create_store_order_foundation\([\s\S]*?to service_role;/
    );
  });

  it("does not weaken confirm checkout_session_id reuse or confirm early idempotent return", () => {
    const sql = baseSql();
    const confirm = sql.slice(
      sql.indexOf("create or replace function public.confirm_store_checkout_quote")
    );
    expect(confirm).toMatch(/if q\.status = 'confirmed'/);
    expect(confirm).toMatch(/'idempotent', true/);
    expect(confirm).toMatch(
      /session_id := coalesce\(q\.checkout_session_id, gen_random_uuid\(\)\)/
    );
    // B1 fix replaces only create_store_order_foundation — no confirm redefine.
    expect(directCreateSql()).not.toMatch(
      /create or replace function public\.confirm_store_checkout_quote/
    );
  });

  it("documents Blocker B1 root cause in migration header", () => {
    const sql = directCreateSql();
    expect(sql).toMatch(/Blocker B1/i);
    expect(sql).toMatch(/gen_random_uuid/);
    expect(sql).toMatch(/double reserve/i);
  });
});
