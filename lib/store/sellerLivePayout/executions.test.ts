/**
 * Seller Live Payout Provider V1 — Slice S3 execution helper tests.
 */

import { describe, expect, it, vi } from "vitest";
import {
  SELLER_LIVE_PAYOUT_EXECUTION_RPCS,
  getMyStorePayoutExecution,
  isSellerLivePayoutExecutionTransitionAllowed,
  mapTransferStatusToDurableExecutionStatus,
  rejectClientTrustedMoneyFields,
  serviceInsertStorePayoutExecution,
  serviceUpdateStorePayoutExecution,
  validateTrustedAmountMinor,
} from "./executions";

const STORE_ID = "11111111-1111-4111-8111-111111111111";
const CAPTURE_ID = "22222222-2222-4222-8222-222222222222";
const DEST_ID = "44444444-4444-4444-8444-444444444444";
const EXEC_ID = "33333333-3333-4333-8333-333333333333";

function sampleExecution(overrides: Record<string, unknown> = {}) {
  return {
    id: EXEC_ID,
    store_id: STORE_ID,
    capture_event_id: CAPTURE_ID,
    destination_id: DEST_ID,
    provider_id: "manual_ops_live",
    status: "awaiting_attestation",
    trusted_amount_minor: 1500,
    currency: "USD",
    provider_ref: "mol-33333333-idem",
    failure_code: "attestation_required",
    failure_message_safe: null,
    attestation_decision: null,
    attestation_ref: null,
    attested_at: null,
    note: "awaiting ops",
    created_at: "2026-08-05T00:00:00Z",
    updated_at: "2026-08-05T00:00:00Z",
    ...overrides,
  };
}

function mockClient(rpcImpl: (fn: string, args: unknown) => Promise<unknown>) {
  return {
    rpc: vi.fn(async (fn: string, args: unknown) => {
      try {
        const data = await rpcImpl(fn, args);
        return { data, error: null };
      } catch (e) {
        return {
          data: null,
          error: { message: e instanceof Error ? e.message : String(e) },
        };
      }
    }),
  } as never;
}

