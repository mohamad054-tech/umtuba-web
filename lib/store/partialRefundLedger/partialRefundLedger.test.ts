/**
 * Focused tests — Partial Refund Durable Ledger & Commit Boundary V1.
 */

import { describe, expect, it } from "vitest";
import { calculatePartialRefundPlan } from "../partialRefundPath";
import {
  assertPartialRefundMoneyExecutionAllowed,
  beginPartialRefundLedgerCommit,
  canTransitionPartialRefundLedgerState,
  completePartialRefundLedgerCommit,
  failPartialRefundLedgerCommit,
  MemoryPartialRefundLedgerRepository,
  PARTIAL_REFUND_LEDGER_ID,
  partialRefundLedgerCapabilityOwnership,
  planPartialRefundLedgerCommit,
  priorAccountingFromCommittedLedger,
  purchasedQuantityGuardFromLineFacts,
  type PartialRefundLedgerPlanInput,
} from "./index";

const STORE = "11111111-1111-4111-8111-111111111111";
const ORDER = "44444444-4444-4444-8444-444444444444";
const ATTEMPT = "33333333-3333-4333-8333-333333333333";
const CAPTURE = "55555555-5555-4555-8555-555555555555";
const LINE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const LINE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const LEDGER_1 = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const LEDGER_2 = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

function basePlan(
  overrides: Partial<PartialRefundLedgerPlanInput> = {}
): PartialRefundLedgerPlanInput {
  return {
    ledgerId: LEDGER_1,
    idempotencyKey: "partial-refund-ledger-idem-0001",
    storeId: STORE,
    orderId: ORDER,
    paymentAttemptId: ATTEMPT,
    captureEventId: CAPTURE,
    currency: "USD",
    captureAmountMinor: 10000,
    refundAmountMinor: 1500,
    calculationFingerprint: "prf1_test_fingerprint_v1",
    expectedAccountingVersion: 0,
    lines: [
      {
        orderItemId: LINE_A,
        requestedQuantity: 1,
        refundAmountMinor: 1500,
      },
    ],
    ...overrides,
  };
}

const LINE_FACTS = [
  {
    orderItemId: LINE_A,
    orderId: ORDER,
    storeId: STORE,
    purchasedQuantity: 4,
    unitPriceMinor: 1500,
    totalPriceMinor: 6000,
    currency: "USD",
  },
  {
    orderItemId: LINE_B,
    orderId: ORDER,
    storeId: STORE,
    purchasedQuantity: 2,
    unitPriceMinor: 2000,
    totalPriceMinor: 4000,
    currency: "USD",
  },
];

describe("Partial refund ledger — capability & state machine", () => {
  it("owns ledger domain + commit boundary; money/restock/settlement remain false", () => {
    expect(PARTIAL_REFUND_LEDGER_ID).toBe(
      "commerce.payments.partial_refund_ledger_commit_boundary_v1"
    );
    const o = partialRefundLedgerCapabilityOwnership();
    expect(o.ownsPartialRefundLedgerDomain).toBe(true);
    expect(o.ownsPartialRefundCommitBoundary).toBe(true);
    expect(o.ownsPartialRefundMoneyExecution).toBe(false);
    expect(o.ownsPartialRefundProviderRefund).toBe(false);
    expect(o.ownsPartialRefundRestock).toBe(false);
    expect(o.ownsPartialEntitlementAdjustment).toBe(false);
    expect(o.ownsPartialSettlementUnwind).toBe(false);
    expect(o.ownsPartialCommissionUnwind).toBe(false);
  });

  it("allows only explicit transitions", () => {
    expect(canTransitionPartialRefundLedgerState("planned", "committing")).toBe(
      true
    );
    expect(canTransitionPartialRefundLedgerState("committing", "committed")).toBe(
      true
    );
    expect(canTransitionPartialRefundLedgerState("committing", "failed")).toBe(
      true
    );
    expect(canTransitionPartialRefundLedgerState("failed", "committing")).toBe(
      true
    );
    expect(canTransitionPartialRefundLedgerState("planned", "committed")).toBe(
      false
    );
    expect(canTransitionPartialRefundLedgerState("committed", "failed")).toBe(
      false
    );
  });

  it("fail-closes money execution runtime", () => {
    const r = assertPartialRefundMoneyExecutionAllowed();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("unsupported_runtime");
  });
});

