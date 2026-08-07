/**
 * Minimal Studio workflow integration — evaluate draft/suggestion only.
 * Does NOT change save/submit/approve/publish behavior.
 */

import type { StudioLanguageCode, TranslationMemoryEntry } from "../types";
import { buildProfessionalTranslationRequestContext } from "./contextBuilder";
import { runDeterministicTranslationQa } from "./deterministicQa";
import { evaluateQualityGate } from "./thresholds";
import { requiresHumanReview } from "./humanReviewPolicy";
import { seedUmtubaOfficialTerminologyCatalog } from "./terminologySeed";
import type { TerminologyPolicyCatalog } from "./terminologyPolicy";
import { buildProfessionalQualityReport } from "./qualityReport";
import type { ProfessionalTranslationQualityReport } from "./qualityReport";
import type { ProfessionalQualityRecommendation } from "./types";

export type EvaluateProfessionalDraftInput = {
  keyStableId?: string | null;
  namespaceId?: string | null;
  namespaceName?: string | null;
  sourceLocale?: StudioLanguageCode;
  targetLocale: StudioLanguageCode;
  sourceText: string;
  draftText: string;
  keyDescription?: string | null;
  domainHint?: string | null;
  keyContextPackId?: string | null;
  terminologyCatalog?: TerminologyPolicyCatalog;
  memoryEntries?: TranslationMemoryEntry[];
  statusHint?: string | null;
};

export type EvaluateProfessionalDraftResult = {
  recommendation: ProfessionalQualityRecommendation;
  report: ProfessionalTranslationQualityReport;
};

/**
 * Evaluate a draft/suggestion for professional quality.
 * Pure helper — callers decide whether to surface findings in UI.
 */
export function evaluateProfessionalTranslationDraft(
  input: EvaluateProfessionalDraftInput
): EvaluateProfessionalDraftResult {
  const catalog =
    input.terminologyCatalog ?? seedUmtubaOfficialTerminologyCatalog();
  const context = buildProfessionalTranslationRequestContext({
    keyStableId: input.keyStableId,
    namespaceId: input.namespaceId,
    namespaceName: input.namespaceName,
    sourceLocale: input.sourceLocale,
    targetLocale: input.targetLocale,
    sourceText: input.sourceText,
    currentTranslation: input.draftText,
    keyDescription: input.keyDescription,
    domainHint: input.domainHint,
    keyContextPackId: input.keyContextPackId,
    terminologyCatalog: catalog,
    memoryEntries: input.memoryEntries,
    statusHint: input.statusHint,
  });

  const score = runDeterministicTranslationQa({
    sourceText: context.sourceText,
    targetText: input.draftText,
    sourceLocale: context.sourceLocale,
    targetLocale: context.targetLocale,
    glossaryTerms: context.glossaryTerms,
    styleGuide: context.styleGuide,
  });

  const gate = evaluateQualityGate({
    score,
    profile: context.qualityProfile,
  });
  const human = requiresHumanReview({
    sourceText: context.sourceText,
    targetText: input.draftText,
    score,
    findings: gate.findings,
    profile: context.qualityProfile,
    contextPack: context.contextPack,
  });

  let recommendation: ProfessionalQualityRecommendation = "PASS";
  if (gate.decision === "QUALITY_BLOCKED") recommendation = "BLOCK";
  else if (gate.decision === "QUALITY_REVIEW_REQUIRED" || human.required) {
    recommendation = "HUMAN_REVIEW";
  }

  const report = buildProfessionalQualityReport({
    context,
    score: { ...score, findings: gate.findings },
    recommendation,
    gateDecision: gate.decision,
    humanReviewReasons: human.reasons,
  });

  return { recommendation, report };
}
