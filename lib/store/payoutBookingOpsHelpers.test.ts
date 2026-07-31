/**
 * Focused tests — Payout Booking Ops Helpers V1.
 */

import { describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  STORE_PAYOUT_RPC,
  STORE_PAYOUT_STATES,
} from "./sellerPayoutFoundation";
import {
  assertTrustedPayoutBookingContext,
  buildPayoutBookingEventKey,
  confirmPayoutBooking,
  failPayoutBooking,
  PAYOUT_BOOKING_OPS_HELPERS_ID,
  rejectClientPayoutBookingMoneyFields,
  submitPayoutBooking,
  type TrustedPayoutBookingContext,
} from "./payoutBookingOpsHelpers";
import { reconcileSettlementPayoutCapture } from "./settlementPayoutReconciliation";

const ROOT = join(__dirname, "../..");
const STORE = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const ATTEMPT = "33333333-3333-4333-8333-333333333333";
const ORDER = "44444444-4444-4444-8444-444444444444";
const CAPTURE = "55555555-5555-4555-8555-555555555555";
const CAPTURE_KEY = "stripe:pi_ops_helpers_capture_key_v1:captured";
const CORR = "stripe-attempt-333333333333433383333333333333";
const IDEM_SUBMIT = "payout-submit-idem-key-0001";
const IDEM_FAIL = "payout-fail-idem-key-0001";
const IDEM_CONFIRM = "payout-confirm-idem-key-0001";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

