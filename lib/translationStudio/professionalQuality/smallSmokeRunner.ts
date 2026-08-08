/**
 * Small-smoke helper — offline proof + live paid execution under explicit GO
 * and LIVE_BENCHMARK_READY. Never mutates Studio persistence.
 */

import { PROFESSIONAL_AI_AUTHORITY } from "./aiContracts";
import {
  assessLiveProfessionalProviderReadiness,
  type LiveProfessionalProviderReadinessReport,
} from "./liveProviderReadiness";
import {
  loadProfessionalLiveModelPolicy,
  type ProfessionalLiveModelPolicy,
  type ProfessionalLiveProviderId,
} from "./liveProviderConfig";
import {
  buildProfessionalBenchmarkMatrix,
  defaultOfflineBenchmarkMatrix,
  type BenchmarkMatrixSlot,
} from "./benchmarkMatrix";
import {
  buildSmallSmokePackage,
  calculateSmallSmokeCallBudget,
  validateSmallSmokePrivacy,
  type SmallSmokeCasePolicy,
  type SmallSmokePackage,
} from "./smallSmokePackage";
import {
  RECOMMENDED_FIRST_SMOKE_CONFIGURATION_PATTERN,
  SMALL_SMOKE_CONFIG_VARIABLE_NAMES,
  SMALL_SMOKE_PROVIDER_ELIGIBILITY,
} from "./smallSmokeEligibility";
import { LIVE_FAILURE_RETRY_POLICY } from "./acceptanceBars";
import { runProfessionalGenerateAndReview } from "./twoPassOrchestrator";
import { createGlossaryAwareProfessionalGenerator } from "./glossaryAwareGenerator";
import { createHeuristicProfessionalReviewer } from "./heuristicReviewer";
import {
  createTransportBackedProfessionalGenerator,
  createTransportBackedProfessionalReviewer,
} from "./transportAdapters";
import {
  createAiServiceProfessionalTransport,
  type ProfessionalAiTransport,
} from "./providerTransport";
import { seedUmtubaOfficialTerminologyCatalog } from "./terminologySeed";
import {
  createBlindHumanReviewArtifact,
  toBlindHumanReviewSurface,
  type BlindHumanReviewArtifact,
} from "./humanBlindReview";
import type { StudioLanguageCode } from "../types";
import { loadAiPlatformConfig } from "../../ai/config";
import {
  classifySmallSmokeReviewerFailure,
  type SmallSmokeReviewerFailureDiagnostics,
} from "./smallSmokeReviewDiagnostics";

/** Stable non-secret operator id for CLI rate-limit / gateway identity only. */
export const SMALL_SMOKE_OPERATOR_USER_ID =
  "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

/**
 * Authoritative live professional CLI operator identity.
 * Shared by small-smoke and matrix so gateway context stays identical.
 */
export function resolveLiveProfessionalOperatorUserId(
  explicit?: string | null
): string {
  const fromArg = explicit?.trim();
  if (fromArg) return fromArg;
  const fromMatrixEnv =
    process.env.UMTUBA_PROFESSIONAL_MATRIX_OPERATOR_USER_ID?.trim();
  if (fromMatrixEnv) return fromMatrixEnv;
  const fromSmokeEnv =
    process.env.UMTUBA_PROFESSIONAL_SMOKE_OPERATOR_USER_ID?.trim();
  if (fromSmokeEnv) return fromSmokeEnv;
  return SMALL_SMOKE_OPERATOR_USER_ID;
}

export type SmallSmokeVerdict = "SMOKE_PASS" | "SMOKE_PARTIAL" | "SMOKE_FAIL";

export type SmallSmokeResolvedRoute = {
  generatorProviderId: ProfessionalLiveProviderId;
  generatorModelId: string;
  reviewerProviderId: ProfessionalLiveProviderId;
  reviewerModelId: string;
  /** How model ids were chosen (never secret values). */
  modelResolution: "policy_explicit" | "platform_default" | "mixed";
};

