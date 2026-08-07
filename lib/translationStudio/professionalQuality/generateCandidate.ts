/**
 * Professional translation GENERATOR pipeline helper (provider-neutral).
 * Candidate only — never approved/published; caller may create a Studio suggestion.
 */

import type { StudioLanguageCode, TranslationMemoryEntry } from "../types";
import { buildProfessionalTranslationRequestContext } from "./contextBuilder";
import { seedUmtubaOfficialTerminologyCatalog } from "./terminologySeed";
import type { TerminologyPolicyCatalog } from "./terminologyPolicy";
import {
  PROFESSIONAL_AI_AUTHORITY,
  type ProfessionalTranslationGenerator,
  type ProfessionalTranslationGeneratorOutput,
} from "./aiContracts";
import { parseStrictProfessionalGeneratorOutput } from "./reviewSchema";
import { runDeterministicTranslationQa } from "./deterministicQa";
import {
  PROFESSIONAL_REVIEW_UNAVAILABLE,
  type ProfessionalReviewFailure,
} from "./reviewFailures";
import { mapTransportErrorToFailure } from "./transportAdapters";
import {
  buildProfessionalReviewObservation,
  countFindingsBySeverity,
  type ProfessionalReviewObservation,
} from "./observability";
import type { TranslationQualityScore } from "./types";

export type GenerateProfessionalTranslationCandidateInput = {
  sourceText: string;
  sourceLocale?: StudioLanguageCode;
  targetLocale: StudioLanguageCode;
  keyStableId?: string | null;
  namespaceId?: string | null;
  namespaceName?: string | null;
  keyDescription?: string | null;
  domainHint?: string | null;
  keyContextPackId?: string | null;
  terminologyCatalog?: TerminologyPolicyCatalog;
  memoryEntries?: TranslationMemoryEntry[];
  generator: ProfessionalTranslationGenerator;
};

export type GenerateProfessionalTranslationCandidateResult =
  | {
      ok: true;
      candidate: ProfessionalTranslationGeneratorOutput;
      preflightScore: TranslationQualityScore;
      observation: ProfessionalReviewObservation;
      authority: typeof PROFESSIONAL_AI_AUTHORITY;
    }
  | {
      ok: false;
      status: typeof PROFESSIONAL_REVIEW_UNAVAILABLE;
      failure: ProfessionalReviewFailure;
      observation: ProfessionalReviewObservation;
      authority: typeof PROFESSIONAL_AI_AUTHORITY;
    };

export async function generateProfessionalTranslationCandidate(
  input: GenerateProfessionalTranslationCandidateInput
): Promise<GenerateProfessionalTranslationCandidateResult> {
  const catalog =
    input.terminologyCatalog ?? seedUmtubaOfficialTerminologyCatalog();
  const context = buildProfessionalTranslationRequestContext({
    keyStableId: input.keyStableId,
    namespaceId: input.namespaceId,
    namespaceName: input.namespaceName,
    sourceLocale: input.sourceLocale,
    targetLocale: input.targetLocale,
    sourceText: input.sourceText,
    keyDescription: input.keyDescription,
    domainHint: input.domainHint,
    keyContextPackId: input.keyContextPackId,
    terminologyCatalog: catalog,
    memoryEntries: input.memoryEntries,
  });

  const started = Date.now();
  try {
    const raw = await input.generator.generate({ context });
    const parsed = parseStrictProfessionalGeneratorOutput(raw);
    if (!parsed.ok) {
      const failure = mapTransportErrorToFailure(
        new Error(`schema_mismatch: ${parsed.error}`)
      );
      return {
        ok: false,
        status: PROFESSIONAL_REVIEW_UNAVAILABLE,
        failure: { ...failure, code: "schema_mismatch" },
        observation: buildProfessionalReviewObservation({
          role: "generator",
          providerId: null,
          modelId: null,
          profileId: context.qualityProfile.id,
          locale: context.targetLocale,
          durationMs: Date.now() - started,
          success: false,
          failureCode: "schema_mismatch",
          overallScore: null,
          findingCounts: countFindingsBySeverity([]),
          recommendation: null,
        }),
        authority: PROFESSIONAL_AI_AUTHORITY,
      };
    }

    const preflightScore = runDeterministicTranslationQa({
      sourceText: context.sourceText,
      targetText: parsed.value.candidateText,
      sourceLocale: context.sourceLocale,
      targetLocale: context.targetLocale,
      glossaryTerms: context.glossaryTerms,
      styleGuide: context.styleGuide,
    });

    return {
      ok: true,
      candidate: parsed.value,
      preflightScore,
      observation: buildProfessionalReviewObservation({
        role: "generator",
        providerId: parsed.value.provider.providerId,
        modelId: parsed.value.provider.modelId,
        profileId: context.qualityProfile.id,
        locale: context.targetLocale,
        durationMs: Date.now() - started,
        success: true,
        overallScore: preflightScore.overall,
        findingCounts: countFindingsBySeverity(preflightScore.findings),
        recommendation: null,
      }),
      authority: PROFESSIONAL_AI_AUTHORITY,
    };
  } catch (err) {
    const failure = mapTransportErrorToFailure(err);
    return {
      ok: false,
      status: PROFESSIONAL_REVIEW_UNAVAILABLE,
      failure,
      observation: buildProfessionalReviewObservation({
        role: "generator",
        providerId: null,
        modelId: null,
        profileId: context.qualityProfile.id,
        locale: context.targetLocale,
        durationMs: Date.now() - started,
        success: false,
        failureCode: failure.code,
        overallScore: null,
        findingCounts: countFindingsBySeverity([]),
        recommendation: null,
      }),
      authority: PROFESSIONAL_AI_AUTHORITY,
    };
  }
}
