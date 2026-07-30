/**
 * Stripe test-mode configuration for Live Payment Capture Adapter V1.
 * Reads credentials from environment only. Never logs secret values.
 */

export type StripeLiveCaptureConfig =
  | {
      ok: true;
      secretKey: string;
      webhookSecret: string | null;
      appOrigin: string;
    }
  | { ok: false; message: string };

function readEnv(name: string): string | null {
  const raw = process.env[name];
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Fail closed unless a Stripe **test** secret key is configured.
 * Production live keys (sk_live_) are rejected in this adapter version.
 */
export function getStripeLiveCaptureConfig(): StripeLiveCaptureConfig {
  const secretKey = readEnv("STRIPE_SECRET_KEY");
  if (!secretKey) {
    return {
      ok: false,
      message: "Stripe payment is unavailable (configuration missing).",
    };
  }
  if (!secretKey.startsWith("sk_test_")) {
    return {
      ok: false,
      message: "Stripe payment is unavailable (test mode required).",
    };
  }

  const appOrigin =
    readEnv("NEXT_PUBLIC_APP_URL") ??
    readEnv("APP_ORIGIN") ??
    readEnv("NEXT_PUBLIC_SITE_URL");
  if (!appOrigin) {
    return {
      ok: false,
      message: "Stripe payment is unavailable (app origin missing).",
    };
  }

  let origin: string;
  try {
    origin = new URL(appOrigin).origin;
  } catch {
    return {
      ok: false,
      message: "Stripe payment is unavailable (app origin invalid).",
    };
  }

  return {
    ok: true,
    secretKey,
    webhookSecret: readEnv("STRIPE_WEBHOOK_SECRET"),
    appOrigin: origin,
  };
}

export function isStripeLiveCaptureConfigured(): boolean {
  return getStripeLiveCaptureConfig().ok;
}
