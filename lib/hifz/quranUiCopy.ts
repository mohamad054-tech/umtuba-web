/**
 * Bilingual (AR + EN) UI chrome for Quran Learning surfaces.
 * Other site locales fall back to English. Never machine-translates Quran/tafsir.
 */

import type { AppLocale } from "../i18n/locales";

type Copy = {
  sectionTitleAr: string;
  sectionTitleEn: string;
  sectionBodyAr: string;
  sectionBodyEn: string;
  freeBadgeAr: string;
  freeBadgeEn: string;
  openAr: string;
  openEn: string;
  quranHomeTitleAr: string;
  quranHomeTitleEn: string;
  quranHomeBodyAr: string;
  quranHomeBodyEn: string;
  shamsCardTitleAr: string;
  shamsCardTitleEn: string;
  shamsCardBodyAr: string;
  shamsCardBodyEn: string;
  memorizeCtaAr: string;
  memorizeCtaEn: string;
  tafsirButtonAr: string;
  tafsirButtonEn: string;
  meaningsButtonAr: string;
  meaningsButtonEn: string;
  meaningsLabelAr: string;
  meaningsLabelEn: string;
  hideAr: string;
  hideEn: string;
  backToLearningAr: string;
  backToLearningEn: string;
  backToQuranAr: string;
  backToQuranEn: string;
};

const COPY: Copy = {
  sectionTitleAr: "القرآن الكريم والحديث الشريف",
  sectionTitleEn: "The Noble Quran and the Noble Hadith",
  sectionBodyAr:
    "محتوى مجاني من أم توبة — هادئ، بلا نقاط ولا إعلانات. الحديث يُضاف لاحقًا من مصادر موثّقة فقط.",
  sectionBodyEn:
    "Free UMTUBA content — calm, no points, no ads. Hadith will be added later from authenticated sources only.",
  freeBadgeAr: "مجاني من أم توبة",
  freeBadgeEn: "Free from UMTUBA",
  openAr: "افتح",
  openEn: "Open",
  quranHomeTitleAr: "القرآن الكريم",
  quranHomeTitleEn: "The Noble Quran",
  quranHomeBodyAr: "ما هو متاح الآن: سورة الشمس — تجربة حفظ هادئة.",
  quranHomeBodyEn: "Available now: Surah ash-Shams — a calm memorization experience.",
  shamsCardTitleAr: "سورة الشمس",
  shamsCardTitleEn: "Surah ash-Shams",
  shamsCardBodyAr: "حفظ بهدوء مع التلاوة والصيغ المساعدة.",
  shamsCardBodyEn: "Calm memorization with recitation and gentle practice modes.",
  memorizeCtaAr: "ابدأ الحفظ",
  memorizeCtaEn: "Start memorizing",
  tafsirButtonAr: "التفسير",
  tafsirButtonEn: "Tafsir",
  meaningsButtonAr: "ترجمة معاني القرآن",
  meaningsButtonEn: "Translation of the meanings",
  meaningsLabelAr: "ترجمة معاني القرآن",
  meaningsLabelEn: "Translation of the meanings",
  hideAr: "إخفاء",
  hideEn: "Hide",
  backToLearningAr: "العودة إلى التعلّم",
  backToLearningEn: "Back to Learning",
  backToQuranAr: "سور القرآن",
  backToQuranEn: "Quran section",
};

export function quranUi(locale: AppLocale): Copy & { primary: "ar" | "en" } {
  const primary = locale === "ar" ? "ar" : "en";
  return { ...COPY, primary };
}

export function line(locale: AppLocale, ar: string, en: string): string {
  return locale === "ar" ? ar : en;
}
