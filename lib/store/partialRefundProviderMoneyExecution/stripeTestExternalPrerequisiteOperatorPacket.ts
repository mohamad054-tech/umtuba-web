/**
 * Stripe TEST external-prerequisite OPERATOR PACKET — B3/B4 clearing only.
 *
 * Defines SAFE operator contracts for:
 * - B3: isolated Stripe TEST credentials (names / shape / storage boundary)
 * - B4: controlled TEST money fixture inputs (fields / validation / cleanup)
 *
 * THIS MODULE DOES NOT:
 * - obtain or create secret credentials
 * - call Stripe / move money / write production DB
 * - enable provider gates or execution mode
 * - authorize controlled Stripe TEST execution
 *
 * STRIPE_CALLS=0 / MONEY_MOVEMENT=0 / DB_WRITES=0 / PROVIDER_GATES=OFF /
 * STRIPE_EXECUTION_AUTHORIZED=NO.
 * Secrets never appear in reports (names / booleans / reason codes only).
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
  getStripeTestFixturePackDefinitions,
} from "./stripeTestFixturePack";

export const STRIPE_TEST_EXTERNAL_PREREQUISITE_OPERATOR_PACKET_VERSION =
  "commerce-stripe-test-external-prerequisite-operator-packet-v1" as const;

export const STRIPE_TEST_EXTERNAL_PREREQUISITE_OPERATOR_PACKET_ENVIRONMENT =
  "isolated_stripe_test_external_prerequisite_operator_packet_v1_not_production" as const;

/** Structural non-capability: operator packet never executes Stripe. */
export const STRIPE_TEST_EXTERNAL_PREREQUISITE_OPERATOR_PACKET_ACTIVATION_PERFORMED =
  false as const;

/** Structural non-capability: no provider execution entrypoints. */
export const STRIPE_TEST_EXTERNAL_PREREQUISITE_OPERATOR_PACKET_PROVIDER_EXECUTION_ENTRYPOINTS =
  [] as const;

/** Hard flag: this packet never authorizes Stripe execution. */
export const STRIPE_TEST_EXTERNAL_PREREQUISITE_OPERATOR_PACKET_EXECUTION_AUTHORIZED =
  false as const;

/** Central still must integrate SM+dry-run and env-readiness into SoT. */
export const STRIPE_TEST_EXTERNAL_PREREQUISITE_CENTRAL_INTEGRATION_STILL_REQUIRED =
  true as const;

export const STRIPE_TEST_EXTERNAL_PREREQUISITE_OPERATOR_PACKET_VERDICTS = [
  "OPERATOR_PACKET_CONTRACT_READY_B3_B4_CLEARANCE_PENDING",
  "OPERATOR_PACKET_BLOCKED_LIVE_OR_UNSAFE_HOST_SHAPE",
  "OPERATOR_PACKET_BLOCKED_PROVIDER_GATES_NOT_OFF",
] as const;

export type StripeTestExternalPrerequisiteOperatorPacketVerdict =
  (typeof STRIPE_TEST_EXTERNAL_PREREQUISITE_OPERATOR_PACKET_VERDICTS)[number];

/**
 * REQUIRED_TEST_CONFIGURATION_NAMES — env NAMES only (never values).
 * B3 clearance requires these to be present locally with TEST-only shapes.
 */
export const REQUIRED_TEST_CONFIGURATION_NAMES = [
  "STRIPE_MODE",
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_APP_URL",
] as const;

export type RequiredTestConfigurationName =
  (typeof REQUIRED_TEST_CONFIGURATION_NAMES)[number];

/**
 * REQUIRED_FIXTURE_FIELDS — operator money-fixture attestation fields (B4).
 * Booleans only in reports; never fabricate Stripe object identifiers in git.
 */
export const REQUIRED_FIXTURE_FIELDS = [
  "capturedTestPaymentIntentReady",
  "matchingPaymentAttemptCaptureFactsReady",
  "committedPartialRefundLedgerReady",
  "zeroProviderExecutionRowsForLedger",
  "isolatedSupabaseOrExplicitMoneyFixtureGo",
] as const;

