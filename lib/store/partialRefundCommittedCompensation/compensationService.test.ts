/**
 * Committed-reservation compensation orchestration tests (mocks only).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { MemoryPartialRefundLedgerRepository } from "../partialRefundLedger";
import {
  PARTIAL_REFUND_COMMITTED_COMPENSATION_ID,
  compensateCommittedPartialRefundReservation,
  partialRefundCommittedCompensationOwnership,
  sanitizeCompensationOperatorReason,
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

const REASON =
  "Admin accounting compensation restoring committed reservation ceilings.";

async function seedCommitted(repo: MemoryPartialRefundLedgerRepository) {
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
      idempotencyKey: "comp-orch-idem-01",
      storeId: IDS.store,
      orderId: IDS.order,
      paymentAttemptId: IDS.attempt,
      captureEventId: IDS.capture,
      currency: "USD",
      captureAmountMinor: 2000,
      refundAmountMinor: 500,
      calculationFingerprint: "fp_comp_orch_01",
      expectedAccountingVersion: 0,
      lines: [
        {
          orderItemId: IDS.item,
          requestedQuantity: 1,
          refundAmountMinor: 500,
        },
      ],
    },
    "2026-08-07T00:00:00.000Z"
  );
  expect(planned.ok).toBe(true);
  const begun = await repo.transitionToCommitting(
    IDS.ledger,
    "planned",
    0,
    "2026-08-07T00:01:00.000Z",
    { [IDS.item]: 4 }
  );
  expect(begun.ok).toBe(true);
  const committed = await repo.completeCommitted(
    IDS.ledger,
    0,
    "2026-08-07T00:02:00.000Z"
  );
  expect(committed.ok).toBe(true);
}

describe("partialRefundCommittedCompensation orchestration", () => {
  it("compensates committed → compensated (accounting only)", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    await seedCommitted(repo);
    const result = await compensateCommittedPartialRefundReservation(
      { repository: repo },
      { ledgerId: IDS.ledger, operatorReason: REASON, expectedStoreId: IDS.store }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe("compensated");
    expect(result.compensationPerformed).toBe(true);
    expect(result.restoredRefundAmountMinor).toBe(500);
    expect(result.commit.status).toBe("compensated");
    expect(result.moneyMoved).toBe(false);
    expect(result.providerRefundExecuted).toBe(false);
    expect(result.stockRestocked).toBe(false);
    expect(result.entitlementAdjusted).toBe(false);
    expect(result.settlementUnwound).toBe(false);
    expect(result.commissionUnwound).toBe(false);
    expect(result.payoutMutated).toBe(false);
    expect(result.commerceConfirmActivated).toBe(false);
    expect(result.committedReservationCancelled).toBe(false);
    expect(result.capability).toBe(PARTIAL_REFUND_COMMITTED_COMPENSATION_ID);
  });

  it("returns already_compensated on idempotent replay", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    await seedCommitted(repo);
    const first = await compensateCommittedPartialRefundReservation(
      { repository: repo },
      { ledgerId: IDS.ledger, operatorReason: REASON }
    );
    expect(first.ok).toBe(true);
    const second = await compensateCommittedPartialRefundReservation(
      { repository: repo },
      { ledgerId: IDS.ledger, operatorReason: REASON }
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.status).toBe("already_compensated");
    expect(second.compensationPerformed).toBe(false);
    expect(second.restoredRefundAmountMinor).toBe(0);
    expect(second.moneyMoved).toBe(false);
  });

  it("maps repository RPC failure without provider side effects", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    await seedCommitted(repo);
    const compensateFail = vi.fn(async () => ({
      ok: false as const,
      capability: "commerce.payments.partial_refund_ledger_commit_boundary_v1" as const,
      version: "commerce-partial-refund-ledger-commit-boundary-v1" as const,
      ownership: {} as never,
      code: "invalid_state" as const,
      message: "RPC failed",
    }));
    const result = await compensateCommittedPartialRefundReservation(
      { repository: repo, compensateCommit: compensateFail as never },
      { ledgerId: IDS.ledger, operatorReason: REASON }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe("invalid_state");
    expect(result.compensationPerformed).toBe(false);
    expect(result.moneyMoved).toBe(false);
    expect(result.providerRefundExecuted).toBe(false);
    expect(compensateFail).toHaveBeenCalledTimes(1);
  });

  it("fails closed when compensate returns unexpected status", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    await seedCommitted(repo);
    const row = await repo.getByLedgerId(IDS.ledger);
    expect(row).not.toBeNull();
    const weird = vi.fn(async () => ({
      ok: true as const,
      capability: "commerce.payments.partial_refund_ledger_commit_boundary_v1" as const,
      version: "commerce-partial-refund-ledger-commit-boundary-v1" as const,
      ownership: {} as never,
      value: {
        commit: { ...row!, status: "committed" as const },
        alreadyCompensated: false,
        restoredRefundAmountMinor: 500,
      },
    }));
    const result = await compensateCommittedPartialRefundReservation(
      { repository: repo, compensateCommit: weird as never },
      { ledgerId: IDS.ledger, operatorReason: REASON }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe("unsupported");
    expect(result.code).toBe("unexpected_status");
    expect(result.moneyMoved).toBe(false);
  });

  it("rejects malformed id / reason / cross-store", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    await seedCommitted(repo);
    const badId = await compensateCommittedPartialRefundReservation(
      { repository: repo },
      { ledgerId: "not-uuid", operatorReason: REASON }
    );
    expect(badId.ok).toBe(false);
    if (!badId.ok) expect(badId.status).toBe("validation_failed");

    const badReason = await compensateCommittedPartialRefundReservation(
      { repository: repo },
      { ledgerId: IDS.ledger, operatorReason: "x" }
    );
    expect(badReason.ok).toBe(false);
    if (!badReason.ok) expect(badReason.status).toBe("validation_failed");

    const cross = await compensateCommittedPartialRefundReservation(
      { repository: repo },
      {
        ledgerId: IDS.ledger,
        operatorReason: REASON,
        expectedStoreId: IDS.storeB,
      }
    );
    expect(cross.ok).toBe(false);
    if (!cross.ok) expect(cross.status).toBe("unauthorized");
  });

  it("rejects non-committed states", async () => {
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
        idempotencyKey: "comp-orch-planned",
        storeId: IDS.store,
        orderId: IDS.order,
        paymentAttemptId: IDS.attempt,
        captureEventId: IDS.capture,
        currency: "USD",
        captureAmountMinor: 2000,
        refundAmountMinor: 500,
        calculationFingerprint: "fp_comp_orch_planned",
        expectedAccountingVersion: 0,
        lines: [
          {
            orderItemId: IDS.item,
            requestedQuantity: 1,
            refundAmountMinor: 500,
          },
        ],
      },
      "2026-08-07T00:00:00.000Z"
    );
    const result = await compensateCommittedPartialRefundReservation(
      { repository: repo },
      { ledgerId: IDS.ledger, operatorReason: REASON }
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe("invalid_state");
  });

  it("ownership forbids money/provider/downstream domains", () => {
    const o = partialRefundCommittedCompensationOwnership();
    expect(o.ownsCommittedReservationCompensation).toBe(true);
    expect(o.ownsAdminCompensationAction).toBe(true);
    expect(o.ownsAdminCompensationUi).toBe(true);
    expect(o.ownsPartialRefundProviderRefundExecution).toBe(false);
    expect(o.ownsPartialRefundMoneyMovement).toBe(false);
    expect(o.ownsPartialRefundRestock).toBe(false);
    expect(o.ownsPartialEntitlementAdjustment).toBe(false);
    expect(o.ownsPartialSettlementUnwind).toBe(false);
    expect(o.ownsPartialCommissionUnwind).toBe(false);
    expect(o.ownsPayoutInteraction).toBe(false);
    expect(o.ownsCommerceConfirmActivation).toBe(false);
    expect(o.ownsCommittedCancellation).toBe(false);
    expect(o.ownsSellerCompensationUi).toBe(false);
  });

  it("service sources do not own provider/money/restock/settlement calls", () => {
    const service = readFileSync(
      join(ROOT, "lib/store/partialRefundCommittedCompensation/compensationService.ts"),
      "utf8"
    );
    const boundary = readFileSync(
      join(ROOT, "lib/store/partialRefundLedger/commitBoundary.ts"),
      "utf8"
    );
    const adapter = readFileSync(
      join(ROOT, "lib/store/partialRefundLedger/serviceRoleRepository.ts"),
      "utf8"
    );
    for (const src of [service, boundary, adapter]) {
      expect(src).not.toMatch(/["']use client["']/);
      expect(src).not.toMatch(/from ["']stripe["']|@stripe\//);
      expect(src).not.toMatch(/applyFullOrderRefund|apply_store_payment_outcome/);
      expect(src).not.toMatch(/restockInventory|performRestock/);
      expect(src).not.toMatch(/commerce_confirm|enableCommerceConfirm/i);
      expect(src).not.toMatch(/createServerAction|["']use server["']/);
    }
    expect(sanitizeCompensationOperatorReason("ab").ok).toBe(false);
    expect(sanitizeCompensationOperatorReason(REASON).ok).toBe(true);
  });
});
