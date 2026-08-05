/**
 * Seller Live Payout Provider V1 — Slice S1 public surface.
 * Gate + types + provider port only. No migrations, UI, or Manual Ops adapter.
 */

export {
  SELLER_LIVE_PAYOUT_PROVIDER_VERSION,
  SELLER_LIVE_PAYOUT_PRODUCTION_GATE_ACK_VALUE,
  SELLER_LIVE_PAYOUT_NON_PRODUCTION_FIXTURE_TOKEN,
  SELLER_LIVE_PAYOUT_PROVIDER_IDS,
  SELLER_LIVE_PAYOUT_V1_PROVIDER_ID,
} from "./types";
export type {
  SellerLivePayoutProviderId,
  SellerLivePayoutExecutionStatus,
  SellerLivePayoutTransferStatus,
  SellerLivePayoutDestinationVerificationState,
  SellerLivePayoutFailureCode,
  SellerLivePayoutTransferInput,
  SellerLivePayoutTransferResult,
} from "./types";

export {
  buildSellerLivePayoutGateReadinessReport,
  evaluateSellerLivePayoutGate,
  evaluateSellerLivePayoutGateForTests,
  isSellerLivePayoutGateSatisfied,
} from "./gate";
export type {
  SellerLivePayoutGateEnv,
  SellerLivePayoutGateResult,
  SellerLivePayoutGateFailureCode,
  SellerLivePayoutGateReadinessReport,
} from "./gate";

export {
  SELLER_LIVE_PAYOUT_PROVIDER_CONTRACTS,
  getSellerLivePayoutProviderContract,
  assertSellerLivePayoutProviderAllowed,
  resolveSellerLivePayoutProviderPort,
} from "./providerPort";
export type {
  SellerLivePayoutProviderContract,
  SellerLivePayoutProviderPort,
} from "./providerPort";
