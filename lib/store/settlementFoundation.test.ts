import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  STORE_PAYMENT_CAPTURE_POSTING_TEMPLATE,
  STORE_PAYMENT_REFUND_POSTING_TEMPLATE,
} from "./paymentOutcomeSync";
import {
  STORE_SETTLEMENT_ACTIONS,
  STORE_SETTLEMENT_ALLOCATE_POSTING_TEMPLATE,
  STORE_SETTLEMENT_FINGERPRINT_ALG_V1,
  STORE_SETTLEMENT_HOLD_POSTING_TEMPLATE,
  STORE_SETTLEMENT_POLICY_CODES,
  STORE_SETTLEMENT_RELEASE_POSTING_TEMPLATE,
  STORE_SETTLEMENT_REVERSE_POSTING_TEMPLATE,
  STORE_SETTLEMENT_RPC,
  STORE_SETTLEMENT_STATES,
} from "./settlementFoundation";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260824_store_merchant_settlement_foundation_v1.sql";
const SYNC_MIGRATION =
  "supabase/migrations/20260823_store_payment_outcome_sync_v1.sql";
const DOC = "docs/store/implementation/SETTLEMENT_FOUNDATION_V1.md";
const UEOS_MIGRATION =
  "supabase/migrations/20260822_ueos_foundation_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Settlement Foundation V1 — files", () => {
  it("ships migration and documentation", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, DOC))).toBe(true);
  });
});

describe("Settlement Foundation V1 — accounting templates", () => {
  it("exposes four actions and policy codes", () => {
    expect([...STORE_SETTLEMENT_ACTIONS]).toEqual([
      "allocate",
      "release",
      "hold",
      "reverse_allocation",
    ]);
    expect(STORE_SETTLEMENT_POLICY_CODES.allocate).toBe(
      "store.settlement.allocate"
    );
    expect(STORE_SETTLEMENT_POLICY_CODES.release).toBe(
      "store.settlement.release"
    );
    expect(STORE_SETTLEMENT_POLICY_CODES.hold).toBe("store.settlement.hold");
    expect(STORE_SETTLEMENT_POLICY_CODES.reverse_allocation).toBe(
      "store.settlement.reverse_allocation"
    );
    expect(STORE_SETTLEMENT_RPC).toBe("apply_store_settlement_event");
    expect(STORE_SETTLEMENT_FINGERPRINT_ALG_V1).toBe("md5");
    expect([...STORE_SETTLEMENT_STATES]).toEqual([
      "UNALLOCATED",
      "ALLOCATED",
      "RELEASED",
      "HELD",
      "REVERSED",
    ]);
  });

  it("allocate: platform liability → store escrow; never revenue", () => {
    expect(STORE_SETTLEMENT_ALLOCATE_POSTING_TEMPLATE.lines[0]).toMatchObject({
      role: "debit",
      owner_type: "platform",
      account_kind: "liability",
      product_scope: "ueos",
    });
    expect(STORE_SETTLEMENT_ALLOCATE_POSTING_TEMPLATE.lines[1]).toMatchObject({
      role: "credit",
      owner_type: "store",
      account_kind: "escrow",
      product_scope: "store",
    });
    expect(
      STORE_SETTLEMENT_ALLOCATE_POSTING_TEMPLATE.lines.map((l) => l.account_kind)
    ).not.toContain("revenue");
  });

  it("release: escrow → payable; hold: payable → escrow; reverse: escrow → liability", () => {
    expect(STORE_SETTLEMENT_RELEASE_POSTING_TEMPLATE.lines[0].account_kind).toBe(
      "escrow"
    );
    expect(STORE_SETTLEMENT_RELEASE_POSTING_TEMPLATE.lines[1].account_kind).toBe(
      "payable"
    );
    expect(STORE_SETTLEMENT_HOLD_POSTING_TEMPLATE.lines[0].account_kind).toBe(
      "payable"
    );
    expect(STORE_SETTLEMENT_HOLD_POSTING_TEMPLATE.lines[1].account_kind).toBe(
      "escrow"
    );
    expect(STORE_SETTLEMENT_REVERSE_POSTING_TEMPLATE.lines[0].account_kind).toBe(
      "escrow"
    );
    expect(STORE_SETTLEMENT_REVERSE_POSTING_TEMPLATE.lines[1].account_kind).toBe(
      "liability"
    );
  });

  it("does not alter Sync capture/refund clearing↔liability templates", () => {
    expect(STORE_PAYMENT_CAPTURE_POSTING_TEMPLATE.lines[0].account_kind).toBe(
      "clearing"
    );
    expect(STORE_PAYMENT_CAPTURE_POSTING_TEMPLATE.lines[1].account_kind).toBe(
      "liability"
    );
    expect(STORE_PAYMENT_REFUND_POSTING_TEMPLATE.lines[0].account_kind).toBe(
      "liability"
    );
    expect(STORE_PAYMENT_REFUND_POSTING_TEMPLATE.lines[1].account_kind).toBe(
      "clearing"
    );
  });
});

