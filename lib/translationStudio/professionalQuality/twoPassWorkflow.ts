/**
 * Two-pass professional workflow design (domain orchestration foundation).
 * PASS1 generator → PASS2 independent reviewer → deterministic QA → decision.
 * No automatic publish. Fail-closed on invalid AI payloads.
 */

import type { ProfessionalTranslationRequestContext } from "./contextBuilder";
import {
  PROFESSIONAL_AI_AUTHORITY,
  parseProfessionalTranslationGeneratorOutput,
  parseProfessionalTranslationReviewResult,
  type ProfessionalTranslationGenerator,
  type ProfessionalTranslationReviewer,
} from "./aiContracts";
import { runDeterministicTranslationQa } from "./deterministicQa";
import { evaluateQualityGate } from "./thresholds";
import { requiresHumanReview } from "./humanReviewPolicy";
import {
  clampScore100,
  computeOverallQualityScore,
  type TranslationQualityFinding,
  type TranslationQualityScore,
  type ProfessionalQualityRecommendation,
} from "./types";
import type { ProfessionalTranslationQualityReport } from "./qualityReport";
import { buildProfessionalQualityReport } from "./qualityReport";

export type TwoPassWorkflowResult = {
  candidateText: string;
  deterministicScore: TranslationQualityScore;
  mergedScore: TranslationQualityScore;
  recommendation: ProfessionalQualityRecommendation;
  report: ProfessionalTranslationQualityReport;
  authority: typeof PROFESSIONAL_AI_AUTHORITY;
};

function mergeScores(
  deterministic: TranslationQualityScore,
  reviewerScores: Partial<Record<string, number>>,
  reviewerFindings: TranslationQualityFinding[]
): TranslationQualityScore {
  const dimensions = deterministic.dimensions.map((d) => {
    const override = reviewerScores[d.dimension];
    if (typeof override === "number") {
      return { ...d, score: clampScore100(override) };
    }
    return d;
  });
  return {
    overall: computeOverallQualityScore(dimensions),
    dimensions,
    findings: [...deterministic.findings, ...reviewerFindings],
  };
}

/**
 * Run two-pass pipeline in-memory. Never publishes/approves.
 */
export async function runTwoPassProfessionalWorkflow(input: {
  context: ProfessionalTranslationRequestContext;
  generator: ProfessionalTranslationGenerator;
  reviewer: ProfessionalTranslationReviewer;
}): Promise<TwoPassWorkflowResult> {
  const genRaw = await input.generator.generate({ context: input.context });
  const genParsed = parseProfessionalTranslationGeneratorOutput(genRaw);
  if (!genParsed.ok) {
    const findings: TranslationQualityFinding[] = [
      {
        code: "generator_invalid",
        severity: "blocking",
        dimension: "overall",
        message: `Generator output invalid: ${genParsed.error}`,
      },
    ];
    const deterministicScore = runDeterministicTranslationQa({
      sourceText: input.context.sourceText,
      targetText: "",
      sourceLocale: input.context.sourceLocale,
      targetLocale: input.context.targetLocale,
      glossaryTerms: input.context.glossaryTerms,
      styleGuide: input.context.styleGuide,
    });
    const mergedScore: TranslationQualityScore = {
      ...deterministicScore,
      findings: [...deterministicScore.findings, ...findings],
      overall: 0,
    };
    const report = buildProfessionalQualityReport({
      context: input.context,
      score: mergedScore,
      recommendation: "BLOCK",
    });
    return {
      candidateText: "",
      deterministicScore,
      mergedScore,
      recommendation: "BLOCK",
      report,
      authority: PROFESSIONAL_AI_AUTHORITY,
    };
  }

  const candidateText = genParsed.value.candidateText;
  const deterministicScore = runDeterministicTranslationQa({
    sourceText: input.context.sourceText,
    targetText: candidateText,
    sourceLocale: input.context.sourceLocale,
    targetLocale: input.context.targetLocale,
    glossaryTerms: input.context.glossaryTerms,
    styleGuide: input.context.styleGuide,
  });

  const revRaw = await input.reviewer.review({
    sourceText: input.context.sourceText,
    targetText: candidateText,
    sourceLocale: input.context.sourceLocale,
    targetLocale: input.context.targetLocale,
    context: input.context,
    deterministicFindings: deterministicScore.findings,
  });
  const revParsed = parseProfessionalTranslationReviewResult(revRaw);
  if (!revParsed.ok) {
    const findings: TranslationQualityFinding[] = [
      {
        code: "reviewer_invalid",
        severity: "blocking",
        dimension: "overall",
        message: `Reviewer output invalid: ${revParsed.error}`,
      },
    ];
    const mergedScore: TranslationQualityScore = {
      ...deterministicScore,
      findings: [...deterministicScore.findings, ...findings],
    };
    const gate = evaluateQualityGate({
      score: mergedScore,
      profile: input.context.qualityProfile,
    });
    const recommendation: ProfessionalQualityRecommendation = "BLOCK";
    const report = buildProfessionalQualityReport({
      context: input.context,
      score: mergedScore,
      recommendation,
      gateDecision: gate.decision,
    });
    return {
      candidateText,
      deterministicScore,
      mergedScore,
      recommendation,
      report,
      authority: PROFESSIONAL_AI_AUTHORITY,
    };
  }

  const mergedScore = mergeScores(
    deterministicScore,
    revParsed.value.dimensionScores,
    revParsed.value.findings
  );
  const gate = evaluateQualityGate({
    score: mergedScore,
    profile: input.context.qualityProfile,
  });
  const human = requiresHumanReview({
    sourceText: input.context.sourceText,
    targetText: candidateText,
    score: mergedScore,
    findings: gate.findings,
    profile: input.context.qualityProfile,
    contextPack: input.context.contextPack,
  });

  let recommendation: ProfessionalQualityRecommendation = "PASS";
  if (gate.decision === "QUALITY_BLOCKED") recommendation = "BLOCK";
  else if (gate.decision === "QUALITY_REVIEW_REQUIRED" || human.required) {
    recommendation = "HUMAN_REVIEW";
  }

  const report = buildProfessionalQualityReport({
    context: input.context,
    score: mergedScore,
    recommendation,
    gateDecision: gate.decision,
    humanReviewReasons: human.reasons,
  });

  return {
    candidateText,
    deterministicScore,
    mergedScore,
    recommendation,
    report,
    authority: PROFESSIONAL_AI_AUTHORITY,
  };
}
