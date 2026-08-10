/**
 * Commerce RELEASE-CANDIDATE FINAL REGRESSION PACK V1.
 *
 * Consolidates tip SoT safety surfaces into one deterministic TEST-ONLY runner:
 *   provider control plane · Stripe TEST offline safety · refund reservation ·
 *   provider execution safety · uncertain outcomes · reconciliation · recovery ·
 *   compensation · terminal states · replay/idempotency · observability ·
 *   operator diagnostics · seller/admin authorization
 *
 * Consumes actual tip contracts only. Does NOT invent provider architecture.
 * Does NOT touch A2 stripeTestActivation* / dependency-chain proof surfaces.
 *
 * STRIPE_CALLS=0 · MONEY=0 · DB=0 · MIGRATIONS=0 · PROVIDER_GATES=OFF
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { partialRefundProviderMoneyOwnership } from "./capability";
import { evaluateFirstTimeProviderMoneyExecuteEligibility } from "./eligibility";
import {
  PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_ENV,
} from "./executionMode";
import {
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV,
} from "./gate";
import { buildPartialRefundProviderIdempotencyKey } from "./idempotency";
import {
  buildProviderMoneyOperatorObservability,
  buildProviderMoneyOperatorObservabilityAbsent,
} from "./operatorObservability";
import {
  assertAdminProviderMoneyExecuteAllowed,
  buildPartialRefundProviderMoneyReadinessReport,
} from "./readiness";
import { runFullRefundProviderReleaseCandidateSafetyMatrix } from "./refundProviderReleaseCandidateSafetyMatrix";
import {
  STRIPE_TEST_CONTROL_PLANE_ACTIVATION_PERFORMED,
  STRIPE_TEST_CONTROL_PLANE_PROVIDER_EXECUTION_ENTRYPOINTS,
  buildStripeTestControlPlaneReport,
} from "./stripeTestControlPlaneHardening";
import {
  STRIPE_TEST_CONTROLLED_TEST_ACTIVATION_AUTHORIZED,
  buildStripeTestControlledTestPreActivationSafetyReport,
  isStripeTestControlledTestPreActivationStructurallySafe,
} from "./stripeTestControlledTestPreActivationSafety";
import {
  STRIPE_TEST_EXTERNAL_PREREQUISITE_CENTRAL_INTEGRATION_STILL_REQUIRED,
  STRIPE_TEST_EXTERNAL_PREREQUISITE_OPERATOR_PACKET_ACTIVATION_PERFORMED,
  STRIPE_TEST_EXTERNAL_PREREQUISITE_OPERATOR_PACKET_EXECUTION_AUTHORIZED,
  buildStripeTestExternalPrerequisiteOperatorPacketReport,
} from "./stripeTestExternalPrerequisiteOperatorPacket";
import { buildStripeTestFixturePackReport } from "./stripeTestFixturePack";
import {
  STRIPE_TEST_OFFLINE_PREFLIGHT_PROVIDER_EXECUTION_ENTRYPOINTS,
  buildStripeTestOfflinePreflightReport,
} from "./stripeTestOfflinePreflightValidator";
import type { PartialRefundProviderExecutionRecord } from "./types";

export const COMMERCE_RELEASE_CANDIDATE_FINAL_REGRESSION_PACK_VERSION =
  "commerce-release-candidate-final-regression-pack-v1" as const;

export const COMMERCE_RELEASE_CANDIDATE_FINAL_REGRESSION_PACK_ENVIRONMENT =
  "isolated_commerce_release_candidate_final_regression_pack_v1_not_production" as const;

/** Coverage domains required by CENTRAL GO. */
export const FINAL_REGRESSION_COVERAGE_DOMAINS = [
  "PROVIDER_CONTROL_PLANE",
  "STRIPE_TEST_SAFETY_OFFLINE",
  "REFUND_RESERVATION",
  "PROVIDER_EXECUTION_SAFETY",
  "UNCERTAIN_OUTCOMES",
  "RECONCILIATION",
  "RECOVERY",
  "COMPENSATION",
  "TERMINAL_STATES",
  "REPLAY_IDEMPOTENCY",
  "OBSERVABILITY",
  "OPERATOR_DIAGNOSTICS",
  "SELLER_ADMIN_AUTHORIZATION",
] as const;

