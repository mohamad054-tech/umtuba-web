import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  STORE_SETTLEMENT_RELEASE_POSTING_TEMPLATE,
  STORE_SETTLEMENT_RPC,
} from "./settlementFoundation";
import {
  STORE_PAYOUT_ACTIONS,
  STORE_PAYOUT_CONFIRM_POSTING_TEMPLATE,
  STORE_PAYOUT_FAIL_POSTING_TEMPLATE,
  STORE_PAYOUT_FINGERPRINT_ALG_V1,
  STORE_PAYOUT_FOUNDATION_ID,
  STORE_PAYOUT_POLICY_CODES,
  STORE_PAYOUT_RPC,
  STORE_PAYOUT_STATES,
  STORE_PAYOUT_SUBMIT_POSTING_TEMPLATE,
} from "./sellerPayoutFoundation";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260881_store_seller_payout_foundation_v1.sql";
const SETTLEMENT_MIGRATION =
  "supabase/migrations/20260824_store_merchant_settlement_foundation_v1.sql";
const DOC = "docs/store/implementation/SELLER_PAYOUT_FOUNDATION_V1.md";
const UEOS_MIGRATION =
  "supabase/migrations/20260822_ueos_foundation_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Seller Payout Foundation V1 — files", () => {
  it("ships migration and documentation", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, DOC))).toBe(true);
  });
});

describe("Seller Payout Foundation V1 — accounting templates", () => {
  it("exposes three actions and policy codes", () => {
    expect(STORE_PAYOUT_FOUNDATION_ID).toBe(
      "commerce.settlement.seller_payout_foundation_v1"
    );
    expect([...STORE_PAYOUT_ACTIONS]).toEqual(["submit", "confirm", "fail"]);
    expect(STORE_PAYOUT_POLICY_CODES.submit).toBe("store.payout.submit");
    expect(STORE_PAYOUT_POLICY_CODES.confirm).toBe("store.payout.confirm");
    expect(STORE_PAYOUT_POLICY_CODES.fail).toBe("store.payout.fail");
    expect(STORE_PAYOUT_RPC).toBe("apply_store_payout_event");
    expect(STORE_PAYOUT_FINGERPRINT_ALG_V1).toBe("md5");
    expect([...STORE_PAYOUT_STATES]).toEqual([
      "NONE",
      "IN_TRANSIT",
      "COMPLETED",
    ]);
  });

  it("submit: payable → in_transit; never revenue", () => {
    expect(STORE_PAYOUT_SUBMIT_POSTING_TEMPLATE.lines[0]).toMatchObject({
      role: "debit",
      owner_type: "store",
      account_kind: "payable",
      product_scope: "store",
    });
    expect(STORE_PAYOUT_SUBMIT_POSTING_TEMPLATE.lines[1]).toMatchObject({
      role: "credit",
      owner_type: "store",
      account_kind: "in_transit",
      product_scope: "store",
    });
    expect(
      STORE_PAYOUT_SUBMIT_POSTING_TEMPLATE.lines.map((l) => l.account_kind)
    ).not.toContain("revenue");
  });

  it("confirm: in_transit → clearing; fail: in_transit → payable", () => {
    expect(STORE_PAYOUT_CONFIRM_POSTING_TEMPLATE.lines[0].account_kind).toBe(
      "in_transit"
    );
    expect(STORE_PAYOUT_CONFIRM_POSTING_TEMPLATE.lines[1]).toMatchObject({
      account_kind: "clearing",
      owner_type: "platform",
      product_scope: "ueos",
    });
    expect(STORE_PAYOUT_FAIL_POSTING_TEMPLATE.lines[0].account_kind).toBe(
      "in_transit"
    );
    expect(STORE_PAYOUT_FAIL_POSTING_TEMPLATE.lines[1].account_kind).toBe(
      "payable"
    );
  });

  it("does not alter settlement release escrow→payable template", () => {
    expect(STORE_SETTLEMENT_RELEASE_POSTING_TEMPLATE.lines[0].account_kind).toBe(
      "escrow"
    );
    expect(STORE_SETTLEMENT_RELEASE_POSTING_TEMPLATE.lines[1].account_kind).toBe(
      "payable"
    );
    expect(STORE_SETTLEMENT_RPC).toBe("apply_store_settlement_event");
  });
});

