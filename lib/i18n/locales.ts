/**
 * Platform Internationalization Foundation V1 — locale contract.
 * Supported locales only; unsupported inputs fail closed to the fallback.
 */

export const SUPPORTED_LOCALES = ["ar", "en", "fr", "es", "de", "pt"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "en";

export type TextDirection = "rtl" | "ltr";

export type LocaleDefinition = {
  code: AppLocale;
  direction: TextDirection;
  /** BCP 47 language tag used for Intl / html lang (same as code for V1). */
  bcp47: string;
  /** Native / endonym display name. */
  nativeName: string;
  /** English display name (catalog-independent). */
  englishName: string;
};

export const LOCALE_DEFINITIONS: Record<AppLocale, LocaleDefinition> = {
  ar: {
    code: "ar",
    direction: "rtl",
    bcp47: "ar",
    nativeName: "العربية",
    englishName: "Arabic",
  },
  en: {
    code: "en",
    direction: "ltr",
    bcp47: "en",
    nativeName: "English",
    englishName: "English",
  },
  fr: {
    code: "fr",
    direction: "ltr",
    bcp47: "fr",
    nativeName: "Français",
    englishName: "French",
  },
  es: {
    code: "es",
    direction: "ltr",
    bcp47: "es",
    nativeName: "Español",
    englishName: "Spanish",
  },
  de: {
    code: "de",
    direction: "ltr",
    bcp47: "de",
    nativeName: "Deutsch",
    englishName: "German",
  },
  pt: {
    code: "pt",
    direction: "ltr",
    bcp47: "pt",
    nativeName: "Português",
    englishName: "Portuguese",
  },
};

export function isAppLocale(value: unknown): value is AppLocale {
  return (
    typeof value === "string" &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value)
  );
}

/**
 * Normalize browser / BCP 47 tags to a supported AppLocale.
 * Examples: ar-PS → ar, en-US → en, fr_CA → fr.
 * Returns null when no supported primary language can be resolved.
 */
export function normalizeToAppLocale(raw: string | null | undefined): AppLocale | null {
  if (raw == null) return null;
  const trimmed = raw.trim().toLowerCase().replace(/_/g, "-");
  if (!trimmed) return null;

  if (isAppLocale(trimmed)) return trimmed;

  const primary = trimmed.split("-")[0] ?? "";
  if (isAppLocale(primary)) return primary;

  return null;
}

export function resolveLocaleOrFallback(
  raw: string | null | undefined
): AppLocale {
  return normalizeToAppLocale(raw) ?? DEFAULT_LOCALE;
}

export function getLocaleDirection(locale: AppLocale): TextDirection {
  return LOCALE_DEFINITIONS[locale].direction;
}

export function getLocaleDefinition(locale: AppLocale): LocaleDefinition {
  return LOCALE_DEFINITIONS[locale];
}

export function listSupportedLocales(): LocaleDefinition[] {
  return SUPPORTED_LOCALES.map((code) => LOCALE_DEFINITIONS[code]);
}
