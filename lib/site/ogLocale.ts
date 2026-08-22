import type { AppLocale } from "../i18n/locales";

const OG_LOCALE: Record<AppLocale, string> = {
  ar: "ar_AR",
  en: "en_US",
  fr: "fr_FR",
  es: "es_ES",
  de: "de_DE",
  pt: "pt_BR",
  id: "id_ID",
  hi: "hi_IN",
  ru: "ru_RU",
  tr: "tr_TR",
  "zh-CN": "zh_CN",
  ja: "ja_JP",
  ko: "ko_KR",
};

export function ogLocaleFor(locale: AppLocale): string {
  return OG_LOCALE[locale];
}
