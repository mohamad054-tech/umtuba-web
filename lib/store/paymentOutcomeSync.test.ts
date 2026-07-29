import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  STORE_PAYMENT_CAPTURE_POSTING_TEMPLATE,
  STORE_PAYMENT_FINGERPRINT_ALG_V1,
  STORE_PAYMENT_POLICY_CODES,
  STORE_PAYMENT_REFUND_POSTING_TEMPLATE,
} from "./paymentOutcomeSync";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260823_store_payment_outcome_sync_v1.sql";
const DOC = "docs/store/implementation/PAYMENT_OUTCOME_SYNC_V1.md";
const UEOS_MIGRATION =
  "supabase/migrations/20260822_ueos_foundation_v1.sql";

function read(rel: string) {
  // Normalize CRLF so lock-order indexOf assertions are OS-agnostic.
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

describe("Payment Outcome Sync V1 — files", () => {
  it("ships migration and documentation", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, DOC))).toBe(true);
  });
});

describe("Payment Outcome Sync V1 — accounting templates", () => {
  it("captures clearing → liability and never credits revenue", () => {
    expect(STORE_PAYMENT_CAPTURE_POSTING_TEMPLATE.lines[0].account_kind).toBe(
      "clearing"
    );
    expect(STORE_PAYMENT_CAPTURE_POSTING_TEMPLATE.lines[1].account_kind).toBe(
      "liability"
    );
    expect(
      STORE_PAYMENT_CAPTURE_POSTING_TEMPLATE.lines.map((l) => l.account_kind)
    ).not.toContain("revenue");
  });

  it("refunds liability → clearing", () => {
    expect(STORE_PAYMENT_REFUND_POSTING_TEMPLATE.lines[0].account_kind).toBe(
      "liability"
    );
    expect(STORE_PAYMENT_REFUND_POSTING_TEMPLATE.lines[1].account_kind).toBe(
      "clearing"
    );
  });
});

