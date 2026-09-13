/**
 * Append-only Store purchase UM Points event ledger (domain engine).
 *
 * Used by unit tests and the sandbox TEST/DEMO panel. Production persistence
 * is the candidate migration `store_um_points_events`, which posts earns
 * into the existing unified wallet via `award_um_points_to_user`.
 *
 * Security:
 * - points_delta is computed server-side; client-supplied deltas are ignored
 * - callers must present the acting user; cross-user reads/writes are denied
 * - payment confirmation is required for PURCHASE_EARN
 * - idempotency_key is unique — retries never duplicate
 */

import {
  buildAdminAdjustmentIdempotencyKey,
  buildPurchaseIdempotencyKey,
  buildRefundIdempotencyKey,
  computeEligibleProductSpend,
  floorEligibleUsdToPoints,
  isStoreUmPointsEventType,
  pointsFromPaidPurchase,
  pointsFromRefundedEligibleSpend,
  type EligibleSpendInput,
  type StoreUmPointsEventType,
} from "./umPointsPurchaseRewards";

export type StoreUmPointsLedgerEvent = {
  id: string;
  userId: string;
  orderId: string | null;
  paymentReference: string | null;
  eventType: StoreUmPointsEventType;
  pointsDelta: number;
  eligibleSpendOriginal: number;
  originalCurrency: string;
  eligibleSpendUsd: number;
  reason: string;
  createdAt: string;
  idempotencyKey: string;
};

export type StoreUmPointsApplyResult = {
  applied: boolean;
  duplicate: boolean;
  pointsDelta: number;
  balance: number;
  event: StoreUmPointsLedgerEvent | null;
  reason: string;
};