export type SmallSmokeCaseArtifact = {
  smokeIndex: number;
  caseId: string;
  locale: string;
  sourceText: string;
  candidateText: string;
  recommendation: string;
  overallScore: number | null;
  humanReviewRequired: boolean;
  humanReviewEnforced: boolean;
  sensitiveReviewerUsed: boolean;
  usedFallbackNormalReviewer: boolean;
  structuredGenerateValid: boolean;
  structuredReviewValid: boolean;
  placeholderIntact: boolean | null;
  majorFindings: string[];
  blindHumanReview: BlindHumanReviewArtifact;
  blindSurface: Omit<BlindHumanReviewArtifact, "_reveal">;
  disqualifiers: string[];
  observedProvider?: { providerId: string; modelId: string };
  /** Present only when structured review failed — categorical, no secrets. */
  reviewerFailureDiagnostics?: SmallSmokeReviewerFailureDiagnostics;
};

export type SmallSmokeRunReport = {
  schemaVersion: 1;
  phase: "small";
  packageId: string;
  mode: "offline_scripted" | "live_refused" | "live_ai_service";
  readiness: {
    overall: string;
    generator: string;
    reviewer: string;
    sensitiveReviewer: string;
    activated: false;
    secretsExposed: false;
  };
  callBudget: ReturnType<typeof calculateSmallSmokeCallBudget>;
  privacy: { status: "PASS" | "FAIL"; errors: string[] };
  matrixSlot: { id: string; label: string; independent: boolean };
  cases: SmallSmokeCaseArtifact[];
  verdict: SmallSmokeVerdict;
  successCriteria: Record<string, boolean>;
  mutatedStudio: false;
  secretsPresent: false;
  providerCallsAttempted: number;
  refusalReason?: string;
  resolvedRoute?: SmallSmokeResolvedRoute;
  observedProviderModels?: Array<{ providerId: string; modelId: string }>;
  configVariableNames: readonly string[];
  recommendedFirstPattern: typeof RECOMMENDED_FIRST_SMOKE_CONFIGURATION_PATTERN;
  providerEligibility: typeof SMALL_SMOKE_PROVIDER_ELIGIBILITY;
};

export type SmallSmokePrepSnapshot = {
  schemaVersion: 1;
  readiness: LiveProfessionalProviderReadinessReport;
  package: SmallSmokePackage;
  callBudget: ReturnType<typeof calculateSmallSmokeCallBudget>;
  privacy: { status: "PASS" | "FAIL"; errors: string[] };
  matrixReuse: BenchmarkMatrixSlot[];
  liveExecutionAllowed: boolean;
  requiresExplicitGo: true;
  resolvedRoute: SmallSmokeResolvedRoute;
  configVariableNames: readonly string[];
  recommendedFirstPattern: typeof RECOMMENDED_FIRST_SMOKE_CONFIGURATION_PATTERN;
  providerEligibility: typeof SMALL_SMOKE_PROVIDER_ELIGIBILITY;
  sensitiveReviewerPolicy: {
    preferredWhenConfigured: true;
    ifUnset:
      "proceed_with_normal_reviewer_plus_mandatory_human_review_flag";
    neverWeakenHumanRequirement: true;
  };
};

function platformDefaultModelFor(
  providerId: ProfessionalLiveProviderId
): string {
  const config = loadAiPlatformConfig();
  if (providerId === "openai") return config.openaiDefaultModel;
  if (providerId === "gemini") return config.geminiDefaultModel;
  if (providerId === "anthropic") return config.anthropicDefaultModel;
  if (providerId === "local") return config.localDefaultModel ?? "unset";
  if (providerId === "heuristic") return "heuristic-v1";
  return "unset";
}

/**
 * Resolve intended provider/model labels from professional policy + platform
 * defaults. Never reads or returns secret values.
 */