describe("Payment Outcome Sync V1 — migration contracts", () => {
  const sql = read(MIGRATION);

  it("grants apply + UEOS write gate to service_role only", () => {
    expect(sql).toMatch(
      /grant execute on function public\.apply_store_payment_outcome\([\s\S]*?\) to service_role/i
    );
    expect(sql).toMatch(
      /grant execute on function public\.ueos_ensure_account\(text, uuid, text, text, text\)\s+to service_role/i
    );
    expect(sql).toMatch(
      /grant execute on function public\.ueos_post_journal\([\s\S]*?\) to service_role/i
    );
    expect(sql).toMatch(
      /revoke all on function public\.apply_store_payment_outcome\([\s\S]*?\) from public, anon, authenticated/i
    );
    expect(sql).not.toMatch(
      /grant execute on function public\.store_payment_assert_posting_template/i
    );
    expect(sql).not.toMatch(
      /grant execute on function public\.store_payment_resolve_ueos_lines/i
    );
  });

  it("creates outcome events with correlation_id and fingerprint_alg", () => {
    expect(sql).toMatch(
      /create table if not exists public\.store_payment_outcome_events/i
    );
    expect(sql).toMatch(/correlation_id text not null/);
    expect(sql).toMatch(/request_fingerprint text not null/);
    expect(sql).toMatch(/fingerprint_alg text not null/);
    expect(STORE_PAYMENT_FINGERPRINT_ALG_V1).toBe("md5");
  });

  it("fails closed on same outcome with a different event_key", () => {
    expect(sql).toMatch(
      /outcome % already finalized for payment attempt %; replay original event_key %/
    );
  });

  it("blocks second capture for an already-paid order or prior capture event", () => {
    expect(sql).toMatch(
      /order payment_status % blocks capture \(no silent revive \/ double capture\)/
    );
    expect(sql).toMatch(
      /order % already has a trusted capture outcome/
    );
    expect(sql).toMatch(/store_pay_order:/);
  });

  it("enforces refund provenance via trusted capture event + correlation_id", () => {
    expect(sql).toMatch(
      /refund requires a prior trusted capture outcome event for this attempt/
    );
    expect(sql).toMatch(
      /refund correlation_id must match the capture correlation_id/
    );
    expect(sql).toMatch(
      /refund requires capture UEOS journal for non-zero amount/
    );
    expect(sql).toMatch(/refund already finalized for payment attempt %/);
    expect(sql).toMatch(/refund requires order payment_status=paid/);
  });

  it("claims event_key before UEOS/Store mutations", () => {
    const claim = sql.indexOf(
      "Claim event_key BEFORE mutations / UEOS post"
    );
    const journal = sql.indexOf("v_journal := public.ueos_post_journal");
    const updateAttempt = sql.indexOf("update public.payment_attempts pa");
    expect(claim).toBeGreaterThan(0);
    expect(journal).toBeGreaterThan(claim);
    expect(updateAttempt).toBeGreaterThan(journal);
  });

  it("locks event then order then attempt", () => {
    expect(sql).toMatch(/store_pay_event:/);
    expect(sql).toMatch(/store_pay_order:/);
    const eventLock = sql.indexOf("store_pay_event:");
    const orderLock = sql.indexOf("store_pay_order:");
    const orderForUpdate = sql.indexOf(
      "from public.orders\n  where id = v_order_id\n  for update"
    );
    const attemptForUpdate = sql.lastIndexOf(
      "from public.payment_attempts\n  where id = p_payment_attempt_id\n  for update"
    );
    expect(eventLock).toBeGreaterThan(0);
    expect(orderLock).toBeGreaterThan(eventLock);
    expect(orderForUpdate).toBeGreaterThan(orderLock);
    expect(attemptForUpdate).toBeGreaterThan(orderForUpdate);
  });

  it("strictly validates posting templates and caller metadata", () => {
    expect(sql).toMatch(/store_payment_assert_posting_template/);
    expect(sql).toMatch(/store_payment_assert_caller_metadata/);
    expect(sql).toMatch(/metadata contains unknown or forbidden keys/);
    expect(sql).toMatch(/multiple effective policies for %/);
    expect(sql).toMatch(/no effective policy for %/);
    expect(sql).toContain(`'${STORE_PAYMENT_POLICY_CODES.captured}'`);
    expect(sql).toContain(`'${STORE_PAYMENT_POLICY_CODES.refunded}'`);
    expect(sql).toContain(`'${STORE_PAYMENT_POLICY_CODES.authorized}'`);
  });

  it("keeps cancelled order payment_status pending and rejects paid overwrites", () => {
    expect(sql).toMatch(/cancelled requires order payment_status=pending/);
    expect(sql).toMatch(/failed outcome cannot overwrite paid order/);
    expect(sql).toMatch(/authorized cannot apply to order payment_status %/);
    expect(sql).toMatch(
      /v_outcome is distinct from 'cancelled'\s+and v_to_order_payment is distinct from v_from_order_payment/
    );
  });

  it("documents fingerprint determinism and revenue untouched", () => {
    expect(sql).toMatch(/key-order deterministic/);
    const doc = read(DOC);
    expect(doc).toMatch(/Platform revenue is never touched/i);
    expect(doc).toMatch(/fails closed/i);
    expect(doc).toMatch(/GRANT EXECUTE/i);
  });

  it("does not invent enums or alter UM Points / add silent triggers", () => {
    expect(sql).not.toMatch(/partially_refunded|\bunpaid\b/);
    expect(sql).not.toMatch(/alter table public\.um_point/i);
    expect(sql).not.toMatch(/create trigger.*payment_attempts/i);
    expect(sql).not.toMatch(/create trigger.*\bon public\.orders/i);
  });
});

describe("Payment Outcome Sync V1 — UEOS dependency", () => {
  it("relies on seeded platform liability accounts from UEOS foundation", () => {
    const ueos = read(UEOS_MIGRATION);
    expect(ueos).toMatch(/'liability'/);
    expect(ueos).toMatch(
      /ueos_ensure_account\('platform', null, 'liability'/
    );
  });
});

describe("Payment Outcome Sync V1 — settlement refund guard lives in 20260824", () => {
  const SETTLEMENT_MIGRATION =
    "supabase/migrations/20260824_store_merchant_settlement_foundation_v1.sql";

  it("20260824 replaces apply_store_payment_outcome with settlement assert; 20260823 stays free of it", () => {
    const syncSql = read(MIGRATION);
    const settlementSql = read(SETTLEMENT_MIGRATION);

    expect(syncSql).not.toMatch(/store_settlement_assert_refund_allowed/);
    expect(syncSql).toMatch(
      /refund requires a prior trusted capture outcome event for this attempt/
    );

    expect(settlementSql).toMatch(/store_settlement_assert_refund_allowed/);
    expect(settlementSql).toMatch(
      /create or replace function public\.apply_store_payment_outcome/i
    );
    expect(settlementSql).toMatch(
      /perform public\.store_settlement_assert_refund_allowed\(\s*v_attempt\.id,\s*v_correlation_id\s*\)/
    );
  });
});
