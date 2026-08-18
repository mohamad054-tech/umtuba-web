/**
 * Locale preference cookie contract (no DB in this milestone).
 * Client-writable so LanguageSelector can persist without a migration.
 */

import type { AppLocale } from "./locales";
import { getLocaleDirection, normalizeToAppLocale } from "./locales";

export const LOCALE_COOKIE_NAME = "umtuba_locale";

/** Distinguishes LanguageSelector (explicit) from first-visit device detect. */
export const LOCALE_SOURCE_COOKIE_NAME = "umtuba_locale_source";

export type LocalePreferenceSource = "explicit" | "detected";

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

function serializeDocumentCookie(name: string, value: string): string {
  const opts = localeCookieOptions();
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${opts.path}`,
    `Max-Age=${opts.maxAge}`,
    `SameSite=${opts.sameSite}`,
  ];
  if (opts.secure) parts.push("Secure");
  return parts.join("; ");
}

/** Serializes `name=value` attributes for document.cookie (client). */
export function buildLocaleDocumentCookie(locale: AppLocale): string {
  return serializeDocumentCookie(LOCALE_COOKIE_NAME, locale);
}

export function buildLocaleSourceDocumentCookie(
  source: LocalePreferenceSource
): string {
  return serializeDocumentCookie(LOCALE_SOURCE_COOKIE_NAME, source);
}

export function persistLocaleDocumentCookies(
  locale: AppLocale,
  source: LocalePreferenceSource
): string[] {
  return [
    buildLocaleDocumentCookie(locale),
    buildLocaleSourceDocumentCookie(source),
  ];
}

export function readDocumentCookie(
  name: string,
  cookieHeader?: string | null
): string | null {
  const raw =
    cookieHeader ??
    (typeof document === "undefined" ? "" : document.cookie);
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    if (trimmed.slice(0, eq) !== name) continue;
    try {
      return decodeURIComponent(trimmed.slice(eq + 1));
    } catch {
      return trimmed.slice(eq + 1);
    }
  }
  return null;
}

export function readSavedLocaleFromDocument(
  cookieHeader?: string | null
): AppLocale | null {
  return parseLocaleCookieValue(
    readDocumentCookie(LOCALE_COOKIE_NAME, cookieHeader)
  );
}

/** Client-only: persist preference and update html lang/dir before RSC refresh. */
export function applyDocumentLocale(
  locale: AppLocale,
  source: LocalePreferenceSource
): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("lang", locale);
  root.setAttribute("dir", getLocaleDirection(locale));
  for (const cookie of persistLocaleDocumentCookies(locale, source)) {
    document.cookie = cookie;
  }
}
