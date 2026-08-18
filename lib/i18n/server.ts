import "server-only";

import { cookies, headers } from "next/headers";
import { LOCALE_OVERRIDE_HEADER } from "../site/hreflang";
import { LOCALE_COOKIE_NAME, parseLocaleCookieValue } from "./cookie";
import {
  getLocaleDirection,
  normalizeToAppLocale,
  type AppLocale,
  type TextDirection,
} from "./locales";
import { resolveAppLocale, resolveSupportedBrowserLocale } from "./resolve";

export type ResolvedRequestLocale = {
  locale: AppLocale;
  direction: TextDirection;
  source: "preference" | "query" | "cookie" | "accept-language" | "fallback";
};

/**
 * Resolve locale for the current request (RSC / root layout).
 * Contract: saved preference → URL (`hl`/`locale`) → Accept-Language → en.
 * Profile locale is a reserved passthrough — no DB field in this milestone.
 */
export async function resolveRequestLocale(): Promise<ResolvedRequestLocale> {
  const jar = await cookies();
  const cookiePreference = parseLocaleCookieValue(
    jar.get(LOCALE_COOKIE_NAME)?.value ?? null
  );

  const headerStore = await headers();
  const acceptLanguage = headerStore.get("accept-language");
  const queryLocale = normalizeToAppLocale(
    headerStore.get(LOCALE_OVERRIDE_HEADER)
  );

  const locale = resolveAppLocale({
    cookiePreference,
    explicit: queryLocale,
    browserLanguages: acceptLanguage,
  });

  let source: ResolvedRequestLocale["source"] = "fallback";
  if (cookiePreference && cookiePreference === locale) {
    source = "cookie";
  } else if (queryLocale && queryLocale === locale) {
    source = "query";
  } else if (resolveSupportedBrowserLocale(acceptLanguage) === locale) {
    source = "accept-language";
  }

  return {
    locale,
    direction: getLocaleDirection(locale),
    source,
  };
}
