/**
 * Completely OFFLINE preflight validator for a future controlled Stripe TEST environment.
 *
 * Proves the environment is safe to *start preparing* for controlled TEST validation:
 * - required TEST env variable NAMES
 * - credential presence without displaying values
 * - TEST mode selected; LIVE not selected
 * - fixture schema validity + deterministic fixture configuration
 * - provider gate required starting state (OFF)
 * - missing credentials / TEST·LIVE mismatch fail closed
 *
 * Hard guarantees:
 * - NETWORK_CALLS = 0 / STRIPE_CALLS = 0 / DB_WRITES = 0
 * - Never starts provider execution / never enables gates or modes
 * - Secrets never appear in logs, errors, or result payloads
 */

import {
  PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_ENV,
  readPartialRefundProviderMoneyExecutionMode,
} from "./executionMode";
import {
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV,
  evaluatePartialRefundProviderMoneyGate,
} from "./gate";
import {
  STRIPE_TEST_FIXTURE_PACK_ENVIRONMENT,
  STRIPE_TEST_FIXTURE_PACK_VERSION,
  buildStripeTestFixtureP6Manifest,
  buildStripeTestFixturePackReport,
  buildStripeTestFixturePersistedFactShapes,
  getStripeTestFixturePackDefinitions,
} from "./stripeTestFixturePack";

export const STRIPE_TEST_OFFLINE_PREFLIGHT_VALIDATOR_VERSION =
  "commerce-stripe-test-offline-preflight-validator-v1" as const;

export const STRIPE_TEST_OFFLINE_PREFLIGHT_ENVIRONMENT =
  "isolated_stripe_test_offline_preflight_v1_not_production" as const;

/**
 * Required Stripe TEST env variable NAMES (values never returned).
 * Presence is checked; contents are never echoed.
 */
export const STRIPE_TEST_OFFLINE_PREFLIGHT_REQUIRED_ENV_NAMES = [
  "STRIPE_MODE",
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_APP_URL",
] as const;

/** Alternate publishable / origin names accepted (still never echoed). */
export const STRIPE_TEST_OFFLINE_PREFLIGHT_ALTERNATE_ENV_NAMES = {
  publishableKey: ["STRIPE_PUBLISHABLE_KEY"] as const,
  appOrigin: ["APP_ORIGIN", "NEXT_PUBLIC_SITE_URL"] as const,
} as const;

/**
 * Activation-related env NAMES that must remain unset / unsatisfied
 * for the safe starting state of a controlled TEST environment.
 */
export const STRIPE_TEST_OFFLINE_PREFLIGHT_GATE_STARTING_STATE_ENV_NAMES = [
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_ENV,
] as const;

export type StripeTestOfflinePreflightVerdict =
  | "offline_preflight_pass_safe_to_start_controlled_stripe_test_prep"
  | "blocked_missing_test_credentials"
  | "blocked_test_live_mismatch_or_live_selected"
  | "blocked_fixture_schema_or_determinism_invalid"
  | "blocked_provider_gate_starting_state_unsafe";

export type StripeTestOfflinePreflightCredentialPresence = {
  /** Env NAMES only — never values. */
  requiredEnvNames: readonly string[];
  stripeModePresent: boolean;
  stripeSecretKeyPresent: boolean;
  publishableKeyPresent: boolean;
  webhookSecretPresent: boolean;
  appOriginPresent: boolean;
  /** True when all required presence checks pass (shape not yet validated). */
  allRequiredPresent: boolean;
};

export type StripeTestOfflinePreflightModeChecks = {
  /** Declared STRIPE_MODE is exactly "test". */
  testModeSelected: boolean;
  /** Declared STRIPE_MODE is "live" or any non-test value when present. */
  liveModeSelected: boolean;
  secretKeyLooksTest: boolean;
  secretKeyLooksLive: boolean;
  publishableKeyLooksTest: boolean;
  publishableKeyLooksLive: boolean;
  modesAlignedTest: boolean;
  obviousTestLiveMismatch: boolean;
};

export type StripeTestOfflinePreflightFixtureChecks = {
  fixturePackVersion: typeof STRIPE_TEST_FIXTURE_PACK_VERSION;
  fixtureEnvironment: typeof STRIPE_TEST_FIXTURE_PACK_ENVIRONMENT;
  schemaValid: boolean;
  deterministic: boolean;
  stripeModeRequiredTest: boolean;
  remotePersistenceAuthorized: false;
  providerExecutionsEmpty: boolean;
};

