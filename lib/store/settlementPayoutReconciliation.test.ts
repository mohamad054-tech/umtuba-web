import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SETTLEMENT_PAYOUT_RECONCILIATION_ID,
  SETTLEMENT_PAYOUT_RECON_DEFAULT_LIMIT,
  SETTLEMENT_PAYOUT_RECON_MAX_LIMIT,
  SETTLEMENT_PAYOUT_RECON_RPCS,
  assertNoSensitiveReconFields,
  clampReconLimit,
  compareSettlementPayoutReconRowsNewestFirst,
  parseSettlementPayoutReconPage,
  parseSettlementPayoutReconSummary,
  reconcileSettlementPayoutCapture,
  rejectClientReconMoneyFields,
  validateReconStoreId,
  type SettlementPayoutCaptureFacts,
} from "./settlementPayoutReconciliation";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260883_store_settlement_payout_reconciliation_read_v1.sql";
const READ_MODEL_MIGRATION =
  "supabase/migrations/20260882_store_seller_payout_read_model_v1.sql";
const FOUNDATION_MIGRATION =
  "supabase/migrations/20260881_store_seller_payout_foundation_v1.sql";
const DOC =
  "docs/store/implementation/SETTLEMENT_PAYOUT_RECONCILIATION_READ_V1.md";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function facts(
  overrides: Partial<SettlementPayoutCaptureFacts> = {}
): SettlementPayoutCaptureFacts {
  return {
    orderId: "22222222-2222-4222-8222-222222222222",
    paymentAttemptId: "33333333-3333-4333-8333-333333333333",
    captureEventId: "44444444-4444-4444-8444-444444444444",
    amountMinor: 1000,
    currency: "USD",
    settlementState: "RELEASED",
    payoutState: "NONE",
    submitCount: 0,
    failCount: 0,
    confirmCount: 0,
    hasRefund: false,
    captureCreatedAt: "2026-07-30T12:00:00.000Z",
    ...overrides,
  };
}

describe("Settlement↔Payout Reconciliation Read V1 — files", () => {
  it("ships migration and documentation", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, DOC))).toBe(true);
  });
});

