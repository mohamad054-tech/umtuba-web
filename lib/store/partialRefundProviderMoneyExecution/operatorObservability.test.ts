/**
 * Operator observability readiness — pure derivation tests (no Stripe / DB).
 */

import { describe, expect, it } from "vitest";
import { buildPartialRefundProviderIdempotencyKey } from "./idempotency";
import {
  buildProviderMoneyOperatorObservability,
  buildProviderMoneyOperatorObservabilityAbsent,
} from "./operatorObservability";
import type { PartialRefundProviderExecutionRecord } from "./types";

const IDS = {
  execution: "66666666-6666-4666-8666-666666666666",
  store: "11111111-1111-4111-8111-111111111111",
  ledger: "55555555-5555-4555-8555-555555555555",
  order: "22222222-2222-4222-8222-222222222222",
  payment: "33333333-3333-4333-8333-333333333333",
  capture: "44444444-4444-4444-8444-444444444444",
};

function base(
  overrides: Partial<PartialRefundProviderExecutionRecord> = {}
): PartialRefundProviderExecutionRecord {
  return {
    executionId: IDS.execution,
    storeId: IDS.store,
    ledgerId: IDS.ledger,
    orderId: IDS.order,
    paymentAttemptId: IDS.payment,
    captureEventId: IDS.capture,
    providerKind: "stripe",
    providerPaymentRef: "pi_obs_test",
    trustedAmountMinor: 2500,
    currency: "USD",
    idempotencyKey: buildPartialRefundProviderIdempotencyKey(IDS.ledger),
    status: "planned",
    providerRefundId: null,
    providerStatusSafe: null,
    failureCode: null,
    failureMessageSafe: null,
    operatorUserId: "op-1",
    operatorReasonSafe: "obs readiness",
    startedAtIso: null,
    completedAtIso: null,
    lastLookupAtIso: null,
    createdAtIso: "2026-08-09T12:00:00.000Z",
    updatedAtIso: "2026-08-09T12:00:00.000Z",
    ...overrides,
  };
}

