/**
 * Unified Revenue Platform Foundation facade.
 */

import {
  RevenueConsumerRegistry,
  revenueConsumerRegistry,
} from "./consumers";
import {
  createNoopRevenueBillingHooks,
  createNoopRevenueProviderHooks,
  type RevenueBillingHooks,
  type RevenueProviderHooks,
} from "./types";
import { RevenueLedger } from "./ledger";
import {
  RevenueSourceRegistry,
  revenueSourceRegistry,
} from "./sources";
import {
  RevenueTransactionStore,
  revenueTransactionStore,
} from "./transactions";
import {
  RevenueWalletStore,
  revenueWalletStore,
} from "./wallet";
import { validateRevenueEvent } from "./events";

export type RevenuePlatformFoundationOptions = {
  sources?: RevenueSourceRegistry;
  consumers?: RevenueConsumerRegistry;
  wallets?: RevenueWalletStore;
  transactions?: RevenueTransactionStore;
  ledger?: RevenueLedger;
  providerHooks?: RevenueProviderHooks;
  billingHooks?: RevenueBillingHooks;
};

export class RevenuePlatformFoundation {
  readonly sources: RevenueSourceRegistry;
  readonly consumers: RevenueConsumerRegistry;
  readonly wallets: RevenueWalletStore;
  readonly transactions: RevenueTransactionStore;
  readonly ledger: RevenueLedger;
  private readonly providerHooks: RevenueProviderHooks;
  private readonly billingHooks: RevenueBillingHooks;

  constructor(options: RevenuePlatformFoundationOptions = {}) {
    this.sources = options.sources ?? new RevenueSourceRegistry();
    this.consumers = options.consumers ?? new RevenueConsumerRegistry();
    this.wallets = options.wallets ?? new RevenueWalletStore();
    this.transactions = options.transactions ?? new RevenueTransactionStore();
    this.ledger = options.ledger ?? new RevenueLedger();
    this.providerHooks = {
      ...createNoopRevenueProviderHooks(),
      ...options.providerHooks,
    };
    this.billingHooks = {
      ...createNoopRevenueBillingHooks(),
      ...options.billingHooks,
    };
  }

  validateEvent = validateRevenueEvent;

  extensionHooks() {
    return {
      providers: this.providerHooks,
      billing: this.billingHooks,
    };
  }
}

export const revenuePlatformFoundation = new RevenuePlatformFoundation({
  sources: revenueSourceRegistry,
  consumers: revenueConsumerRegistry,
  wallets: revenueWalletStore,
  transactions: revenueTransactionStore,
});

export function resetRevenuePlatformFoundation(): void {
  revenueSourceRegistry.reset();
  revenueConsumerRegistry.reset();
  revenueWalletStore.reset();
  revenueTransactionStore.reset();
}
