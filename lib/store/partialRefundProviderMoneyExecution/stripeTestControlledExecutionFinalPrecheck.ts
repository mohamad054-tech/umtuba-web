/**
 * Stripe TEST controlled-execution FINAL PRECHECK — migration-independent ZERO-MONEY.
 *
 * Determines whether Commerce is ready for ONE separately authorized, controlled
 * Stripe TEST execution. THIS MODULE DOES NOT EXECUTE STRIPE.
 *
 * STRIPE_CALLS=0 / MONEY_MOVEMENT=0 / DB_WRITES=0 / PROVIDER_GATES=OFF.
 * Secrets never appear in reports (names / booleans / reason codes only).
 */

import {
  STRIPE_TEST_ACTIVATION_DRY_RUN_ACTIVATION_PERFORMED,
  buildStripeTestActivationDryRunReport,
  verifyStripeTestActivationDryRunGuards,
  type StripeTestActivationDryRunVerification,
} from "./stripeTestActivationDryRunOrchestration";
import {
  STRIPE_TEST_ACTIVATION_OPERATOR_AUTHORIZED,
  STRIPE_TEST_ACTIVATION_PERFORMED,
} from "./stripeTestActivationStateMachine";
import {
  STRIPE_TEST_CONTROL_PLANE_ACTIVATION_PERFORMED,
  buildStripeTestControlPlaneReport,
  type StripeTestControlPlaneReport,
} from "./stripeTestControlPlaneHardening";
import { STRIPE_TEST_CONTROLLED_TEST_ACTIVATION_AUTHORIZED } from "./stripeTestControlledTestPreActivationSafety";
import {
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV,
  evaluatePartialRefundProviderMoneyGate,
} from "./gate";
import {
  PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_ENV,
  readPartialRefundProviderMoneyExecutionMode,
} from "./executionMode";
import {
  STRIPE_TEST_FIXTURE_PACK_ENVIRONMENT,
  getStripeTestFixturePackDefinitions,
  isStripeTestFixturePackReadyForControlledValidation,
} from "./stripeTestFixturePack";

export const STRIPE_TEST_CONTROLLED_EXECUTION_FINAL_PRECHECK_VERSION =
  "commerce-stripe-test-controlled-execution-final-precheck-v1" as const;

export const STRIPE_TEST_CONTROLLED_EXECUTION_FINAL_PRECHECK_ENVIRONMENT =
  "isolated_stripe_test_controlled_execution_final_precheck_v1_not_production" as const;

/** Structural non-capability: final precheck never executes Stripe. */
export const STRIPE_TEST_CONTROLLED_EXECUTION_FINAL_PRECHECK_ACTIVATION_PERFORMED =
  false as const;

/** Structural non-capability: no provider execution entrypoints. */
export const STRIPE_TEST_CONTROLLED_EXECUTION_FINAL_PRECHECK_PROVIDER_EXECUTION_ENTRYPOINTS =
  [] as const;

export const STRIPE_TEST_CONTROLLED_EXECUTION_FINAL_PRECHECK_VERDICTS = [
  "READY_FOR_CONTROLLED_STRIPE_TEST_EXECUTION",
  "NOT_READY_FOR_CONTROLLED_STRIPE_TEST_EXECUTION",
] as const;

export type StripeTestControlledExecutionFinalPrecheckVerdict =
  (typeof STRIPE_TEST_CONTROLLED_EXECUTION_FINAL_PRECHECK_VERDICTS)[number];

export const STRIPE_TEST_CONTROLLED_EXECUTION_FINAL_PRECHECK_GATES = [
  "TEST_CREDENTIALS_AVAILABLE",
  "TEST_MODE_CONFIRMED",
  "LIVE_MODE_BLOCKED",
  "FIXTURES_READY",
  "CONTROL_PLANE_READY",
  "STATE_MACHINE_READY",
  "NEGATIVE_PATHS_READY",
  "DRY_RUN_READY",
  "ROLLBACK_READY",
  "OPERATOR_RUNBOOK_READY",
  "PROVIDER_GATES_OFF",
] as const;

export type StripeTestControlledExecutionFinalPrecheckGate =
  (typeof STRIPE_TEST_CONTROLLED_EXECUTION_FINAL_PRECHECK_GATES)[number];

