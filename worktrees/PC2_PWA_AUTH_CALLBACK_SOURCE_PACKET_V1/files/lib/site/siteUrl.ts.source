/**
 * Public site URL for metadataBase, canonicals, sitemap, and OG absolute URLs.
 *
 * Env (see .env.example):
 * - NEXT_PUBLIC_SITE_URL — preferred absolute origin (https://umtuba.com)
 *
 * Fallbacks (never throw — builds must not fail on preview/malformed env):
 * - VERCEL_URL (preview/production host without protocol)
 * - Production: https://umtuba.com
 * - Development: http://localhost:3000
 */

import { BRAND } from "./brand";

export type SiteUrlIssue = "missing" | "malformed" | "unsupported_protocol";

export type SiteUrlResolveResult = {
  /** Always a valid absolute origin (no trailing slash). */
  origin: string;
  /** True when NEXT_PUBLIC_SITE_URL was present and valid. */
  fromEnv: boolean;
  /** Issue with the configured env value, if any (still returns a fallback origin). */
  issue: SiteUrlIssue | null;
};

function readTrimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Validate an absolute http(s) origin. Rejects paths, credentials, and non-http schemes.
 * Returns origin without trailing slash.
 */
export function validateSiteUrl(raw: string): {
  ok: true;
  origin: string;
} | {
  ok: false;
  issue: Exclude<SiteUrlIssue, "missing">;
} {
  const value = readTrimmed(raw);
  if (!value) {
    return { ok: false, issue: "malformed" };
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, issue: "malformed" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, issue: "unsupported_protocol" };
  }

  // Reject userinfo and non-default path/query/hash noise in the configured base.
  if (parsed.username || parsed.password) {
    return { ok: false, issue: "malformed" };
  }

  return { ok: true, origin: parsed.origin };
}

function vercelPreviewOrigin(
  source: Record<string, string | undefined>
): string | null {
  const host = readTrimmed(source.VERCEL_URL);
  if (!host) return null;
  // VERCEL_URL is host-only (no protocol).
  const candidate = host.includes("://") ? host : `https://${host}`;
  const result = validateSiteUrl(candidate);
  return result.ok ? result.origin : null;
}

function defaultOrigin(
  source: Record<string, string | undefined>
): string {
  const nodeEnv = readTrimmed(source.NODE_ENV) || "development";
  if (nodeEnv === "production") {
    return BRAND.productionOrigin;
  }
  return BRAND.developmentOrigin;
}

/**
 * Resolve the public site origin for metadata. Always returns a usable URL.
 */
export function resolveSiteUrl(
  source: Record<string, string | undefined> = process.env
): SiteUrlResolveResult {
  const configured = readTrimmed(source.NEXT_PUBLIC_SITE_URL);

  if (configured) {
    const validated = validateSiteUrl(configured);
    if (validated.ok) {
      return { origin: validated.origin, fromEnv: true, issue: null };
    }
    const fallback =
      vercelPreviewOrigin(source) ?? defaultOrigin(source);
    return {
      origin: fallback,
      fromEnv: false,
      issue: validated.issue,
    };
  }

  const vercel = vercelPreviewOrigin(source);
  if (vercel) {
    return { origin: vercel, fromEnv: false, issue: "missing" };
  }

  return {
    origin: defaultOrigin(source),
    fromEnv: false,
    issue: "missing",
  };
}

/** Convenience: absolute origin string for metadataBase / sitemap. */
export function getSiteUrl(
  source: Record<string, string | undefined> = process.env
): string {
  return resolveSiteUrl(source).origin;
}

function isLoopbackHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "[::1]"
  );
}

/**
 * Origin for auth-callback redirects after PKCE exchange / link errors.
 *
 * Prefer the request origin when Host is a public hostname. When a reverse
 * proxy leaves a loopback Host (e.g. nginx → localhost:3001) while
 * NEXT_PUBLIC_SITE_URL / production fallback already advertises the public
 * site (metadataBase), substitute getSiteUrl(). Intentional local-dev
 * loopback is preserved when the configured site URL is also loopback.
 */
export function resolveAuthRedirectOrigin(
  requestOrigin: string,
  source: Record<string, string | undefined> = process.env
): string {
  let requestUrl: URL;
  try {
    requestUrl = new URL(requestOrigin);
  } catch {
    return getSiteUrl(source);
  }

  if (!isLoopbackHostname(requestUrl.hostname)) {
    return requestUrl.origin;
  }

  const configured = getSiteUrl(source);
  let configuredUrl: URL;
  try {
    configuredUrl = new URL(configured);
  } catch {
    return requestUrl.origin;
  }

  if (isLoopbackHostname(configuredUrl.hostname)) {
    return requestUrl.origin;
  }

  return configuredUrl.origin;
}

/** Absolute URL for a site path (leading slash optional). */
export function absoluteUrl(
  path: string,
  source: Record<string, string | undefined> = process.env
): string {
  const origin = getSiteUrl(source);
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === "/") {
    return `${origin}/`;
  }
  return `${origin}${normalized}`;
}
