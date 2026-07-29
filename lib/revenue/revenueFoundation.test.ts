/**
 * Unified Revenue Platform Foundation V1 — tests.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  REVENUE_CONSUMER_IDS,
  REVENUE_EVENT_TYPES,
  REVENUE_SOURCE_IDS,
  RevenueLedger,
  RevenuePlatformError,
  RevenuePlatformFoundation,
  assertMinorAmount,
  deterministicRevenueId,
  isRevenueUuid,
  resetRevenuePlatformFoundation,
  revenueConsumerRegistry,
  revenueSourceRegistry,
  validateRevenueEvent,
} from "./index";

const USER = "11111111-1111-4111-8111-111111111111";
const PLATFORM = "22222222-2222-4222-8222-222222222222";

describe("Unified Revenue Platform Foundation V1", () => {
  beforeEach(() => {
    resetRevenuePlatformFoundation();
  });

  it("registers all revenue sources and consumers", () => {
    expect(revenueSourceRegistry.list().map((s) => s.sourceId)).toEqual([
      ...REVENUE_SOURCE_IDS,
    ]);
    expect(revenueConsumerRegistry.list().map((c) => c.consumerId)).toEqual([
      ...REVENUE_CONSUMER_IDS,
    ]);
    expect(() => revenueSourceRegistry.require("future")).toThrow(
      RevenuePlatformError
    );
  });

  it("validates money as integer minor units (fail-closed)", () => {
    expect(assertMinorAmount(100)).toBe(100);
    expect(() => assertMinorAmount(1.5)).toThrow(RevenuePlatformError);
    expect(() => assertMinorAmount(-1)).toThrow(RevenuePlatformError);
    expect(() => assertMinorAmount(Number.NaN)).toThrow(RevenuePlatformError);
  });

  it("produces deterministic UUID-shaped ids", () => {
    const a = deterministicRevenueId("wallet", "user:A:USD");
    const b = deterministicRevenueId("wallet", "user:A:USD");
    const c = deterministicRevenueId("wallet", "user:B:USD");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(isRevenueUuid(a)).toBe(true);
  });

  it("validates revenue events and rejects provider leakage metadata", () => {
    const event = validateRevenueEvent({
      eventType: "payment_received",
      sourceId: "commerce",
      transactionId: null,
      walletId: null,
      money: { currency: "USD", amountMinor: 2500 },
      metadata: { orderId: "o1" },
    });
    expect(REVENUE_EVENT_TYPES).toContain(event.eventType);
    expect(isRevenueUuid(event.eventId)).toBe(true);

    expect(() =>
      validateRevenueEvent({
        eventType: "wallet_credit",
        sourceId: "tips",
        transactionId: null,
        walletId: null,
        money: { currency: "USD", amountMinor: 1 },
        metadata: { apiKey: "sk-secret" },
      })
    ).toThrow(/Forbidden metadata/i);

    expect(() =>
      validateRevenueEvent({
        eventType: "not_a_real_event" as never,
        sourceId: "commerce",
        transactionId: null,
        walletId: null,
        money: null,
        metadata: {},
      })
    ).toThrow(RevenuePlatformError);
  });

  it("creates wallets and forbids direct balance mutation", () => {
    const foundation = new RevenuePlatformFoundation();
    const wallet = foundation.wallets.create({
      ownerConsumerId: "creator",
      ownerSubjectId: USER,
      currency: "USD",
      consumers: foundation.consumers,
    });
    expect(wallet.availableMinor).toBe(0);
    expect(() => foundation.wallets.mutateBalanceDirectly()).toThrow(
      /Direct wallet balance mutation/i
    );
  });

  it("posts balanced ledger entries immutably and rejects unbalanced posts", () => {
    const ledger = new RevenueLedger();
    const txId = deterministicRevenueId("tx", "demo-1");

    const posted = ledger.post({
      transactionId: txId,
      lines: [
        {
          accountId: "platform:liability",
          side: "debit",
          amountMinor: 1000,
          currency: "USD",
        },
        {
          accountId: `wallet:${USER}:available`,
          side: "credit",
          amountMinor: 1000,
          currency: "USD",
        },
      ],
    });
    expect(posted).toHaveLength(2);
    expect(ledger.balanceForAccount(`wallet:${USER}:available`, "USD")).toBe(
      1000
    );
    expect(() => ledger.rewriteEntry()).toThrow(/immutable/i);
    expect(() => ledger.deleteEntry()).toThrow(/immutable/i);

    expect(() =>
      ledger.post({
        transactionId: deterministicRevenueId("tx", "unbalanced"),
        lines: [
          {
            accountId: "a",
            side: "debit",
            amountMinor: 5,
            currency: "USD",
          },
          {
            accountId: "b",
            side: "credit",
            amountMinor: 4,
            currency: "USD",
          },
        ],
      })
    ).toThrow(/Unbalanced/i);
  });

  it("posts transactions only through ledger (no direct wallet credit)", () => {
    const foundation = new RevenuePlatformFoundation();
    const wallet = foundation.wallets.create({
      ownerConsumerId: "creator",
      ownerSubjectId: USER,
      currency: "USD",
      consumers: foundation.consumers,
      walletId: deterministicRevenueId("wallet", `creator:${USER}:USD`),
    });

    const tx = foundation.transactions.propose({
      kind: "earning",
      sourceId: "tips",
      money: { currency: "USD", amountMinor: 500 },
      fromConsumerId: "platform",
      fromSubjectId: PLATFORM,
      toConsumerId: "creator",
      toSubjectId: USER,
      transactionId: deterministicRevenueId("tx", "tip-1"),
    });
    expect(tx.status).toBe("proposed");

    const posted = foundation.transactions.post({
      transactionId: tx.transactionId,
      ledger: foundation.ledger,
      lines: [
        {
          accountId: "platform:liability",
          side: "debit",
          amountMinor: 500,
          currency: "USD",
        },
        {
          accountId: `${wallet.walletId}:available`,
          side: "credit",
          amountMinor: 500,
          currency: "USD",
        },
      ],
    });
    expect(posted.status).toBe("posted");
    expect(posted.postedAt).toBeTruthy();

    const available = foundation.ledger.balanceForAccount(
      `${wallet.walletId}:available`,
      "USD"
    );
    foundation.wallets.applyDerivedBalances(wallet.walletId, available, 0);
    expect(foundation.wallets.require(wallet.walletId).availableMinor).toBe(500);

    const creditEvent = foundation.validateEvent({
      eventType: "wallet_credit",
      sourceId: "tips",
      transactionId: tx.transactionId,
      walletId: wallet.walletId,
      money: { currency: "USD", amountMinor: 500 },
      metadata: {},
    });
    expect(creditEvent.eventType).toBe("wallet_credit");
  });

  it("provider and billing hooks are noop in V1", () => {
    const foundation = new RevenuePlatformFoundation();
    const hooks = foundation.extensionHooks();
    expect(hooks.providers.stripe?.({})).toBeNull();
    expect(hooks.providers.paypal?.({})).toBeNull();
    expect(hooks.providers.apple?.({})).toBeNull();
    expect(hooks.providers.google?.({})).toBeNull();
    expect(hooks.providers.crypto?.({})).toBeNull();
    expect(hooks.providers.bankTransfer?.({})).toBeNull();
    expect(hooks.billing.onInvoiceDraft?.({})).toBeNull();
  });
});
