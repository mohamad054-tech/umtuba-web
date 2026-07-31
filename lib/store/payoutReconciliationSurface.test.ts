import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  compareSettlementPayoutReconRowsNewestFirst,
  type SettlementPayoutReconIssueCode,
  type SettlementPayoutReconPage,
  type SettlementPayoutReconRow,
  type SettlementPayoutReconSummary,
} from "./settlementPayoutReconciliation";
import {
  PAYOUT_RECONCILIATION_SURFACE_ID,
  PAYOUT_RECONCILIATION_SURFACE_PAGE_SIZE,
  assertReconPageBelongsToStore,
  buildPayoutReconSurfaceLoadMoreHref,
  buildPayoutReconciliationSurface,
  mapTrustedIssueToSurfaceCategory,
  parsePayoutReconSurfaceCursor,
  payoutReconSurfaceCategories,
  projectReconRowToSurface,
  reconSurfaceRowContainsSensitiveFields,
} from "./payoutReconciliationSurface";

const ROOT = process.cwd();
const DOC =
  "docs/store/implementation/PAYOUT_RECONCILIATION_SURFACE_V1.md";
const COMPONENT = "app/components/store/SellerPayoutReconciliation.tsx";
const PAGE = "app/seller/store/page.tsx";
const INSIGHTS = "app/components/store/SellerDashboardInsights.tsx";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function row(
  overrides: Partial<SettlementPayoutReconRow> & {
    issueCode?: SettlementPayoutReconIssueCode;
    severity?: "ok" | "info" | "warning" | "error";
  } = {}
): SettlementPayoutReconRow {
  const {
    issueCode = "released_without_payout_booking",
    severity = "info",
    ...rest
  } = overrides;
  return {
    orderId: "22222222-2222-4222-8222-222222222222",
    paymentAttemptId: "33333333-3333-4333-8333-333333333333",
    captureEventId: "44444444-4444-4444-8444-444444444444",
    amountMinor: 1500,
    currency: "USD",
    settlementState: "RELEASED",
    payoutState: "NONE",
    issues: [
      {
        code: issueCode,
        severity,
        message: "trusted",
      },
    ],
    highestSeverity: severity,
    captureCreatedAt: "2026-07-30T12:00:00.000Z",
    ...rest,
  };
}

function page(
  overrides: Partial<SettlementPayoutReconPage> = {}
): SettlementPayoutReconPage {
  return {
    storeId: "11111111-1111-4111-8111-111111111111",
    items: [row()],
    limit: PAYOUT_RECONCILIATION_SURFACE_PAGE_SIZE,
    hasMore: false,
    nextCursor: null,
    capability: "commerce.settlement.payout_reconciliation_read_v1",
    ...overrides,
  };
}

function summary(
  overrides: Partial<SettlementPayoutReconSummary> = {}
): SettlementPayoutReconSummary {
  return {
    storeId: "11111111-1111-4111-8111-111111111111",
    byCurrency: [
      {
        currency: "USD",
        captureCount: 2,
        issueCount: 1,
        errorCount: 0,
        infoCount: 1,
      },
      {
        currency: "ZAR",
        captureCount: 1,
        issueCount: 1,
        errorCount: 1,
        infoCount: 0,
      },
    ],
    issueCounts: { released_without_payout_booking: 1 },
    capability: "commerce.settlement.payout_reconciliation_read_v1",
    ...overrides,
  };
}

describe("Payout Reconciliation Surface V1 — files", () => {
  it("ships documentation and seller store wiring", () => {
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(existsSync(join(ROOT, COMPONENT))).toBe(true);
    expect(read(PAGE)).toMatch(/fetchMySellerSettlementPayoutReconciliation/);
    expect(read(PAGE)).toMatch(/buildPayoutReconciliationSurface/);
    expect(read(PAGE)).toMatch(/issuesOnly:\s*true/);
    expect(read(INSIGHTS)).toMatch(/SellerPayoutReconciliation/);
    expect(read(COMPONENT)).toMatch(/Settlement ↔ payout check/);
  });
});