export function resolveSmallSmokeProviderModels(
  policy?: ProfessionalLiveModelPolicy
): SmallSmokeResolvedRoute {
  const modelPolicy = policy ?? loadProfessionalLiveModelPolicy();
  const genProvider = modelPolicy.generator.providerId;
  const revProvider = modelPolicy.reviewer.providerId;
  const genExplicit = Boolean(modelPolicy.generator.modelId);
  const revExplicit = Boolean(modelPolicy.reviewer.modelId);
  const generatorModelId =
    modelPolicy.generator.modelId ||
    (genProvider === "unset" ? "unset" : platformDefaultModelFor(genProvider));
  const reviewerModelId =
    modelPolicy.reviewer.modelId ||
    (revProvider === "unset" ? "unset" : platformDefaultModelFor(revProvider));
  const modelResolution =
    genExplicit && revExplicit
      ? "policy_explicit"
      : !genExplicit && !revExplicit
        ? "platform_default"
        : "mixed";
  return {
    generatorProviderId: genProvider,
    generatorModelId,
    reviewerProviderId: revProvider,
    reviewerModelId,
    modelResolution,
  };
}

export function prepareSmallSmokeExecution(
  policy?: ProfessionalLiveModelPolicy
): SmallSmokePrepSnapshot {
  const readiness = assessLiveProfessionalProviderReadiness(policy);
  const modelPolicy = policy ?? loadProfessionalLiveModelPolicy();
  const pkg = buildSmallSmokePackage();
  const callBudget = calculateSmallSmokeCallBudget({
    maxRetries: Math.max(
      modelPolicy.timeouts.generationMaxRetries,
      modelPolicy.timeouts.reviewMaxRetries,
      LIVE_FAILURE_RETRY_POLICY.maxRetries
    ),
  });
  const privacy = validateSmallSmokePrivacy(pkg);
  const resolvedRoute = resolveSmallSmokeProviderModels(modelPolicy);
  const matrixReuse = buildProfessionalBenchmarkMatrix({
    candidates: [
      {
        providerId:
          resolvedRoute.generatorProviderId === "unset"
            ? "heuristic"
            : resolvedRoute.generatorProviderId,
        modelId: resolvedRoute.generatorModelId,
        role: "generator",
      },
      {
        providerId:
          resolvedRoute.reviewerProviderId === "unset"
            ? "heuristic"
            : resolvedRoute.reviewerProviderId,
        modelId: resolvedRoute.reviewerModelId,
        role: "reviewer",
      },
    ],
  });

  return {
    schemaVersion: 1,
    readiness,
    package: pkg,
    callBudget,
    privacy,
    matrixReuse,
    liveExecutionAllowed: readiness.overall === "LIVE_BENCHMARK_READY",
    requiresExplicitGo: true,
    resolvedRoute,
    configVariableNames: SMALL_SMOKE_CONFIG_VARIABLE_NAMES,
    recommendedFirstPattern: RECOMMENDED_FIRST_SMOKE_CONFIGURATION_PATTERN,
    providerEligibility: SMALL_SMOKE_PROVIDER_ELIGIBILITY,
    sensitiveReviewerPolicy: {
      preferredWhenConfigured: true,
      ifUnset: "proceed_with_normal_reviewer_plus_mandatory_human_review_flag",
      neverWeakenHumanRequirement: true,
    },
  };
}

function placeholderIntact(
  policy: SmallSmokeCasePolicy,
  candidate: string
): boolean | null {
  if (policy.placeholders.length === 0) return null;
  return policy.placeholders.every((ph) => candidate.includes(ph));
}

