/**
 * Professional translation benchmark rubrics (Arabic primary + FR/ES/DE/PT).
 * Reference translations are guidance — not exact-string-only scoring.
 */

export type BenchmarkRubricDimension =
  | "semantic_fidelity"
  | "naturalness"
  | "glossary_compliance"
  | "ui_conciseness"
  | "grammar"
  | "punctuation_locale"
  | "placeholder_integrity"
  | "context_fit"
  | "brand_handling"
  | "calque_avoidance";

export type LocaleRubric = {
  locale: string;
  dimensions: Array<{
    id: BenchmarkRubricDimension;
    weight: number;
    guidance: string;
  }>;
  passPhilosophy: string;
};

export const ARABIC_BENCHMARK_RUBRIC: LocaleRubric = {
  locale: "ar",
  passPhilosophy:
    "Reject technically correct but unnatural Arabic as professional PASS. Prefer natural MSA, concise UI, glossary compliance, and semantic fidelity over literal calques.",
  dimensions: [
    {
      id: "semantic_fidelity",
      weight: 1.5,
      guidance: "Meaning preserved without invention",
    },
    {
      id: "naturalness",
      weight: 1.4,
      guidance: "Natural Modern Standard Arabic — not English syntax",
    },
    {
      id: "calque_avoidance",
      weight: 1.3,
      guidance: "Avoid literal English calques and unnecessary transliteration",
    },
    {
      id: "ui_conciseness",
      weight: 1.1,
      guidance: "Concise UI wording",
    },
    {
      id: "glossary_compliance",
      weight: 1.5,
      guidance: "Approved glossary / do-not-translate / forbidden alternatives",
    },
    {
      id: "brand_handling",
      weight: 1.2,
      guidance: "Preserve protected brands (e.g. UMTUBA) per policy",
    },
    {
      id: "grammar",
      weight: 1.0,
      guidance: "Grammar appropriate to MSA UI",
    },
    {
      id: "punctuation_locale",
      weight: 0.8,
      guidance: "RTL-aware punctuation; no corrupted tokens",
    },
    {
      id: "placeholder_integrity",
      weight: 1.6,
      guidance: "Placeholders/tags preserved exactly",
    },
    {
      id: "context_fit",
      weight: 1.0,
      guidance: "Domain / audience fit",
    },
  ],
};

function westernLocaleRubric(locale: string): LocaleRubric {
  return {
    locale,
    passPhilosophy:
      "Prefer idiomatic native phrasing, domain terminology, UI conciseness, grammar, locale conventions, and placeholder integrity.",
    dimensions: [
      {
        id: "semantic_fidelity",
        weight: 1.5,
        guidance: "Meaning preserved",
      },
      {
        id: "naturalness",
        weight: 1.3,
        guidance: "Idiomatic native phrasing",
      },
      {
        id: "glossary_compliance",
        weight: 1.4,
        guidance: "Domain terminology / glossary",
      },
      {
        id: "ui_conciseness",
        weight: 1.1,
        guidance: "UI-appropriate length",
      },
      {
        id: "grammar",
        weight: 1.1,
        guidance: "Correct grammar",
      },
      {
        id: "punctuation_locale",
        weight: 0.9,
        guidance: "Locale conventions (numbers/dates/currency cues)",
      },
      {
        id: "placeholder_integrity",
        weight: 1.6,
        guidance: "Placeholders/tags preserved",
      },
      {
        id: "context_fit",
        weight: 1.0,
        guidance: "Domain consistency",
      },
      {
        id: "brand_handling",
        weight: 1.0,
        guidance: "Product/brand handling",
      },
      {
        id: "calque_avoidance",
        weight: 0.8,
        guidance: "Avoid awkward source calques",
      },
    ],
  };
}

export const LOCALE_BENCHMARK_RUBRICS: Record<string, LocaleRubric> = {
  ar: ARABIC_BENCHMARK_RUBRIC,
  fr: westernLocaleRubric("fr"),
  es: westernLocaleRubric("es"),
  de: westernLocaleRubric("de"),
  pt: westernLocaleRubric("pt"),
  en: westernLocaleRubric("en"),
};

export function getLocaleBenchmarkRubric(locale: string): LocaleRubric {
  return LOCALE_BENCHMARK_RUBRICS[locale] ?? westernLocaleRubric(locale);
}
