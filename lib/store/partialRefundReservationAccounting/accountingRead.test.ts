/**
 * Partial refund reservation accounting audit/review tests (mocks only).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { MemoryPartialRefundLedgerRepository } from "../partialRefundLedger";
import {
  PARTIAL_REFUND_ACCOUNTING_AUDIT_ID,
  getPartialRefundCommittedReservationDetail,
  loadPartialRefundCaptureAccountingReview,
  partialRefundAccountingAuditOwnership,
} from "./index";

const ROOT = join(__dirname, "../../..");

const IDS = {
  store: "11111111-1111-4111-8111-111111111111",
  storeB: "aaaaaaaa-1111-4111-8111-111111111111",
  order: "22222222-2222-4222-8222-222222222222",
  attempt: "33333333-3333-4333-8333-333333333333",
  capture: "44444444-4444-4444-8444-444444444444",
  item: "55555555-5555-4555-8555-555555555555",
  ledger: "66666666-6666-4666-8666-666666666666",
};

type TableRow = Record<string, unknown>;

function makeFactClient(tables: {
  payment_attempts?: TableRow[];
  orders?: TableRow[];
  store_payment_outcome_events?: TableRow[];
  order_items?: TableRow[];
}) {
  return {
    from(table: string) {
      const rows = (tables as Record<string, TableRow[]>)[table] ?? [];
      let filtered = [...rows];
      const api: {
        select: () => typeof api;
        eq: (col: string, val: unknown) => typeof api;
        order: () => typeof api;
        maybeSingle: () => Promise<{ data: TableRow | null; error: null }>;
        then: (
          resolve: (v: { data: TableRow[]; error: null }) => unknown,
          reject?: (e: unknown) => unknown
        ) => Promise<unknown>;
      } = {
        select() {
          return api;
        },
        eq(col: string, val: unknown) {
          filtered = filtered.filter((r) => String(r[col]) === String(val));
          return api;
        },
        order() {
          return api;
        },
        async maybeSingle() {
          return { data: filtered[0] ?? null, error: null };
        },
        then(resolve, reject) {
          return Promise.resolve({ data: filtered, error: null }).then(
            resolve,
            reject
          );
        },
      };
      return api;
    },
  };
}

function seedHappyTables(overrides?: { storeId?: string }) {
  const storeId = overrides?.storeId ?? IDS.store;
  const amount = 2000;
  return {
    payment_attempts: [
      {
        id: IDS.attempt,
        order_id: IDS.order,
        amount_minor: amount,
        currency: "USD",
        status: "succeeded",
      },
    ],
    orders: [
      {
        id: IDS.order,
        store_id: storeId,
        currency: "USD",
        grand_total_minor: amount,
        payment_status: "paid",
        status: "confirmed",
      },
    ],
    store_payment_outcome_events: [
      {
        id: IDS.capture,
        payment_attempt_id: IDS.attempt,
        amount_minor: amount,
        currency: "USD",
        outcome: "captured",
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ],
    order_items: [
      {
        id: IDS.item,
        order_id: IDS.order,
        quantity: 4,
        unit_price_minor: 500,
        total_price_minor: 2000,
        title_snapshot: "Widget",
      },
    ],
  };
}

describe("partialRefundReservationAccounting read service", () => {
  it("loads review with zero committed when no accounting row", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    const client = makeFactClient(seedHappyTables());
    const result = await loadPartialRefundCaptureAccountingReview(
      { factClient: client as never, repository: repo },
      { storeId: IDS.store, paymentAttemptId: IDS.attempt }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.review.captureAmountMinor).toBe(2000);
    expect(result.review.committedReservationAmountMinor).toBe(0);
    expect(result.review.remainingReservableAmountMinor).toBe(2000);
    expect(result.review.accountingVersion).toBe(0);
    expect(result.review.lines[0]?.remainingReservableQuantity).toBe(4);
    expect(result.review.warning).toBe(
      "ledger_reservation_only_no_provider_refund_or_money_movement"
    );
    expect(result.moneyMoved).toBe(false);
    expect(result.reservationCreated).toBe(false);
    expect(result.capability).toBe(PARTIAL_REFUND_ACCOUNTING_AUDIT_ID);
  });

  it("derives remaining amount and quantity from trusted snapshot", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    await repo.ensureCaptureAccounting({
      storeId: IDS.store,
      orderId: IDS.order,
      paymentAttemptId: IDS.attempt,
      captureEventId: IDS.capture,
      currency: "USD",
      captureAmountMinor: 2000,
    });
    const planned = await repo.insertPlanned(
      {
        ledgerId: IDS.ledger,
        idempotencyKey: "acct-review-idem-01",
        storeId: IDS.store,
        orderId: IDS.order,
        paymentAttemptId: IDS.attempt,
        captureEventId: IDS.capture,
        currency: "USD",
        captureAmountMinor: 2000,
        refundAmountMinor: 500,
        calculationFingerprint: "fp_acct_review_01",
        expectedAccountingVersion: 0,
        lines: [
          {
            orderItemId: IDS.item,
            requestedQuantity: 1,
            refundAmountMinor: 500,
          },
        ],
      },
      "2026-01-01T00:00:00.000Z"
    );
    expect(planned.ok).toBe(true);
    if (!planned.ok) return;
    const begun = await repo.transitionToCommitting(
      IDS.ledger,
      "planned",
      0,
      "2026-01-01T00:01:00.000Z",
      { [IDS.item]: 4 }
    );
    expect(begun.ok).toBe(true);
    const done = await repo.completeCommitted(
      IDS.ledger,
      0,
      "2026-01-01T00:02:00.000Z"
    );
    expect(done.ok).toBe(true);

    const client = makeFactClient(seedHappyTables());
    const result = await loadPartialRefundCaptureAccountingReview(
      { factClient: client as never, repository: repo },
      { storeId: IDS.store, paymentAttemptId: IDS.attempt }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.review.committedReservationAmountMinor).toBe(500);
    expect(result.review.remainingReservableAmountMinor).toBe(1500);
    expect(result.review.lines[0]?.committedReservedQuantity).toBe(1);
    expect(result.review.lines[0]?.remainingReservableQuantity).toBe(3);
    expect(result.review.committedReservations).toHaveLength(1);
    expect(result.review.accountingVersion).toBeGreaterThanOrEqual(1);
    expect(result.providerRefundExecuted).toBe(false);
  });

  it("rejects cross-store access", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    const client = makeFactClient(seedHappyTables());
    const result = await loadPartialRefundCaptureAccountingReview(
      { factClient: client as never, repository: repo },
      { storeId: IDS.storeB, paymentAttemptId: IDS.attempt }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe("unauthorized");
  });

  it("rejects unknown payment attempt", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    const client = makeFactClient(seedHappyTables());
    const result = await loadPartialRefundCaptureAccountingReview(
      { factClient: client as never, repository: repo },
      {
        storeId: IDS.store,
        paymentAttemptId: "33333333-3333-4333-8333-333333333399",
      }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe("not_found");
  });

  it("fails closed on inconsistent committed amount over capture", async () => {
    const repo = {
      async getCaptureAccounting() {
        return {
          storeId: IDS.store,
          orderId: IDS.order,
          paymentAttemptId: IDS.attempt,
          captureEventId: IDS.capture,
          currency: "USD",
          captureAmountMinor: 2000,
          committedRefundAmountMinor: 5000,
          committedQuantityByLineId: {},
          accountingVersion: 1,
        };
      },
      async listCommittedForCapture() {
        return [];
      },
      async getByLedgerId() {
        return null;
      },
    };
    const client = makeFactClient(seedHappyTables());
    const result = await loadPartialRefundCaptureAccountingReview(
      { factClient: client as never, repository: repo as never },
      { storeId: IDS.store, paymentAttemptId: IDS.attempt }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe("inconsistent_accounting");
  });

  it("fails closed on committed qty exceeding purchased", async () => {
    const repo = {
      async getCaptureAccounting() {
        return {
          storeId: IDS.store,
          orderId: IDS.order,
          paymentAttemptId: IDS.attempt,
          captureEventId: IDS.capture,
          currency: "USD",
          captureAmountMinor: 2000,
          committedRefundAmountMinor: 0,
          committedQuantityByLineId: { [IDS.item]: 99 },
          accountingVersion: 1,
        };
      },
      async listCommittedForCapture() {
        return [];
      },
      async getByLedgerId() {
        return null;
      },
    };
    const client = makeFactClient(seedHappyTables());
    const result = await loadPartialRefundCaptureAccountingReview(
      { factClient: client as never, repository: repo as never },
      { storeId: IDS.store, paymentAttemptId: IDS.attempt }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe("inconsistent_accounting");
  });

  it("get detail requires matching store and committed status", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    await repo.ensureCaptureAccounting({
      storeId: IDS.store,
      orderId: IDS.order,
      paymentAttemptId: IDS.attempt,
      captureEventId: IDS.capture,
      currency: "USD",
      captureAmountMinor: 2000,
    });
    await repo.insertPlanned(
      {
        ledgerId: IDS.ledger,
        idempotencyKey: "acct-detail-idem-01",
        storeId: IDS.store,
        orderId: IDS.order,
        paymentAttemptId: IDS.attempt,
        captureEventId: IDS.capture,
        currency: "USD",
        captureAmountMinor: 2000,
        refundAmountMinor: 500,
        calculationFingerprint: "fp_acct_detail_01",
        expectedAccountingVersion: 0,
        lines: [
          {
            orderItemId: IDS.item,
            requestedQuantity: 1,
            refundAmountMinor: 500,
          },
        ],
      },
      "2026-01-01T00:00:00.000Z"
    );
    await repo.transitionToCommitting(
      IDS.ledger,
      "planned",
      0,
      "2026-01-01T00:01:00.000Z",
      { [IDS.item]: 4 }
    );
    await repo.completeCommitted(IDS.ledger, 0, "2026-01-01T00:02:00.000Z");

    const ok = await getPartialRefundCommittedReservationDetail(
      { repository: repo },
      { ledgerId: IDS.ledger, expectedStoreId: IDS.store }
    );
    expect(ok.ok).toBe(true);

    const cross = await getPartialRefundCommittedReservationDetail(
      { repository: repo },
      { ledgerId: IDS.ledger, expectedStoreId: IDS.storeB }
    );
    expect(cross.ok).toBe(false);
    if (cross.ok) return;
    expect(cross.status).toBe("unauthorized");

    const missing = await getPartialRefundCommittedReservationDetail(
      { repository: repo },
      {
        ledgerId: "77777777-7777-4777-8777-777777777777",
        expectedStoreId: IDS.store,
      }
    );
    expect(missing.ok).toBe(false);
  });

  it("never calls mutation RPCs on repository", async () => {
    const calls: string[] = [];
    const repo = {
      async getCaptureAccounting() {
        calls.push("getCaptureAccounting");
        return null;
      },
      async listCommittedForCapture() {
        calls.push("listCommittedForCapture");
        return [];
      },
      async getByLedgerId() {
        calls.push("getByLedgerId");
        return null;
      },
      ensureCaptureAccounting: vi.fn(),
      insertPlanned: vi.fn(),
      transitionToCommitting: vi.fn(),
      completeCommitted: vi.fn(),
      markFailed: vi.fn(),
      getByIdempotencyKey: vi.fn(),
    };
    const client = makeFactClient(seedHappyTables());
    await loadPartialRefundCaptureAccountingReview(
      { factClient: client as never, repository: repo as never },
      { storeId: IDS.store, paymentAttemptId: IDS.attempt }
    );
    expect(calls).toEqual(["getCaptureAccounting", "listCommittedForCapture"]);
    expect(repo.ensureCaptureAccounting).not.toHaveBeenCalled();
    expect(repo.insertPlanned).not.toHaveBeenCalled();
    expect(repo.transitionToCommitting).not.toHaveBeenCalled();
    expect(repo.completeCommitted).not.toHaveBeenCalled();
    expect(repo.markFailed).not.toHaveBeenCalled();
  });

  it("capability ownership is read-only", () => {
    const o = partialRefundAccountingAuditOwnership();
    expect(o.ownsCaptureAccountingRead).toBe(true);
    expect(o.ownsAdminAccountingReviewUi).toBe(true);
    expect(o.ownsSellerAccountingReviewRead).toBe(true);
    expect(o.ownsReservationCreateInThisMilestone).toBe(false);
    expect(o.ownsReservationCancel).toBe(false);
    expect(o.ownsReservationCompensation).toBe(false);
    expect(o.ownsPartialRefundProviderRefundExecution).toBe(false);
    expect(o.ownsSellerReservationRequest).toBe(false);
    expect(o.ownsBuyerPublicRead).toBe(false);
  });
});

describe("partialRefundReservationAccounting UI audits", () => {
  it("admin review UI labels reservation accounting and has no money input", () => {
    const src = readFileSync(
      join(
        ROOT,
        "app/admin/store/refunds/PartialRefundAccountingReviewPanel.tsx"
      ),
      "utf8"
    );
    expect(src).toMatch(/Partial refund reservation accounting/);
    expect(src).toMatch(/no provider refund or money movement has\s+occurred/i);
    expect(src).toMatch(/ACCOUNTING COMPENSATION ONLY/);
    expect(src).not.toMatch(/Execute Refund|Cancel reservation|Refund Money/);
    expect(src).not.toMatch(/name=["']amount/i);
    expect(src).not.toMatch(/adminRequestPartialRefundReservationAction/);
  });

  it("seller panel remains read-only without request controls", () => {
    const src = readFileSync(
      join(
        ROOT,
        "app/components/store/SellerPartialRefundReservationPanel.tsx"
      ),
      "utf8"
    );
    expect(src).toMatch(/Read-only/);
    expect(src).toMatch(/seller-pr-accounting-review/);
    expect(src).not.toMatch(/Create ledger reservation/);
    expect(src).not.toMatch(/name=["']amount/i);
  });

  it("accounting actions module is read-only", () => {
    const src = readFileSync(
      join(ROOT, "app/actions/storePartialRefundReservationAccounting.ts"),
      "utf8"
    );
    expect(src).not.toMatch(/requestPartialRefundReservation/);
    expect(src).not.toMatch(/reservePartialRefundLedgerCommit/);
    expect(src).not.toMatch(/applyFullOrderRefund/);
    expect(src).not.toMatch(/ensureCaptureAccounting/);
    expect(src).toMatch(/adminLoadPartialRefundAccountingReview/);
    expect(src).toMatch(/sellerLoadPartialRefundAccountingReview/);
  });

  it("existing reservation request panel remains present and unchanged in role", () => {
    const page = readFileSync(
      join(ROOT, "app/admin/store/refunds/page.tsx"),
      "utf8"
    );
    expect(page).toMatch(/PartialRefundReservationPanel/);
    expect(page).toMatch(/PartialRefundAccountingReviewPanel/);
    const createPanel = readFileSync(
      join(ROOT, "app/admin/store/refunds/PartialRefundReservationPanel.tsx"),
      "utf8"
    );
    expect(createPanel).toMatch(/Create ledger reservation/);
  });
});
