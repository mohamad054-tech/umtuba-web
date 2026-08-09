/**
 * Refund↔provider reconciliation — pure derivation tests.
 * STRIPE_CALLS=0 · DB_WRITES=0 · no network.
 */

import { describe, expect, it } from "vitest";
import { buildPartialRefundProviderIdempotencyKey } from "./idempotency";
import {
  buildRefundProviderReconciliation,
  classifyRefundProviderMatch,
} from "./refundProviderReconciliation";
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
    providerPaymentRef: "pi_recon_test",
    trustedAmountMinor: 2500,
    currency: "USD",
    idempotencyKey: buildPartialRefundProviderIdempotencyKey(IDS.ledger),
    status: "planned",
    providerRefundId: null,
    providerStatusSafe: null,
    failureCode: null,
    failureMessageSafe: null,
    operatorUserId: "op-1",
    operatorReasonSafe: "recon hardening",
    startedAtIso: null,
    completedAtIso: null,
    lastLookupAtIso: null,
    createdAtIso: "2026-08-09T12:00:00.000Z",
    updatedAtIso: "2026-08-09T12:00:00.000Z",
    ...overrides,
  };
}

describe("refundProviderReconciliation — six operator fields", () => {
  it("local reserved/planned + no provider → matched_pre_submit", () => {
    const snap = buildRefundProviderReconciliation({
      localLedgerStatus: "planned",
      ledgerId: IDS.ledger,
      nowMs: NOW,
    });
    expect(snap.LOCAL_STATE).toBe("planned");
    expect(snap.PROVIDER_STATE).toBe("none");
    expect(snap.MATCH_STATUS).toBe("matched_pre_submit");
    expect(snap.RECONCILIATION_REQUIRED).toBe(false);
    expect(snap.RETRY_SAFE).toBe(false);
    expect(snap.OPERATOR_ACTION_REQUIRED).toBe(false);
  });

  it("local committed + provider planned → awaiting first submit", () => {
    const snap = buildRefundProviderReconciliation({
      localLedgerStatus: "committed",
      execution: base({ status: "planned" }),
      nowMs: NOW,
    });
    expect(snap.LOCAL_STATE).toBe("committed");
    expect(snap.PROVIDER_STATE).toBe("planned");
    expect(snap.MATCH_STATUS).toBe("matched_awaiting_first_submit");
    expect(snap.OPERATOR_ACTION_REQUIRED).toBe(true);
    expect(snap.operatorAction).toBe("first_time_submit_candidate");
    expect(snap.RETRY_SAFE).toBe(false);
    expect(snap.evidence.providerSubmissionAttempted).toBe(false);
  });

  it("local committed + provider executing (fresh) → in_flight", () => {
    const snap = buildRefundProviderReconciliation({
      localLedgerStatus: "committed",
      execution: base({
        status: "executing",
        startedAtIso: "2026-08-09T12:04:30.000Z",
      }),
      nowMs: NOW,
    });
    expect(snap.PROVIDER_STATE).toBe("executing");
    expect(snap.MATCH_STATUS).toBe("in_flight_awaiting_outcome");
    expect(snap.RECONCILIATION_REQUIRED).toBe(false);
    expect(snap.RETRY_SAFE).toBe(false);
    expect(snap.operatorAction).toBe("await_in_flight");
    expect(snap.evidence.staleExecuting).toBe(false);
  });

  it("provider ref/result on succeeded → matched_terminal_success", () => {
    const snap = buildRefundProviderReconciliation({
      localLedgerStatus: "committed",
      execution: base({
        status: "succeeded",
        providerRefundId: "re_ok",
        providerStatusSafe: "succeeded",
        startedAtIso: "2026-08-09T12:00:01.000Z",
        completedAtIso: "2026-08-09T12:00:02.000Z",
      }),
      nowMs: NOW,
    });
    expect(snap.LOCAL_STATE).toBe("committed");
    expect(snap.PROVIDER_STATE).toBe("succeeded");
    expect(snap.MATCH_STATUS).toBe("matched_terminal_success");
    expect(snap.RECONCILIATION_REQUIRED).toBe(false);
    expect(snap.RETRY_SAFE).toBe(false);
    expect(snap.OPERATOR_ACTION_REQUIRED).toBe(false);
    expect(snap.evidence.terminalCompletion).toBe(true);
    expect(snap.evidence.providerResultPresent).toBe(true);
    expect(snap.identities.providerRefundId).toBe("re_ok");
  });

  it("local committing → local_committing_in_flight (reservation layer)", () => {
    const snap = buildRefundProviderReconciliation({
      localLedgerStatus: "committing",
      execution: base({ status: "planned" }),
      nowMs: NOW,
    });
    expect(snap.LOCAL_STATE).toBe("committing");
    expect(snap.MATCH_STATUS).toBe("local_committing_in_flight");
    expect(snap.OPERATOR_ACTION_REQUIRED).toBe(true);
    expect(snap.operatorAction).toBe("use_stuck_committing_recovery");
    expect(snap.RETRY_SAFE).toBe(false);
  });

  it("provider failed (pre-submit) + local committed → mismatch + no retry", () => {
    const snap = buildRefundProviderReconciliation({
      localLedgerStatus: "committed",
      execution: base({
        status: "failed",
        failureCode: "provider_rejected",
        failureMessageSafe: "declined",
      }),
      nowMs: NOW,
    });
    expect(snap.PROVIDER_STATE).toBe("failed");
    expect(snap.MATCH_STATUS).toBe("mismatch_local_committed_provider_failed");
    expect(snap.RECONCILIATION_REQUIRED).toBe(true);
    expect(snap.RETRY_SAFE).toBe(false);
    expect(snap.OPERATOR_ACTION_REQUIRED).toBe(true);
    expect(snap.operatorAction).toBe("review_mismatch");
    expect(snap.retryPolicyV1).toBe("no_retry");
  });

  it("unknown outcome (uncertain) → reconciliation + recovery lookup", () => {
    const snap = buildRefundProviderReconciliation({
      localLedgerStatus: "committed",
      execution: base({
        status: "uncertain",
        startedAtIso: "2026-08-09T12:00:01.000Z",
        lastLookupAtIso: "2026-08-09T12:03:00.000Z",
      }),
      nowMs: NOW,
    });
    expect(snap.PROVIDER_STATE).toBe("uncertain");
    expect(snap.MATCH_STATUS).toBe("unknown_outcome");
    expect(snap.RECONCILIATION_REQUIRED).toBe(true);
    expect(snap.RETRY_SAFE).toBe(false);
    expect(snap.OPERATOR_ACTION_REQUIRED).toBe(true);
    expect(snap.operatorAction).toBe("run_recovery_lookup");
    expect(snap.evidence.recoveryEligible).toBe(true);
    expect(snap.evidence.latestOperation).toBe("LOOKUP");
  });

  it("retry eligibility — V1 always RETRY_SAFE=false for existing rows", () => {
    for (const status of [
      "planned",
      "executing",
      "succeeded",
      "failed",
      "uncertain",
    ] as const) {
      const snap = buildRefundProviderReconciliation({
        localLedgerStatus: "committed",
        execution: base({
          status,
          startedAtIso:
            status === "planned" ? null : "2026-08-09T12:04:50.000Z",
        }),
        nowMs: NOW,
      });
      expect(snap.RETRY_SAFE).toBe(false);
    }
  });

  it("duplicate/replay bound by idempotency key", () => {
    const snap = buildRefundProviderReconciliation({
      localLedgerStatus: "committed",
      execution: base({ status: "succeeded", providerRefundId: "re_dup" }),
      nowMs: NOW,
    });
    expect(snap.evidence.duplicateReplayBound).toBe(true);
    expect(snap.identities.expectedIdempotencyKey).toBe(
      buildPartialRefundProviderIdempotencyKey(IDS.ledger)
    );
  });

  it("mismatched idempotency key → mismatch + operator action", () => {
    const snap = buildRefundProviderReconciliation({
      localLedgerStatus: "committed",
      execution: base({
        status: "succeeded",
        idempotencyKey: "prf-prov:00000000-0000-4000-8000-000000000000",
      }),
      nowMs: NOW,
    });
    expect(snap.MATCH_STATUS).toBe("mismatch_idempotency_key");
    expect(snap.RECONCILIATION_REQUIRED).toBe(true);
    expect(snap.OPERATOR_ACTION_REQUIRED).toBe(true);
    expect(snap.evidence.duplicateReplayBound).toBe(false);
  });

  it("stale executing → mismatch_stale_executing + recovery evidence", () => {
    const snap = buildRefundProviderReconciliation({
      localLedgerStatus: "committed",
      execution: base({
        status: "executing",
        startedAtIso: "2026-08-09T12:00:00.000Z",
      }),
      nowMs: NOW,
      staleAfterMs: 60_000,
    });
    expect(snap.MATCH_STATUS).toBe("mismatch_stale_executing");
    expect(snap.RECONCILIATION_REQUIRED).toBe(true);
    expect(snap.evidence.staleExecuting).toBe(true);
    expect(snap.evidence.recoveryEligible).toBe(true);
    expect(snap.operatorAction).toBe("run_recovery_lookup");
  });

  it("local failed + provider succeeded → critical mismatch", () => {
    const snap = buildRefundProviderReconciliation({
      localLedgerStatus: "failed",
      execution: base({
        status: "succeeded",
        providerRefundId: "re_money",
        providerStatusSafe: "succeeded",
        completedAtIso: "2026-08-09T12:00:02.000Z",
      }),
      nowMs: NOW,
    });
    expect(snap.MATCH_STATUS).toBe("mismatch_local_failed_provider_succeeded");
    expect(snap.RECONCILIATION_REQUIRED).toBe(true);
    expect(snap.RETRY_SAFE).toBe(false);
    expect(snap.OPERATOR_ACTION_REQUIRED).toBe(true);
  });

  it("local committed + provider absent → first-time submit candidate", () => {
    const snap = buildRefundProviderReconciliation({
      localLedgerStatus: "committed",
      ledgerId: IDS.ledger,
      nowMs: NOW,
    });
    expect(snap.PROVIDER_STATE).toBe("none");
    expect(snap.MATCH_STATUS).toBe("mismatch_local_committed_provider_absent");
    expect(snap.OPERATOR_ACTION_REQUIRED).toBe(true);
    expect(snap.operatorAction).toBe("first_time_submit_candidate");
    // Absence is an execute-candidate signal, not an unknown-outcome reconcile.
    expect(snap.RECONCILIATION_REQUIRED).toBe(false);
  });

  it("terminal failure alignment (local failed + provider failed)", () => {
    const snap = buildRefundProviderReconciliation({
      localLedgerStatus: "failed",
      execution: base({ status: "failed", failureCode: "gate_disabled" }),
      nowMs: NOW,
    });
    expect(snap.MATCH_STATUS).toBe("matched_terminal_failure");
    expect(snap.RECONCILIATION_REQUIRED).toBe(false);
    expect(snap.OPERATOR_ACTION_REQUIRED).toBe(false);
    expect(snap.evidence.terminalCompletion).toBe(true);
  });

  it("does not invent external provider truth (no secrets / no live claims)", () => {
    const snap = buildRefundProviderReconciliation({
      localLedgerStatus: "committed",
      execution: base({
        status: "uncertain",
        startedAtIso: "2026-08-09T12:00:01.000Z",
      }),
      nowMs: NOW,
    });
    const json = JSON.stringify(snap);
    expect(json).not.toMatch(/sk_(live|test)_|whsec_|client_secret/);
    expect(snap.PROVIDER_STATE).toBe("uncertain");
    expect(snap.evidence.classificationReason).toMatch(/durable local evidence/i);
    expect(snap.evidence.classificationReason).not.toMatch(/stripe api|live refund/i);
  });
});

describe("classifyRefundProviderMatch — unit table", () => {
  it("covers committing / unknown / compensated non-terminal", () => {
    expect(
      classifyRefundProviderMatch({
        local: "committing",
        provider: "none",
        staleExecuting: false,
        idempotencyKeyValid: null,
      }).match
    ).toBe("local_committing_in_flight");

    expect(
      classifyRefundProviderMatch({
        local: "unknown",
        provider: "succeeded",
        staleExecuting: false,
        idempotencyKeyValid: true,
      }).match
    ).toBe("insufficient_local_facts");

    expect(
      classifyRefundProviderMatch({
        local: "compensated",
        provider: "executing",
        staleExecuting: false,
        idempotencyKeyValid: true,
      }).match
    ).toBe("in_flight_awaiting_outcome");

    expect(
      classifyRefundProviderMatch({
        local: "compensated",
        provider: "uncertain",
        staleExecuting: false,
        idempotencyKeyValid: true,
      }).match
    ).toBe("unknown_outcome");
  });
});
