import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  resetCommerceNotificationFoundation,
  wireCommerceRefundRequested,
  wireCommerceRefundRejected,
  wireCommerceRefundFailed,
  buildAdminNotificationDiagnostics,
} from "../commerceNotifications";
import {
  assertRefundOpsTransition,
  createRefundOperationRequest,
  evaluateRefundOpsEligibility,
  executeRefundOperationRequest,
  rejectClientRefundMoneyFields,
  refundOpsTransitionAllowed,
  transitionRefundOperationRequest,
  parseRefundOperationRequest,
  REFUND_OPS_RPCS,
  loadSellerRefundOperationsForOrder,
} from "./index";

const ROOT = join(__dirname, "../../..");
const STORE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORDER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ATTEMPT = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const BUYER = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const SELLER = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const REQ = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const MIGRATION =
  "supabase/migrations/20260888_store_refund_operations_surface_v1.sql";

function baseRequestRow(overrides: Record<string, unknown> = {}) {
  return {
    id: REQ,
    store_id: STORE,
    order_id: ORDER,
    payment_attempt_id: ATTEMPT,
    buyer_user_id: BUYER,
    seller_user_id: SELLER,
    requested_by_user_id: SELLER,
    status: "requested",
    reason: "Item not as described",
    rejection_reason: null,
    failure_code: null,
    failure_message_safe: null,
    trusted_amount_minor: 5000,
    currency: "USD",
    idempotency_key: "refund-req-idem-001",
    execution_idempotency_key: null,
    reviewed_by_user_id: null,
    reviewed_at: null,
    executed_by_user_id: null,
    executed_at: null,
    completed_at: null,
    created_at: "2026-07-31T00:00:00.000Z",
    updated_at: "2026-07-31T00:00:00.000Z",
    ...overrides,
  };
}

afterEach(() => {
  resetCommerceNotificationFoundation();
  vi.restoreAllMocks();
});

