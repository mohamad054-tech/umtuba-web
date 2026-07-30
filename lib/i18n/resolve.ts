/**
 * Fail-safe locale resolution (Platform I18n Foundation V1).
 *
 * Order (first valid wins):
 * 1. explicit override (caller / saved preference passed in)
 * 2. authenticated user preference (only when a safe contract already exists)
 * 3. cookie / persisted preference
 * 4. browser / Accept-Language
 * 5. DEFAULT_LOCALE fallback
 *
 * This milestone does not invent DB persistence — userPreference is an optional
 * passthrough for future profile contracts.
 */

import {
  DEFAULT_LOCALE,
  normalizeToAppLocale,
  type AppLocale,
} from "./locales";

export type LocaleResolutionInput = {
  /** Highest-priority explicit choice (e.g. selector just set, query override). */
  explicit?: string | null;
  /**
   * Authenticated profile preference when a real contract already exists.
   * Pass null/undefined when no safe persisted user locale field exists.
   */
  userPreference?: string | null;
  /** Cookie / local persisted preference. */
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

export function resolveAppLocale(input: LocaleResolutionInput = {}): AppLocale {
  const fromExplicit = firstSupported([input.explicit]);
  if (fromExplicit) return fromExplicit;

  const fromUser = firstSupported([input.userPreference]);
  if (fromUser) return fromUser;

  const fromCookie = firstSupported([input.cookiePreference]);
  if (fromCookie) return fromCookie;

  const fromBrowser = firstSupported(browserCandidates(input.browserLanguages));
  if (fromBrowser) return fromBrowser;

  return DEFAULT_LOCALE;
}
