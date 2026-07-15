/**
 * Validated public Supabase configuration.
 * Safe for browser, middleware, and server — contains no service-role secrets.
 *
 * Canonical env names (see .env.example):
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *
 * Optional alias: NEXT_PUBLIC_SUPABASE_ANON_KEY (same publishable/anon key).
 */

export type SupabasePublicEnv = {
  url: string;
  publishableKey: string;
};

export type SupabasePublicEnvIssue =
  | "missing_url"
  | "missing_key"
  | "malformed_url"
  | "invalid_key";

export type SupabasePublicEnvResult =
  | { ok: true; env: SupabasePublicEnv }
  | { ok: false; issue: SupabasePublicEnvIssue; message: string };

/** Safe user-facing messages — never include raw env values. */
const ISSUE_MESSAGES: Record<SupabasePublicEnvIssue, string> = {
  missing_url: "Supabase URL is not configured.",
  missing_key: "Supabase publishable key is not configured.",
  malformed_url: "Supabase URL is invalid.",
  invalid_key: "Supabase publishable key is invalid.",
};

export function messageForSupabasePublicIssue(
  issue: SupabasePublicEnvIssue
): string {
  return ISSUE_MESSAGES[issue];
}

function readTrimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Resolve publishable/anon key from a process.env-like record.
 * Prefers PUBLISHABLE_KEY; accepts ANON_KEY as a compatible alias.
 */
export function readSupabasePublishableKey(
  source: Record<string, string | undefined>
): string {
  return (
    readTrimmed(source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    readTrimmed(source.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

export function validateSupabasePublicEnv(
  source: Record<string, string | undefined>
): SupabasePublicEnvResult {
  const url = readTrimmed(source.NEXT_PUBLIC_SUPABASE_URL);
  const publishableKey = readSupabasePublishableKey(source);

  if (!url) {
    return {
      ok: false,
      issue: "missing_url",
      message: ISSUE_MESSAGES.missing_url,
    };
  }

  if (!publishableKey) {
    return {
      ok: false,
      issue: "missing_key",
      message: ISSUE_MESSAGES.missing_key,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {
      ok: false,
      issue: "malformed_url",
      message: ISSUE_MESSAGES.malformed_url,
    };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      ok: false,
      issue: "malformed_url",
      message: ISSUE_MESSAGES.malformed_url,
    };
  }

  if (!parsed.hostname) {
    return {
      ok: false,
      issue: "malformed_url",
      message: ISSUE_MESSAGES.malformed_url,
    };
  }

  // Reject whitespace / obviously truncated keys without echoing the value.
  if (publishableKey.length < 20 || /\s/.test(publishableKey)) {
    return {
      ok: false,
      issue: "invalid_key",
      message: ISSUE_MESSAGES.invalid_key,
    };
  }

  return {
    ok: true,
    env: {
      url: parsed.toString().replace(/\/$/, ""),
      publishableKey,
    },
  };
}

/** Lazy read of process.env — never throws; callers decide fail-closed policy. */
export function getSupabasePublicEnvResult(): SupabasePublicEnvResult {
  return validateSupabasePublicEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

/**
 * Strict accessor for client factories. Throws a sanitized Error (no secrets).
 */
export function requireSupabasePublicEnv(): SupabasePublicEnv {
  const result = getSupabasePublicEnvResult();
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.env;
}

export function isSupabasePublicConfigured(): boolean {
  return getSupabasePublicEnvResult().ok;
}