export type StripeTestOfflinePreflightGateStartingState = {
  requiredStartingState: "provider_gates_off_execution_mode_off_production_ack_absent";
  dedicatedGateSatisfied: boolean;
  executionMode: string;
  productionExecAckPresent: boolean;
  gatesRemainOff: boolean;
  startingStateSafe: boolean;
};

export type StripeTestOfflinePreflightReport = {
  version: typeof STRIPE_TEST_OFFLINE_PREFLIGHT_VALIDATOR_VERSION;
  environment: typeof STRIPE_TEST_OFFLINE_PREFLIGHT_ENVIRONMENT;
  verdict: StripeTestOfflinePreflightVerdict;
  networkCalls: 0;
  stripeCalls: 0;
  dbWrites: 0;
  /** Explicit: this validator never starts provider execution. */
  providerExecutionStarted: false;
  providerExecutionStartCapable: false;
  credentialPresence: StripeTestOfflinePreflightCredentialPresence;
  modeChecks: StripeTestOfflinePreflightModeChecks;
  fixtureChecks: StripeTestOfflinePreflightFixtureChecks;
  gateStartingState: StripeTestOfflinePreflightGateStartingState;
  /** Machine-safe issue codes only — never secret values. */
  issues: string[];
  note: string;
};

type EnvSource = Record<string, string | undefined>;

