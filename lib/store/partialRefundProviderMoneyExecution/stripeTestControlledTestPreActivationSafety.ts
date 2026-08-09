/**
 * Controlled Stripe TEST pre-activation safety — migration-independent ZERO-MONEY.
 *
 * Closes remaining gaps before any future controlled TEST activation GO:
 * - offline config / fixture validation
 * - TEST/LIVE fail-closed
 * - gate-state assertions (must remain OFF)
 * - credential presence without exposing values
 * - deterministic composite preflight result
 * - operator-safe issue codes + messages (never secret values)
 *
 * Hard guarantees:
 * - NETWORK_STRIPE_CALLS = 0 / MONEY_MOVEMENT = 0 / DB_WRITES = 0
 * - PROVIDER_GATES remain OFF (never enabled here)
 * - activationAuthorized is always false from this module
 * - Unit/regression tests do not require real credentials
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
import {
  STRIPE_TEST_OFFLINE_PREFLIGHT_REQUIRED_ENV_NAMES,
  buildStripeTestOfflinePreflightReport,
  type StripeTestOfflinePreflightVerdict,
} from "./stripeTestOfflinePreflightValidator";

export const STRIPE_TEST_CONTROLLED_TEST_PRE_ACTIVATION_SAFETY_VERSION =
  "commerce-stripe-test-controlled-test-pre-activation-safety-v1" as const;

export const STRIPE_TEST_CONTROLLED_TEST_PRE_ACTIVATION_ENVIRONMENT =
  "isolated_stripe_test_controlled_test_pre_activation_v1_not_production" as const;

/**
 * Structural non-capability: this module never authorizes activation.
 * Kept as a typed constant for regression assertions.
 */
export const STRIPE_TEST_CONTROLLED_TEST_ACTIVATION_AUTHORIZED = false as const;

/** Structural non-capability: no provider execution entrypoints. */
export const STRIPE_TEST_CONTROLLED_TEST_PRE_ACTIVATION_PROVIDER_EXECUTION_ENTRYPOINTS =
  [] as const;

export type StripeTestControlledTestPreActivationVerdict =
  | "pre_activation_zero_money_safe_gates_off_activation_forbidden"
  | "blocked_live_or_test_live_mismatch"
  | "blocked_fixture_schema_or_determinism_invalid"
  | "blocked_provider_gate_starting_state_unsafe";

export type StripeTestControlledTestPreActivationIssue = {
  /** Machine-safe code — never secret values. */
  code: string;
  /** Operator-safe message — never secret values. */
  message: string;
};

export type StripeTestControlledTestPreActivationCredentialPresence = {
  requiredEnvNames: readonly string[];
  stripeModePresent: boolean;
  stripeSecretKeyPresent: boolean;
  publishableKeyPresent: boolean;
  webhookSecretPresent: boolean;
  appOriginPresent: boolean;
  allRequiredPresent: boolean;
  /** True when present credentials look TEST-aligned (not required for structural pass). */
  testShapeAligned: boolean;
};

export type StripeTestControlledTestPreActivationGateState = {
  dedicatedGateSatisfied: boolean;
  executionMode: string;
  productionExecAckPresent: boolean;
  gatesRemainOff: boolean;
  startingStateSafe: boolean;
};

export type StripeTestControlledTestPreActivationFixtureChecks = {
  fixturePackVersion: typeof STRIPE_TEST_FIXTURE_PACK_VERSION;
  fixtureEnvironment: typeof STRIPE_TEST_FIXTURE_PACK_ENVIRONMENT;
  schemaValid: boolean;
  deterministic: boolean;
  stripeModeRequiredTest: boolean;
  remotePersistenceAuthorized: false;
  providerExecutionsEmpty: boolean;
};

export type StripeTestControlledTestPreActivationAcceptanceMatrix = {
  /** Migration-independent structural checks required before activation GO. */
  networkStripeCalls: 0;
  moneyMovement: 0;
  dbWrites: 0;
  providerGatesOff: boolean;
  executionModeOff: boolean;
  productionExecAckAbsent: boolean;
  fixtureSchemaValid: boolean;
  fixtureDeterministic: boolean;
  remotePersistenceUnauthorized: true;
  liveModeOrLiveKeyPrefixesAbsent: boolean;
  activationAuthorized: false;
  providerExecutionStartCapable: false;
  /** Credential readiness is optional for structural safety; reported for operators. */
  credentialPresenceReportedWithoutValues: true;
  offlinePreflightEvaluated: boolean;
};

