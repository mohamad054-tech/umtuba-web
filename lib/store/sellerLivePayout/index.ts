/**
 * Seller Live Payout — public surface (S1–S4).
 * Gate + types + provider port + Manual Ops Live + destination/execution helpers + orchestrator.
 * No server actions or UI in this package surface.
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
  SellerLivePayoutOrchestrationPhase,
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

export {
  manualOpsLiveProvider,
  getManualOpsLiveProvider,
  createManualOpsLiveTransferForTests,
  buildManualOpsLiveProviderRef,
} from "./providers/manualOpsLive";

export {
  SELLER_LIVE_PAYOUT_DESTINATION_RPCS,
  validateSellerLivePayoutStoreId,
  validateMaskedDestinationDisplayLabel,
  validateSellerLivePayoutCurrency,
  rejectUnsafeDestinationClientFields,
  assertNoSensitiveDestinationFields,
  parseSellerLivePayoutDestination,
  upsertMyStorePayoutDestination,
  listMyStorePayoutDestinations,
} from "./destinations";
export type {
  SellerLivePayoutDestination,
  UpsertSellerLivePayoutDestinationInput,
} from "./destinations";

export {
  SELLER_LIVE_PAYOUT_EXECUTION_RPCS,
  SELLER_LIVE_PAYOUT_INITIAL_EXECUTION_STATUSES,
  SELLER_LIVE_PAYOUT_EXECUTION_TRANSITIONS,
  isSellerLivePayoutExecutionTransitionAllowed,
  rejectClientTrustedMoneyFields,
  validateTrustedAmountMinor,
  validateIdempotencyKey,
  validateSafeProviderRef,
  parseSellerLivePayoutExecution,
  serviceInsertStorePayoutExecution,
  serviceUpdateStorePayoutExecution,
  getMyStorePayoutExecution,
  mapTransferStatusToDurableExecutionStatus,
} from "./executions";
export type {
  SellerLivePayoutExecution,
  SellerLivePayoutInitialExecutionStatus,
  InsertSellerLivePayoutExecutionInput,
  UpdateSellerLivePayoutExecutionInput,
} from "./executions";

export {
  rejectClientLivePayoutOrchestratorMoneyFields,
  validateOrchestrationKey,
  buildLivePayoutBookingIdempotencyKey,
  orchestrateSellerLivePayoutSubmit,
  orchestrateSellerLivePayoutResolveAttestation,
} from "./orchestrator";
export type {
  SellerLivePayoutOrchestratorInput,
  SellerLivePayoutAttestationDecision,
  SellerLivePayoutOrchestratorResult,
  SellerLivePayoutOrchestratorDeps,
} from "./orchestrator";
