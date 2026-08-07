/**
 * Admin first-time provider-money execute service (testable core).
 * Calls executeCommittedPartialRefundProviderMoney only after authz/gates/ACK.
 * Never trusts client PaymentIntent. Never compensates / restocks / Sync.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PartialRefundLedgerCommitRecord } from "../partialRefundLedger";
import { failedProviderExecutionRetryBlockedMessage } from "./failedRetryPolicy";
import {
  assertProviderMoneyOperatorAck,
  sanitizeProviderMoneyOperatorReason,
} from "./operatorAck";
import {
  assertPartialRefundProviderMoneyExecutionGates,
  executeCommittedPartialRefundProviderMoney,
  type CommittedLedgerFactsForProviderMoney,
  type ExecutePartialRefundProviderMoneyDeps,
  type ExecutePartialRefundProviderMoneySuccess,
} from "./orchestrator";
import type { PartialRefundProviderExecutionRepository } from "./repository";
import {
  PROVIDER_MONEY_NON_EVENTS,
  type PartialRefundProviderMoneyNonEvents,
  type PartialRefundProviderMoneyResult,
} from "./types";
import {
  failProviderMoney,
  isProviderMoneyUuid,
  okProviderMoney,
} from "./validate";

type AnyClient = SupabaseClient;

export type AdminExecuteProviderMoneyInput = {
  ledgerId: string;
  expectedStoreId: string;
  operatorUserId: string;
  operatorReason: string;
  operatorMoneyAck: string;
  /** Forbidden if present — rejected. */
  clientProviderPaymentRef?: string | null;
  clientBag?: Record<string, unknown>;
};

export type AdminExecuteProviderMoneySuccess =
  ExecutePartialRefundProviderMoneySuccess & PartialRefundProviderMoneyNonEvents;

export type AdminExecuteProviderMoneyDeps = ExecutePartialRefundProviderMoneyDeps & {
  factClient: AnyClient;
  ledgerRepository: {
    getByLedgerId(
      ledgerId: string
    ): Promise<PartialRefundLedgerCommitRecord | null>;
  };
  executionRepository: PartialRefundProviderExecutionRepository;
};

function toCommittedFacts(
  row: PartialRefundLedgerCommitRecord
):
  | { ok: true; ledger: CommittedLedgerFactsForProviderMoney }
  | { ok: false; code: string; message: string } {
  if (row.status !== "committed") {
    return {
      ok: false,
      code: "invalid_state",
      message: `Ledger status is ${row.status}; provider money requires committed.`,
    };
  }
  return {
    ok: true,
    ledger: {
      ledgerId: row.ledgerId,
      storeId: row.storeId,
      orderId: row.orderId,
      paymentAttemptId: row.paymentAttemptId,
      captureEventId: row.captureEventId,
      status: "committed",
      refundAmountMinor: row.refundAmountMinor,
      currency: row.currency,
    },
  };
}

/**
 * Fail-closed first-time submit entry used by the admin server action.
 */
export async function runAdminExecutePartialRefundProviderMoney(
  input: AdminExecuteProviderMoneyInput,
  deps: AdminExecuteProviderMoneyDeps
): Promise<PartialRefundProviderMoneyResult<AdminExecuteProviderMoneySuccess>> {
  const env = deps.env ?? process.env;

  const ack = assertProviderMoneyOperatorAck(input.operatorMoneyAck);
  if (!ack.ok) {
    return failProviderMoney(ack.code, ack.message);
  }

  const reason = sanitizeProviderMoneyOperatorReason(input.operatorReason);
  if (!reason.ok) {
    return failProviderMoney(reason.code, reason.message);
  }

  if (!isProviderMoneyUuid(input.ledgerId)) {
    return failProviderMoney("malformed_id", "Ledger id must be a valid UUID.");
  }
  if (!isProviderMoneyUuid(input.expectedStoreId)) {
    return failProviderMoney("malformed_id", "Store id must be a valid UUID.");
  }
  if (!isProviderMoneyUuid(input.operatorUserId)) {
    return failProviderMoney(
      "malformed_id",
      "Operator user id must be a valid UUID."
    );
  }

  if (
    input.clientProviderPaymentRef != null &&
    String(input.clientProviderPaymentRef).trim() !== ""
  ) {
    return failProviderMoney(
      "client_money_rejected",
      "Client must not supply provider payment references."
    );
  }

  const gates = assertPartialRefundProviderMoneyExecutionGates(env);
  if (!gates.ok) {
    return failProviderMoney(gates.code, gates.message);
  }

  const row = await deps.ledgerRepository.getByLedgerId(input.ledgerId.trim());
  if (!row) {
    return failProviderMoney("unknown_refund", "Ledger reservation not found.");
  }
  if (row.storeId !== input.expectedStoreId.trim()) {
    return failProviderMoney(
      "missing_ownership",
      "Ledger does not belong to expected store."
    );
  }

  const facts = toCommittedFacts(row);
  if (!facts.ok) {
    return failProviderMoney(facts.code, facts.message);
  }

  // Pre-inspect existing execution for explicit failed retry policy messaging.
  const existing = await deps.executionRepository.getByLedger(
    facts.ledger.ledgerId
  );
  if (existing?.status === "failed") {
    return failProviderMoney(
      "invalid_state",
      failedProviderExecutionRetryBlockedMessage()
    );
  }

  const result = await executeCommittedPartialRefundProviderMoney(
    {
      ledger: facts.ledger,
      factClient: deps.factClient,
      operatorUserId: input.operatorUserId,
      operatorReasonSafe: reason.reason,
      clientBag: input.clientBag,
      expectedStoreId: input.expectedStoreId,
      clientProviderPaymentRef: input.clientProviderPaymentRef,
    },
    {
      repository: deps.executionRepository,
      env,
      nowMs: deps.nowMs,
      staleAfterMs: deps.staleAfterMs,
      resolveProviderPort: deps.resolveProviderPort,
      evaluateDedicatedGate: deps.evaluateDedicatedGate,
      evaluateStripeConfig: deps.evaluateStripeConfig,
    }
  );

  if (!result.ok) {
    return result;
  }

  return okProviderMoney({
    ...result.value,
    ...PROVIDER_MONEY_NON_EVENTS,
  });
}
