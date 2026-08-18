/**
 * Unified locale-resolution contract (Web + Store + Learning + Business Sandbox).
 *
 * Order (first valid wins):
 * 1. Explicit saved preference — authenticated profile, then umtuba_locale cookie
 * 2. Explicit locale URL/route parameter (`hl` / `locale`, forwarded as header)
 * 3. Browser / device locale — Accept-Language or navigator.language(s)
 * 4. English fallback
 *
 * Manual LanguageSelector writes the cookie (source=explicit) and must not be
 * overridden by device locale. Device detection never persists unsupported tags.
 */

import {
  DEFAULT_LOCALE,
  normalizeToAppLocale,
  type AppLocale,
} from "./locales";

export type LocaleResolutionInput = {
  /**
   * URL / route override (`?hl=` / `?locale=`). Lower than a saved preference.
   */
  explicit?: string | null;
  /**
   * Authenticated profile preference when a real contract already exists.
   * Pass null/undefined when no safe persisted user locale field exists.
   */
  userPreference?: string | null;
  /** Cookie / local persisted preference (LanguageSelector or first device detect). */
  cookiePreference?: string | null;
  /**
   * Accept-Language header or navigator.languages / navigator.language.
   * May be a single tag or a full header value.
   */
  browserLanguages?: string | string[] | null;
};

/**
 * Parse Accept-Language into ordered language tags (quality-aware when q= present).
 */
export function parseAcceptLanguageHeader(
  header: string | null | undefined
): string[] {
  if (header == null) return [];
  const trimmed = header.trim();
  if (!trimmed) return [];

  return trimmed
    .split(",")
    .map((part) => {
      const [tagRaw, ...params] = part.trim().split(";");
      const tag = (tagRaw ?? "").trim();
      let q = 1;
      for (const param of params) {
        const match = param.trim().match(/^q\s*=\s*([0-9.]+)$/i);
        if (match) {
          const parsed = Number(match[1]);
          if (Number.isFinite(parsed)) q = parsed;
        }
      }
      return { tag, q };
    })
    .filter((entry) => entry.tag.length > 0)
    .sort((a, b) => b.q - a.q)
    .map((entry) => entry.tag);
}

function firstSupported(
  candidates: Array<string | null | undefined>
): AppLocale | null {
  for (const candidate of candidates) {
    const normalized = normalizeToAppLocale(candidate);
    if (normalized) return normalized;
  }
  return null;
}

function browserCandidates(
  browserLanguages: LocaleResolutionInput["browserLanguages"]
): string[] {
  if (browserLanguages == null) return [];
  if (Array.isArray(browserLanguages)) {
    return browserLanguages.flatMap((entry) =>
      entry.includes(",") ? parseAcceptLanguageHeader(entry) : [entry]
    );
  }
  if (browserLanguages.includes(",")) {
    return parseAcceptLanguageHeader(browserLanguages);
  }
  return [browserLanguages];
}

/** Supported device/browser locale, or null when nothing matches (do not treat as `en`). */
export function resolveSupportedBrowserLocale(
  browserLanguages: LocaleResolutionInput["browserLanguages"]
): AppLocale | null {
  return firstSupported(browserCandidates(browserLanguages));
}

export function resolveAppLocale(input: LocaleResolutionInput = {}): AppLocale {
  const fromUser = firstSupported([input.userPreference]);
  if (fromUser) return fromUser;

  const fromCookie = firstSupported([input.cookiePreference]);
  if (fromCookie) return fromCookie;

  const fromExplicit = firstSupported([input.explicit]);
  if (fromExplicit) return fromExplicit;

  const fromBrowser = firstSupported(browserCandidates(input.browserLanguages));
  if (fromBrowser) return fromBrowser;

  return DEFAULT_LOCALE;
}
