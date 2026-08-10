/**
 * Isolated Stripe TEST fixture env readiness — audit / operator prep only.
 *
 * - Never activates dedicated gate or execution mode.
 * - Never calls Stripe network / never moves money.
 * - Never logs or returns secret values — presence + prefix mode only.
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
  PARTIAL_REFUND_PROVIDER_MONEY_NON_PRODUCTION_FIXTURE_TOKEN,
  evaluatePartialRefundProviderMoneyGate,
} from "./gate";

export const STRIPE_TEST_FIXTURE_ENV_READINESS_VERSION =
  "commerce-stripe-test-fixture-env-readiness-v1" as const;

export type StripeTestFixtureEnvReadinessVerdict =
  | "stripe_test_config_shape_ready_gates_remain_off"
  | "operator_credentials_required"
  | "blocked_live_or_mixed_stripe_shape"
  | "blocked_misconfigured";

export type StripeTestFixtureOperatorInput = {
  /** Environment variable name only — never a value. */
  envName: string;
  /** Safe operator guidance (no secrets). */
  purpose: string;
  /** Where the operator should place the value. */
  location: string;
  /** Whether this input is required before any future TEST activation GO. */
  requiredForFutureTestActivationGo: boolean;
};

export type StripeTestFixtureEnvReadinessReport = {
  version: typeof STRIPE_TEST_FIXTURE_ENV_READINESS_VERSION;
  verdict: StripeTestFixtureEnvReadinessVerdict;
  /** True when Stripe TEST secret/mode/origin shape is usable (config probe ok + mode=test). */
  stripeTestConfigShapeReady: boolean;
  stripeModeDetected: StripePaymentMode | null;
  liveKeyPrefixDetected: boolean;
  dedicatedGateCurrentlySatisfied: boolean;
  executionModeCurrent: string;
  productionExecAckPresent: boolean;
  appOriginPresent: boolean;
  /** Env names that are unset/empty in the provided source. */
  missingEnvNames: string[];
  issues: string[];
  /** Secure operator inputs — names/locations only. */
  operatorInputsRequired: StripeTestFixtureOperatorInput[];
  /**
   * Non-env fixture pack gaps that remain even after TEST credentials exist.
   * Documented for operator/fixture-build GO — not invented here.
   */
  fixturePackGaps: string[];
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
 * Build redacted readiness for isolated Stripe TEST fixture env prep.
 * Does not mutate process.env and does not enable any gate/mode.
 */
export function buildStripeTestFixtureEnvReadinessReport(
  source: EnvSource = process.env
): StripeTestFixtureEnvReadinessReport {
  const missingEnvNames: string[] = [];
  const issues: string[] = [];

  const secretKey = readEnv("STRIPE_SECRET_KEY", source);
  const publishableKey =
    readEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", source) ??
    readEnv("STRIPE_PUBLISHABLE_KEY", source);
  const webhookSecret = readEnv("STRIPE_WEBHOOK_SECRET", source);
  const stripeMode = readEnv("STRIPE_MODE", source);
  const appOrigin =
    readEnv("NEXT_PUBLIC_APP_URL", source) ??
    readEnv("APP_ORIGIN", source) ??
    readEnv("NEXT_PUBLIC_SITE_URL", source);

  if (!secretKey) missingEnvNames.push("STRIPE_SECRET_KEY");
  if (!publishableKey) {
    missingEnvNames.push("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
  }
  if (!webhookSecret) missingEnvNames.push("STRIPE_WEBHOOK_SECRET");
  if (!stripeMode) missingEnvNames.push("STRIPE_MODE");
  if (!appOrigin) missingEnvNames.push("NEXT_PUBLIC_APP_URL");

  const secretMode = secretModePrefix(secretKey);
  const publishableMode = publishableModePrefix(publishableKey);
  const liveKeyPrefixDetected =
    secretMode === "live" || publishableMode === "live";

  const stripeProbe = evaluateStripeLiveCaptureConfigForTests(source);
  const stripeReport = buildStripePaymentConfigReadinessReport(source);
  const stripeTestConfigShapeReady =
    stripeProbe.ok && stripeProbe.mode === "test";

  if (liveKeyPrefixDetected) {
    issues.push("live_stripe_key_prefix_detected");
  }
  if (secretKey && !secretMode) {
    issues.push("secret_key_mode_unknown");
  }
  if (stripeMode && stripeMode.toLowerCase() !== "test") {
    issues.push("stripe_mode_not_test");
  }
  if (
    publishableMode &&
    secretMode &&
    publishableMode !== secretMode
  ) {
    issues.push("publishable_secret_mode_mismatch");
  }
  if (!stripeProbe.ok && secretKey) {
    issues.push(`stripe_config_probe_failed:${stripeProbe.code ?? "unknown"}`);
  }
  if (stripeReport.checks.livePaymentsEnabledFlag) {
    issues.push("stripe_live_payments_flag_enabled_with_test_prep");
  }

  const dedicatedGateCurrentlySatisfied =
    evaluatePartialRefundProviderMoneyGate(source).ok;
  const executionModeCurrent =
    readPartialRefundProviderMoneyExecutionMode(source);
  const productionExecAckPresent = Boolean(
    readEnv(PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_ENV, source)
  );

  if (dedicatedGateCurrentlySatisfied) {
    issues.push("dedicated_provider_money_gate_currently_on");
  }
  if (executionModeCurrent !== "off") {
    issues.push(`execution_mode_not_off:${executionModeCurrent}`);
  }
  if (productionExecAckPresent) {
    issues.push("production_exec_ack_present_during_test_prep");
  }

  const operatorInputsRequired: StripeTestFixtureOperatorInput[] = [
    {
      envName: "STRIPE_MODE",
      purpose: "Must be exactly test for isolated TEST validation.",
      location: "Local worktree `.env.local` (never commit).",
      requiredForFutureTestActivationGo: true,
    },
    {
      envName: "STRIPE_SECRET_KEY",
      purpose: "Stripe TEST secret only (test-mode secret prefix). Never live-mode secrets.",
      location: "Local worktree `.env.local` (never commit).",
      requiredForFutureTestActivationGo: true,
    },
    {
      envName: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
      purpose: "Matching Stripe TEST publishable key (prefix pk_test_).",
      location: "Local worktree `.env.local` (never commit).",
      requiredForFutureTestActivationGo: true,
    },
    {
      envName: "STRIPE_WEBHOOK_SECRET",
      purpose: "Stripe TEST webhook signing secret (prefix whsec_).",
      location: "Local worktree `.env.local` (never commit).",
      requiredForFutureTestActivationGo: true,
    },
    {
      envName: "NEXT_PUBLIC_APP_URL",
      purpose: "App origin for safe return URL construction (local/test origin).",
      location: "Local worktree `.env.local` (never commit).",
      requiredForFutureTestActivationGo: true,
    },
    {
      envName: PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV,
      purpose:
        "Future TEST activation GO only — keep unset/false until explicit GO.",
      location: "Isolated host/env for temporary TEST dry-run only.",
      requiredForFutureTestActivationGo: false,
    },
    {
      envName: PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV,
      purpose:
        "Future TEST activation GO only — exact gate ACK; keep absent now.",
      location: "Isolated host/env for temporary TEST dry-run only.",
      requiredForFutureTestActivationGo: false,
    },
    {
      envName:
        "UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_ALLOW_IN_NON_PRODUCTION",
      purpose: `Future non-production TEST GO only — exact token ${PARTIAL_REFUND_PROVIDER_MONEY_NON_PRODUCTION_FIXTURE_TOKEN}.`,
      location: "Isolated host/env for temporary TEST dry-run only.",
      requiredForFutureTestActivationGo: false,
    },
    {
      envName: PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV,
      purpose:
        "Future TEST activation GO only — set to test temporarily; keep off now.",
      location: "Isolated host/env for temporary TEST dry-run only.",
      requiredForFutureTestActivationGo: false,
    },
    {
      envName: PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_ENV,
      purpose: "Must remain ABSENT for Stripe TEST validation.",
      location: "Do not set in TEST prep / TEST dry-run.",
      requiredForFutureTestActivationGo: false,
    },
  ];

  const fixturePackGaps = [
    "approved_isolated_supabase_or_explicit_money_fixture_go",
    "stripe_test_payment_intent_captured_pi_ref",
    "matching_payment_attempt_and_capture_outcome_facts",
    "committed_partial_refund_ledger_row",
    "zero_provider_execution_rows_for_ledger",
    "filled_p6_fixture_manifest",
  ];

  let verdict: StripeTestFixtureEnvReadinessVerdict;
  if (liveKeyPrefixDetected || issues.includes("stripe_mode_not_test")) {
    verdict = "blocked_live_or_mixed_stripe_shape";
  } else if (!secretKey || !stripeMode || !appOrigin) {
    verdict = "operator_credentials_required";
  } else if (!stripeTestConfigShapeReady) {
    verdict = "blocked_misconfigured";
  } else if (
    dedicatedGateCurrentlySatisfied ||
    executionModeCurrent !== "off" ||
    productionExecAckPresent
  ) {
    // Config shape may be OK, but current activation state is not the safe prep default.
    verdict = "blocked_misconfigured";
  } else {
    verdict = "stripe_test_config_shape_ready_gates_remain_off";
  }

  return {
    version: STRIPE_TEST_FIXTURE_ENV_READINESS_VERSION,
    verdict,
    stripeTestConfigShapeReady,
    stripeModeDetected: secretMode ?? stripeReport.mode,
    liveKeyPrefixDetected,
    dedicatedGateCurrentlySatisfied,
    executionModeCurrent,
    productionExecAckPresent,
    appOriginPresent: Boolean(appOrigin),
    missingEnvNames,
    issues,
    operatorInputsRequired,
    fixturePackGaps,
    note:
      "Audit-only readiness. Gates/modes must remain OFF until an explicit isolated TEST activation GO. No network calls; no secret values returned.",
  };
}

/**
 * True only when Stripe TEST config shape is ready AND gates/mode remain safely OFF.
 * Does not mean activation is authorized.
 */
export function isStripeTestFixtureEnvReadyForIsolatedPrep(
  source: EnvSource = process.env
): boolean {
  const report = buildStripeTestFixtureEnvReadinessReport(source);
  return report.verdict === "stripe_test_config_shape_ready_gates_remain_off";
}
