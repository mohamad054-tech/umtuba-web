/**
 * Seller Live Payout Provider V1 — Slice S2 migration contract tests.
 * Local SQL contracts only. Does not apply migrations remotely.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../../..");
const MIGRATION =
  "supabase/migrations/20260896_store_seller_live_payout_provider_v1.sql";
const FOUNDATION =
  "supabase/migrations/20260881_store_seller_payout_foundation_v1.sql";
const READ_MODEL =
  "supabase/migrations/20260882_store_seller_payout_read_model_v1.sql";
const RECON =
  "supabase/migrations/20260883_store_settlement_payout_reconciliation_read_v1.sql";

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Seller Live Payout S2 — migration presence", () => {
  it("ships 20260896 without colliding prior payout migrations", () => {
    const sql = read(MIGRATION);
    expect(sql.length).toBeGreaterThan(1000);
    expect(read(FOUNDATION)).toMatch(/apply_store_payout_event/);
    expect(read(READ_MODEL)).toMatch(/get_my_seller_payout_eligibility/);
    expect(read(RECON)).toMatch(/store_settlement_payout_recon/);
    expect(MIGRATION).toContain("20260896");
    expect(sql).not.toMatch(/20260881_store_seller_payout_foundation/);
  });
});

describe("Seller Live Payout S2 — tables and constraints", () => {
  const sql = read(MIGRATION);

  it("creates destinations with masked label + verification constraints", () => {
    expect(sql).toMatch(
      /create table if not exists public\.store_payout_destinations/i
    );
    expect(sql).toMatch(/display_label text not null/);
    expect(sql).toMatch(/btrim\(display_label\) !~ '\[0-9\]\{8,\}'/);
    expect(sql).toMatch(
      /provider_id in \('manual_ops_live', 'stripe_connect'\)/
    );
    expect(sql).toMatch(
      /verification_state in \(\s*'unverified',\s*'pending_review',\s*'verified',\s*'rejected',\s*'suspended'/
    );
    expect(sql).toMatch(
      /store_payout_destinations_store_provider_currency_uidx/
    );
    expect(sql).toMatch(/force row level security/i);
    expect(sql).toMatch(
      /revoke all on public\.store_payout_destinations from public, anon, authenticated/i
    );
  });

  it("creates executions with amount/idempotency/open-capture uniqueness", () => {
    expect(sql).toMatch(
      /create table if not exists public\.store_payout_executions/i
    );
    expect(sql).toMatch(/trusted_amount_minor bigint not null/);
    expect(sql).toMatch(/trusted_amount_minor > 0/);
    expect(sql).toMatch(/store_payout_executions_store_idempotency_uidx/);
    expect(sql).toMatch(/store_payout_executions_open_capture_uidx/);
    expect(sql).toMatch(
      /status in \(\s*'planned',\s*'awaiting_attestation',\s*'provider_submitted',\s*'succeeded',\s*'failed',\s*'uncertain',\s*'suppressed'/
    );
    expect(sql).toMatch(
      /revoke all on public\.store_payout_executions from public, anon, authenticated/i
    );
    expect(sql).toMatch(/provider_ref !~ '\[0-9\]\{12,\}'/);
  });
});

describe("Seller Live Payout S2 — RPC authz and contracts", () => {
  const sql = read(MIGRATION);

  it("defines required seller/admin/service RPCs with grants", () => {
    expect(sql).toMatch(
      /create or replace function public\.upsert_my_store_payout_destination\(/i
    );
    expect(sql).toMatch(
      /create or replace function public\.list_my_store_payout_destinations\(/i
    );
    expect(sql).toMatch(
      /create or replace function public\.get_my_store_payout_execution\(/i
    );
    expect(sql).toMatch(
      /create or replace function public\.admin_list_store_live_payout_executions\(/i
    );
    expect(sql).toMatch(
      /create or replace function public\.admin_attest_store_live_payout_execution\(/i
    );
    expect(sql).toMatch(
      /create or replace function public\.service_insert_store_payout_execution\(/i
    );
    expect(sql).toMatch(
      /create or replace function public\.service_update_store_payout_execution\(/i
    );

    expect(sql).toMatch(
      /grant execute on function public\.upsert_my_store_payout_destination\([\s\S]*?\)\s+to authenticated, service_role/i
    );
    expect(sql).toMatch(
      /grant execute on function public\.list_my_store_payout_destinations\(uuid\)\s+to authenticated, service_role/i
    );
    expect(sql).toMatch(
      /grant execute on function public\.get_my_store_payout_execution\(uuid, uuid\)\s+to authenticated, service_role/i
    );
    expect(sql).toMatch(
      /grant execute on function public\.admin_list_store_live_payout_executions\([\s\S]*?\)\s+to authenticated, service_role/i
    );
    expect(sql).toMatch(
      /grant execute on function public\.admin_attest_store_live_payout_execution\([\s\S]*?\)\s+to authenticated, service_role/i
    );
    expect(sql).toMatch(
      /grant execute on function public\.service_insert_store_payout_execution\([\s\S]*?\)\s+to service_role/i
    );
    expect(sql).toMatch(
      /revoke all on function public\.service_insert_store_payout_execution\([\s\S]*?\) from public, anon, authenticated/i
    );
    expect(sql).toMatch(
      /grant execute on function public\.service_update_store_payout_execution\([\s\S]*?\)\s+to service_role/i
    );
    expect(sql).toMatch(
      /revoke all on function public\.service_update_store_payout_execution\([\s\S]*?\) from public, anon, authenticated/i
    );
  });

  it("seller destination upsert cannot self-verify", () => {
    const start = sql.indexOf(
      "create or replace function public.upsert_my_store_payout_destination"
    );
    const chunk = sql.slice(start, start + 3500);
    expect(chunk).toMatch(/is_store_member_with_role/);
    expect(chunk).toMatch(/array\['owner', 'manager'\]/);
    expect(chunk).toMatch(/pending_review/);
    expect(chunk).toMatch(/unverified/);
    expect(chunk).not.toMatch(/verification_state\s*=\s*'verified'/);
    expect(chunk).toMatch(/never self-verify|Cannot self-verify/i);
    expect(chunk).toMatch(/display_label must be masked/);
  });

  it("admin attest does not post UEOS or call payout booking", () => {
    const start = sql.indexOf(
      "create or replace function public.admin_attest_store_live_payout_execution"
    );
    const chunk = sql.slice(start, start + 4500);
    expect(chunk).toMatch(/is_platform_admin\(\)/);
    expect(chunk).toMatch(/ueos_posted',\s*false/);
    expect(chunk).toMatch(/payout_booking_called',\s*false/);
    expect(chunk).toMatch(/Does not post UEOS/);
    expect(chunk).toMatch(/no payout booking RPC/);
    expect(chunk).toMatch(/no settlement RPC/);
    expect(chunk).not.toMatch(/perform\s+public\.apply_store_payout_event/i);
    expect(chunk).not.toMatch(/perform\s+public\.apply_store_settlement_event/i);
    expect(chunk).not.toMatch(/ueos_post_journal|ueos_ensure_account/);
  });

  it("service insert requires trusted amount and idempotent replay", () => {
    const start = sql.indexOf(
      "create or replace function public.service_insert_store_payout_execution"
    );
    const chunk = sql.slice(start, start + 4500);
    expect(chunk).toMatch(/trusted_amount_minor must be > 0/);
    expect(chunk).toMatch(/Idempotency conflict/);
    expect(chunk).toMatch(/'replayed', true/);
    expect(chunk).toMatch(/Initial status not allowed/);
  });

  it("execution transitions are fail-closed", () => {
    expect(sql).toMatch(
      /store_live_payout_execution_transition_allowed/
    );
    expect(sql).toMatch(/Illegal execution transition/);
    expect(sql).toMatch(/Terminal execution status cannot transition/);
  });
});

describe("Seller Live Payout S2 — scope guards", () => {
  const sql = read(MIGRATION);

  it("does not modify foundation migrations or invent bank PAN storage", () => {
    expect(sql).not.toMatch(/alter table public\.store_payout_events/i);
    expect(sql).not.toMatch(/create or replace function public\.apply_store_payout_event/i);
    expect(sql).not.toMatch(/account_number|iban|routing_number|sk_live_/i);
    expect(sql).not.toMatch(/commerce_confirm_enabled/);
    expect(sql).not.toMatch(/STRIPE_SECRET_KEY/);
  });

  it("documents local-only apply and no Manual Ops adapter", () => {
    expect(sql).toMatch(/do not remote-apply/i);
    expect(sql).toMatch(/Does NOT:[\s\S]*Manual Ops adapter/i);
  });
});