describe("operatorObservability — ten operational questions", () => {
  it("answers Q1–Q10 for succeeded execution (money confirmed, retry unsafe)", () => {
    const snap = buildProviderMoneyOperatorObservability({
      execution: base({
        status: "succeeded",
        providerRefundId: "re_ok",
        providerStatusSafe: "succeeded",
        startedAtIso: "2026-08-09T12:00:01.000Z",
        completedAtIso: "2026-08-09T12:00:02.000Z",
      }),
      ledgerStatus: "committed",
    });

    expect(snap.refundIdentity.ledgerId).toBe(IDS.ledger);
    expect(snap.refundIdentity.orderId).toBe(IDS.order);
    expect(snap.refundIdentity.amountMinor).toBe(2500);
    expect(snap.refundIdentity.ledgerStatus).toBe("committed");

    expect(snap.providerExecutionIdentity.executionId).toBe(IDS.execution);
    expect(snap.providerExecutionIdentity.providerKind).toBe("stripe");
    expect(snap.providerExecutionIdentity.idempotencyKeyValidForLedger).toBe(
      true
    );

    expect(snap.providerSubmissionAttempted).toBe(true);
    expect(snap.executionState).toBe("succeeded");
    expect(snap.moneyExecutionOccurrence).toBe("confirmed_occurred");
    expect(snap.retrySafe).toBe(false);
    expect(snap.retrySafety).toBe("unsafe_already_succeeded");
    expect(snap.reconciliationRequired).toBe(false);
    expect(snap.executionStuck).toBe(false);
    expect(snap.recoveryEvidence.providerRefundId).toBe("re_ok");
    expect(snap.duplicateExecutionRuledOut).toBe(true);
    expect(snap.duplicateExecutionRuling).toBe("ruled_out_terminal_same_key");
    expect(JSON.stringify(snap)).not.toMatch(/sk_(live|test)_|whsec_|client_secret/);
  });

  it("marks failed pre-submit as money not occurred + V1 no retry", () => {
    const snap = buildProviderMoneyOperatorObservability({
      execution: base({
        status: "failed",
        failureCode: "provider_rejected",
        failureMessageSafe: "card declined",
      }),
    });
    expect(snap.providerSubmissionAttempted).toBe(false);
    expect(snap.moneyExecutionOccurrence).toBe("confirmed_not_occurred");
    expect(snap.retrySafe).toBe(false);
    expect(snap.retryPolicyV1).toBe("no_retry");
    expect(snap.retryMessage).toMatch(/does not allow retry/i);
    expect(snap.duplicateExecutionRuledOut).toBe(true);
  });

  it("flags uncertain as reconciliation required with recovery evidence", () => {
    const snap = buildProviderMoneyOperatorObservability({
      execution: base({
        status: "uncertain",
        providerRefundId: "re_maybe",
        startedAtIso: "2026-08-09T12:00:01.000Z",
        lastLookupAtIso: "2026-08-09T12:05:00.000Z",
        failureCode: "uncertain_requires_recovery",
      }),
      nowMs: Date.parse("2026-08-09T12:06:00.000Z"),
    });
    expect(snap.providerSubmissionAttempted).toBe(true);
    expect(snap.moneyExecutionOccurrence).toBe(
      "unknown_requires_reconciliation"
    );
    expect(snap.reconciliationRequired).toBe(true);
    expect(snap.retrySafe).toBe(false);
    expect(snap.retrySafety).toBe("unsafe_in_flight_use_lookup");
    expect(snap.latestOperation).toBe("LOOKUP");
    expect(snap.recoveryEvidence.recoveryEligible).toBe(true);
    expect(snap.recoveryEvidence.lastLookupAtIso).toBe(
      "2026-08-09T12:05:00.000Z"
    );
    expect(snap.duplicateExecutionRuling).toBe("ruled_out_in_flight_same_key");
  });

  it("detects stale executing as stuck + reconciliation required", () => {
    const started = "2026-08-09T12:00:00.000Z";
    const snap = buildProviderMoneyOperatorObservability({
      execution: base({
        status: "executing",
        startedAtIso: started,
      }),
      nowMs: Date.parse("2026-08-09T12:02:00.000Z"),
      staleAfterMs: 60_000,
    });
    expect(snap.executionState).toBe("executing");
    expect(snap.executionStuck).toBe(true);
    expect(snap.staleExecuting).toBe(true);
    expect(snap.reconciliationRequired).toBe(true);
    expect(snap.retrySafe).toBe(false);
    expect(snap.moneyExecutionOccurrence).toBe(
      "unknown_requires_reconciliation"
    );
  });

  it("does not mark fresh executing as stuck", () => {
    const started = "2026-08-09T12:00:00.000Z";
    const snap = buildProviderMoneyOperatorObservability({
      execution: base({
        status: "executing",
        startedAtIso: started,
      }),
      nowMs: Date.parse("2026-08-09T12:00:30.000Z"),
      staleAfterMs: 60_000,
    });
    expect(snap.executionStuck).toBe(false);
    expect(snap.reconciliationRequired).toBe(false);
    expect(snap.retrySafety).toBe("unsafe_in_flight_use_lookup");
  });

  it("planned row binds idempotency but does not claim money occurred", () => {
    const snap = buildProviderMoneyOperatorObservability({
      execution: base({ status: "planned" }),
    });
    expect(snap.providerSubmissionAttempted).toBe(false);
    expect(snap.moneyExecutionOccurrence).toBe("not_started");
    expect(snap.duplicateExecutionRuling).toBe("bound_by_idempotency_key");
    expect(snap.duplicateExecutionRuledOut).toBe(true);
    expect(snap.retrySafe).toBe(false);
  });

  it("mismatched idempotency key cannot rule out duplicates", () => {
    const snap = buildProviderMoneyOperatorObservability({
      execution: base({
        status: "succeeded",
        idempotencyKey: "prf-prov:00000000-0000-4000-8000-000000000000",
        providerRefundId: "re_x",
        startedAtIso: "2026-08-09T12:00:01.000Z",
        completedAtIso: "2026-08-09T12:00:02.000Z",
      }),
    });
    expect(
      snap.providerExecutionIdentity.idempotencyKeyValidForLedger
    ).toBe(false);
    expect(snap.duplicateExecutionRuledOut).toBe(false);
    expect(snap.duplicateExecutionRuling).toBe(
      "cannot_rule_out_missing_or_mismatched_key"
    );
  });

  it("absent execution surfaces cannot-rule-out without inventing rows", () => {
    const absent = buildProviderMoneyOperatorObservabilityAbsent({
      ledgerId: IDS.ledger,
      storeId: IDS.store,
      ledgerStatus: "committed",
    });
    expect(absent.providerExecutionIdentity).toBeNull();
    expect(absent.executionState).toBe("none");
    expect(absent.duplicateExecutionRuledOut).toBe(false);
    expect(absent.expectedIdempotencyKey).toBe(
      buildPartialRefundProviderIdempotencyKey(IDS.ledger)
    );
    expect(absent.message).toMatch(/cannot be ruled out/i);
  });
});