describe("Commerce Refund Operations Surface V1", () => {
  it("evaluates eligibility and rejects invalid ownership/payment", () => {
    const ok = evaluateRefundOpsEligibility({
      storeId: STORE,
      orderStoreId: STORE,
      orderPaymentStatus: "paid",
      orderStatus: "confirmed",
      attemptStatus: "captured",
      hasCaptureOutcome: true,
      hasRefundOutcome: false,
      payoutState: "NONE",
    });
    expect(ok.eligible).toBe(true);

    const badStore = evaluateRefundOpsEligibility({
      storeId: STORE,
      orderStoreId: ORDER,
      orderPaymentStatus: "paid",
      orderStatus: "confirmed",
      attemptStatus: "captured",
      hasCaptureOutcome: true,
      hasRefundOutcome: false,
    });
    expect(badStore.eligible).toBe(false);
    expect(badStore.blockers).toContain("unauthorized_store");

    const unpaid = evaluateRefundOpsEligibility({
      storeId: STORE,
      orderStoreId: STORE,
      orderPaymentStatus: "pending",
      orderStatus: "pending",
      attemptStatus: "requires_payment",
      hasCaptureOutcome: false,
      hasRefundOutcome: false,
    });
    expect(unpaid.eligible).toBe(false);
    expect(unpaid.blockers).toContain("not_refundable");
  });

  it("rejects client money fields and parses safe request rows", () => {
    expect(
      rejectClientRefundMoneyFields({ amountMinor: 100, storeId: STORE })
    ).toMatchObject({ code: "client_money_rejected" });
    const parsed = parseRefundOperationRequest(baseRequestRow());
    expect(parsed?.trustedAmountMinor).toBe(5000);
    expect(JSON.stringify(parsed)).not.toMatch(/sk_live_|SERVICE_ROLE/i);
  });

  it("enforces lifecycle transitions and rejects illegal ones", () => {
    expect(refundOpsTransitionAllowed("requested", "under_review")).toBe(true);
    expect(refundOpsTransitionAllowed("approved", "processing")).toBe(true);
    expect(refundOpsTransitionAllowed("completed", "approved")).toBe(false);
    expect(assertRefundOpsTransition("processing", "rejected").ok).toBe(false);
  });

  it("creates request with idempotency replay and conflict", async () => {
    const row = baseRequestRow();
    const rpc = vi.fn(async (_name: string, args?: Record<string, unknown>) => {
      if (args?.p_idempotency_key === "refund-req-idem-001") {
        return {
          data: { ok: true, replayed: false, request: row },
          error: null,
        };
      }
      if (args?.p_idempotency_key === "refund-req-idem-001-replay") {
        return {
          data: { ok: true, replayed: true, request: row },
          error: null,
        };
      }
      return {
        data: null,
        error: { message: "Idempotency key conflict" },
      };
    });

    const created = await createRefundOperationRequest(
      { rpc } as never,
      {
        storeId: STORE,
        orderId: ORDER,
        reason: "Item not as described",
        idempotencyKey: "refund-req-idem-001",
      }
    );
    expect(created).toMatchObject({ ok: true, replayed: false });
    if (!("ok" in created) || !created.ok) return;
    expect(created.request.id).toBe(REQ);

    const events = buildAdminNotificationDiagnostics(20).events.map(
      (e) => e.eventType
    );
    expect(events).toContain("refund_requested");

    const replay = await createRefundOperationRequest(
      { rpc } as never,
      {
        storeId: STORE,
        orderId: ORDER,
        reason: "Item not as described",
        idempotencyKey: "refund-req-idem-001-replay",
      }
    );
    expect(replay).toMatchObject({ ok: true, replayed: true });

    const conflict = await createRefundOperationRequest(
      { rpc } as never,
      {
        storeId: STORE,
        orderId: ORDER,
        reason: "Different reason text",
        idempotencyKey: "conflict-key-xxxx",
      }
    );
    expect(conflict).toMatchObject({ code: "idempotency_conflict" });
  });

  it("blocks duplicate active request mapping from RPC", async () => {
    const rpc = vi.fn(async () => ({
      data: null,
      error: { message: "Active refund request already exists for order" },
    }));
    const result = await createRefundOperationRequest(
      { rpc } as never,
      {
        storeId: STORE,
        orderId: ORDER,
        reason: "Duplicate check",
        idempotencyKey: "dup-active-key-01",
      }
    );
    expect(result).toMatchObject({ code: "duplicate_active_request" });
  });

  it("maps unauthorized store and admin authorization failures", async () => {
    const rpc = vi.fn(async () => ({
      data: null,
      error: { message: "Order does not belong to store" },
    }));
    const storeErr = await createRefundOperationRequest(
      { rpc } as never,
      {
        storeId: STORE,
        orderId: ORDER,
        reason: "Ownership check",
        idempotencyKey: "own-check-key-01",
      }
    );
    expect(storeErr).toMatchObject({ code: "unauthorized_store" });

    const adminRpc = vi.fn(async () => ({
      data: null,
      error: { message: "Platform admin required" },
    }));
    const unauthorized = await transitionRefundOperationRequest(
      { rpc: adminRpc } as never,
      { requestId: REQ, toStatus: "approved" }
    );
    expect(unauthorized).toMatchObject({ code: "unauthorized" });
  });

  it("approves/rejects and emits rejection notification", async () => {
    const rpc = vi.fn(async (_n: string, args?: Record<string, unknown>) => {
      if (args?.p_to_status === "approved") {
        return {
          data: {
            ok: true,
            request: baseRequestRow({ status: "approved" }),
          },
          error: null,
        };
      }
      return {
        data: {
          ok: true,
          request: baseRequestRow({
            status: "rejected",
            rejection_reason: "Evidence insufficient",
          }),
        },
        error: null,
      };
    });

    const approved = await transitionRefundOperationRequest(
      { rpc } as never,
      { requestId: REQ, toStatus: "approved" }
    );
    expect(approved).toMatchObject({ ok: true });

    const rejected = await transitionRefundOperationRequest(
      { rpc } as never,
      {
        requestId: REQ,
        toStatus: "rejected",
        note: "Evidence insufficient",
      }
    );
    expect(rejected).toMatchObject({ ok: true });
    expect(
      buildAdminNotificationDiagnostics(50).events.map((e) => e.eventType)
    ).toContain("refund_rejected");
  });

  it("rejects illegal transition from RPC", async () => {
    const rpc = vi.fn(async () => ({
      data: null,
      error: { message: "Illegal refund status transition" },
    }));
    const result = await transitionRefundOperationRequest(
      { rpc } as never,
      { requestId: REQ, toStatus: "approved" }
    );
    expect(result).toMatchObject({ code: "illegal_transition" });
  });

  it("executes full-order integration to completed", async () => {
    const marks: string[] = [];
    const userRpc = vi.fn(async (name: string, args?: Record<string, unknown>) => {
      if (name === "admin_get_store_refund_operation") {
        return {
          data: {
            ok: true,
            request: baseRequestRow({ status: "approved" }),
            events: [],
          },
          error: null,
        };
      }
      if (name === "mark_store_refund_operation_execution") {
        marks.push(String(args?.p_to_status));
        return {
          data: {
            ok: true,
            replayed: false,
            request: baseRequestRow({
              status: args?.p_to_status,
              execution_idempotency_key: args?.p_execution_idempotency_key,
            }),
          },
          error: null,
        };
      }
      return { data: null, error: { message: `unexpected ${name}` } };
    });

    let applyArgs: Record<string, unknown> | null = null;
    const applyRefund = async (
      _client: unknown,
      input: Record<string, unknown>
    ) => {
      applyArgs = input;
      return {
        ok: true as const,
        capability: "commerce.payments.full_order_refund_path_v1" as const,
        replayed: false,
        storeId: STORE,
        orderId: ORDER,
        paymentAttemptId: ATTEMPT,
        captureEventId: "cap",
        amountMinor: 5000,
        currency: "USD",
        settlementSteps: [],
        refund: { replayed: false, eventKey: "exec-key-0001", data: {} },
        finalSettlementState: "REVERSED" as const,
        payoutState: "NONE" as const,
        commission: {
          consistent: true as const,
          platformCommissionMinor: null,
          sellerAmountMinor: null,
          policyStatus: "not_configured" as const,
        },
        sellerPayableProtected: true as const,
        payoutProtected: true as const,
      };
    };

    const result = await executeRefundOperationRequest(
      { rpc: userRpc } as never,
      { requestId: REQ, executionIdempotencyKey: "exec-key-0001" },
      {
        applyRefund: applyRefund as never,
        serviceClient: { rpc: vi.fn() } as never,
      }
    );

    expect(result).toMatchObject({ ok: true });
    expect(marks).toEqual(["processing", "completed"]);
    expect(applyArgs).toMatchObject({
      storeId: STORE,
      paymentAttemptId: ATTEMPT,
      idempotencyKey: "exec-key-0001",
      buyerId: BUYER,
      sellerId: SELLER,
    });
    expect(applyArgs).not.toHaveProperty("amountMinor");
  });

  it("records failed execution outcome and notifies", async () => {
    const userRpc = vi.fn(async (name: string, args?: Record<string, unknown>) => {
      if (name === "admin_get_store_refund_operation") {
        return {
          data: {
            ok: true,
            request: baseRequestRow({ status: "approved" }),
            events: [],
          },
          error: null,
        };
      }
      return {
        data: {
          ok: true,
          replayed: false,
          request: baseRequestRow({
            status: args?.p_to_status ?? "failed",
            failure_code: args?.p_failure_code ?? "payout_in_transit",
            failure_message_safe:
              args?.p_failure_message_safe ?? "Blocked by payout state.",
          }),
        },
        error: null,
      };
    });

    const result = await executeRefundOperationRequest(
      { rpc: userRpc } as never,
      { requestId: REQ, executionIdempotencyKey: "exec-fail-0001" },
      {
        applyRefund: async () => ({
          ok: false as const,
          code: "payout_in_transit" as const,
          message: "Refund blocked: seller payout is IN_TRANSIT.",
        }),
        serviceClient: { rpc: vi.fn() } as never,
      }
    );
    expect(result).toMatchObject({ code: "execution_failed" });
    expect(
      buildAdminNotificationDiagnostics(50).events.map((e) => e.eventType)
    ).toContain("refund_failed");
  });

  it("builds seller read model with isolation and no execute flag", async () => {
    const rpc = vi.fn(async () => ({
      data: {
        ok: true,
        requests: [
          baseRequestRow(),
          baseRequestRow({
            id: "11111111-1111-4111-8111-111111111111",
            store_id: "99999999-9999-4999-8999-999999999999",
          }),
        ],
        events: [
          {
            id: "22222222-2222-4222-8222-222222222222",
            request_id: REQ,
            store_id: STORE,
            order_id: ORDER,
            actor_user_id: SELLER,
            event_type: "created",
            from_status: null,
            to_status: "requested",
            note: "Item not as described",
            source: "seller",
            created_at: "2026-07-31T00:00:00.000Z",
          },
        ],
      },
      error: null,
    }));

    const rm = await loadSellerRefundOperationsForOrder(
      { rpc } as never,
      { storeId: STORE, orderId: ORDER }
    );
    expect(rm).toMatchObject({ canExecuteMoneyRefund: false });
    if (!("requests" in rm)) return;
    expect(rm.requests).toHaveLength(1);
    expect(rm.timeline).toHaveLength(1);
    expect(JSON.stringify(rm)).not.toMatch(/sk_live_|SERVICE_ROLE|raw stripe/i);
  });

  it("wires notification helpers for requested/rejected/failed", () => {
    wireCommerceRefundRequested({
      orderId: ORDER,
      storeId: STORE,
      paymentAttemptId: ATTEMPT,
      buyerId: BUYER,
      sellerId: SELLER,
    });
    wireCommerceRefundRejected({
      orderId: ORDER,
      storeId: STORE,
      paymentAttemptId: ATTEMPT,
      buyerId: BUYER,
      sellerId: SELLER,
      reason: "Policy",
    });
    wireCommerceRefundFailed({
      orderId: ORDER,
      storeId: STORE,
      paymentAttemptId: ATTEMPT,
      buyerId: BUYER,
      sellerId: SELLER,
      code: "rpc_failed",
    });
    const types = buildAdminNotificationDiagnostics(100).events.map(
      (e) => e.eventType
    );
    expect(types).toEqual(
      expect.arrayContaining([
        "refund_requested",
        "refund_rejected",
        "refund_failed",
      ])
    );
  });

  it("architecture: durable migration + admin UI + no partial refund", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    const sql = readFileSync(join(ROOT, MIGRATION), "utf8");
    expect(sql).toMatch(/store_refund_operation_requests/);
    expect(sql).toMatch(/store_refund_operation_events/);
    expect(sql).toMatch(/append-only/);
    expect(sql).toMatch(/commerce_refund_rejected/);
    expect(sql).toMatch(/commerce_refund_failed/);
    expect(sql).not.toMatch(/partial_refund/i);

    expect(existsSync(join(ROOT, "app/admin/store/refunds/page.tsx"))).toBe(
      true
    );
    const page = readFileSync(
      join(ROOT, "app/admin/store/refunds/page.tsx"),
      "utf8"
    );
    expect(page).toMatch(/assertPlatformAdminDb/);
    expect(page).not.toMatch(/amountMinor|sk_live_/);

    const service = readFileSync(
      join(ROOT, "lib/store/refundOperations/service.ts"),
      "utf8"
    );
    expect(service).toMatch(/applyFullOrderRefund/);
    expect(service).not.toMatch(/partial/i);

    expect(REFUND_OPS_RPCS.length).toBeGreaterThan(3);
  });
});