export type StripeTestControlledExecutionFinalPrecheckGateResult = {
  gate: StripeTestControlledExecutionFinalPrecheckGate;
  ready: boolean;
  /** Operator-safe reason code — never secret values. */
  reasonCode: string;
};

export type StripeTestControlledExecutionFinalPrecheckSotIntegration = {
  /**
   * Authoritative Commerce SoT tip FULL SHA at audit time.
   * Informational only — never used to call remotes.
   */
  commerceSotTipSha: string;
  /** Fixture pack (code) present/ancestor on Commerce SoT tip. */
  fixturePackOnCommerceSotTip: boolean;
  /** Control-plane hardening present on Commerce SoT tip. */
  controlPlaneOnCommerceSotTip: boolean;
  /** Offline preflight present on Commerce SoT tip. */
  offlinePreflightOnCommerceSotTip: boolean;
  /** Env-readiness pack present on Commerce SoT tip. */
  envReadinessOnCommerceSotTip: boolean;
  /** Activation state machine (+ regression) present on Commerce SoT tip. */
  stateMachineOnCommerceSotTip: boolean;
  /** Dry-run orchestration present on Commerce SoT tip. */
  dryRunOnCommerceSotTip: boolean;
};

/**
 * Operator-declared money-fixture readiness (NOT inferred from code-only packs).
 * Defaults false — synthetic fixture pack alone does not authorize execution.
 */
export type StripeTestControlledExecutionFinalPrecheckOperatorFixtures = {
  capturedTestPaymentIntentReady: boolean;
  matchingPaymentAttemptCaptureFactsReady: boolean;
  committedPartialRefundLedgerReady: boolean;
  zeroProviderExecutionRowsForLedger: boolean;
  isolatedSupabaseOrExplicitMoneyFixtureGo: boolean;
};

export type StripeTestControlledExecutionFinalPrecheckInput = {
  /** Host / operator env under audit (defaults empty — never reads secret bodies into output). */
  env?: Record<string, string | undefined>;
  sotIntegration?: Partial<StripeTestControlledExecutionFinalPrecheckSotIntegration>;
  operatorFixtures?: Partial<StripeTestControlledExecutionFinalPrecheckOperatorFixtures>;
  /**
   * Operator runbook for future controlled execution is published with this pack.
   * Defaults true when evaluating this module's own ship.
   */
  operatorRunbookPublished?: boolean;
};

export type StripeTestControlledExecutionFinalPrecheckReport = {
  version: typeof STRIPE_TEST_CONTROLLED_EXECUTION_FINAL_PRECHECK_VERSION;
  environment: typeof STRIPE_TEST_CONTROLLED_EXECUTION_FINAL_PRECHECK_ENVIRONMENT;
  verdict: StripeTestControlledExecutionFinalPrecheckVerdict;
  gates: StripeTestControlledExecutionFinalPrecheckGateResult[];
  /** Real remaining blockers only — empty when READY. */
  blockers: string[];
  sotIntegration: StripeTestControlledExecutionFinalPrecheckSotIntegration;
  operatorFixtures: StripeTestControlledExecutionFinalPrecheckOperatorFixtures;
  controlPlaneStatusOnHost: StripeTestControlPlaneReport["status"];
  controlPlaneStatusOnSyntheticReady: StripeTestControlPlaneReport["status"];
  dryRunHappyPathPassedSynthetic: boolean;
  dryRunAllVerificationsPassedSynthetic: boolean;
  waitingForStateMachineIntegration: boolean;
  networkStripeCalls: 0;
  moneyMovement: 0;
  productionDbWrites: 0;
  providerGates: "OFF";
  activationPerformed: false;
  stripeActivated: "NO";
  operatorActivationAuthorized: false;
  providerExecutionStartCapable: false;
  /**
   * Future operator checklist — present only when READY.
   * Never executed by this module.
   */
  futureOperatorExecutionChecklist: string[] | null;
  note: string;
};

type EnvSource = Record<string, string | undefined>;

const REQUIRED_TEST_CREDENTIAL_NAMES = [
  "STRIPE_MODE",
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_APP_URL",
] as const;

/**
 * Synthetic NON-SECRET fixtures used only to prove pack/negative/rollback readiness.
 * Must never appear in report payloads.
 */
