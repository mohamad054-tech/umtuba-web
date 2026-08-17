import "server-only";

import { cookies, headers } from "next/headers";
import { LOCALE_OVERRIDE_HEADER } from "../site/hreflang";
import { LOCALE_COOKIE_NAME, parseLocaleCookieValue } from "./cookie";
import {
  getLocaleDirection,
  type AppLocale,
  type TextDirection,
} from "./locales";
import { resolveAppLocale } from "./resolve";

export type ResolvedRequestLocale = {
  locale: AppLocale;
  direction: TextDirection;
  source: "query" | "cookie" | "accept-language" | "fallback";
};

/**
 * Resolve locale for the current request (RSC / root layout).
 * No DB user preference in V1 — cookie → Accept-Language → fallback.
 */
export async function resolveRequestLocale(): Promise<ResolvedRequestLocale> {
  const jar = await cookies();
  const cookiePreference = parseLocaleCookieValue(
    jar.get(LOCALE_COOKIE_NAME)?.value ?? null
  );

  const headerStore = await headers();
  const acceptLanguage = headerStore.get("accept-language");
  const queryLocale = headerStore.get(LOCALE_OVERRIDE_HEADER);

  const locale = resolveAppLocale({
    explicit: queryLocale,
    cookiePreference,
    browserLanguages: acceptLanguage,
  });

  let source: ResolvedRequestLocale["source"] = "fallback";
  if (queryLocale) {
    source = "query";
  } else if (cookiePreference) {
    source = "cookie";
  } else {
    const fromBrowser = resolveAppLocale({
      browserLanguages: acceptLanguage,
    });
    const fromFallback = resolveAppLocale({});
    if (fromBrowser !== fromFallback) {
      source = "accept-language";
    }
  }

  return {
    locale,
    direction: getLocaleDirection(locale),
    source,
  };
}
