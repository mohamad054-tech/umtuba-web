/**
 * Seller Live Payout Provider V1 — Slice S4 orchestrator tests.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrustedPayoutBookingContext } from "../payoutBookingOpsHelpers";
import type { SellerLivePayoutDestination } from "./destinations";
import type { SellerLivePayoutExecution } from "./executions";
import {
  SELLER_LIVE_PAYOUT_NON_PRODUCTION_FIXTURE_TOKEN,
  SELLER_LIVE_PAYOUT_PRODUCTION_GATE_ACK_VALUE,
  SELLER_LIVE_PAYOUT_V1_PROVIDER_ID,
  assertSellerLivePayoutProviderAllowed,
  buildLivePayoutBookingIdempotencyKey,
  orchestrateSellerLivePayoutResolveAttestation,
  orchestrateSellerLivePayoutSubmit,
  rejectClientLivePayoutOrchestratorMoneyFields,
  validateOrchestrationKey,
  type SellerLivePayoutOrchestratorDeps,
  type SellerLivePayoutOrchestratorInput,
} from "./index";
import type { SellerLivePayoutProviderPort } from "./providerPort";
import type { SellerLivePayoutTransferResult } from "./types";

const STORE = "11111111-1111-4111-8111-111111111111";
const ATTEMPT = "33333333-3333-4333-8333-333333333333";
const ORDER = "44444444-4444-4444-8444-444444444444";
const CAPTURE = "55555555-5555-4555-8555-555555555555";
const DEST = "66666666-6666-4666-8666-666666666666";
const EXEC = "77777777-7777-4777-8777-777777777777";
const ORCH_KEY = "live-orch-key-0001";

function baseLiveEnv(): Record<string, string> {
  return {
    NODE_ENV: "production",
    VERCEL_ENV: "production",
    SELLER_LIVE_PAYOUTS_ENABLED: "true",
    SELLER_LIVE_PAYOUT_PRODUCTION_GATE_ACK:
      SELLER_LIVE_PAYOUT_PRODUCTION_GATE_ACK_VALUE,
    SELLER_LIVE_PAYOUT_PROVIDER: SELLER_LIVE_PAYOUT_V1_PROVIDER_ID,
  };
}

function baseContext(
  overrides: Partial<TrustedPayoutBookingContext> = {}
): TrustedPayoutBookingContext {
  return {
    storeId: STORE,
    orderId: ORDER,
    paymentAttemptId: ATTEMPT,
    captureEventId: CAPTURE,
    captureEventKey: "stripe:pi_live_orch:captured",
    correlationId: "corr-live-orch-1",
    amountMinor: 5000,
    currency: "USD",
    orderPaymentStatus: "paid",
    attemptStatus: "captured",
    settlementState: "RELEASED",
    payoutState: "NONE",
    hasRefund: false,
    hasDisputedOrReversedFunds: false,
    submitCount: 0,
    failCount: 0,
    confirmCount: 0,
    ...overrides,
  };
}

function baseDestination(
  overrides: Partial<SellerLivePayoutDestination> = {}
): SellerLivePayoutDestination {
  return {
    id: DEST,
    storeId: STORE,
    providerId: "manual_ops_live",
    currency: "USD",
    displayLabel: "Ops clearing •••• 42",
    verificationState: "verified",
    isActive: true,
    createdAt: "2026-08-05T00:00:00Z",
    updatedAt: "2026-08-05T00:00:00Z",
    ...overrides,
  };
}

function baseExecution(
  overrides: Partial<SellerLivePayoutExecution> = {}
): SellerLivePayoutExecution {
  return {
    id: EXEC,
    storeId: STORE,
    captureEventId: CAPTURE,
    destinationId: DEST,
    providerId: "manual_ops_live",
    status: "awaiting_attestation",
    trustedAmountMinor: 5000,
    currency: "USD",
    providerRef: "mol-ref-1",
    failureCode: "attestation_required",
    failureMessageSafe: null,
    attestationDecision: null,
    attestationRef: null,
    attestedAt: null,
    note: "awaiting",
    createdAt: "2026-08-05T00:00:00Z",
    updatedAt: "2026-08-05T00:00:00Z",
    ...overrides,
  };
}

function sampleInput(
  overrides: Partial<SellerLivePayoutOrchestratorInput> = {}
): SellerLivePayoutOrchestratorInput {
  return {
    storeId: STORE,
    paymentAttemptId: ATTEMPT,
    destinationId: DEST,
    orchestrationKey: ORCH_KEY,
    ...overrides,
  };
}

function bookingOk(
  action: "submit" | "fail" | "confirm",
  payoutState: "IN_TRANSIT" | "NONE" | "COMPLETED",
  replayed = false
) {
  return {
    ok: true as const,
    action,
    replayed,
    payoutState,
    amountMinor: 5000,
    currency: "USD",
    storeId: STORE,
    orderId: ORDER,
    paymentAttemptId: ATTEMPT,
    captureEventId: CAPTURE,
    eventKey: buildLivePayoutBookingIdempotencyKey(ORCH_KEY, action),
    eventId: "88888888-8888-4888-8888-888888888888",
    data: {},
    reconciliation: {
      store_id: STORE,
      payment_attempt_id: ATTEMPT,
      capture_event_id: CAPTURE,
      settlement_state: "RELEASED",
      payout_state: payoutState,
    } as never,
  };
}

function pendingTransfer(): SellerLivePayoutTransferResult {
  return {
    status: "pending",
    providerRef: "mol-ref-1",
    failureCode: "attestation_required",
    note: "awaiting attestation",
  };
}

function mockPort(): SellerLivePayoutProviderPort {
  return {
    providerId: "manual_ops_live",
    supportsLiveTransfer: true,
    createTransfer: vi.fn(async () => pendingTransfer()),
  };
}

function baseDeps(
  overrides: Partial<SellerLivePayoutOrchestratorDeps> = {}
): SellerLivePayoutOrchestratorDeps {
  const port = mockPort();
  return {
    env: baseLiveEnv(),
    loadContext: vi.fn(async () => ({
      ok: true as const,
      context: baseContext(),
    })),
    loadDestination: vi.fn(async () => ({
      ok: true as const,
      destination: baseDestination(),
    })),
    findExecutionByOrchestrationKey: vi.fn(async () => null),
    resolveProvider: vi.fn(() => port),
    submitBooking: vi.fn(async () => bookingOk("submit", "IN_TRANSIT")),
    failBooking: vi.fn(async () => bookingOk("fail", "NONE")),
    confirmBooking: vi.fn(async () => bookingOk("confirm", "COMPLETED")),
    insertExecution: vi.fn(async () => ({
      ok: true as const,
      replayed: false,
      execution: baseExecution(),
    })),
    updateExecution: vi.fn(async (_sb, input) => ({
      ok: true as const,
      execution: baseExecution({
        status: input.status,
        providerRef: input.providerRef ?? "mol-ref-1",
        failureCode:
          input.failureCode === undefined
            ? "attestation_required"
            : input.failureCode,
        note: input.note ?? null,
      }),
    })),
    createTransfer: vi.fn(async () => pendingTransfer()),
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Seller Live Payout Orchestrator V1 (S4) — guards", () => {
  it("rejects client-supplied money fields", () => {
    expect(
      rejectClientLivePayoutOrchestratorMoneyFields({
        storeId: STORE,
        paymentAttemptId: ATTEMPT,
        destinationId: DEST,
        orchestrationKey: ORCH_KEY,
      }).ok
    ).toBe(true);
    expect(
      rejectClientLivePayoutOrchestratorMoneyFields({
        storeId: STORE,
        amountMinor: 100,
      }).ok
    ).toBe(false);
    expect(
      rejectClientLivePayoutOrchestratorMoneyFields({
        trusted_amount_minor: 100,
      }).ok
    ).toBe(false);
    expect(validateOrchestrationKey("short").ok).toBe(false);
    expect(validateOrchestrationKey(ORCH_KEY).ok).toBe(true);
  });

  it("gate disabled → no submit booking", async () => {
    const deps = baseDeps({ env: {} });
    const res = await orchestrateSellerLivePayoutSubmit(
      {} as never,
      sampleInput(),
      deps
    );
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.code).toBe("gate_incomplete");
    expect(deps.submitBooking).not.toHaveBeenCalled();
    expect(deps.createTransfer).not.toHaveBeenCalled();
  });

  it("invalid/untrusted money input rejected before booking", async () => {
    const deps = baseDeps();
    const res = await orchestrateSellerLivePayoutSubmit(
      {} as never,
      {
        ...sampleInput(),
        // @ts-expect-error intentional client money probe
        amountMinor: 9999,
      },
      deps
    );
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.code).toBe("invalid_amount");
    expect(deps.submitBooking).not.toHaveBeenCalled();
  });

  it("keeps unsupported providers blocked", () => {
    expect(() =>
      assertSellerLivePayoutProviderAllowed("stripe_connect")
    ).toThrow(/forbidden|not allowed/i);
    expect(() => assertSellerLivePayoutProviderAllowed("wise")).toThrow();
    expect(() => assertSellerLivePayoutProviderAllowed("paypal")).toThrow();
  });
});

describe("Seller Live Payout Orchestrator V1 (S4) — submit flow", () => {
  it("eligible → submit → awaiting_attestation (never confirm on create)", async () => {
    const deps = baseDeps();
    const res = await orchestrateSellerLivePayoutSubmit(
      {} as never,
      sampleInput(),
      deps
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.phase).toBe("awaiting_attestation");
    expect(res.trustedAmountMinor).toBe(5000);
    expect(res.payoutState).toBe("IN_TRANSIT");
    expect(deps.submitBooking).toHaveBeenCalledTimes(1);
    expect(deps.confirmBooking).not.toHaveBeenCalled();
    expect(deps.failBooking).not.toHaveBeenCalled();
    expect(deps.createTransfer).toHaveBeenCalledTimes(1);
    expect(deps.insertExecution).toHaveBeenCalledTimes(1);
  });

  it("known provider failure → fail booking → execution failed", async () => {
    const deps = baseDeps({
      createTransfer: vi.fn(
        async (): Promise<SellerLivePayoutTransferResult> => ({
          status: "failed",
          providerRef: null,
          failureCode: "provider_rejected",
          note: "ops rejected",
        })
      ),
    });
    const res = await orchestrateSellerLivePayoutSubmit(
      {} as never,
      sampleInput(),
      deps
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.phase).toBe("failed");
    expect(deps.failBooking).toHaveBeenCalledTimes(1);
    expect(deps.confirmBooking).not.toHaveBeenCalled();
    expect(deps.updateExecution).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: "failed" })
    );
  });

  it("uncertain provider outcome → no fail booking", async () => {
    const deps = baseDeps({
      createTransfer: vi.fn(
        async (): Promise<SellerLivePayoutTransferResult> => ({
          status: "uncertain",
          providerRef: "mol-uncertain",
          failureCode: "execution_uncertain",
          note: "unknown rail state",
        })
      ),
    });
    const res = await orchestrateSellerLivePayoutSubmit(
      {} as never,
      sampleInput(),
      deps
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.phase).toBe("uncertain");
    expect(deps.failBooking).not.toHaveBeenCalled();
    expect(deps.confirmBooking).not.toHaveBeenCalled();
    expect(res.phase).toBe("uncertain");
  });

  it("idempotent replay → no duplicate provider execution", async () => {
    const existing = baseExecution();
    const deps = baseDeps({
      findExecutionByOrchestrationKey: vi.fn(async () => existing),
      loadContext: vi.fn(async () => ({
        ok: true as const,
        context: baseContext({ payoutState: "IN_TRANSIT", submitCount: 1 }),
      })),
    });
    const res = await orchestrateSellerLivePayoutSubmit(
      {} as never,
      sampleInput(),
      deps
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.replayed).toBe(true);
    expect(res.phase).toBe("awaiting_attestation");
    expect(deps.submitBooking).not.toHaveBeenCalled();
    expect(deps.createTransfer).not.toHaveBeenCalled();
    expect(deps.insertExecution).not.toHaveBeenCalled();
  });

  it("terminal completed cannot replay/re-submit", async () => {
    const deps = baseDeps({
      loadContext: vi.fn(async () => ({
        ok: true as const,
        context: baseContext({ payoutState: "COMPLETED", confirmCount: 1 }),
      })),
    });
    const res = await orchestrateSellerLivePayoutSubmit(
      {} as never,
      sampleInput(),
      deps
    );
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.phase).toBe("terminal_completed");
    expect(res.code).toBe("terminal_completed");
    expect(deps.submitBooking).not.toHaveBeenCalled();
  });

  it("unverified destination is blocked before submit", async () => {
    const deps = baseDeps({
      loadDestination: vi.fn(async () => ({
        ok: true as const,
        destination: baseDestination({ verificationState: "unverified" }),
      })),
    });
    const res = await orchestrateSellerLivePayoutSubmit(
      {} as never,
      sampleInput(),
      deps
    );
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.code).toBe("account_unverified");
    expect(deps.submitBooking).not.toHaveBeenCalled();
  });
});

describe("Seller Live Payout Orchestrator V1 (S4) — attestation resolve", () => {
  it("successful attestation → confirm booking → completed", async () => {
    const deps = baseDeps({
      findExecutionByOrchestrationKey: vi.fn(async () => baseExecution()),
      loadContext: vi.fn(async () => ({
        ok: true as const,
        context: baseContext({ payoutState: "IN_TRANSIT", submitCount: 1 }),
      })),
    });
    const res = await orchestrateSellerLivePayoutResolveAttestation(
      {} as never,
      {
        ...sampleInput(),
        executionId: EXEC,
        decision: "succeeded",
        attestationRef: "ops-ref-9",
      },
      deps
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.phase).toBe("completed");
    expect(res.payoutState).toBe("COMPLETED");
    expect(deps.confirmBooking).toHaveBeenCalledTimes(1);
    expect(deps.failBooking).not.toHaveBeenCalled();
    expect(deps.updateExecution).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: "succeeded" })
    );
  });

  it("provider success + confirm RPC failure → succeeded_pending_confirm (no auto-fail)", async () => {
    const deps = baseDeps({
      findExecutionByOrchestrationKey: vi.fn(async () => baseExecution()),
      loadContext: vi.fn(async () => ({
        ok: true as const,
        context: baseContext({ payoutState: "IN_TRANSIT", submitCount: 1 }),
      })),
      confirmBooking: vi.fn(async () => ({
        ok: false as const,
        code: "rpc_failed" as const,
        message: "confirm RPC failed",
      })),
    });
    const res = await orchestrateSellerLivePayoutResolveAttestation(
      {} as never,
      {
        ...sampleInput(),
        executionId: EXEC,
        decision: "succeeded",
      },
      deps
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.phase).toBe("succeeded_pending_confirm");
    expect(deps.failBooking).not.toHaveBeenCalled();
    expect(deps.updateExecution).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "uncertain",
        failureCode: "confirm_pending",
      })
    );
  });

  it("attestation failed → fail booking", async () => {
    const deps = baseDeps({
      findExecutionByOrchestrationKey: vi.fn(async () => baseExecution()),
      loadContext: vi.fn(async () => ({
        ok: true as const,
        context: baseContext({ payoutState: "IN_TRANSIT", submitCount: 1 }),
      })),
    });
    const res = await orchestrateSellerLivePayoutResolveAttestation(
      {} as never,
      {
        ...sampleInput(),
        executionId: EXEC,
        decision: "failed",
      },
      deps
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.phase).toBe("failed");
    expect(deps.failBooking).toHaveBeenCalledTimes(1);
    expect(deps.confirmBooking).not.toHaveBeenCalled();
  });

  it("uncertain attestation → no fail booking", async () => {
    const deps = baseDeps({
      findExecutionByOrchestrationKey: vi.fn(async () => baseExecution()),
      loadContext: vi.fn(async () => ({
        ok: true as const,
        context: baseContext({ payoutState: "IN_TRANSIT", submitCount: 1 }),
      })),
    });
    const res = await orchestrateSellerLivePayoutResolveAttestation(
      {} as never,
      {
        ...sampleInput(),
        executionId: EXEC,
        decision: "uncertain",
      },
      deps
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.phase).toBe("uncertain");
    expect(deps.failBooking).not.toHaveBeenCalled();
    expect(deps.confirmBooking).not.toHaveBeenCalled();
  });

  it("allows fixture gate in non-production for unit tests", async () => {
    const deps = baseDeps({
      env: {
        NODE_ENV: "test",
        SELLER_LIVE_PAYOUTS_ENABLED: "true",
        SELLER_LIVE_PAYOUT_PRODUCTION_GATE_ACK:
          SELLER_LIVE_PAYOUT_PRODUCTION_GATE_ACK_VALUE,
        SELLER_LIVE_PAYOUT_ALLOW_IN_NON_PRODUCTION:
          SELLER_LIVE_PAYOUT_NON_PRODUCTION_FIXTURE_TOKEN,
        SELLER_LIVE_PAYOUT_PROVIDER: SELLER_LIVE_PAYOUT_V1_PROVIDER_ID,
      },
    });
    const res = await orchestrateSellerLivePayoutSubmit(
      {} as never,
      sampleInput(),
      deps
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.phase).toBe("awaiting_attestation");
  });
});