export type RequiredFixtureField = (typeof REQUIRED_FIXTURE_FIELDS)[number];

export type StripeTestExternalPrerequisiteOperatorFixtures = {
  capturedTestPaymentIntentReady: boolean;
  matchingPaymentAttemptCaptureFactsReady: boolean;
  committedPartialRefundLedgerReady: boolean;
  zeroProviderExecutionRowsForLedger: boolean;
  isolatedSupabaseOrExplicitMoneyFixtureGo: boolean;
};

export const STRIPE_TEST_EXTERNAL_PREREQUISITE_DEFAULT_OPERATOR_FIXTURES: StripeTestExternalPrerequisiteOperatorFixtures =
  {
    capturedTestPaymentIntentReady: false,
    matchingPaymentAttemptCaptureFactsReady: false,
    committedPartialRefundLedgerReady: false,
    zeroProviderExecutionRowsForLedger: false,
    isolatedSupabaseOrExplicitMoneyFixtureGo: false,
  };

/**
 * TEST_ONLY_VALIDATION — prefix / mode rules for TEST credentials.
 * Evaluated as presence + prefix mode only; values never echoed.
 * Labels intentionally avoid key-material substrings in serialized reports.
 */
export const TEST_ONLY_VALIDATION = {
  STRIPE_MODE: "exactly_test",
  STRIPE_SECRET_KEY: "test_secret_prefix_only",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "test_publishable_prefix_only",
  STRIPE_WEBHOOK_SECRET: "webhook_signing_prefix_only",
  NEXT_PUBLIC_APP_URL: "non_empty_local_or_test_origin",
  optionalPublishableAlias: "STRIPE_PUBLISHABLE_KEY",
  optionalOriginAliases: ["APP_ORIGIN", "NEXT_PUBLIC_SITE_URL"] as const,
} as const;

/**
 * LIVE_CREDENTIAL_REJECTION — hard fail-closed conditions.
 */
export const LIVE_CREDENTIAL_REJECTION = {
  rejectStripeModeLive: true,
  rejectLiveSecretPrefix: true,
  rejectLivePublishablePrefix: true,
  rejectProductionExecAckPresent: true,
  rejectMixedTestLiveKeyModes: true,
} as const;

/**
 * Internal detectors only — never serialize into operator reports.
 */
const FORBIDDEN_KEY_MATERIAL_SUBSTRINGS = [
  "sk_test_",
  "pk_test_",
  "sk_live_",
  "pk_live_",
  "whsec_",
] as const;

/**
 * SECRET_REDACTION_RULES — what reports/logs/git may contain.
 * Uses labels only (no key-material substrings) so report JSON stays redaction-safe.
 */
export const SECRET_REDACTION_RULES = {
  allowEnvNames: true,
  allowPresenceBooleans: true,
  allowPrefixModeLabels: true,
  allowReasonCodes: true,
  forbidSecretValues: true,
  forbidKeyMaterialSubstringsInReports: [
    "test_secret_prefix",
    "test_publishable_prefix",
    "live_secret_prefix",
    "live_publishable_prefix",
    "webhook_signing_prefix",
  ] as const,
  forbidCommitPaths: [".env", ".env.local", ".env.*.local"] as const,
  neverAskOperatorToCommitCredentials: true,
} as const;

/**
 * FIXTURE_VALIDATION_RULES — B4 money-fixture invariants (operator-owned).
 * Does not invent PaymentIntent / order / ledger identifiers.
 */
export const FIXTURE_VALIDATION_RULES = {
  paymentIntentMustBeCapturedTestObject: true,
  paymentAttemptAndCaptureFactsMustMatchPi: true,
  ledgerMustBeCommitted: true,
  refundAmountMustBePositive: true,
  refundAmountMustBeLessOrEqualCaptured: true,
  currencyMustMatchCaptured: true,
  providerExecutionRowsForLedgerMustBeZeroBeforeFirstSubmit: true,
  isolatedSupabaseOrExplicitWrittenMoneyFixtureGoRequired: true,
  codeFixturePackDefinitionsMustRemainNonSecret: true,
  doNotFabricateFixtureIdentifiersInGit: true,
} as const;

