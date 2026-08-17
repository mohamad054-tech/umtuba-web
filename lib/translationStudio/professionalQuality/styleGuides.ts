/**
 * Per-language Style Guide contracts V1 (structured, not free-form essays).
 */

import type { StudioLanguageCode } from "../types";

export type StyleFormality = "neutral" | "formal" | "informal";
export type StyleTone =
  | "clear_professional"
  | "friendly_professional"
  | "instructional"
  | "concise_ui";

export type LocaleStyleGuide = {
  locale: StudioLanguageCode;
  tone: StyleTone;
  formality: StyleFormality;
  sentenceStyle: string;
  uiButtonStyle: string;
  capitalization: string;
  punctuation: string;
  numbers: string;
  dates: string;
  currency: string;
  genderInclusivity: string;
  abbreviations: string;
  productNameHandling: string;
  forbiddenPatterns: string[];
  localeNotes: string[];
};

const SHARED_PRODUCT =
  "Preserve brand/product names per terminology policy (e.g. UMTUBA).";

export const LOCALE_STYLE_GUIDES: Record<StudioLanguageCode, LocaleStyleGuide> =
  {
    en: {
      locale: "en",
      tone: "clear_professional",
      formality: "neutral",
      sentenceStyle: "Short, direct sentences. Prefer active voice in UI.",
      uiButtonStyle: "Title Case or short imperative (Save, Cancel, Continue).",
      capitalization: "Sentence case for body; Title Case for primary buttons optional.",
      punctuation: "Standard English punctuation; avoid decorative ellipses in buttons.",
      numbers: "Western digits; use locale grouping when displaying amounts.",
      dates: "Prefer unambiguous ISO-like or localized medium formats.",
      currency: "Symbol + amount per product locale settings; never invent FX.",
      genderInclusivity: "Use neutral phrasing where natural; avoid gendered generics.",
      abbreviations: "Expand on first use in long copy; OK in dense UI if standard.",
      productNameHandling: SHARED_PRODUCT,
      forbiddenPatterns: ["!!!", "Click here", "click here"],
      localeNotes: ["en is the default source locale for App Shell."],
    },
    ar: {
      locale: "ar",
      tone: "concise_ui",
      formality: "formal",
      sentenceStyle:
        "Modern Standard Arabic by default. Natural Arabic word order — not literal English syntax. Prefer concise UI wording.",
      uiButtonStyle: "Short imperative or verbal noun; avoid long subordinate clauses.",
      capitalization: "N/A for Arabic script; Latin tokens keep brand casing.",
      punctuation:
        "RTL-aware punctuation; avoid stacking Latin punctuation mid-Arabic without need.",
      numbers: "Preserve placeholders and Western digits in UI tokens unless product policy says otherwise.",
      dates: "Follow product date formatting; do not invent Hijri conversion.",
      currency: "Follow product currency formatting; do not invent FX.",
      genderInclusivity:
        "Use clear MSA forms appropriate to UI; do not invent contested gender politics.",
      abbreviations: "Prefer Arabic expansions for common UI; keep brand Latin when do-not-translate.",
      productNameHandling:
        "Preserve UMTUBA and protected brands in Latin; avoid unnecessary transliteration.",
      forbiddenPatterns: ["داشبورد", "ريفند", "أدمن", "!!!"],
      localeNotes: [
        "Avoid word-for-word English calques.",
        "Code-switching with protected brand names is allowed when policy says so.",
        "Do not flag normal brand Latin presence as leakage when do-not-translate applies.",
      ],
    },
    fr: {
      locale: "fr",
      tone: "clear_professional",
      formality: "formal",
      sentenceStyle: "Clear French; vous-form for product UI unless product says otherwise.",
      uiButtonStyle: "Short infinitive or imperative (Enregistrer, Annuler).",
      capitalization: "Sentence case; product names unchanged.",
      punctuation: "French spacing rules for ?!;: where product typography allows.",
      numbers: "Space or narrow no-break space thousands where configured.",
      dates: "Localized FR formats; do not invent.",
      currency: "EUR/other per product; symbol placement per locale norms.",
      genderInclusivity: "Use standard inclusive strategies only when product copy requires.",
      abbreviations: "Prefer French standard abbreviations.",
      productNameHandling: SHARED_PRODUCT,
      forbiddenPatterns: ["!!!"],
      localeNotes: ["Prefer native UI phrasing over Anglicisms when a standard FR term exists."],
    },
    es: {
      locale: "es",
      tone: "clear_professional",
      formality: "formal",
      sentenceStyle: "Clear Spanish; usted/neutral UI unless product specifies.",
      uiButtonStyle: "Short infinitive/imperative (Guardar, Cancelar).",
      capitalization: "Sentence case; product names unchanged.",
      punctuation: "Standard Spanish punctuation; inverted ¿¡ only when full questions/exclamations.",
      numbers: "Locale decimal/thousands per product.",
      dates: "Localized ES formats.",
      currency: "Per product currency settings.",
      genderInclusivity: "Neutral where natural; avoid forced constructions.",
      abbreviations: "Standard Spanish abbreviations.",
      productNameHandling: SHARED_PRODUCT,
      forbiddenPatterns: ["!!!"],
      localeNotes: ["Prefer international Spanish unless a market variant is requested."],
    },
    de: {
      locale: "de",
      tone: "clear_professional",
      formality: "formal",
      sentenceStyle: "Clear German; Sie-form for product UI default.",
      uiButtonStyle: "Short infinitive/noun forms (Speichern, Abbrechen).",
      capitalization: "Capitalize German nouns; keep product names as branded.",
      punctuation: "Standard German punctuation.",
      numbers: "German decimal comma when product localizes numbers.",
      dates: "Localized DE formats.",
      currency: "Per product currency settings.",
      genderInclusivity: "Use established inclusive forms only when product requires.",
      abbreviations: "Standard German abbreviations.",
      productNameHandling: SHARED_PRODUCT,
      forbiddenPatterns: ["!!!"],
      localeNotes: ["Compound nouns OK when clearer than calques."],
    },
    pt: {
      locale: "pt",
      tone: "clear_professional",
      formality: "formal",
      sentenceStyle: "Clear Portuguese; international PT unless variant requested.",
      uiButtonStyle: "Short infinitive/imperative (Salvar, Cancelar).",
      capitalization: "Sentence case; product names unchanged.",
      punctuation: "Standard Portuguese punctuation.",
      numbers: "Locale decimal/thousands per product.",
      dates: "Localized PT formats.",
      currency: "Per product currency settings.",
      genderInclusivity: "Neutral where natural.",
      abbreviations: "Standard Portuguese abbreviations.",
      productNameHandling: SHARED_PRODUCT,
      forbiddenPatterns: ["!!!"],
      localeNotes: [
        "Portuguese variant is pt-BR (Salvar, Carregando, Você). Do not switch to pt-PT.",
      ],
    },
    tr: {
      locale: "tr",
      tone: "concise_ui",
      formality: "formal",
      sentenceStyle: "Clear Turkish; siz-form. Watch agglutination length on buttons.",
      uiButtonStyle: "Short imperative (Kaydet, İptal, Yayınla).",
      capitalization: "Sentence case; product names unchanged.",
      punctuation: "Standard Turkish punctuation; dotted/dotless i must stay correct.",
      numbers: "Western digits; locale grouping when displaying amounts.",
      dates: "Localized TR formats.",
      currency: "Per product currency settings.",
      genderInclusivity: "Neutral where natural.",
      abbreviations: "Prefer Turkish expansions in chrome.",
      productNameHandling: SHARED_PRODUCT,
      forbiddenPatterns: ["!!!"],
      localeNotes: [
        "Keep UMTUBA Latin.",
        "Avoid stacking suffixes that overflow chips (Yayımlanıyor… is OK; avoid longer compounds on tabs).",
      ],
    },
    id: {
      locale: "id",
      tone: "clear_professional",
      formality: "formal",
      sentenceStyle: "Clear Indonesian; Anda-form. Same formal class as Wave 1 vous/Sie.",
      uiButtonStyle: "Short verbs (Simpan, Batal, Terbitkan).",
      capitalization: "Sentence case; product names unchanged.",
      punctuation: "Standard Indonesian punctuation.",
      numbers: "Western digits.",
      dates: "Localized ID formats.",
      currency: "Per product currency settings.",
      genderInclusivity: "Neutral Anda.",
      abbreviations: "Prefer Indonesian words over English UI leftovers.",
      productNameHandling: SHARED_PRODUCT,
      forbiddenPatterns: ["!!!", "Edit", "Login"],
      localeNotes: ["Sunting not Edit. Masuk not Login. UMTUBA stays Latin."],
    },
    hi: {
      locale: "hi",
      tone: "clear_professional",
      formality: "formal",
      sentenceStyle: "Modern Standard Hindi; आप-form. Devanagari only — no Urdu/Arabic forms.",
      uiButtonStyle: "Short verbs (सहेजें, रद्द करें, प्रकाशित करें).",
      capitalization: "N/A for Devanagari; Latin tokens keep brand casing.",
      punctuation: "Devanagari danda optional in long copy; UI may use Latin ? ! …",
      numbers: "Western digits in UI tokens.",
      dates: "Localized HI formats.",
      currency: "Per product currency settings.",
      genderInclusivity: "आप keeps gender-neutral address.",
      abbreviations: "Prefer Hindi expansions; keep UMTUBA Latin.",
      productNameHandling: SHARED_PRODUCT,
      forbiddenPatterns: ["!!!"],
      localeNotes: [
        "Line-height must allow matras; do not clip vertical strokes.",
        "Do not use Nastaliq or Arabic-script Hindi.",
      ],
    },
    ja: {
      locale: "ja",
      tone: "concise_ui",
      formality: "formal",
      sentenceStyle: "Concise Japanese; です/ます for sentences, short nouns/verbs for buttons.",
      uiButtonStyle: "Short native chrome (保存, キャンセル, 公開). Avoid needless katakana.",
      capitalization: "N/A for Japanese; Latin tokens keep brand casing.",
      punctuation: "Japanese punctuation in sentences; middle dot for compact labels OK.",
      numbers: "Western digits in UI tokens.",
      dates: "Localized JA formats.",
      currency: "Per product currency settings.",
      genderInclusivity: "Neutral phrasing.",
      abbreviations: "Prefer 漢字/かな over カタカナローン for core chrome.",
      productNameHandling: SHARED_PRODUCT,
      forbiddenPatterns: ["!!!"],
      localeNotes: [
        "Watch=視聴, Discover=見つける, Create=作成, Live=配信, World=ワールド.",
        "プロフィール is acceptable. Do not use ウォッチ for the Watch tab.",
      ],
    },
    ru: {
      locale: "ru",
      tone: "clear_professional",
      formality: "formal",
      sentenceStyle: "Clear Russian; вы-form. Watch case inflection on long genitives.",
      uiButtonStyle: "Short infinitive/imperative (Сохранить, Отмена, Опубликовать).",
      capitalization: "Sentence case; product names unchanged.",
      punctuation: "Standard Russian punctuation; ё where it disambiguates.",
      numbers: "Narrow space or locale grouping; Western digits.",
      dates: "Localized RU formats.",
      currency: "Per product currency settings.",
      genderInclusivity: "Neutral where natural; avoid forced constructions.",
      abbreviations: "Standard Russian abbreviations.",
      productNameHandling: SHARED_PRODUCT,
      forbiddenPatterns: ["!!!", "Зафолловить", "Лайкнуть"],
      localeNotes: [
        "Glossary lock: Обзор (Discover), Эфир (Live), Мир (World), Вы подписаны (Following button — never Отписаться on the button).",
        "Нравится / Не нравится for Like/Unlike. Keep UMTUBA Latin.",
      ],
    },
    "zh-CN": {
      locale: "zh-CN",
      tone: "concise_ui",
      formality: "formal",
      sentenceStyle: "Mainland Simplified Chinese. Short UI. Never mix Traditional characters.",
      uiButtonStyle: "Two-character verbs where natural (保存, 取消, 发布).",
      capitalization: "N/A for Han; Latin tokens keep brand casing.",
      punctuation: "Full-width punctuation in sentences; UI may use …",
      numbers: "Western digits in UI tokens.",
      dates: "Localized zh-CN formats.",
      currency: "Per product currency settings.",
      genderInclusivity: "你 for product UI (standard Mainland app tone).",
      abbreviations: "Prefer 汉字 over English leftovers.",
      productNameHandling: SHARED_PRODUCT,
      forbiddenPatterns: ["!!!", "觀看", "發現", "設定", "訊息"],
      localeNotes: [
        "This catalog is zh-CN / Hans only. zh-TW / Hant is a later catalog — do not reuse these strings.",
        "Watch=观看, Discover=发现, Settings=设置, Messages=消息, Sign in=登录.",
      ],
    },
  };

export function getLocaleStyleGuide(
  locale: StudioLanguageCode
): LocaleStyleGuide {
  return LOCALE_STYLE_GUIDES[locale];
}
