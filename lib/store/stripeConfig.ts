/**
 * Stripe payment configuration + Live Payment Production Gate V1.
 *
 * Supports test and live modes. Live secrets are allowed only when the
 * production gate is fully and explicitly satisfied. Never logs secret values.
 */

export const STRIPE_PAYMENT_PRODUCTION_GATE_VERSION =
  "commerce-live-payment-production-gate-v1" as const;

/** Explicit acknowledgment required before live charges can be enabled. */
export const STRIPE_PRODUCTION_GATE_ACK_VALUE =
  "I_UNDERSTAND_LIVE_STRIPE_CHARGES_REAL_MONEY" as const;

/**
 * Test-only escape hatch for unit fixtures. Never use with real keys.
 * Does not enable live mode in real development by itself without other checks.
 */
export const STRIPE_LIVE_NON_PRODUCTION_FIXTURE_TOKEN =
  "commerce-live-payment-production-gate-fixture-v1" as const;

export type StripePaymentMode = "test" | "live";

export type StripeLiveCaptureConfig =
  | {
      ok: true;
      mode: StripePaymentMode;
      secretKey: string;
      publishableKey: string | null;
      webhookSecret: string | null;
      appOrigin: string;
      successUrlTemplate: string;
      cancelUrlPathTemplate: string;
      productionGateSatisfied: boolean;
    }
  | { ok: false; message: string; code?: string };

export type StripePaymentConfigReadinessReport = {
  version: typeof STRIPE_PAYMENT_PRODUCTION_GATE_VERSION;
  /** True when capture may start for the resolved mode (gate satisfied). */
  captureConfigured: boolean;
  /** True when capture + webhook + mode alignment are fully ready (no issues). */
  ready: boolean;
  mode: StripePaymentMode | null;
  appEnvironment: string;
  checks: {
    secretKeyPresent: boolean;
    secretKeyMode: StripePaymentMode | null;
    publishableKeyPresent: boolean;
    publishableKeyMode: StripePaymentMode | null;
    webhookSecretPresent: boolean;
    declaredMode: StripePaymentMode | null;
    modesAligned: boolean;
    appOriginPresent: boolean;
    appOriginHttps: boolean;
    successCancelUrlsSafe: boolean;
    livePaymentsEnabledFlag: boolean;
    productionGateAck: boolean;
    appEnvironmentAllowsMode: boolean;
    requireLiveInProductionSatisfied: boolean;
  };
  /** Safe fingerprints only — never full secrets. */
  fingerprints: {
    secretKeyPrefix: string | null;
    publishableKeyPrefix: string | null;
    webhookSecretPrefix: string | null;
    appOrigin: string | null;
  };
  issues: string[];
};

type EnvSource = Record<string, string | undefined>;

function readEnv(name: string, source: EnvSource = process.env): string | null {
  const raw = source[name];
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function detectSecretMode(secretKey: string): StripePaymentMode | null {
  if (secretKey.startsWith("sk_test_")) return "test";
  if (secretKey.startsWith("sk_live_")) return "live";
  return null;
}

function detectPublishableMode(publishableKey: string): StripePaymentMode | null {
  if (publishableKey.startsWith("pk_test_")) return "test";
  if (publishableKey.startsWith("pk_live_")) return "live";
  return null;
}

function parseDeclaredMode(raw: string | null): StripePaymentMode | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  if (normalized === "test" || normalized === "live") return normalized;
  return null;
}

function resolveAppEnvironment(source: EnvSource): string {
  const vercel = readEnv("VERCEL_ENV", source)?.toLowerCase();
  if (vercel === "production" || vercel === "preview" || vercel === "development") {
    return vercel;
  }
  const nodeEnv = readEnv("NODE_ENV", source)?.toLowerCase();
  if (nodeEnv === "production" || nodeEnv === "test" || nodeEnv === "development") {
    return nodeEnv;
  }
  return nodeEnv ?? "development";
}

