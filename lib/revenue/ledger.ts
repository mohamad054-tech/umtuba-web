/**
 * Ledger Foundation — append-only immutable entries.
 * No edits/deletes after post. Balances derived from entries.
 */

import {
  assertMinorAmount,
  newRevenueId,
  requireRevenueUuid,
  RevenuePlatformError,
} from "./ids";
import { validateRevenueMoney } from "./events";
import type {
  RevenueCurrency,
  RevenueLedgerEntry,
  RevenueLedgerEntrySide,
} from "./types";

export type RevenueLedgerPostLine = {
  accountId: string;
  side: RevenueLedgerEntrySide;
  amountMinor: number;
  currency: RevenueCurrency;
  memo?: string | null;
};

export class RevenueLedger {
  readonly ledgerId: string;
  private readonly entries: RevenueLedgerEntry[] = [];
  private frozen = false;

  constructor(ledgerId?: string) {
    this.ledgerId = ledgerId
      ? requireRevenueUuid(ledgerId, "ledgerId")
      : newRevenueId();
  }

  list(): RevenueLedgerEntry[] {
    return this.entries.map((e) => ({ ...e }));
  }

  /**
   * Post a balanced double-entry set for a transaction.
   * Debits must equal credits per currency. Entries are immutable afterward.
   */
  post(input: {
    transactionId: string;
    lines: RevenueLedgerPostLine[];
    postedAt?: string;
  }): RevenueLedgerEntry[] {
    if (this.frozen) {
      throw new RevenuePlatformError(
        "immutable_violation",
        "Ledger is frozen."
      );
    }
    requireRevenueUuid(input.transactionId, "transactionId");
    if (!input.lines.length) {
      throw new RevenuePlatformError(
        "invalid_input",
        "At least one ledger line is required."
      );
    }

    const totals = new Map<string, { debit: number; credit: number }>();
    const prepared: RevenueLedgerEntry[] = [];
    const postedAt = input.postedAt ?? new Date().toISOString();

    for (const line of input.lines) {
      const accountId = line.accountId.trim();
      if (!accountId) {
        throw new RevenuePlatformError(
          "invalid_input",
          "accountId is required."
        );
      }
      if (line.side !== "debit" && line.side !== "credit") {
        throw new RevenuePlatformError(
          "invalid_input",
          `Invalid ledger side: ${String(line.side)}`
        );
      }
      const money = validateRevenueMoney({
        currency: line.currency,
        amountMinor: line.amountMinor,
      });
      assertMinorAmount(money.amountMinor);

      const bucket = totals.get(money.currency) ?? { debit: 0, credit: 0 };
      if (line.side === "debit") bucket.debit += money.amountMinor;
      else bucket.credit += money.amountMinor;
      totals.set(money.currency, bucket);

      prepared.push({
        entryId: newRevenueId(),
        ledgerId: this.ledgerId,
        transactionId: input.transactionId,
        accountId,
        side: line.side,
        amountMinor: money.amountMinor,
        currency: money.currency,
        postedAt,
        memo: line.memo?.trim() || null,
      });
    }

    for (const [currency, t] of totals) {
      if (t.debit !== t.credit) {
        throw new RevenuePlatformError(
          "unbalanced_ledger",
          `Unbalanced ledger for ${currency}: debit ${t.debit} != credit ${t.credit}.`
        );
      }
    }

    // Append-only: once pushed, never mutated.
    this.entries.push(...prepared.map((e) => Object.freeze({ ...e })));
    return prepared.map((e) => ({ ...e }));
  }

  /**
   * Fail-closed: entries cannot be rewritten.
   */
  rewriteEntry(): never {
    throw new RevenuePlatformError(
      "immutable_violation",
      "Ledger entries are immutable."
    );
  }

  deleteEntry(): never {
    throw new RevenuePlatformError(
      "immutable_violation",
      "Ledger entries are immutable and cannot be deleted."
    );
  }

  /**
   * Derive net credit-minus-debit for an account (available-style projection).
   */
  balanceForAccount(accountId: string, currency: RevenueCurrency): number {
    let debit = 0;
    let credit = 0;
    for (const entry of this.entries) {
      if (entry.accountId !== accountId || entry.currency !== currency) continue;
      if (entry.side === "debit") debit += entry.amountMinor;
      else credit += entry.amountMinor;
    }
    return credit - debit;
  }
}
