/**
 * UI chrome for Quran Learning surfaces.
 * Surah notes follow the visitor language. Quran and tafsir text are never machine-translated.
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
  meaningsButtonAr: "ترجمة المعاني",
  meaningsButtonEn: "Translation of the meanings",
  meaningsLabelAr: "ترجمة المعاني",
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

type NotesCopy = {
  tafsir: string;
  meanings: string;
  hide: string;
};

/** Button labels under each ayah. One text per site language. */
const NOTES: Record<AppLocale, NotesCopy> = {
  ar: { tafsir: "التفسير", meanings: "ترجمة المعاني", hide: "إخفاء" },
  en: {
    tafsir: "Tafsir",
    meanings: "Translation of the meanings",
    hide: "Hide",
  },
  fr: {
    tafsir: "Tafsir",
    meanings: "Traduction des sens",
    hide: "Masquer",
  },
  es: {
    tafsir: "Tafsir",
    meanings: "Traducción de los significados",
    hide: "Ocultar",
  },
  de: {
    tafsir: "Tafsir",
    meanings: "Übersetzung der Bedeutungen",
    hide: "Ausblenden",
  },
  pt: {
    tafsir: "Tafsir",
    meanings: "Tradução dos significados",
    hide: "Ocultar",
  },
  id: {
    tafsir: "Tafsir",
    meanings: "Terjemahan makna",
    hide: "Sembunyikan",
  },
  hi: { tafsir: "तफ़सीर", meanings: "अर्थों का अनुवाद", hide: "छिपाएँ" },
  ru: { tafsir: "Тафсир", meanings: "Перевод смыслов", hide: "Скрыть" },
  tr: { tafsir: "Tefsir", meanings: "Anlamların çevirisi", hide: "Gizle" },
  "zh-CN": { tafsir: "经注", meanings: "经义翻译", hide: "隐藏" },
  ja: { tafsir: "タフスィール", meanings: "意味の訳", hide: "隠す" },
  ko: { tafsir: "타프시르", meanings: "의미 번역", hide: "숨기기" },
};

export function quranNotesCopy(locale: AppLocale): NotesCopy {
  return NOTES[locale];
}