export type FinalRegressionCoverageDomain =
  (typeof FINAL_REGRESSION_COVERAGE_DOMAINS)[number];

export type FinalRegressionSuiteId =
  | "control_plane"
  | "stripe_test_offline"
  | "refund_provider_rc_matrix"
  | "observability_diagnostics"
  | "seller_admin_authorization"
  | "hard_safety_counters";

export type FinalRegressionSuiteResult = {
  suite: FinalRegressionSuiteId;
  domains: FinalRegressionCoverageDomain[];
  pass: boolean;
  violations: string[];
  evidence: string[];
};

export type FinalRegressionSafetyCounters = {
  STRIPE_CALLS: 0;
  MONEY_MOVEMENT: 0;
  DB_WRITES: 0;
  MIGRATIONS: 0;
  PROVIDER_GATES: "OFF";
};

export type FinalRegressionPackRunResult = {
  version: typeof COMMERCE_RELEASE_CANDIDATE_FINAL_REGRESSION_PACK_VERSION;
  environment: typeof COMMERCE_RELEASE_CANDIDATE_FINAL_REGRESSION_PACK_ENVIRONMENT;
  suites: FinalRegressionSuiteResult[];
  domainsCovered: FinalRegressionCoverageDomain[];
  coverageMatrix: Record<FinalRegressionCoverageDomain, boolean>;
  allPass: boolean;
  violations: string[];
  /** Code release-candidate verdict from this pack only (not production/live readiness). */
  COMMERCE_CODE_RELEASE_CANDIDATE: "YES" | "NO";
  blockers: string[];
  notes: string[];
  safety: FinalRegressionSafetyCounters;
};

const IDS = {
  execution: "66666666-6666-4666-8666-666666666666",
  store: "11111111-1111-4111-8111-111111111111",
  ledger: "55555555-5555-4555-8555-555555555555",
  order: "22222222-2222-4222-8222-222222222222",
  payment: "33333333-3333-4333-8333-333333333333",
  capture: "44444444-4444-4444-8444-444444444444",
} as const;

const ACTION =
  "app/actions/storePartialRefundProviderMoneyExecution.ts";
const EXECUTE_PANEL =
  "app/admin/store/refunds/PartialRefundProviderMoneyExecutePanel.tsx";
const RECOVERY_PANEL =
  "app/admin/store/refunds/PartialRefundProviderMoneyRecoveryPanel.tsx";

/** Deterministic offline host env — gates remain OFF; no live secrets. */
function offlineSafeHostEnv(): Record<string, string | undefined> {
  return {
    NODE_ENV: "test",
    STRIPE_MODE: "test",
    STRIPE_SECRET_KEY: undefined,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: undefined,
    STRIPE_WEBHOOK_SECRET: undefined,
    NEXT_PUBLIC_APP_URL: "https://example.test",
    [PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV]: undefined,
    [PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV]: undefined,
    [PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV]: undefined,
    [PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_ENV]: undefined,
  };
}

function executionRecord(
  overrides: Partial<PartialRefundProviderExecutionRecord> = {}
): PartialRefundProviderExecutionRecord {
  return {
    executionId: IDS.execution,
    storeId: IDS.store,
    ledgerId: IDS.ledger,
    orderId: IDS.order,
    paymentAttemptId: IDS.payment,
    captureEventId: IDS.capture,
    providerKind: "stripe",
    providerPaymentRef: "pi_3FinalRcFixture0001",
    trustedAmountMinor: 1500,
    currency: "USD",
    idempotencyKey: buildPartialRefundProviderIdempotencyKey(IDS.ledger),
    status: "planned",
    providerRefundId: null,
    providerStatusSafe: null,
    failureCode: null,
    failureMessageSafe: null,
    operatorUserId: "op-final-rc",
    operatorReasonSafe: "final regression pack",
    startedAtIso: null,
    completedAtIso: null,
    lastLookupAtIso: null,
    createdAtIso: "2026-08-10T07:00:00.000Z",
    updatedAtIso: "2026-08-10T07:00:00.000Z",
    ...overrides,
  };
}

function readRepo(rel: string): string {
  return readFileSync(path.join(process.cwd(), rel), "utf8");
}

function walkTsxFiles(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of entries) {
    const full = path.join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".next" || name === ".git") continue;
      walkTsxFiles(full, acc);
    } else if (/\.(tsx|ts)$/.test(name)) {
      acc.push(full);
    }
  }
  return acc;
}