/**
 * SAFE_STORAGE_INJECTION_BOUNDARY — where credentials may live.
 */
export const SAFE_STORAGE_INJECTION_BOUNDARY = {
  allowedInjectionLocation: ".env.local",
  allowedScope: "isolated_local_worktree_host_only",
  forbidGitTrackedEnvFiles: true,
  forbidReportBodies: true,
  forbidCiLogs: true,
  forbidSharedChatTranscripts: true,
  forbidProductionSecretStoresForThisPrep: true,
  injectionDoesNotEnableProviderGates: true,
  injectionDoesNotAuthorizeStripeExecution: true,
} as const;

export type StripeTestExternalPrerequisiteOperatorPacketInput = {
  /** Host / operator env under audit (defaults empty). Values never echoed. */
  env?: Record<string, string | undefined>;
  /** Operator-declared money-fixture readiness (defaults all false). */
  operatorFixtures?: Partial<StripeTestExternalPrerequisiteOperatorFixtures>;
};

export type StripeTestExternalPrerequisiteConfigurationProbe = {
  requiredNames: readonly RequiredTestConfigurationName[];
  presentNames: RequiredTestConfigurationName[];
  missingNames: RequiredTestConfigurationName[];
  testModeConfirmed: boolean;
  liveCredentialRejected: boolean;
  liveRejectionReasonCodes: string[];
};

export type StripeTestExternalPrerequisiteFixtureProbe = {
  requiredFields: readonly RequiredFixtureField[];
  readyFields: RequiredFixtureField[];
  pendingFields: RequiredFixtureField[];
  allRequiredFixturesReady: boolean;
  codeFixturePackEnvironment: typeof STRIPE_TEST_FIXTURE_PACK_ENVIRONMENT;
  codeFixturePackDefinitionsValid: boolean;
};

export type StripeTestExternalPrerequisiteOperatorPacketReport = {
  version: typeof STRIPE_TEST_EXTERNAL_PREREQUISITE_OPERATOR_PACKET_VERSION;
  environment: typeof STRIPE_TEST_EXTERNAL_PREREQUISITE_OPERATOR_PACKET_ENVIRONMENT;
  verdict: StripeTestExternalPrerequisiteOperatorPacketVerdict;
  /** Contract packet itself is defined and safe — does NOT mean B3/B4 cleared. */
  operatorPacketReady: true;
  centralIntegrationStillRequired: true;
  stripeExecutionAuthorized: false;
  configuration: StripeTestExternalPrerequisiteConfigurationProbe;
  fixtures: StripeTestExternalPrerequisiteFixtureProbe;
  operatorFixtures: StripeTestExternalPrerequisiteOperatorFixtures;
  testOnlyValidation: typeof TEST_ONLY_VALIDATION;
  liveCredentialRejection: typeof LIVE_CREDENTIAL_REJECTION;
  secretRedactionRules: typeof SECRET_REDACTION_RULES;
  fixtureValidationRules: typeof FIXTURE_VALIDATION_RULES;
  safeStorageInjectionBoundary: typeof SAFE_STORAGE_INJECTION_BOUNDARY;
  preExecutionChecklist: string[];
  postTestCleanupRequirements: string[];
  b3CredentialsCleared: boolean;
  b4FixturesCleared: boolean;
  providerGates: "OFF";
  networkStripeCalls: 0;
  moneyMovement: 0;
  productionDbWrites: 0;
  activationPerformed: false;
  blockers: string[];
  note: string;
};

type EnvSource = Record<string, string | undefined>;

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

function assertStructuralAuthFalse(): void {
  if (
    STRIPE_TEST_EXTERNAL_PREREQUISITE_OPERATOR_PACKET_ACTIVATION_PERFORMED !==
      false ||
    STRIPE_TEST_EXTERNAL_PREREQUISITE_OPERATOR_PACKET_EXECUTION_AUTHORIZED !==
      false ||
    STRIPE_TEST_EXTERNAL_PREREQUISITE_CENTRAL_INTEGRATION_STILL_REQUIRED !== true
  ) {
    throw new Error(
      "stripe_test_external_prerequisite_operator_packet_structural_flags_invalid"
    );
  }
  if (
    STRIPE_TEST_EXTERNAL_PREREQUISITE_OPERATOR_PACKET_PROVIDER_EXECUTION_ENTRYPOINTS
      .length !== 0
  ) {
    throw new Error(
      "stripe_test_external_prerequisite_operator_packet_must_have_zero_execution_entrypoints"
    );
  }
}

