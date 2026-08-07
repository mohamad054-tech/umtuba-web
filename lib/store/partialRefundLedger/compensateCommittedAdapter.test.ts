/**
 * Focused repository / RPC adapter tests for compensate_committed.
 */

import { describe, expect, it } from "vitest";
import {
  MemoryPartialRefundLedgerRepository,
  PARTIAL_REFUND_LEDGER_RPCS,
  ServiceRolePartialRefundLedgerRepository,
  compensatePartialRefundLedgerCommit,
  createPartialRefundLedgerRpcPort,
  parseCompensateEnvelope,
} from "./index";
import type { PartialRefundLedgerRpcPort } from "./rpcContracts";

const IDS = {
  store: "11111111-1111-4111-8111-111111111111",
  storeB: "aaaaaaaa-1111-4111-8111-111111111111",
  order: "22222222-2222-4222-8222-222222222222",
  attempt: "33333333-3333-4333-8333-333333333333",
  capture: "44444444-4444-4444-8444-444444444444",
  item: "55555555-5555-4555-8555-555555555555",
  ledger: "66666666-6666-4666-8666-666666666666",
};

const NOW = "2026-08-07T12:00:00.000Z";
const REASON = "Operator accounting compensation for stuck committed reservation.";

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
      idempotencyKey: "comp-repo-idem-01",
      storeId: IDS.store,
      orderId: IDS.order,
      paymentAttemptId: IDS.attempt,
      captureEventId: IDS.capture,
      currency: "USD",
      captureAmountMinor: 2000,
      refundAmountMinor: 500,
      calculationFingerprint: "fp_comp_repo_01",
      expectedAccountingVersion: 0,
      lines: [
        {
          orderItemId: IDS.item,
          requestedQuantity: 1,
          refundAmountMinor: 500,
        },
      ],
    },
    NOW
  );
  expect(planned.ok).toBe(true);
  const begun = await repo.transitionToCommitting(
    IDS.ledger,
    "planned",
    0,
    NOW,
    { [IDS.item]: 4 }
  );
  expect(begun.ok).toBe(true);
  const committed = await repo.completeCommitted(IDS.ledger, 0, NOW);
  expect(committed.ok).toBe(true);
}

function commitJson(overrides: Record<string, unknown> = {}) {
  return {
    ledger_id: IDS.ledger,
    store_id: IDS.store,
    order_id: IDS.order,
    payment_attempt_id: IDS.attempt,
    capture_event_id: IDS.capture,
    status: "compensated",
    currency: "USD",
    capture_amount_minor: 2000,
    refund_amount_minor: 500,
    calculation_fingerprint: "fp",
    idempotency_key: "idem",
    planned_accounting_version: 0,
    committed_accounting_version: 1,
    attempt_count: 1,
    failure_code: null,
    failure_message_safe: null,
    compensation_reason_safe: REASON,
    compensated_at: NOW,
    created_at: NOW,
    updated_at: NOW,
    lines: [
      {
        order_item_id: IDS.item,
        requested_quantity: 1,
        refund_amount_minor: 500,
      },
    ],
    ...overrides,
  };
}

