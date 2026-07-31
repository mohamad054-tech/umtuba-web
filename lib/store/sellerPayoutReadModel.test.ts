import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { STORE_PAYOUT_STATES } from "./sellerPayoutFoundation";
import {
  SELLER_PAYOUT_READ_DEFAULT_LIMIT,
  SELLER_PAYOUT_READ_MAX_LIMIT,
  SELLER_PAYOUT_READ_MODEL_ID,
  SELLER_PAYOUT_READ_RPCS,
  SELLER_PAYOUT_STATUS,
  assertNoSensitivePayoutReadFields,
  clampSellerPayoutReadLimit,
  mapPayoutStateToStatus,
  parseSellerPayoutEligibility,
  parseSellerPayoutListItem,
  parseSellerPayoutListPage,
  parseSellerPayoutSummary,
  rejectClientPayoutReadMoneyFields,
  validateSellerPayoutReadStoreId,
} from "./sellerPayoutReadModel";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260882_store_seller_payout_read_model_v1.sql";
const FOUNDATION_MIGRATION =
  "supabase/migrations/20260881_store_seller_payout_foundation_v1.sql";
const DOC = "docs/store/implementation/SELLER_PAYOUT_READ_MODEL_V1.md";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Seller Payout Read Model V1 — files", () => {
  it("ships migration and documentation", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, DOC))).toBe(true);
  });
});

