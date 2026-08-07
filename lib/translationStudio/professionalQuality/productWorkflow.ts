/**
 * Complete product flow:
 * source → generate → deterministic QA → independent review → suggestion → human surface.
 * Never auto-approves or publishes. Never replaces current translation value text.
 */

import type {
  StudioLanguageCode,
  TranslationSuggestion,
  TranslationMemoryEntry,
} from "../types";
import type { TranslationStudioWorkflow } from "../workflow/workflowService";
import { buildProfessionalTranslationRequestContext } from "./contextBuilder";
import { seedUmtubaOfficialTerminologyCatalog } from "./terminologySeed";
import {
  PROFESSIONAL_GLOSSARY_CATALOG_VERSION,
  buildProfessionalReviewCacheKeyFromContext,
} from "./reviewCache";
import { runProfessionalGenerateAndReview } from "./twoPassOrchestrator";
import { runProfessionalTranslationReview } from "./reviewPipeline";
import { evaluateSuggestedRevision } from "./suggestedRevision";
import {
  buildProfessionalSuggestionQuality,
  PROFESSIONAL_QUALITY_SUGGESTION_TAG,
} from "./suggestionQualityTag";
import {
  selectProfessionalProviders,
  type ProfessionalProviderSelection,
} from "./providerSelection";
import {
  getCachedProfessionalReview,
  setCachedProfessionalReview,
} from "./reviewResultCache";
import {
  type ProfessionalReviewObservation,
} from "./observability";
import { PROFESSIONAL_AI_AUTHORITY } from "./aiContracts";
import { hasBlockingFindings } from "./types";
import type { ProfessionalTranslationQualityReport } from "./qualityReport";
import type { ProfessionalQualityRecommendation } from "./types";

export type ProfessionalProductActionKind =
  | "generate_and_review"
  | "review_existing";

export type ProfessionalProductFailureCode =
  | "provider_unavailable"
  | "timeout"
  | "invalid_response"
  | "qa_block"
  | "generation_unavailable"
  | "unknown_value"
  | "unknown_key";

export type ProfessionalGenerateAndReviewProductResult =
  | {
      ok: true;
      kind: "generate_and_review";
      suggestion: TranslationSuggestion;
      recommendation: ProfessionalQualityRecommendation;
      report: ProfessionalTranslationQualityReport;
      suggestedRevision: string | null;
      humanReviewRequired: boolean;
      observation: ProfessionalReviewObservation;
      providerMode: string;
      cacheHit: boolean;
      authority: typeof PROFESSIONAL_AI_AUTHORITY;
      /** Current value text unchanged — for smoke assertions. */
      valueTextUnchanged: true;
    }
  | {
      ok: false;
      kind: "generate_and_review";
      failureCode: ProfessionalProductFailureCode;
      message: string;
      observation?: ProfessionalReviewObservation;
      authority: typeof PROFESSIONAL_AI_AUTHORITY;
    };

export type ProfessionalReviewExistingProductResult =
  | {
      ok: true;
      kind: "review_existing";
      recommendation: ProfessionalQualityRecommendation;
      report: ProfessionalTranslationQualityReport;
      suggestedRevision: string | null;
      humanReviewRequired: boolean;
      observation: ProfessionalReviewObservation;
      cacheHit: boolean;
      authority: typeof PROFESSIONAL_AI_AUTHORITY;
      mutated: false;
    }
  | {
      ok: false;
      kind: "review_existing";
      failureCode: ProfessionalProductFailureCode;
      message: string;
      authority: typeof PROFESSIONAL_AI_AUTHORITY;
    };

