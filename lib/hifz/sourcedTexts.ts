/**
 * Load validated Surah 91 tafsir / meanings of the Quran from downloaded JSON.
 * Never invents text — refuses payloads without the cross-check flag.
 */

import type { AppLocale } from "../i18n/locales";
import {
  mappingForLocale,
  resolveMeaningsLocale,
  type SourcedEditionKind,
} from "./sourcedEditionMap";

import tafsirMuyassar from "../../data/hifz/ash-shams-91.tafsir-muyassar.json";
import meaningsEn from "../../data/hifz/ash-shams-91.meanings-en.json";
import meaningsFr from "../../data/hifz/ash-shams-91.meanings-fr.json";
import meaningsEs from "../../data/hifz/ash-shams-91.meanings-es.json";
import meaningsDe from "../../data/hifz/ash-shams-91.meanings-de.json";
import meaningsPt from "../../data/hifz/ash-shams-91.meanings-pt.json";
import meaningsId from "../../data/hifz/ash-shams-91.meanings-id.json";
import meaningsHi from "../../data/hifz/ash-shams-91.meanings-hi.json";
import meaningsRu from "../../data/hifz/ash-shams-91.meanings-ru.json";
import meaningsTr from "../../data/hifz/ash-shams-91.meanings-tr.json";
import meaningsZhCN from "../../data/hifz/ash-shams-91.meanings-zh-CN.json";
import meaningsJa from "../../data/hifz/ash-shams-91.meanings-ja.json";

export type SourcedAyahNote = {
  number: number;
  text: string;
  footnotes: string | null;
};

export type SourcedSurahPayload = {
  surah: number;
  locale: string;
  kind: SourcedEditionKind;
  quranEncKey: string;
  version: string;
  displayNameAr: string;
  displayNameEn: string;
  publisher: string;
  attributionRequired: boolean;
  termsUrl: string;
  crossCheckWordByWord100Percent: boolean;
  ayahCount: number;
  ayat: SourcedAyahNote[];
};

function assertPayload(data: SourcedSurahPayload, expectKind: SourcedEditionKind) {
  if (data.surah !== 91) throw new Error(`Expected surah 91, got ${data.surah}`);
  if (data.kind !== expectKind) {
    throw new Error(`Expected kind ${expectKind}, got ${data.kind}`);
  }
  if (!data.crossCheckWordByWord100Percent) {
    throw new Error("Refusing sourced text without 100% cross-check flag");
  }
  if (data.ayahCount !== 15 || data.ayat.length !== 15) {
    throw new Error(`Expected 15 ayat, got ${data.ayahCount}/${data.ayat.length}`);
  }
  for (let i = 0; i < data.ayat.length; i++) {
    const ayah = data.ayat[i];
    if (ayah.number !== i + 1) {
      throw new Error(`Ayah number mismatch at ${i}`);
    }
    if (typeof ayah.text !== "string" || !ayah.text.trim()) {
      throw new Error(`Empty sourced text at ayah ${ayah.number}`);
    }
  }
  return data;
}

const BY_LOCALE: Partial<Record<AppLocale, SourcedSurahPayload>> = {
  ar: assertPayload(tafsirMuyassar as SourcedSurahPayload, "tafsir"),
  en: assertPayload(meaningsEn as SourcedSurahPayload, "meanings"),
  fr: assertPayload(meaningsFr as SourcedSurahPayload, "meanings"),
  es: assertPayload(meaningsEs as SourcedSurahPayload, "meanings"),
  de: assertPayload(meaningsDe as SourcedSurahPayload, "meanings"),
  pt: assertPayload(meaningsPt as SourcedSurahPayload, "meanings"),
  id: assertPayload(meaningsId as SourcedSurahPayload, "meanings"),
  hi: assertPayload(meaningsHi as SourcedSurahPayload, "meanings"),
  ru: assertPayload(meaningsRu as SourcedSurahPayload, "meanings"),
  tr: assertPayload(meaningsTr as SourcedSurahPayload, "meanings"),
  "zh-CN": assertPayload(meaningsZhCN as SourcedSurahPayload, "meanings"),
  ja: assertPayload(meaningsJa as SourcedSurahPayload, "meanings"),
};

/** Arabic التفسير الميسر for one ayah. */
export function getMuyassarTafsir(ayahNumber: number): {
  text: string;
  source: SourcedSurahPayload;
} | null {
  const source = BY_LOCALE.ar;
  if (!source) return null;
  const ayah = source.ayat[ayahNumber - 1];
  if (!ayah || ayah.number !== ayahNumber) return null;
  return { text: ayah.text, source };
}

/** Translation of the meanings for the visitor language (never Arabic Quran). */
export function getMeaningsForLocale(
  locale: AppLocale,
  ayahNumber: number,
): {
  text: string;
  source: SourcedSurahPayload;
  resolvedLocale: AppLocale;
} | null {
  const resolved = resolveMeaningsLocale(locale);
  if (!resolved) return null;
  const source = BY_LOCALE[resolved];
  if (!source || source.kind !== "meanings") return null;
  const ayah = source.ayat[ayahNumber - 1];
  if (!ayah || ayah.number !== ayahNumber) return null;
  return { text: ayah.text, source, resolvedLocale: resolved };
}

export function hasSourcedEdition(locale: AppLocale): boolean {
  return mappingForLocale(locale) != null;
}