function runControlPlaneSuite(): FinalRegressionSuiteResult {
  const violations: string[] = [];
  const evidence: string[] = [];
  const env = offlineSafeHostEnv();
  const report = buildStripeTestControlPlaneReport(env);

  evidence.push(`control_plane.status=${report.status}`);
  evidence.push(`control_plane.version=${report.version}`);
  evidence.push(`control_plane.providerGates=${report.providerGates}`);

  if (STRIPE_TEST_CONTROL_PLANE_ACTIVATION_PERFORMED !== false) {
    violations.push("CONTROL_PLANE_MUST_NEVER_PERFORM_ACTIVATION");
  }
  if (STRIPE_TEST_CONTROL_PLANE_PROVIDER_EXECUTION_ENTRYPOINTS.length !== 0) {
    violations.push("CONTROL_PLANE_MUST_HAVE_ZERO_PROVIDER_EXECUTION_ENTRYPOINTS");
  }
  if (report.networkStripeCalls !== 0) {
    violations.push("CONTROL_PLANE_NETWORK_STRIPE_CALLS_MUST_BE_0");
  }
  if (report.moneyMovement !== 0) {
    violations.push("CONTROL_PLANE_MONEY_MOVEMENT_MUST_BE_0");
  }
  if (report.productionDbWrites !== 0) {
    violations.push("CONTROL_PLANE_PRODUCTION_DB_WRITES_MUST_BE_0");
  }
  if (report.activationPerformed !== false) {
    violations.push("CONTROL_PLANE_ACTIVATION_PERFORMED_MUST_BE_FALSE");
  }
  if (report.activationAuthorizedByControlPlane !== false) {
    violations.push("CONTROL_PLANE_MUST_NOT_AUTHORIZE_ACTIVATION");
  }
  if (report.providerGates !== "OFF") {
    violations.push("CONTROL_PLANE_PROVIDER_GATES_MUST_BE_OFF");
  }
  // Offline pack host has no credentials → NOT_READY is expected and safe.
  if (report.status === "READY") {
    violations.push(
      "CONTROL_PLANE_UNEXPECTED_READY_WITHOUT_CREDENTIALS_ON_OFFLINE_HOST"
    );
  }
  if (!Array.isArray(report.reasons) || report.reasons.length === 0) {
    violations.push("CONTROL_PLANE_NOT_READY_MUST_EXPOSE_REASONS");
  }
  if (JSON.stringify(report).match(/sk_(live|test)_|whsec_|rk_(live|test)_/)) {
    violations.push("CONTROL_PLANE_MUST_NOT_ECHO_SECRETS");
  }

  return {
    suite: "control_plane",
    domains: ["PROVIDER_CONTROL_PLANE"],
    pass: violations.length === 0,
    violations,
    evidence,
  };
}