function isTruthyFlag(raw: string | null): boolean {
  if (!raw) return false;
  const v = raw.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function keyPrefix(value: string | null, keep = 8): string | null {
  if (!value) return null;
  if (value.length <= keep) return `${value.slice(0, 2)}…`;
  return `${value.slice(0, keep)}…`;
}

function resolveAppOrigin(source: EnvSource):
  | { ok: true; origin: string }
  | { ok: false; message: string } {
  const appOrigin =
    readEnv("NEXT_PUBLIC_APP_URL", source) ??
    readEnv("APP_ORIGIN", source) ??
    readEnv("NEXT_PUBLIC_SITE_URL", source);
  if (!appOrigin) {
    return {
      ok: false,
      message: "Stripe payment is unavailable (app origin missing).",
    };
  }
  try {
    const origin = new URL(appOrigin).origin;
    return { ok: true, origin };
  } catch {
    return {
      ok: false,
      message: "Stripe payment is unavailable (app origin invalid).",
    };
  }
}

function successCancelUrlsSafe(appOrigin: string): boolean {
  try {
    const success = new URL(
      "/api/store/payments/stripe/return?session_id=cs_test_placeholder",
      appOrigin
    );
    const cancel = new URL("/store/orders/example?payment=cancelled", appOrigin);
    return (
      success.origin === appOrigin &&
      cancel.origin === appOrigin &&
      success.pathname.startsWith("/api/store/payments/stripe/return") &&
      cancel.pathname.startsWith("/store/orders/")
    );
  } catch {
    return false;
  }
}

function liveFixtureAllowed(source: EnvSource): boolean {
  return (
    readEnv("STRIPE_ALLOW_LIVE_IN_NON_PRODUCTION", source) ===
    STRIPE_LIVE_NON_PRODUCTION_FIXTURE_TOKEN
  );
}

/**
 * Build a redacted readiness report. Safe to log / show in admin diagnostics.
 */
export function buildStripePaymentConfigReadinessReport(
  source: EnvSource = process.env
): StripePaymentConfigReadinessReport {
  const appEnvironment = resolveAppEnvironment(source);
  const secretKey = readEnv("STRIPE_SECRET_KEY", source);
  const publishableKey =
    readEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", source) ??
    readEnv("STRIPE_PUBLISHABLE_KEY", source);
  const webhookSecret = readEnv("STRIPE_WEBHOOK_SECRET", source);
  const declaredMode = parseDeclaredMode(readEnv("STRIPE_MODE", source));
  const secretKeyMode = secretKey ? detectSecretMode(secretKey) : null;
  const publishableKeyMode = publishableKey
    ? detectPublishableMode(publishableKey)
    : null;
  const originResult = resolveAppOrigin(source);
  const appOrigin = originResult.ok ? originResult.origin : null;
  const liveEnabled = isTruthyFlag(
    readEnv("STRIPE_LIVE_PAYMENTS_ENABLED", source)
  );
  const gateAck =
    readEnv("STRIPE_PRODUCTION_GATE_ACK", source) ===
    STRIPE_PRODUCTION_GATE_ACK_VALUE;
  const requireLive = isTruthyFlag(
    readEnv("STRIPE_REQUIRE_LIVE_IN_PRODUCTION", source)
  );

  const issues: string[] = [];

  if (!secretKey) issues.push("secret_key_missing");
  else if (!secretKeyMode) issues.push("secret_key_mode_unknown");

  if (publishableKey && !publishableKeyMode) {
    issues.push("publishable_key_mode_unknown");
  }

  if (!webhookSecret) issues.push("webhook_secret_missing");
  else if (!webhookSecret.startsWith("whsec_")) {
    issues.push("webhook_secret_prefix_invalid");
  }

  if (declaredMode && secretKeyMode && declaredMode !== secretKeyMode) {
    issues.push("declared_mode_secret_mismatch");
  }
  if (
    publishableKeyMode &&
    secretKeyMode &&
    publishableKeyMode !== secretKeyMode
  ) {
    issues.push("publishable_secret_mode_mismatch");
  }
  if (declaredMode && publishableKeyMode && declaredMode !== publishableKeyMode) {
    issues.push("declared_mode_publishable_mismatch");
  }

  if (!originResult.ok) issues.push("app_origin_invalid_or_missing");
  const originHttps = Boolean(appOrigin?.startsWith("https://"));
  const urlsSafe = appOrigin ? successCancelUrlsSafe(appOrigin) : false;
  if (appOrigin && !urlsSafe) issues.push("success_cancel_urls_unsafe");

  const mode = secretKeyMode;
  let appEnvironmentAllowsMode = true;
  let requireLiveInProductionSatisfied = true;

  if (mode === "live") {
    if (!liveEnabled) issues.push("live_payments_flag_disabled");
    if (!gateAck) issues.push("production_gate_ack_missing");
    if (!publishableKey || publishableKeyMode !== "live") {
      issues.push("live_publishable_key_required");
    }
    if (!webhookSecret) {
      /* already flagged */
    }
    if (!originHttps) issues.push("live_requires_https_app_origin");
    if (declaredMode !== "live") issues.push("live_requires_stripe_mode_live");

    const nonProd =
      appEnvironment === "development" ||
      appEnvironment === "test" ||
      appEnvironment === "preview";
    if (nonProd && !liveFixtureAllowed(source)) {
      appEnvironmentAllowsMode = false;
      issues.push("live_forbidden_in_non_production");
    }
    if (appEnvironment === "production" && !originHttps) {
      appEnvironmentAllowsMode = false;
    }
  }

  if (mode === "test" && requireLive && appEnvironment === "production") {
    requireLiveInProductionSatisfied = false;
    issues.push("production_requires_live_mode");
  }

  const modesAligned =
    Boolean(mode) &&
    (!declaredMode || declaredMode === mode) &&
    (!publishableKeyMode || publishableKeyMode === mode) &&
    !issues.includes("publishable_secret_mode_mismatch") &&
    !issues.includes("declared_mode_secret_mismatch");

  const configProbe = getStripeLiveCaptureConfigFrom(source);

  return {
    version: STRIPE_PAYMENT_PRODUCTION_GATE_VERSION,
    captureConfigured: configProbe.ok,
    ready: configProbe.ok && issues.length === 0,
    mode,
    appEnvironment,
    checks: {
      secretKeyPresent: Boolean(secretKey),
      secretKeyMode,
      publishableKeyPresent: Boolean(publishableKey),
      publishableKeyMode,
      webhookSecretPresent: Boolean(webhookSecret),
      declaredMode,
      modesAligned,
      appOriginPresent: Boolean(appOrigin),
      appOriginHttps: originHttps,
      successCancelUrlsSafe: urlsSafe,
      livePaymentsEnabledFlag: liveEnabled,
      productionGateAck: gateAck,
      appEnvironmentAllowsMode,
      requireLiveInProductionSatisfied,
    },
    fingerprints: {
      secretKeyPrefix: keyPrefix(secretKey),
      publishableKeyPrefix: keyPrefix(publishableKey),
      webhookSecretPrefix: keyPrefix(webhookSecret),
      appOrigin,
    },
    issues,
  };
}

function getStripeLiveCaptureConfigFrom(
  source: EnvSource
): StripeLiveCaptureConfig {
  const secretKey = readEnv("STRIPE_SECRET_KEY", source);
  if (!secretKey) {
    return {
      ok: false,
      message: "Stripe payment is unavailable (configuration missing).",
      code: "secret_missing",
    };
  }

  const mode = detectSecretMode(secretKey);
  if (!mode) {
    return {
      ok: false,
      message: "Stripe payment is unavailable (secret key mode unknown).",
      code: "secret_mode_unknown",
    };
  }

  const declaredMode = parseDeclaredMode(readEnv("STRIPE_MODE", source));
  if (declaredMode && declaredMode !== mode) {
    return {
      ok: false,
      message: "Stripe payment is unavailable (test/live mode mismatch).",
      code: "mode_mismatch",
    };
  }

  const publishableKey =
    readEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", source) ??
    readEnv("STRIPE_PUBLISHABLE_KEY", source);
  if (publishableKey) {
    const pkMode = detectPublishableMode(publishableKey);
    if (!pkMode) {
      return {
        ok: false,
        message: "Stripe payment is unavailable (publishable key mode unknown).",
        code: "publishable_mode_unknown",
      };
    }
    if (pkMode !== mode) {
      return {
        ok: false,
        message: "Stripe payment is unavailable (test/live mode mismatch).",
        code: "mode_mismatch",
      };
    }
  }

  const webhookSecret = readEnv("STRIPE_WEBHOOK_SECRET", source);
  const appEnvironment = resolveAppEnvironment(source);
  const requireLive = isTruthyFlag(
    readEnv("STRIPE_REQUIRE_LIVE_IN_PRODUCTION", source)
  );

  if (mode === "test" && requireLive && appEnvironment === "production") {
    return {
      ok: false,
      message:
        "Stripe payment is unavailable (production policy requires live mode).",
      code: "production_requires_live",
    };
  }

  const originResult = resolveAppOrigin(source);
  if (!originResult.ok) return originResult;

  const { origin } = originResult;
  if (!successCancelUrlsSafe(origin)) {
    return {
      ok: false,
      message: "Stripe payment is unavailable (return URLs invalid).",
      code: "urls_unsafe",
    };
  }

  let productionGateSatisfied = false;

  if (mode === "live") {
    const liveEnabled = isTruthyFlag(
      readEnv("STRIPE_LIVE_PAYMENTS_ENABLED", source)
    );
    const gateAck =
      readEnv("STRIPE_PRODUCTION_GATE_ACK", source) ===
      STRIPE_PRODUCTION_GATE_ACK_VALUE;
    const nonProd =
      appEnvironment === "development" ||
      appEnvironment === "test" ||
      appEnvironment === "preview";

    if (nonProd && !liveFixtureAllowed(source)) {
      return {
        ok: false,
        message:
          "Stripe payment is unavailable (live mode forbidden outside production).",
        code: "live_forbidden_non_production",
      };
    }

    if (!liveEnabled || !gateAck) {
      return {
        ok: false,
        message:
          "Stripe payment is unavailable (production gate incomplete for live mode).",
        code: "live_gate_incomplete",
      };
    }

    if (declaredMode !== "live") {
      return {
        ok: false,
        message:
          "Stripe payment is unavailable (STRIPE_MODE=live required for live keys).",
        code: "live_mode_undeclared",
      };
    }

    if (!publishableKey || detectPublishableMode(publishableKey) !== "live") {
      return {
        ok: false,
        message:
          "Stripe payment is unavailable (live publishable key required).",
        code: "live_publishable_required",
      };
    }

    if (!webhookSecret?.startsWith("whsec_")) {
      return {
        ok: false,
        message:
          "Stripe payment is unavailable (live webhook secret required).",
        code: "live_webhook_required",
      };
    }

    if (!origin.startsWith("https://")) {
      return {
        ok: false,
        message: "Stripe payment is unavailable (live mode requires HTTPS origin).",
        code: "live_https_required",
      };
    }

    productionGateSatisfied = true;
  } else {
    // Test mode: reject accidental live flags with test secret (mixed intent).
    if (isTruthyFlag(readEnv("STRIPE_LIVE_PAYMENTS_ENABLED", source))) {
      return {
        ok: false,
        message: "Stripe payment is unavailable (test/live mode mismatch).",
        code: "mode_mismatch",
      };
    }
    if (declaredMode === "live") {
      return {
        ok: false,
        message: "Stripe payment is unavailable (test/live mode mismatch).",
        code: "mode_mismatch",
      };
    }
  }

  return {
    ok: true,
    mode,
    secretKey,
    publishableKey: publishableKey ?? null,
    webhookSecret: webhookSecret?.startsWith("whsec_") ? webhookSecret : null,
    appOrigin: origin,
    successUrlTemplate: `${origin}/api/store/payments/stripe/return?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrlPathTemplate: `${origin}/store/orders/{orderId}?payment=cancelled`,
    productionGateSatisfied,
  };
}

/**
 * Fail closed unless Stripe is configured for the active mode.
 * Live (`sk_live_`) requires a complete Production Gate.
 */
export function getStripeLiveCaptureConfig(): StripeLiveCaptureConfig {
  return getStripeLiveCaptureConfigFrom(process.env);
}

export function isStripeLiveCaptureConfigured(): boolean {
  return getStripeLiveCaptureConfig().ok;
}

export function getStripePaymentMode(): StripePaymentMode | null {
  const cfg = getStripeLiveCaptureConfig();
  return cfg.ok ? cfg.mode : null;
}

/** Test helper — evaluate config against an explicit env map. */
export function evaluateStripeLiveCaptureConfigForTests(
  source: EnvSource
): StripeLiveCaptureConfig {
  return getStripeLiveCaptureConfigFrom(source);
}
