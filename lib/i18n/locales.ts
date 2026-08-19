/**
 * Platform Internationalization Foundation — locale contract.
 * Supported locales only; unsupported inputs fail closed to the fallback.
 *
 * Chinese: Simplified lands as `zh-CN`. Traditional `zh-TW` is reserved
 * and must not collapse onto Simplified. Portuguese stays `pt` (pt-BR copy).
 * Korean is South Korea UI (`ko` / ko-KR).
 */

export const SUPPORTED_LOCALES = [
  "ar",
  "en",
  "fr",
  "es",
  "de",
  "pt",
  "id",
  "hi",
  "ru",
  "tr",
  "zh-CN",
  "ja",
  "ko",
] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

/** Reserved codes — add a catalog later without changing the matcher shape. */
export const FUTURE_LOCALE_CODES = ["zh-TW"] as const;
export type FutureAppLocale = (typeof FUTURE_LOCALE_CODES)[number];

export const DEFAULT_LOCALE: AppLocale = "en";

export type TextDirection = "rtl" | "ltr";

export type LocaleDefinition = {
  code: AppLocale;
  direction: TextDirection;
  /** BCP 47 language tag used for Intl / html lang. */
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
  id: {
    code: "id",
    direction: "ltr",
    bcp47: "id",
    nativeName: "Bahasa Indonesia",
    englishName: "Indonesian",
  },
  hi: {
    code: "hi",
    direction: "ltr",
    bcp47: "hi",
    nativeName: "हिन्दी",
    englishName: "Hindi",
  },
  ru: {
    code: "ru",
    direction: "ltr",
    bcp47: "ru",
    nativeName: "Русский",
    englishName: "Russian",
  },
  tr: {
    code: "tr",
    direction: "ltr",
    bcp47: "tr",
    nativeName: "Türkçe",
    englishName: "Turkish",
  },
  "zh-CN": {
    code: "zh-CN",
    direction: "ltr",
    bcp47: "zh-CN",
    nativeName: "简体中文",
    englishName: "Chinese (Simplified)",
  },
  ja: {
    code: "ja",
    direction: "ltr",
    bcp47: "ja",
    nativeName: "日本語",
    englishName: "Japanese",
  },
  ko: {
    code: "ko",
    direction: "ltr",
    bcp47: "ko-KR",
    nativeName: "한국어",
    englishName: "Korean",
  },
};

function canonicalizeTag(raw: string): string {
  return raw.trim().toLowerCase().replace(/_/g, "-");
}

/** Case-insensitive match to a landed AppLocale (`zh-cn` → `zh-CN`). */
export function matchSupportedLocale(value: unknown): AppLocale | null {
  if (typeof value !== "string") return null;
  const lower = canonicalizeTag(value);
  if (!lower) return null;
  for (const code of SUPPORTED_LOCALES) {
    if (code.toLowerCase() === lower) return code;
  }
  return null;
}

export function isAppLocale(value: unknown): value is AppLocale {
  return matchSupportedLocale(value) !== null;
}

/**
 * World city-copy reserved Wave 2 slot is `zh` (Simplified).
 * Traditional stays out until a `zh-TW` catalog exists.
 */
export function toWorldCatalogLocaleKey(locale: AppLocale): string {
  if (locale === "zh-CN") return "zh";
  return locale;
}

function normalizeChinese(tag: string): AppLocale | null | undefined {
  if (tag !== "zh" && !tag.startsWith("zh-")) return undefined;
  const rest = tag.split("-").slice(1);
  const traditional = rest.some(
    (part) => part === "hant" || part === "tw" || part === "hk" || part === "mo"
  );
  if (traditional) return null;
  return "zh-CN";
}

/**
 * Normalize browser / BCP 47 tags to a supported AppLocale.
 * Examples: ar-PS → ar, en-US → en, fr_CA → fr, zh-Hans → zh-CN, ko-KR → ko.
 * zh-TW / zh-Hant → null (not Simplified).
 */
export function normalizeToAppLocale(
  raw: string | null | undefined
): AppLocale | null {
  if (raw == null) return null;
  const trimmed = canonicalizeTag(raw);
  if (!trimmed) return null;

  const exact = matchSupportedLocale(trimmed);
  if (exact) return exact;

  const chinese = normalizeChinese(trimmed);
  if (chinese !== undefined) return chinese;

  const primary = trimmed.split("-")[0] ?? "";
  return matchSupportedLocale(primary);
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

/**
 * Compact chrome label (EN / AR / PT / ZH).
 * `pt-BR` normalizes to `pt`. `zh-CN` compact is ZH (fits the 11px chip).
 */
export function compactLocaleLabel(locale: AppLocale): string {
  if (locale === "zh-CN") return "ZH";
  return locale.toUpperCase();
}