function evaluateSuccessCriteria(input: {
  cases: SmallSmokeCaseArtifact[];
  privacyOk: boolean;
  providerCalls: number;
  callCeiling: number;
}): { verdict: SmallSmokeVerdict; criteria: Record<string, boolean> } {
  const all = input.cases;
  const criteria = {
    fiveCasesExecuted: all.length === 5,
    allGenerateStructurallyValid: all.every((c) => c.structuredGenerateValid),
    allReviewStructurallyValid: all.every((c) => c.structuredReviewValid),
    zeroPlaceholderCorruption: all.every(
      (c) => c.placeholderIntact !== false
    ),
    zeroAuthorityViolations: all.every(
      (c) => !c.disqualifiers.includes("authority_violation")
    ),
    refundHumanReviewGated: all.some(
      (c) =>
        c.caseId === "commerce_refund" &&
        c.humanReviewEnforced &&
        c.humanReviewRequired
    ),
    structuredFailureRateZero:
      all.length === 5 &&
      all.every((c) => c.structuredGenerateValid && c.structuredReviewValid),
    noStudioMutation: true,
    noSecretLeakage: true,
    privacyPass: input.privacyOk,
    withinCallBudget: input.providerCalls <= input.callCeiling,
    arabicCasesPresent: all.filter((c) => c.locale === "ar").length === 4,
    multilingualPlaceholderPresent: all.some(
      (c) => c.caseId === "ph_hello_name" && c.locale === "fr"
    ),
  };

  const hardFail =
    !criteria.fiveCasesExecuted ||
    !criteria.noStudioMutation ||
    !criteria.privacyPass ||
    !criteria.refundHumanReviewGated ||
    !criteria.zeroPlaceholderCorruption ||
    !criteria.zeroAuthorityViolations ||
    !criteria.withinCallBudget;

  const allPass = Object.values(criteria).every(Boolean);

  if (hardFail || !criteria.structuredFailureRateZero) {
    return { verdict: "SMOKE_FAIL", criteria };
  }
  if (allPass) return { verdict: "SMOKE_PASS", criteria };
  return { verdict: "SMOKE_PARTIAL", criteria };
}

/**
 * Refuse live small smoke unless readiness is LIVE_BENCHMARK_READY and
 * explicit GO is provided.
 */
export function refuseLiveSmallSmokeIfNotReady(input: {
  readiness: LiveProfessionalProviderReadinessReport;
  explicitGo: boolean;
  maxCalls: number;
  callCeiling: number;
  privacyOk?: boolean;
}): { ok: true } | { ok: false; reason: string } {
  if (!input.explicitGo) {
    return { ok: false, reason: "explicit_go_required" };
  }
  if (input.privacyOk === false) {
    return { ok: false, reason: "privacy_fail" };
  }
  if (input.readiness.overall === "LIVE_PROVIDER_CONFIG_INVALID") {
    return { ok: false, reason: "config_invalid" };
  }
  if (input.readiness.overall !== "LIVE_BENCHMARK_READY") {
    return { ok: false, reason: "provider_not_configured" };
  }
  if (input.maxCalls > input.callCeiling) {
    return { ok: false, reason: "call_budget_exceeded" };
  }
  return { ok: true };
}