describe("Seller Live Payout executions (S3)", () => {
  it("exposes only S2 execution RPC names", () => {
    expect(SELLER_LIVE_PAYOUT_EXECUTION_RPCS.getMine).toBe(
      "get_my_store_payout_execution"
    );
    expect(SELLER_LIVE_PAYOUT_EXECUTION_RPCS.serviceInsert).toBe(
      "service_insert_store_payout_execution"
    );
    expect(SELLER_LIVE_PAYOUT_EXECUTION_RPCS.serviceUpdate).toBe(
      "service_update_store_payout_execution"
    );
  });

  it("rejects client money fields and accepts trusted server amount", () => {
    expect(
      rejectClientTrustedMoneyFields({ amount_minor: 100 }).ok
    ).toBe(false);
    expect(
      rejectClientTrustedMoneyFields({ amountMinor: 100 }).ok
    ).toBe(false);
    expect(
      rejectClientTrustedMoneyFields({
        storeId: STORE_ID,
        trustedAmountMinor: 1500,
        currency: "USD",
      }).ok
    ).toBe(true);
    expect(validateTrustedAmountMinor(0).ok).toBe(false);
    expect(validateTrustedAmountMinor(1500).ok).toBe(true);
  });

  it("fail-closes illegal transitions (not a second payout state machine)", () => {
    expect(
      isSellerLivePayoutExecutionTransitionAllowed(
        "planned",
        "awaiting_attestation"
      )
    ).toBe(true);
    expect(
      isSellerLivePayoutExecutionTransitionAllowed("planned", "succeeded")
    ).toBe(false);
    expect(
      isSellerLivePayoutExecutionTransitionAllowed(
        "awaiting_attestation",
        "succeeded"
      )
    ).toBe(true);
    expect(
      isSellerLivePayoutExecutionTransitionAllowed("succeeded", "failed")
    ).toBe(false);
    expect(
      isSellerLivePayoutExecutionTransitionAllowed("failed", "succeeded")
    ).toBe(false);
  });

  it("inserts with awaiting_attestation and preserves idempotent replay", async () => {
    let calls = 0;
    const client = mockClient(async (fn, args) => {
      expect(fn).toBe("service_insert_store_payout_execution");
      const a = args as Record<string, unknown>;
      expect(a.p_trusted_amount_minor).toBe(1500);
      expect(a.p_status).toBe("awaiting_attestation");
      expect(a).not.toHaveProperty("p_amount_minor");
      calls += 1;
      return {
        ok: true,
        replayed: calls > 1,
        execution: sampleExecution(),
      };
    });

    const first = await serviceInsertStorePayoutExecution(client, {
      storeId: STORE_ID,
      captureEventId: CAPTURE_ID,
      destinationId: DEST_ID,
      trustedAmountMinor: 1500,
      currency: "USD",
      idempotencyKey: "idem-key-manual-ops-01",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.replayed).toBe(false);
    expect(first.execution.status).toBe("awaiting_attestation");
    expect(first.execution.status).not.toBe("succeeded");

    const second = await serviceInsertStorePayoutExecution(client, {
      storeId: STORE_ID,
      captureEventId: CAPTURE_ID,
      destinationId: DEST_ID,
      trustedAmountMinor: 1500,
      currency: "USD",
      idempotencyKey: "idem-key-manual-ops-01",
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.replayed).toBe(true);
    expect(second.execution.id).toBe(first.execution.id);
  });

  it("rejects Connect provider and client amount aliases before RPC", async () => {
    const rpc = vi.fn();
    const client = { rpc } as never;

    const connect = await serviceInsertStorePayoutExecution(client, {
      storeId: STORE_ID,
      captureEventId: CAPTURE_ID,
      destinationId: DEST_ID,
      providerId: "stripe_connect",
      trustedAmountMinor: 1500,
      currency: "USD",
      idempotencyKey: "idem-key-manual-ops-01",
    });
    expect(connect.ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();

    const withClientMoney = await serviceInsertStorePayoutExecution(client, {
      storeId: STORE_ID,
      captureEventId: CAPTURE_ID,
      destinationId: DEST_ID,
      trustedAmountMinor: 1500,
      currency: "USD",
      idempotencyKey: "idem-key-manual-ops-01",
      // @ts-expect-error — intentional client money smuggling probe
      amountMinor: 9999,
    });
    expect(withClientMoney.ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("updates only when transition is allowed", async () => {
    const client = mockClient(async (fn, args) => {
      expect(fn).toBe("service_update_store_payout_execution");
      const a = args as Record<string, unknown>;
      expect(a.p_status).toBe("succeeded");
      return {
        ok: true,
        execution: sampleExecution({
          status: "succeeded",
          attestation_decision: "approve",
          failure_code: null,
        }),
      };
    });

    const blocked = await serviceUpdateStorePayoutExecution(client, {
      executionId: EXEC_ID,
      fromStatus: "planned",
      status: "succeeded",
    });
    expect(blocked.ok).toBe(false);

    const ok = await serviceUpdateStorePayoutExecution(client, {
      executionId: EXEC_ID,
      fromStatus: "awaiting_attestation",
      status: "succeeded",
      note: "ops attested",
    });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.execution.status).toBe("succeeded");
  });

  it("reads seller execution via S2 get RPC", async () => {
    const client = mockClient(async (fn) => {
      expect(fn).toBe("get_my_store_payout_execution");
      return { ok: true, execution: sampleExecution() };
    });
    const res = await getMyStorePayoutExecution(client, STORE_ID, EXEC_ID);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.execution.trustedAmountMinor).toBe(1500);
  });

  it("maps provider transfer status to awaiting_attestation / failed / uncertain", () => {
    expect(mapTransferStatusToDurableExecutionStatus("pending")).toBe(
      "awaiting_attestation"
    );
    expect(mapTransferStatusToDurableExecutionStatus("failed")).toBe("failed");
    expect(mapTransferStatusToDurableExecutionStatus("uncertain")).toBe(
      "uncertain"
    );
  });
});