const SYNTHETIC_READY_SECRET =
  "sk_test_FINAL_PRECHECK_FAKE_SECRET_VALUE_NOT_A_SECRET";
const SYNTHETIC_READY_PUBLISHABLE =
  "pk_test_FINAL_PRECHECK_FAKE_PUBLISHABLE_VALUE_NOT_A_SECRET";
const SYNTHETIC_READY_WEBHOOK =
  "whsec_FINAL_PRECHECK_FAKE_WEBHOOK_VALUE_NOT_A_SECRET";
const SYNTHETIC_LIVE_SECRET =
  "sk_live_FINAL_PRECHECK_FAKE_LIVE_SECRET_VALUE_NOT_A_SECRET";
const SYNTHETIC_LIVE_PUBLISHABLE =
  "pk_live_FINAL_PRECHECK_FAKE_PUBLISHABLE_VALUE_NOT_A_SECRET";

const SYNTHETIC_FORBIDDEN = [
  SYNTHETIC_READY_SECRET,
  SYNTHETIC_READY_PUBLISHABLE,
  SYNTHETIC_READY_WEBHOOK,
  SYNTHETIC_LIVE_SECRET,
  SYNTHETIC_LIVE_PUBLISHABLE,
];

/** Current authoritative Commerce SoT tip observed 2026-08-10 after fetch. */
export const STRIPE_TEST_CONTROLLED_EXECUTION_FINAL_PRECHECK_DEFAULT_SOT: StripeTestControlledExecutionFinalPrecheckSotIntegration =
  {
    commerceSotTipSha: "5bce626406691d3e64f352ad14c186d5ac7dbe9b",
    fixturePackOnCommerceSotTip: true,
    controlPlaneOnCommerceSotTip: true,
    offlinePreflightOnCommerceSotTip: true,
    envReadinessOnCommerceSotTip: false,
    stateMachineOnCommerceSotTip: false,
    dryRunOnCommerceSotTip: false,
  };

export const STRIPE_TEST_CONTROLLED_EXECUTION_FINAL_PRECHECK_DEFAULT_OPERATOR_FIXTURES: StripeTestControlledExecutionFinalPrecheckOperatorFixtures =
  {
    capturedTestPaymentIntentReady: false,
    matchingPaymentAttemptCaptureFactsReady: false,
    committedPartialRefundLedgerReady: false,
    zeroProviderExecutionRowsForLedger: false,
    isolatedSupabaseOrExplicitMoneyFixtureGo: false,
  };

function readEnv(source: EnvSource, name: string): string {
  const v = source[name];
  return typeof v === "string" ? v.trim() : "";
}

function resolvePublishable(source: EnvSource): string {
  return (
    readEnv(source, "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY") ||
    readEnv(source, "STRIPE_PUBLISHABLE_KEY")
  );
}

function resolveAppUrl(source: EnvSource): string {
  return (
    readEnv(source, "NEXT_PUBLIC_APP_URL") ||
    readEnv(source, "APP_ORIGIN") ||
    readEnv(source, "NEXT_PUBLIC_SITE_URL")
  );
}

function syntheticReadyEnv(): EnvSource {
  return {
    STRIPE_MODE: "test",
    STRIPE_SECRET_KEY: SYNTHETIC_READY_SECRET,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: SYNTHETIC_READY_PUBLISHABLE,
    STRIPE_WEBHOOK_SECRET: SYNTHETIC_READY_WEBHOOK,
    NEXT_PUBLIC_APP_URL: "https://example.test",
  };
}

function assertStructuralAuthFalse(): void {
  if (
    STRIPE_TEST_ACTIVATION_OPERATOR_AUTHORIZED !== false ||
    STRIPE_TEST_CONTROLLED_TEST_ACTIVATION_AUTHORIZED !== false ||
    STRIPE_TEST_ACTIVATION_PERFORMED !== false ||
    STRIPE_TEST_CONTROL_PLANE_ACTIVATION_PERFORMED !== false ||
    STRIPE_TEST_ACTIVATION_DRY_RUN_ACTIVATION_PERFORMED !== false ||
    STRIPE_TEST_CONTROLLED_EXECUTION_FINAL_PRECHECK_ACTIVATION_PERFORMED !==
      false
  ) {
    throw new Error(
      "stripe_test_controlled_execution_final_precheck_structural_authorization_must_remain_false"
    );
  }
}

