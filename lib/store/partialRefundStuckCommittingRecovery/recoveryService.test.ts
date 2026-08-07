/**
 * Stuck-committing recovery tests (mocks only).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { MemoryPartialRefundLedgerRepository } from "../partialRefundLedger";
import {
  PARTIAL_REFUND_STUCK_COMMITTING_RECOVERY_ID,
  partialRefundStuckCommittingRecoveryOwnership,
  recoverStuckCommittingPartialRefundReservation,
  sanitizeRecoveryOperatorReason,
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

async function seedCommitting(
  repo: MemoryPartialRefundLedgerRepository,
  statusTarget: "planned" | "committing" | "committed" | "failed"
) {
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
      idempotencyKey: "stuck-rec-idem-01",
      storeId: IDS.store,
      orderId: IDS.order,
      paymentAttemptId: IDS.attempt,
      captureEventId: IDS.capture,
      currency: "USD",
      captureAmountMinor: 2000,
      refundAmountMinor: 500,
      calculationFingerprint: "fp_stuck_rec_01",
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
  if (statusTarget === "planned") return;
  const begun = await repo.transitionToCommitting(
    IDS.ledger,
    "planned",
    0,
    "2026-01-01T00:01:00.000Z",
    { [IDS.item]: 4 }
  );
  expect(begun.ok).toBe(true);
  if (statusTarget === "committing") return;
  if (statusTarget === "failed") {
    await repo.markFailed(
      IDS.ledger,
      "test_fail",
      "already failed for test",
      "2026-01-01T00:02:00.000Z"
    );
    return;
  }
  await repo.completeCommitted(IDS.ledger, 0, "2026-01-01T00:02:00.000Z");
}

describe("partialRefundStuckCommittingRecovery service", () => {
  it("recovers committing → failed and releases lock flags", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    await seedCommitting(repo, "committing");
    const result = await recoverStuckCommittingPartialRefundReservation(
      { repository: repo },
      { ledgerId: IDS.ledger, expectedStoreId: IDS.store }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe("recovered");
    expect(result.committingLockReleased).toBe(true);
    expect(result.commit.status).toBe("failed");
    expect(result.reservationCommitted).toBe(false);
    expect(result.committedReservationCancelled).toBe(false);
    expect(result.compensationPerformed).toBe(false);
    expect(result.moneyMoved).toBe(false);
    expect(result.providerRefundExecuted).toBe(false);
    expect(result.capability).toBe(PARTIAL_REFUND_STUCK_COMMITTING_RECOVERY_ID);
  });

  it("rejects malformed ledger id", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    const result = await recoverStuckCommittingPartialRefundReservation(
      { repository: repo },
      { ledgerId: "not-a-uuid" }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe("validation_failed");
  });

  it("rejects unknown commit", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    const result = await recoverStuckCommittingPartialRefundReservation(
      { repository: repo },
      { ledgerId: IDS.ledger }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe("not_found");
  });

  it("rejects planned", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    await seedCommitting(repo, "planned");
    const result = await recoverStuckCommittingPartialRefundReservation(
      { repository: repo },
      { ledgerId: IDS.ledger }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe("invalid_state");
    expect(result.committingLockReleased).toBe(false);
  });

  it("rejects committed (not compensation)", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    await seedCommitting(repo, "committed");
    const result = await recoverStuckCommittingPartialRefundReservation(
      { repository: repo },
      { ledgerId: IDS.ledger }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe("invalid_state");
    expect(result.message).toMatch(/cannot be cancelled or compensated/i);
  });

  it("returns already_failed for failed", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    await seedCommitting(repo, "failed");
    const result = await recoverStuckCommittingPartialRefundReservation(
      { repository: repo },
      { ledgerId: IDS.ledger }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe("already_failed");
  });

  it("rejects cross-store mismatch", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    await seedCommitting(repo, "committing");
    const result = await recoverStuckCommittingPartialRefundReservation(
      { repository: repo },
      { ledgerId: IDS.ledger, expectedStoreId: IDS.storeB }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe("unauthorized");
  });

  it("fails closed on stale_version / concurrent_conflict", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    await seedCommitting(repo, "committing");
    const failStale = vi.fn(async () => ({
      ok: false as const,
      code: "stale_version" as const,
      message: "stale",
    }));
    const stale = await recoverStuckCommittingPartialRefundReservation(
      { repository: repo, failCommit: failStale as never },
      { ledgerId: IDS.ledger }
    );
    expect(stale.ok).toBe(false);
    if (stale.ok) return;
    expect(stale.status).toBe("stale_version");
    expect(stale.moneyMoved).toBe(false);
    expect(stale.committingLockReleased).toBe(false);

    const failConflict = vi.fn(async () => ({
      ok: false as const,
      code: "concurrent_conflict" as const,
      message: "conflict",
    }));
    const conflict = await recoverStuckCommittingPartialRefundReservation(
      { repository: repo, failCommit: failConflict as never },
      { ledgerId: IDS.ledger }
    );
    expect(conflict.ok).toBe(false);
    if (conflict.ok) return;
    expect(conflict.status).toBe("concurrent_conflict");
  });

  it("never calls plan/begin/complete", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    await seedCommitting(repo, "committing");
    const failCommit = vi.fn(async () => ({
      ok: true as const,
      value: {
        ledgerId: IDS.ledger,
        storeId: IDS.store,
        orderId: IDS.order,
        paymentAttemptId: IDS.attempt,
        captureEventId: IDS.capture,
        currency: "USD",
        refundAmountMinor: 500,
        captureAmountMinor: 2000,
        calculationFingerprint: "fp",
        idempotencyKey: "idem",
        status: "failed" as const,
        lines: [],
        accountingVersion: 0,
        attemptCount: 1,
        failureCode: "admin_stuck_committing_recovery" as const,
        failureMessageSafe: "recovered",
        createdAtIso: "2026-01-01T00:00:00.000Z",
        updatedAtIso: "2026-01-01T00:03:00.000Z",
      },
    }));
    const insertSpy = vi.spyOn(repo, "insertPlanned");
    const beginSpy = vi.spyOn(repo, "transitionToCommitting");
    const completeSpy = vi.spyOn(repo, "completeCommitted");
    await recoverStuckCommittingPartialRefundReservation(
      { repository: repo, failCommit: failCommit as never },
      { ledgerId: IDS.ledger }
    );
    expect(failCommit).toHaveBeenCalledTimes(1);
    expect(insertSpy).not.toHaveBeenCalled();
    expect(beginSpy).not.toHaveBeenCalled();
    expect(completeSpy).not.toHaveBeenCalled();
  });

  it("sanitizes operator reason and rejects money/compensation claims", () => {
    expect(sanitizeRecoveryOperatorReason(null).ok).toBe(true);
    expect(sanitizeRecoveryOperatorReason("ab").ok).toBe(false);
    expect(
      sanitizeRecoveryOperatorReason("please refund money now").ok
    ).toBe(false);
    expect(
      sanitizeRecoveryOperatorReason("process crashed mid-begin").ok
    ).toBe(true);
  });

  it("capability ownership is recovery-only", () => {
    const o = partialRefundStuckCommittingRecoveryOwnership();
    expect(o.ownsAdminStuckCommittingRecovery).toBe(true);
    expect(o.ownsCommittingToFailedTransition).toBe(true);
    expect(o.ownsCommittedReservationCancellation).toBe(false);
    expect(o.ownsCommittedReservationCompensation).toBe(false);
    expect(o.ownsSellerRecovery).toBe(false);
    expect(o.ownsBuyerPublicRecovery).toBe(false);
    expect(o.ownsPartialRefundMoneyMovement).toBe(false);
  });
});

describe("partialRefundStuckCommittingRecovery UI audits", () => {
  it("admin UI warns lock release only and has no money/qty inputs", () => {
    const src = readFileSync(
      join(
        ROOT,
        "app/admin/store/refunds/PartialRefundStuckCommittingRecoveryPanel.tsx"
      ),
      "utf8"
    );
    expect(src).toMatch(/Recover stuck in-flight reservation/);
    expect(src).toMatch(/does not refund money/i);
    expect(src).toMatch(/cancel a committed reservation/i);
    expect(src).toMatch(/perform compensation/i);
    expect(src).not.toMatch(/Cancel Refund|Refund Money|Completed Refund/);
    expect(src).not.toMatch(/name=["']amount/i);
    expect(src).not.toMatch(/name=["']requestedQuantity/i);
    expect(src).not.toMatch(/name=["']currency/i);
  });

  it("seller/buyer recovery actions are absent", () => {
    const actions = readFileSync(
      join(ROOT, "app/actions/storePartialRefundStuckCommittingRecovery.ts"),
      "utf8"
    );
    expect(actions).toMatch(/adminRecoverStuckCommittingPartialRefundAction/);
    expect(actions).not.toMatch(/sellerRecover/);
    expect(actions).not.toMatch(/buyerRecover/);
    expect(actions).toMatch(/assertPlatformAdminDb/);
  });

  it("create and accounting panels remain present", () => {
    const page = readFileSync(
      join(ROOT, "app/admin/store/refunds/page.tsx"),
      "utf8"
    );
    expect(page).toMatch(/PartialRefundReservationPanel/);
    expect(page).toMatch(/PartialRefundAccountingReviewPanel/);
    expect(page).toMatch(/PartialRefundStuckCommittingRecoveryPanel/);
    expect(page).toMatch(/prCompOk/);
  });
});
