/**
 * Reviewer / generator prompt + context payload (provider-neutral).
 * Locale-specific style guides are always embedded — never English-generic.
 */

import type { ProfessionalTranslationRequestContext } from "./contextBuilder";
import type { TranslationQualityFinding } from "./types";
import type { LocaleStyleGuide } from "./styleGuides";

export const PROFESSIONAL_REVIEWER_SYSTEM_ROLE =
  "You are an independent professional translation reviewer for UMTUBA. " +
  "Evaluate quality only. You MUST NOT approve, publish, or claim authority to change workflow state. " +
  "AI confidence is not correctness. Return strict JSON only (schemaVersion=1).";

export const PROFESSIONAL_GENERATOR_SYSTEM_ROLE =
  "You are a professional translation generator for UMTUBA. " +
  "Produce a candidate translation only. You MUST NOT approve or publish. " +
  "Respect glossary, style guide, and context pack. Return strict JSON only.";

function arabicSpecializationNotes(style: LocaleStyleGuide): string[] {
  if (style.locale !== "ar") return [];
  return [
    "Use natural Modern Standard Arabic by default.",
    "Avoid English sentence structure / literal calques.",
    "Prefer concise UI wording.",
    "Preserve glossary and do-not-translate brand names (Latin when required).",
    "Avoid unnecessary transliteration.",
    "Respect RTL punctuation conventions.",
    "Prefer semantic clarity over literalism.",
  ];
}

export function buildProfessionalReviewerPromptPayload(input: {
  context: ProfessionalTranslationRequestContext;
  targetText: string;
  deterministicFindings: TranslationQualityFinding[];
}): {
  system: string;
  user: Record<string, unknown>;
} {
  const { context } = input;
  const style = context.styleGuide;
  return {
    system: PROFESSIONAL_REVIEWER_SYSTEM_ROLE,
    user: {
      schemaVersion: 1,
      task: "professional_translation_review",
      sourceLocale: context.sourceLocale,
      targetLocale: context.targetLocale,
      sourceText: context.sourceText,
      targetText: input.targetText,
      keyStableId: context.keyStableId,
      namespace: {
        id: context.namespaceId,
        name: context.namespaceName,
      },
      keyDescription: context.keyDescription,
      qualityProfile: {
        id: context.qualityProfile.id,
        thresholds: context.qualityProfile.thresholds,
        forceHumanReview: context.qualityProfile.forceHumanReview ?? false,
      },
      contextPack: {
        id: context.contextPack.id,
        domainDescription: context.contextPack.domainDescription,
        intendedAudience: context.contextPack.intendedAudience,
        ambiguityNotes: context.contextPack.ambiguityNotes,
      },
      styleGuide: {
        locale: style.locale,
        tone: style.tone,
        formality: style.formality,
        sentenceStyle: style.sentenceStyle,
        uiButtonStyle: style.uiButtonStyle,
        capitalization: style.capitalization,
        punctuation: style.punctuation,
        numbers: style.numbers,
        dates: style.dates,
        currency: style.currency,
        genderInclusivity: style.genderInclusivity,
        abbreviations: style.abbreviations,
        productNameHandling: style.productNameHandling,
        forbiddenPatterns: style.forbiddenPatterns,
        localeNotes: style.localeNotes,
        arabicSpecialization: arabicSpecializationNotes(style),
      },
      glossary: context.glossaryTerms.map((t) => ({
        sourceTerm: t.sourceTerm,
        approved: t.approvedTranslations[context.targetLocale] ?? null,
        doNotTranslate: t.doNotTranslate,
        forbidden: t.forbiddenAlternatives[context.targetLocale] ?? [],
        scopes: t.scopes,
        notes: t.notes ?? null,
      })),
      translationMemory: context.memoryMatches.slice(0, 5).map((m) => ({
        matchKind: m.matchKind,
        approvedOnly: m.approvedOnly,
        text: m.entry.translatedText,
        rankScore: m.rankScore,
      })),
      deterministicFindings: input.deterministicFindings.map((f) => ({
        code: f.code,
        severity: f.severity,
        dimension: f.dimension,
        message: f.message,
      })),
      evaluateDimensions: [
        "semantic_accuracy",
        "terminology_compliance",
        "contextual_fit",
        "fluency_naturalness",
        "ui_conciseness",
        "consistency",
        "grammar_spelling",
        "locale_conventions",
      ],
      authority: {
        canApprove: false,
        canPublish: false,
      },
      requiredOutput: {
        schemaVersion: 1,
        dimensionScores: "0-100 per evaluated dimension",
        findings: "array of {severity,dimension,message}",
        suggestedRevision: "optional string",
        terminologyDecisions: "optional",
        confidence: "0-1 optional — not correctness",
        provider: "{providerId,modelId}",
      },
    },
  };
}

export function buildProfessionalGeneratorPromptPayload(input: {
  context: ProfessionalTranslationRequestContext;
}): {
  system: string;
  user: Record<string, unknown>;
} {
  const { context } = input;
  const style = context.styleGuide;
  return {
    system: PROFESSIONAL_GENERATOR_SYSTEM_ROLE,
    user: {
      schemaVersion: 1,
      task: "professional_translation_generate",
      sourceLocale: context.sourceLocale,
      targetLocale: context.targetLocale,
      sourceText: context.sourceText,
      keyStableId: context.keyStableId,
      namespace: {
        id: context.namespaceId,
        name: context.namespaceName,
      },
      qualityProfile: { id: context.qualityProfile.id },
      contextPack: {
        id: context.contextPack.id,
        domainDescription: context.contextPack.domainDescription,
        intendedAudience: context.contextPack.intendedAudience,
      },
      styleGuide: {
        locale: style.locale,
        tone: style.tone,
        formality: style.formality,
        sentenceStyle: style.sentenceStyle,
        uiButtonStyle: style.uiButtonStyle,
        forbiddenPatterns: style.forbiddenPatterns,
        localeNotes: style.localeNotes,
        arabicSpecialization: arabicSpecializationNotes(style),
      },
      glossary: context.glossaryTerms.map((t) => ({
        sourceTerm: t.sourceTerm,
        approved: t.approvedTranslations[context.targetLocale] ?? null,
        doNotTranslate: t.doNotTranslate,
        forbidden: t.forbiddenAlternatives[context.targetLocale] ?? [],
      })),
      translationMemory: context.memoryMatches.slice(0, 5).map((m) => ({
        matchKind: m.matchKind,
        text: m.entry.translatedText,
      })),
      authority: { canApprove: false, canPublish: false },
      requiredOutput: {
        candidateText: "string",
        rationaleNotes: "optional concise",
        terminologyDecisions: "optional",
        confidence: "0-1 optional",
        provider: "{providerId,modelId}",
      },
    },
  };
}

/** Extract locale style locale id from a built reviewer payload (tests). */
export function getStyleGuideLocaleFromReviewerPayload(
  payload: ReturnType<typeof buildProfessionalReviewerPromptPayload>
): string {
  const style = payload.user.styleGuide as { locale?: string };
  return style.locale ?? "";
}