export type StoreUmPointsActorContext = {
  /** Authenticated user performing the read/write. */
  actorUserId: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export class StoreUmPointsPurchaseLedger {
  private readonly events: StoreUmPointsLedgerEvent[] = [];
  private readonly byIdempotency = new Map<string, StoreUmPointsLedgerEvent>();

  getBalance(userId: string): number {
    let total = 0;
    for (const event of this.events) {
      if (event.userId === userId) total += event.pointsDelta;
    }
    return total;
  }

  listForActor(
    ctx: StoreUmPointsActorContext,
    targetUserId: string
  ): StoreUmPointsLedgerEvent[] | { denied: true; reason: "forbidden" } {
    if (!ctx.actorUserId || ctx.actorUserId !== targetUserId) {
      return { denied: true, reason: "forbidden" };
    }
    return this.events
      .filter((event) => event.userId === targetUserId)
      .map((event) => ({ ...event }))
      .reverse();
  }

  summarizeForActor(
    ctx: StoreUmPointsActorContext,
    targetUserId: string
  ):
    | {
        balance: number;
        purchaseEarned: number;
        refundReversed: number;
        recent: StoreUmPointsLedgerEvent[];
      }
    | { denied: true; reason: "forbidden" } {
    const list = this.listForActor(ctx, targetUserId);
    if ("denied" in list) return list;
    let purchaseEarned = 0;
    let refundReversed = 0;
    for (const event of list) {
      if (event.eventType === "PURCHASE_EARN") purchaseEarned += event.pointsDelta;
      if (
        event.eventType === "REFUND_REVERSAL" ||
        event.eventType === "PARTIAL_REFUND_REVERSAL"
      ) {
        refundReversed += Math.abs(event.pointsDelta);
      }
    }
    return {
      balance: this.getBalance(targetUserId),
      purchaseEarned,
      refundReversed,
      recent: list,
    };
  }

  remainingEarnForOrder(userId: string, orderId: string): number {
    let net = 0;
    for (const event of this.events) {
      if (event.userId === userId && event.orderId === orderId) {
        net += event.pointsDelta;
      }
    }
    return net;
  }

  applyPurchaseEarn(input: {
    actorUserId: string;
    userId: string;
    orderId: string;
    paymentReference?: string | null;
    paymentStatus: string | null;
    orderStatus?: string | null;
    spend: EligibleSpendInput;
    /** Ignored. Present only so tests prove clients cannot forge points. */
    clientPointsDelta?: unknown;
    createdAt?: string;
  }): StoreUmPointsApplyResult {
    if (!input.actorUserId || input.actorUserId !== input.userId) {
      return denied("forbidden");
    }

    const computed = pointsFromPaidPurchase({
      paymentStatus: input.paymentStatus,
      orderStatus: input.orderStatus,
      spend: input.spend,
    });
    if (!computed.awarded) {
      return {
        applied: false,
        duplicate: false,
        pointsDelta: 0,
        balance: this.getBalance(input.userId),
        event: null,
        reason: computed.reason,
      };
    }

    const idempotencyKey = buildPurchaseIdempotencyKey({
      orderId: input.orderId,
      paymentReference: input.paymentReference,
    });
    return this.insert({
      userId: input.userId,
      orderId: input.orderId,
      paymentReference: input.paymentReference ?? null,
      eventType: "PURCHASE_EARN",
      pointsDelta: computed.points,
      spend: computed.spend ?? {
        eligibleOriginal: 0,
        originalCurrency: input.spend.originalCurrency,
        eligibleUsd: 0,
      },
      reason: computed.reason,
      idempotencyKey,
      createdAt: input.createdAt,
    });
  }

  applyRefundReversal(input: {
    actorUserId: string;
    userId: string;
    orderId: string;
    refundReference: string;
    paymentReference?: string | null;
    refundedEligible: EligibleSpendInput;
    clientPointsDelta?: unknown;
    createdAt?: string;
  }): StoreUmPointsApplyResult {
    if (!input.actorUserId || input.actorUserId !== input.userId) {
      return denied("forbidden");
    }

    const computed = pointsFromRefundedEligibleSpend({
      refundedEligible: input.refundedEligible,
    });
    const remaining = this.remainingEarnForOrder(input.userId, input.orderId);
    const reversal = Math.min(computed.points, Math.max(0, remaining));
    const partial = reversal < remaining || remaining === 0;
    const eventType: StoreUmPointsEventType =
      remaining > 0 && reversal >= remaining
        ? "REFUND_REVERSAL"
        : "PARTIAL_REFUND_REVERSAL";

    const idempotencyKey = buildRefundIdempotencyKey({
      orderId: input.orderId,
      refundReference: input.refundReference,
      partial: eventType === "PARTIAL_REFUND_REVERSAL",
    });

    if (reversal <= 0) {
      const existing = this.byIdempotency.get(idempotencyKey);
      if (existing) {
        return {
          applied: false,
          duplicate: true,
          pointsDelta: existing.pointsDelta,
          balance: this.getBalance(input.userId),
          event: { ...existing },
          reason: "deduped",
        };
      }
      return {
        applied: false,
        duplicate: false,
        pointsDelta: 0,
        balance: this.getBalance(input.userId),
        event: null,
        reason: computed.reason === "refund_reversal" ? "nothing_to_reverse" : computed.reason,
      };
    }

    return this.insert({
      userId: input.userId,
      orderId: input.orderId,
      paymentReference: input.paymentReference ?? input.refundReference,
      eventType,
      pointsDelta: -reversal,
      spend: computed.spend ?? {
        eligibleOriginal: 0,
        originalCurrency: input.refundedEligible.originalCurrency,
        eligibleUsd: 0,
      },
      reason: partial && eventType === "PARTIAL_REFUND_REVERSAL"
        ? "partial_refund_reversal"
        : "full_refund_reversal",
      idempotencyKey,
      createdAt: input.createdAt,
    });
  }

  applyAdminAdjustment(input: {
    actorUserId: string;
    userId: string;
    adjustmentId: string;
    /** Admin adjustments still derive points from eligible USD — never raw client points. */
    spend: EligibleSpendInput;
    direction: "credit" | "debit";
    reason: string;
    createdAt?: string;
  }): StoreUmPointsApplyResult {
    // Foundation only: no admin UI. Still server-computed and user-scoped.
    if (!input.actorUserId || input.actorUserId !== input.userId) {
      return denied("forbidden");
    }
    const spend = computeEligibleProductSpend(input.spend);
    if (!spend.ok) {
      return {
        applied: false,
        duplicate: false,
        pointsDelta: 0,
        balance: this.getBalance(input.userId),
        event: null,
        reason: spend.reason,
      };
    }
    const magnitude = floorEligibleUsdToPoints(spend.eligibleUsd);
    const pointsDelta = input.direction === "debit" ? -magnitude : magnitude;
    return this.insert({
      userId: input.userId,
      orderId: null,
      paymentReference: null,
      eventType: "ADMIN_ADJUSTMENT",
      pointsDelta,
      spend,
      reason: input.reason.trim() || "admin_adjustment",
      idempotencyKey: buildAdminAdjustmentIdempotencyKey(input.adjustmentId),
      createdAt: input.createdAt,
    });
  }

  private insert(input: {
    userId: string;
    orderId: string | null;
    paymentReference: string | null;
    eventType: StoreUmPointsEventType;
    pointsDelta: number;
    spend: {
      eligibleOriginal: number;
      originalCurrency: string;
      eligibleUsd: number;
    };
    reason: string;
    idempotencyKey: string;
    createdAt?: string;
  }): StoreUmPointsApplyResult {
    if (!isStoreUmPointsEventType(input.eventType)) {
      return denied("invalid_event");
    }
    const existing = this.byIdempotency.get(input.idempotencyKey);
    if (existing) {
      return {
        applied: false,
        duplicate: true,
        pointsDelta: existing.pointsDelta,
        balance: this.getBalance(input.userId),
        event: { ...existing },
        reason: "deduped",
      };
    }

    const event: StoreUmPointsLedgerEvent = {
      id: newId(),
      userId: input.userId,
      orderId: input.orderId,
      paymentReference: input.paymentReference,
      eventType: input.eventType,
      pointsDelta: input.pointsDelta,
      eligibleSpendOriginal: input.spend.eligibleOriginal,
      originalCurrency: input.spend.originalCurrency,
      eligibleSpendUsd: input.spend.eligibleUsd,
      reason: input.reason,
      createdAt: input.createdAt ?? nowIso(),
      idempotencyKey: input.idempotencyKey,
    };
    this.events.push(event);
    this.byIdempotency.set(input.idempotencyKey, event);
    return {
      applied: true,
      duplicate: false,
      pointsDelta: event.pointsDelta,
      balance: this.getBalance(input.userId),
      event: { ...event },
      reason: input.reason,
    };
  }
}

function denied(reason: string): StoreUmPointsApplyResult {
  return {
    applied: false,
    duplicate: false,
    pointsDelta: 0,
    balance: 0,
    event: null,
    reason,
  };
}
