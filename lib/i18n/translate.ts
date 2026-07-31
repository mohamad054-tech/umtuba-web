/**
 * Typed translation helper — safe for server and client.
 * Missing keys fall back to English, then to the key string (never throws).
 */

import { DEFAULT_LOCALE, type AppLocale } from "./locales";
import { getMessageCatalog } from "./messages/catalogs";
import { enMessages } from "./messages/en";
import type { TranslationKey } from "./messages/types";

export type TranslateOptions = {
  /** Optional simple `{name}` interpolation values. */
  values?: Record<string, string | number>;
};

const missingKeyWarnings = new Set<string>();

function warnMissingKey(locale: AppLocale, key: string): void {
  if (process.env.NODE_ENV === "production") return;
  const token = `${locale}:${key}`;
  if (missingKeyWarnings.has(token)) return;
  missingKeyWarnings.add(token);
  // Dev visibility only — never surface to end users.
  console.warn(`[i18n] Missing translation key "${key}" for locale "${locale}"`);
}

function interpolate(
  template: string,
  values?: Record<string, string | number>
): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = values[name];
    return value == null ? match : String(value);
  });
}

export function translate(
  locale: AppLocale,
  key: TranslationKey,
  options?: TranslateOptions
): string {
  const catalog = getMessageCatalog(locale);
  const primary = catalog[key];
  if (typeof primary === "string" && primary.length > 0) {
    return interpolate(primary, options?.values);
  }

  warnMissingKey(locale, key);

  const fallback = enMessages[key];
  if (typeof fallback === "string" && fallback.length > 0) {
    return interpolate(fallback, options?.values);
  }

  warnMissingKey(DEFAULT_LOCALE, key);
  return key;
}

/** Factory for a locale-bound `t()` helper (server actions, RSC, tests). */
export function createTranslator(locale: AppLocale) {
  return (key: TranslationKey, options?: TranslateOptions) =>
    translate(locale, key, options);
}

/** Test helper — clears dedupe set between cases. */
export function resetMissingTranslationWarningsForTests(): void {
  missingKeyWarnings.clear();
}