async function executeSmallSmokeCases(input: {
  prep: SmallSmokePrepSnapshot;
  mode: "offline_scripted" | "live_ai_service";
  slot: BenchmarkMatrixSlot;
  generator: ReturnType<typeof createTransportBackedProfessionalGenerator> | ReturnType<typeof createGlossaryAwareProfessionalGenerator>;
  normalReviewer: ReturnType<typeof createTransportBackedProfessionalReviewer> | ReturnType<typeof createHeuristicProfessionalReviewer>;
  sensitiveReviewer: ReturnType<typeof createHeuristicProfessionalReviewer>;
  sensitiveConfigured: boolean;
  callCeiling: number;
  resolvedRoute?: SmallSmokeResolvedRoute;
}): Promise<SmallSmokeRunReport> {
  const catalog = seedUmtubaOfficialTerminologyCatalog();
  const artifacts: SmallSmokeCaseArtifact[] = [];
  let providerCalls = 0;
  const observedProviderModels: Array<{ providerId: string; modelId: string }> =
    [];

  for (const policy of input.prep.package.cases) {
    if (providerCalls + 2 > input.callCeiling) {
      break;
    }

    const useSensitive =
      policy.sensitiveReviewerPreferred && input.sensitiveConfigured;
    const reviewer = useSensitive ? input.sensitiveReviewer : input.normalReviewer;
    const usedFallback =
      policy.sensitiveReviewerPreferred && !input.sensitiveConfigured;

    providerCalls += 2;
    let structuredGenerateValid = true;
    let structuredReviewValid = true;
    let candidateText = "";
    let recommendation = "HUMAN_REVIEW";
    let overallScore: number | null = null;
    let majorFindings: string[] = [];
    const disqualifiers: string[] = [];
    let observedProvider: { providerId: string; modelId: string } | undefined;
    let reviewerFailureDiagnostics:
      | SmallSmokeReviewerFailureDiagnostics
      | undefined;

    try {
      const out = await runProfessionalGenerateAndReview({
        sourceText: policy.sourceText,
        targetLocale: policy.targetLocale as StudioLanguageCode,
        terminologyCatalog: catalog,
        domainHint:
          policy.namespaceDomain === "commerce"
            ? "commerce"
            : policy.namespaceDomain === "collaboration"
              ? "collaboration"
              : null,
        generator: input.generator,
        reviewer,
      });
      candidateText = out.candidateText;
      recommendation = out.recommendation;
      overallScore = out.report?.overallScore ?? null;
      // Keep findings internal only — CLI sanitizer does not emit them.
      majorFindings = (out.report?.reviewerFindings ?? [])
        .slice(0, 8)
        .map((f) => f.code || f.dimension || "finding");
      if (!out.candidateText.trim()) {
        structuredGenerateValid = false;
        disqualifiers.push("empty_candidate");
      }
      if (!out.reviewerResultAvailable) {
        structuredReviewValid = false;
        disqualifiers.push("reviewer_unavailable");
        const obsParts = (out.observation.providerId ?? "").split("+");
        const modelParts = (out.observation.modelId ?? "").split("+");
        reviewerFailureDiagnostics = classifySmallSmokeReviewerFailure({
          failure: out.failure ?? null,
          providerId:
            obsParts[1] ||
            obsParts[0] ||
            input.resolvedRoute?.reviewerProviderId ||
            input.slot.reviewer.providerId,
          modelId:
            modelParts[1] ||
            modelParts[0] ||
            input.resolvedRoute?.reviewerModelId ||
            input.slot.reviewer.modelId,
          reviewerPath: useSensitive ? "heuristic_sensitive" : "live_transport",
        });
      }
      if (out.observation.providerId && out.observation.modelId) {
        observedProvider = {
          providerId: out.observation.providerId.split("+")[0] || "unknown",
          modelId: out.observation.modelId.split("+")[0] || "unknown",
        };
        observedProviderModels.push(observedProvider);
      }
    } catch {
      structuredGenerateValid = false;
      structuredReviewValid = false;
      disqualifiers.push("transport_or_parse_failure");
      reviewerFailureDiagnostics = classifySmallSmokeReviewerFailure({
        failure: {
          code: "transport_error",
          message: "transport_or_parse_failure",
        },
        providerId: input.slot.reviewer.providerId,
        modelId: input.slot.reviewer.modelId,
        reviewerPath: useSensitive ? "heuristic_sensitive" : "live_transport",
      });
    }

    // Policy: Refund always human-gated regardless of AI PASS.
    let humanReviewEnforced = policy.humanReviewRequired;
    if (policy.humanReviewRequired) {
      recommendation = "HUMAN_REVIEW";
      humanReviewEnforced = true;
    }

    if (
      PROFESSIONAL_AI_AUTHORITY.generatorCanApprove ||
      PROFESSIONAL_AI_AUTHORITY.reviewerCanPublish
    ) {
      disqualifiers.push("authority_violation");
    }

    const intact = placeholderIntact(policy, candidateText);
    if (intact === false) {
      disqualifiers.push("placeholder_corruption");
    }

    const blind = createBlindHumanReviewArtifact({
      caseId: policy.caseId,
      locale: policy.targetLocale,
      sourceText: policy.sourceText,
      context: `${policy.namespaceDomain}/${policy.profileId}`,
      glossaryExpectations: policy.glossaryEntries,
      candidateText,
      automatedRecommendation: recommendation,
      automatedOverallScore: overallScore ?? 0,
      majorFindings,
      matrixSlotId: input.slot.id,
      generatorLabel: `${input.slot.generator.providerId}/${input.slot.generator.modelId}`,
      reviewerLabel: useSensitive
        ? "sensitive-reviewer"
        : `${input.slot.reviewer.providerId}/${input.slot.reviewer.modelId}`,
      blind: true,
    });

    artifacts.push({
      smokeIndex: policy.smokeIndex,
      caseId: policy.caseId,
      locale: policy.targetLocale,
      sourceText: policy.sourceText,
      candidateText,
      recommendation,
      overallScore,
      humanReviewRequired: policy.humanReviewRequired,
      humanReviewEnforced,
      sensitiveReviewerUsed: useSensitive,
      usedFallbackNormalReviewer: usedFallback,
      structuredGenerateValid,
      structuredReviewValid,
      placeholderIntact: intact,
      majorFindings,
      blindHumanReview: blind,
      blindSurface: toBlindHumanReviewSurface(blind),
      disqualifiers,
      observedProvider,
      reviewerFailureDiagnostics,
    });
  }

  const { verdict, criteria } = evaluateSuccessCriteria({
    cases: artifacts,
    privacyOk: input.prep.privacy.status === "PASS",
    providerCalls,
    callCeiling: input.callCeiling,
  });

  return {
    schemaVersion: 1,
    phase: "small",
    packageId: input.prep.package.packageId,
    mode: input.mode,
    readiness: {
      overall: input.prep.readiness.overall,
      generator: input.prep.readiness.generator.state,
      reviewer: input.prep.readiness.reviewer.state,
      sensitiveReviewer: input.prep.readiness.sensitiveReviewer.state,
      activated: false,
      secretsExposed: false,
    },
    callBudget: input.prep.callBudget,
    privacy: input.prep.privacy,
    matrixSlot: {
      id: input.slot.id,
      label: input.slot.label,
      independent: input.slot.independent,
    },
    cases: artifacts,
    verdict,
    successCriteria: criteria,
    mutatedStudio: false,
    secretsPresent: false,
    providerCallsAttempted: providerCalls,
    resolvedRoute: input.resolvedRoute ?? input.prep.resolvedRoute,
    observedProviderModels:
      observedProviderModels.length > 0 ? observedProviderModels : undefined,
    configVariableNames: SMALL_SMOKE_CONFIG_VARIABLE_NAMES,
    recommendedFirstPattern: RECOMMENDED_FIRST_SMOKE_CONFIGURATION_PATTERN,
    providerEligibility: SMALL_SMOKE_PROVIDER_ELIGIBILITY,
  };
}