function resolveDomainHint(
  namespaceName: string | null | undefined,
  sourceText: string
): string | null {
  const n = `${namespaceName ?? ""} ${sourceText}`.toLowerCase();
  if (
    n.includes("refund") ||
    n.includes("payment") ||
    n.includes("financial") ||
    n.includes("legal")
  ) {
    return "commerce";
  }
  if (n.includes("commerce") || n.includes("store") || n.includes("seller")) {
    return "commerce";
  }
  if (n.includes("learning") || n.includes("course") || n.includes("lesson")) {
    return "learning";
  }
  if (n.includes("marketing") || n.includes("promo")) {
    return "marketing";
  }
  if (n.includes("collab") || n.includes("workspace")) {
    return "collaboration";
  }
  if (n.includes("admin") || n.includes("translation")) {
    return "admin";
  }
  return null;
}

/**
 * Full generate → QA → review → pending suggestion (does not replace value text).
 */
export async function runProfessionalGenerateReviewAndSuggest(input: {
  workflow: TranslationStudioWorkflow;
  valueId: string;
  actorUserId: string;
  providers?: ProfessionalProviderSelection;
  useCache?: boolean;
}): Promise<ProfessionalGenerateAndReviewProductResult> {
  const snapshot = input.workflow.getSnapshot();
  const value = snapshot.values.find((v) => v.id === input.valueId);
  if (!value) {
    return {
      ok: false,
      kind: "generate_and_review",
      failureCode: "unknown_value",
      message: "Unknown translation value.",
      authority: PROFESSIONAL_AI_AUTHORITY,
    };
  }
  const key = snapshot.keys.find((k) => k.id === value.keyId);
  if (!key) {
    return {
      ok: false,
      kind: "generate_and_review",
      failureCode: "unknown_key",
      message: "Unknown translation key.",
      authority: PROFESSIONAL_AI_AUTHORITY,
    };
  }
  const ns = snapshot.namespaces.find((n) => n.id === key.namespaceId);
  const domainHint = resolveDomainHint(ns?.name ?? key.namespaceId, key.sourceText);
  const catalog = seedUmtubaOfficialTerminologyCatalog();
  const context = buildProfessionalTranslationRequestContext({
    keyStableId: key.id,
    namespaceId: key.namespaceId,
    namespaceName: ns?.name ?? null,
    sourceLocale: "en",
    targetLocale: value.language as StudioLanguageCode,
    sourceText: key.sourceText,
    currentTranslation: value.value,
    keyDescription: key.description ?? null,
    domainHint,
    terminologyCatalog: catalog,
    memoryEntries: snapshot.memory as TranslationMemoryEntry[],
    statusHint: value.status,
  });

  // Client cannot downgrade profile — profile comes from context pack resolution only.
  const providers =
    input.providers ??
    selectProfessionalProviders({
      locale: context.targetLocale,
      profileId: context.qualityProfile.id,
    });

  if (providers.mode === "unavailable") {
    return {
      ok: false,
      kind: "generate_and_review",
      failureCode: "provider_unavailable",
      message: "Professional generation unavailable.",
      authority: PROFESSIONAL_AI_AUTHORITY,
    };
  }

  const started = Date.now();
  const result = await runProfessionalGenerateAndReview({
    sourceText: key.sourceText,
    sourceLocale: "en",
    targetLocale: value.language as StudioLanguageCode,
    keyStableId: key.id,
    namespaceId: key.namespaceId,
    namespaceName: ns?.name ?? null,
    keyDescription: key.description ?? null,
    domainHint,
    terminologyCatalog: catalog,
    memoryEntries: snapshot.memory,
    generator: providers.generator,
    reviewer: providers.reviewer,
  });

  if (!result.candidateText || !result.report) {
    return {
      ok: false,
      kind: "generate_and_review",
      failureCode:
        result.failure?.code === "provider_timeout"
          ? "timeout"
          : result.failure?.code === "schema_mismatch" ||
              result.failure?.code === "invalid_json"
            ? "invalid_response"
            : "generation_unavailable",
      message:
        result.failure?.message ??
        "Professional generation unavailable — no suggestion created.",
      observation: result.observation,
      authority: PROFESSIONAL_AI_AUTHORITY,
    };
  }

  // Suggested revision: one max, already re-QA'd inside review pipeline.
  const suggestedRevision = result.suggestedRevision;

  const humanReviewRequired =
    result.recommendation !== "PASS" ||
    (result.report.humanReviewReasons?.length ?? 0) > 0 ||
    context.qualityProfile.forceHumanReview === true;

  const cacheKey = buildProfessionalReviewCacheKeyFromContext({
    context,
    targetText: result.candidateText,
  });

  const observation: ProfessionalReviewObservation = {
    ...result.observation,
    role: "two_pass",
    durationMs: Date.now() - started,
    cacheKeyFingerprint: cacheKey.slice(0, 16),
  };

  const quality = buildProfessionalSuggestionQuality({
    base: {
      confidence: 0.5,
      reusedFromMemory: context.memoryMatches[0]?.matchKind === "exact",
      terminologyHits: context.glossaryTerms.map((t) => t.sourceTerm),
      terminologyConflicts: [],
      providerVia: providers.mode === "live_ai_service" ? "ai_service" : "stub",
      notes: `${PROFESSIONAL_QUALITY_SUGGESTION_TAG}; profile=${context.qualityProfile.id}; pack=${context.contextPack.id}`,
      ai: {
        providerId: providers.providerLabel,
        modelId: providers.modelLabel,
        timestamp: new Date().toISOString(),
        latencyMs: observation.durationMs,
        confidence: null,
        rawResponseRef: `studio://professional/${value.id}/${cacheKey.slice(0, 12)}`,
      },
    },
    report: result.report,
    observation,
  });

  // Enrich metadata envelope with generation details (safe).
  quality.professionalQuality = {
    ...quality.professionalQuality!,
    tag: PROFESSIONAL_QUALITY_SUGGESTION_TAG,
    providerId: providers.providerLabel,
    modelId: providers.modelLabel,
    findingCounts: observation.findingCounts,
    report: {
      ...result.report,
      // attach safe extras via existing report fields only
    },
  };
  // Store extended safe fields on quality notes + professionalQuality via typed extension
  const extendedQuality = {
    ...quality,
    professionalQuality: {
      ...quality.professionalQuality!,
      qualityProfileId: context.qualityProfile.id,
      contextPackId: context.contextPack.id,
      glossaryVersion: PROFESSIONAL_GLOSSARY_CATALOG_VERSION,
      cacheKey: cacheKey.slice(0, 32),
      generatedAt: new Date().toISOString(),
      humanReviewRequired,
      suggestedRevision,
      providerMode: providers.mode,
    },
  };

  const priorValueText = value.value;
  const suggestion = input.workflow.createProfessionalCandidateSuggestion({
    valueId: value.id,
    actor: { userId: input.actorUserId },
    candidateText: result.candidateText,
    quality: extendedQuality as typeof quality,
  });

  const after = input.workflow.getValue(value.id);
  if (after && after.value !== priorValueText) {
    // Hard invariant — should not happen after workflow fix.
    throw new Error("Professional suggestion must not replace current translation.");
  }

  return {
    ok: true,
    kind: "generate_and_review",
    suggestion,
    recommendation: result.recommendation,
    report: result.report,
    suggestedRevision,
    humanReviewRequired,
    observation,
    providerMode: providers.mode,
    cacheHit: false,
    authority: PROFESSIONAL_AI_AUTHORITY,
    valueTextUnchanged: true,
  };
}

