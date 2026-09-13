import { hasArabicScript } from "./facts";
import { REQUIRED_STORE_LOCALES, type StoreLocale } from "./requiredLocales";
import type { LocaleProductCopy, LocalizedProductCopy } from "./types";

export type LocaleCompletenessResult = {
  required: readonly StoreLocale[];
  passed_locales: StoreLocale[];
  failed_locales: Array<{ locale: StoreLocale; reasons: string[] }>;
  coverage: number;
  complete: boolean;
};

const NATIVE_HINT: Record<Exclude<StoreLocale, "en" | "ar">, RegExp> = {
  fr: /[àâäéèêëïîôùûüçœ]|(\b(le|la|les|un|une|des|pour|avec|sans|cette|ce|dans)\b)/i,
  es: /[áéíóúñ¿¡]|(\b(el|la|los|las|un|una|para|con|sin|este|esta)\b)/i,
  de: /[äöüß]|(\b(der|die|das|und|mit|ohne|für|ein|eine|einem|einen|den|dem|aus|zum|zur|bei|dieser|diese)\b)/i,
  pt: /[áàâãéêíóôõúç]|(\b(o|a|os|as|um|uma|para|com|sem|este|esta)\b)/i,
  id: /(\b(dan|untuk|dengan|tanpa|yang|ini|dari|atau|sebuah|adalah|pada|dapat|digunakan|serta|tidak|sebagai|kecil|besar|bahan)\b|[A-Za-z]{3,}(kan|nya)\b)/i,
  hi: /[\u0900-\u097F]/,
  ru: /[\u0400-\u04FF]/,
  tr: /[ğüşöçıİ]|(\b(bir|için|ile|ve|bu|olan)\b)/i,
  "zh-CN": /[\u4e00-\u9fff]/,
  ja: /[\u3040-\u309f\u30a0-\u30ff]|[のをはがにでとですます]/,
  ko: /[\uac00-\ud7af]/,
};

export function localeCopyFromLegacy(copy: LocalizedProductCopy, locale: StoreLocale): LocaleProductCopy | null {
  if (copy.by_locale?.[locale]) return copy.by_locale[locale] ?? null;
  if (locale === "en") {
    if (!copy.title_en_clean.trim() || !copy.description_en_clean.trim()) return null;
    return {
      title: copy.title_en_clean,
      description: copy.description_en_clean,
      specifications: copy.specifications_en,
      department: copy.department_en,
      subcategory: copy.subcategory_en,
      search_keywords: copy.search_keywords_en,
    };
  }
  if (locale === "ar") {
    if (!copy.title_ar.trim() || !copy.description_ar.trim()) return null;
    return {
      title: copy.title_ar,
      description: copy.description_ar,
      specifications: copy.specifications_ar,
      department: copy.department_ar,
      subcategory: copy.subcategory_ar,
      search_keywords: copy.search_keywords_ar,
    };
  }
  return null;
}

export function evaluateLocaleCopyQuality(
  locale: StoreLocale,
  row: LocaleProductCopy | null,
  english: LocaleProductCopy | null
): string[] {
  if (!row) return ["missing_locale_copy"];
  const reasons: string[] = [];
  if (!row.title.trim()) reasons.push("empty_title");
  if (!row.description.trim()) reasons.push("empty_description");
  if (!row.department.trim() || !row.subcategory.trim()) reasons.push("missing_taxonomy");
  if (locale === "ar") {
    if (!hasArabicScript(row.title) || !hasArabicScript(row.description)) {
      reasons.push("missing_arabic_script");
    }
  } else if (locale !== "en") {
    const hint = NATIVE_HINT[locale];
    const blob = `${row.title} ${row.description} ${row.specifications.join(" ")}`;
    if (english && row.title.trim() === english.title.trim() && row.description.trim() === english.description.trim()) {
      reasons.push("identical_to_english");
    }
    if (hint && !hint.test(blob)) reasons.push("missing_native_language_markers");
  }
  return reasons;
}

export function evaluateLocaleCompleteness(copy: LocalizedProductCopy): LocaleCompletenessResult {
  const english = localeCopyFromLegacy(copy, "en");
  const failed_locales: Array<{ locale: StoreLocale; reasons: string[] }> = [];
  const passed_locales: StoreLocale[] = [];
  for (const locale of REQUIRED_STORE_LOCALES) {
    const reasons = evaluateLocaleCopyQuality(locale, localeCopyFromLegacy(copy, locale), english);
    if (reasons.length) failed_locales.push({ locale, reasons });
    else passed_locales.push(locale);
  }
  const coverage = passed_locales.length / REQUIRED_STORE_LOCALES.length;
  return {
    required: REQUIRED_STORE_LOCALES,
    passed_locales,
    failed_locales,
    coverage,
    complete: coverage === 1 && failed_locales.length === 0,
  };
}

export function listMissingStoreLocales(copy: LocalizedProductCopy): StoreLocale[] {
  return evaluateLocaleCompleteness(copy).failed_locales.map((item) => item.locale);
}
