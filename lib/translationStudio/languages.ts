import {
  LOCALE_DEFINITIONS,
  SUPPORTED_LOCALES,
  isAppLocale,
  type AppLocale,
} from "../i18n/locales";
import type { StudioLanguage, StudioLanguageCode } from "./types";

export function isStudioLanguageCode(
  value: unknown
): value is StudioLanguageCode {
  return isAppLocale(value);
}

export function assertStudioLanguage(
  value: string
): StudioLanguageCode {
  if (!isStudioLanguageCode(value)) {
    throw new Error(`Unsupported studio language: ${value}`);
  }
  return value;
}

export function resolveStudioLanguageOrNull(
  value: string | null | undefined
): StudioLanguageCode | null {
  if (value == null) return null;
  return isStudioLanguageCode(value) ? value : null;
}

export function listStudioLanguages(): StudioLanguage[] {
  return SUPPORTED_LOCALES.map((code: AppLocale) => {
    const def = LOCALE_DEFINITIONS[code];
    return {
      code,
      name: def.englishName,
      nativeName: def.nativeName,
      direction: def.direction,
      enabled: true,
    };
  });
}