function assertNoSecretEcho(payload: unknown): void {
  const blob = JSON.stringify(payload);
  for (const s of SYNTHETIC_FORBIDDEN) {
    if (blob.includes(s)) {
      throw new Error(
        "stripe_test_controlled_execution_final_precheck_secret_echo_detected"
      );
    }
  }
  if (
    blob.includes("sk_test_") ||
    blob.includes("pk_test_") ||
    blob.includes("sk_live_") ||
    blob.includes("pk_live_") ||
    blob.includes("whsec_")
  ) {
    throw new Error(
      "stripe_test_controlled_execution_final_precheck_key_prefix_echo_detected"
    );
  }
}

function credentialsPresent(source: EnvSource): boolean {
  const secret = readEnv(source, "STRIPE_SECRET_KEY");
  const publishable = resolvePublishable(source);
  const webhook = readEnv(source, "STRIPE_WEBHOOK_SECRET");
  const appUrl = resolveAppUrl(source);
  const mode = readEnv(source, "STRIPE_MODE");
  return Boolean(secret && publishable && webhook && appUrl && mode);
}

function testModeConfirmed(source: EnvSource): boolean {
  const mode = readEnv(source, "STRIPE_MODE").toLowerCase();
  const secret = readEnv(source, "STRIPE_SECRET_KEY");
  const publishable = resolvePublishable(source);
  if (mode !== "test") return false;
  if (!secret.startsWith("sk_test_")) return false;
  if (!publishable.startsWith("pk_test_")) return false;
  return true;
}

function liveModeBlocked(source: EnvSource): boolean {
  const mode = readEnv(source, "STRIPE_MODE").toLowerCase();
  const secret = readEnv(source, "STRIPE_SECRET_KEY");
  const publishable = resolvePublishable(source);
  if (mode === "live") return false;
  if (secret.startsWith("sk_live_")) return false;
  if (publishable.startsWith("pk_live_")) return false;
  if (readEnv(source, PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_ENV)) {
    return false;
  }
  return true;
}

function providerGatesOff(source: EnvSource): boolean {
  const gate = evaluatePartialRefundProviderMoneyGate(source);
  const mode = readPartialRefundProviderMoneyExecutionMode(source);
  const prodAck = readEnv(
    source,
    PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_ENV
  );
  return (
    gate.providerMoneyEnabled !== true &&
    mode === "off" &&
    !prodAck &&
    !readEnv(source, PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV) &&
    !readEnv(source, PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV) &&
    !readEnv(source, PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV)
  );
}

function operatorFixturesReady(
  fixtures: StripeTestControlledExecutionFinalPrecheckOperatorFixtures
): boolean {
  return (
    fixtures.capturedTestPaymentIntentReady &&
    fixtures.matchingPaymentAttemptCaptureFactsReady &&
    fixtures.committedPartialRefundLedgerReady &&
    fixtures.zeroProviderExecutionRowsForLedger &&
    fixtures.isolatedSupabaseOrExplicitMoneyFixtureGo
  );
}

function codeFixtureDefinitionsReady(): boolean {
  const defs = getStripeTestFixturePackDefinitions();
  return (
    defs.environment === STRIPE_TEST_FIXTURE_PACK_ENVIRONMENT &&
    typeof defs.paymentIntentRef === "string" &&
    defs.paymentIntentRef.startsWith("pi_") &&
    defs.capturedAmountMinor > 0 &&
    defs.refundAmountMinor > 0 &&
    defs.refundAmountMinor <= defs.capturedAmountMinor
  );
}

