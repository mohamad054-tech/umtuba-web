/**
 * Partial refund reservation actions & trusted loader tests (mocks only).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { MemoryPartialRefundLedgerRepository } from "../partialRefundLedger";
import {
  PARTIAL_REFUND_RESERVATION_ACTIONS_ID,
  deriveReservationIdempotencyKey,
  listPartialRefundReservationsForCapture,
  loadTrustedPartialRefundReservationFacts,
  partialRefundReservationActionsOwnership,
  requestPartialRefundReservation,
} from "./index";

const ROOT = join(__dirname, "../../..");

const IDS = {
  store: "11111111-1111-4111-8111-111111111111",
  storeB: "aaaaaaaa-1111-4111-8111-111111111111",
  order: "22222222-2222-4222-8222-222222222222",
  attempt: "33333333-3333-4333-8333-333333333333",
  capture: "44444444-4444-4444-8444-444444444444",
  item: "55555555-5555-4555-8555-555555555555",
  item2: "55555555-5555-4555-8555-555555555556",
  ledger: "66666666-6666-4666-8666-666666666666",
};

type TableRow = Record<string, unknown>;

function makeFactClient(tables: {
  payment_attempts?: TableRow[];
  orders?: TableRow[];
  store_payment_outcome_events?: TableRow[];
  order_items?: TableRow[];
}) {
  return {
    from(table: string) {
      const rows = (tables as Record<string, TableRow[]>)[table] ?? [];
      let filtered = [...rows];
      const api: {
        select: () => typeof api;
        eq: (col: string, val: unknown) => typeof api;
        order: () => typeof api;
        maybeSingle: () => Promise<{ data: TableRow | null; error: null }>;
        then: (
          resolve: (v: { data: TableRow[]; error: null }) => unknown,
          reject?: (e: unknown) => unknown
        ) => Promise<unknown>;
      } = {
        select() {
          return api;
        },
        eq(col: string, val: unknown) {
          filtered = filtered.filter((r) => String(r[col]) === String(val));
          return api;
        },
        order() {
          return api;
        },
        async maybeSingle() {
          return { data: filtered[0] ?? null, error: null };
        },
        then(resolve, reject) {
          return Promise.resolve({ data: filtered, error: null }).then(
            resolve,
            reject
          );
        },
      };
      return api;
    },
  };
}

function seedHappyTables(overrides?: {
  storeId?: string;
  itemQty?: number;
  unitPrice?: number;
  captureAmount?: number;
  hasRefund?: boolean;
}) {
  const storeId = overrides?.storeId ?? IDS.store;
  const qty = overrides?.itemQty ?? 4;
  const unit = overrides?.unitPrice ?? 500;
  const amount = overrides?.captureAmount ?? unit * qty;
  const outcomes: TableRow[] = [
    {
      id: IDS.capture,
      payment_attempt_id: IDS.attempt,
      amount_minor: amount,
      currency: "USD",
      outcome: "captured",
      created_at: "2026-01-01T00:00:00.000Z",
    },
  ];
  if (overrides?.hasRefund) {
    outcomes.push({
      id: "99999999-9999-4999-8999-999999999999",
      payment_attempt_id: IDS.attempt,
      amount_minor: amount,
      currency: "USD",
      outcome: "refunded",
      created_at: "2026-01-02T00:00:00.000Z",
    });
  }
  return {
    payment_attempts: [
      {
        id: IDS.attempt,
        order_id: IDS.order,
        amount_minor: amount,
        currency: "USD",
        status: "succeeded",
      },
    ],
    orders: [
      {
        id: IDS.order,
        store_id: storeId,
        currency: "USD",
        grand_total_minor: amount,
        payment_status: "paid",
        status: "confirmed",
      },
    ],
    store_payment_outcome_events: outcomes,
    order_items: [
      {
        id: IDS.item,
        order_id: IDS.order,
        quantity: qty,
        unit_price_minor: unit,
        total_price_minor: unit * qty,
        title_snapshot: "Widget",
      },
    ],
  };
}

describe("partialRefundReservation trusted fact loader", () => {
  it("loads trusted capture and line facts server-side", async () => {
    const client = makeFactClient(seedHappyTables());
    const loaded = await loadTrustedPartialRefundReservationFacts(
      client as never,
      { storeId: IDS.store, paymentAttemptId: IDS.attempt }
    );
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.capture.captureEventId).toBe(IDS.capture);
    expect(loaded.capture.captureAmountMinor).toBe(2000);
    expect(loaded.lines[0]?.unitPriceMinor).toBe(500);
    expect(loaded.selectableLines[0]?.purchasedQuantity).toBe(4);
  });

  it("rejects client money fields", async () => {
    const client = makeFactClient(seedHappyTables());
    const loaded = await loadTrustedPartialRefundReservationFacts(
      client as never,
      {
        storeId: IDS.store,
        paymentAttemptId: IDS.attempt,
        clientBag: { amountMinor: 100, currency: "USD" },
      }
    );
    expect(loaded.ok).toBe(false);
    if (loaded.ok) return;
    expect(loaded.code).toBe("client_money_rejected");
  });

  it("rejects cross-store access", async () => {
    const client = makeFactClient(seedHappyTables());
    const loaded = await loadTrustedPartialRefundReservationFacts(
      client as never,
      { storeId: IDS.storeB, paymentAttemptId: IDS.attempt }
    );
    expect(loaded.ok).toBe(false);
    if (loaded.ok) return;
    expect(loaded.code).toBe("unauthorized");
  });

  it("rejects unknown payment attempt", async () => {
    const client = makeFactClient(seedHappyTables());
    const loaded = await loadTrustedPartialRefundReservationFacts(
      client as never,
      {
        storeId: IDS.store,
        paymentAttemptId: "33333333-3333-4333-8333-333333333399",
      }
    );
    expect(loaded.ok).toBe(false);
    if (loaded.ok) return;
    expect(loaded.code).toBe("not_found");
  });

  it("rejects unknown line in intent", async () => {
    const client = makeFactClient(seedHappyTables());
    const loaded = await loadTrustedPartialRefundReservationFacts(
      client as never,
      {
        storeId: IDS.store,
        paymentAttemptId: IDS.attempt,
        intent: [
          {
            orderItemId: IDS.item2,
            requestedQuantity: 1,
          },
        ],
      }
    );
    expect(loaded.ok).toBe(false);
    if (loaded.ok) return;
    expect(loaded.code).toBe("not_found");
  });

  it("rejects zero and excessive quantities", async () => {
    const client = makeFactClient(seedHappyTables());
    const zero = await loadTrustedPartialRefundReservationFacts(
      client as never,
      {
        storeId: IDS.store,
        paymentAttemptId: IDS.attempt,
        intent: [{ orderItemId: IDS.item, requestedQuantity: 0 }],
      }
    );
    expect(zero.ok).toBe(false);
    const over = await loadTrustedPartialRefundReservationFacts(
      client as never,
      {
        storeId: IDS.store,
        paymentAttemptId: IDS.attempt,
        intent: [{ orderItemId: IDS.item, requestedQuantity: 99 }],
      }
    );
    expect(over.ok).toBe(false);
  });

  it("rejects fully refunded capture as unsupported", async () => {
    const client = makeFactClient(seedHappyTables({ hasRefund: true }));
    const loaded = await loadTrustedPartialRefundReservationFacts(
      client as never,
      { storeId: IDS.store, paymentAttemptId: IDS.attempt }
    );
    expect(loaded.ok).toBe(false);
    if (loaded.ok) return;
    expect(loaded.code).toBe("unsupported");
  });
});

describe("partialRefundReservation actions core", () => {
  it("commits reservation-only with explicit non-event flags", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    const client = makeFactClient(seedHappyTables());
    const result = await requestPartialRefundReservation(
      {
        factClient: client as never,
        repository: repo,
        newLedgerId: () => IDS.ledger,
      },
      {
        storeId: IDS.store,
        paymentAttemptId: IDS.attempt,
        intent: [{ orderItemId: IDS.item, requestedQuantity: 1 }],
      }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe("reservation_committed");
    expect(result.reservationCommitted).toBe(true);
    expect(result.providerRefundExecuted).toBe(false);
    expect(result.moneyMoved).toBe(false);
    expect(result.stockRestocked).toBe(false);
    expect(result.entitlementAdjusted).toBe(false);
    expect(result.settlementUnwound).toBe(false);
    expect(result.commissionUnwound).toBe(false);
    expect(result.compensationCompleted).toBe(false);
    expect(result.reservation.reservedAmountMinor).toBe(500);
    expect(result.capability).toBe(PARTIAL_REFUND_RESERVATION_ACTIONS_ID);
  });

  it("maps orchestrator replay to reservation_replayed", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    const client = makeFactClient(seedHappyTables());
    const commit = {
      ledgerId: IDS.ledger,
      storeId: IDS.store,
      orderId: IDS.order,
      paymentAttemptId: IDS.attempt,
      captureEventId: IDS.capture,
      currency: "USD",
      refundAmountMinor: 500,
      captureAmountMinor: 2000,
      calculationFingerprint: "fp",
      idempotencyKey: "idem-replay-xx",
      status: "committed" as const,
      lines: [
        {
          orderItemId: IDS.item,
          requestedQuantity: 1,
          refundAmountMinor: 500,
        },
      ],
      accountingVersion: 1,
      attemptCount: 1,
      failureCode: null,
      failureMessageSafe: null,
      createdAtIso: "2026-01-01T00:00:00.000Z",
      updatedAtIso: "2026-01-01T00:00:00.000Z",
    };
    const reserve = vi.fn(async () => ({
      ok: true as const,
      capability: "commerce.payments.partial_refund_ledger_service_adapter_v1",
      version: "commerce-partial-refund-ledger-service-adapter-v1",
      ownership: {} as never,
      reservationCommitted: true as const,
      commit,
      calculationFingerprint: "fp",
      refundAmountMinor: 500,
      replayedPlan: true,
      providerRefundExecuted: false as const,
      moneyMoved: false as const,
      stockRestocked: false as const,
      entitlementAdjusted: false as const,
      settlementUnwound: false as const,
      commissionUnwound: false as const,
      compensationCompleted: false as const,
      downstreamUnwind: "pending_unsupported" as const,
    }));
    const result = await requestPartialRefundReservation(
      {
        factClient: client as never,
        repository: repo,
        reserve: reserve as never,
        newLedgerId: () => IDS.ledger,
      },
      {
        storeId: IDS.store,
        paymentAttemptId: IDS.attempt,
        intent: [{ orderItemId: IDS.item, requestedQuantity: 1 }],
      }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe("reservation_replayed");
    expect(result.reservation.ledgerId).toBe(IDS.ledger);
    expect(result.moneyMoved).toBe(false);
  });

  it("fails closed on conflicting idempotency key", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    const client = makeFactClient(seedHappyTables());
    const first = await requestPartialRefundReservation(
      {
        factClient: client as never,
        repository: repo,
        newLedgerId: () => IDS.ledger,
      },
      {
        storeId: IDS.store,
        paymentAttemptId: IDS.attempt,
        intent: [{ orderItemId: IDS.item, requestedQuantity: 1 }],
        idempotencyKey: "same-key-abcdefgh",
      }
    );
    expect(first.ok).toBe(true);
    const conflict = await requestPartialRefundReservation(
      {
        factClient: client as never,
        repository: repo,
        newLedgerId: () => "77777777-7777-4777-8777-777777777777",
      },
      {
        storeId: IDS.store,
        paymentAttemptId: IDS.attempt,
        intent: [{ orderItemId: IDS.item, requestedQuantity: 2 }],
        idempotencyKey: "same-key-abcdefgh",
      }
    );
    expect(conflict.ok).toBe(false);
    if (conflict.ok) return;
    expect(conflict.status).toBe("idempotency_conflict");
    expect(conflict.reservationCommitted).toBe(false);
    expect(conflict.moneyMoved).toBe(false);
  });

  it("maps stale_version from orchestrator", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    const client = makeFactClient(seedHappyTables());
    const reserve = vi.fn(async () => ({
      ok: false as const,
      capability: "commerce.payments.partial_refund_ledger_service_adapter_v1",
      version: "commerce-partial-refund-ledger-service-adapter-v1",
      ownership: {} as never,
      reservationCommitted: false as const,
      code: "stale_version",
      message: "Capture accounting version changed.",
      providerRefundExecuted: false as const,
      moneyMoved: false as const,
      stockRestocked: false as const,
      entitlementAdjusted: false as const,
      settlementUnwound: false as const,
      commissionUnwound: false as const,
      compensationCompleted: false as const,
      downstreamUnwind: "pending_unsupported" as const,
    }));
    const result = await requestPartialRefundReservation(
      {
        factClient: client as never,
        repository: repo,
        reserve: reserve as never,
        newLedgerId: () => IDS.ledger,
      },
      {
        storeId: IDS.store,
        paymentAttemptId: IDS.attempt,
        intent: [{ orderItemId: IDS.item, requestedQuantity: 1 }],
      }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe("stale_version");
    expect(result.providerRefundExecuted).toBe(false);
  });

  it("rejects client money on request bag", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    const client = makeFactClient(seedHappyTables());
    const result = await requestPartialRefundReservation(
      { factClient: client as never, repository: repo },
      {
        storeId: IDS.store,
        paymentAttemptId: IDS.attempt,
        intent: [{ orderItemId: IDS.item, requestedQuantity: 1 }],
        clientBag: { unitPriceMinor: 1, refundAmountMinor: 99 },
      }
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe("validation_failed");
  });

  it("never calls applyFullOrderRefund or provider APIs", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    const client = makeFactClient(seedHappyTables());
    const reserve = vi.fn(async () => ({
      ok: true as const,
      capability: "commerce.payments.partial_refund_ledger_service_adapter_v1",
      version: "commerce-partial-refund-ledger-service-adapter-v1",
      ownership: {} as never,
      reservationCommitted: true as const,
      commit: {
        ledgerId: IDS.ledger,
        storeId: IDS.store,
        orderId: IDS.order,
        paymentAttemptId: IDS.attempt,
        captureEventId: IDS.capture,
        currency: "USD",
        refundAmountMinor: 500,
        captureAmountMinor: 2000,
        calculationFingerprint: "fp",
        idempotencyKey: "idem-key-xx",
        status: "committed" as const,
        lines: [
          {
            orderItemId: IDS.item,
            requestedQuantity: 1,
            refundAmountMinor: 500,
          },
        ],
        accountingVersion: 1,
        attemptCount: 1,
        failureCode: null,
        failureMessageSafe: null,
        createdAtIso: "2026-01-01T00:00:00.000Z",
        updatedAtIso: "2026-01-01T00:00:00.000Z",
      },
      calculationFingerprint: "fp",
      refundAmountMinor: 500,
      replayedPlan: false,
      providerRefundExecuted: false as const,
      moneyMoved: false as const,
      stockRestocked: false as const,
      entitlementAdjusted: false as const,
      settlementUnwound: false as const,
      commissionUnwound: false as const,
      compensationCompleted: false as const,
      downstreamUnwind: "pending_unsupported" as const,
    }));

    await requestPartialRefundReservation(
      {
        factClient: client as never,
        repository: repo,
        reserve: reserve as never,
        newLedgerId: () => IDS.ledger,
      },
      {
        storeId: IDS.store,
        paymentAttemptId: IDS.attempt,
        intent: [{ orderItemId: IDS.item, requestedQuantity: 1 }],
      }
    );
    expect(reserve).toHaveBeenCalledTimes(1);
    const actionsSrc = readFileSync(
      join(ROOT, "app/actions/storePartialRefundReservation.ts"),
      "utf8"
    );
    expect(actionsSrc).not.toMatch(/import[\s\S]*applyFullOrderRefund/);
    expect(actionsSrc).not.toMatch(/\bapplyFullOrderRefund\s*\(/);
    expect(actionsSrc).not.toMatch(/from ["']stripe["']/i);
    expect(actionsSrc).not.toMatch(/executeRefundOperationRequest/);
  });

  it("lists reservations scoped to store", async () => {
    const repo = new MemoryPartialRefundLedgerRepository();
    const client = makeFactClient(seedHappyTables());
    await requestPartialRefundReservation(
      {
        factClient: client as never,
        repository: repo,
        newLedgerId: () => IDS.ledger,
      },
      {
        storeId: IDS.store,
        paymentAttemptId: IDS.attempt,
        intent: [{ orderItemId: IDS.item, requestedQuantity: 1 }],
      }
    );
    const listed = await listPartialRefundReservationsForCapture(repo, {
      captureEventId: IDS.capture,
      expectedStoreId: IDS.store,
    });
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    expect(listed.reservations).toHaveLength(1);
    expect(listed.moneyMoved).toBe(false);

    const cross = await listPartialRefundReservationsForCapture(repo, {
      captureEventId: IDS.capture,
      expectedStoreId: IDS.storeB,
    });
    expect(cross.ok).toBe(false);
    if (cross.ok) return;
    expect(cross.status).toBe("unauthorized");
  });

  it("deriveReservationIdempotencyKey is stable", () => {
    const a = deriveReservationIdempotencyKey(IDS.capture, [
      { orderItemId: IDS.item, requestedQuantity: 2 },
    ]);
    const b = deriveReservationIdempotencyKey(IDS.capture, [
      { orderItemId: IDS.item, requestedQuantity: 2 },
    ]);
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(8);
    expect(a.length).toBeLessThanOrEqual(128);
  });

  it("capability ownership is reservation-only", () => {
    const o = partialRefundReservationActionsOwnership();
    expect(o.ownsAdminReservationAction).toBe(true);
    expect(o.ownsSellerReservationRead).toBe(true);
    expect(o.ownsSellerReservationRequest).toBe(false);
    expect(o.ownsPartialRefundProviderRefundExecution).toBe(false);
    expect(o.ownsPartialRefundMoneyMovement).toBe(false);
    expect(o.ownsFullOrderRefundExecution).toBe(false);
    expect(o.ownsBuyerPublicExecution).toBe(false);
  });
});

describe("partialRefundReservation UI / wiring audits", () => {
  it("admin panel has no authoritative money input and does not claim execution", () => {
    const src = readFileSync(
      join(
        ROOT,
        "app/admin/store/refunds/PartialRefundReservationPanel.tsx"
      ),
      "utf8"
    );
    expect(src).not.toMatch(/name=["']amount/i);
    expect(src).not.toMatch(/name=["']currency/i);
    expect(src).not.toMatch(/name=["']unitPrice/i);
    expect(src).not.toMatch(/Execute Refund|Refund Money|Completed Refund/);
    expect(src).toMatch(/ledger reservation/i);
    expect(src).toMatch(/does not execute a\s+provider refund/i);
  });

  it("seller panel is read-only and has no reservation request action", () => {
    const src = readFileSync(
      join(
        ROOT,
        "app/components/store/SellerPartialRefundReservationPanel.tsx"
      ),
      "utf8"
    );
    expect(src).toMatch(/Read-only/);
    expect(src).not.toMatch(/adminRequestPartialRefundReservationAction/);
    expect(src).not.toMatch(/Create ledger reservation/);
    expect(src).not.toMatch(/name=["']amount/i);

    const actions = readFileSync(
      join(ROOT, "app/actions/storePartialRefundReservation.ts"),
      "utf8"
    );
    expect(actions).not.toMatch(/sellerRequestPartialRefund/);
    expect(actions).toMatch(/sellerListPartialRefundReservations/);
  });

  it("server-only modules do not export service role key material", () => {
    const boot = readFileSync(
      join(
        ROOT,
        "lib/store/partialRefundReservation/serviceRoleBootstrap.ts"
      ),
      "utf8"
    );
    expect(boot).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(boot).toMatch(/assertNotBrowser/);
    expect(boot).not.toMatch(/NEXT_PUBLIC_SUPABASE_SERVICE/);
  });
});
