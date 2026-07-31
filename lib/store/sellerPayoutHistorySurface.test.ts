import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { SellerPayoutListItem, SellerPayoutListPage } from "./sellerPayoutReadModel";
import {
  SELLER_PAYOUT_HISTORY_PAGE_SIZE,
  SELLER_PAYOUT_HISTORY_SURFACE_ID,
  assertHistoryPageBelongsToStore,
  buildSellerPayoutHistoryLoadMoreHref,
  buildSellerPayoutHistorySurface,
  compareSellerPayoutHistoryNewestFirst,
  historyRowContainsSensitiveFields,
  normalizeSellerPayoutHistoryStatus,
  parseSellerPayoutHistoryCursor,
  projectSellerPayoutHistoryRow,
  sellerPayoutHistoryStatusLabel,
  sellerPayoutHistoryVocabulary,
} from "./sellerPayoutHistorySurface";

const ROOT = process.cwd();
const DOC =
  "docs/store/implementation/SELLER_PAYOUT_HISTORY_SURFACE_V1.md";
const COMPONENT = "app/components/store/SellerPayoutHistory.tsx";
const PAGE = "app/seller/store/page.tsx";
const INSIGHTS = "app/components/store/SellerDashboardInsights.tsx";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function item(
  overrides: Partial<SellerPayoutListItem> = {}
): SellerPayoutListItem {
  return {
    orderId: "22222222-2222-4222-8222-222222222222",
    paymentAttemptId: "33333333-3333-4333-8333-333333333333",
    captureEventId: "44444444-4444-4444-8444-444444444444",
    amountMinor: 1500,
    currency: "usd",
    settlementState: "RELEASED",
    payoutState: "NONE",
    payoutStatus: "available",
    lastPayoutAction: null,
    lastPayoutAt: null,
    failCount: 0,
    captureCreatedAt: "2026-07-30T12:00:00.000Z",
    ...overrides,
  };
}

function page(
  overrides: Partial<SellerPayoutListPage> = {}
): SellerPayoutListPage {
  return {
    storeId: "11111111-1111-4111-8111-111111111111",
    items: [item()],
    limit: SELLER_PAYOUT_HISTORY_PAGE_SIZE,
    hasMore: false,
    nextCursor: null,
    capability: "commerce.settlement.seller_payout_read_model_v1",
    ...overrides,
  };
}

describe("Seller Payout History Surface V1 — files", () => {
  it("ships documentation and seller store wiring", () => {
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(existsSync(join(ROOT, COMPONENT))).toBe(true);
    expect(read(PAGE)).toMatch(/fetchMySellerPayouts/);
    expect(read(PAGE)).toMatch(/buildSellerPayoutHistorySurface/);
    expect(read(INSIGHTS)).toMatch(/SellerPayoutHistory/);
    expect(read(COMPONENT)).toMatch(/Payout history/);
  });
});