function runStripeTestOfflineSuite(): FinalRegressionSuiteResult {
  const violations: string[] = [];
  const evidence: string[] = [];
  const env = offlineSafeHostEnv();

  const preflight = buildStripeTestOfflinePreflightReport(env);
  const preActivation = buildStripeTestControlledTestPreActivationSafetyReport(env);
  const fixtures = buildStripeTestFixturePackReport(env);
  const operatorPacket = buildStripeTestExternalPrerequisiteOperatorPacketReport(env);

  evidence.push(`preflight.verdict=${preflight.verdict}`);
  evidence.push(`preActivation.verdict=${preActivation.verdict}`);
  evidence.push(`fixturePack.verdict=${fixtures.verdict}`);
  evidence.push(`fixturePack.definitionsValid=${fixtures.definitionsValid}`);
  evidence.push(`operatorPacket.verdict=${operatorPacket.verdict}`);
  evidence.push(
    `centralIntegrationStillRequired=${STRIPE_TEST_EXTERNAL_PREREQUISITE_CENTRAL_INTEGRATION_STILL_REQUIRED}`
  );

  if (STRIPE_TEST_OFFLINE_PREFLIGHT_PROVIDER_EXECUTION_ENTRYPOINTS.length !== 0) {
    violations.push("OFFLINE_PREFLIGHT_MUST_HAVE_ZERO_PROVIDER_EXECUTION_ENTRYPOINTS");
  }
  if (preflight.networkCalls !== 0 || preflight.stripeCalls !== 0 || preflight.dbWrites !== 0) {
    violations.push("OFFLINE_PREFLIGHT_SAFETY_COUNTERS_MUST_BE_ZERO");
  }
  if (preflight.providerExecutionStarted !== false) {
    violations.push("OFFLINE_PREFLIGHT_MUST_NOT_START_PROVIDER_EXECUTION");
  }
  if (STRIPE_TEST_CONTROLLED_TEST_ACTIVATION_AUTHORIZED !== false) {
    violations.push("PRE_ACTIVATION_MUST_NEVER_AUTHORIZE_ACTIVATION");
  }
  if (!isStripeTestControlledTestPreActivationStructurallySafe(env)) {
    violations.push("PRE_ACTIVATION_STRUCTURAL_SAFETY_MUST_HOLD");
  }
  if (preActivation.activationAuthorized !== false) {
    violations.push("PRE_ACTIVATION_ACTIVATION_AUTHORIZED_MUST_BE_FALSE");
  }
  if (preActivation.networkStripeCalls !== 0 || preActivation.moneyMovement !== 0) {
    violations.push("PRE_ACTIVATION_SAFETY_COUNTERS_MUST_BE_ZERO");
  }
  // Credential-ready is NOT required for code RC; structural fixture validity is.
  if (!fixtures.definitionsValid) {
    violations.push("FIXTURE_PACK_DEFINITIONS_MUST_BE_VALID");
  }
  if (!fixtures.gatesRemainOff) {
    violations.push("FIXTURE_PACK_GATES_MUST_REMAIN_OFF");
  }
  if (STRIPE_TEST_EXTERNAL_PREREQUISITE_OPERATOR_PACKET_ACTIVATION_PERFORMED !== false) {
    violations.push("OPERATOR_PACKET_MUST_NEVER_PERFORM_ACTIVATION");
  }
  if (STRIPE_TEST_EXTERNAL_PREREQUISITE_OPERATOR_PACKET_EXECUTION_AUTHORIZED !== false) {
    violations.push("OPERATOR_PACKET_MUST_NEVER_AUTHORIZE_EXECUTION");
  }
  if (operatorPacket.stripeExecutionAuthorized !== false) {
    violations.push("OPERATOR_PACKET_REPORT_EXECUTION_AUTHORIZED_MUST_BE_FALSE");
  }
  if (operatorPacket.operatorPacketReady !== true) {
    violations.push("OPERATOR_PACKET_CONTRACT_MUST_BE_READY");
  }
  if (operatorPacket.networkStripeCalls !== 0 || operatorPacket.moneyMovement !== 0) {
    violations.push("OPERATOR_PACKET_SAFETY_COUNTERS_MUST_BE_ZERO");
  }
  if (operatorPacket.providerGates !== "OFF") {
    violations.push("OPERATOR_PACKET_PROVIDER_GATES_MUST_BE_OFF");
  }

  const serialized = JSON.stringify({
    preflight,
    preActivation,
    fixtures,
    operatorPacket,
  });
  if (serialized.match(/sk_live_|rk_live_|whsec_[A-Za-z0-9]|BEGIN PRIVATE KEY/)) {
    violations.push("STRIPE_TEST_OFFLINE_SUITE_MUST_NOT_ECHO_LIVE_SECRETS");
  }

  return {
    suite: "stripe_test_offline",
    domains: ["STRIPE_TEST_SAFETY_OFFLINE"],
    pass: violations.length === 0,
    violations,
    evidence,
  };
}