describe("Settlement Foundation V1 — migration contracts", () => {
  const sql = read(MIGRATION);
  const syncSql = read(SYNC_MIGRATION);

  it("creates settlement events table with FORCE RLS and no client grants", () => {
    expect(sql).toMatch(
      /create table if not exists public\.store_settlement_events/i
    );
    expect(sql).toMatch(/force row level security/i);
    expect(sql).toMatch(
      /revoke all on public\.store_settlement_events from public, anon, authenticated/i
    );
    expect(sql).toMatch(/action in \('allocate', 'release', 'hold', 'reverse_allocation'\)/);
    expect(sql).toMatch(/amount_minor > 0/);
    expect(sql).toMatch(/capture_event_id uuid not null/);
    expect(sql).toMatch(/store_settlement_events_correlation_idx/);
    expect(sql).toMatch(/store_settlement_events_store_idx/);
    expect(sql).toMatch(/store_settlement_events_order_idx/);
    expect(sql).toMatch(/store_settlement_events_payment_attempt_idx/);
    expect(sql).toMatch(/store_settlement_events_capture_event_idx/);
    expect(sql).toMatch(/store_settlement_events_allocation_event_idx/);
  });

  it("creates active_allocations table with PK uniqueness and FORCE RLS", () => {
    expect(sql).toMatch(
      /create table if not exists public\.store_settlement_active_allocations/i
    );
    expect(sql).toMatch(
      /capture_event_id uuid primary key/i
    );
    expect(sql).toMatch(
      /revoke all on public\.store_settlement_active_allocations from public, anon, authenticated/i
    );
    expect(sql).toMatch(
      /PK capture_event_id enforces at most one active non-reversed allocation/
    );
    expect(sql).toMatch(
      /absence does not allow re-allocate/i
    );
    expect(sql).not.toMatch(
      /re-allocate after reverse is ALLOWED/i
    );
  });

  it("treats REVERSED as terminal — re-allocation after reverse is FORBIDDEN", () => {
    expect(sql).toMatch(
      /reverse_allocation transitions to REVERSED \(terminal in V1\)/i
    );
    expect(sql).toMatch(
      /Re-allocation after reverse is FORBIDDEN/i
    );
    expect(sql).toMatch(/v_state := 'REVERSED'/);
    expect(sql).not.toMatch(
      /Re-allocation after reverse_allocation is ALLOWED/i
    );
    expect(sql).toMatch(
      /settlement allocate rejected: capture % is REVERSED \(terminal in V1\); re-allocation is not allowed/
    );
    expect(sql).toMatch(
      /prior reverse_allocation permanently blocks allocate/i
    );
    expect(sql).toMatch(
      /delete from public\.store_settlement_active_allocations\s+where capture_event_id = v_capture\.id/i
    );
    expect(sql).toMatch(
      /insert into public\.store_settlement_active_allocations/i
    );
    // allocate requires UNALLOCATED (after specific REVERSED reject)
    expect(sql).toMatch(
      /if v_state is distinct from 'UNALLOCATED' then[\s\S]*?action allocate already finalized/
    );
    // release/hold/reverse rejected when REVERSED
    expect(sql).toMatch(
      /settlement action release not allowed: capture % is REVERSED \(terminal in V1\)/
    );
    expect(sql).toMatch(
      /settlement action hold not allowed: capture % is REVERSED \(terminal in V1\)/
    );
    expect(sql).toMatch(
      /settlement action reverse_allocation not allowed: capture % is REVERSED \(terminal in V1\); replay original event_key/
    );
    // exact reverse event_key replay must run BEFORE REVERSED state guards
    const applyStart = sql.indexOf(
      "create or replace function public.apply_store_settlement_event"
    );
    const existingLookup = sql.indexOf(
      "where event_key = v_event_key",
      applyStart
    );
    const replayReturn = sql.indexOf(
      "return public.store_settlement_replay_payload(v_existing)",
      applyStart
    );
    const reversedAllocateGuard = sql.indexOf(
      "settlement allocate rejected: capture % is REVERSED (terminal in V1)",
      applyStart
    );
    const reversedReverseGuard = sql.indexOf(
      "settlement action reverse_allocation not allowed: capture % is REVERSED (terminal in V1)",
      applyStart
    );
    expect(existingLookup).toBeGreaterThan(applyStart);
    expect(replayReturn).toBeGreaterThan(existingLookup);
    expect(reversedAllocateGuard).toBeGreaterThan(replayReturn);
    expect(reversedReverseGuard).toBeGreaterThan(replayReturn);
    // replay uses stored parent when event_key exists (active parent gone after reverse)
    expect(sql).toMatch(
      /Replay: fingerprint against the original stored parent allocation/
    );
    expect(sql).toMatch(
      /v_parent_allocation_id := v_existing\.allocation_event_id/
    );
    // idempotency conflict pattern unchanged
    expect(sql).toMatch(
      /idempotency conflict: event_key % already used with a different request fingerprint/
    );
  });

  it("allows refund for REVERSED with reverse journal proofs; Sync replay unchanged", () => {
    expect(sql).toMatch(
      /if v_state not in \('UNALLOCATED', 'REVERSED'\) then/
    );
    expect(sql).toMatch(
      /UNALLOCATED \(never allocated or legacy\) and REVERSED \(terminal reverse\) allow refund/
    );
    expect(sql).toMatch(
      /Settlement allocation guard \(V1\): refund when UNALLOCATED or REVERSED/
    );
    expect(sql).not.toMatch(
      /refund only when UNALLOCATED/
    );
    // Sync still has fingerprint replay before settlement guard path
    expect(sql).toMatch(
      /return public\.store_payment_outcome_replay_payload\(v_existing\)/
    );
    expect(sql).toMatch(
      /idempotency conflict: event_key % already used with a different request fingerprint/
    );
  });

  it("fingerprint canonical includes policy_id; policy resolved before fingerprint", () => {
    expect(sql).toMatch(/'policy_id', p_policy_id/);
    expect(sql).toMatch(
      /store_settlement_canonical_request_object\(\s*p_action text,[\s\S]*?p_policy_id uuid,/
    );
    expect(sql).toMatch(
      /revoke all on function public\.store_settlement_canonical_request_object\(\s*text, uuid, uuid, uuid, text, bigint, text, uuid, uuid, uuid, jsonb\s*\)/
    );
    const applyStart = sql.indexOf(
      "create or replace function public.apply_store_settlement_event"
    );
    const policyResolve = sql.indexOf(
      "v_policy := public.store_settlement_resolve_policy",
      applyStart
    );
    const assertTemplate = sql.indexOf(
      "v_posting := public.store_settlement_assert_posting_template",
      applyStart
    );
    const canonical = sql.indexOf(
      "v_canonical := public.store_settlement_canonical_request_object",
      applyStart
    );
    const fingerprint = sql.indexOf(
      "v_fingerprint := public.store_settlement_compute_request_fingerprint",
      applyStart
    );
    expect(policyResolve).toBeGreaterThan(applyStart);
    expect(assertTemplate).toBeGreaterThan(policyResolve);
    expect(canonical).toBeGreaterThan(assertTemplate);
    expect(fingerprint).toBeGreaterThan(canonical);
    // pass v_policy.id into canonical
    expect(sql).toMatch(
      /store_settlement_canonical_request_object\([\s\S]*?v_policy\.id,/
    );
  });

  it("refund guard requires completed reverse journal and no active_allocations", () => {
    expect(sql).toMatch(
      /refund blocked: active settlement allocation row still present/
    );
    expect(sql).toMatch(
      /refund blocked: reverse_allocation event missing for latest allocate/
    );
    expect(sql).toMatch(
      /refund blocked: reverse_allocation % has null ueos_journal_entry_id/
    );
    expect(sql).toMatch(
      /from public\.store_settlement_active_allocations a\s+where a\.capture_event_id = v_capture\.id/
    );
    expect(sql).toMatch(
      /r\.action = 'reverse_allocation'[\s\S]*?r\.allocation_event_id = v_latest_allocate\.id/
    );
    expect(sql).toMatch(/v_reverse\.ueos_journal_entry_id is null/);
  });

  it("blocks settlement when trusted refunded outcome exists", () => {
    expect(sql).toMatch(
      /settlement blocked: trusted refund outcome already exists for payment attempt %/
    );
    expect(sql).toMatch(
      /e\.payment_attempt_id = v_attempt\.id and e\.outcome = 'refunded'/
    );
  });

  it("derives state ordered by created_at asc, id asc", () => {
    expect(sql).toMatch(
      /order by e\.created_at asc, e\.id asc/
    );
    expect(sql).toMatch(
      /State derivation order: created_at asc, id asc/
    );
  });

  it("allows HELD → release and rejects reverse from RELEASED", () => {
    expect(sql).toMatch(
      /if v_state not in \('ALLOCATED', 'HELD'\) then[\s\S]*?settlement action release not allowed/
    );
    expect(sql).toMatch(
      /reverse_allocation forbidden while settlement funds are RELEASED/
    );
    // state machine history also allows release from HELD
    expect(sql).toMatch(
      /elsif v_rec\.action = 'release' then[\s\S]*?if v_state not in \('ALLOCATED', 'HELD'\)/
    );
  });

  it("uses product_scope store for seller escrow/payable accounts", () => {
    expect(sql).toMatch(
      /store settlement lines must use product_scope store/
    );
    expect(sql).toMatch(
      /ueos_ensure_account\(\s*'store',\s*p_store_id,\s*v_account_kind,\s*p_asset_code,\s*'store'\s*\)/
    );
    expect(sql).toMatch(/'product_scope', 'store'/);
    expect(sql).toMatch(
      /Seller store accounts use product_scope='store'/
    );
  });

  it("seeds four settlement policies with exact templates and no revenue", () => {
    for (const code of Object.values(STORE_SETTLEMENT_POLICY_CODES)) {
      expect(sql).toContain(`'${code}'`);
    }
    expect(sql).toMatch(/'account_kind', 'liability'/);
    expect(sql).toMatch(/'account_kind', 'escrow'/);
    expect(sql).toMatch(/'account_kind', 'payable'/);
    expect(sql).not.toMatch(
      /store\.settlement\.\w+'[\s\S]{0,400}'account_kind', 'revenue'/
    );
    expect(sql).toMatch(/revenue account_kind is forbidden in settlement posting/);
  });

  it("grants apply_store_settlement_event to service_role only; revokes helpers", () => {
    expect(sql).toMatch(
      /grant execute on function public\.apply_store_settlement_event\([\s\S]*?\) to service_role/i
    );
    expect(sql).toMatch(
      /revoke all on function public\.apply_store_settlement_event\([\s\S]*?\) from public, anon, authenticated/i
    );
    expect(sql).not.toMatch(
      /grant execute on function public\.store_settlement_assert_posting_template/i
    );
    expect(sql).not.toMatch(
      /grant execute on function public\.store_settlement_resolve_ueos_lines/i
    );
    expect(sql).not.toMatch(
      /grant execute on function public\.store_settlement_assert_refund_allowed/i
    );
    expect(sql).not.toMatch(
      /grant execute on function public\.store_settlement_state_for_capture/i
    );
  });

  it("resolves platform vs store accounts via ueos_ensure_account", () => {
    expect(sql).toMatch(
      /ueos_ensure_account\(\s*'platform',\s*null,\s*v_account_kind,\s*p_asset_code,\s*'ueos'\s*\)/
    );
    expect(sql).toMatch(
      /ueos_ensure_account\(\s*'store',\s*p_store_id,\s*v_account_kind,\s*p_asset_code,\s*'store'\s*\)/
    );
    expect(sql).toMatch(/caller-controlled account_id\/owner_id is not allowed/);
  });

  it("implements state machine transitions as SQL contracts", () => {
    expect(sql).toMatch(/store_settlement_state_for_capture/);
    expect(sql).toMatch(/v_state text := 'UNALLOCATED'/);
    expect(sql).toMatch(/v_state := 'ALLOCATED'/);
    expect(sql).toMatch(/v_state := 'RELEASED'/);
    expect(sql).toMatch(/v_state := 'HELD'/);
    expect(sql).toMatch(/v_state := 'REVERSED'/);
    expect(sql).toMatch(
      /ALLOCATED\|HELD --reverse_allocation--> REVERSED/
    );
    expect(sql).toMatch(
      /corrupt settlement history: allocate not allowed in state %/
    );
    expect(sql).toMatch(
      /corrupt settlement history: release not allowed in state %/
    );
    expect(sql).toMatch(
      /corrupt settlement history: hold not allowed in state %/
    );
    expect(sql).toMatch(
      /corrupt settlement history: reverse_allocation not allowed in state %/
    );
    // apply RPC transition guards
    expect(sql).toMatch(
      /reverse_allocation forbidden while settlement funds are RELEASED/
    );
    expect(sql).toMatch(
      /action allocate already finalized for capture %; replay original event_key %/
    );
    expect(sql).toMatch(
      /settlement allocate rejected: capture % is REVERSED \(terminal in V1\)/
    );
  });

  it("locks event then order then capture; claims before UEOS; active_alloc before journal", () => {
    expect(sql).toMatch(/store_set_event:/);
    expect(sql).toMatch(/store_set_order:/);
    expect(sql).toMatch(/store_set_capture:/);
    const eventLock = sql.indexOf("store_set_event:");
    const orderLock = sql.indexOf("store_set_order:");
    const captureLock = sql.indexOf("store_set_capture:");
    expect(eventLock).toBeGreaterThan(0);
    expect(orderLock).toBeGreaterThan(eventLock);
    expect(captureLock).toBeGreaterThan(orderLock);

    const settlementApply = sql.indexOf(
      "create or replace function public.apply_store_settlement_event"
    );
    const claim = sql.indexOf("Claim event_key BEFORE UEOS post", settlementApply);
    const activeInsert = sql.indexOf(
      "insert into public.store_settlement_active_allocations",
      settlementApply
    );
    const settlementJournal = sql.indexOf(
      "v_journal := public.ueos_post_journal",
      settlementApply
    );
    expect(claim).toBeGreaterThan(settlementApply);
    expect(activeInsert).toBeGreaterThan(claim);
    expect(settlementJournal).toBeGreaterThan(activeInsert);
    expect(sql).toMatch(
      /concurrent or double allocate for capture %: active allocation already exists/
    );
    expect(sql).toMatch(
      /reverse_allocation expected active allocation row missing for capture %/
    );
  });

  it("maps UEOS event types and posts with sset- idempotency", () => {
    expect(sql).toMatch(/when 'allocate' then 'hold'/);
    expect(sql).toMatch(/when 'hold' then 'hold'/);
    expect(sql).toMatch(/when 'release' then 'release'/);
    expect(sql).toMatch(/when 'reverse_allocation' then 'release'/);
    expect(sql).toMatch(/v_ueos_idem := 'sset-' \|\| md5\(v_event_key\)/);
    expect(sql).toMatch(/'store_settlement_event'/);
  });

  it("injects refund guard into replaced apply_store_payment_outcome", () => {
    expect(sql).toMatch(/store_settlement_assert_refund_allowed/);
    expect(sql).toMatch(
      /refund blocked: settlement allocation active; reverse_allocation required first/
    );
    expect(sql).toMatch(
      /refund blocked: settlement funds released to seller payable \(V1\)/
    );
    expect(sql).toMatch(
      /create or replace function public\.apply_store_payment_outcome/i
    );
    expect(sql).toMatch(
      /perform public\.store_settlement_assert_refund_allowed\(\s*v_attempt\.id,\s*v_correlation_id\s*\)/
    );
    // authorized branch uses if (not broken elsif-only chain for policy)
    expect(sql).toMatch(
      /if v_needs_journal or v_outcome = 'authorized' then/
    );
    expect(sql).toMatch(
      /grant execute on function public\.apply_store_payment_outcome\([\s\S]*?\) to service_role/i
    );
    expect(sql).toMatch(
      /revoke all on function public\.apply_store_payment_outcome\([\s\S]*?\) from public, anon, authenticated/i
    );
  });

  it("does not modify Sync 20260823 file contents for settlement assert", () => {
    expect(syncSql).not.toMatch(/store_settlement_assert_refund_allowed/);
    expect(syncSql).not.toMatch(/store_settlement_events/);
    expect(syncSql).toMatch(
      /refund requires a prior trusted capture outcome event for this attempt/
    );
    // Capture templates unchanged in Sync migration
    expect(syncSql).toMatch(/'account_kind', 'clearing'/);
    expect(syncSql).toMatch(/'account_kind', 'liability'/);
  });

  it("does not invent enums or alter UM Points / add silent triggers", () => {
    expect(sql).not.toMatch(/alter table public\.um_point/i);
    expect(sql).not.toMatch(/create trigger/i);
    expect(sql).not.toMatch(/partially_refunded|\bunpaid\b/);
  });

  it("documents purpose, state machine, refund ordering, and boundaries", () => {
    const doc = read(DOC);
    expect(doc).toMatch(/20260824_store_merchant_settlement_foundation_v1/);
    expect(doc).toMatch(/UNALLOCATED/);
    expect(doc).toMatch(/ALLOCATED/);
    expect(doc).toMatch(/RELEASED/);
    expect(doc).toMatch(/HELD/);
    expect(doc).toMatch(/REVERSED/);
    expect(doc).toMatch(/TERMINAL/);
    expect(doc).toMatch(/reverse_allocation/);
    expect(doc).toMatch(/Platform revenue is never touched/i);
    expect(doc).toMatch(/store_settlement_assert_refund_allowed/);
    expect(doc).toMatch(/payouts/i);
    expect(doc).toMatch(/GRANT EXECUTE/i);
    expect(doc).toMatch(/20260823/);
    expect(doc).toMatch(/Re-allocation after reverse is \*\*FORBIDDEN\*\*/i);
    expect(doc).not.toMatch(
      /Re-allocation after `reverse_allocation` is ALLOWED/i
    );
    expect(doc).toMatch(/store_settlement_active_allocations/);
    expect(doc).toMatch(/created_at asc, id asc/);
    expect(doc).toMatch(/product_scope='store'/);
    expect(doc).toMatch(/product_scope='ueos'/);
    expect(doc).toMatch(/policy_id/);
    expect(doc).toMatch(/ueos_journal_entry_id IS NOT NULL/);
    expect(doc).toMatch(/trusted `refunded` outcome already exists/);
    expect(doc).toMatch(/`REVERSED` \(after reverse\)/);
  });

  it("relies on UEOS escrow/payable account kinds and hold/release event types", () => {
    const ueos = read(UEOS_MIGRATION);
    expect(ueos).toMatch(/'escrow'/);
    expect(ueos).toMatch(/'payable'/);
    expect(ueos).toMatch(/'hold'/);
    expect(ueos).toMatch(/'release'/);
  });

  it("rejects caller allocation_event_id control via metadata forbid list", () => {
    expect(sql).toMatch(/p_metadata \? 'allocation_event_id'/);
    expect(sql).toMatch(
      /metadata must not contain account or posting controls/
    );
    expect(sql).toMatch(/never from caller/);
  });
});
