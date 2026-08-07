/**
 * Focused tests — Partial Refund Ledger RPC remote-apply readiness.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PARTIAL_REFUND_LEDGER_RPC_MIGRATION_FILE,
  PARTIAL_REFUND_LEDGER_RPC_MIGRATION_VERSION,
  PARTIAL_REFUND_LEDGER_RPC_NAME_LIST,
  PARTIAL_REFUND_LEDGER_RPCS,
  PARTIAL_REFUND_RPC_READINESS_ID,
  partialRefundRpcReadinessOwnership,
} from "./rpcContracts";
import {
  assertLedgerRpcNotPubliclyExposed,
  assertRemoteApplyNotOwned,
  isKnownPartialRefundLedgerRpc,
  rejectClientMoneyOnRpcBag,
  validateBeginRpcArgs,
  validateFailRpcArgs,
  validatePlanRpcArgs,
} from "./rpcValidate";

const ROOT = join(__dirname, "../../..");
const LINE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const LEDGER = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const STORE = "11111111-1111-4111-8111-111111111111";
const ORDER = "44444444-4444-4444-8444-444444444444";
const ATTEMPT = "33333333-3333-4333-8333-333333333333";
const CAPTURE = "55555555-5555-4555-8555-555555555555";

function readMigration(): string {
  return readFileSync(
    join(ROOT, "supabase/migrations", PARTIAL_REFUND_LEDGER_RPC_MIGRATION_FILE),
    "utf8"
  ).replace(/\r\n/g, "\n");
}

describe("Partial refund ledger RPC readiness — contracts", () => {
  it("lists required privileged RPCs and ownership", () => {
    expect(PARTIAL_REFUND_RPC_READINESS_ID).toBe(
      "commerce.payments.partial_refund_ledger_rpc_remote_apply_readiness_v1"
    );
    expect(PARTIAL_REFUND_LEDGER_RPC_MIGRATION_VERSION).toBe("20260900");
    // 8 core ledger RPCs in 20260900 + listCommitting (20260905) + compensateCommitted (20260907).
    expect(PARTIAL_REFUND_LEDGER_RPC_NAME_LIST).toHaveLength(10);
    expect(PARTIAL_REFUND_LEDGER_RPCS.listCommitting).toBe(
      "list_store_partial_refund_ledger_committing"
    );
    expect(PARTIAL_REFUND_LEDGER_RPCS.compensateCommitted).toBe(
      "compensate_store_partial_refund_ledger_commit"
    );
    expect(PARTIAL_REFUND_LEDGER_RPCS.plan).toBe(
      "plan_store_partial_refund_ledger"
    );
    const o = partialRefundRpcReadinessOwnership();
    expect(o.ownsPartialRefundLedgerRpcContracts).toBe(true);
    expect(o.ownsPartialRefundLedgerRpcSqlDraft).toBe(true);
    expect(o.ownsPartialRefundRemoteMigrationApply).toBe(false);
    expect(o.ownsPartialRefundMoneyExecution).toBe(false);
    expect(o.ownsPartialRefundProviderRefund).toBe(false);
    expect(o.publicRpcExposure).toBe(false);
  });

  it("rejects client money and public grants", () => {
    expect(rejectClientMoneyOnRpcBag({ ledgerId: LEDGER }).ok).toBe(true);
    expect(
      rejectClientMoneyOnRpcBag({ amountMinor: 100 }).ok
    ).toBe(false);
    expect(assertLedgerRpcNotPubliclyExposed(["service_role"]).ok).toBe(true);
    expect(
      assertLedgerRpcNotPubliclyExposed(["service_role", "authenticated"]).ok
    ).toBe(false);
    expect(assertRemoteApplyNotOwned().ok).toBe(false);
  });

  it("validates plan/begin/fail args", () => {
    const planOk = validatePlanRpcArgs({
      ledgerId: LEDGER,
      storeId: STORE,
      orderId: ORDER,
      paymentAttemptId: ATTEMPT,
      captureEventId: CAPTURE,
      currency: "USD",
      captureAmountMinor: 10000,
      refundAmountMinor: 1500,
      calculationFingerprint: "prf1_test_fingerprint_v1",
      idempotencyKey: "partial-refund-rpc-idem-0001",
      expectedAccountingVersion: 0,
      lines: [
        {
          orderItemId: LINE_A,
          requestedQuantity: 1,
          refundAmountMinor: 1500,
        },
      ],
    });
    expect(planOk.ok).toBe(true);

    const badSum = validatePlanRpcArgs({
      ledgerId: LEDGER,
      storeId: STORE,
      orderId: ORDER,
      paymentAttemptId: ATTEMPT,
      captureEventId: CAPTURE,
      currency: "USD",
      captureAmountMinor: 10000,
      refundAmountMinor: 1500,
      calculationFingerprint: "prf1_test_fingerprint_v1",
      idempotencyKey: "partial-refund-rpc-idem-0001",
      expectedAccountingVersion: 0,
      lines: [
        {
          orderItemId: LINE_A,
          requestedQuantity: 1,
          refundAmountMinor: 1000,
        },
      ],
    });
    expect(badSum.ok).toBe(false);

    expect(
      validateBeginRpcArgs({
        ledgerId: LEDGER,
        purchasedQuantityByLineId: { [LINE_A]: 4 },
      }).ok
    ).toBe(true);

    expect(
      validateFailRpcArgs({
        ledgerId: LEDGER,
        failureCode: "unsupported_runtime",
        failureMessageSafe: "boundary fail",
      }).ok
    ).toBe(true);
  });
});

describe("Partial refund ledger RPC readiness — SQL draft", () => {
  it("ships 20260900 with service_role-only grants and no money execution", () => {
    const sql = readMigration();
    expect(sql).toMatch(/LOCAL DRAFT ONLY/);
    expect(sql).toMatch(/20260899/);
    expect(sql).toMatch(/20260900/);
    const coreRpcs = PARTIAL_REFUND_LEDGER_RPC_NAME_LIST.filter(
      (name) =>
        name !== PARTIAL_REFUND_LEDGER_RPCS.listCommitting &&
        name !== PARTIAL_REFUND_LEDGER_RPCS.compensateCommitted
    );
    expect(coreRpcs).toHaveLength(8);
    for (const name of coreRpcs) {
      expect(isKnownPartialRefundLedgerRpc(name)).toBe(true);
      expect(sql).toContain(`create or replace function public.${name}`);
      expect(sql).toMatch(
        new RegExp(
          `revoke all on function public\\.${name}[\\s\\S]*?from public, anon, authenticated`
        )
      );
      expect(sql).toMatch(
        new RegExp(
          `grant execute on function public\\.${name}[\\s\\S]*?to service_role`
        )
      );
    }
    expect(sql).not.toContain(PARTIAL_REFUND_LEDGER_RPCS.listCommitting);
    expect(sql).not.toContain(PARTIAL_REFUND_LEDGER_RPCS.compensateCommitted);
    expect(sql).not.toMatch(/grant execute[\s\S]*to authenticated;/);
    expect(sql).not.toMatch(/grant execute[\s\S]*to anon;/);
    expect(sql).not.toMatch(/apply_store_payment_outcome/);
    expect(sql).toMatch(/Does not move money|Not a provider refund|reservation/i);
  });
});