describe("Seller Payout History Surface V1 — projection", () => {
  it("valid payout history renders amount, currency, and status vocabulary", () => {
    const row = projectSellerPayoutHistoryRow(
      item({
        amountMinor: 1500,
        currency: "usd",
        payoutStatus: "available",
      })
    );
    expect(row.currency).toBe("USD");
    expect(row.amountMinor).toBe(1500);
    expect(row.amountLabel).toMatch(/15\.00|USD|US\$/);
    expect(row.status).toBe("available");
    expect(row.statusLabel).toBe("Available");
    expect(sellerPayoutHistoryVocabulary()).toEqual([
      "available",
      "in_transit",
      "completed",
    ]);
  });

  it("status projection is correct for available / in_transit / completed / fail note", () => {
    expect(normalizeSellerPayoutHistoryStatus("in_transit")).toBe("in_transit");
    expect(sellerPayoutHistoryStatusLabel("completed")).toBe("Completed");
    expect(sellerPayoutHistoryStatusLabel("cancelled")).toBe("Available");

    const failed = projectSellerPayoutHistoryRow(
      item({
        payoutStatus: "available",
        lastPayoutAction: "fail",
        failCount: 1,
        lastPayoutAt: "2026-07-31T01:00:00.000Z",
      })
    );
    expect(failed.status).toBe("available");
    expect(failed.failNote).toMatch(/failed/i);
    expect(failed.lastActivityAtLabel).toBeTruthy();
  });

  it("deterministic ordering newest-first", () => {
    const rows = [
      item({
        captureCreatedAt: "2026-07-30T10:00:00.000Z",
        captureEventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),
      item({
        captureCreatedAt: "2026-07-30T12:00:00.000Z",
        captureEventId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      }),
      item({
        captureCreatedAt: "2026-07-30T12:00:00.000Z",
        captureEventId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      }),
    ];
    const sorted = [...rows].sort(compareSellerPayoutHistoryNewestFirst);
    expect(sorted.map((r) => r.captureEventId)).toEqual([
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    ]);
  });

  it("empty state", () => {
    const surface = buildSellerPayoutHistorySurface({
      storeId: "11111111-1111-4111-8111-111111111111",
      page: page({ items: [] }),
    });
    expect(surface.state).toBe("empty");
    expect(surface.rows).toHaveLength(0);
    expect(surface.message).toMatch(/No released payouts/i);
  });

  it("unavailable / fail-closed state", () => {
    const surface = buildSellerPayoutHistorySurface({
      storeId: "11111111-1111-4111-8111-111111111111",
      page: null,
      unavailable: true,
      errorMessage: "Seller payout read model is unavailable until the migration is applied.",
    });
    expect(surface.state).toBe("unavailable");
    expect(surface.rows).toHaveLength(0);
    expect(surface.message).toMatch(/unavailable/i);
    expect(surface.bankRailsEnabled).toBe(false);
  });

  it("bounded pagination / cursor behavior", () => {
    expect(SELLER_PAYOUT_HISTORY_PAGE_SIZE).toBe(10);
    expect(parseSellerPayoutHistoryCursor({}).ok).toBe(true);
    expect(
      parseSellerPayoutHistoryCursor({ beforeCreatedAt: "2026-07-30T00:00:00Z" })
        .ok
    ).toBe(false);
    expect(
      parseSellerPayoutHistoryCursor({
        beforeCreatedAt: "2026-07-30T00:00:00.000Z",
        beforeId: "not-uuid",
      }).ok
    ).toBe(false);
    const ok = parseSellerPayoutHistoryCursor({
      beforeCreatedAt: "2026-07-30T00:00:00.000Z",
      beforeId: "44444444-4444-4444-8444-444444444444",
    });
    expect(ok.ok).toBe(true);
    if (ok.ok && ok.cursor) {
      const href = buildSellerPayoutHistoryLoadMoreHref({
        basePath: "/seller/store",
        periodKey: "7d",
        cursor: ok.cursor,
      });
      expect(href).toContain("payout_before=");
      expect(href).toContain("payout_before_id=");
      expect(href).toContain("period=7d");
    }

    const surface = buildSellerPayoutHistorySurface({
      storeId: "11111111-1111-4111-8111-111111111111",
      page: page({
        hasMore: true,
        nextCursor: {
          beforeCreatedAt: "2026-07-30T12:00:00.000Z",
          beforeId: "44444444-4444-4444-8444-444444444444",
        },
      }),
    });
    expect(surface.state).toBe("ready");
    expect(surface.hasMore).toBe(true);
    expect(surface.nextCursor?.beforeId).toBe(
      "44444444-4444-4444-8444-444444444444"
    );
  });

  it("no sensitive fields rendered in projected rows", () => {
    const row = projectSellerPayoutHistoryRow(item());
    expect(historyRowContainsSensitiveFields(row)).toBe(false);
    const blob = JSON.stringify(row);
    expect(blob).not.toMatch(/ueos_journal/i);
    expect(blob).not.toMatch(/request_fingerprint/i);
    expect(blob).not.toMatch(/bank_account/i);
    expect(blob).not.toMatch(/beneficiary/i);
    expect(Object.keys(row)).not.toContain("paymentAttemptId");
  });

  it("another seller/store cannot leak data", () => {
    const foreign = page({
      storeId: "99999999-9999-4999-8999-999999999999",
    });
    expect(
      assertHistoryPageBelongsToStore(
        foreign,
        "11111111-1111-4111-8111-111111111111"
      ).ok
    ).toBe(false);
    const surface = buildSellerPayoutHistorySurface({
      storeId: "11111111-1111-4111-8111-111111111111",
      page: foreign,
    });
    expect(surface.state).toBe("unavailable");
    expect(surface.rows).toHaveLength(0);
    expect(surface.message).toMatch(/does not belong/i);
  });
});

describe("Seller Payout History Surface V1 — UI contracts", () => {
  it("component has no withdraw / bank-connect actions and no sensitive labels", () => {
    const src = read(COMPONENT);
    expect(src).toMatch(/Payout history/);
    expect(src).toMatch(/Load older payouts/);
    expect(src).toMatch(/role="status"/);
    expect(src).toMatch(/No withdraw or bank-connect actions/);
    expect(src).not.toMatch(/<button[^>]*>[\s\S]*Withdraw/i);
    expect(src).not.toMatch(/href=.*withdraw/i);
    expect(src).not.toMatch(/Connect bank account/i);
    expect(src).not.toMatch(/ueos_journal|request_fingerprint|beneficiary/i);
    expect(src).not.toMatch(/apply_store_payout_event/);
  });

  it("documents capability and boundaries", () => {
    const doc = read(DOC);
    expect(doc).toMatch(/commerce\.settlement\.seller_payout_history_surface_v1/);
    expect(doc).toMatch(/get_my_seller_payouts/);
    expect(doc).toMatch(/20260882/);
    expect(doc).toMatch(/available/);
    expect(doc).toMatch(/in_transit/);
    expect(doc).toMatch(/completed/);
    expect(doc).toMatch(/Dashboard/i);
    expect(doc).toMatch(/bank/i);
    expect(doc).toMatch(/no new migration|None\./i);
    expect(SELLER_PAYOUT_HISTORY_SURFACE_ID).toBe(
      "commerce.settlement.seller_payout_history_surface_v1"
    );
  });
});