describe("Seller Payout Read Model V1 — contracts", () => {
  it("reuses foundation payout state vocabulary", () => {
    expect(SELLER_PAYOUT_READ_MODEL_ID).toBe(
      "commerce.settlement.seller_payout_read_model_v1"
    );
    expect([...STORE_PAYOUT_STATES]).toEqual([
      "NONE",
      "IN_TRANSIT",
      "COMPLETED",
    ]);
    expect(mapPayoutStateToStatus("NONE")).toBe("available");
    expect(mapPayoutStateToStatus("IN_TRANSIT")).toBe("in_transit");
    expect(mapPayoutStateToStatus("COMPLETED")).toBe("completed");
    expect([...SELLER_PAYOUT_STATUS]).toEqual([
      "available",
      "in_transit",
      "completed",
    ]);
  });

  it("exposes three authenticated read RPCs", () => {
    expect(SELLER_PAYOUT_READ_RPCS.eligibility).toBe(
      "get_my_seller_payout_eligibility"
    );
    expect(SELLER_PAYOUT_READ_RPCS.summary).toBe("get_my_seller_payout_summary");
    expect(SELLER_PAYOUT_READ_RPCS.list).toBe("get_my_seller_payouts");
  });

  it("validates store id and clamps pagination limit", () => {
    expect(validateSellerPayoutReadStoreId("not-a-uuid").ok).toBe(false);
    expect(validateSellerPayoutReadStoreId("").ok).toBe(false);
    expect(
      validateSellerPayoutReadStoreId("11111111-1111-4111-8111-111111111111").ok
    ).toBe(true);
    const defaultLimit = clampSellerPayoutReadLimit(null);
    expect(defaultLimit.ok).toBe(true);
    if (defaultLimit.ok) {
      expect(defaultLimit.limit).toBe(SELLER_PAYOUT_READ_DEFAULT_LIMIT);
    }
    expect(clampSellerPayoutReadLimit(0).ok).toBe(false);
    const clamped = clampSellerPayoutReadLimit(999);
    expect(clamped.ok).toBe(true);
    if (clamped.ok) {
      expect(clamped.limit).toBe(SELLER_PAYOUT_READ_MAX_LIMIT);
    }
    expect(SELLER_PAYOUT_READ_MAX_LIMIT).toBe(50);
  });

  it("rejects client-supplied money fields", () => {
    expect(
      rejectClientPayoutReadMoneyFields({ available_minor: 100 }).ok
    ).toBe(false);
    expect(
      rejectClientPayoutReadMoneyFields({
        store_id: "11111111-1111-4111-8111-111111111111",
        limit: 10,
      }).ok
    ).toBe(true);
  });

  it("parses eligibility / summary / list without sensitive fields", () => {
    const eligibility = parseSellerPayoutEligibility({
      store_id: "11111111-1111-4111-8111-111111111111",
      eligible_for_balance_read: true,
      has_available_for_payout: true,
      available_capture_count: 2,
      in_transit_capture_count: 1,
      release_currency_count: 1,
      bank_payouts_enabled: false,
      reasons: ["has_in_transit_payouts"],
      capability: SELLER_PAYOUT_READ_MODEL_ID,
    });
    expect(eligibility.hasAvailableForPayout).toBe(true);
    expect(eligibility.bankPayoutsEnabled).toBe(false);
    expect(eligibility.availableCaptureCount).toBe(2);
    expect(eligibility.inTransitCaptureCount).toBe(1);

    const summary = parseSellerPayoutSummary({
      store_id: "11111111-1111-4111-8111-111111111111",
      by_currency: [
        {
          currency: "usd",
          available_minor: 500,
          in_transit_minor: 200,
          completed_minor: 1000,
          available_count: 1,
          in_transit_count: 1,
          completed_count: 2,
        },
      ],
      failed_event_count: 3,
      bank_payouts_enabled: false,
      capability: SELLER_PAYOUT_READ_MODEL_ID,
    });
    expect(summary.byCurrency[0].currency).toBe("USD");
    expect(summary.byCurrency[0].availableMinor).toBe(500);
    expect(summary.byCurrency[0].inTransitMinor).toBe(200);
    expect(summary.byCurrency[0].completedMinor).toBe(1000);
    expect(summary.failedEventCount).toBe(3);

    const item = parseSellerPayoutListItem({
      order_id: "22222222-2222-4222-8222-222222222222",
      payment_attempt_id: "33333333-3333-4333-8333-333333333333",
      capture_event_id: "44444444-4444-4444-8444-444444444444",
      amount_minor: 500,
      currency: "USD",
      settlement_state: "RELEASED",
      payout_state: "NONE",
      payout_status: "available",
      last_payout_action: "fail",
      last_payout_at: "2026-07-31T00:00:00Z",
      fail_count: 1,
      capture_created_at: "2026-07-30T00:00:00Z",
    });
    expect(item.payoutStatus).toBe("available");
    expect(item.failCount).toBe(1);
    expect(item.lastPayoutAction).toBe("fail");

    const page = parseSellerPayoutListPage({
      store_id: "11111111-1111-4111-8111-111111111111",
      items: [item],
      limit: 50,
      has_more: true,
      next_cursor: {
        before_created_at: "2026-07-30T00:00:00Z",
        before_id: "44444444-4444-4444-8444-444444444444",
      },
      capability: SELLER_PAYOUT_READ_MODEL_ID,
    });
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor?.beforeId).toBe(
      "44444444-4444-4444-8444-444444444444"
    );
    expect(
      assertNoSensitivePayoutReadFields({
        store_id: "x",
        items: [],
      })
    ).toBe(true);
    expect(
      assertNoSensitivePayoutReadFields({
        ueos_journal_entry_id: "secret",
      })
    ).toBe(false);
    expect(
      assertNoSensitivePayoutReadFields({
        request_fingerprint: "x",
      })
    ).toBe(false);
  });
});

