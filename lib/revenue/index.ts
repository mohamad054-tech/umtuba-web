/**
 * Unified Revenue Platform Foundation — public exports.
 */

export {
  REVENUE_PLATFORM_VERSION,
  REVENUE_CURRENCIES,
  REVENUE_SOURCE_IDS,
  REVENUE_CONSUMER_IDS,
  REVENUE_EVENT_TYPES,
  REVENUE_TRANSACTION_KINDS,
  REVENUE_TRANSACTION_STATUSES,
  REVENUE_LEDGER_ENTRY_SIDES,
  REVENUE_ACCOUNT_KINDS,
  createNoopRevenueProviderHooks,
  createNoopRevenueBillingHooks,
} from "./types";
export type {
  RevenueCurrency,
  RevenueMoney,
  RevenueSourceId,
  RevenueConsumerId,
  RevenueEventType,
  RevenueTransactionKind,
  RevenueTransactionStatus,
  RevenueLedgerEntrySide,
  RevenueAccountKind,
  RevenueAccountRef,
  RevenueWallet,
  RevenueLedgerEntry,
  RevenueTransaction,
  RevenueEvent,
  RevenueSourceDefinition,
  RevenueConsumerDefinition,
  RevenueProviderHooks,
  RevenueBillingHooks,
} from "./types";

export {
  RevenuePlatformError,
  isRevenueUuid,
  assertMinorAmount,
  deterministicRevenueId,
  newRevenueId,
} from "./ids";

export {
  RevenueSourceRegistry,
  revenueSourceRegistry,
  assertRevenueSourceId,
} from "./sources";
export {
  RevenueConsumerRegistry,
  revenueConsumerRegistry,
  assertRevenueConsumerId,
} from "./consumers";
export {
  validateRevenueEvent,
  validateRevenueMoney,
  assertRevenueEventType,
} from "./events";
export {
  RevenueWalletStore,
  revenueWalletStore,
} from "./wallet";
export { RevenueLedger } from "./ledger";
export type { RevenueLedgerPostLine } from "./ledger";
export {
  RevenueTransactionStore,
  revenueTransactionStore,
  assertRevenueTransactionKind,
} from "./transactions";
export {
  RevenuePlatformFoundation,
  revenuePlatformFoundation,
  resetRevenuePlatformFoundation,
} from "./foundation";
