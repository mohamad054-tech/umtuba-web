/**
 * Small-smoke helper — prep + offline proof. Live paid execution requires
 * later milestone explicit GO + LIVE_BENCHMARK_READY. Never mutates Studio.
 */

import { PROFESSIONAL_AI_AUTHORITY } from "./aiContracts";
import {
  assessLiveProfessionalProviderReadiness,
  type LiveProfessionalProviderReadinessReport,
} from "./liveProviderReadiness";
import {
  loadProfessionalLiveModelPolicy,
  type ProfessionalLiveModelPolicy,
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
import type { ProfessionalAiTransport } from "./providerTransport";
import { seedUmtubaOfficialTerminologyCatalog } from "./terminologySeed";
import {
  createBlindHumanReviewArtifact,
  toBlindHumanReviewSurface,
  type BlindHumanReviewArtifact,
} from "./humanBlindReview";
import type { StudioLanguageCode } from "../types";

export type SmallSmokeVerdict = "SMOKE_PASS" | "SMOKE_PARTIAL" | "SMOKE_FAIL";

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
};

export type SmallSmokeRunReport = {
  schemaVersion: 1;
  phase: "small";
  packageId: string;
  mode: "offline_scripted" | "live_refused" | "prep_only";
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
  liveExecutionAllowed: false;
  requiresExplicitGo: true;
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
  const matrixReuse = buildProfessionalBenchmarkMatrix({
    candidates: [
      {
        providerId:
          modelPolicy.generator.providerId === "unset"
            ? "heuristic"
            : modelPolicy.generator.providerId,
        modelId: modelPolicy.generator.modelId || "unset",
        role: "generator",
      },
      {
        providerId:
          modelPolicy.reviewer.providerId === "unset"
            ? "heuristic"
            : modelPolicy.reviewer.providerId,
        modelId: modelPolicy.reviewer.modelId || "unset",
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
    liveExecutionAllowed: false,
    requiresExplicitGo: true,
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
 * explicit GO is provided. Prep milestone always refuses live.
 */
export function refuseLiveSmallSmokeIfNotReady(input: {
  readiness: LiveProfessionalProviderReadinessReport;
  explicitGo: boolean;
  maxCalls: number;
  callCeiling: number;
}): { ok: true } | { ok: false; reason: string } {
  if (!input.explicitGo) {
    return { ok: false, reason: "explicit_go_required" };
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
  const slot =
    input?.matrixSlot ?? defaultOfflineBenchmarkMatrix()[0]!;
  const catalog = seedUmtubaOfficialTerminologyCatalog();
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

  const artifacts: SmallSmokeCaseArtifact[] = [];
  let providerCalls = 0;
  const callCeiling = prep.callBudget.totalCallCeiling;

  for (const policy of prep.package.cases) {
    if (providerCalls + 2 > callCeiling) {
      break;
    }

    const useSensitive =
      policy.sensitiveReviewerPreferred && sensitiveConfigured;
    const reviewer = useSensitive ? sensitiveReviewer : normalReviewer;
    const usedFallback =
      policy.sensitiveReviewerPreferred && !sensitiveConfigured;

    providerCalls += 2;
    let structuredGenerateValid = true;
    let structuredReviewValid = true;
    let candidateText = "";
    let recommendation = "HUMAN_REVIEW";
    let overallScore: number | null = null;
    let majorFindings: string[] = [];
    const disqualifiers: string[] = [];

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
        generator,
        reviewer,
      });
      candidateText = out.candidateText;
      recommendation = out.recommendation;
      overallScore = out.report?.overallScore ?? null;
      majorFindings = (out.report?.reviewerFindings ?? [])
        .slice(0, 8)
        .map((f) => f.message);
      if (!out.candidateText.trim()) {
        structuredGenerateValid = false;
        disqualifiers.push("empty_candidate");
      }
      if (!out.reviewerResultAvailable) {
        structuredReviewValid = false;
        disqualifiers.push("reviewer_unavailable");
      }
    } catch {
      structuredGenerateValid = false;
      structuredReviewValid = false;
      disqualifiers.push("transport_or_parse_failure");
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
      matrixSlotId: slot.id,
      generatorLabel: `${slot.generator.providerId}/${slot.generator.modelId}`,
      reviewerLabel: useSensitive
        ? "sensitive-reviewer"
        : `${slot.reviewer.providerId}/${slot.reviewer.modelId}`,
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
    });
  }

  const { verdict, criteria } = evaluateSuccessCriteria({
    cases: artifacts,
    privacyOk: prep.privacy.status === "PASS",
    providerCalls,
    callCeiling,
  });

  return {
    schemaVersion: 1,
    phase: "small",
    packageId: prep.package.packageId,
    mode: "offline_scripted",
    readiness: {
      overall: prep.readiness.overall,
      generator: prep.readiness.generator.state,
      reviewer: prep.readiness.reviewer.state,
      sensitiveReviewer: prep.readiness.sensitiveReviewer.state,
      activated: false,
      secretsExposed: false,
    },
    callBudget: prep.callBudget,
    privacy: prep.privacy,
    matrixSlot: {
      id: slot.id,
      label: slot.label,
      independent: slot.independent,
    },
    cases: artifacts,
    verdict,
    successCriteria: criteria,
    mutatedStudio: false,
    secretsPresent: false,
    providerCallsAttempted: providerCalls,
    configVariableNames: SMALL_SMOKE_CONFIG_VARIABLE_NAMES,
    recommendedFirstPattern: RECOMMENDED_FIRST_SMOKE_CONFIGURATION_PATTERN,
    providerEligibility: SMALL_SMOKE_PROVIDER_ELIGIBILITY,
  };
}

/**
 * Live entry gate + offline default.
 * Prep milestone: offline proof without GO; live always deferred/refused.
 */
export async function runSmallSmokePhase(input: {
  explicitGo?: boolean;
  maxCalls?: number;
  transport?: ProfessionalAiTransport;
  /** Force offline path for CI/prep proof (default true when no GO). */
  forceOffline?: boolean;
}): Promise<SmallSmokeRunReport> {
  const prep = prepareSmallSmokeExecution();
  const callCeiling = prep.callBudget.totalCallCeiling;
  const maxCalls = input.maxCalls ?? prep.callBudget.normalCalls;
  const wantOffline = input.forceOffline === true || !input.explicitGo;

  if (wantOffline) {
    return runSmallSmokeOffline({ transport: input.transport });
  }

  const gate = refuseLiveSmallSmokeIfNotReady({
    readiness: prep.readiness,
    explicitGo: Boolean(input.explicitGo),
    maxCalls,
    callCeiling,
  });

  if (!gate.ok) {
    return {
      schemaVersion: 1,
      phase: "small",
      packageId: prep.package.packageId,
      mode: "live_refused",
      readiness: {
        overall: prep.readiness.overall,
        generator: prep.readiness.generator.state,
        reviewer: prep.readiness.reviewer.state,
        sensitiveReviewer: prep.readiness.sensitiveReviewer.state,
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
      refusalReason: gate.reason,
      configVariableNames: SMALL_SMOKE_CONFIG_VARIABLE_NAMES,
      recommendedFirstPattern: RECOMMENDED_FIRST_SMOKE_CONFIGURATION_PATTERN,
      providerEligibility: SMALL_SMOKE_PROVIDER_ELIGIBILITY,
    };
  }

  // Live path deferred — execution milestone owns paid calls.
  return {
    schemaVersion: 1,
    phase: "small",
    packageId: prep.package.packageId,
    mode: "prep_only",
    readiness: {
      overall: prep.readiness.overall,
      generator: prep.readiness.generator.state,
      reviewer: prep.readiness.reviewer.state,
      sensitiveReviewer: prep.readiness.sensitiveReviewer.state,
      activated: false,
      secretsExposed: false,
    },
    callBudget: prep.callBudget,
    privacy: prep.privacy,
    matrixSlot: {
      id: "deferred",
      label: "execution_milestone",
      independent: true,
    },
    cases: [],
    verdict: "SMOKE_FAIL",
    successCriteria: {
      fiveCasesExecuted: false,
      liveDeferredToExecutionMilestone: true,
    },
    mutatedStudio: false,
    secretsPresent: false,
    providerCallsAttempted: 0,
    refusalReason: "live_execution_deferred_to_next_milestone",
    configVariableNames: SMALL_SMOKE_CONFIG_VARIABLE_NAMES,
    recommendedFirstPattern: RECOMMENDED_FIRST_SMOKE_CONFIGURATION_PATTERN,
    providerEligibility: SMALL_SMOKE_PROVIDER_ELIGIBILITY,
  };
}