describe("Seller Payout Read Model V1 — migration contracts", () => {
  const sql = read(MIGRATION);
  const foundation = read(FOUNDATION_MIGRATION);

  it("creates owner/manager access gate and grants authenticated execute", () => {
    expect(sql).toMatch(/store_payout_read_assert_store_access/);
    expect(sql).toMatch(/Authentication required/);
    expect(sql).toMatch(/Not authorized/);
    expect(sql).toMatch(
      /is_store_member_with_role\(\s*p_store_id,\s*array\['owner', 'manager'\]\s*\)/
    );
    expect(sql).toMatch(
      /grant execute on function public\.get_my_seller_payout_eligibility\(uuid\)\s+to authenticated, service_role/i
    );
    expect(sql).toMatch(
      /grant execute on function public\.get_my_seller_payout_summary\(uuid\)\s+to authenticated, service_role/i
    );
    expect(sql).toMatch(
      /grant execute on function public\.get_my_seller_payouts\(uuid, integer, timestamptz, uuid\)\s+to authenticated, service_role/i
    );
    expect(sql).not.toMatch(
      /grant execute on function public\.store_payout_read_project_capture/i
    );
  });

  it("projects available / in_transit / completed from foundation states", () => {
    expect(sql).toMatch(/v_status := 'available'/);
    expect(sql).toMatch(/v_status := 'in_transit'/);
    expect(sql).toMatch(/v_status := 'completed'/);
    expect(sql).toMatch(/v_payout_state := public\.store_payout_state_for_capture/);
    expect(sql).toMatch(
      /v_settlement_state := public\.store_settlement_state_for_capture/
    );
    expect(sql).toMatch(/v_settlement_state is distinct from 'RELEASED'/);
  });

  it("excludes unsettled, refunded, and non-owned captures", () => {
    expect(sql).toMatch(/outcome = 'refunded'/);
    expect(sql).toMatch(/payment_status is distinct from 'paid'/);
    expect(sql).toMatch(/v_attempt\.status is distinct from 'captured'/);
    expect(sql).toMatch(/v_order\.store_id is distinct from p_store_id/);
    expect(sql).toMatch(/action = 'release'/);
    expect(sql).toMatch(/ueos_journal_entry_id is not null/);
  });

  it("summarizes per-currency available / in_transit / completed minors", () => {
    expect(sql).toMatch(/'available_minor'/);
    expect(sql).toMatch(/'in_transit_minor'/);
    expect(sql).toMatch(/'completed_minor'/);
    expect(sql).toMatch(/'by_currency'/);
    expect(sql).toMatch(/failed_event_count/);
    expect(sql).toMatch(/bank_payouts_enabled', false/);
  });

  it("lists newest-first with bounded limit and keyset cursor", () => {
    expect(sql).toMatch(/order by c\.created_at desc, c\.id desc/);
    expect(sql).toMatch(/least\(p_limit, 50\)/);
    expect(sql).toMatch(/limit must be >= 1/);
    expect(sql).toMatch(
      /pagination cursor requires both before_created_at and before_id/
    );
    expect(sql).toMatch(/'has_more'/);
    expect(sql).toMatch(/'next_cursor'/);
  });

  it("does not leak fingerprints, journals, rails, or bank fields", () => {
    expect(sql).toMatch(/no fingerprints\/journals\/metadata/i);
    expect(sql).not.toMatch(/'request_fingerprint'/);
    expect(sql).not.toMatch(/'ueos_journal_entry_id', v_/);
    expect(sql).not.toMatch(/bank_account|beneficiary|'rail'/);
    expect(sql).toMatch(/bank_payouts_enabled', false/);
    expect(sql).toMatch(/Does NOT: bank rails/);
  });

  it("tracks fail projections without inventing cancelled enum", () => {
    expect(sql).toMatch(/fail_count/);
    expect(sql).toMatch(/last_payout_action/);
    expect(sql).toMatch(/e\.action = 'fail'/);
    expect(sql).not.toMatch(/'cancelled'/);
  });

  it("does not modify payout foundation write path or invent Dashboard UI", () => {
    expect(sql).not.toMatch(/apply_store_payout_event/);
    expect(sql).not.toMatch(/create table/i);
    expect(foundation).toMatch(/apply_store_payout_event/);
    expect(sql).toMatch(/Does NOT:[\s\S]*Dashboard UI/);
    expect(sql).not.toMatch(/app\/admin|SellerDashboard|admin_ui/i);
  });

  it("documents capability and boundaries", () => {
    const doc = read(DOC);
    expect(doc).toMatch(/commerce\.settlement\.seller_payout_read_model_v1/);
    expect(doc).toMatch(/20260882_store_seller_payout_read_model_v1/);
    expect(doc).toMatch(/get_my_seller_payout_eligibility/);
    expect(doc).toMatch(/get_my_seller_payout_summary/);
    expect(doc).toMatch(/get_my_seller_payouts/);
    expect(doc).toMatch(/NONE/);
    expect(doc).toMatch(/IN_TRANSIT/);
    expect(doc).toMatch(/COMPLETED/);
    expect(doc).toMatch(/available/);
    expect(doc).toMatch(/owner\/manager/);
    expect(doc).toMatch(/bank/i);
    expect(doc).toMatch(/Dashboard/i);
  });
});
