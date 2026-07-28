/**
 * Wallet Foundation — account containers only.
 * Balances are derived from ledger posts; never mutate available/pending directly.
 */

import {
  newRevenueId,
  requireRevenueUuid,
  RevenuePlatformError,
} from "./ids";
import { assertRevenueConsumerId } from "./consumers";
import { validateRevenueMoney } from "./events";
import type {
  RevenueConsumerId,
  RevenueCurrency,
  RevenueWallet,
} from "./types";
import type { RevenueConsumerRegistry } from "./consumers";

export class RevenueWalletStore {
  private readonly wallets = new Map<string, RevenueWallet>();

  reset(): void {
    this.wallets.clear();
  }

  create(input: {
    ownerConsumerId: RevenueConsumerId;
    ownerSubjectId: string;
    currency: RevenueCurrency;
    walletId?: string;
    consumers: RevenueConsumerRegistry;
  }): RevenueWallet {
    assertRevenueConsumerId(input.ownerConsumerId);
    const consumer = input.consumers.require(input.ownerConsumerId);
    if (!consumer.canHoldWallet) {
      throw new RevenuePlatformError(
        "invalid_input",
        `Consumer cannot hold wallet: ${input.ownerConsumerId}`
      );
    }
    const ownerSubjectId = input.ownerSubjectId.trim();
    if (!ownerSubjectId) {
      throw new RevenuePlatformError(
        "invalid_input",
        "ownerSubjectId is required."
      );
    }
    validateRevenueMoney({ currency: input.currency, amountMinor: 0 }, {
      allowZero: true,
    });

    const walletId = input.walletId
      ? requireRevenueUuid(input.walletId, "walletId")
      : newRevenueId();
    if (this.wallets.has(walletId)) {
      throw new RevenuePlatformError(
        "invalid_input",
        `Wallet already exists: ${walletId}`
      );
    }

    const now = new Date().toISOString();
    const wallet: RevenueWallet = {
      walletId,
      ownerConsumerId: input.ownerConsumerId,
      ownerSubjectId,
      currency: input.currency,
      availableMinor: 0,
      pendingMinor: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.wallets.set(walletId, wallet);
    return { ...wallet };
  }

  get(walletId: string): RevenueWallet | null {
    const wallet = this.wallets.get(walletId);
    return wallet ? { ...wallet } : null;
  }

  require(walletId: string): RevenueWallet {
    const wallet = this.get(walletId);
    if (!wallet) {
      throw new RevenuePlatformError("not_found", `Wallet not found: ${walletId}`);
    }
    return wallet;
  }

  listForOwner(ownerSubjectId: string): RevenueWallet[] {
    const subject = ownerSubjectId.trim();
    return [...this.wallets.values()]
      .filter((w) => w.ownerSubjectId === subject)
      .map((w) => ({ ...w }));
  }

  /**
   * Internal projection update after ledger post — not a public balance API.
   */
  applyDerivedBalances(
    walletId: string,
    availableMinor: number,
    pendingMinor: number
  ): RevenueWallet {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new RevenuePlatformError("not_found", `Wallet not found: ${walletId}`);
    }
    if (
      !Number.isInteger(availableMinor) ||
      !Number.isInteger(pendingMinor) ||
      availableMinor < 0 ||
      pendingMinor < 0
    ) {
      throw new RevenuePlatformError(
        "invalid_input",
        "Derived balances must be non-negative integers."
      );
    }
    wallet.availableMinor = availableMinor;
    wallet.pendingMinor = pendingMinor;
    wallet.updatedAt = new Date().toISOString();
    return { ...wallet };
  }

  /**
   * Explicitly forbidden public path — documents fail-closed policy.
   */
  mutateBalanceDirectly(): never {
    throw new RevenuePlatformError(
      "direct_balance_mutation_forbidden",
      "Direct wallet balance mutation is forbidden. Post ledger entries."
    );
  }
}

export const revenueWalletStore = new RevenueWalletStore();