describe("Partial refund ledger — commit boundary", () => {
  it("plans → begins → completes durable reservation", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    const planned = await planPartialRefundLedgerCommit(repo, basePlan());
    expect(planned.ok).toBe(true);
    if (!planned.ok) return;
    expect(planned.value.status).toBe("planned");

    const begun = await beginPartialRefundLedgerCommit(
      repo,
      LEDGER_1,
      purchasedQuantityGuardFromLineFacts(LINE_FACTS)
    );
    expect(begun.ok).toBe(true);
    if (!begun.ok) return;
    expect(begun.value.status).toBe("committing");

    const done = await completePartialRefundLedgerCommit(repo, LEDGER_1);
    expect(done.ok).toBe(true);
    if (!done.ok) return;
    expect(done.value.status).toBe("committed");

    const snap = await repo.getCaptureAccounting(CAPTURE);
    expect(snap?.committedRefundAmountMinor).toBe(1500);
    expect(snap?.committedQuantityByLineId[LINE_A]).toBe(1);
    expect(snap?.accountingVersion).toBe(1);
  });

  it("idempotent plan replay with same fingerprint", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    const a = await planPartialRefundLedgerCommit(repo, basePlan());
    const b = await planPartialRefundLedgerCommit(repo, basePlan());
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(b.value.ledgerId).toBe(a.value.ledgerId);
  });

  it("rejects duplicate ledger id and conflicting idempotency payload", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    await planPartialRefundLedgerCommit(repo, basePlan());
    const dupId = await planPartialRefundLedgerCommit(
      repo,
      basePlan({
        ledgerId: LEDGER_1,
        idempotencyKey: "partial-refund-ledger-idem-0002",
      })
    );
    expect(dupId.ok).toBe(false);
    if (!dupId.ok) expect(dupId.code).toBe("duplicate_ledger_id");

    const conflict = await planPartialRefundLedgerCommit(
      repo,
      basePlan({
        ledgerId: LEDGER_2,
        refundAmountMinor: 3000,
        calculationFingerprint: "different",
        lines: [
          {
            orderItemId: LINE_A,
            requestedQuantity: 2,
            refundAmountMinor: 3000,
          },
        ],
      })
    );
    expect(conflict.ok).toBe(false);
    if (!conflict.ok) expect(conflict.code).toBe("duplicate_idempotency_key");
  });

  it("rejects over-refund across sequential commits", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    const qtyGuard = purchasedQuantityGuardFromLineFacts(LINE_FACTS);

    const planA = await planPartialRefundLedgerCommit(
      repo,
      basePlan({
        ledgerId: LEDGER_1,
        idempotencyKey: "partial-refund-ledger-idem-a001",
        refundAmountMinor: 8000,
        lines: [
          {
            orderItemId: LINE_A,
            requestedQuantity: 4,
            refundAmountMinor: 6000,
          },
          {
            orderItemId: LINE_B,
            requestedQuantity: 1,
            refundAmountMinor: 2000,
          },
        ],
      })
    );
    expect(planA.ok).toBe(true);
    if (!planA.ok) return;
    expect(
      (await beginPartialRefundLedgerCommit(repo, LEDGER_1, qtyGuard)).ok
    ).toBe(true);
    expect((await completePartialRefundLedgerCommit(repo, LEDGER_1)).ok).toBe(
      true
    );

    const planB = await planPartialRefundLedgerCommit(
      repo,
      basePlan({
        ledgerId: LEDGER_2,
        idempotencyKey: "partial-refund-ledger-idem-b001",
        expectedAccountingVersion: 1,
        refundAmountMinor: 3000,
        lines: [
          {
            orderItemId: LINE_B,
            requestedQuantity: 1,
            refundAmountMinor: 3000,
          },
        ],
      })
    );
    expect(planB.ok).toBe(false);
    if (!planB.ok) expect(planB.code).toBe("over_refund");
  });

  it("rejects over-quantity using trusted purchased facts", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    const qtyGuard = purchasedQuantityGuardFromLineFacts(LINE_FACTS);
    const planned = await planPartialRefundLedgerCommit(
      repo,
      basePlan({
        refundAmountMinor: 6000,
        lines: [
          {
            orderItemId: LINE_A,
            requestedQuantity: 4,
            refundAmountMinor: 6000,
          },
        ],
      })
    );
    expect(planned.ok).toBe(true);
    if (!planned.ok) return;
    expect(
      (await beginPartialRefundLedgerCommit(repo, LEDGER_1, qtyGuard)).ok
    ).toBe(true);
    expect((await completePartialRefundLedgerCommit(repo, LEDGER_1)).ok).toBe(
      true
    );

    const second = await planPartialRefundLedgerCommit(
      repo,
      basePlan({
        ledgerId: LEDGER_2,
        idempotencyKey: "partial-refund-ledger-idem-qty2",
        expectedAccountingVersion: 1,
        refundAmountMinor: 1500,
        lines: [
          {
            orderItemId: LINE_A,
            requestedQuantity: 1,
            refundAmountMinor: 1500,
          },
        ],
      })
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    const begun = await beginPartialRefundLedgerCommit(
      repo,
      LEDGER_2,
      qtyGuard
    );
    expect(begun.ok).toBe(false);
    if (!begun.ok) expect(begun.code).toBe("over_quantity");
  });

  it("rejects stale version and unknown refund", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    await planPartialRefundLedgerCommit(repo, basePlan());
    const guard = purchasedQuantityGuardFromLineFacts(LINE_FACTS);
    await beginPartialRefundLedgerCommit(repo, LEDGER_1, guard);
    await completePartialRefundLedgerCommit(repo, LEDGER_1);

    const stale = await planPartialRefundLedgerCommit(
      repo,
      basePlan({
        ledgerId: LEDGER_2,
        idempotencyKey: "partial-refund-ledger-idem-stale",
        expectedAccountingVersion: 0,
        refundAmountMinor: 1500,
        lines: [
          {
            orderItemId: LINE_A,
            requestedQuantity: 1,
            refundAmountMinor: 1500,
          },
        ],
      })
    );
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.code).toBe("stale_version");

    const unknown = await beginPartialRefundLedgerCommit(
      repo,
      "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      guard
    );
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.code).toBe("unknown_refund");
  });

  it("supports fail then retry", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    const guard = purchasedQuantityGuardFromLineFacts(LINE_FACTS);
    await planPartialRefundLedgerCommit(repo, basePlan());
    await beginPartialRefundLedgerCommit(repo, LEDGER_1, guard);
    const failed = await failPartialRefundLedgerCommit(
      repo,
      LEDGER_1,
      "unsupported_runtime",
      "Simulated boundary failure"
    );
    expect(failed.ok).toBe(true);
    if (!failed.ok) return;
    expect(failed.value.status).toBe("failed");

    const retry = await beginPartialRefundLedgerCommit(repo, LEDGER_1, guard);
    expect(retry.ok).toBe(true);
    if (!retry.ok) return;
    expect(retry.value.status).toBe("committing");
    expect(retry.value.attemptCount).toBe(2);

    const done = await completePartialRefundLedgerCommit(repo, LEDGER_1);
    expect(done.ok).toBe(true);
  });

  it("rejects rollback of committed entries", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    const guard = purchasedQuantityGuardFromLineFacts(LINE_FACTS);
    await planPartialRefundLedgerCommit(repo, basePlan());
    await beginPartialRefundLedgerCommit(repo, LEDGER_1, guard);
    await completePartialRefundLedgerCommit(repo, LEDGER_1);
    const rb = await failPartialRefundLedgerCommit(
      repo,
      LEDGER_1,
      "unsupported_runtime",
      "nope"
    );
    expect(rb.ok).toBe(false);
    if (!rb.ok) expect(rb.code).toBe("invalid_state");
  });

  it("feeds prior accounting into calculation foundation", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    const guard = purchasedQuantityGuardFromLineFacts(LINE_FACTS);
    await planPartialRefundLedgerCommit(repo, basePlan());
    await beginPartialRefundLedgerCommit(repo, LEDGER_1, guard);
    await completePartialRefundLedgerCommit(repo, LEDGER_1);

    const committed = await repo.listCommittedForCapture(CAPTURE);
    const prior = priorAccountingFromCommittedLedger(committed);
    const calc = calculatePartialRefundPlan({
      capture: {
        storeId: STORE,
        orderId: ORDER,
        paymentAttemptId: ATTEMPT,
        captureEventId: CAPTURE,
        captureAmountMinor: 10000,
        currency: "USD",
      },
      lines: LINE_FACTS,
      intent: [{ orderItemId: LINE_A, requestedQuantity: 1 }],
      prior,
    });
    expect(calc.ok).toBe(true);
    if (!calc.ok) return;
    expect(calc.priorRefundedAmountMinor).toBe(1500);
    expect(calc.lines[0].remainingQuantityBefore).toBe(3);
  });

  it("rejects negative and currency mismatch at plan validation", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    const neg = await planPartialRefundLedgerCommit(
      repo,
      basePlan({ refundAmountMinor: -1, lines: [] })
    );
    expect(neg.ok).toBe(false);

    const cur = await planPartialRefundLedgerCommit(
      repo,
      basePlan({
        ledgerId: LEDGER_2,
        idempotencyKey: "partial-refund-ledger-idem-cur",
        currency: "US",
      })
    );
    expect(cur.ok).toBe(false);
    if (!cur.ok) expect(cur.code).toBe("currency_mismatch");
  });
});