describe("Seller Payout Foundation V1 — migration contracts", () => {
  const sql = read(MIGRATION);
  const settlementSql = read(SETTLEMENT_MIGRATION);

  it("creates payout events table with FORCE RLS and no client grants", () => {
    expect(sql).toMatch(
      /create table if not exists public\.store_payout_events/i
    );
    expect(sql).toMatch(/force row level security/i);
    expect(sql).toMatch(
      /revoke all on public\.store_payout_events from public, anon, authenticated/i
    );
    expect(sql).toMatch(/action in \('submit', 'confirm', 'fail'\)/);
    expect(sql).toMatch(/amount_minor > 0/);
    expect(sql).toMatch(/capture_event_id uuid not null/);
    expect(sql).toMatch(/settlement_release_event_id uuid not null/);
    expect(sql).toMatch(/store_payout_events_correlation_idx/);
    expect(sql).toMatch(/store_payout_events_store_idx/);
    expect(sql).toMatch(/store_payout_events_order_idx/);
    expect(sql).toMatch(/store_payout_events_payment_attempt_idx/);
    expect(sql).toMatch(/store_payout_events_capture_event_idx/);
    expect(sql).toMatch(/store_payout_events_submit_event_idx/);
  });

  it("creates active_in_transit table with PK uniqueness and FORCE RLS", () => {
    expect(sql).toMatch(
      /create table if not exists public\.store_payout_active_in_transit/i
    );
    expect(sql).toMatch(/capture_event_id uuid primary key/i);
    expect(sql).toMatch(
      /revoke all on public\.store_payout_active_in_transit from public, anon, authenticated/i
    );
    expect(sql).toMatch(
      /PK capture_event_id enforces at most one active in-transit payout/
    );
    expect(sql).toMatch(/COMPLETED \(historical confirm\) permanently blocks/i);
  });

  it("treats COMPLETED as terminal — re-submit after confirm is FORBIDDEN", () => {
    expect(sql).toMatch(/IN_TRANSIT --confirm--> COMPLETED/);
    expect(sql).toMatch(/COMPLETED\s+\(TERMINAL\)/);
    expect(sql).toMatch(/v_state := 'COMPLETED'/);
    expect(sql).toMatch(
      /payout submit rejected: capture % is COMPLETED \(terminal in V1\); re-payout is not allowed/
    );
    expect(sql).toMatch(
      /prior confirm; COMPLETED permanently blocks submit in V1/
    );
    expect(sql).toMatch(
      /delete from public\.store_payout_active_in_transit\s+where capture_event_id = v_capture\.id/i
    );
    expect(sql).toMatch(
      /insert into public\.store_payout_active_in_transit/i
    );
    expect(sql).toMatch(
      /if v_payout_state is distinct from 'NONE' then[\s\S]*?action submit already finalized/
    );
    expect(sql).toMatch(
      /payout action confirm not allowed: capture % is COMPLETED \(terminal in V1\)/
    );
    expect(sql).toMatch(
      /payout action fail not allowed: capture % is COMPLETED \(terminal in V1\)/
    );

    const applyStart = sql.indexOf(
      "create or replace function public.apply_store_payout_event"
    );
    const existingLookup = sql.indexOf(
      "where event_key = v_event_key",
      applyStart
    );
    const replayReturn = sql.indexOf(
      "return public.store_payout_replay_payload(v_existing)",
      applyStart
    );
    const completedSubmitGuard = sql.indexOf(
      "payout submit rejected: capture % is COMPLETED (terminal in V1)",
      applyStart
    );
    expect(existingLookup).toBeGreaterThan(applyStart);
    expect(replayReturn).toBeGreaterThan(existingLookup);
    expect(completedSubmitGuard).toBeGreaterThan(replayReturn);
    expect(sql).toMatch(
      /idempotency conflict: event_key % already used with a different request fingerprint/
    );
  });

  it("requires settlement RELEASED and completed release journal", () => {
    expect(sql).toMatch(
      /payout requires settlement state RELEASED for capture %/
    );
    expect(sql).toMatch(
      /payout requires a completed settlement release journal for capture %/
    );
    expect(sql).toMatch(/v_settlement_state is distinct from 'RELEASED'/);
    expect(sql).toMatch(/e\.action = 'release'/);
    expect(sql).toMatch(/e\.ueos_journal_entry_id is not null/);
  });

  it("fingerprint canonical includes policy_id and settlement_release_event_id", () => {
    expect(sql).toMatch(/'policy_id', p_policy_id/);
    expect(sql).toMatch(/'settlement_release_event_id', p_settlement_release_event_id/);
    expect(sql).toMatch(
      /store_payout_canonical_request_object\(\s*p_action text,[\s\S]*?p_policy_id uuid,/
    );
    const applyStart = sql.indexOf(
      "create or replace function public.apply_store_payout_event"
    );
    const policyResolve = sql.indexOf(
      "v_policy := public.store_payout_resolve_policy",
      applyStart
    );
    const assertTemplate = sql.indexOf(
      "v_posting := public.store_payout_assert_posting_template",
      applyStart
    );
    const canonical = sql.indexOf(
      "v_canonical := public.store_payout_canonical_request_object",
      applyStart
    );
    const fingerprint = sql.indexOf(
      "v_fingerprint := public.store_payout_compute_request_fingerprint",
      applyStart
    );
    expect(policyResolve).toBeGreaterThan(applyStart);
    expect(assertTemplate).toBeGreaterThan(policyResolve);
    expect(canonical).toBeGreaterThan(assertTemplate);
    expect(fingerprint).toBeGreaterThan(canonical);
    expect(sql).toMatch(
      /store_payout_canonical_request_object\([\s\S]*?v_policy\.id,/
    );
  });

  it("blocks payout when trusted refunded outcome exists", () => {
    expect(sql).toMatch(
      /payout blocked: trusted refund outcome already exists for payment attempt %/
    );
  });

  it("derives state ordered by created_at asc, id asc", () => {
    expect(sql).toMatch(/State derivation order: created_at asc, id asc/);
    expect(sql).toMatch(
      /from public\.store_payout_events e\s+where e\.capture_event_id = p_capture_event_id\s+order by e\.created_at asc, e\.id asc/
    );
  });

  it("allows fail → NONE re-submit and rejects confirm outside IN_TRANSIT", () => {
    expect(sql).toMatch(/IN_TRANSIT --fail--> NONE/);
    expect(sql).toMatch(/re-submit allowed after fail/);
    expect(sql).toMatch(
      /payout action confirm not allowed in state % for capture %/
    );
    expect(sql).toMatch(
      /payout action fail not allowed in state % for capture %/
    );
  });

  it("uses product_scope store for seller payable/in_transit accounts", () => {
    expect(sql).toMatch(/store payout lines must use product_scope store/);
    expect(sql).toMatch(
      /ueos_ensure_account\(\s*'store',\s*p_store_id,\s*v_account_kind,\s*p_asset_code,\s*'store'\s*\)/
    );
    expect(sql).toMatch(/Seller store in_transit\/payable use product_scope='store'/);
  });

  it("seeds three payout policies with exact templates and no revenue", () => {
    for (const code of Object.values(STORE_PAYOUT_POLICY_CODES)) {
      expect(sql).toContain(`'${code}'`);
    }
    expect(sql).toMatch(/'account_kind', 'payable'/);
    expect(sql).toMatch(/'account_kind', 'in_transit'/);
    expect(sql).toMatch(/'account_kind', 'clearing'/);
    expect(sql).not.toMatch(
      /store\.payout\.\w+'[\s\S]{0,400}'account_kind', 'revenue'/
    );
    expect(sql).toMatch(/revenue account_kind is forbidden in payout posting/);
  });

  it("grants apply_store_payout_event to service_role only; revokes helpers", () => {
    expect(sql).toMatch(
      /grant execute on function public\.apply_store_payout_event\([\s\S]*?\) to service_role/i
    );
    expect(sql).toMatch(
      /revoke all on function public\.apply_store_payout_event\([\s\S]*?\) from public, anon, authenticated/i
    );
    expect(sql).not.toMatch(
      /grant execute on function public\.store_payout_assert_posting_template/i
    );
    expect(sql).not.toMatch(
      /grant execute on function public\.store_payout_resolve_ueos_lines/i
    );
    expect(sql).not.toMatch(
      /grant execute on function public\.store_payout_state_for_capture/i
    );
    expect(sql).not.toMatch(
      /grant execute on function public\.store_payout_assert_settlement_action_allowed/i
    );
  });

  it("extends UEOS with in_transit account_kind", () => {
    expect(sql).toMatch(/Extend UEOS account_kind with in_transit/);
    expect(sql).toMatch(/'in_transit'/);
    expect(sql).toMatch(
      /'wallet', 'clearing', 'receivable', 'payable', 'escrow', 'revenue',\s*'liability', 'in_transit'/
    );
    expect(sql).toMatch(
      /alter table public\.ueos_accounts\s+drop constraint if exists ueos_accounts_account_kind_check/i
    );
  });

  it("injects payout guard into replaced apply_store_settlement_event", () => {
    expect(sql).toMatch(
      /create or replace function public\.apply_store_settlement_event/i
    );
    expect(sql).toMatch(/store_payout_assert_settlement_action_allowed/);
    expect(sql).toMatch(
      /settlement action % blocked: seller payout IN_TRANSIT for capture %/
    );
    expect(sql).toMatch(
      /settlement action % blocked: seller payout COMPLETED for capture % \(terminal in V1\)/
    );
    expect(sql).toMatch(
      /perform public\.store_payout_assert_settlement_action_allowed\(\s*v_capture\.id,\s*v_action\s*\)/
    );
    expect(sql).toMatch(
      /grant execute on function public\.apply_store_settlement_event\([\s\S]*?\) to service_role/i
    );

    const settlementApply = sql.indexOf(
      "create or replace function public.apply_store_settlement_event"
    );
    const replayReturn = sql.indexOf(
      "return public.store_settlement_replay_payload(v_existing)",
      settlementApply
    );
    const payoutGuard = sql.indexOf(
      "store_payout_assert_settlement_action_allowed",
      settlementApply
    );
    const stateGuards = sql.indexOf(
      "State machine guards (new events only",
      settlementApply
    );
    expect(replayReturn).toBeGreaterThan(settlementApply);
    expect(payoutGuard).toBeGreaterThan(replayReturn);
    expect(stateGuards).toBeGreaterThan(payoutGuard);
  });

  it("does not modify Settlement 20260824 file contents for payout assert", () => {
    expect(settlementSql).not.toMatch(/store_payout_assert_settlement_action_allowed/);
    expect(settlementSql).not.toMatch(/store_payout_events/);
    expect(settlementSql).not.toMatch(/in_transit/);
  });

  it("locks event then order then capture; claims before UEOS; active before journal", () => {
    expect(sql).toMatch(/store_payo_event:/);
    expect(sql).toMatch(/store_payo_order:/);
    expect(sql).toMatch(/store_payo_capture:/);
    const eventLock = sql.indexOf("store_payo_event:");
    const orderLock = sql.indexOf("store_payo_order:");
    const captureLock = sql.indexOf("store_payo_capture:");
    expect(eventLock).toBeGreaterThan(0);
    expect(orderLock).toBeGreaterThan(eventLock);
    expect(captureLock).toBeGreaterThan(orderLock);

    const payoutApply = sql.indexOf(
      "create or replace function public.apply_store_payout_event"
    );
    const claim = sql.indexOf(
      "insert into public.store_payout_events (",
      payoutApply
    );
    const activeInsert = sql.indexOf(
      "insert into public.store_payout_active_in_transit",
      payoutApply
    );
    const payoutJournal = sql.indexOf(
      "v_journal := public.ueos_post_journal",
      payoutApply
    );
    expect(claim).toBeGreaterThan(payoutApply);
    expect(activeInsert).toBeGreaterThan(claim);
    expect(payoutJournal).toBeGreaterThan(activeInsert);
    expect(sql).toMatch(
      /concurrent or double submit for capture %: active in-transit payout already exists/
    );
  });

  it("maps UEOS event types and posts with spayo- idempotency", () => {
    expect(sql).toMatch(/when 'submit' then 'transfer'/);
    expect(sql).toMatch(/when 'confirm' then 'transfer'/);
    expect(sql).toMatch(/when 'fail' then 'release'/);
    expect(sql).toMatch(/v_ueos_idem := 'spayo-' \|\| md5\(v_event_key\)/);
    expect(sql).toMatch(/'store_payout_event'/);
  });

  it("forbids rail/bank controls in caller metadata", () => {
    expect(sql).toMatch(/p_metadata \? 'submit_event_id'/);
    expect(sql).toMatch(/p_metadata \? 'rail'/);
    expect(sql).toMatch(/p_metadata \? 'bank_account'/);
    expect(sql).toMatch(/p_metadata \? 'beneficiary'/);
    expect(sql).toMatch(
      /metadata must not contain account, rail, or posting controls/
    );
    expect(sql).toMatch(/never from caller/);
  });

  it("does not invent bank rails, triggers, or UM Points changes", () => {
    expect(sql).not.toMatch(/stripe\.payouts|Payout\.create|transfer\.create/i);
    expect(sql).not.toMatch(/alter table public\.um_point/i);
    expect(sql).not.toMatch(/create trigger/i);
    expect(sql).not.toMatch(/payout_batches|merchant_payout_profiles/i);
  });

  it("documents purpose, state machine, settlement guard, and boundaries", () => {
    const doc = read(DOC);
    expect(doc).toMatch(/20260881_store_seller_payout_foundation_v1/);
    expect(doc).toMatch(/commerce\.settlement\.seller_payout_foundation_v1/);
    expect(doc).toMatch(/NONE/);
    expect(doc).toMatch(/IN_TRANSIT/);
    expect(doc).toMatch(/COMPLETED/);
    expect(doc).toMatch(/TERMINAL/);
    expect(doc).toMatch(/Platform revenue is never touched/i);
    expect(doc).toMatch(/store_payout_assert_settlement_action_allowed/);
    expect(doc).toMatch(/GRANT EXECUTE/i);
    expect(doc).toMatch(/RELEASED/);
    expect(doc).toMatch(/Re-submit after confirm is \*\*FORBIDDEN\*\*/i);
    expect(doc).toMatch(/store_payout_active_in_transit/);
    expect(doc).toMatch(/created_at asc, id asc/);
    expect(doc).toMatch(/product_scope='store'/);
    expect(doc).toMatch(/product_scope='ueos'/);
    expect(doc).toMatch(/policy_id/);
    expect(doc).toMatch(/bank/);
    expect(doc).toMatch(/in_transit/);
  });

  it("relies on UEOS transfer/release event types; extends in_transit locally", () => {
    const ueos = read(UEOS_MIGRATION);
    expect(ueos).toMatch(/'transfer'/);
    expect(ueos).toMatch(/'release'/);
    expect(ueos).toMatch(/'clearing'/);
    expect(ueos).toMatch(/'payable'/);
    // in_transit is added by payout migration, not original UEOS file
    expect(ueos).not.toMatch(/'in_transit'/);
  });
});
