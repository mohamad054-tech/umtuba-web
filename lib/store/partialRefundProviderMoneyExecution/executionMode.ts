/**
 * Narrow first-time execution-mode allowlist (fail-closed).
 *
 * Default: off — no first-time provider submit.
 * test: Stripe test mode only; never live keys / live mode.
 * production: production app env + explicit production exec ACK + live Stripe mode.
 *
 * Distinct from dedicated gate env/ACK and from per-request operator ACK.
 */

import { evaluateStripeLiveCaptureConfigForTests } from "../stripeConfig";

export const PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV =
  "UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE" as const;

export const PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_ENV =
  "UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK" as const;

export const PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_VALUE =
  "I_UNDERSTAND_PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXECUTION" as const;

export const PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODES = [
  "off",
  "test",
  "production",
] as const;

export type PartialRefundProviderMoneyExecutionMode =
  (typeof PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODES)[number];

export type PartialRefundProviderMoneyExecutionModeEnv = Record<
  string,
  string | undefined
>;

export type PartialRefundProviderMoneyExecutionModeResult =
  | {
      ok: true;
      mode: Exclude<PartialRefundProviderMoneyExecutionMode, "off">;
      stripeMode: "test" | "live";
      appEnvironment: string;
    }
  | {
      ok: false;
      mode: PartialRefundProviderMoneyExecutionMode;
      appEnvironment: string;
      code:
        | "execution_mode_off"
        | "execution_mode_invalid"
        | "execution_mode_test_requires_stripe_test"
        | "execution_mode_production_requires_live_stripe"
        | "execution_mode_production_requires_production_env"
        | "execution_mode_production_ack_missing"
        | "stripe_config_unavailable";
      message: string;
      issues: string[];
    };

type EnvSource = PartialRefundProviderMoneyExecutionModeEnv;

function readEnv(name: string, source: EnvSource): string | null {
  const raw = source[name];
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveAppEnvironment(source: EnvSource): string {
  const vercel = readEnv("VERCEL_ENV", source)?.toLowerCase();
  if (
    vercel === "production" ||
    vercel === "preview" ||
    vercel === "development"
  ) {
    return vercel;
  }
  const nodeEnv = readEnv("NODE_ENV", source)?.toLowerCase();
  if (
    nodeEnv === "production" ||
    nodeEnv === "test" ||
    nodeEnv === "development"
  ) {
    return nodeEnv;
  }
  return nodeEnv ?? "development";
}

/**
 * Deterministic enum parse — ambiguous/unknown values fail closed to `off`.
 * Empty/unset → `off`. Truthy strings like "1"/"true" are NOT accepted.
 */
export function parsePartialRefundProviderMoneyExecutionMode(
  raw: string | null | undefined
):
  | { ok: true; mode: PartialRefundProviderMoneyExecutionMode }
  | { ok: false; mode: "off"; code: "execution_mode_invalid" } {
  if (raw == null || String(raw).trim() === "") {
    return { ok: true, mode: "off" };
  }
  const v = String(raw).trim().toLowerCase();
  if (v === "off" || v === "test" || v === "production") {
    return { ok: true, mode: v };
  }
  return { ok: false, mode: "off", code: "execution_mode_invalid" };
}

export function readPartialRefundProviderMoneyExecutionMode(
  source: EnvSource = process.env
): PartialRefundProviderMoneyExecutionMode {
  const parsed = parsePartialRefundProviderMoneyExecutionMode(
    readEnv(PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV, source)
  );
  return parsed.mode;
}

/**
 * First-time submit execution-mode allowlist.
 * Requires Stripe config to be readable so mode alignment can be checked.
 */
export function evaluatePartialRefundProviderMoneyExecutionMode(
  source: EnvSource = process.env
): PartialRefundProviderMoneyExecutionModeResult {
  const appEnvironment = resolveAppEnvironment(source);
  const parsed = parsePartialRefundProviderMoneyExecutionMode(
    readEnv(PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV, source)
  );
  const issues: string[] = [];

  if (!parsed.ok) {
    issues.push("execution_mode_invalid");
    return {
      ok: false,
      mode: "off",
      appEnvironment,
      code: "execution_mode_invalid",
      message:
        "Partial refund provider money execution mode is invalid (fail-closed to off).",
      issues,
    };
  }

  if (parsed.mode === "off") {
    issues.push("execution_mode_off");
    return {
      ok: false,
      mode: "off",
      appEnvironment,
      code: "execution_mode_off",
      message:
        "Partial refund provider money first-time execute is disabled (execution mode off).",
      issues,
    };
  }

  const stripe = evaluateStripeLiveCaptureConfigForTests(source);
  if (!stripe.ok) {
    issues.push("stripe_config_unavailable");
    return {
      ok: false,
      mode: parsed.mode,
      appEnvironment,
      code: "stripe_config_unavailable",
      message: stripe.message,
      issues,
    };
  }

  if (parsed.mode === "test") {
    if (stripe.mode !== "test") {
      issues.push("execution_mode_test_requires_stripe_test");
      return {
        ok: false,
        mode: "test",
        appEnvironment,
        code: "execution_mode_test_requires_stripe_test",
        message:
          "Execution mode=test requires Stripe test mode configuration.",
        issues,
      };
    }
    return {
      ok: true,
      mode: "test",
      stripeMode: "test",
      appEnvironment,
    };
  }

  // production mode
  if (appEnvironment !== "production") {
    issues.push("execution_mode_production_requires_production_env");
    return {
      ok: false,
      mode: "production",
      appEnvironment,
      code: "execution_mode_production_requires_production_env",
      message:
        "Execution mode=production requires a production app environment.",
      issues,
    };
  }

  const prodAck =
    readEnv(PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_ENV, source) ===
    PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_VALUE;
  if (!prodAck) {
    issues.push("execution_mode_production_ack_missing");
    return {
      ok: false,
      mode: "production",
      appEnvironment,
      code: "execution_mode_production_ack_missing",
      message:
        "Production first-time provider money execute requires explicit production execution ACK.",
      issues,
    };
  }

  if (stripe.mode !== "live") {
    issues.push("execution_mode_production_requires_live_stripe");
    return {
      ok: false,
      mode: "production",
      appEnvironment,
      code: "execution_mode_production_requires_live_stripe",
      message:
        "Execution mode=production requires Stripe live mode configuration.",
      issues,
    };
  }

  return {
    ok: true,
    mode: "production",
    stripeMode: "live",
    appEnvironment,
  };
}

export function isPartialRefundProviderMoneyExecutionModeAllowed(
  source: EnvSource = process.env
): boolean {
  return evaluatePartialRefundProviderMoneyExecutionMode(source).ok;
}