export type StripeTestControlledTestPreActivationReport = {
  version: typeof STRIPE_TEST_CONTROLLED_TEST_PRE_ACTIVATION_SAFETY_VERSION;
  environment: typeof STRIPE_TEST_CONTROLLED_TEST_PRE_ACTIVATION_ENVIRONMENT;
  verdict: StripeTestControlledTestPreActivationVerdict;
  networkStripeCalls: 0;
  moneyMovement: 0;
  dbWrites: 0;
  providerGates: "OFF";
  activationAuthorized: false;
  providerExecutionStarted: false;
  providerExecutionStartCapable: false;
  credentialPresence: StripeTestControlledTestPreActivationCredentialPresence;
  gateState: StripeTestControlledTestPreActivationGateState;
  fixtureChecks: StripeTestControlledTestPreActivationFixtureChecks;
  liveOrMismatchDetected: boolean;
  offlinePreflightVerdict: StripeTestOfflinePreflightVerdict;
  offlinePreflightSafeToStartPrep: boolean;
  acceptanceMatrix: StripeTestControlledTestPreActivationAcceptanceMatrix;
  /** Machine-safe issue codes only. */
  issues: string[];
  /** Operator-safe errors (code + message); never secret values. */
  operatorErrors: StripeTestControlledTestPreActivationIssue[];
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

function pushIssue(
  issues: string[],
  operatorErrors: StripeTestControlledTestPreActivationIssue[],
  code: string,
  message: string
): void {
  issues.push(code);
  operatorErrors.push({ code, message });
}

function assertFixtureDeterminism(): {
  schemaValid: boolean;
  deterministic: boolean;
  issues: StripeTestControlledTestPreActivationIssue[];
} {
  const issues: StripeTestControlledTestPreActivationIssue[] = [];
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
    issues.push({
      code: "fixture_configuration_not_deterministic",
      message:
        "Fixture pack builders are not deterministic across repeated calls.",
    });
  }

  const packReport = buildStripeTestFixturePackReport({});
  if (!packReport.definitionsValid) {
    issues.push({
      code: "fixture_schema_invalid",
      message: "Fixture pack definitions failed schema validation.",
    });
  }
  if (a.facts.stripeModeRequired !== "test") {
    issues.push({
      code: "fixture_stripe_mode_required_not_test",
      message: "Fixture pack must require Stripe mode test.",
    });
  }
  if (a.manifest.remotePersistenceAuthorized !== false) {
    issues.push({
      code: "fixture_remote_persistence_unexpectedly_authorized",
      message:
        "Fixture pack must not authorize remote persistence before activation GO.",
    });
  }
  if (a.facts.provider_executions_for_ledger.length !== 0) {
    issues.push({
      code: "fixture_provider_executions_not_empty",
      message:
        "Pre-activation fixture pack must declare zero provider executions for the ledger.",
    });
  }
  if (a.manifest.stripeMode !== "test") {
    issues.push({
      code: "fixture_manifest_stripe_mode_not_test",
      message: "Fixture P6 manifest stripeMode must be test.",
    });
  }
  if (!STRIPE_TEST_FIXTURE_PACK_ENVIRONMENT.includes("not_production")) {
    issues.push({
      code: "fixture_environment_not_explicitly_non_production",
      message: "Fixture environment label must explicitly exclude production.",
    });
  }

  return {
    schemaValid: packReport.definitionsValid && issues.length === 0,
    deterministic,
    issues,
  };
}

/**
 * Build a fully redacted pre-activation safety report.
 * Never mutates process.env. Never enables gates/modes. Never calls Stripe.
 * Never returns credential values — only presence + mode classification.
 *
 * Structural zero-money safety can pass WITHOUT credentials (CI-safe).
 * Credential readiness is reported via offline preflight composition.
 * activationAuthorized is always false.
 */