/**
 * Offline / scripted five-case smoke through live-shaped path.
 * Uses heuristic or injectable transport — never Studio persistence.
 */
export async function runSmallSmokeOffline(input?: {
  transport?: ProfessionalAiTransport;
  matrixSlot?: BenchmarkMatrixSlot;
  /** Simulate sensitive reviewer availability. */
  sensitiveReviewerConfigured?: boolean;
}): Promise<SmallSmokeRunReport> {
  const prep = prepareSmallSmokeExecution();
  const slot = input?.matrixSlot ?? defaultOfflineBenchmarkMatrix()[0]!;
  const sensitiveConfigured = Boolean(input?.sensitiveReviewerConfigured);

  const generator = input?.transport
    ? createTransportBackedProfessionalGenerator(input.transport)
    : createGlossaryAwareProfessionalGenerator();
  const normalReviewer = input?.transport
    ? createTransportBackedProfessionalReviewer(input.transport)
    : createHeuristicProfessionalReviewer();
  const sensitiveReviewer = createHeuristicProfessionalReviewer({
    providerId: "heuristic",
    modelId: "heuristic-sensitive-reviewer-v1",
  });

  return executeSmallSmokeCases({
    prep,
    mode: "offline_scripted",
    slot,
    generator,
    normalReviewer,
    sensitiveReviewer,
    sensitiveConfigured,
    callCeiling: prep.callBudget.totalCallCeiling,
  });
}

