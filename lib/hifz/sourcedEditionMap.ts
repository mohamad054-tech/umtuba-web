/**
 * Locale → QuranEnc edition mapping for Surah ash-Shams sourced notes.
 * Arabic uses التفسير الميسر (tafsir). Other locales prefer المختصر when
 * available on QuranEnc; otherwise a named published translation.
 * Korean has no verified QuranEnc edition — omitted.
 */

import type { AppLocale } from "../i18n/locales";

export type SourcedEditionKind = "tafsir" | "meanings";

export type QuranEncEditionMapping = {
  locale: AppLocale;
  quranEncKey: string;
  kind: SourcedEditionKind;
  /** Arabic display name of the published work. */
  displayNameAr: string;
  /** English display name of the published work. */
  displayNameEn: string;
  dataFile: string;
};

/** Locales with a verified downloaded QuranEnc (or KFGQPC via QuranEnc) text. */
export const ASH_SHAMS_SOURCED_EDITIONS: readonly QuranEncEditionMapping[] = [
  {
    locale: "ar",
    quranEncKey: "arabic_moyassar",
    kind: "tafsir",
    displayNameAr: "التفسير الميسر",
    displayNameEn: "At-Tafsir Al-Muyassar",
    dataFile: "ash-shams-91.tafsir-muyassar.json",
  },
  {
    locale: "en",
    quranEncKey: "english_mokhtasar",
    kind: "meanings",
    displayNameAr: "المختصر في تفسير القرآن الكريم",
    displayNameEn: "Al-Mukhtasar (Tafsir Center)",
    dataFile: "ash-shams-91.meanings-en.json",
  },
  {
    locale: "fr",
    quranEncKey: "french_mokhtasar",
    kind: "meanings",
    displayNameAr: "المختصر في تفسير القرآن الكريم",
    displayNameEn: "Al-Mukhtasar (Tafsir Center)",
    dataFile: "ash-shams-91.meanings-fr.json",
  },
  {
    locale: "es",
    quranEncKey: "spanish_mokhtasar",
    kind: "meanings",
    displayNameAr: "المختصر في تفسير القرآن الكريم",
    displayNameEn: "Al-Mukhtasar (Tafsir Center)",
    dataFile: "ash-shams-91.meanings-es.json",
  },
  {
    locale: "de",
    quranEncKey: "german_bubenheim",
    kind: "meanings",
    displayNameAr: "ترجمة فرانك بوبنهايم",
    displayNameEn: "German Translation — Frank Bubenheim",
    dataFile: "ash-shams-91.meanings-de.json",
  },
  {
    locale: "pt",
    quranEncKey: "portuguese_nasr",
    kind: "meanings",
    displayNameAr: "ترجمة حلمي نصر",
    displayNameEn: "Portuguese Translation — Helmi Nasr",
    dataFile: "ash-shams-91.meanings-pt.json",
  },
  {
    locale: "id",
    quranEncKey: "indonesian_mokhtasar",
    kind: "meanings",
    displayNameAr: "المختصر في تفسير القرآن الكريم",
    displayNameEn: "Al-Mukhtasar (Tafsir Center)",
    dataFile: "ash-shams-91.meanings-id.json",
  },
  {
    locale: "hi",
    quranEncKey: "hindi_mokhtasar",
    kind: "meanings",
    displayNameAr: "المختصر في تفسير القرآن الكريم",
    displayNameEn: "Al-Mukhtasar (Tafsir Center)",
    dataFile: "ash-shams-91.meanings-hi.json",
  },
  {
    locale: "ru",
    quranEncKey: "russian_mokhtasar",
    kind: "meanings",
    displayNameAr: "المختصر في تفسير القرآن الكريم",
    displayNameEn: "Al-Mukhtasar (Tafsir Center)",
    dataFile: "ash-shams-91.meanings-ru.json",
  },
  {
    locale: "tr",
    quranEncKey: "turkish_mokhtasar",
    kind: "meanings",
    displayNameAr: "المختصر في تفسير القرآن الكريم",
    displayNameEn: "Al-Mukhtasar (Tafsir Center)",
    dataFile: "ash-shams-91.meanings-tr.json",
  },
  {
    locale: "zh-CN",
    quranEncKey: "chinese_mokhtasar",
    kind: "meanings",
    displayNameAr: "المختصر في تفسير القرآن الكريم",
    displayNameEn: "Al-Mukhtasar (Tafsir Center)",
    dataFile: "ash-shams-91.meanings-zh-CN.json",
  },
  {
    locale: "ja",
    quranEncKey: "japanese_mokhtasar",
    kind: "meanings",
    displayNameAr: "المختصر في تفسير القرآن الكريم",
    displayNameEn: "Al-Mukhtasar (Tafsir Center)",
    dataFile: "ash-shams-91.meanings-ja.json",
  },
] as const;

/** Site locales with no verified QuranEnc text for ash-Shams (omit UI). */
export const ASH_SHAMS_OMITTED_LOCALES: readonly AppLocale[] = ["ko"];

export function mappingForLocale(
  locale: AppLocale,
): QuranEncEditionMapping | null {
  return ASH_SHAMS_SOURCED_EDITIONS.find((e) => e.locale === locale) ?? null;
}

/**
 * Resolve meanings edition for the visitor language.
 * Arabic never uses a "meanings" edition — tafsir only.
 * Locales without a verified download are omitted (no fallback invention).
 */
export function resolveMeaningsLocale(locale: AppLocale): AppLocale | null {
  if (locale === "ar") return null;
  if (mappingForLocale(locale)?.kind === "meanings") return locale;
  return null;
}