function runRefundProviderRcMatrixSuite(): FinalRegressionSuiteResult {
  const violations: string[] = [];
  const evidence: string[] = [];
  const run = runFullRefundProviderReleaseCandidateSafetyMatrix();

  evidence.push(`rcMatrix.version=${run.version}`);
  evidence.push(`rcMatrix.allPass=${run.allPass}`);
  evidence.push(`rcMatrix.scenarios=${run.scenariosCovered.length}`);
  evidence.push(`rcMatrix.phases=${run.phasesCovered.length}`);

  if (!run.allPass) {
    violations.push("RC_SAFETY_MATRIX_MUST_PASS");
    violations.push(...run.matrixViolations);
  }
  if (run.safety.STRIPE_CALLS !== 0 || run.safety.MONEY_MOVEMENT !== 0) {
    violations.push("RC_MATRIX_SAFETY_COUNTERS_MUST_BE_ZERO");
  }
  if (run.safety.PROVIDER_GATES !== "OFF") {
    violations.push("RC_MATRIX_PROVIDER_GATES_MUST_REMAIN_OFF");
  }
  if (!run.criticalInvariants.succeededCannotExecuteTwice) {
    violations.push("CRITICAL_succeededCannotExecuteTwice");
  }
  if (!run.criticalInvariants.uncertainNotAutomaticallyRetrySafe) {
    violations.push("CRITICAL_uncertainNotAutomaticallyRetrySafe");
  }
  if (!run.criticalInvariants.compensatedCannotSilentlyReplay) {
    violations.push("CRITICAL_compensatedCannotSilentlyReplay");
  }
  if (!run.criticalInvariants.terminalReconciledCannotSilentlyReplay) {
    violations.push("CRITICAL_terminalReconciledCannotSilentlyReplay");
  }
  if (!run.criticalInvariants.stuckCommittingRequiresExplicitRecovery) {
    violations.push("CRITICAL_stuckCommittingRequiresExplicitRecovery");
  }
  if (!run.criticalInvariants.staleUiCannotBypassSafety) {
    violations.push("CRITICAL_staleUiCannotBypassSafety");
  }
  if (!run.criticalInvariants.duplicateCommandCannotSecondProviderMoneyExecution) {
    violations.push("CRITICAL_duplicateCommandCannotSecondProviderMoneyExecution");
  }
  if (!run.e2eMatrixConsumed.allPass) {
    violations.push("CONSUMED_E2E_MATRIX_MUST_PASS");
  }

  const byScenario = Object.fromEntries(run.rows.map((r) => [r.scenario, r]));
  const request = byScenario.REQUEST_PLANNED_NOT_READY;
  const reservation = byScenario.RESERVATION_HELD_NOT_READY;
  const uncertain = byScenario.UNCERTAIN_OUTCOME_NOT_RETRY_SAFE;
  const recovery = byScenario.RECOVERY_STUCK_COMMITTING;
  const compensation = byScenario.COMPENSATION_NO_SILENT_REPLAY;
  const terminal = byScenario.TERMINAL_SUCCEEDED_NO_REPLAY;
  const replay = byScenario.DUPLICATE_REPLAY_AFTER_SUCCESS;

  if (!request || request.EXECUTION_ALLOWED !== false) {
    violations.push("REFUND_RESERVATION_REQUEST_MUST_BLOCK_EXECUTION");
  }
  if (!reservation || reservation.EXECUTION_ALLOWED !== false) {
    violations.push("REFUND_RESERVATION_HELD_MUST_BLOCK_EXECUTION");
  }
  if (
    !uncertain ||
    uncertain.RETRY_SAFE !== false ||
    uncertain.RECONCILIATION_REQUIRED !== true
  ) {
    violations.push("UNCERTAIN_MUST_REQUIRE_RECONCILIATION_AND_NOT_RETRY_SAFE");
  }
  if (!recovery || recovery.RECOVERY_REQUIRED !== true) {
    violations.push("RECOVERY_STUCK_COMMITTING_MUST_REQUIRE_RECOVERY");
  }
  if (!compensation || compensation.REPLAY_ALLOWED !== false) {
    violations.push("COMPENSATION_MUST_BLOCK_SILENT_REPLAY");
  }
  if (!terminal || terminal.REPLAY_ALLOWED !== false) {
    violations.push("TERMINAL_SUCCEEDED_MUST_BLOCK_REPLAY");
  }
  if (!replay || replay.EXECUTION_ALLOWED !== false) {
    violations.push("DUPLICATE_REPLAY_MUST_BLOCK_SECOND_EXECUTION");
  }

  return {
    suite: "refund_provider_rc_matrix",
    domains: [
      "REFUND_RESERVATION",
      "PROVIDER_EXECUTION_SAFETY",
      "UNCERTAIN_OUTCOMES",
      "RECONCILIATION",
      "RECOVERY",
      "COMPENSATION",
      "TERMINAL_STATES",
      "REPLAY_IDEMPOTENCY",
    ],
    pass: violations.length === 0,
    violations,
    evidence,
  };
}