function baseContext(
  overrides: Partial<TrustedPayoutBookingContext> = {}
): TrustedPayoutBookingContext {
  return {
    storeId: STORE,
    orderId: ORDER,
    paymentAttemptId: ATTEMPT,
    captureEventId: CAPTURE,
    captureEventKey: CAPTURE_KEY,
    correlationId: CORR,
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

describe("Payout booking ops helpers — contracts", () => {
  it("ships capability id and reuses foundation RPC only (no new migration)", () => {
    expect(PAYOUT_BOOKING_OPS_HELPERS_ID).toBe(
      "commerce.settlement.payout_booking_ops_helpers_v1"
    );
    expect(STORE_PAYOUT_RPC).toBe("apply_store_payout_event");
    expect([...STORE_PAYOUT_STATES]).toEqual([
      "NONE",
      "IN_TRANSIT",
      "COMPLETED",
    ]);
    const migrations = readdirSync(join(ROOT, "supabase/migrations"));
    expect(
      migrations.some((f) => f.includes("payout_booking_ops_helpers"))
    ).toBe(false);
    expect(
      existsSync(join(ROOT, "lib/store/payoutBookingOpsHelpers.ts"))
    ).toBe(true);
    expect(
      existsSync(
        join(ROOT, "docs/store/implementation/PAYOUT_BOOKING_OPS_HELPERS_V1.md")
      )
    ).toBe(true);
    const src = read("lib/store/payoutBookingOpsHelpers.ts");
    expect(src).toMatch(/STORE_PAYOUT_RPC/);
    expect(src).toMatch(/apply_store_payout_event|STORE_PAYOUT_RPC/);
    expect(src).not.toMatch(/stripe\.payouts|Payout\.create|transfer\.create/i);
    expect(src).not.toMatch(/Dashboard|admin_ui|Admin UI/i);
  });

  it("builds deterministic event keys without inventing money", () => {
    expect(buildPayoutBookingEventKey(CAPTURE_KEY, "submit")).toBe(
      `${CAPTURE_KEY}:payout:submit`
    );
    expect(buildPayoutBookingEventKey(CAPTURE_KEY, "submit", 2)).toBe(
      `${CAPTURE_KEY}:payout:submit:2`
    );
    expect(buildPayoutBookingEventKey(CAPTURE_KEY, "fail")).toBe(
      `${CAPTURE_KEY}:payout:fail`
    );
    expect(buildPayoutBookingEventKey(CAPTURE_KEY, "confirm")).toBe(
      `${CAPTURE_KEY}:payout:confirm`
    );
  });

  it("rejects client-supplied money / rail fields", () => {
    expect(
      rejectClientPayoutBookingMoneyFields({
        storeId: STORE,
        paymentAttemptId: ATTEMPT,
        idempotencyKey: IDEM_SUBMIT,
      }).ok
    ).toBe(true);
    expect(
      rejectClientPayoutBookingMoneyFields({
        storeId: STORE,
        amountMinor: 100,
      }).ok
    ).toBe(false);
    expect(
      rejectClientPayoutBookingMoneyFields({
        commission_bps: 250,
      }).ok
    ).toBe(false);
    expect(
      rejectClientPayoutBookingMoneyFields({
        rail: "stripe",
      }).ok
    ).toBe(false);
  });
});

describe("Payout booking ops helpers — eligibility gates", () => {
  it("allows money checks when RELEASED; rejects non-released", () => {
    expect(
      assertTrustedPayoutBookingContext(baseContext(), "submit").ok
    ).toBe(true);
    expect(
      assertTrustedPayoutBookingContext(
        baseContext({ settlementState: "NOT_RELEASED" }),
        "submit"
      )
    ).toMatchObject({ ok: false, code: "not_released" });
    // State machine remains DB-authoritative — helper does not pre-block
    // IN_TRANSIT so duplicate submit keys can still replay safely.
    expect(
      assertTrustedPayoutBookingContext(
        baseContext({ payoutState: "IN_TRANSIT", submitCount: 1 }),
        "submit"
      ).ok
    ).toBe(true);
  });

  it("rejects refunded / disputed / reversed funds on submit", () => {
    expect(
      assertTrustedPayoutBookingContext(
        baseContext({ hasRefund: true }),
        "submit"
      )
    ).toMatchObject({ ok: false, code: "refunded_or_disputed" });
    expect(
      assertTrustedPayoutBookingContext(
        baseContext({ hasDisputedOrReversedFunds: true }),
        "submit"
      )
    ).toMatchObject({ ok: false, code: "refunded_or_disputed" });
    expect(
      assertTrustedPayoutBookingContext(
        baseContext({ settlementState: "REVERSED_OR_BLOCKED" }),
        "submit"
      )
    ).toMatchObject({ ok: false, code: "refunded_or_disputed" });
  });

  it("rejects currency mismatch assertion", () => {
    expect(
      assertTrustedPayoutBookingContext(baseContext(), "submit", "eur")
    ).toMatchObject({ ok: false, code: "currency_mismatch" });
    expect(
      assertTrustedPayoutBookingContext(baseContext(), "submit", "USD").ok
    ).toBe(true);
  });
});

describe("Payout booking ops helpers — submit / fail / confirm", () => {
  it("valid submit transitions to in-transit using trusted money", async () => {
    const rpc = vi.fn(async (name: string, args?: Record<string, unknown>) => {
      expect(name).toBe(STORE_PAYOUT_RPC);
      expect(args).toMatchObject({
        p_action: "submit",
        p_event_key: IDEM_SUBMIT,
        p_correlation_id: CORR,
        p_payment_attempt_id: ATTEMPT,
        p_amount_minor: 5000,
        p_currency: "USD",
      });
      expect(args?.p_metadata).toMatchObject({
        note: PAYOUT_BOOKING_OPS_HELPERS_ID,
      });
      return {
        data: {
          replayed: false,
          action: "submit",
          payout_state: "IN_TRANSIT",
          event_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          event_key: IDEM_SUBMIT,
          amount_minor: 5000,
          currency: "USD",
        },
        error: null,
      };
    });

    const result = await submitPayoutBooking(
      { rpc } as never,
      {
        storeId: STORE,
        paymentAttemptId: ATTEMPT,
        idempotencyKey: IDEM_SUBMIT,
      },
      {
        loadContext: async () => ({
          ok: true,
          context: baseContext(),
        }),
      }
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.action).toBe("submit");
      expect(result.payoutState).toBe("IN_TRANSIT");
      expect(result.replayed).toBe(false);
      expect(result.amountMinor).toBe(5000);
      expect(result.reconciliation.payoutState).toBe("IN_TRANSIT");
      expect(result.reconciliation.highestSeverity).toBe("ok");
    }
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("submit rejects non-released funds before RPC", async () => {
    const rpc = vi.fn();
    const result = await submitPayoutBooking(
      { rpc } as never,
      {
        storeId: STORE,
        paymentAttemptId: ATTEMPT,
        idempotencyKey: IDEM_SUBMIT,
      },
      {
        loadContext: async () => ({
          ok: true,
          context: baseContext({ settlementState: "NOT_RELEASED" }),
        }),
      }
    );
    expect(result).toMatchObject({ ok: false, code: "not_released" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("submit rejects refunded funds before RPC", async () => {
    const rpc = vi.fn();
    const result = await submitPayoutBooking(
      { rpc } as never,
      {
        storeId: STORE,
        paymentAttemptId: ATTEMPT,
        idempotencyKey: IDEM_SUBMIT,
      },
      {
        loadContext: async () => ({
          ok: true,
          context: baseContext({ hasRefund: true }),
        }),
      }
    );
    expect(result).toMatchObject({ ok: false, code: "refunded_or_disputed" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("submit rejects currency mismatch before RPC", async () => {
    const rpc = vi.fn();
    const result = await submitPayoutBooking(
      { rpc } as never,
      {
        storeId: STORE,
        paymentAttemptId: ATTEMPT,
        idempotencyKey: IDEM_SUBMIT,
        expectedCurrency: "ZAR",
      },
      {
        loadContext: async () => ({
          ok: true,
          context: baseContext({ currency: "USD" }),
        }),
      }
    );
    expect(result).toMatchObject({ ok: false, code: "currency_mismatch" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("duplicate idempotency key returns original submit safely", async () => {
    const rpc = vi.fn(async () => ({
      data: {
        replayed: true,
        action: "submit",
        payout_state: "IN_TRANSIT",
        event_key: IDEM_SUBMIT,
        event_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      },
      error: null,
    }));
    const result = await submitPayoutBooking(
      { rpc } as never,
      {
        storeId: STORE,
        paymentAttemptId: ATTEMPT,
        idempotencyKey: IDEM_SUBMIT,
      },
      {
        loadContext: async () => ({
          ok: true,
          // Replay path: context may already show IN_TRANSIT from prior submit;
          // foundation returns replay before state-machine reject. Helper still
          // gates on NONE for *new* submits — for pure replay tests, load NONE
          // and let RPC report replayed.
          context: baseContext(),
        }),
      }
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.replayed).toBe(true);
      expect(result.payoutState).toBe("IN_TRANSIT");
    }
  });

  it("concurrent submit surfaces conflict without inventing a second booking", async () => {
    const rpc = vi.fn(async () => ({
      data: null,
      error: {
        message:
          "concurrent or double submit for capture 55555555-5555-4555-8555-555555555555: active in-transit payout already exists",
      },
    }));
    const result = await submitPayoutBooking(
      { rpc } as never,
      {
        storeId: STORE,
        paymentAttemptId: ATTEMPT,
        idempotencyKey: "payout-submit-idem-key-0002",
      },
      {
        loadContext: async () => ({
          ok: true,
          context: baseContext(),
        }),
      }
    );
    expect(result).toMatchObject({ ok: false, code: "concurrent_conflict" });
  });

  it("valid fail releases reservation exactly once", async () => {
    const rpc = vi.fn(async (name: string, args?: Record<string, unknown>) => {
      expect(name).toBe(STORE_PAYOUT_RPC);
      expect(args?.p_action).toBe("fail");
      return {
        data: {
          replayed: false,
          action: "fail",
          payout_state: "NONE",
          event_key: IDEM_FAIL,
          event_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        },
        error: null,
      };
    });
    const result = await failPayoutBooking(
      { rpc } as never,
      {
        storeId: STORE,
        paymentAttemptId: ATTEMPT,
        idempotencyKey: IDEM_FAIL,
      },
      {
        loadContext: async () => ({
          ok: true,
          context: baseContext({
            payoutState: "IN_TRANSIT",
            submitCount: 1,
          }),
        }),
      }
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.action).toBe("fail");
      expect(result.payoutState).toBe("NONE");
      expect(result.replayed).toBe(false);
      expect(result.reconciliation.payoutState).toBe("NONE");
    }
  });

  it("duplicate fail is idempotent (replayed)", async () => {
    const rpc = vi.fn(async () => ({
      data: {
        replayed: true,
        action: "fail",
        payout_state: "NONE",
        event_key: IDEM_FAIL,
      },
      error: null,
    }));
    const result = await failPayoutBooking(
      { rpc } as never,
      {
        storeId: STORE,
        paymentAttemptId: ATTEMPT,
        idempotencyKey: IDEM_FAIL,
      },
      {
        loadContext: async () => ({
          ok: true,
          context: baseContext({
            payoutState: "IN_TRANSIT",
            submitCount: 1,
          }),
        }),
      }
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.replayed).toBe(true);
  });

  it("valid confirm completes exactly once", async () => {
    const rpc = vi.fn(async (name: string, args?: Record<string, unknown>) => {
      expect(args?.p_action).toBe("confirm");
      return {
        data: {
          replayed: false,
          action: "confirm",
          payout_state: "COMPLETED",
          event_key: IDEM_CONFIRM,
          event_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        },
        error: null,
      };
    });
    const result = await confirmPayoutBooking(
      { rpc } as never,
      {
        storeId: STORE,
        paymentAttemptId: ATTEMPT,
        idempotencyKey: IDEM_CONFIRM,
      },
      {
        loadContext: async () => ({
          ok: true,
          context: baseContext({
            payoutState: "IN_TRANSIT",
            submitCount: 1,
          }),
        }),
      }
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payoutState).toBe("COMPLETED");
      expect(result.reconciliation.payoutState).toBe("COMPLETED");
      expect(result.reconciliation.highestSeverity).toBe("ok");
    }
  });

  it("duplicate confirm cannot double-complete (replayed once)", async () => {
    const rpc = vi.fn(async () => ({
      data: {
        replayed: true,
        action: "confirm",
        payout_state: "COMPLETED",
        event_key: IDEM_CONFIRM,
      },
      error: null,
    }));
    const result = await confirmPayoutBooking(
      { rpc } as never,
      {
        storeId: STORE,
        paymentAttemptId: ATTEMPT,
        idempotencyKey: IDEM_CONFIRM,
      },
      {
        loadContext: async () => ({
          ok: true,
          context: baseContext({
            payoutState: "IN_TRANSIT",
            submitCount: 1,
          }),
        }),
      }
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.replayed).toBe(true);
      expect(result.payoutState).toBe("COMPLETED");
    }
  });

  it("fail after confirm is rejected by foundation", async () => {
    const rpc = vi.fn(async () => ({
      data: null,
      error: {
        message:
          "payout action fail not allowed: capture is COMPLETED (terminal in V1)",
      },
    }));
    const result = await failPayoutBooking(
      { rpc } as never,
      {
        storeId: STORE,
        paymentAttemptId: ATTEMPT,
        idempotencyKey: "payout-fail-after-confirm-0001",
      },
      {
        loadContext: async () => ({
          ok: true,
          context: baseContext({
            payoutState: "COMPLETED",
            submitCount: 1,
            confirmCount: 1,
          }),
        }),
      }
    );
    expect(result).toMatchObject({ ok: false, code: "terminal_completed" });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("confirm after fail is rejected by foundation (stale NONE)", async () => {
    const rpc = vi.fn(async () => ({
      data: null,
      error: {
        message:
          "payout action confirm not allowed in state NONE for capture 55555555-5555-4555-8555-555555555555",
      },
    }));
    const result = await confirmPayoutBooking(
      { rpc } as never,
      {
        storeId: STORE,
        paymentAttemptId: ATTEMPT,
        idempotencyKey: "payout-confirm-after-fail-0001",
      },
      {
        loadContext: async () => ({
          ok: true,
          context: baseContext({
            payoutState: "NONE",
            submitCount: 1,
            failCount: 1,
          }),
        }),
      }
    );
    expect(result).toMatchObject({ ok: false, code: "stale_state" });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("another store/seller is rejected", async () => {
    const rpc = vi.fn();
    const result = await submitPayoutBooking(
      { rpc } as never,
      {
        storeId: OTHER,
        paymentAttemptId: ATTEMPT,
        idempotencyKey: IDEM_SUBMIT,
      },
      {
        loadContext: async () => ({
          ok: false,
          code: "unauthorized_store",
          message: "Payment attempt does not belong to the requested store.",
        }),
      }
    );
    expect(result).toMatchObject({ ok: false, code: "unauthorized_store" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("malformed identifiers fail closed", async () => {
    const rpc = vi.fn();
    const result = await submitPayoutBooking(
      { rpc } as never,
      {
        storeId: "not-a-uuid",
        paymentAttemptId: ATTEMPT,
        idempotencyKey: IDEM_SUBMIT,
      }
    );
    expect(result).toMatchObject({ ok: false, code: "malformed_id" });
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("Payout booking ops helpers — reconciliation reflection", () => {
  it("recon reflects submit / fail / confirm lifecycle correctly", () => {
    const afterSubmit = reconcileSettlementPayoutCapture({
      orderId: ORDER,
      paymentAttemptId: ATTEMPT,
      captureEventId: CAPTURE,
      amountMinor: 5000,
      currency: "USD",
      settlementState: "RELEASED",
      payoutState: "IN_TRANSIT",
      submitCount: 1,
      failCount: 0,
      confirmCount: 0,
      hasRefund: false,
      captureCreatedAt: "2026-07-31T00:00:00.000Z",
    });
    expect(afterSubmit.highestSeverity).toBe("ok");
    expect(afterSubmit.issues.some((i) => i.code === "aligned")).toBe(true);

    const afterFail = reconcileSettlementPayoutCapture({
      orderId: ORDER,
      paymentAttemptId: ATTEMPT,
      captureEventId: CAPTURE,
      amountMinor: 5000,
      currency: "USD",
      settlementState: "RELEASED",
      payoutState: "NONE",
      submitCount: 1,
      failCount: 1,
      confirmCount: 0,
      hasRefund: false,
      captureCreatedAt: "2026-07-31T00:00:00.000Z",
    });
    expect(afterFail.highestSeverity).toBe("ok");
    expect(afterFail.issues.some((i) => i.code === "aligned")).toBe(true);

    const neverBooked = reconcileSettlementPayoutCapture({
      orderId: ORDER,
      paymentAttemptId: ATTEMPT,
      captureEventId: CAPTURE,
      amountMinor: 5000,
      currency: "USD",
      settlementState: "RELEASED",
      payoutState: "NONE",
      submitCount: 0,
      failCount: 0,
      confirmCount: 0,
      hasRefund: false,
      captureCreatedAt: "2026-07-31T00:00:00.000Z",
    });
    expect(
      neverBooked.issues.some((i) => i.code === "released_without_payout_booking")
    ).toBe(true);

    const afterConfirm = reconcileSettlementPayoutCapture({
      orderId: ORDER,
      paymentAttemptId: ATTEMPT,
      captureEventId: CAPTURE,
      amountMinor: 5000,
      currency: "USD",
      settlementState: "RELEASED",
      payoutState: "COMPLETED",
      submitCount: 1,
      failCount: 0,
      confirmCount: 1,
      hasRefund: false,
      captureCreatedAt: "2026-07-31T00:00:00.000Z",
    });
    expect(afterConfirm.highestSeverity).toBe("ok");
    expect(afterConfirm.issues.some((i) => i.code === "aligned")).toBe(true);

    const doubleConfirm = reconcileSettlementPayoutCapture({
      orderId: ORDER,
      paymentAttemptId: ATTEMPT,
      captureEventId: CAPTURE,
      amountMinor: 5000,
      currency: "USD",
      settlementState: "RELEASED",
      payoutState: "COMPLETED",
      submitCount: 1,
      failCount: 0,
      confirmCount: 2,
      hasRefund: false,
      captureCreatedAt: "2026-07-31T00:00:00.000Z",
    });
    expect(doubleConfirm.highestSeverity).toBe("error");
    expect(
      doubleConfirm.issues.some((i) => i.code === "duplicate_payout_booking")
    ).toBe(true);
  });
});

describe("Payout booking ops helpers — foundation concurrency invariants", () => {
  it("foundation SQL still enforces single active in-transit + advisory locks", () => {
    const sql = read(
      "supabase/migrations/20260881_store_seller_payout_foundation_v1.sql"
    );
    expect(sql).toMatch(/store_payout_active_in_transit/);
    expect(sql).toMatch(/concurrent or double submit/);
    expect(sql).toMatch(/store_payo_capture:/);
    expect(sql).toMatch(/idempotency conflict: event_key/);
    expect(sql).toMatch(
      /grant execute on function public\.apply_store_payout_event\([\s\S]*?\) to service_role/i
    );
    expect(sql).toMatch(
      /revoke all on function public\.apply_store_payout_event\([\s\S]*?\) from public, anon, authenticated/i
    );
  });
});