function buildSyntheticDryRunArtifacts(): {
  dryRunHappyPathPassed: boolean;
  dryRunAllVerificationsPassed: boolean;
  verifications: StripeTestActivationDryRunVerification;
  controlPlaneSynthetic: StripeTestControlPlaneReport;
} {
  const readySource = syntheticReadyEnv();
  const missingCredentialSource: EnvSource = {
    STRIPE_MODE: "test",
    STRIPE_SECRET_KEY: SYNTHETIC_READY_SECRET,
  };
  const liveSource: EnvSource = {
    ...readySource,
    STRIPE_MODE: "live",
    STRIPE_SECRET_KEY: SYNTHETIC_LIVE_SECRET,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: SYNTHETIC_LIVE_PUBLISHABLE,
  };
  const invalidPrecheckSource: EnvSource = {
    ...readySource,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: SYNTHETIC_LIVE_PUBLISHABLE,
  };

  const verifications = verifyStripeTestActivationDryRunGuards({
    readySource,
    missingCredentialSource,
    liveSource,
    invalidPrecheckSource,
    forbiddenSecretValues: SYNTHETIC_FORBIDDEN,
  });
  const dryRun = buildStripeTestActivationDryRunReport({
    readySource,
    missingCredentialSource,
    liveSource,
    invalidPrecheckSource,
    forbiddenSecretValues: SYNTHETIC_FORBIDDEN,
    waitingForStateMachineIntegration: true,
  });
  const controlPlaneSynthetic = buildStripeTestControlPlaneReport(readySource);

  return {
    dryRunHappyPathPassed: dryRun.happyPathPassed,
    dryRunAllVerificationsPassed: dryRun.allVerificationsPassed,
    verifications,
    controlPlaneSynthetic,
  };
}

export function buildFutureOperatorControlledStripeTestExecutionChecklist(): string[] {
  return [
    "CONFIRM separate coordinator GO written for ONE controlled Stripe TEST execution (this precheck does not authorize).",
    "CONFIRM Commerce SoT tip includes activation SM + regression + dry-run orchestration (clear WAITING_FOR_STATE_MACHINE_INTEGRATION).",
    "CONFIRM env-readiness pack is on Commerce SoT tip OR equivalent probe is available on the execution host.",
    "Place isolated Stripe TEST credentials in local .env.local only (never commit): STRIPE_MODE=test, TEST secret/publishable/webhook prefixes, app origin.",
    "CONFIRM LIVE keys absent and UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK absent.",
    "Re-run offline preflight + control-plane report → expect READY; gates still OFF before GO window.",
    "Re-run activation dry-run happy path + negative-path verifications → all PASS; still no Stripe network.",
    "Prepare operator money fixtures: captured TEST PaymentIntent, matching payment_attempt/capture facts, committed partial-refund ledger (amount>0, currency match, ≤ captured), zero provider-execution rows, isolated Supabase or explicit money-fixture GO.",
    "Open a short GO window: temporarily enable provider-money TEST gate/mode per runbook; keep PRODUCTION_EXEC_ACK absent.",
    "Execute ONE controlled Stripe TEST refund path only; record provider refs / ledger / reconciliation evidence.",
    "Immediately DEACTIVATE / RESET activation SM to DISABLED; set provider gates and execution mode back OFF; remove temporary GO acks.",
    "Rollback if any stop condition trips: DEACTIVATE → RESET → gates OFF; do not retry without a new written GO.",
  ];
}

/**
 * Build final precheck report. Never executes Stripe / never enables gates.
 */
