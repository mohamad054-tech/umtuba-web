/**
 * Stripe TEST offline CONTROL PLANE hardening — migration-independent ZERO-MONEY.
 *
 * Deterministic local/offline gate before any controlled Stripe TEST activation GO.
 * Answers, without network or secret echo:
 * - required TEST configuration names present?
 * - mode TEST? LIVE disabled?
 * - provider gates correct starting state?
 * - fixtures valid?
 * - can activation proceed?
 * - why blocked? which prerequisite missing?
 *
 * Status contract: READY | NOT_READY with machine-readable reasons.
 *
 * Hard guarantees:
 * - NETWORK_STRIPE_CALLS = 0 / MONEY_MOVEMENT = 0 / PRODUCTION_DB_WRITES = 0
 * - Never activates provider / never enables gates or modes
 * - Secrets never appear in logs, errors, or result payloads
 * - Unit/regression tests do not require real credentials
 */

import {
  STRIPE_TEST_CONTROLLED_TEST_ACTIVATION_AUTHORIZED,
  buildStripeTestControlledTestPreActivationSafetyReport,
  type StripeTestControlledTestPreActivationReport,
} from "./stripeTestControlledTestPreActivationSafety";
import {
  STRIPE_TEST_OFFLINE_PREFLIGHT_REQUIRED_ENV_NAMES,
  buildStripeTestOfflinePreflightReport,
  type StripeTestOfflinePreflightReport,
} from "./stripeTestOfflinePreflightValidator";

export const STRIPE_TEST_CONTROL_PLANE_HARDENING_VERSION =
  "commerce-stripe-test-control-plane-hardening-v1" as const;

export const STRIPE_TEST_CONTROL_PLANE_ENVIRONMENT =
  "isolated_stripe_test_control_plane_hardening_v1_not_production" as const;

/** Structural non-capability: this module never performs activation. */
export const STRIPE_TEST_CONTROL_PLANE_ACTIVATION_PERFORMED = false as const;

/** Structural non-capability: no provider execution entrypoints. */
export const STRIPE_TEST_CONTROL_PLANE_PROVIDER_EXECUTION_ENTRYPOINTS =
  [] as const;

export type StripeTestControlPlaneStatus = "READY" | "NOT_READY";

export type StripeTestControlPlaneAnswers = {
  /** required TEST configuration names present? */
  requiredTestConfigurationNamesPresent: boolean;
  /** mode TEST? */
  modeTest: boolean;
  /** LIVE disabled? */
  liveDisabled: boolean;
  /** provider gates correct starting state? */
  providerGatesCorrectStartingState: boolean;
  /** fixtures valid? */
  fixturesValid: boolean;
  /**
   * can activation proceed?
   * True only when status === READY (prerequisites satisfied for a separate
   * coordinator activation GO). This module never activates.
   */
  canActivationProceed: boolean;
};

export type StripeTestControlPlaneMissingPrerequisite = {
  /** Machine-safe prerequisite id — never secret values. */
  code: string;
  /** Operator-safe explanation — never secret values. */
  message: string;
};

export type StripeTestControlPlaneAcceptanceMatrix = {
  networkStripeCalls: 0;
  moneyMovement: 0;
  productionDbWrites: 0;
  providerGatesOff: boolean;
  liveDisabled: boolean;
  fixturesValid: boolean;
  requiredConfigNamesPresent: boolean;
  modeTest: boolean;
  activationPerformed: false;
  providerExecutionStartCapable: false;
  secretsNeverEchoed: true;
};

export type StripeTestControlPlaneReport = {
  version: typeof STRIPE_TEST_CONTROL_PLANE_HARDENING_VERSION;
  environment: typeof STRIPE_TEST_CONTROL_PLANE_ENVIRONMENT;
  /** Deterministic control-plane status. */
  status: StripeTestControlPlaneStatus;
  answers: StripeTestControlPlaneAnswers;
  /** Machine-readable block reasons (empty when READY). */
  reasons: string[];
  /** Structured missing prerequisites (empty when READY). */
  missingPrerequisites: StripeTestControlPlaneMissingPrerequisite[];
  networkStripeCalls: 0;
  moneyMovement: 0;
  productionDbWrites: 0;
  providerGates: "OFF";
  activationPerformed: false;
  activationAuthorizedByControlPlane: false;
  providerExecutionStarted: false;
  providerExecutionStartCapable: false;
  requiredEnvNames: readonly string[];
  acceptanceMatrix: StripeTestControlPlaneAcceptanceMatrix;
  /** Nested offline preflight verdict (names/booleans only). */
  offlinePreflightVerdict: StripeTestOfflinePreflightReport["verdict"];
  /** Nested pre-activation verdict (names/booleans only). */
  preActivationVerdict: StripeTestControlledTestPreActivationReport["verdict"];
  note: string;
};