describe("Settlement↔Payout Reconciliation Read V1 — pure reconcile", () => {
  it("valid reconciliation: released + in_transit with matching submit", () => {
    const row = reconcileSettlementPayoutCapture(
      facts({
        payoutState: "IN_TRANSIT",
        submitCount: 1,
      })
    );
    expect(row.issues).toEqual([
      expect.objectContaining({ code: "aligned", severity: "ok" }),
    ]);
    expect(row.highestSeverity).toBe("ok");
  });

  it("missing payout booking: released with no submit", () => {
    const row = reconcileSettlementPayoutCapture(facts());
    expect(row.issues.map((i) => i.code)).toEqual([
      "released_without_payout_booking",
    ]);
    expect(row.highestSeverity).toBe("info");
  });

  it("duplicate payout booking: extra submit beyond fail/open lifecycle", () => {
    const row = reconcileSettlementPayoutCapture(
      facts({
        payoutState: "IN_TRANSIT",
        submitCount: 2,
        failCount: 0,
      })
    );
    expect(row.issues.map((i) => i.code)).toContain("duplicate_payout_booking");
    expect(row.highestSeverity).toBe("error");
  });

  it("duplicate payout booking: more than one confirm", () => {
    const row = reconcileSettlementPayoutCapture(
      facts({
        payoutState: "COMPLETED",
        submitCount: 1,
        confirmCount: 2,
      })
    );
    expect(row.issues.map((i) => i.code)).toContain("duplicate_payout_booking");
  });

  it("orphan payout booking: payout without released settlement", () => {
    const row = reconcileSettlementPayoutCapture(
      facts({
        settlementState: "ALLOCATED",
        payoutState: "IN_TRANSIT",
        submitCount: 1,
      })
    );
    const codes = row.issues.map((i) => i.code);
    expect(codes).toContain("payout_without_released_settlement");
    expect(codes).toContain("unsettled_with_payout");
    expect(row.highestSeverity).toBe("error");
  });

  it("completed reconciliation: released + completed with confirm", () => {
    const row = reconcileSettlementPayoutCapture(
      facts({
        payoutState: "COMPLETED",
        submitCount: 1,
        confirmCount: 1,
      })
    );
    expect(row.issues).toEqual([
      expect.objectContaining({ code: "aligned", severity: "ok" }),
    ]);
  });

  it("completed inconsistencies: completed without release / without confirm", () => {
    const withoutRelease = reconcileSettlementPayoutCapture(
      facts({
        settlementState: "HELD",
        payoutState: "COMPLETED",
        submitCount: 1,
        confirmCount: 1,
      })
    );
    expect(withoutRelease.issues.map((i) => i.code)).toContain(
      "completed_without_release"
    );

    const missingConfirm = reconcileSettlementPayoutCapture(
      facts({
        payoutState: "COMPLETED",
        submitCount: 1,
        confirmCount: 0,
      })
    );
    expect(missingConfirm.issues.map((i) => i.code)).toContain(
      "completed_missing_confirm"
    );
  });

  it("currency separation: uppercases currency; amounts stay per-row", () => {
    const usd = reconcileSettlementPayoutCapture(facts({ currency: "usd" }));
    const zar = reconcileSettlementPayoutCapture(
      facts({
        currency: "zar",
        amountMinor: 2500,
        captureEventId: "55555555-5555-4555-8555-555555555555",
      })
    );
    expect(usd.currency).toBe("USD");
    expect(zar.currency).toBe("ZAR");
    expect(usd.amountMinor).toBe(1000);
    expect(zar.amountMinor).toBe(2500);
  });

  it("deterministic ordering: newest-first by created_at then id", () => {
    const rows = [
      {
        captureCreatedAt: "2026-07-30T10:00:00.000Z",
        captureEventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      },
      {
        captureCreatedAt: "2026-07-30T12:00:00.000Z",
        captureEventId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      },
      {
        captureCreatedAt: "2026-07-30T12:00:00.000Z",
        captureEventId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      },
    ];
    const sorted = [...rows].sort(compareSettlementPayoutReconRowsNewestFirst);
    expect(sorted.map((r) => r.captureEventId)).toEqual([
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    ]);
  });

  it("pagination helpers: clamp limit and reject malformed identifiers", () => {
    expect(validateReconStoreId("not-a-uuid").ok).toBe(false);
    expect(validateReconStoreId("").ok).toBe(false);
    expect(
      validateReconStoreId("11111111-1111-4111-8111-111111111111").ok
    ).toBe(true);
    const defaultLimit = clampReconLimit(null);
    expect(defaultLimit.ok).toBe(true);
    if (defaultLimit.ok) {
      expect(defaultLimit.limit).toBe(SETTLEMENT_PAYOUT_RECON_DEFAULT_LIMIT);
    }
    expect(clampReconLimit(0).ok).toBe(false);
    const clamped = clampReconLimit(999);
    expect(clamped.ok).toBe(true);
    if (clamped.ok) {
      expect(clamped.limit).toBe(SETTLEMENT_PAYOUT_RECON_MAX_LIMIT);
    }
    expect(SETTLEMENT_PAYOUT_RECON_MAX_LIMIT).toBe(50);
  });

  it("authorization surface: rejects client money; maps auth errors", () => {
    expect(rejectClientReconMoneyFields({ amount_minor: 1 }).ok).toBe(false);
    expect(
      rejectClientReconMoneyFields({
        store_id: "11111111-1111-4111-8111-111111111111",
        limit: 10,
        issues_only: true,
      }).ok
    ).toBe(true);
  });

  it("parsers omit sensitive fields and keep capability id", () => {
    const page = parseSettlementPayoutReconPage({
      store_id: "11111111-1111-4111-8111-111111111111",
      items: [
        {
          order_id: "22222222-2222-4222-8222-222222222222",
          payment_attempt_id: "33333333-3333-4333-8333-333333333333",
          capture_event_id: "44444444-4444-4444-8444-444444444444",
          amount_minor: 1000,
          currency: "usd",
          settlement_state: "RELEASED",
          payout_state: "NONE",
          issues: [
            {
              code: "released_without_payout_booking",
              severity: "info",
              message: "pending booking",
            },
          ],
          highest_severity: "info",
          capture_created_at: "2026-07-30T12:00:00.000Z",
        },
      ],
      limit: 50,
      has_more: true,
      next_cursor: {
        before_created_at: "2026-07-30T12:00:00.000Z",
        before_id: "44444444-4444-4444-8444-444444444444",
      },
      capability: SETTLEMENT_PAYOUT_RECONCILIATION_ID,
    });
    expect(page.hasMore).toBe(true);
    expect(page.items[0].currency).toBe("USD");
    expect(page.capability).toBe(SETTLEMENT_PAYOUT_RECONCILIATION_ID);

    const summary = parseSettlementPayoutReconSummary({
      store_id: "11111111-1111-4111-8111-111111111111",
      by_currency: [
        {
          currency: "usd",
          capture_count: 2,
          issue_count: 1,
          error_count: 0,
          info_count: 1,
        },
        {
          currency: "zar",
          capture_count: 1,
          issue_count: 1,
          error_count: 1,
          info_count: 0,
        },
      ],
      issue_counts: {
        released_without_payout_booking: 1,
        duplicate_payout_booking: 1,
      },
      capability: SETTLEMENT_PAYOUT_RECONCILIATION_ID,
    });
    expect(summary.byCurrency).toHaveLength(2);
    expect(summary.byCurrency[0].currency).toBe("USD");
    expect(summary.issueCounts.duplicate_payout_booking).toBe(1);

    expect(assertNoSensitiveReconFields({ store_id: "x", items: [] })).toBe(
      true
    );
    expect(
      assertNoSensitiveReconFields({ ueos_journal_entry_id: "secret" })
    ).toBe(false);
    expect(
      assertNoSensitiveReconFields({ request_fingerprint: "x" })
    ).toBe(false);
  });

  it("fail-then-resubmit lifecycle remains aligned", () => {
    const row = reconcileSettlementPayoutCapture(
      facts({
        payoutState: "IN_TRANSIT",
        submitCount: 2,
        failCount: 1,
      })
    );
    expect(row.issues).toEqual([
      expect.objectContaining({ code: "aligned", severity: "ok" }),
    ]);
  });
});

