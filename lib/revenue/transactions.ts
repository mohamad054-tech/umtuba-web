/**
 * Transaction Foundation — propose + post via ledger (no direct balance mutation).
 */

import {
  newRevenueId,
  requireRevenueUuid,
  RevenuePlatformError,
} from "./ids";
import { assertRevenueSourceId } from "./sources";
import { assertRevenueConsumerId } from "./consumers";
import { validateRevenueMoney } from "./events";
import type { RevenueLedger, RevenueLedgerPostLine } from "./ledger";
import type {
  RevenueConsumerId,
  RevenueSourceId,
  RevenueTransaction,
  RevenueTransactionKind,
} from "./types";
import {
  REVENUE_TRANSACTION_KINDS,
} from "./types";

const KIND_SET = new Set<string>(REVENUE_TRANSACTION_KINDS);

export function assertRevenueTransactionKind(
  kind: string
): asserts kind is RevenueTransactionKind {
  if (!KIND_SET.has(kind)) {
    throw new RevenuePlatformError(
      "invalid_input",
      `Unknown transaction kind: ${kind}`
    );
  }
}

export class RevenueTransactionStore {
  private readonly transactions = new Map<string, RevenueTransaction>();

  reset(): void {
    this.transactions.clear();
  }

  propose(input: {
    kind: RevenueTransactionKind;
    sourceId: RevenueSourceId;
    money: { currency: RevenueTransaction["money"]["currency"]; amountMinor: number };
    fromConsumerId?: RevenueConsumerId | null;
    fromSubjectId?: string | null;
    toConsumerId?: RevenueConsumerId | null;
    toSubjectId?: string | null;
    externalRef?: string | null;
    transactionId?: string;
  }): RevenueTransaction {
    assertRevenueTransactionKind(input.kind);
    assertRevenueSourceId(input.sourceId);
    const money = validateRevenueMoney(input.money);
    if (input.fromConsumerId) assertRevenueConsumerId(input.fromConsumerId);
    if (input.toConsumerId) assertRevenueConsumerId(input.toConsumerId);

    const transactionId = input.transactionId
      ? requireRevenueUuid(input.transactionId, "transactionId")
      : newRevenueId();
    if (this.transactions.has(transactionId)) {
      throw new RevenuePlatformError(
        "invalid_input",
        `Transaction already exists: ${transactionId}`
      );
    }

    const tx: RevenueTransaction = {
      transactionId,
      kind: input.kind,
      status: "proposed",
      sourceId: input.sourceId,
      money,
      fromConsumerId: input.fromConsumerId ?? null,
      fromSubjectId: input.fromSubjectId?.trim() || null,
      toConsumerId: input.toConsumerId ?? null,
      toSubjectId: input.toSubjectId?.trim() || null,
      externalRef: input.externalRef?.trim() || null,
      createdAt: new Date().toISOString(),
      postedAt: null,
    };
    this.transactions.set(transactionId, tx);
    return { ...tx };
  }

  get(transactionId: string): RevenueTransaction | null {
    const tx = this.transactions.get(transactionId);
    return tx ? { ...tx } : null;
  }

  require(transactionId: string): RevenueTransaction {
    const tx = this.get(transactionId);
    if (!tx) {
      throw new RevenuePlatformError(
        "not_found",
        `Transaction not found: ${transactionId}`
      );
    }
    return tx;
  }

  /**
   * Post transaction by writing balanced ledger lines.
   * Marks transaction posted only after successful ledger append.
   */
  post(input: {
    transactionId: string;
    ledger: RevenueLedger;
    lines: RevenueLedgerPostLine[];
  }): RevenueTransaction {
    const tx = this.transactions.get(input.transactionId);
    if (!tx) {
      throw new RevenuePlatformError(
        "not_found",
        `Transaction not found: ${input.transactionId}`
      );
    }
    if (tx.status !== "proposed") {
      throw new RevenuePlatformError(
        "invalid_input",
        `Transaction is not proposable for post: ${tx.status}`
      );
    }

    for (const line of input.lines) {
      if (line.currency !== tx.money.currency) {
        throw new RevenuePlatformError(
          "invalid_input",
          "Ledger line currency must match transaction currency."
        );
      }
    }

    input.ledger.post({
      transactionId: tx.transactionId,
      lines: input.lines,
    });

    tx.status = "posted";
    tx.postedAt = new Date().toISOString();
    return { ...tx };
  }

  markFailed(transactionId: string): RevenueTransaction {
    const tx = this.transactions.get(transactionId);
    if (!tx) {
      throw new RevenuePlatformError(
        "not_found",
        `Transaction not found: ${transactionId}`
      );
    }
    if (tx.status === "posted") {
      throw new RevenuePlatformError(
        "immutable_violation",
        "Posted transactions cannot be marked failed."
      );
    }
    tx.status = "failed";
    return { ...tx };
  }
}

export const revenueTransactionStore = new RevenueTransactionStore();