function runObservabilityDiagnosticsSuite(): FinalRegressionSuiteResult {
  const violations: string[] = [];
  const evidence: string[] = [];

  const succeeded = buildProviderMoneyOperatorObservability({
    execution: executionRecord({
      status: "succeeded",
      providerRefundId: "re_final_rc",
      providerStatusSafe: "succeeded",
      startedAtIso: "2026-08-10T07:00:01.000Z",
      completedAtIso: "2026-08-10T07:00:02.000Z",
    }),
    ledgerStatus: "committed",
  });
  const uncertain = buildProviderMoneyOperatorObservability({
    execution: executionRecord({
      status: "uncertain",
      startedAtIso: "2026-08-10T07:00:01.000Z",
      providerStatusSafe: "unknown",
    }),
    ledgerStatus: "committed",
  });
  const absent = buildProviderMoneyOperatorObservabilityAbsent({
    ledgerId: IDS.ledger,
    storeId: IDS.store,
    orderId: IDS.order,
    paymentAttemptId: IDS.payment,
    ledgerStatus: "committed",
  });
  const readiness = buildPartialRefundProviderMoneyReadinessReport(
    offlineSafeHostEnv()
  );

  evidence.push(`obs.succeeded.retrySafe=${succeeded.retrySafe}`);
  evidence.push(
    `obs.uncertain.reconciliationRequired=${uncertain.reconciliationRequired}`
  );
  evidence.push(`obs.absent.executionState=${absent.executionState}`);
  evidence.push(
    `readiness.firstTimeSubmitAllowed=${readiness.firstTimeSubmitAllowed}`
  );
  evidence.push(`readiness.executionMode=${readiness.executionMode}`);

  if (succeeded.retrySafe !== false) {
    violations.push("OBS_SUCCEEDED_MUST_NOT_BE_RETRY_SAFE");
  }
  if (succeeded.moneyExecutionOccurrence !== "confirmed_occurred") {
    violations.push("OBS_SUCCEEDED_MUST_CONFIRM_MONEY_OCCURRED");
  }
  if (uncertain.reconciliationRequired !== true || uncertain.retrySafe !== false) {
    violations.push("OBS_UNCERTAIN_MUST_REQUIRE_RECONCILIATION_AND_BLOCK_RETRY");
  }
  if (absent.executionState !== "none" || absent.retrySafe !== false) {
    violations.push("OBS_ABSENT_MUST_BE_NONE_AND_NOT_RETRY_SAFE");
  }
  if (readiness.firstTimeSubmitAllowed !== false) {
    violations.push("OPERATOR_DIAGNOSTICS_DEFAULT_HOST_MUST_BLOCK_FIRST_TIME_SUBMIT");
  }
  if (readiness.providerInvocationAllowed !== false) {
    violations.push("OPERATOR_DIAGNOSTICS_DEFAULT_HOST_MUST_BLOCK_PROVIDER_INVOCATION");
  }
  if (
    readiness.ledgerCompensated !== false ||
    readiness.commerceConfirmTouched !== false
  ) {
    violations.push("OPERATOR_DIAGNOSTICS_NON_EVENTS_MUST_REMAIN_FALSE");
  }

  const serialized = JSON.stringify({ succeeded, uncertain, absent, readiness });
  if (serialized.match(/sk_(live|test)_|whsec_|client_secret/)) {
    violations.push("OBSERVABILITY_DIAGNOSTICS_MUST_NOT_ECHO_SECRETS");
  }

  return {
    suite: "observability_diagnostics",
    domains: ["OBSERVABILITY", "OPERATOR_DIAGNOSTICS"],
    pass: violations.length === 0,
    violations,
    evidence,
  };
}

