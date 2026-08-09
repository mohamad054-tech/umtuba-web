/**
 * Deterministic NON-SECRET isolated Stripe TEST fixture pack.
 *
 * Fills code-side gaps identified by the env-readiness probe:
 * - synthetic TEST PaymentIntent ref
 * - matching payment_attempt + capture outcome fact shapes
 * - committed partial-refund ledger facts
 * - zero provider-execution rows for that ledger
 * - filled P6 fixture manifest (deterministic TEST-only values)
 *
 * Hard guarantees:
 * - No Stripe secret values embedded
 * - No production IDs / customer / payment data
 * - Fail closed when TEST credentials absent (controlled-validation probe)
 * - Explicitly distinguishes TEST from LIVE
 * - Never activates provider gates / execution mode
 * - Never executes money movement / never calls Stripe network
 * - Never writes to production DB
 */

import {
  buildStripePaymentConfigReadinessReport,
  evaluateStripeLiveCaptureConfigForTests,
  type StripePaymentMode,
} from "../stripeConfig";
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
import { buildPartialRefundProviderIdempotencyKey } from "./idempotency";
import type { CommittedLedgerFactsForProviderMoney } from "./orchestrator";
import { isStripePaymentIntentRef, normalizeCurrency } from "./validate";

export const STRIPE_TEST_FIXTURE_PACK_VERSION =
  "commerce-stripe-test-fixture-pack-v1" as const;

/** Explicit environment label — never "live" / never production. */
export const STRIPE_TEST_FIXTURE_PACK_ENVIRONMENT =
  "isolated_stripe_test_fixture_pack_v1_not_production" as const;

/**
 * Deterministic UUID namespace reserved for this NON-SECRET pack.
 * Not production store/order/customer data.
 */
export const STRIPE_TEST_FIXTURE_PACK_IDS = {
  storeId: "a2010001-0001-4001-8001-000000000001",
  orderId: "a2010001-0001-4001-8001-000000000002",
  paymentAttemptId: "a2010001-0001-4001-8001-000000000003",
  captureEventId: "a2010001-0001-4001-8001-000000000004",
  ledgerId: "a2010001-0001-4001-8001-000000000005",
} as const;

/**
 * Synthetic Stripe TEST PaymentIntent reference.
 * Shape-valid for local/offline validation only — NOT a real Stripe object.
 */
export const STRIPE_TEST_FIXTURE_PACK_PAYMENT_INTENT_REF =
  "pi_3TestFixturePackIsolated0001" as const;

/** Captured amount on the synthetic TEST PaymentIntent (minor units). */
export const STRIPE_TEST_FIXTURE_PACK_CAPTURED_AMOUNT_MINOR = 5000 as const;

/** Committed partial-refund amount (≤ captured; > 0). */
export const STRIPE_TEST_FIXTURE_PACK_REFUND_AMOUNT_MINOR = 1500 as const;

export const STRIPE_TEST_FIXTURE_PACK_CURRENCY = "USD" as const;

export type StripeTestFixturePackVerdict =
  | "fixture_pack_ready_gates_remain_off_operator_remote_go_pending"
  | "blocked_test_credentials_absent"
  | "blocked_live_or_mixed_stripe_shape"
  | "blocked_misconfigured_or_unsafe_activation_state";

export type StripeTestFixturePersistedFactShapes = {
  environment: typeof STRIPE_TEST_FIXTURE_PACK_ENVIRONMENT;
  stripeModeRequired: "test";
  paymentIntentRef: typeof STRIPE_TEST_FIXTURE_PACK_PAYMENT_INTENT_REF;
  order: {
    id: string;
    store_id: string;
  };
  payment_attempt: {
    id: string;
    store_id: string;
    order_id: string;
    provider: "stripe";
    provider_reference: typeof STRIPE_TEST_FIXTURE_PACK_PAYMENT_INTENT_REF;
    status: "captured";
    amount_minor: number;
    currency: string;
  };
  capture_outcome: {
    id: string;
    store_id: string;
    order_id: string;
    payment_attempt_id: string;
    event_key: string;
    provider_reference: typeof STRIPE_TEST_FIXTURE_PACK_PAYMENT_INTENT_REF;
    status: "captured";
    amount_minor: number;
    currency: string;
  };
  committed_ledger: CommittedLedgerFactsForProviderMoney;
  provider_executions_for_ledger: [];
  expectedIdempotencyKey: string;
};

