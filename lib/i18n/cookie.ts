/**
 * Locale preference cookie contract (no DB in this milestone).
 * Client-writable so LanguageSelector can persist without a migration.
 */

import type { AppLocale } from "./locales";
import { normalizeToAppLocale } from "./locales";

export const LOCALE_COOKIE_NAME = "umtuba_locale";

/** 1 year — preference should survive sessions. */
export const LOCALE_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export function localeCookieOptions(maxAge = LOCALE_COOKIE_MAX_AGE_SECONDS) {
  return {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function parseLocaleCookieValue(
  value: string | null | undefined
): AppLocale | null {
  return normalizeToAppLocale(value);
}

/** Serializes `name=value` attributes for document.cookie (client). */
export function buildLocaleDocumentCookie(locale: AppLocale): string {
  const opts = localeCookieOptions();
  const parts = [
    `${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}`,
    `Path=${opts.path}`,
    `Max-Age=${opts.maxAge}`,
    `SameSite=${opts.sameSite}`,
  ];
  if (opts.secure) parts.push("Secure");
  return parts.join("; ");
}