describe("partial refund compensateCommitted repository / RPC", () => {
  it("memory: compensates committed and restores ceilings once", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    await seedCommitted(repo);
    const before = await repo.getCaptureAccounting(IDS.capture);
    expect(before?.committedRefundAmountMinor).toBe(500);
    expect(before?.committedQuantityByLineId[IDS.item]).toBe(1);

    const first = await compensatePartialRefundLedgerCommit(
      repo,
      IDS.ledger,
      REASON,
      IDS.store
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.value.alreadyCompensated).toBe(false);
    expect(first.value.restoredRefundAmountMinor).toBe(500);
    expect(first.value.commit.status).toBe("compensated");
    expect(first.value.commit.compensationReasonSafe).toBe(REASON);

    const after = await repo.getCaptureAccounting(IDS.capture);
    expect(after?.committedRefundAmountMinor).toBe(0);
    expect(after?.committedQuantityByLineId[IDS.item]).toBe(0);
    expect(after?.accountingVersion).toBe((before?.accountingVersion ?? 0) + 1);

    const second = await compensatePartialRefundLedgerCommit(
      repo,
      IDS.ledger,
      REASON,
      IDS.store
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.value.alreadyCompensated).toBe(true);
    expect(second.value.restoredRefundAmountMinor).toBe(0);
    const after2 = await repo.getCaptureAccounting(IDS.capture);
    expect(after2?.committedRefundAmountMinor).toBe(0);
    expect(after2?.accountingVersion).toBe(after?.accountingVersion);
  });

  it("service-role maps compensateCommitted to privileged RPC args", async () => {
    const seen: { fn: string; args: Record<string, unknown> }[] = [];
    const port = createPartialRefundLedgerRpcPort(async (fn, args) => {
      seen.push({ fn, args });
      return {
        data: {
          ok: true,
          already_compensated: false,
          commit: commitJson(),
          restored_refund_amount_minor: 500,
          accounting_version: 2,
          committed_refund_amount_minor: 0,
        },
        error: null,
      };
    });
    const repo = new ServiceRolePartialRefundLedgerRepository(port);
    const result = await repo.compensateCommitted(
      IDS.ledger,
      REASON,
      NOW,
      IDS.store
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.alreadyCompensated).toBe(false);
    expect(result.value.restoredRefundAmountMinor).toBe(500);
    expect(seen[0]?.fn).toBe(PARTIAL_REFUND_LEDGER_RPCS.compensateCommitted);
    expect(seen[0]?.args).toEqual({
      p_ledger_id: IDS.ledger,
      p_operator_reason: REASON,
      p_expected_store_id: IDS.store,
    });
  });

  it("service-role models already_compensated idempotent outcome", async () => {
    const port: PartialRefundLedgerRpcPort = {
      async ensureCaptureAccounting() {
        return {};
      },
      async plan() {
        return {};
      },
      async begin() {
        return {};
      },
      async complete() {
        return {};
      },
      async fail() {
        return {};
      },
      async getCaptureAccounting() {
        return {};
      },
      async getCommit() {
        return {};
      },
      async listCommitted() {
        return {};
      },
      async listCommitting() {
        return {};
      },
      async compensateCommitted() {
        return {
          ok: true,
          already_compensated: true,
          commit: commitJson(),
        };
      },
    };
    const repo = new ServiceRolePartialRefundLedgerRepository(port);
    const result = await repo.compensateCommitted(IDS.ledger, REASON, NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.alreadyCompensated).toBe(true);
    expect(result.value.restoredRefundAmountMinor).toBe(0);
  });

  it("service-role fails closed on malformed compensate envelope", async () => {
    const port: PartialRefundLedgerRpcPort = {
      async ensureCaptureAccounting() {
        return {};
      },
      async plan() {
        return {};
      },
      async begin() {
        return {};
      },
      async complete() {
        return {};
      },
      async fail() {
        return {};
      },
      async getCaptureAccounting() {
        return {};
      },
      async getCommit() {
        return {};
      },
      async listCommitted() {
        return {};
      },
      async listCommitting() {
        return {};
      },
      async compensateCommitted() {
        return { ok: true, already_compensated: false };
      },
    };
    const repo = new ServiceRolePartialRefundLedgerRepository(port);
    const result = await repo.compensateCommitted(IDS.ledger, REASON, NOW);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("malformed_id");
    expect(result.message).toMatch(/malformed/i);
  });

  it("service-role maps RPC throw to stable failure", async () => {
    const port: PartialRefundLedgerRpcPort = {
      async ensureCaptureAccounting() {
        return {};
      },
      async plan() {
        return {};
      },
      async begin() {
        return {};
      },
      async complete() {
        return {};
      },
      async fail() {
        return {};
      },
      async getCaptureAccounting() {
        return {};
      },
      async getCommit() {
        return {};
      },
      async listCommitted() {
        return {};
      },
      async listCommitting() {
        return {};
      },
      async compensateCommitted() {
        throw new Error("invalid_state");
      },
    };
    const repo = new ServiceRolePartialRefundLedgerRepository(port);
    const result = await repo.compensateCommitted(IDS.ledger, REASON, NOW);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("invalid_state");
  });

  it("parseCompensateEnvelope rejects unexpected shapes", () => {
    expect(parseCompensateEnvelope(null).ok).toBe(false);
    expect(parseCompensateEnvelope({ ok: false }).ok).toBe(false);
    expect(
      parseCompensateEnvelope({
        ok: true,
        already_compensated: false,
        commit: { not: "valid" },
      }).ok
    ).toBe(false);
    const ok = parseCompensateEnvelope({
      ok: true,
      already_compensated: false,
      commit: commitJson(),
      restored_refund_amount_minor: 500,
    });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.alreadyCompensated).toBe(false);
    expect(ok.restoredRefundAmountMinor).toBe(500);
  });

  it("rejects non-committed states without calling restore twice path", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    await seedCommitted(repo);
    // force planned-like by inserting another capture path — compensate planned fails
    const plannedOnly = new MemoryPartialRefundLedgerRepository();
    await plannedOnly.ensureCaptureAccounting({
      storeId: IDS.store,
      orderId: IDS.order,
      paymentAttemptId: IDS.attempt,
      captureEventId: IDS.capture,
      currency: "USD",
      captureAmountMinor: 2000,
    });
    await plannedOnly.insertPlanned(
      {
        ledgerId: IDS.ledger,
        idempotencyKey: "comp-planned-only",
        storeId: IDS.store,
        orderId: IDS.order,
        paymentAttemptId: IDS.attempt,
        captureEventId: IDS.capture,
        currency: "USD",
        captureAmountMinor: 2000,
        refundAmountMinor: 500,
        calculationFingerprint: "fp_comp_planned",
        expectedAccountingVersion: 0,
        lines: [
          {
            orderItemId: IDS.item,
            requestedQuantity: 1,
            refundAmountMinor: 500,
          },
        ],
      },
      NOW
    );
    const bad = await compensatePartialRefundLedgerCommit(
      plannedOnly,
      IDS.ledger,
      REASON
    );
    expect(bad.ok).toBe(false);
    if (bad.ok) return;
    expect(bad.code).toBe("invalid_state");
  });

  it("rejects cross-store expectedStoreId", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    await seedCommitted(repo);
    const bad = await compensatePartialRefundLedgerCommit(
      repo,
      IDS.ledger,
      REASON,
      IDS.storeB
    );
    expect(bad.ok).toBe(false);
    if (bad.ok) return;
    expect(bad.code).toBe("missing_ownership");
  });
});