function assertNoSecretEcho(payload: unknown): void {
  const blob = JSON.stringify(payload);
  for (const needle of FORBIDDEN_KEY_MATERIAL_SUBSTRINGS) {
    if (blob.includes(needle)) {
      throw new Error(
        "stripe_test_external_prerequisite_operator_packet_key_prefix_echo_detected"
      );
    }
  }
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

function probeConfiguration(
  source: EnvSource
): StripeTestExternalPrerequisiteConfigurationProbe {
  const presentNames: RequiredTestConfigurationName[] = [];
  const missingNames: RequiredTestConfigurationName[] = [];

  const values: Record<RequiredTestConfigurationName, string> = {
    STRIPE_MODE: readEnv(source, "STRIPE_MODE"),
    STRIPE_SECRET_KEY: readEnv(source, "STRIPE_SECRET_KEY"),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: resolvePublishable(source),
    STRIPE_WEBHOOK_SECRET: readEnv(source, "STRIPE_WEBHOOK_SECRET"),
    NEXT_PUBLIC_APP_URL: resolveAppUrl(source),
  };

  for (const name of REQUIRED_TEST_CONFIGURATION_NAMES) {
    if (values[name]) presentNames.push(name);
    else missingNames.push(name);
  }

  const mode = values.STRIPE_MODE.toLowerCase();
  const secret = values.STRIPE_SECRET_KEY;
  const publishable = values.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const liveRejectionReasonCodes: string[] = [];

  if (mode === "live") liveRejectionReasonCodes.push("stripe_mode_live");
  if (secret.startsWith("sk_live_")) {
    liveRejectionReasonCodes.push("secret_prefix_sk_live");
  }
  if (publishable.startsWith("pk_live_")) {
    liveRejectionReasonCodes.push("publishable_prefix_pk_live");
  }
  if (
    readEnv(source, PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_ENV)
  ) {
    liveRejectionReasonCodes.push("production_exec_ack_present");
  }
  if (
    secret.startsWith("sk_test_") &&
    publishable.startsWith("pk_live_")
  ) {
    liveRejectionReasonCodes.push("mixed_test_live_key_modes");
  }
  if (
    secret.startsWith("sk_live_") &&
    publishable.startsWith("pk_test_")
  ) {
    liveRejectionReasonCodes.push("mixed_test_live_key_modes");
  }

  const testModeConfirmed =
    mode === "test" &&
    secret.startsWith("sk_test_") &&
    publishable.startsWith("pk_test_") &&
    values.STRIPE_WEBHOOK_SECRET.startsWith("whsec_") &&
    Boolean(values.NEXT_PUBLIC_APP_URL);

  return {
    requiredNames: REQUIRED_TEST_CONFIGURATION_NAMES,
    presentNames,
    missingNames,
    testModeConfirmed,
    liveCredentialRejected: liveRejectionReasonCodes.length === 0,
    liveRejectionReasonCodes,
  };
}

function probeFixtures(
  fixtures: StripeTestExternalPrerequisiteOperatorFixtures
): StripeTestExternalPrerequisiteFixtureProbe {
  const readyFields: RequiredFixtureField[] = [];
  const pendingFields: RequiredFixtureField[] = [];
  for (const field of REQUIRED_FIXTURE_FIELDS) {
    if (fixtures[field]) readyFields.push(field);
    else pendingFields.push(field);
  }

  const defs = getStripeTestFixturePackDefinitions();
  const codeFixturePackDefinitionsValid =
    defs.environment === STRIPE_TEST_FIXTURE_PACK_ENVIRONMENT &&
    typeof defs.paymentIntentRef === "string" &&
    defs.paymentIntentRef.startsWith("pi_") &&
    defs.capturedAmountMinor > 0 &&
    defs.refundAmountMinor > 0 &&
    defs.refundAmountMinor <= defs.capturedAmountMinor;

  return {
    requiredFields: REQUIRED_FIXTURE_FIELDS,
    readyFields,
    pendingFields,
    allRequiredFixturesReady: pendingFields.length === 0,
    codeFixturePackEnvironment: STRIPE_TEST_FIXTURE_PACK_ENVIRONMENT,
    codeFixturePackDefinitionsValid,
  };
}

/**
 * PRE_EXECUTION_CHECKLIST — operator steps to clear B3/B4 only.
 * Does NOT authorize Stripe execution / gate enablement.
 */
export function buildExternalPrerequisitePreExecutionChecklist(): string[] {
  return [
    "CONFIRM this packet clears B3/B4 prerequisites only — Stripe execution remains unauthorized.",
    "CONFIRM CENTRAL_INTEGRATION_STILL_REQUIRED=YES (SM+dry-run + env-readiness still missing from Commerce SoT tip).",
    "Place isolated Stripe TEST credentials in local .env.local ONLY (never commit): STRIPE_MODE=test, STRIPE_SECRET_KEY (TEST secret prefix), NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (TEST publishable prefix), STRIPE_WEBHOOK_SECRET (webhook signing prefix), NEXT_PUBLIC_APP_URL.",
    "CONFIRM LIVE credentials absent: no LIVE secret/publishable prefixes, STRIPE_MODE must not be live, PRODUCTION_EXEC_ACK absent.",
    "CONFIRM provider-money gate env + ACK + execution mode remain unset/OFF during credential injection.",
    "Prepare controlled TEST money fixtures WITHOUT fabricating identifiers into git: captured TEST PaymentIntent, matching payment_attempt + capture facts, committed partial-refund ledger (amount>0, currency match, ≤ captured), zero provider-execution rows for that ledger.",
    "CONFIRM isolated Supabase/test project OR explicit written money-fixture GO before any remote fixture persistence.",
    "Attest REQUIRED_FIXTURE_FIELDS as operator booleans only; do not paste secret values or live object dumps into reports/chat/git.",
    "Re-probe this operator packet locally after injection — expect B3/B4 clearance booleans true only when shapes + attestations satisfy rules.",
    "STOP. Do not enable provider gates. Do not open a Stripe GO window from this packet. Wait for Central SoT integration + separate coordinator GO.",
  ];
}

/**
 * POST_TEST_CLEANUP_REQUIREMENTS — after any future authorized TEST (not this task).
 */
export function buildExternalPrerequisitePostTestCleanupRequirements(): string[] {
  return [
    "Remove temporary Stripe TEST credential values from local .env.local after the controlled window (or rotate TEST secrets if exposure suspected).",
    "CONFIRM .env.local remains gitignored and was never staged/committed.",
    "Set provider-money gate + ACK + execution mode back OFF/unset; PRODUCTION_EXEC_ACK must remain ABSENT.",
    "Deactivate / reset any activation state machine to DISABLED if it was temporarily used under a separate GO.",
    "Do not leave captured TEST PaymentIntent / ledger fixture rows marked as reusable without a new written GO.",
    "Redact any operator notes: keep env NAMES / reason codes / booleans only — never key material or webhook secrets.",
    "Re-run offline preflight / control-plane / this operator packet probe and confirm gates OFF + execution unauthorized.",
    "Do not retry Stripe TEST execution without a new separate coordinator GO after cleanup.",
  ];
}

/**
 * Build operator packet report for B3/B4 prerequisite contracts.
 * Never executes Stripe / never enables gates / never echoes secrets.
 */
export function buildStripeTestExternalPrerequisiteOperatorPacketReport(
  input: StripeTestExternalPrerequisiteOperatorPacketInput = {}
): StripeTestExternalPrerequisiteOperatorPacketReport {
  assertStructuralAuthFalse();

  const hostEnv: EnvSource = input.env ?? {};
  const operatorFixtures: StripeTestExternalPrerequisiteOperatorFixtures = {
    ...STRIPE_TEST_EXTERNAL_PREREQUISITE_DEFAULT_OPERATOR_FIXTURES,
    ...input.operatorFixtures,
  };

  const configuration = probeConfiguration(hostEnv);
  const fixtures = probeFixtures(operatorFixtures);
  const gatesOff = providerGatesOff(hostEnv);

  const b3CredentialsCleared =
    configuration.missingNames.length === 0 &&
    configuration.testModeConfirmed &&
    configuration.liveCredentialRejected;

  const b4FixturesCleared =
    fixtures.allRequiredFixturesReady &&
    fixtures.codeFixturePackDefinitionsValid;

  const blockers: string[] = [];
  if (!gatesOff) {
    blockers.push("provider_gates_or_execution_mode_not_off");
  }
  if (!configuration.liveCredentialRejected) {
    blockers.push(
      ...configuration.liveRejectionReasonCodes.map(
        (code) => `live_or_unsafe:${code}`
      )
    );
  }
  if (configuration.missingNames.length > 0) {
    blockers.push(
      `b3_missing_configuration_names:${configuration.missingNames.join(",")}`
    );
  } else if (!configuration.testModeConfirmed) {
    blockers.push("b3_test_mode_or_test_prefixes_not_confirmed");
  }
  if (fixtures.pendingFields.length > 0) {
    blockers.push(
      `b4_pending_fixture_fields:${fixtures.pendingFields.join(",")}`
    );
  }
  if (!fixtures.codeFixturePackDefinitionsValid) {
    blockers.push("b4_code_fixture_pack_definitions_invalid");
  }
  blockers.push(
    "central_integration_still_required_sm_dry_run_and_env_readiness"
  );
  blockers.push("stripe_execution_authorized_remains_no");

  let verdict: StripeTestExternalPrerequisiteOperatorPacketVerdict =
    "OPERATOR_PACKET_CONTRACT_READY_B3_B4_CLEARANCE_PENDING";
  if (!gatesOff) {
    verdict = "OPERATOR_PACKET_BLOCKED_PROVIDER_GATES_NOT_OFF";
  } else if (!configuration.liveCredentialRejected) {
    verdict = "OPERATOR_PACKET_BLOCKED_LIVE_OR_UNSAFE_HOST_SHAPE";
  }

  const report: StripeTestExternalPrerequisiteOperatorPacketReport = {
    version: STRIPE_TEST_EXTERNAL_PREREQUISITE_OPERATOR_PACKET_VERSION,
    environment:
      STRIPE_TEST_EXTERNAL_PREREQUISITE_OPERATOR_PACKET_ENVIRONMENT,
    verdict,
    operatorPacketReady: true,
    centralIntegrationStillRequired: true,
    stripeExecutionAuthorized: false,
    configuration,
    fixtures,
    operatorFixtures,
    testOnlyValidation: TEST_ONLY_VALIDATION,
    liveCredentialRejection: LIVE_CREDENTIAL_REJECTION,
    secretRedactionRules: SECRET_REDACTION_RULES,
    fixtureValidationRules: FIXTURE_VALIDATION_RULES,
    safeStorageInjectionBoundary: SAFE_STORAGE_INJECTION_BOUNDARY,
    preExecutionChecklist: buildExternalPrerequisitePreExecutionChecklist(),
    postTestCleanupRequirements:
      buildExternalPrerequisitePostTestCleanupRequirements(),
    b3CredentialsCleared,
    b4FixturesCleared,
    providerGates: "OFF",
    networkStripeCalls: 0,
    moneyMovement: 0,
    productionDbWrites: 0,
    activationPerformed: false,
    blockers,
    note:
      "SAFE operator packet for B3/B4 only. Does not obtain credentials, call Stripe, enable gates, or authorize execution. Central SoT integration still required.",
  };

  // Structural: packet never claims provider gates ON even if host is misconfigured;
  // misconfiguration is surfaced via verdict/blockers instead.
  if (!gatesOff) {
    report.providerGates = "OFF";
  }

  assertNoSecretEcho(report);
  return report;
}

export function isStripeTestExternalPrerequisiteOperatorPacketReady(): boolean {
  return (
    buildStripeTestExternalPrerequisiteOperatorPacketReport().operatorPacketReady ===
    true
  );
}