type EnvSource = Record<string, string | undefined>;

function pushMissing(
  missing: StripeTestControlPlaneMissingPrerequisite[],
  reasons: string[],
  code: string,
  message: string
): void {
  missing.push({ code, message });
  reasons.push(code);
}

/**
 * Build the offline Stripe TEST control-plane report.
 * Never mutates process.env. Never enables gates/modes. Never calls Stripe.
 * Never returns credential values — only names, booleans, and reason codes.
 *
 * READY requires:
 * - all required TEST config names present
 * - STRIPE_MODE=test and LIVE disabled / no live key prefixes
 * - provider gates OFF / execution mode off / production ACK absent
 * - fixtures schema-valid + deterministic
 * - offline preflight pass
 * - pre-activation structurally safe
 *
 * READY does NOT activate the provider. A separate coordinator GO is required.
 */
export function buildStripeTestControlPlaneReport(
  source: EnvSource = process.env
): StripeTestControlPlaneReport {
  const offline = buildStripeTestOfflinePreflightReport(source);
  const preActivation = buildStripeTestControlledTestPreActivationSafetyReport(
    source
  );

  const requiredTestConfigurationNamesPresent =
    offline.credentialPresence.allRequiredPresent;
  const modeTest = offline.modeChecks.testModeSelected;
  const liveDisabled =
    !offline.modeChecks.liveModeSelected &&
    !offline.modeChecks.secretKeyLooksLive &&
    !offline.modeChecks.publishableKeyLooksLive &&
    !offline.modeChecks.obviousTestLiveMismatch;
  const providerGatesCorrectStartingState =
    offline.gateStartingState.startingStateSafe &&
    preActivation.gateState.startingStateSafe;
  const fixturesValid =
    offline.fixtureChecks.schemaValid &&
    offline.fixtureChecks.deterministic &&
    preActivation.fixtureChecks.schemaValid &&
    preActivation.fixtureChecks.deterministic;

  const offlinePass =
    offline.verdict ===
    "offline_preflight_pass_safe_to_start_controlled_stripe_test_prep";
  const preActivationStructurallySafe =
    preActivation.verdict ===
    "pre_activation_zero_money_safe_gates_off_activation_forbidden";
  const testShapeAligned =
    offline.modeChecks.modesAlignedTest &&
    preActivation.credentialPresence.testShapeAligned;

  const reasons: string[] = [];
  const missingPrerequisites: StripeTestControlPlaneMissingPrerequisite[] = [];

  if (!requiredTestConfigurationNamesPresent) {
    const absent: string[] = [];
    if (!offline.credentialPresence.stripeModePresent) absent.push("STRIPE_MODE");
    if (!offline.credentialPresence.stripeSecretKeyPresent) {
      absent.push("STRIPE_SECRET_KEY");
    }
    if (!offline.credentialPresence.publishableKeyPresent) {
      absent.push("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
    }
    if (!offline.credentialPresence.webhookSecretPresent) {
      absent.push("STRIPE_WEBHOOK_SECRET");
    }
    if (!offline.credentialPresence.appOriginPresent) {
      absent.push("NEXT_PUBLIC_APP_URL");
    }
    pushMissing(
      missingPrerequisites,
      reasons,
      "missing_required_test_configuration_names",
      `Required TEST configuration env names are absent: ${absent.join(", ") || "unknown"}.`
    );
  }

  if (!modeTest) {
    pushMissing(
      missingPrerequisites,
      reasons,
      "stripe_mode_not_test",
      "STRIPE_MODE must be exactly test for control-plane READY."
    );
  }

  if (!liveDisabled) {
    pushMissing(
      missingPrerequisites,
      reasons,
      "live_not_disabled",
      "LIVE mode or live key prefixes / TEST·LIVE mismatch detected. LIVE must be disabled."
    );
  }

  if (!providerGatesCorrectStartingState) {
    pushMissing(
      missingPrerequisites,
      reasons,
      "provider_gates_starting_state_unsafe",
      "Provider gates / execution mode / production ACK are not in the required OFF starting state."
    );
  }

  if (!fixturesValid) {
    pushMissing(
      missingPrerequisites,
      reasons,
      "fixtures_invalid",
      "Stripe TEST fixture pack failed schema validity or determinism checks."
    );
  }

  if (!offlinePass) {
    pushMissing(
      missingPrerequisites,
      reasons,
      "offline_preflight_not_pass",
      `Offline preflight verdict is "${offline.verdict}" (required: offline_preflight_pass_safe_to_start_controlled_stripe_test_prep).`
    );
  }

  if (!preActivationStructurallySafe) {
    pushMissing(
      missingPrerequisites,
      reasons,
      "pre_activation_not_structurally_safe",
      `Pre-activation verdict is "${preActivation.verdict}" (required: pre_activation_zero_money_safe_gates_off_activation_forbidden).`
    );
  }

  if (
    requiredTestConfigurationNamesPresent &&
    modeTest &&
    liveDisabled &&
    !testShapeAligned
  ) {
    pushMissing(
      missingPrerequisites,
      reasons,
      "test_credential_shape_not_aligned",
      "Present credentials are not TEST-shape aligned (secret/publishable prefixes must be test)."
    );
  }

  // Deduplicate reason codes while preserving first-seen order.
  const uniqueReasons = [...new Set(reasons)];
  const uniqueMissing = uniqueReasons.map((code) => {
    const hit = missingPrerequisites.find((m) => m.code === code);
    return (
      hit ?? {
        code,
        message: code,
      }
    );
  });

  const canActivationProceed =
    uniqueReasons.length === 0 &&
    requiredTestConfigurationNamesPresent &&
    modeTest &&
    liveDisabled &&
    providerGatesCorrectStartingState &&
    fixturesValid &&
    offlinePass &&
    preActivationStructurallySafe &&
    testShapeAligned &&
    STRIPE_TEST_CONTROLLED_TEST_ACTIVATION_AUTHORIZED === false;

  const status: StripeTestControlPlaneStatus = canActivationProceed
    ? "READY"
    : "NOT_READY";

  const answers: StripeTestControlPlaneAnswers = {
    requiredTestConfigurationNamesPresent,
    modeTest,
    liveDisabled,
    providerGatesCorrectStartingState,
    fixturesValid,
    canActivationProceed,
  };

  const acceptanceMatrix: StripeTestControlPlaneAcceptanceMatrix = {
    networkStripeCalls: 0,
    moneyMovement: 0,
    productionDbWrites: 0,
    providerGatesOff: providerGatesCorrectStartingState,
    liveDisabled,
    fixturesValid,
    requiredConfigNamesPresent: requiredTestConfigurationNamesPresent,
    modeTest,
    activationPerformed: false,
    providerExecutionStartCapable: false,
    secretsNeverEchoed: true,
  };

  return {
    version: STRIPE_TEST_CONTROL_PLANE_HARDENING_VERSION,
    environment: STRIPE_TEST_CONTROL_PLANE_ENVIRONMENT,
    status,
    answers,
    reasons: status === "READY" ? [] : uniqueReasons,
    missingPrerequisites: status === "READY" ? [] : uniqueMissing,
    networkStripeCalls: 0,
    moneyMovement: 0,
    productionDbWrites: 0,
    providerGates: "OFF",
    activationPerformed: false,
    activationAuthorizedByControlPlane: false,
    providerExecutionStarted: false,
    providerExecutionStartCapable: false,
    requiredEnvNames: [...STRIPE_TEST_OFFLINE_PREFLIGHT_REQUIRED_ENV_NAMES],
    acceptanceMatrix,
    offlinePreflightVerdict: offline.verdict,
    preActivationVerdict: preActivation.verdict,
    note:
      "Offline Stripe TEST control plane only. READY means prerequisites are satisfied for a separate coordinator activation GO — this module never activates the provider, never enables gates, never calls Stripe, never writes production DB, and never returns secret values.",
  };
}

/** True when control-plane status is READY (prerequisites met; still no activation). */
export function isStripeTestControlPlaneReady(
  source: EnvSource = process.env
): boolean {
  return buildStripeTestControlPlaneReport(source).status === "READY";
}

/**
 * Machine-readable block reasons. Empty array when READY.
 * Never includes secret values.
 */
export function getStripeTestControlPlaneBlockReasons(
  source: EnvSource = process.env
): string[] {
  return [...buildStripeTestControlPlaneReport(source).reasons];
}