export type StripeTestFixtureP6Manifest = {
  version: typeof STRIPE_TEST_FIXTURE_PACK_VERSION;
  environmentClassification: typeof STRIPE_TEST_FIXTURE_PACK_ENVIRONMENT;
  stripeMode: "test";
  testPaymentIntentSafeRef: typeof STRIPE_TEST_FIXTURE_PACK_PAYMENT_INTENT_REF;
  captureOrderStoreSafeRefs: {
    storeId: string;
    orderId: string;
    paymentAttemptId: string;
    captureEventId: string;
  };
  ledgerId: string;
  refundAmountMinor: number;
  capturedAmountMinor: number;
  currency: string;
  expectedIdempotencyKey: string;
  preRunStatuses: {
    ledger: "committed";
    providerExecutions: "none";
  };
  postRunInvariants: string[];
  /** Always false in this pack — never auto-authorizes remote money-row writes. */
  remotePersistenceAuthorized: false;
  operatorRemoteGoStillRequired: true;
  note: string;
};

export type StripeTestFixturePackReport = {
  version: typeof STRIPE_TEST_FIXTURE_PACK_VERSION;
  environment: typeof STRIPE_TEST_FIXTURE_PACK_ENVIRONMENT;
  verdict: StripeTestFixturePackVerdict;
  stripeModeDetected: StripePaymentMode | null;
  liveKeyPrefixDetected: boolean;
  testCredentialsPresent: boolean;
  dedicatedGateCurrentlySatisfied: boolean;
  executionModeCurrent: string;
  productionExecAckPresent: boolean;
  gatesRemainOff: boolean;
  definitionsValid: boolean;
  filledP6Manifest: StripeTestFixtureP6Manifest;
  persistedFactShapes: StripeTestFixturePersistedFactShapes;
  /** Gaps that still require operator / remote GO (not inventable here). */
  operatorRemoteGaps: string[];
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

function secretModePrefix(secretKey: string | null): StripePaymentMode | null {
  if (!secretKey) return null;
  if (secretKey.startsWith("sk_test_")) return "test";
  if (secretKey.startsWith("sk_live_")) return "live";
  return null;
}

function publishableModePrefix(key: string | null): StripePaymentMode | null {
  if (!key) return null;
  if (key.startsWith("pk_test_")) return "test";
  if (key.startsWith("pk_live_")) return "live";
  return null;
}

/**
 * Pure deterministic definitions — always available offline.
 * Contains no secrets and does not read process.env.
 */
export function getStripeTestFixturePackDefinitions(): {
  version: typeof STRIPE_TEST_FIXTURE_PACK_VERSION;
  environment: typeof STRIPE_TEST_FIXTURE_PACK_ENVIRONMENT;
  ids: typeof STRIPE_TEST_FIXTURE_PACK_IDS;
  paymentIntentRef: typeof STRIPE_TEST_FIXTURE_PACK_PAYMENT_INTENT_REF;
  capturedAmountMinor: typeof STRIPE_TEST_FIXTURE_PACK_CAPTURED_AMOUNT_MINOR;
  refundAmountMinor: typeof STRIPE_TEST_FIXTURE_PACK_REFUND_AMOUNT_MINOR;
  currency: typeof STRIPE_TEST_FIXTURE_PACK_CURRENCY;
  expectedIdempotencyKey: string;
} {
  return {
    version: STRIPE_TEST_FIXTURE_PACK_VERSION,
    environment: STRIPE_TEST_FIXTURE_PACK_ENVIRONMENT,
    ids: STRIPE_TEST_FIXTURE_PACK_IDS,
    paymentIntentRef: STRIPE_TEST_FIXTURE_PACK_PAYMENT_INTENT_REF,
    capturedAmountMinor: STRIPE_TEST_FIXTURE_PACK_CAPTURED_AMOUNT_MINOR,
    refundAmountMinor: STRIPE_TEST_FIXTURE_PACK_REFUND_AMOUNT_MINOR,
    currency: STRIPE_TEST_FIXTURE_PACK_CURRENCY,
    expectedIdempotencyKey: buildPartialRefundProviderIdempotencyKey(
      STRIPE_TEST_FIXTURE_PACK_IDS.ledgerId
    ),
  };
}

/** Committed ledger facts matching the pack (status=committed, amount>0). */
export function buildStripeTestFixtureCommittedLedgerFacts(): CommittedLedgerFactsForProviderMoney {
  return {
    ledgerId: STRIPE_TEST_FIXTURE_PACK_IDS.ledgerId,
    storeId: STRIPE_TEST_FIXTURE_PACK_IDS.storeId,
    orderId: STRIPE_TEST_FIXTURE_PACK_IDS.orderId,
    paymentAttemptId: STRIPE_TEST_FIXTURE_PACK_IDS.paymentAttemptId,
    captureEventId: STRIPE_TEST_FIXTURE_PACK_IDS.captureEventId,
    status: "committed",
    refundAmountMinor: STRIPE_TEST_FIXTURE_PACK_REFUND_AMOUNT_MINOR,
    currency: STRIPE_TEST_FIXTURE_PACK_CURRENCY,
  };
}

/**
 * In-memory persisted fact shapes for future controlled TEST validation.
 * Not written to any database by this module.
 */
export function buildStripeTestFixturePersistedFactShapes(): StripeTestFixturePersistedFactShapes {
  const defs = getStripeTestFixturePackDefinitions();
  const currency =
    normalizeCurrency(defs.currency) ?? STRIPE_TEST_FIXTURE_PACK_CURRENCY;
  return {
    environment: STRIPE_TEST_FIXTURE_PACK_ENVIRONMENT,
    stripeModeRequired: "test",
    paymentIntentRef: STRIPE_TEST_FIXTURE_PACK_PAYMENT_INTENT_REF,
    order: {
      id: defs.ids.orderId,
      store_id: defs.ids.storeId,
    },
    payment_attempt: {
      id: defs.ids.paymentAttemptId,
      store_id: defs.ids.storeId,
      order_id: defs.ids.orderId,
      provider: "stripe",
      provider_reference: STRIPE_TEST_FIXTURE_PACK_PAYMENT_INTENT_REF,
      status: "captured",
      amount_minor: defs.capturedAmountMinor,
      currency,
    },
    capture_outcome: {
      id: defs.ids.captureEventId,
      store_id: defs.ids.storeId,
      order_id: defs.ids.orderId,
      payment_attempt_id: defs.ids.paymentAttemptId,
      event_key: `stripe:${STRIPE_TEST_FIXTURE_PACK_PAYMENT_INTENT_REF}:captured`,
      provider_reference: STRIPE_TEST_FIXTURE_PACK_PAYMENT_INTENT_REF,
      status: "captured",
      amount_minor: defs.capturedAmountMinor,
      currency,
    },
    committed_ledger: buildStripeTestFixtureCommittedLedgerFacts(),
    provider_executions_for_ledger: [],
    expectedIdempotencyKey: defs.expectedIdempotencyKey,
  };
}

/** Filled P6 fixture manifest with deterministic TEST-only values. */
export function buildStripeTestFixtureP6Manifest(): StripeTestFixtureP6Manifest {
  const defs = getStripeTestFixturePackDefinitions();
  return {
    version: STRIPE_TEST_FIXTURE_PACK_VERSION,
    environmentClassification: STRIPE_TEST_FIXTURE_PACK_ENVIRONMENT,
    stripeMode: "test",
    testPaymentIntentSafeRef: STRIPE_TEST_FIXTURE_PACK_PAYMENT_INTENT_REF,
    captureOrderStoreSafeRefs: {
      storeId: defs.ids.storeId,
      orderId: defs.ids.orderId,
      paymentAttemptId: defs.ids.paymentAttemptId,
      captureEventId: defs.ids.captureEventId,
    },
    ledgerId: defs.ids.ledgerId,
    refundAmountMinor: defs.refundAmountMinor,
    capturedAmountMinor: defs.capturedAmountMinor,
    currency: defs.currency,
    expectedIdempotencyKey: defs.expectedIdempotencyKey,
    preRunStatuses: {
      ledger: "committed",
      providerExecutions: "none",
    },
    postRunInvariants: [
      "exactly_one_execution_outcome",
      "submit_count_one_then_idempotent_replay",
      "gates_returned_off",
      "no_auto_compensation_restock_or_sync",
    ],
    remotePersistenceAuthorized: false,
    operatorRemoteGoStillRequired: true,
    note:
      "Deterministic NON-SECRET TEST pack. Synthetic pi_/UUID refs are for offline + future controlled TEST validation only. Remote money-row persistence requires separate operator GO + isolated Supabase/test project. Gates remain OFF.",
  };
}

function assertDefinitionsValid(): { ok: true } | { ok: false; issues: string[] } {
  const issues: string[] = [];
  const defs = getStripeTestFixturePackDefinitions();
  if (!isStripePaymentIntentRef(defs.paymentIntentRef)) {
    issues.push("fixture_payment_intent_ref_invalid");
  }
  if (!defs.paymentIntentRef.includes("TestFixturePack")) {
    issues.push("fixture_payment_intent_ref_missing_test_marker");
  }
  if (
    !Number.isInteger(defs.refundAmountMinor) ||
    defs.refundAmountMinor <= 0
  ) {
    issues.push("fixture_refund_amount_invalid");
  }
  if (defs.refundAmountMinor > defs.capturedAmountMinor) {
    issues.push("fixture_refund_exceeds_captured");
  }
  if (normalizeCurrency(defs.currency) !== "USD") {
    issues.push("fixture_currency_invalid");
  }
  if (
    defs.expectedIdempotencyKey !==
    `prf-prov:${defs.ids.ledgerId.toLowerCase()}`
  ) {
    issues.push("fixture_idempotency_key_mismatch");
  }
  const facts = buildStripeTestFixturePersistedFactShapes();
  if (facts.provider_executions_for_ledger.length !== 0) {
    issues.push("fixture_provider_executions_not_empty");
  }
  if (facts.committed_ledger.status !== "committed") {
    issues.push("fixture_ledger_not_committed");
  }
  if (!STRIPE_TEST_FIXTURE_PACK_ENVIRONMENT.includes("not_production")) {
    issues.push("fixture_environment_not_explicitly_non_production");
  }
  if (/\blive\b/i.test(STRIPE_TEST_FIXTURE_PACK_ENVIRONMENT)) {
    issues.push("fixture_environment_looks_like_live");
  }
  return issues.length === 0 ? { ok: true } : { ok: false, issues };
}

/**
 * Build redacted fixture-pack report.
 * Does not mutate process.env, does not enable gates/modes, does not call Stripe.
 */
export function buildStripeTestFixturePackReport(
  source: EnvSource = process.env
): StripeTestFixturePackReport {
  const issues: string[] = [];
  const definitionCheck = assertDefinitionsValid();
  if (!definitionCheck.ok) {
    issues.push(...definitionCheck.issues);
  }

  const secretKey = readEnv("STRIPE_SECRET_KEY", source);
  const publishableKey =
    readEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", source) ??
    readEnv("STRIPE_PUBLISHABLE_KEY", source);
  const stripeMode = readEnv("STRIPE_MODE", source);
  const appOrigin =
    readEnv("NEXT_PUBLIC_APP_URL", source) ??
    readEnv("APP_ORIGIN", source) ??
    readEnv("NEXT_PUBLIC_SITE_URL", source);

  const secretMode = secretModePrefix(secretKey);
  const publishableMode = publishableModePrefix(publishableKey);
  const liveKeyPrefixDetected =
    secretMode === "live" || publishableMode === "live";

  if (liveKeyPrefixDetected) {
    issues.push("live_stripe_key_prefix_detected");
  }
  if (stripeMode != null && stripeMode !== "test") {
    issues.push("stripe_mode_not_test");
  }
  if (secretMode === "test" && stripeMode === "test" && publishableMode === "live") {
    issues.push("publishable_live_with_test_secret");
  }
  if (secretMode === "live" && stripeMode === "test") {
    issues.push("secret_live_with_declared_test_mode");
  }

  const stripeReport = buildStripePaymentConfigReadinessReport(source);
  // Exercise config evaluator (fail-closed semantics) without enabling gates.
  void evaluateStripeLiveCaptureConfigForTests(source);

  const testCredentialsPresent = Boolean(
    secretKey &&
      secretMode === "test" &&
      stripeMode === "test" &&
      appOrigin &&
      !liveKeyPrefixDetected
  );

  // Config probe may fail for missing webhook etc.; we only require TEST shape for pack readiness.
  if (!secretKey) issues.push("stripe_secret_key_absent");
  if (!stripeMode) issues.push("stripe_mode_absent");
  if (!appOrigin) issues.push("app_origin_absent");
  if (secretKey && secretMode !== "test" && secretMode !== "live") {
    issues.push("stripe_secret_key_prefix_unrecognized");
  }
  if (stripeReport.mode === "live") {
    issues.push("stripe_config_report_mode_live");
  }

  const dedicatedGate = evaluatePartialRefundProviderMoneyGate(source);
  const dedicatedGateCurrentlySatisfied = dedicatedGate.ok;
  const executionModeCurrent = readPartialRefundProviderMoneyExecutionMode(source);
  const productionExecAckPresent = Boolean(
    readEnv(PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_ENV, source)
  );
  const gateFlagPresent = Boolean(readEnv(PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV, source));
  const gateAckPresent = Boolean(
    readEnv(PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV, source)
  );
  const executionModeEnvPresent = Boolean(
    readEnv(PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV, source)
  );

  if (dedicatedGateCurrentlySatisfied) {
    issues.push("dedicated_provider_money_gate_on");
  }
  if (executionModeCurrent !== "off") {
    issues.push("execution_mode_not_off");
  }
  if (productionExecAckPresent) {
    issues.push("production_exec_ack_present");
  }
  // Soft signal: activation-related envs should stay unset during pack prep
  if (gateFlagPresent || gateAckPresent || executionModeEnvPresent) {
    // Only add if not already covered by stronger checks above
    if (!dedicatedGateCurrentlySatisfied && executionModeCurrent === "off") {
      issues.push("activation_related_env_present_during_pack_prep");
    }
  }

  const gatesRemainOff =
    !dedicatedGateCurrentlySatisfied &&
    executionModeCurrent === "off" &&
    !productionExecAckPresent;

  const definitionsValid = definitionCheck.ok;
  const filledP6Manifest = buildStripeTestFixtureP6Manifest();
  const persistedFactShapes = buildStripeTestFixturePersistedFactShapes();

  const operatorRemoteGaps = [
    "approved_isolated_supabase_or_explicit_money_fixture_go",
    "remote_persistence_of_fixture_fact_shapes",
    "operator_supplied_real_stripe_test_payment_intent_when_network_validation_required",
  ];

  let verdict: StripeTestFixturePackVerdict;
  if (liveKeyPrefixDetected || issues.includes("stripe_mode_not_test")) {
    verdict = "blocked_live_or_mixed_stripe_shape";
  } else if (!testCredentialsPresent) {
    verdict = "blocked_test_credentials_absent";
  } else if (
    !definitionsValid ||
    !gatesRemainOff ||
    issues.includes("activation_related_env_present_during_pack_prep")
  ) {
    verdict = "blocked_misconfigured_or_unsafe_activation_state";
  } else {
    verdict =
      "fixture_pack_ready_gates_remain_off_operator_remote_go_pending";
  }

  return {
    version: STRIPE_TEST_FIXTURE_PACK_VERSION,
    environment: STRIPE_TEST_FIXTURE_PACK_ENVIRONMENT,
    verdict,
    stripeModeDetected: secretMode ?? stripeReport.mode,
    liveKeyPrefixDetected,
    testCredentialsPresent,
    dedicatedGateCurrentlySatisfied,
    executionModeCurrent,
    productionExecAckPresent,
    gatesRemainOff,
    definitionsValid,
    filledP6Manifest,
    persistedFactShapes,
    operatorRemoteGaps,
    issues,
    note:
      "NON-SECRET deterministic Stripe TEST fixture pack. No network. No gate activation. No money movement. Remote persistence requires separate operator GO.",
  };
}

/**
 * True only when pack definitions are valid, TEST credential shape is present,
 * and gates/mode remain safely OFF. Does not authorize activation or remote writes.
 */
export function isStripeTestFixturePackReadyForControlledValidation(
  source: EnvSource = process.env
): boolean {
  const report = buildStripeTestFixturePackReport(source);
  return (
    report.verdict ===
    "fixture_pack_ready_gates_remain_off_operator_remote_go_pending"
  );
}