function runSellerAdminAuthorizationSuite(): FinalRegressionSuiteResult {
  const violations: string[] = [];
  const evidence: string[] = [];
  const root = process.cwd();

  const ownership = partialRefundProviderMoneyOwnership();
  const adminBlocked = assertAdminProviderMoneyExecuteAllowed(offlineSafeHostEnv());
  const storeMismatch = evaluateFirstTimeProviderMoneyExecuteEligibility({
    ledgerStatus: "committed",
    refundAmountMinor: 1500,
    currency: "USD",
    storeId: IDS.store,
    expectedStoreId: "99999999-9999-4999-8999-999999999999",
    existingExecution: null,
    trustedPaymentIntentId: "pi_3FinalRcFixture0001",
    firstTimeSubmitAllowed: true,
  });
  const cleanEligible = evaluateFirstTimeProviderMoneyExecuteEligibility({
    ledgerStatus: "committed",
    refundAmountMinor: 1500,
    currency: "USD",
    storeId: IDS.store,
    expectedStoreId: IDS.store,
    existingExecution: null,
    trustedPaymentIntentId: "pi_3FinalRcFixture0001",
    firstTimeSubmitAllowed: true,
  });

  evidence.push(`adminBlocked.ok=${adminBlocked.ok}`);
  evidence.push(`storeMismatch.code=${storeMismatch.code}`);
  evidence.push(`cleanEligible.code=${cleanEligible.code}`);
  evidence.push(
    `ownership.ownsPartialRefundProviderRefundExecution=${ownership.ownsPartialRefundProviderRefundExecution}`
  );

  if (adminBlocked.ok !== false) {
    violations.push("ADMIN_EXECUTE_MUST_FAIL_CLOSED_ON_DEFAULT_OFFLINE_HOST");
  }
  if (
    storeMismatch.eligibleToExecute !== false ||
    storeMismatch.code !== "missing_ownership"
  ) {
    violations.push("SELLER_STORE_MISMATCH_MUST_BLOCK_AS_missing_ownership");
  }
  if (cleanEligible.eligibleToExecute !== true || cleanEligible.code !== "eligible") {
    violations.push("AUTHORIZED_OWNER_COMMITTED_LEDGER_MUST_BE_ELIGIBLE");
  }
  if (ownership.ownsAutomaticCompensationOnUncertain !== false) {
    violations.push("OWNERSHIP_MUST_NOT_AUTO_COMPENSATE_UNCERTAIN");
  }
  if (ownership.ownsCommerceConfirmActivation !== false) {
    violations.push("OWNERSHIP_MUST_NOT_OWN_COMMERCE_CONFIRM_ACTIVATION");
  }

  try {
    const actionSrc = readRepo(ACTION);
    if (!actionSrc.includes("adminExecutePartialRefundProviderMoneyAction")) {
      violations.push("ADMIN_ACTION_EXECUTE_MISSING");
    }
    if (!actionSrc.includes("unauthorized")) {
      violations.push("ADMIN_ACTION_UNAUTHORIZED_DENIAL_MISSING");
    }
    if (!actionSrc.includes("requirePlatformAdmin")) {
      violations.push("ADMIN_ACTION_PLATFORM_ADMIN_GUARD_MISSING");
    }
    const executePanel = readRepo(EXECUTE_PANEL);
    const recoveryPanel = readRepo(RECOVERY_PANEL);
    if (!executePanel.includes("data-testid")) {
      violations.push("ADMIN_EXECUTE_PANEL_TESTID_MISSING");
    }
    if (!recoveryPanel.includes("data-testid")) {
      violations.push("ADMIN_RECOVERY_PANEL_TESTID_MISSING");
    }
  } catch (err) {
    violations.push(
      `ADMIN_SURFACE_READ_FAILED:${err instanceof Error ? err.message : String(err)}`
    );
  }

  const forbidden = [
    "PartialRefundProviderMoneyExecutePanel",
    "PartialRefundProviderMoneyRecoveryPanel",
    "adminExecutePartialRefundProviderMoneyAction",
    "adminRecoverPartialRefundProviderMoneyLookupAction",
    "partial-refund-provider-money-execute-panel",
    "partial-refund-provider-money-recovery-panel",
  ];
  const sellerRoots = [
    path.join(root, "app", "components", "store"),
    path.join(root, "app", "store"),
    path.join(root, "app", "s"),
    path.join(root, "app", "(store)"),
  ];
  const hits: string[] = [];
  for (const sellerRoot of sellerRoots) {
    for (const file of walkTsxFiles(sellerRoot)) {
      const text = readFileSync(file, "utf8");
      for (const needle of forbidden) {
        if (text.includes(needle)) {
          hits.push(`${path.relative(root, file)}:${needle}`);
        }
      }
    }
  }
  if (hits.length > 0) {
    violations.push(
      `SELLER_UI_MUST_NOT_WIRE_PROVIDER_MONEY_ACTIONS:${hits.slice(0, 5).join("|")}`
    );
  }

  return {
    suite: "seller_admin_authorization",
    domains: ["SELLER_ADMIN_AUTHORIZATION"],
    pass: violations.length === 0,
    violations,
    evidence,
  };
}