/**
 * Build live AI-service transport from professional policy + aiService gateway.
 * Never prints secrets. Injectable runner used by tests/CLI.
 * Shared by small-smoke and matrix live cells (same operator/gateway context).
 */
export async function createDefaultLiveProfessionalSmokeTransport(input?: {
  resolvedRoute?: SmallSmokeResolvedRoute;
  runCapability?: Parameters<typeof createAiServiceProfessionalTransport>[0]["runCapability"];
  operatorUserId?: string;
}): Promise<ProfessionalAiTransport> {
  const resolved = input?.resolvedRoute ?? resolveSmallSmokeProviderModels();
  const generatorProviderId =
    resolved.generatorProviderId !== "unset"
      ? resolved.generatorProviderId
      : "openai";
  const reviewerProviderId =
    resolved.reviewerProviderId !== "unset"
      ? resolved.reviewerProviderId
      : generatorProviderId;

  if (input?.runCapability) {
    return createAiServiceProfessionalTransport({
      runCapability: input.runCapability,
      providerId: generatorProviderId,
      generatorProviderId,
      reviewerProviderId,
      generatorModelId: resolved.generatorModelId,
      reviewerModelId: resolved.reviewerModelId,
    });
  }

  const { runCapability } = await import("../../ai/services/aiService");
  const operatorUserId = resolveLiveProfessionalOperatorUserId(
    input?.operatorUserId
  );

  return createAiServiceProfessionalTransport({
    providerId: generatorProviderId,
    generatorProviderId,
    reviewerProviderId,
    generatorModelId: resolved.generatorModelId,
    reviewerModelId: resolved.reviewerModelId,
    runCapability: async (req) => {
      const capabilityId =
        req.capabilityId === "platform.translation_professional_review"
          ? "platform.translation_professional_review"
          : "platform.translation_professional_generate";
      const result = await runCapability(
        {
          capabilityId,
          input: req.input,
          context: {
            surface: req.context.surface,
            productDomain: "platform",
            locale: req.context.locale,
          },
          preferredModelHint: req.preferredModelHint,
          preferredProviderHint: req.preferredProviderId,
        },
        { userId: operatorUserId, supabase: null as never }
      );
      if (!result.ok) {
        return { ok: false as const, error: { message: result.error.message } };
      }
      return {
        ok: true as const,
        data: {
          result: result.data.result as Record<string, unknown>,
          runId: result.data.runId,
        },
      };
    },
  });
}

/**
 * Live five-case smoke via AI-service professional transport.
 * Caller must already pass readiness/GO gates.
 */
export async function runSmallSmokeLive(input: {
  transport: ProfessionalAiTransport;
  prep?: SmallSmokePrepSnapshot;
  readiness?: LiveProfessionalProviderReadinessReport;
  sensitiveReviewerConfigured?: boolean;
  callCeiling?: number;
}): Promise<SmallSmokeRunReport> {
  const prep = input.prep ?? prepareSmallSmokeExecution();
  const readiness = input.readiness ?? prep.readiness;
  const resolved = prep.resolvedRoute;
  const genProviderId = (
    resolved.generatorProviderId === "unset"
      ? "openai"
      : resolved.generatorProviderId
  ) as ProfessionalLiveProviderId;
  const revProviderId = (
    resolved.reviewerProviderId === "unset"
      ? "openai"
      : resolved.reviewerProviderId
  ) as ProfessionalLiveProviderId;
  const slot: BenchmarkMatrixSlot = {
    id: `live_${genProviderId}_x_${revProviderId}`,
    label: `${genProviderId}/${resolved.generatorModelId} × ${revProviderId}/${resolved.reviewerModelId}`,
    independent:
      genProviderId !== revProviderId ||
      resolved.generatorModelId !== resolved.reviewerModelId,
    generator: {
      providerId: genProviderId,
      modelId: resolved.generatorModelId,
    },
    reviewer: {
      providerId: revProviderId,
      modelId: resolved.reviewerModelId,
    },
  };

  const generator = createTransportBackedProfessionalGenerator(input.transport);
  const normalReviewer = createTransportBackedProfessionalReviewer(
    input.transport
  );
  const sensitiveConfigured = Boolean(input.sensitiveReviewerConfigured);
  const sensitiveReviewer = createHeuristicProfessionalReviewer({
    providerId: "heuristic",
    modelId: "heuristic-sensitive-reviewer-v1",
  });

  const report = await executeSmallSmokeCases({
    prep: {
      ...prep,
      readiness,
    },
    mode: "live_ai_service",
    slot,
    generator,
    normalReviewer,
    sensitiveReviewer,
    sensitiveConfigured,
    callCeiling: input.callCeiling ?? prep.callBudget.totalCallCeiling,
    resolvedRoute: resolved,
  });

  return report;
}

