/**
 * Dedicated partial-refund provider-money gate (default OFF).
 * Execution also requires Stripe config readiness via stripeConfig.
 */

export const PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV =
  "UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_ENABLED" as const;

export const PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV =
  "UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK" as const;

export const PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_VALUE =
  "I_UNDERSTAND_PARTIAL_REFUND_PROVIDER_MONEY_MOVES_REAL_FUNDS" as const;

export const PARTIAL_REFUND_PROVIDER_MONEY_NON_PRODUCTION_FIXTURE_TOKEN =
  "commerce-partial-refund-provider-money-fixture-v1" as const;

export type PartialRefundProviderMoneyGateEnv = Record<
  string,
  string | undefined
>;

export type PartialRefundProviderMoneyGateResult =
  | {
      ok: true;
      providerMoneyEnabled: true;
      productionGateSatisfied: true;
      appEnvironment: string;
    }
  | {
      ok: false;
      providerMoneyEnabled: false;
      productionGateSatisfied: false;
      appEnvironment: string;
      code:
        | "live_flag_disabled"
        | "production_gate_ack_missing"
        | "live_forbidden_non_production";
      message: string;
      issues: string[];
    };

export type PartialRefundProviderMoneyGateReadinessReport = {
  version: string;
  ready: boolean;
  dedicatedGateEnabledFlag: boolean;
  dedicatedGateAck: boolean;
  appEnvironment: string;
  appEnvironmentAllowsLive: boolean;
  issues: string[];
};

type EnvSource = PartialRefundProviderMoneyGateEnv;

function readEnv(name: string, source: EnvSource): string | null {
  const raw = source[name];
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isTruthyFlag(raw: string | null): boolean {
  if (!raw) return false;
  const v = raw.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
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

function liveFixtureAllowed(source: EnvSource): boolean {
  return (
    readEnv(
      "UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_ALLOW_IN_NON_PRODUCTION",
      source
    ) === PARTIAL_REFUND_PROVIDER_MONEY_NON_PRODUCTION_FIXTURE_TOKEN
  );
}

export function buildPartialRefundProviderMoneyGateReadinessReport(
  source: EnvSource = process.env
): PartialRefundProviderMoneyGateReadinessReport {
  const appEnvironment = resolveAppEnvironment(source);
  const enabled = isTruthyFlag(
    readEnv(PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV, source)
  );
  const gateAck =
    readEnv(PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV, source) ===
    PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_VALUE;
  const issues: string[] = [];

  if (!enabled) issues.push("dedicated_provider_money_flag_disabled");
  if (!gateAck) issues.push("dedicated_provider_money_ack_missing");

  const nonProd =
    appEnvironment === "development" ||
    appEnvironment === "test" ||
    appEnvironment === "preview";
  let appEnvironmentAllowsLive = true;
  if (nonProd && !liveFixtureAllowed(source)) {
    appEnvironmentAllowsLive = false;
    if (enabled) issues.push("live_forbidden_in_non_production");
  }

  const probe = evaluatePartialRefundProviderMoneyGate(source);

  return {
    version: "commerce-partial-refund-provider-money-gate-v1",
    ready: probe.ok,
    dedicatedGateEnabledFlag: enabled,
    dedicatedGateAck: gateAck,
    appEnvironment,
    appEnvironmentAllowsLive,
    issues,
  };
}

export function evaluatePartialRefundProviderMoneyGate(
  source: EnvSource = process.env
): PartialRefundProviderMoneyGateResult {
  const appEnvironment = resolveAppEnvironment(source);
  const enabled = isTruthyFlag(
    readEnv(PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV, source)
  );
  const gateAck =
    readEnv(PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV, source) ===
    PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_VALUE;
  const issues: string[] = [];

  if (!enabled) {
    issues.push("dedicated_provider_money_flag_disabled");
    return {
      ok: false,
      providerMoneyEnabled: false,
      productionGateSatisfied: false,
      appEnvironment,
      code: "live_flag_disabled",
      message:
        "Partial refund provider money execution is disabled (dedicated gate OFF).",
      issues,
    };
  }

  if (!gateAck) {
    issues.push("dedicated_provider_money_ack_missing");
    return {
      ok: false,
      providerMoneyEnabled: false,
      productionGateSatisfied: false,
      appEnvironment,
      code: "production_gate_ack_missing",
      message:
        "Partial refund provider money unavailable (dedicated gate ACK missing).",
      issues,
    };
  }

  const nonProd =
    appEnvironment === "development" ||
    appEnvironment === "test" ||
    appEnvironment === "preview";
  if (nonProd && !liveFixtureAllowed(source)) {
    issues.push("live_forbidden_in_non_production");
    return {
      ok: false,
      providerMoneyEnabled: false,
      productionGateSatisfied: false,
      appEnvironment,
      code: "live_forbidden_non_production",
      message:
        "Partial refund provider money unavailable outside production without fixture token.",
      issues,
    };
  }

  return {
    ok: true,
    providerMoneyEnabled: true,
    productionGateSatisfied: true,
    appEnvironment,
  };
}

export function isPartialRefundProviderMoneyGateSatisfied(
  source: EnvSource = process.env
): boolean {
  return evaluatePartialRefundProviderMoneyGate(source).ok;
}