describe("Payout Reconciliation Surface V1 — projection", () => {
  it("maps each supported issue category from trusted vocabulary", () => {
    const cases: Array<[SettlementPayoutReconIssueCode, string]> = [
      ["aligned", "aligned"],
      ["released_without_payout_booking", "released_without_booking"],
      ["payout_without_released_settlement", "orphan_payout"],
      ["unsettled_with_payout", "unsettled_with_payout"],
      ["duplicate_payout_booking", "duplicate_booking"],
      ["completed_without_release", "completed_inconsistency"],
      ["completed_missing_confirm", "completed_inconsistency"],
      ["in_transit_missing_submit", "in_transit_missing_submit"],
      ["refunded_with_active_payout", "refunded_with_active_payout"],
    ];
    for (const [code, category] of cases) {
      expect(mapTrustedIssueToSurfaceCategory(code)).toBe(category);
    }
    expect(payoutReconSurfaceCategories()).toContain("orphan_payout");
    expect(payoutReconSurfaceCategories()).toContain("duplicate_booking");
  });

  it("issues_detected state renders correctly", () => {
    const surface = buildPayoutReconciliationSurface({
      storeId: "11111111-1111-4111-8111-111111111111",
      page: page(),
      summary: summary(),
    });
    expect(surface.overallState).toBe("issues_detected");
    expect(surface.rows).toHaveLength(1);
    expect(surface.rows[0].issues[0].category).toBe(
      "released_without_booking"
    );
    expect(surface.rows[0].amountLabel).toMatch(/15\.00|USD|US\$/);
    expect(surface.currencySummaries).toHaveLength(2);
  });

  it("fully aligned / empty issues-only state renders correctly", () => {
    const surface = buildPayoutReconciliationSurface({
      storeId: "11111111-1111-4111-8111-111111111111",
      page: page({ items: [] }),
      summary: summary({
        byCurrency: [
          {
            currency: "USD",
            captureCount: 3,
            issueCount: 0,
            errorCount: 0,
            infoCount: 0,
          },
        ],
        issueCounts: { aligned: 3 },
      }),
    });
    expect(surface.overallState).toBe("aligned");
    expect(surface.rows).toHaveLength(0);
    expect(surface.message).toMatch(/aligned/i);
    expect(surface.currencySummaries[0].currency).toBe("USD");
    expect(surface.currencySummaries[0].issueCount).toBe(0);
  });

  it("per-currency summaries remain separated", () => {
    const surface = buildPayoutReconciliationSurface({
      storeId: "11111111-1111-4111-8111-111111111111",
      page: page({ items: [] }),
      summary: summary(),
    });
    expect(surface.currencySummaries.map((c) => c.currency)).toEqual([
      "USD",
      "ZAR",
    ]);
    expect(surface.currencySummaries[0].captureCount).toBe(2);
    expect(surface.currencySummaries[1].errorCount).toBe(1);
  });

  it("newest-first ordering", () => {
    const rows = [
      row({
        captureCreatedAt: "2026-07-30T10:00:00.000Z",
        captureEventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),
      row({
        captureCreatedAt: "2026-07-30T12:00:00.000Z",
        captureEventId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      }),
      row({
        captureCreatedAt: "2026-07-30T12:00:00.000Z",
        captureEventId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      }),
    ];
    const sorted = [...rows].sort(compareSettlementPayoutReconRowsNewestFirst);
    expect(sorted.map((r) => r.captureEventId)).toEqual([
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    ]);
    const surface = buildPayoutReconciliationSurface({
      storeId: "11111111-1111-4111-8111-111111111111",
      page: page({ items: rows }),
    });
    expect(surface.rows.map((r) => r.key)).toEqual([
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    ]);
  });

  it("bounded pagination / keyset cursor", () => {
    expect(PAYOUT_RECONCILIATION_SURFACE_PAGE_SIZE).toBe(10);
    expect(parsePayoutReconSurfaceCursor({}).ok).toBe(true);
    expect(
      parsePayoutReconSurfaceCursor({
        beforeCreatedAt: "2026-07-30T00:00:00.000Z",
      }).ok
    ).toBe(false);
    const ok = parsePayoutReconSurfaceCursor({
      beforeCreatedAt: "2026-07-30T00:00:00.000Z",
      beforeId: "44444444-4444-4444-8444-444444444444",
    });
    expect(ok.ok).toBe(true);
    if (ok.ok && ok.cursor) {
      const href = buildPayoutReconSurfaceLoadMoreHref({
        basePath: "/seller/store",
        periodKey: "7d",
        cursor: ok.cursor,
      });
      expect(href).toContain("recon_before=");
      expect(href).toContain("recon_before_id=");
      expect(href).toContain("period=7d");
    }
    const surface = buildPayoutReconciliationSurface({
      storeId: "11111111-1111-4111-8111-111111111111",
      page: page({
        hasMore: true,
        nextCursor: {
          beforeCreatedAt: "2026-07-30T12:00:00.000Z",
          beforeId: "44444444-4444-4444-8444-444444444444",
        },
      }),
    });
    expect(surface.hasMore).toBe(true);
  });

  it("malformed cursor fails closed", () => {
    const bad = parsePayoutReconSurfaceCursor({
      beforeCreatedAt: "not-a-date",
      beforeId: "44444444-4444-4444-8444-444444444444",
    });
    expect(bad.ok).toBe(false);
    const surface = buildPayoutReconciliationSurface({
      storeId: "11111111-1111-4111-8111-111111111111",
      page: null,
      unavailable: true,
      errorMessage: "Invalid reconciliation cursor.",
    });
    expect(surface.overallState).toBe("unavailable");
  });

  it("unavailable / fail-closed state", () => {
    const surface = buildPayoutReconciliationSurface({
      storeId: "11111111-1111-4111-8111-111111111111",
      page: null,
      unavailable: true,
      errorMessage:
        "Settlement payout reconciliation is unavailable until the migration is applied.",
    });
    expect(surface.overallState).toBe("unavailable");
    expect(surface.rows).toHaveLength(0);
    expect(surface.bankRailsEnabled).toBe(false);
    expect(surface.repairActionsEnabled).toBe(false);
  });

  it("no sensitive fields rendered", () => {
    const projected = projectReconRowToSurface(row());
    expect(reconSurfaceRowContainsSensitiveFields(projected)).toBe(false);
    const blob = JSON.stringify(projected);
    expect(blob).not.toMatch(/ueos_journal/i);
    expect(blob).not.toMatch(/request_fingerprint/i);
    expect(blob).not.toMatch(/bank_account/i);
    expect(Object.keys(projected)).not.toContain("paymentAttemptId");
  });

  it("another store/seller cannot leak data", () => {
    const foreign = page({
      storeId: "99999999-9999-4999-8999-999999999999",
    });
    expect(
      assertReconPageBelongsToStore(
        foreign,
        "11111111-1111-4111-8111-111111111111"
      ).ok
    ).toBe(false);
    const surface = buildPayoutReconciliationSurface({
      storeId: "11111111-1111-4111-8111-111111111111",
      page: foreign,
    });
    expect(surface.overallState).toBe("unavailable");
    expect(surface.rows).toHaveLength(0);
  });
});

describe("Payout Reconciliation Surface V1 — UI contracts", () => {
  it("component has no repair / withdraw actions", () => {
    const src = read(COMPONENT);
    expect(src).toMatch(/Settlement ↔ payout check/);
    expect(src).toMatch(/Load older issues/);
    expect(src).toMatch(/role="status"/);
    expect(src).toMatch(/No repair, withdraw, or bank-connect actions/);
    expect(src).not.toMatch(/apply_store_payout_event/);
    expect(src).not.toMatch(/ueos_journal|request_fingerprint|beneficiary/i);
  });

  it("documents capability and boundaries", () => {
    const doc = read(DOC);
    expect(doc).toMatch(
      /commerce\.settlement\.payout_reconciliation_surface_v1/
    );
    expect(doc).toMatch(/20260883/);
    expect(doc).toMatch(/get_my_seller_settlement_payout_reconciliation/);
    expect(doc).toMatch(/issues_only|issues-only|issuesOnly/i);
    expect(doc).toMatch(/released_without_booking/);
    expect(doc).toMatch(/orphan_payout/);
    expect(doc).toMatch(/Dashboard/i);
    expect(doc).toMatch(/no new migration|None\./i);
    expect(PAYOUT_RECONCILIATION_SURFACE_ID).toBe(
      "commerce.settlement.payout_reconciliation_surface_v1"
    );
  });
});