export function buildStripeTestControlledTestPreActivationSafetyReport(
  source: EnvSource = process.env
): StripeTestControlledTestPreActivationReport {
  const issues: string[] = [];
  const operatorErrors: StripeTestControlledTestPreActivationIssue[] = [];

  const stripeMode = readEnv("STRIPE_MODE", source);
  const secretKey = readEnv("STRIPE_SECRET_KEY", source);
  const publishableKey = firstPresent(
    ["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "STRIPE_PUBLISHABLE_KEY"],
    source
  );
  const webhookSecret = readEnv("STRIPE_WEBHOOK_SECRET", source);
  const appOrigin = firstPresent(
    ["NEXT_PUBLIC_APP_URL", "APP_ORIGIN", "NEXT_PUBLIC_SITE_URL"],
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

  const testModeSelected = stripeMode === "test";
  const liveModeSelected = stripeMode != null && stripeMode !== "test";
  const secretKeyLooksTest = secretLooksTest(secretKey);
  const secretKeyLooksLive = secretLooksLive(secretKey);
  const publishableKeyLooksTest = publishableLooksTest(publishableKey);
  const publishableKeyLooksLive = publishableLooksLive(publishableKey);

  const obviousTestLiveMismatch =
    (secretKeyLooksTest && publishableKeyLooksLive) ||
    (secretKeyLooksLive && publishableKeyLooksTest) ||
    (testModeSelected && (secretKeyLooksLive || publishableKeyLooksLive)) ||
    (liveModeSelected && (secretKeyLooksTest || publishableKeyLooksTest));

  const liveOrMismatchDetected =
    liveModeSelected ||
    secretKeyLooksLive ||
    publishableKeyLooksLive ||
    obviousTestLiveMismatch;

  if (liveModeSelected) {
    pushIssue(
      issues,
      operatorErrors,
      "stripe_mode_not_test",
      "STRIPE_MODE is set but is not test. Pre-activation requires TEST-only mode or unset."
    );
  }
  if (secretKeyLooksLive) {
    pushIssue(
      issues,
      operatorErrors,
      "secret_key_live_prefix",
      "A live Stripe secret key prefix was detected. Remove live credentials before controlled TEST prep."
    );
  }
  if (publishableKeyLooksLive) {
    pushIssue(
      issues,
      operatorErrors,
      "publishable_key_live_prefix",
      "A live Stripe publishable key prefix was detected. Remove live credentials before controlled TEST prep."
    );
  }
  if (obviousTestLiveMismatch) {
    pushIssue(
      issues,
      operatorErrors,
      "obvious_test_live_mismatch",
      "Obvious TEST/LIVE credential mismatch detected. Align all Stripe credentials to TEST or clear them."
    );
  }

  const testShapeAligned =
    testModeSelected &&
    secretKeyLooksTest &&
    publishableKeyLooksTest &&
    !secretKeyLooksLive &&
    !publishableKeyLooksLive;

  const fixtureAssert = assertFixtureDeterminism();
  for (const issue of fixtureAssert.issues) {
    issues.push(issue.code);
    operatorErrors.push(issue);
  }

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
    pushIssue(
      issues,
      operatorErrors,
      "dedicated_provider_money_gate_on",
      `Dedicated provider-money gate is satisfied via ${PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV}/${PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV}. Pre-activation requires gates OFF.`
    );
  }
  if (executionMode !== "off") {
    pushIssue(
      issues,
      operatorErrors,
      "execution_mode_not_off",
      `Execution mode is "${executionMode}" (env ${PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV}). Pre-activation requires mode off.`
    );
  }
  if (productionExecAckPresent) {
    pushIssue(
      issues,
      operatorErrors,
      "production_exec_ack_present",
      `Production exec ACK is present (${PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_ENV}). Remove it before controlled TEST prep.`
    );
  }

  const offlinePreflight = buildStripeTestOfflinePreflightReport(source);
  const offlinePreflightSafeToStartPrep =
    offlinePreflight.verdict ===
    "offline_preflight_pass_safe_to_start_controlled_stripe_test_prep";

  const credentialPresence: StripeTestControlledTestPreActivationCredentialPresence =
    {
      requiredEnvNames: [...STRIPE_TEST_OFFLINE_PREFLIGHT_REQUIRED_ENV_NAMES],
      stripeModePresent,
      stripeSecretKeyPresent,
      publishableKeyPresent,
      webhookSecretPresent,
      appOriginPresent,
      allRequiredPresent,
      testShapeAligned,
    };

  const gateState: StripeTestControlledTestPreActivationGateState = {
    dedicatedGateSatisfied,
    executionMode,
    productionExecAckPresent,
    gatesRemainOff,
    startingStateSafe: gatesRemainOff,
  };

  const fixtureChecks: StripeTestControlledTestPreActivationFixtureChecks = {
    fixturePackVersion: STRIPE_TEST_FIXTURE_PACK_VERSION,
    fixtureEnvironment: STRIPE_TEST_FIXTURE_PACK_ENVIRONMENT,
    schemaValid: fixtureAssert.schemaValid,
    deterministic: fixtureAssert.deterministic,
    stripeModeRequiredTest: true,
    remotePersistenceAuthorized: false,
    providerExecutionsEmpty: true,
  };

  const acceptanceMatrix: StripeTestControlledTestPreActivationAcceptanceMatrix =
    {
      networkStripeCalls: 0,
      moneyMovement: 0,
      dbWrites: 0,
      providerGatesOff: gatesRemainOff,
      executionModeOff: executionMode === "off",
      productionExecAckAbsent: !productionExecAckPresent,
      fixtureSchemaValid: fixtureChecks.schemaValid,
      fixtureDeterministic: fixtureChecks.deterministic,
      remotePersistenceUnauthorized: true,
      liveModeOrLiveKeyPrefixesAbsent: !liveOrMismatchDetected,
      activationAuthorized: false,
      providerExecutionStartCapable: false,
      credentialPresenceReportedWithoutValues: true,
      offlinePreflightEvaluated: true,
    };

  let verdict: StripeTestControlledTestPreActivationVerdict;
  if (liveOrMismatchDetected) {
    verdict = "blocked_live_or_test_live_mismatch";
  } else if (!fixtureChecks.schemaValid || !fixtureChecks.deterministic) {
    verdict = "blocked_fixture_schema_or_determinism_invalid";
  } else if (!gatesRemainOff) {
    verdict = "blocked_provider_gate_starting_state_unsafe";
  } else {
    verdict = "pre_activation_zero_money_safe_gates_off_activation_forbidden";
  }

  return {
    version: STRIPE_TEST_CONTROLLED_TEST_PRE_ACTIVATION_SAFETY_VERSION,
    environment: STRIPE_TEST_CONTROLLED_TEST_PRE_ACTIVATION_ENVIRONMENT,
    verdict,
    networkStripeCalls: 0,
    moneyMovement: 0,
    dbWrites: 0,
    providerGates: "OFF",
    activationAuthorized: false,
    providerExecutionStarted: false,
    providerExecutionStartCapable: false,
    credentialPresence,
    gateState,
    fixtureChecks,
    liveOrMismatchDetected,
    offlinePreflightVerdict: offlinePreflight.verdict,
    offlinePreflightSafeToStartPrep,
    acceptanceMatrix,
    issues,
    operatorErrors,
    note:
      "Pre-activation ZERO-MONEY safety only. No network. No Stripe API. No DB writes. No money movement. Secrets are never returned — only env NAMES, presence/mode booleans, and operator-safe issue codes. Structural pass does not require real credentials. activationAuthorized is always false — a separate coordinator GO is required before any controlled TEST activation.",
  };
}

/**
 * True when structural zero-money pre-activation checks pass:
 * fixture valid + gates OFF + no LIVE/mismatch, activation still forbidden.
 * Does NOT require credentials (CI-safe). Does NOT authorize activation.
 */
export function isStripeTestControlledTestPreActivationStructurallySafe(
  source: EnvSource = process.env
): boolean {
  const report = buildStripeTestControlledTestPreActivationSafetyReport(source);
  return (
    report.verdict ===
    "pre_activation_zero_money_safe_gates_off_activation_forbidden"
  );
}

/**
 * True when structural safety passes AND offline preflight says TEST prep
 * credentials/shape are ready. Still does NOT authorize activation.
 */
export function isStripeTestControlledTestPreActivationCredentialReady(
  source: EnvSource = process.env
): boolean {
  const report = buildStripeTestControlledTestPreActivationSafetyReport(source);
  return (
    report.verdict ===
      "pre_activation_zero_money_safe_gates_off_activation_forbidden" &&
    report.offlinePreflightSafeToStartPrep &&
    report.credentialPresence.testShapeAligned &&
    report.activationAuthorized === false
  );
}
