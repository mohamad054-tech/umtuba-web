/**
 * Recovery decision safety — pure derivation tests.
 * STRIPE_CALLS=0 · DB_WRITES=0 · no network · no provider execution.
 */

import { describe, expect, it } from "vitest";
import { buildPartialRefundProviderIdempotencyKey } from "./idempotency";
import {
  assertRefundProviderRecoveryDecisionSafety,
  buildRefundProviderRecoveryDecision,
} from "./refundProviderRecoveryDecision";
import type { PartialRefundProviderExecutionRecord } from "./types";

const IDS = {
  execution: "66666666-6666-4666-8666-666666666666",
  store: "11111111-1111-4111-8111-111111111111",
  ledger: "55555555-5555-4555-8555-555555555555",
  order: "22222222-2222-4222-8222-222222222222",
  payment: "33333333-3333-4333-8333-333333333333",
  capture: "44444444-4444-4444-8444-444444444444",
};

const NOW = Date.parse("2026-08-09T12:05:00.000Z");

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
    providerPaymentRef: "pi_recovery_decision_test",
    trustedAmountMinor: 2500,
    currency: "USD",
    idempotencyKey: buildPartialRefundProviderIdempotencyKey(IDS.ledger),
    status: "planned",
    providerRefundId: null,
    providerStatusSafe: null,
    failureCode: null,
    failureMessageSafe: null,
    operatorUserId: "op-1",
    operatorReasonSafe: "recovery decision",
    startedAtIso: null,
    completedAtIso: null,
    lastLookupAtIso: null,
    createdAtIso: "2026-08-09T12:00:00.000Z",
    updatedAtIso: "2026-08-09T12:00:00.000Z",
    ...overrides,
  };
}

function expectEightFields(
  d: ReturnType<typeof buildRefundProviderRecoveryDecision>
) {
  expect(d).toHaveProperty("LOCAL_LEDGER_STATE");
  expect(d).toHaveProperty("RESERVATION_STATE");
  expect(d).toHaveProperty("PROVIDER_EXECUTION_STATE");
  expect(d).toHaveProperty("PROVIDER_OUTCOME_CONFIDENCE");
  expect(d).toHaveProperty("RECONCILIATION_REQUIRED");
  expect(d).toHaveProperty("RETRY_SAFE");
  expect(d).toHaveProperty("RECOVERY_REQUIRED");
  expect(d).toHaveProperty("OPERATOR_ESCALATION_REQUIRED");
  expect(d.safety.invariantsOk).toBe(true);
  expect(d.safety.invariantViolations).toEqual([]);
}

