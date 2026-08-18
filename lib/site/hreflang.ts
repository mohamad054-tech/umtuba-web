import {
  SUPPORTED_LOCALES,
  normalizeToAppLocale,
  type AppLocale,
} from "../i18n/locales";

/** Query override used by crawlers and share previews. */
export const LOCALE_QUERY_PARAM = "hl";

/** Accepted aliases for the same URL override (does not invent a second system). */
export const LOCALE_QUERY_ALIASES = [LOCALE_QUERY_PARAM, "locale"] as const;

/** Request header set by the proxy when `hl`/`locale` is a supported locale. */
export const LOCALE_OVERRIDE_HEADER = "x-umtuba-hl";

/**
 * Build hreflang language map for a public path.
 * Canonical stays without `hl`; alternates add `?hl=` so each URL can
 * resolve a stable locale. x-default is the unadorned path.
 */
export function buildHreflangLanguages(
  path: string
): Record<string, string> {
  const languages: Record<string, string> = {
    "x-default": stripLocaleQuery(path),
  };
  for (const locale of SUPPORTED_LOCALES) {
    languages[locale] = withLocaleQuery(path, locale);
  }
  return languages;
}

export function withLocaleQuery(path: string, locale: AppLocale): string {
  const url = new URL(path, "https://umtuba.com");
  url.searchParams.set(LOCALE_QUERY_PARAM, locale);
  return `${url.pathname}${url.search}`;
}

export function stripLocaleQuery(path: string): string {
  const url = new URL(path, "https://umtuba.com");
  url.searchParams.delete(LOCALE_QUERY_PARAM);
  return url.pathname === "/" && !url.search
    ? "/"
    : `${url.pathname}${url.search}`;
}

export function listHreflangLocales(): readonly AppLocale[] {
  return SUPPORTED_LOCALES;
}

export function readLocaleQueryValue(
  get: (key: string) => string | null
): AppLocale | null {
  for (const key of LOCALE_QUERY_ALIASES) {
    const normalized = normalizeToAppLocale(get(key));
    if (normalized) return normalized;
  }
  return null;
}