function runHardSafetyCountersSuite(
  suites: FinalRegressionSuiteResult[]
): FinalRegressionSuiteResult {
  const violations: string[] = [];
  const evidence: string[] = [
    "STRIPE_CALLS=0",
    "MONEY_MOVEMENT=0",
    "DB_WRITES=0",
    "MIGRATIONS=0",
    "PROVIDER_GATES=OFF",
  ];

  if (STRIPE_TEST_CONTROL_PLANE_ACTIVATION_PERFORMED !== false) {
    violations.push("PACK_CONTROL_PLANE_ACTIVATION_PERFORMED");
  }
  if (STRIPE_TEST_CONTROLLED_TEST_ACTIVATION_AUTHORIZED !== false) {
    violations.push("PACK_PRE_ACTIVATION_AUTHORIZED");
  }
  if (STRIPE_TEST_EXTERNAL_PREREQUISITE_OPERATOR_PACKET_EXECUTION_AUTHORIZED !== false) {
    violations.push("PACK_OPERATOR_PACKET_EXECUTION_AUTHORIZED");
  }
  for (const suite of suites) {
    if (!suite.pass) {
      evidence.push(`failed_suite=${suite.suite}`);
    }
  }

  return {
    suite: "hard_safety_counters",
    domains: [],
    pass: violations.length === 0,
    violations,
    evidence,
  };
}

/**
 * Run the full Commerce release-candidate final regression pack against tip contracts.
 */
export function runCommerceReleaseCandidateFinalRegressionPack(): FinalRegressionPackRunResult {
  const suites: FinalRegressionSuiteResult[] = [
    runControlPlaneSuite(),
    runStripeTestOfflineSuite(),
    runRefundProviderRcMatrixSuite(),
    runObservabilityDiagnosticsSuite(),
    runSellerAdminAuthorizationSuite(),
  ];
  suites.push(runHardSafetyCountersSuite(suites));

  const coverageMatrix = Object.fromEntries(
    FINAL_REGRESSION_COVERAGE_DOMAINS.map((d) => [d, false])
  ) as Record<FinalRegressionCoverageDomain, boolean>;

  for (const suite of suites) {
    if (!suite.pass) continue;
    for (const domain of suite.domains) {
      coverageMatrix[domain] = true;
    }
  }

  const violations = suites.flatMap((s) =>
    s.violations.map((v) => `${s.suite}:${v}`)
  );
  const missingDomains = FINAL_REGRESSION_COVERAGE_DOMAINS.filter(
    (d) => !coverageMatrix[d]
  );
  if (missingDomains.length > 0) {
    violations.push(`MISSING_DOMAIN_COVERAGE:${missingDomains.join(",")}`);
  }

  const allPass = violations.length === 0 && suites.every((s) => s.pass);
  const blockers = allPass ? [] : [...violations];

  const notes = [
    "COMMERCE_CODE_RELEASE_CANDIDATE reflects offline TEST-ONLY pack results on tip contracts.",
    "Does not imply STRIPE_TEST_READY, PRODUCTION_READY, or controlled Stripe TEST execution.",
    "A2 stripeTestActivation* / dependency-chain proof files are intentionally out of scope.",
    `Central SM/dry-run integration still required flag=${STRIPE_TEST_EXTERNAL_PREREQUISITE_CENTRAL_INTEGRATION_STILL_REQUIRED}`,
  ];

  return {
    version: COMMERCE_RELEASE_CANDIDATE_FINAL_REGRESSION_PACK_VERSION,
    environment: COMMERCE_RELEASE_CANDIDATE_FINAL_REGRESSION_PACK_ENVIRONMENT,
    suites,
    domainsCovered: [...FINAL_REGRESSION_COVERAGE_DOMAINS],
    coverageMatrix,
    allPass,
    violations,
    COMMERCE_CODE_RELEASE_CANDIDATE: allPass ? "YES" : "NO",
    blockers,
    notes,
    safety: {
      STRIPE_CALLS: 0,
      MONEY_MOVEMENT: 0,
      DB_WRITES: 0,
      MIGRATIONS: 0,
      PROVIDER_GATES: "OFF",
    },
  };
}