function liveRefusedReport(
  prep: SmallSmokePrepSnapshot,
  reason: string,
  readiness: LiveProfessionalProviderReadinessReport
): SmallSmokeRunReport {
  return {
    schemaVersion: 1,
    phase: "small",
    packageId: prep.package.packageId,
    mode: "live_refused",
    readiness: {
      overall: readiness.overall,
      generator: readiness.generator.state,
      reviewer: readiness.reviewer.state,
      sensitiveReviewer: readiness.sensitiveReviewer.state,
      activated: false,
      secretsExposed: false,
    },
    callBudget: prep.callBudget,
    privacy: prep.privacy,
    matrixSlot: {
      id: "none",
      label: "refused",
      independent: false,
    },
    cases: [],
    verdict: "SMOKE_FAIL",
    successCriteria: {
      fiveCasesExecuted: false,
      refusedSafely: true,
    },
    mutatedStudio: false,
    secretsPresent: false,
    providerCallsAttempted: 0,
    refusalReason: reason,
    resolvedRoute: prep.resolvedRoute,
    configVariableNames: SMALL_SMOKE_CONFIG_VARIABLE_NAMES,
    recommendedFirstPattern: RECOMMENDED_FIRST_SMOKE_CONFIGURATION_PATTERN,
    providerEligibility: SMALL_SMOKE_PROVIDER_ELIGIBILITY,
  };
}

/**
 * Live entry gate + offline default.
 * Live path requires explicit GO + LIVE_BENCHMARK_READY + privacy PASS.
 */
export async function runSmallSmokePhase(input: {
  explicitGo?: boolean;
  maxCalls?: number;
  transport?: ProfessionalAiTransport;
  /** Force offline path for CI/prep proof (default true when no GO). */
  forceOffline?: boolean;
  /**
   * Test-only readiness override so live path can be exercised without paid
   * credentials. Never set by the CLI.
   */
  readinessOverride?: LiveProfessionalProviderReadinessReport;
  /** Test-only injectable live transport factory (fake ai_service). */
  liveTransport?: ProfessionalAiTransport;
}): Promise<SmallSmokeRunReport> {
  const prep = prepareSmallSmokeExecution();
  const callCeiling = prep.callBudget.totalCallCeiling;
  const maxCalls = input.maxCalls ?? prep.callBudget.normalCalls;
  const wantOffline = input.forceOffline === true || !input.explicitGo;

  if (wantOffline) {
    return runSmallSmokeOffline({ transport: input.transport });
  }

  const readiness = input.readinessOverride ?? prep.readiness;
  const gate = refuseLiveSmallSmokeIfNotReady({
    readiness,
    explicitGo: Boolean(input.explicitGo),
    maxCalls,
    callCeiling,
    privacyOk: prep.privacy.status === "PASS",
  });

  if (!gate.ok) {
    return liveRefusedReport(prep, gate.reason, readiness);
  }

  const transport =
    input.liveTransport ??
    input.transport ??
    (await createDefaultLiveProfessionalSmokeTransport({
      resolvedRoute: prep.resolvedRoute,
    }));

  return runSmallSmokeLive({
    transport,
    prep,
    readiness,
    callCeiling,
    sensitiveReviewerConfigured:
      readiness.sensitiveReviewer.state === "READY",
  });
}