describe("refundProviderRecoveryDecision — eight-field contract", () => {
  it("not submitted: planned ledger + reserved + no provider", () => {
    const d = buildRefundProviderRecoveryDecision({
      localLedgerStatus: "planned",
      reservationStatus: "reserved",
      ledgerId: IDS.ledger,
      nowMs: NOW,
    });
    expectEightFields(d);
    expect(d.LOCAL_LEDGER_STATE).toBe("planned");
    expect(d.RESERVATION_STATE).toBe("reserved");
    expect(d.PROVIDER_EXECUTION_STATE).toBe("none");
    expect(d.PROVIDER_OUTCOME_CONFIDENCE).toBe("none");
    expect(d.RECONCILIATION_REQUIRED).toBe(false);
    expect(d.RETRY_SAFE).toBe(false);
    expect(d.RECOVERY_REQUIRED).toBe(false);
    expect(d.OPERATOR_ESCALATION_REQUIRED).toBe(false);
  });

  it("submitting/committing reservation → recovery required, not retry-safe", () => {
    const d = buildRefundProviderRecoveryDecision({
      localLedgerStatus: "committed",
      reservationStatus: "committing",
      execution: base({ status: "planned" }),
      nowMs: NOW,
    });
    expectEightFields(d);
    expect(d.LOCAL_LEDGER_STATE).toBe("committed");
    expect(d.RESERVATION_STATE).toBe("committing");
    expect(d.RECOVERY_REQUIRED).toBe(true);
    expect(d.RETRY_SAFE).toBe(false);
    expect(d.PROVIDER_OUTCOME_CONFIDENCE).toBe("none");
  });

  it("legacy committing via localLedgerStatus alone → reservation committing", () => {
    const d = buildRefundProviderRecoveryDecision({
      localLedgerStatus: "committing",
      execution: base({ status: "planned" }),
      nowMs: NOW,
    });
    expectEightFields(d);
    expect(d.LOCAL_LEDGER_STATE).toBe("unknown");
    expect(d.RESERVATION_STATE).toBe("committing");
    expect(d.RECOVERY_REQUIRED).toBe(true);
    expect(d.RETRY_SAFE).toBe(false);
  });

  it("provider failed → reconciliation + escalation; RETRY_SAFE=false", () => {
    const d = buildRefundProviderRecoveryDecision({
      localLedgerStatus: "committed",
      reservationStatus: "committed",
      execution: base({
        status: "failed",
        failureCode: "provider_rejected",
        failureMessageSafe: "declined",
      }),
      nowMs: NOW,
    });
    expectEightFields(d);
    expect(d.PROVIDER_EXECUTION_STATE).toBe("failed");
    expect(d.PROVIDER_OUTCOME_CONFIDENCE).toBe("confirmed_local");
    expect(d.RECONCILIATION_REQUIRED).toBe(true);
    expect(d.RETRY_SAFE).toBe(false);
    expect(d.OPERATOR_ESCALATION_REQUIRED).toBe(true);
  });

  it("provider success → terminal reconciled; no retry", () => {
    const d = buildRefundProviderRecoveryDecision({
      localLedgerStatus: "committed",
      reservationStatus: "committed",
      execution: base({
        status: "succeeded",
        providerRefundId: "re_ok",
        providerStatusSafe: "succeeded",
        startedAtIso: "2026-08-09T12:00:01.000Z",
        completedAtIso: "2026-08-09T12:00:02.000Z",
      }),
      nowMs: NOW,
    });
    expectEightFields(d);
    expect(d.PROVIDER_EXECUTION_STATE).toBe("succeeded");
    expect(d.PROVIDER_OUTCOME_CONFIDENCE).toBe("confirmed_local");
    expect(d.RECONCILIATION_REQUIRED).toBe(false);
    expect(d.RETRY_SAFE).toBe(false);
    expect(d.RECOVERY_REQUIRED).toBe(false);
    expect(d.OPERATOR_ESCALATION_REQUIRED).toBe(false);
    expect(d.safety.providerExecutionAttempted).toBe(true);
  });

  it("CRITICAL: unknown provider outcome NEVER silently RETRY_SAFE", () => {
    const d = buildRefundProviderRecoveryDecision({
      localLedgerStatus: "committed",
      reservationStatus: "committed",
      execution: base({
        status: "uncertain",
        startedAtIso: "2026-08-09T12:00:01.000Z",
        lastLookupAtIso: "2026-08-09T12:03:00.000Z",
      }),
      nowMs: NOW,
    });
    expectEightFields(d);
    expect(d.PROVIDER_EXECUTION_STATE).toBe("uncertain");
    expect(d.PROVIDER_OUTCOME_CONFIDENCE).toBe("unknown");
    expect(d.RECONCILIATION_REQUIRED).toBe(true);
    expect(d.RECOVERY_REQUIRED).toBe(true);
    expect(d.RETRY_SAFE).toBe(false);
    expect(d.OPERATOR_ESCALATION_REQUIRED).toBe(true);
    expect(d.safety.unknownOutcomeBlocksRetry).toBe(true);

    // Assertion helper must flag any hypothetical regression.
    const violations = assertRefundProviderRecoveryDecisionSafety({
      ...d,
      RETRY_SAFE: true,
    });
    expect(violations).toContain(
      "UNKNOWN_PROVIDER_OUTCOME_MUST_NOT_BE_RETRY_SAFE"
    );
    expect(violations).toContain("UNCERTAIN_EXECUTION_MUST_NOT_BE_RETRY_SAFE");
  });

  it("stale local executing → unknown confidence + recovery", () => {
    const d = buildRefundProviderRecoveryDecision({
      localLedgerStatus: "committed",
      reservationStatus: "committed",
      execution: base({
        status: "executing",
        startedAtIso: "2026-08-09T12:00:00.000Z",
      }),
      nowMs: NOW,
      staleAfterMs: 60_000,
    });
    expectEightFields(d);
    expect(d.PROVIDER_OUTCOME_CONFIDENCE).toBe("unknown");
    expect(d.RECOVERY_REQUIRED).toBe(true);
    expect(d.RETRY_SAFE).toBe(false);
    expect(d.RECONCILIATION_REQUIRED).toBe(true);
  });

  it("fresh executing → in_flight; not retry-safe; recovery not forced", () => {
    const d = buildRefundProviderRecoveryDecision({
      localLedgerStatus: "committed",
      reservationStatus: "committed",
      execution: base({
        status: "executing",
        startedAtIso: "2026-08-09T12:04:30.000Z",
      }),
      nowMs: NOW,
    });
    expectEightFields(d);
    expect(d.PROVIDER_OUTCOME_CONFIDENCE).toBe("in_flight");
    expect(d.RETRY_SAFE).toBe(false);
    expect(d.RECOVERY_REQUIRED).toBe(false);
    expect(d.RECONCILIATION_REQUIRED).toBe(false);
  });

  it("duplicate/replay bound by idempotency key — not retry-safe", () => {
    const d = buildRefundProviderRecoveryDecision({
      localLedgerStatus: "committed",
      reservationStatus: "committed",
      execution: base({
        status: "succeeded",
        providerRefundId: "re_dup",
        startedAtIso: "2026-08-09T12:00:01.000Z",
        completedAtIso: "2026-08-09T12:00:02.000Z",
      }),
      nowMs: NOW,
    });
    expectEightFields(d);
    expect(d.reconciliation.evidence.duplicateReplayBound).toBe(true);
    expect(d.safety.duplicateMoneyPreventionBound).toBe(true);
    expect(d.RETRY_SAFE).toBe(false);
  });

  it("idempotency key mismatch → escalation + no retry", () => {
    const d = buildRefundProviderRecoveryDecision({
      localLedgerStatus: "committed",
      reservationStatus: "committed",
      execution: base({
        status: "succeeded",
        providerRefundId: "re_x",
        idempotencyKey: "prf-prov:00000000-0000-4000-8000-000000000000",
        startedAtIso: "2026-08-09T12:00:01.000Z",
        completedAtIso: "2026-08-09T12:00:02.000Z",
      }),
      nowMs: NOW,
    });
    expectEightFields(d);
    expect(d.OPERATOR_ESCALATION_REQUIRED).toBe(true);
    expect(d.RECONCILIATION_REQUIRED).toBe(true);
    expect(d.RETRY_SAFE).toBe(false);
    expect(d.safety.duplicateMoneyPreventionBound).toBe(false);
  });

  it("stuck committing reservation → recovery required", () => {
    const d = buildRefundProviderRecoveryDecision({
      localLedgerStatus: "committing",
      reservationStatus: "committing",
      execution: base({ status: "planned" }),
      nowMs: NOW,
    });
    expectEightFields(d);
    expect(d.RESERVATION_STATE).toBe("committing");
    expect(d.RECOVERY_REQUIRED).toBe(true);
    expect(d.RETRY_SAFE).toBe(false);
    expect(d.reconciliation.operatorAction).toBe(
      "use_stuck_committing_recovery"
    );
  });

  it("compensated / recovered local with terminal provider", () => {
    const d = buildRefundProviderRecoveryDecision({
      localLedgerStatus: "compensated",
      reservationStatus: "committed",
      execution: base({
        status: "succeeded",
        providerRefundId: "re_comp",
        providerStatusSafe: "succeeded",
        startedAtIso: "2026-08-09T12:00:01.000Z",
        completedAtIso: "2026-08-09T12:00:02.000Z",
      }),
      nowMs: NOW,
    });
    expectEightFields(d);
    expect(d.LOCAL_LEDGER_STATE).toBe("compensated");
    expect(d.RESERVATION_STATE).toBe("committed");
    expect(d.PROVIDER_OUTCOME_CONFIDENCE).toBe("confirmed_local");
    expect(d.RETRY_SAFE).toBe(false);
  });

  it("terminal reconciled failure alignment", () => {
    const d = buildRefundProviderRecoveryDecision({
      localLedgerStatus: "failed",
      reservationStatus: "failed",
      execution: base({ status: "failed", failureCode: "gate_disabled" }),
      nowMs: NOW,
    });
    expectEightFields(d);
    expect(d.PROVIDER_OUTCOME_CONFIDENCE).toBe("confirmed_local");
    expect(d.RECONCILIATION_REQUIRED).toBe(false);
    expect(d.RECOVERY_REQUIRED).toBe(false);
    expect(d.RETRY_SAFE).toBe(false);
    expect(d.OPERATOR_ESCALATION_REQUIRED).toBe(false);
  });

  it("critical mismatch local failed + provider succeeded → escalate, never retry", () => {
    const d = buildRefundProviderRecoveryDecision({
      localLedgerStatus: "failed",
      reservationStatus: "failed",
      execution: base({
        status: "succeeded",
        providerRefundId: "re_money",
        providerStatusSafe: "succeeded",
        startedAtIso: "2026-08-09T12:00:01.000Z",
        completedAtIso: "2026-08-09T12:00:02.000Z",
      }),
      nowMs: NOW,
    });
    expectEightFields(d);
    expect(d.RECONCILIATION_REQUIRED).toBe(true);
    expect(d.OPERATOR_ESCALATION_REQUIRED).toBe(true);
    expect(d.RETRY_SAFE).toBe(false);
    expect(d.safety.providerExecutionAttempted).toBe(true);
  });

  it("awaiting first submit (committed + planned) — not a retry", () => {
    const d = buildRefundProviderRecoveryDecision({
      localLedgerStatus: "committed",
      reservationStatus: "committed",
      execution: base({ status: "planned" }),
      nowMs: NOW,
    });
    expectEightFields(d);
    expect(d.PROVIDER_OUTCOME_CONFIDENCE).toBe("none");
    expect(d.RETRY_SAFE).toBe(false);
    expect(d.RECOVERY_REQUIRED).toBe(false);
    expect(d.reconciliation.operatorAction).toBe("first_time_submit_candidate");
  });

  it("does not invent external provider truth / secrets", () => {
    const d = buildRefundProviderRecoveryDecision({
      localLedgerStatus: "committed",
      execution: base({
        status: "uncertain",
        startedAtIso: "2026-08-09T12:00:01.000Z",
      }),
      nowMs: NOW,
    });
    const json = JSON.stringify(d);
    expect(json).not.toMatch(/sk_(live|test)_|whsec_|client_secret|service_role/);
    expect(d.PROVIDER_OUTCOME_CONFIDENCE).toBe("unknown");
    expect(d.reconciliation.evidence.classificationReason).toMatch(
      /durable local evidence/i
    );
  });
});

describe("assertRefundProviderRecoveryDecisionSafety — duplicate money", () => {
  it("flags retry-safe after submission attempted", () => {
    const d = buildRefundProviderRecoveryDecision({
      localLedgerStatus: "committed",
      execution: base({
        status: "executing",
        startedAtIso: "2026-08-09T12:04:50.000Z",
      }),
      nowMs: NOW,
    });
    expect(d.RETRY_SAFE).toBe(false);
    const violations = assertRefundProviderRecoveryDecisionSafety({
      ...d,
      RETRY_SAFE: true,
    });
    expect(violations).toContain(
      "SUBMISSION_ATTEMPTED_MUST_NOT_BE_RETRY_SAFE_DUPLICATE_MONEY"
    );
    expect(violations).toContain("IN_FLIGHT_MUST_NOT_BE_RETRY_SAFE");
  });
});