export function buildStripeTestControlledExecutionFinalPrecheckReport(
  input: StripeTestControlledExecutionFinalPrecheckInput = {}
): StripeTestControlledExecutionFinalPrecheckReport {
  assertStructuralAuthFalse();

  const hostEnv: EnvSource = input.env ?? {};
  const sot: StripeTestControlledExecutionFinalPrecheckSotIntegration = {
    ...STRIPE_TEST_CONTROLLED_EXECUTION_FINAL_PRECHECK_DEFAULT_SOT,
    ...input.sotIntegration,
  };
  const operatorFixtures: StripeTestControlledExecutionFinalPrecheckOperatorFixtures =
    {
      ...STRIPE_TEST_CONTROLLED_EXECUTION_FINAL_PRECHECK_DEFAULT_OPERATOR_FIXTURES,
      ...input.operatorFixtures,
    };
  const operatorRunbookPublished = input.operatorRunbookPublished !== false;

  const controlPlaneHost = buildStripeTestControlPlaneReport(hostEnv);
  const synthetic = buildSyntheticDryRunArtifacts();
  const fixturePackReadyWithSynthetic =
    isStripeTestFixturePackReadyForControlledValidation(syntheticReadyEnv());

  const waitingForStateMachineIntegration =
    !sot.stateMachineOnCommerceSotTip || !sot.dryRunOnCommerceSotTip;

  const gates: StripeTestControlledExecutionFinalPrecheckGateResult[] = [
    {
      gate: "TEST_CREDENTIALS_AVAILABLE",
      ready: credentialsPresent(hostEnv),
      reasonCode: credentialsPresent(hostEnv)
        ? "test_credential_names_present"
        : "blocked_missing_test_credentials",
    },
    {
      gate: "TEST_MODE_CONFIRMED",
      ready: testModeConfirmed(hostEnv),
      reasonCode: testModeConfirmed(hostEnv)
        ? "stripe_mode_test_and_test_key_prefixes"
        : "blocked_test_mode_not_confirmed",
    },
    {
      gate: "LIVE_MODE_BLOCKED",
      ready: liveModeBlocked(hostEnv),
      reasonCode: liveModeBlocked(hostEnv)
        ? "live_mode_and_live_keys_blocked"
        : "blocked_live_mode_or_live_credentials_detected",
    },
    {
      gate: "FIXTURES_READY",
      ready:
        codeFixtureDefinitionsReady() &&
        fixturePackReadyWithSynthetic &&
        operatorFixturesReady(operatorFixtures) &&
        sot.fixturePackOnCommerceSotTip,
      reasonCode:
        codeFixtureDefinitionsReady() &&
        fixturePackReadyWithSynthetic &&
        operatorFixturesReady(operatorFixtures) &&
        sot.fixturePackOnCommerceSotTip
          ? "code_and_operator_money_fixtures_ready"
          : "blocked_operator_money_fixtures_or_fixture_pack_gap",
    },
    {
      gate: "CONTROL_PLANE_READY",
      ready:
        sot.controlPlaneOnCommerceSotTip &&
        sot.offlinePreflightOnCommerceSotTip &&
        synthetic.controlPlaneSynthetic.status === "READY",
      reasonCode:
        sot.controlPlaneOnCommerceSotTip &&
        sot.offlinePreflightOnCommerceSotTip &&
        synthetic.controlPlaneSynthetic.status === "READY"
          ? "control_plane_ready_on_sot_synthetic_proof"
          : "blocked_control_plane_not_ready_or_not_on_sot",
    },
    {
      gate: "STATE_MACHINE_READY",
      ready: sot.stateMachineOnCommerceSotTip,
      reasonCode: sot.stateMachineOnCommerceSotTip
        ? "activation_state_machine_on_commerce_sot_tip"
        : "blocked_waiting_for_state_machine_integration",
    },
    {
      gate: "NEGATIVE_PATHS_READY",
      ready: synthetic.dryRunAllVerificationsPassed === true,
      reasonCode: synthetic.dryRunAllVerificationsPassed
        ? "dry_run_negative_path_verifications_passed"
        : "blocked_negative_path_verifications_incomplete",
    },
    {
      gate: "DRY_RUN_READY",
      ready:
        synthetic.dryRunHappyPathPassed === true &&
        synthetic.dryRunAllVerificationsPassed === true &&
        sot.dryRunOnCommerceSotTip,
      reasonCode:
        synthetic.dryRunHappyPathPassed &&
        synthetic.dryRunAllVerificationsPassed &&
        sot.dryRunOnCommerceSotTip
          ? "dry_run_ready_on_commerce_sot_tip"
          : "blocked_dry_run_not_on_sot_or_not_passing",
    },
    {
      gate: "ROLLBACK_READY",
      ready:
        synthetic.verifications.deactivationPathDeterministic === true &&
        synthetic.verifications.failedTransitionFailClosed === true,
      reasonCode:
        synthetic.verifications.deactivationPathDeterministic &&
        synthetic.verifications.failedTransitionFailClosed
          ? "deactivation_and_fail_closed_rollback_paths_ready"
          : "blocked_rollback_paths_not_proven",
    },
    {
      gate: "OPERATOR_RUNBOOK_READY",
      ready: operatorRunbookPublished,
      reasonCode: operatorRunbookPublished
        ? "final_precheck_operator_runbook_published"
        : "blocked_operator_runbook_missing",
    },
    {
      gate: "PROVIDER_GATES_OFF",
      ready: providerGatesOff(hostEnv),
      reasonCode: providerGatesOff(hostEnv)
        ? "provider_gates_and_execution_mode_off"
        : "blocked_provider_gates_or_execution_mode_not_off",
    },
  ];

  const extraBlockers: string[] = [];
  if (!sot.envReadinessOnCommerceSotTip) {
    extraBlockers.push(
      "ENV_READINESS_PACK_NOT_ON_COMMERCE_SOT_TIP — integrate office/desktop-a2-stripe-test-fixture-env-readiness-v1 (386b382) or equivalent before controlled execution."
    );
  }
  if (waitingForStateMachineIntegration) {
    extraBlockers.push(
      "WAITING_FOR_STATE_MACHINE_INTEGRATION — SM 03b45a1 + regression 1ad060c + dry-run f0511c3 are not ancestors of Commerce SoT tip; do not execute from SoT until integrated."
    );
  }
  if (!operatorFixturesReady(operatorFixtures)) {
    extraBlockers.push(
      "OPERATOR_MONEY_FIXTURES_MISSING — captured TEST PaymentIntent, matching payment/capture facts, committed ledger, zero provider-execution rows, and isolated Supabase/money-fixture GO are not confirmed."
    );
  }
  if (!credentialsPresent(hostEnv) || !testModeConfirmed(hostEnv)) {
    extraBlockers.push(
      "TEST_CREDENTIALS_UNAVAILABLE — host has no confirmed isolated Stripe TEST credentials (STRIPE_MODE=test + TEST secret/publishable/webhook prefixes + app origin). Names-only; never commit secrets."
    );
  }

  const allGatesReady = gates.every((g) => g.ready);
  const verdict: StripeTestControlledExecutionFinalPrecheckVerdict = allGatesReady
    ? "READY_FOR_CONTROLLED_STRIPE_TEST_EXECUTION"
    : "NOT_READY_FOR_CONTROLLED_STRIPE_TEST_EXECUTION";

  const blockers =
    verdict === "READY_FOR_CONTROLLED_STRIPE_TEST_EXECUTION"
      ? []
      : [
          ...new Set([
            ...gates
              .filter((g) => !g.ready)
              .map((g) => `${g.gate}:${g.reasonCode}`),
            ...extraBlockers,
          ]),
        ];

  const report: StripeTestControlledExecutionFinalPrecheckReport = {
    version: STRIPE_TEST_CONTROLLED_EXECUTION_FINAL_PRECHECK_VERSION,
    environment: STRIPE_TEST_CONTROLLED_EXECUTION_FINAL_PRECHECK_ENVIRONMENT,
    verdict,
    gates,
    blockers,
    sotIntegration: sot,
    operatorFixtures,
    controlPlaneStatusOnHost: controlPlaneHost.status,
    controlPlaneStatusOnSyntheticReady: synthetic.controlPlaneSynthetic.status,
    dryRunHappyPathPassedSynthetic: synthetic.dryRunHappyPathPassed,
    dryRunAllVerificationsPassedSynthetic:
      synthetic.dryRunAllVerificationsPassed,
    waitingForStateMachineIntegration,
    networkStripeCalls: 0,
    moneyMovement: 0,
    productionDbWrites: 0,
    providerGates: "OFF",
    activationPerformed: false,
    stripeActivated: "NO",
    operatorActivationAuthorized: false,
    providerExecutionStartCapable: false,
    futureOperatorExecutionChecklist:
      verdict === "READY_FOR_CONTROLLED_STRIPE_TEST_EXECUTION"
        ? buildFutureOperatorControlledStripeTestExecutionChecklist()
        : null,
    note:
      "Final precheck only. No Stripe network. No money movement. No DB writes. No provider activation. Structural operatorActivationAuthorized remains false — a separate coordinator GO is required after all gates are READY.",
  };

  assertNoSecretEcho(report);
  return report;
}

export function isReadyForControlledStripeTestExecution(
  input: StripeTestControlledExecutionFinalPrecheckInput = {}
): boolean {
  return (
    buildStripeTestControlledExecutionFinalPrecheckReport(input).verdict ===
    "READY_FOR_CONTROLLED_STRIPE_TEST_EXECUTION"
  );
}

/** Exported for tests / audits — required credential env NAMES only. */
export const STRIPE_TEST_CONTROLLED_EXECUTION_FINAL_PRECHECK_REQUIRED_ENV_NAMES =
  REQUIRED_TEST_CREDENTIAL_NAMES;