/**
 * Read-only professional review of current draft/value.
 */
export async function runProfessionalReviewExistingDraft(input: {
  workflow: TranslationStudioWorkflow;
  valueId: string;
  providers?: ProfessionalProviderSelection;
  useCache?: boolean;
}): Promise<ProfessionalReviewExistingProductResult> {
  const snapshot = input.workflow.getSnapshot();
  const value = snapshot.values.find((v) => v.id === input.valueId);
  if (!value) {
    return {
      ok: false,
      kind: "review_existing",
      failureCode: "unknown_value",
      message: "Unknown translation value.",
      authority: PROFESSIONAL_AI_AUTHORITY,
    };
  }
  const key = snapshot.keys.find((k) => k.id === value.keyId);
  if (!key) {
    return {
      ok: false,
      kind: "review_existing",
      failureCode: "unknown_key",
      message: "Unknown translation key.",
      authority: PROFESSIONAL_AI_AUTHORITY,
    };
  }
  const ns = snapshot.namespaces.find((n) => n.id === key.namespaceId);
  const domainHint = resolveDomainHint(ns?.name ?? key.namespaceId, key.sourceText);
  const catalog = seedUmtubaOfficialTerminologyCatalog();
  const context = buildProfessionalTranslationRequestContext({
    keyStableId: key.id,
    namespaceId: key.namespaceId,
    namespaceName: ns?.name ?? null,
    sourceLocale: "en",
    targetLocale: value.language as StudioLanguageCode,
    sourceText: key.sourceText,
    currentTranslation: value.value,
    keyDescription: key.description ?? null,
    domainHint,
    terminologyCatalog: catalog,
    memoryEntries: snapshot.memory,
    statusHint: value.status,
  });

  const providers =
    input.providers ??
    selectProfessionalProviders({
      locale: context.targetLocale,
      profileId: context.qualityProfile.id,
    });

  const cacheKey = buildProfessionalReviewCacheKeyFromContext({
    context,
    targetText: value.value ?? "",
  });

  if (input.useCache !== false) {
    const cached = getCachedProfessionalReview(cacheKey);
    if (cached.hit && cached.result) {
      return {
        ok: true,
        kind: "review_existing",
        recommendation: cached.result.recommendation,
        report: cached.result.report,
        suggestedRevision: cached.result.suggestedRevision,
        humanReviewRequired:
          cached.result.recommendation !== "PASS" ||
          (cached.result.report.humanReviewReasons?.length ?? 0) > 0,
        observation: {
          ...cached.result.observation,
          cacheKeyFingerprint: cacheKey.slice(0, 16),
        },
        cacheHit: true,
        authority: PROFESSIONAL_AI_AUTHORITY,
        mutated: false,
      };
    }
  }

  const review = await runProfessionalTranslationReview({
    sourceText: key.sourceText,
    targetText: value.value ?? "",
    sourceLocale: "en",
    targetLocale: value.language as StudioLanguageCode,
    keyStableId: key.id,
    namespaceId: key.namespaceId,
    namespaceName: ns?.name ?? null,
    keyDescription: key.description ?? null,
    domainHint,
    terminologyCatalog: catalog,
    memoryEntries: snapshot.memory,
    reviewer: providers.reviewer,
  });

  if (input.useCache !== false) {
    setCachedProfessionalReview(cacheKey, review);
  }

  // Ensure revision was re-QA'd (already in review pipeline).
  const revisionCheck = evaluateSuggestedRevision({
    context,
    suggestedRevision: review.suggestedRevision,
  });

  return {
    ok: true,
    kind: "review_existing",
    recommendation: review.recommendation,
    report: review.report,
    suggestedRevision: revisionCheck.accepted
      ? revisionCheck.suggestedRevision
      : null,
    humanReviewRequired:
      review.recommendation !== "PASS" ||
      (review.report.humanReviewReasons?.length ?? 0) > 0 ||
      hasBlockingFindings(review.deterministicScore.findings),
    observation: review.observation,
    cacheHit: false,
    authority: PROFESSIONAL_AI_AUTHORITY,
    mutated: false,
  };
}

export function mapFailureToUxCode(
  code: ProfessionalProductFailureCode
): string {
  switch (code) {
    case "provider_unavailable":
    case "generation_unavailable":
      return "professional_provider_unavailable";
    case "timeout":
      return "professional_timeout";
    case "invalid_response":
      return "professional_invalid_response";
    case "qa_block":
      return "professional_qa_block";
    default:
      return "professional_failed";
  }
}
