/**
 * Seller Live Payout Production Gate V1 (Slice S1).
 *
 * Fail-closed: live seller payouts stay OFF unless every gate check passes.
 * Never logs secret values. No provider execution in this module.
 */

import {
  SELLER_LIVE_PAYOUT_NON_PRODUCTION_FIXTURE_TOKEN,
  SELLER_LIVE_PAYOUT_PRODUCTION_GATE_ACK_VALUE,
  SELLER_LIVE_PAYOUT_PROVIDER_VERSION,
  SELLER_LIVE_PAYOUT_V1_PROVIDER_ID,
  type SellerLivePayoutProviderId,
} from "./types";

export type SellerLivePayoutGateEnv = Record<string, string | undefined>;

export type SellerLivePayoutGateResult =
  | {
      ok: true;
      livePayoutsEnabled: true;
      providerId: typeof SELLER_LIVE_PAYOUT_V1_PROVIDER_ID;
      appEnvironment: string;
      productionGateSatisfied: true;
    }
  | {
      ok: false;
      livePayoutsEnabled: false;
      message: string;
      code: SellerLivePayoutGateFailureCode;
      appEnvironment: string;
      productionGateSatisfied: false;
      issues: string[];
    };

export type SellerLivePayoutGateFailureCode =
  | "live_flag_disabled"
  | "production_gate_ack_missing"
  | "live_forbidden_non_production"
  | "provider_not_allowed";

export type SellerLivePayoutGateReadinessReport = {
  version: typeof SELLER_LIVE_PAYOUT_PROVIDER_VERSION;
  /** True only when live payout orchestration may start. */
  ready: boolean;
  livePayoutsEnabledFlag: boolean;
  productionGateAck: boolean;
  appEnvironment: string;
  appEnvironmentAllowsLive: boolean;
  v1ProviderId: typeof SELLER_LIVE_PAYOUT_V1_PROVIDER_ID;
  issues: string[];
};

type EnvSource = SellerLivePayoutGateEnv;

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
    readEnv("SELLER_LIVE_PAYOUT_ALLOW_IN_NON_PRODUCTION", source) ===
    SELLER_LIVE_PAYOUT_NON_PRODUCTION_FIXTURE_TOKEN
  );
}

function declaredProviderId(
  source: EnvSource
): SellerLivePayoutProviderId | null {
  const raw = readEnv("SELLER_LIVE_PAYOUT_PROVIDER", source);
  if (!raw) return SELLER_LIVE_PAYOUT_V1_PROVIDER_ID;
  if (raw === "manual_ops_live" || raw === "stripe_connect") return raw;
  return null;
}

/**
 * Redacted readiness report — safe to log. Never includes secrets.
 */
export function buildSellerLivePayoutGateReadinessReport(
  source: EnvSource = process.env
): SellerLivePayoutGateReadinessReport {
  const appEnvironment = resolveAppEnvironment(source);
  const liveEnabled = isTruthyFlag(
    readEnv("SELLER_LIVE_PAYOUTS_ENABLED", source)
  );
  const gateAck =
    readEnv("SELLER_LIVE_PAYOUT_PRODUCTION_GATE_ACK", source) ===
    SELLER_LIVE_PAYOUT_PRODUCTION_GATE_ACK_VALUE;
  const issues: string[] = [];

  if (!liveEnabled) issues.push("live_payouts_flag_disabled");
  if (!gateAck) issues.push("production_gate_ack_missing");

  const nonProd =
    appEnvironment === "development" ||
    appEnvironment === "test" ||
    appEnvironment === "preview";
  let appEnvironmentAllowsLive = true;
  if (nonProd && !liveFixtureAllowed(source)) {
    appEnvironmentAllowsLive = false;
    issues.push("live_forbidden_in_non_production");
  }

  const provider = declaredProviderId(source);
  if (!provider) {
    issues.push("provider_id_invalid");
  } else if (provider !== SELLER_LIVE_PAYOUT_V1_PROVIDER_ID) {
    // Connect reserved — not allowed in V1 gate satisfaction.
    issues.push("provider_not_allowed_for_v1");
  }

  const probe = evaluateSellerLivePayoutGate(source);

  return {
    version: SELLER_LIVE_PAYOUT_PROVIDER_VERSION,
    ready: probe.ok,
    livePayoutsEnabledFlag: liveEnabled,
    productionGateAck: gateAck,
    appEnvironment,
    appEnvironmentAllowsLive,
    v1ProviderId: SELLER_LIVE_PAYOUT_V1_PROVIDER_ID,
    issues,
  };
}

/**
 * Fail-closed gate evaluation. Default env → not ok (live OFF).
 */
export function evaluateSellerLivePayoutGate(
  source: EnvSource = process.env
): SellerLivePayoutGateResult {
  const appEnvironment = resolveAppEnvironment(source);
  const liveEnabled = isTruthyFlag(
    readEnv("SELLER_LIVE_PAYOUTS_ENABLED", source)
  );
  const gateAck =
    readEnv("SELLER_LIVE_PAYOUT_PRODUCTION_GATE_ACK", source) ===
    SELLER_LIVE_PAYOUT_PRODUCTION_GATE_ACK_VALUE;
  const issues: string[] = [];

  if (!liveEnabled) {
    issues.push("live_payouts_flag_disabled");
    return {
      ok: false,
      livePayoutsEnabled: false,
      message: "Seller live payouts are disabled (gate flag off).",
      code: "live_flag_disabled",
      appEnvironment,
      productionGateSatisfied: false,
      issues,
    };
  }

  if (!gateAck) {
    issues.push("production_gate_ack_missing");
    return {
      ok: false,
      livePayoutsEnabled: false,
      message: "Seller live payouts are unavailable (production gate ACK missing).",
      code: "production_gate_ack_missing",
      appEnvironment,
      productionGateSatisfied: false,
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
      livePayoutsEnabled: false,
      message:
        "Seller live payouts are unavailable (live mode forbidden outside production).",
      code: "live_forbidden_non_production",
      appEnvironment,
      productionGateSatisfied: false,
      issues,
    };
  }

  const provider = declaredProviderId(source);
  if (!provider || provider !== SELLER_LIVE_PAYOUT_V1_PROVIDER_ID) {
    issues.push("provider_not_allowed_for_v1");
    return {
      ok: false,
      livePayoutsEnabled: false,
      message:
        "Seller live payouts are unavailable (provider not allowed for V1).",
      code: "provider_not_allowed",
      appEnvironment,
      productionGateSatisfied: false,
      issues,
    };
  }

  return {
    ok: true,
    livePayoutsEnabled: true,
    providerId: SELLER_LIVE_PAYOUT_V1_PROVIDER_ID,
    appEnvironment,
    productionGateSatisfied: true,
  };
}

export function isSellerLivePayoutGateSatisfied(
  source: EnvSource = process.env
): boolean {
  return evaluateSellerLivePayoutGate(source).ok;
}

/** Test helper — evaluate against an explicit env map. */
export function evaluateSellerLivePayoutGateForTests(
  source: EnvSource
): SellerLivePayoutGateResult {
  return evaluateSellerLivePayoutGate(source);
}