describe("Settlement↔Payout Reconciliation Read V1 — migration contracts", () => {
  const sql = read(MIGRATION);
  const readModel = read(READ_MODEL_MIGRATION);
  const foundation = read(FOUNDATION_MIGRATION);

  it("exposes list + summary RPCs with owner/manager access reuse", () => {
    expect(SETTLEMENT_PAYOUT_RECON_RPCS.list).toBe(
      "get_my_seller_settlement_payout_reconciliation"
    );
    expect(SETTLEMENT_PAYOUT_RECON_RPCS.summary).toBe(
      "get_my_seller_settlement_payout_reconciliation_summary"
    );
    expect(sql).toMatch(/store_payout_read_assert_store_access/);
    expect(sql).toMatch(/store_payout_read_clamp_limit/);
    expect(readModel).toMatch(/is_store_member_with_role/);
    expect(sql).toMatch(
      /grant execute on function public\.get_my_seller_settlement_payout_reconciliation\([\s\S]*?\)\s+to authenticated, service_role/i
    );
    expect(sql).toMatch(
      /grant execute on function public\.get_my_seller_settlement_payout_reconciliation_summary\(uuid\)\s+to authenticated, service_role/i
    );
    expect(sql).not.toMatch(
      /grant execute on function public\.store_settlement_payout_recon_project_capture/i
    );
    expect(sql).not.toMatch(
      /grant execute on function public\.store_settlement_payout_recon_build_issues/i
    );
  });

  it("detects required mismatch classes in SQL issue builder", () => {
    expect(sql).toMatch(/released_without_payout_booking/);
    expect(sql).toMatch(/payout_without_released_settlement/);
    expect(sql).toMatch(/duplicate_payout_booking/);
    expect(sql).toMatch(/completed_without_release/);
    expect(sql).toMatch(/completed_missing_confirm/);
    expect(sql).toMatch(/in_transit_missing_submit/);
    expect(sql).toMatch(/refunded_with_active_payout/);
    expect(sql).toMatch(/unsettled_with_payout/);
    expect(sql).toMatch(/'aligned'/);
  });

  it("lists newest-first with bounded pagination and issues_only filter", () => {
    expect(sql).toMatch(/order by c\.created_at desc, c\.id desc/);
    expect(sql).toMatch(/pagination cursor requires both before_created_at and before_id/);
    expect(sql).toMatch(/'has_more'/);
    expect(sql).toMatch(/'next_cursor'/);
    expect(sql).toMatch(/p_issues_only/);
    expect(sql).toMatch(/store_payout_read_clamp_limit/);
  });

  it("summarizes per-currency and issue counts", () => {
    expect(sql).toMatch(/'by_currency'/);
    expect(sql).toMatch(/'issue_counts'/);
    expect(sql).toMatch(/'capture_count'/);
    expect(sql).toMatch(/'error_count'/);
    expect(sql).toMatch(/'info_count'/);
  });

  it("reuses settlement + payout state helpers; no write path / bank rails", () => {
    expect(sql).toMatch(/store_settlement_state_for_capture/);
    expect(sql).toMatch(/store_payout_state_for_capture/);
    expect(sql).toMatch(/Does NOT: bank rails/);
    expect(sql).not.toMatch(/apply_store_payout_event/);
    expect(sql).not.toMatch(/create table/i);
    expect(foundation).toMatch(/apply_store_payout_event/);
    expect(sql).not.toMatch(/app\/admin|SellerDashboard|admin_ui/i);
  });

  it("does not leak fingerprints, journals, rails, or bank fields", () => {
    expect(sql).not.toMatch(/'request_fingerprint'/);
    expect(sql).not.toMatch(/'ueos_journal_entry_id', v_/);
    expect(sql).not.toMatch(/bank_account|beneficiary|'rail'/);
  });

  it("documents capability and boundaries", () => {
    const doc = read(DOC);
    expect(doc).toMatch(/commerce\.settlement\.payout_reconciliation_read_v1/);
    expect(doc).toMatch(/20260883_store_settlement_payout_reconciliation_read_v1/);
    expect(doc).toMatch(/get_my_seller_settlement_payout_reconciliation/);
    expect(doc).toMatch(/get_my_seller_settlement_payout_reconciliation_summary/);
    expect(doc).toMatch(/released_without_payout_booking/);
    expect(doc).toMatch(/duplicate_payout_booking/);
    expect(doc).toMatch(/owner\/manager/);
    expect(doc).toMatch(/Dashboard/i);
    expect(doc).toMatch(/bank/i);
    expect(doc).toMatch(/Read-only/i);
  });
});