function readEnv(name: string, source: EnvSource): string | null {
  const raw = source[name];
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function firstPresent(
  names: readonly string[],
  source: EnvSource
): string | null {
  for (const name of names) {
    const value = readEnv(name, source);
    if (value) return value;
  }
  return null;
}

function secretLooksTest(secretKey: string | null): boolean {
  return Boolean(secretKey?.startsWith("sk_test_"));
}

function secretLooksLive(secretKey: string | null): boolean {
  return Boolean(secretKey?.startsWith("sk_live_"));
}

function publishableLooksTest(key: string | null): boolean {
  return Boolean(key?.startsWith("pk_test_"));
}

function publishableLooksLive(key: string | null): boolean {
  return Boolean(key?.startsWith("pk_live_"));
}

function assertFixtureDeterminism(): {
  schemaValid: boolean;
  deterministic: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const a = {
    defs: getStripeTestFixturePackDefinitions(),
    facts: buildStripeTestFixturePersistedFactShapes(),
    manifest: buildStripeTestFixtureP6Manifest(),
  };
  const b = {
    defs: getStripeTestFixturePackDefinitions(),
    facts: buildStripeTestFixturePersistedFactShapes(),
    manifest: buildStripeTestFixtureP6Manifest(),
  };
  const deterministic = JSON.stringify(a) === JSON.stringify(b);
  if (!deterministic) {
    issues.push("fixture_configuration_not_deterministic");
  }

  // Empty-env pack report must still validate definitions without secrets.
  const packReport = buildStripeTestFixturePackReport({});
  if (!packReport.definitionsValid) {
    issues.push("fixture_schema_invalid");
  }
  if (a.facts.stripeModeRequired !== "test") {
    issues.push("fixture_stripe_mode_required_not_test");
  }
  if (a.manifest.remotePersistenceAuthorized !== false) {
    issues.push("fixture_remote_persistence_unexpectedly_authorized");
  }
  if (a.facts.provider_executions_for_ledger.length !== 0) {
    issues.push("fixture_provider_executions_not_empty");
  }
  if (a.manifest.stripeMode !== "test") {
    issues.push("fixture_manifest_stripe_mode_not_test");
  }
  if (!STRIPE_TEST_FIXTURE_PACK_ENVIRONMENT.includes("not_production")) {
    issues.push("fixture_environment_not_explicitly_non_production");
  }

  return {
    schemaValid: packReport.definitionsValid && issues.length === 0,
    deterministic,
    issues,
  };
}

/**
 * Build a fully redacted offline preflight report.
 * Never mutates process.env. Never enables gates/modes. Never calls Stripe.
 * Never returns credential values — only presence + mode classification.
 */
export function buildStripeTestOfflinePreflightReport(
  source: EnvSource = process.env
): StripeTestOfflinePreflightReport {
  const issues: string[] = [];

  const stripeMode = readEnv("STRIPE_MODE", source);
  const secretKey = readEnv("STRIPE_SECRET_KEY", source);
  const publishableKey = firstPresent(
    [
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
      ...STRIPE_TEST_OFFLINE_PREFLIGHT_ALTERNATE_ENV_NAMES.publishableKey,
    ],
    source
  );
  const webhookSecret = readEnv("STRIPE_WEBHOOK_SECRET", source);
  const appOrigin = firstPresent(
    [
      "NEXT_PUBLIC_APP_URL",
      ...STRIPE_TEST_OFFLINE_PREFLIGHT_ALTERNATE_ENV_NAMES.appOrigin,
    ],
    source
  );

  const stripeModePresent = stripeMode != null;
  const stripeSecretKeyPresent = secretKey != null;
  const publishableKeyPresent = publishableKey != null;
  const webhookSecretPresent = webhookSecret != null;
  const appOriginPresent = appOrigin != null;
  const allRequiredPresent =
    stripeModePresent &&
    stripeSecretKeyPresent &&
    publishableKeyPresent &&
    webhookSecretPresent &&
    appOriginPresent;

  if (!stripeModePresent) issues.push("stripe_mode_absent");
  if (!stripeSecretKeyPresent) issues.push("stripe_secret_key_absent");
  if (!publishableKeyPresent) issues.push("publishable_key_absent");
  if (!webhookSecretPresent) issues.push("webhook_secret_absent");
  if (!appOriginPresent) issues.push("app_origin_absent");

  const testModeSelected = stripeMode === "test";
  const liveModeSelected = stripeMode != null && stripeMode !== "test";
  const secretKeyLooksTest = secretLooksTest(secretKey);
  const secretKeyLooksLive = secretLooksLive(secretKey);
  const publishableKeyLooksTest = publishableLooksTest(publishableKey);
  const publishableKeyLooksLive = publishableLooksLive(publishableKey);

  if (liveModeSelected) {
    issues.push("stripe_mode_not_test");
  }
  if (secretKeyLooksLive) {
    issues.push("secret_key_live_prefix");
  }
  if (publishableKeyLooksLive) {
    issues.push("publishable_key_live_prefix");
  }
  if (secretKey && !secretKeyLooksTest && !secretKeyLooksLive) {
    issues.push("secret_key_prefix_unrecognized");
  }
  if (
    publishableKey &&
    !publishableKeyLooksTest &&
    !publishableKeyLooksLive
  ) {
    issues.push("publishable_key_prefix_unrecognized");
  }

  const obviousTestLiveMismatch =
    (secretKeyLooksTest && publishableKeyLooksLive) ||
    (secretKeyLooksLive && publishableKeyLooksTest) ||
    (testModeSelected && (secretKeyLooksLive || publishableKeyLooksLive)) ||
    (liveModeSelected && (secretKeyLooksTest || publishableKeyLooksTest));

  if (obviousTestLiveMismatch) {
    issues.push("obvious_test_live_mismatch");
  }

  const modesAlignedTest =
    testModeSelected &&
    secretKeyLooksTest &&
    publishableKeyLooksTest &&
    !secretKeyLooksLive &&
    !publishableKeyLooksLive;

  if (allRequiredPresent && !modesAlignedTest && !obviousTestLiveMismatch) {
    // Shape incomplete even without an obvious mismatch (e.g. unrecognized prefixes).
    if (!secretKeyLooksTest || !publishableKeyLooksTest || !testModeSelected) {
      issues.push("test_credential_shape_incomplete");
    }
  }

  const fixtureAssert = assertFixtureDeterminism();
  issues.push(...fixtureAssert.issues);

  const dedicatedGate = evaluatePartialRefundProviderMoneyGate(source);
  const dedicatedGateSatisfied = dedicatedGate.ok;
  const executionMode = readPartialRefundProviderMoneyExecutionMode(source);
  const productionExecAckPresent = Boolean(
    readEnv(PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_ENV, source)
  );
  const gatesRemainOff =
    !dedicatedGateSatisfied &&
    executionMode === "off" &&
    !productionExecAckPresent;

  if (dedicatedGateSatisfied) {
    issues.push("dedicated_provider_money_gate_on");
  }
  if (executionMode !== "off") {
    issues.push("execution_mode_not_off");
  }
  if (productionExecAckPresent) {
    issues.push("production_exec_ack_present");
  }

  const startingStateSafe = gatesRemainOff;

  const credentialPresence: StripeTestOfflinePreflightCredentialPresence = {
    requiredEnvNames: [...STRIPE_TEST_OFFLINE_PREFLIGHT_REQUIRED_ENV_NAMES],
    stripeModePresent,
    stripeSecretKeyPresent,
    publishableKeyPresent,
    webhookSecretPresent,
    appOriginPresent,
    allRequiredPresent,
  };

  const modeChecks: StripeTestOfflinePreflightModeChecks = {
    testModeSelected,
    liveModeSelected,
    secretKeyLooksTest,
    secretKeyLooksLive,
    publishableKeyLooksTest,
    publishableKeyLooksLive,
    modesAlignedTest,
    obviousTestLiveMismatch,
  };

  const fixtureChecks: StripeTestOfflinePreflightFixtureChecks = {
    fixturePackVersion: STRIPE_TEST_FIXTURE_PACK_VERSION,
    fixtureEnvironment: STRIPE_TEST_FIXTURE_PACK_ENVIRONMENT,
    schemaValid: fixtureAssert.schemaValid,
    deterministic: fixtureAssert.deterministic,
    stripeModeRequiredTest: true,
    remotePersistenceAuthorized: false,
    providerExecutionsEmpty: true,
  };

  const gateStartingState: StripeTestOfflinePreflightGateStartingState = {
    requiredStartingState:
      "provider_gates_off_execution_mode_off_production_ack_absent",
    dedicatedGateSatisfied,
    executionMode,
    productionExecAckPresent,
    gatesRemainOff,
    startingStateSafe,
  };

  let verdict: StripeTestOfflinePreflightVerdict;
  if (
    modeChecks.liveModeSelected ||
    modeChecks.secretKeyLooksLive ||
    modeChecks.publishableKeyLooksLive ||
    modeChecks.obviousTestLiveMismatch
  ) {
    verdict = "blocked_test_live_mismatch_or_live_selected";
  } else if (!allRequiredPresent || !modesAlignedTest) {
    verdict = "blocked_missing_test_credentials";
  } else if (!fixtureChecks.schemaValid || !fixtureChecks.deterministic) {
    verdict = "blocked_fixture_schema_or_determinism_invalid";
  } else if (!startingStateSafe) {
    verdict = "blocked_provider_gate_starting_state_unsafe";
  } else {
    verdict =
      "offline_preflight_pass_safe_to_start_controlled_stripe_test_prep";
  }

  return {
    version: STRIPE_TEST_OFFLINE_PREFLIGHT_VALIDATOR_VERSION,
    environment: STRIPE_TEST_OFFLINE_PREFLIGHT_ENVIRONMENT,
    verdict,
    networkCalls: 0,
    stripeCalls: 0,
    dbWrites: 0,
    providerExecutionStarted: false,
    providerExecutionStartCapable: false,
    credentialPresence,
    modeChecks,
    fixtureChecks,
    gateStartingState,
    issues,
    note:
      "OFFLINE preflight only. No network. No Stripe API. No DB writes. No provider execution. Secrets are never returned — only env NAMES and presence/mode booleans. Passing does not activate gates or authorize money movement.",
  };
}

/**
 * True only when offline preflight passes with TEST credentials present,
 * modes aligned to TEST, fixture schema/determinism valid, and gates OFF.
 * Does not authorize activation, network validation, or provider execution.
 */
export function isStripeTestOfflinePreflightSafeToStart(
  source: EnvSource = process.env
): boolean {
  const report = buildStripeTestOfflinePreflightReport(source);
  return (
    report.verdict ===
    "offline_preflight_pass_safe_to_start_controlled_stripe_test_prep"
  );
}

/**
 * Structural non-capability: this module intentionally exposes no provider
 * execution entrypoint. Kept as a typed constant for regression assertions.
 */
export const STRIPE_TEST_OFFLINE_PREFLIGHT_PROVIDER_EXECUTION_ENTRYPOINTS = [] as const;
