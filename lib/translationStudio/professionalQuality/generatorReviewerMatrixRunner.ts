/**
 * Generator × reviewer matrix evaluation runner.
 * Offline/fake by default. Live requires explicit GO + readiness.
 * Never mutates Studio persistence.
 */

import type { StudioLanguageCode } from "../types";
import { PROFESSIONAL_AI_AUTHORITY } from "./aiContracts";
import { TRANSLATION_QUALITY_DIMENSIONS } from "./types";
import {
  assessLiveProfessionalProviderReadiness,
  type LiveProfessionalProviderReadinessReport,
} from "./liveProviderReadiness";
import {
  buildSmallSmokePackage,
  validateSmallSmokePrivacy,
  type SmallSmokeCasePolicy,
} from "./smallSmokePackage";
import { runProfessionalGenerateAndReview } from "./twoPassOrchestrator";
import { createGlossaryAwareProfessionalGenerator } from "./glossaryAwareGenerator";
import { createHeuristicProfessionalReviewer } from "./heuristicReviewer";
import {
  createTransportBackedProfessionalGenerator,
  createTransportBackedProfessionalReviewer,
} from "./transportAdapters";
import type { ProfessionalAiTransport } from "./providerTransport";
import type {
  ProfessionalTranslationGenerator,
  ProfessionalTranslationReviewer,
} from "./aiContracts";
import { seedUmtubaOfficialTerminologyCatalog } from "./terminologySeed";
import {
  classifySmallSmokeReviewerFailure,
  type SmallSmokeReviewerFailureDiagnostics,
} from "./smallSmokeReviewDiagnostics";
import {
  GENERATOR_REVIEWER_MATRIX_CONFIG_VARIABLE_NAMES,
  GENERATOR_REVIEWER_MATRIX_MAX_CELLS,
  buildGeneratorReviewerMatrixPlan,
  defaultOfflineGeneratorReviewerMatrixPlan,
  type GeneratorReviewerMatrixCallBudget,
  type GeneratorReviewerMatrixCell,
  type GeneratorReviewerMatrixPlan,
  type MatrixRoleRef,
} from "./generatorReviewerMatrix";

export type MatrixCaseEvalResult = {
  caseId: string;
  locale: string;
  structuredGenerateValid: boolean;
  structuredReviewValid: boolean;
  recommendation: string;
  humanReviewEnforced: boolean;
  placeholderIntact: boolean | null;
  dimensionScores: Array<{ dimension: string; score: number | null }>;
  overallScore: number | null;
  disqualifiers: string[];
  generatorAttribution: { providerId: string; modelId: string };
  reviewerAttribution: { providerId: string; modelId: string };
  /** Whether generate capability was invoked for this case. */
  generatorAttempted: boolean;
  /** Whether review capability was invoked for this case. */
  reviewerAttempted: boolean;
  /** Actual provider calls for this case (1 = gen only, 2 = gen+review). */
  providerCalls: number;
  generatorFailureDiagnostics?: SmallSmokeReviewerFailureDiagnostics;
  /** Present only when reviewer was actually attempted and failed. */
  reviewerFailureDiagnostics?: SmallSmokeReviewerFailureDiagnostics;
};

export type MatrixCellEvalResult = {
  cellId: string;
  label: string;
  independent: boolean;
  generator: MatrixRoleRef;
  reviewer: MatrixRoleRef;
  cases: MatrixCaseEvalResult[];
  providerCallsAttempted: number;
  structuredGenerateValidCount: number;
  structuredReviewValidCount: number;
  disqualifierCounts: Record<string, number>;
  recommendationCounts: Record<string, number>;
  meanOverallScore: number | null;
};

export type GeneratorReviewerMatrixEvalReport = {
  schemaVersion: 1;
  matrixId: string;
  mode: "offline_scripted" | "live_refused" | "live_ai_service";
  plan: GeneratorReviewerMatrixPlan;
  readiness: {
    overall: string;
    activated: false;
    secretsExposed: false;
  };
  privacy: { status: "PASS" | "FAIL"; errors: string[] };
  callBudget: GeneratorReviewerMatrixCallBudget;
  providerCallsAttempted: number;
  cells: MatrixCellEvalResult[];
  aggregate: {
    cellCount: number;
    caseCountTotal: number;
    allGenerateStructurallyValid: boolean;
    allReviewStructurallyValid: boolean;
    withinCallBudget: boolean;
    refundHumanReviewGated: boolean;
    zeroPlaceholderCorruption: boolean;
  };
  verdict: "MATRIX_PASS" | "MATRIX_PARTIAL" | "MATRIX_FAIL";
  mutatedStudio: false;
  secretsPresent: false;
  refusalReason?: string;
  configVariableNames: readonly string[];
};

function placeholderIntact(
  policy: SmallSmokeCasePolicy,
  candidate: string
): boolean | null {
  if (policy.placeholders.length === 0) return null;
  return policy.placeholders.every((ph) => candidate.includes(ph));
}

function resolveOfflinePair(cell: GeneratorReviewerMatrixCell): {
  generator: ProfessionalTranslationGenerator;
  reviewer: ProfessionalTranslationReviewer;
} {
  // Offline path always uses deterministic heuristic implementations.
  // Cell labels remain for matrix identity / independent scoring.
  void cell;
  return {
    generator: createGlossaryAwareProfessionalGenerator(),
    reviewer: createHeuristicProfessionalReviewer({
      providerId: "heuristic",
      modelId: cell.reviewer.modelId || "heuristic-reviewer-v1",
    }),
  };
}

function resolveTransportPair(
  cell: GeneratorReviewerMatrixCell,
  transport: ProfessionalAiTransport
): {
  generator: ProfessionalTranslationGenerator;
  reviewer: ProfessionalTranslationReviewer;
} {
  void cell;
  return {
    generator: createTransportBackedProfessionalGenerator(transport),
    reviewer: createTransportBackedProfessionalReviewer(transport),
  };
}

async function evaluateCell(input: {
  cell: GeneratorReviewerMatrixCell;
  generator: ProfessionalTranslationGenerator;
  reviewer: ProfessionalTranslationReviewer;
  callCeilingRemaining: number;
}): Promise<MatrixCellEvalResult> {
  const pkg = buildSmallSmokePackage();
  const catalog = seedUmtubaOfficialTerminologyCatalog();
  const cases: MatrixCaseEvalResult[] = [];
  let providerCalls = 0;
  const disqualifierCounts: Record<string, number> = {};
  const recommendationCounts: Record<string, number> = {};
  let generateOk = 0;
  let reviewOk = 0;
  let scoreSum = 0;
  let scoreN = 0;

  for (const policy of pkg.cases) {
    // Reserve room for a full generate+review pair (review may be skipped if gen fails).
    if (providerCalls + 2 > input.callCeilingRemaining) {
      break;
    }

    let structuredGenerateValid = true;
    let structuredReviewValid = true;
    let candidateText = "";
    let recommendation = "HUMAN_REVIEW";
    let overallScore: number | null = null;
    const disqualifiers: string[] = [];
    let dimensionScores: MatrixCaseEvalResult["dimensionScores"] =
      TRANSLATION_QUALITY_DIMENSIONS.map((d) => ({
        dimension: d,
        score: null,
      }));
    let generatorFailureDiagnostics:
      | SmallSmokeReviewerFailureDiagnostics
      | undefined;
    let reviewerFailureDiagnostics:
      | SmallSmokeReviewerFailureDiagnostics
      | undefined;
    let generatorAttempted = false;
    let reviewerAttempted = false;
    let caseCalls = 0;
    let genAttr: { providerId: string; modelId: string } = {
      providerId: input.cell.generator.providerId,
      modelId: input.cell.generator.modelId,
    };
    let revAttr: { providerId: string; modelId: string } = {
      providerId: input.cell.reviewer.providerId,
      modelId: input.cell.reviewer.modelId,
    };

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
        reviewer: input.reviewer,
      });

      generatorAttempted = out.generatorAttempted;
      reviewerAttempted = out.reviewerAttempted;
      caseCalls = (generatorAttempted ? 1 : 0) + (reviewerAttempted ? 1 : 0);

      candidateText = out.candidateText;
      recommendation = out.recommendation;
      overallScore = out.report?.overallScore ?? null;

      if (out.report?.dimensionScores?.length) {
        const byDim = new Map(
          out.report.dimensionScores.map((d) => [d.dimension, d.score])
        );
        dimensionScores = TRANSLATION_QUALITY_DIMENSIONS.map((d) => ({
          dimension: d,
          score: typeof byDim.get(d) === "number" ? byDim.get(d)! : null,
        }));
      }

      const parts = (out.observation.providerId ?? "").split("+");
      const models = (out.observation.modelId ?? "").split("+");
      if (parts[0]) {
        genAttr = {
          providerId: parts[0],
          modelId: models[0] || genAttr.modelId,
        };
      }
      if (parts[1]) {
        revAttr = {
          providerId: parts[1],
          modelId: models[1] || revAttr.modelId,
        };
      }

      if (!out.candidateText.trim()) {
        structuredGenerateValid = false;
        disqualifiers.push("empty_candidate");
      }

      if (!reviewerAttempted) {
        // Generate failed closed — reviewer never called.
        structuredReviewValid = false;
        if (!structuredGenerateValid) {
          disqualifiers.push("generator_unavailable");
          generatorFailureDiagnostics = classifySmallSmokeReviewerFailure({
            failure: out.failure ?? null,
            providerId: genAttr.providerId,
            modelId: genAttr.modelId,
            reviewerPath: "live_transport",
          });
        }
      } else if (!out.reviewerResultAvailable) {
        structuredReviewValid = false;
        disqualifiers.push("reviewer_unavailable");
        reviewerFailureDiagnostics = classifySmallSmokeReviewerFailure({
          failure: out.failure ?? null,
          providerId: revAttr.providerId,
          modelId: revAttr.modelId,
          reviewerPath: "live_transport",
        });
      }
    } catch {
      structuredGenerateValid = false;
      structuredReviewValid = false;
      generatorAttempted = true;
      reviewerAttempted = false;
      caseCalls = 1;
      disqualifiers.push("transport_or_parse_failure");
      disqualifiers.push("generator_unavailable");
    }

    providerCalls += caseCalls;

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

    if (structuredGenerateValid) generateOk += 1;
    if (structuredReviewValid) reviewOk += 1;
    if (typeof overallScore === "number") {
      scoreSum += overallScore;
      scoreN += 1;
    }
    recommendationCounts[recommendation] =
      (recommendationCounts[recommendation] ?? 0) + 1;
    for (const d of disqualifiers) {
      disqualifierCounts[d] = (disqualifierCounts[d] ?? 0) + 1;
    }

    cases.push({
      caseId: policy.caseId,
      locale: policy.targetLocale,
      structuredGenerateValid,
      structuredReviewValid,
      recommendation,
      humanReviewEnforced,
      placeholderIntact: intact,
      dimensionScores,
      overallScore,
      disqualifiers,
      generatorAttribution: genAttr,
      reviewerAttribution: revAttr,
      generatorAttempted,
      reviewerAttempted,
      providerCalls: caseCalls,
      generatorFailureDiagnostics,
      reviewerFailureDiagnostics,
    });
  }

  return {
    cellId: input.cell.cellId,
    label: input.cell.label,
    independent: input.cell.independent,
    generator: input.cell.generator,
    reviewer: input.cell.reviewer,
    cases,
    providerCallsAttempted: providerCalls,
    structuredGenerateValidCount: generateOk,
    structuredReviewValidCount: reviewOk,
    disqualifierCounts,
    recommendationCounts,
    meanOverallScore: scoreN > 0 ? Math.round((scoreSum / scoreN) * 10) / 10 : null,
  };
}

export function refuseLiveMatrixIfNotReady(input: {
  readiness: LiveProfessionalProviderReadinessReport;
  explicitGo: boolean;
  maxCalls: number;
  callCeiling: number;
  privacyOk: boolean;
  cellCount: number;
}): { ok: true } | { ok: false; reason: string } {
  if (!input.explicitGo) {
    return { ok: false, reason: "explicit_go_required" };
  }
  if (!input.privacyOk) {
    return { ok: false, reason: "privacy_fail" };
  }
  if (input.cellCount > GENERATOR_REVIEWER_MATRIX_MAX_CELLS) {
    return { ok: false, reason: "matrix_cell_cap_exceeded" };
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

function finalizeReport(input: {
  mode: GeneratorReviewerMatrixEvalReport["mode"];
  plan: GeneratorReviewerMatrixPlan;
  cells: MatrixCellEvalResult[];
  providerCallsAttempted: number;
  readinessOverall: string;
  privacy: { status: "PASS" | "FAIL"; errors: string[] };
  refusalReason?: string;
}): GeneratorReviewerMatrixEvalReport {
  const allCases = input.cells.flatMap((c) => c.cases);
  const aggregate = {
    cellCount: input.cells.length,
    caseCountTotal: allCases.length,
    allGenerateStructurallyValid:
      allCases.length > 0 &&
      allCases.every((c) => c.structuredGenerateValid),
    allReviewStructurallyValid:
      allCases.length > 0 &&
      allCases.every((c) => c.structuredReviewValid),
    withinCallBudget:
      input.providerCallsAttempted <= input.plan.callBudget.totalCallCeiling,
    refundHumanReviewGated: allCases.some(
      (c) =>
        c.caseId === "commerce_refund" &&
        c.humanReviewEnforced &&
        c.recommendation === "HUMAN_REVIEW"
    ),
    zeroPlaceholderCorruption: allCases.every(
      (c) => c.placeholderIntact !== false
    ),
  };

  const hardFail =
    !aggregate.withinCallBudget ||
    !aggregate.refundHumanReviewGated ||
    !aggregate.zeroPlaceholderCorruption ||
    input.privacy.status !== "PASS" ||
    input.cells.length === 0;

  let verdict: GeneratorReviewerMatrixEvalReport["verdict"] = "MATRIX_FAIL";
  if (!hardFail && aggregate.allGenerateStructurallyValid && aggregate.allReviewStructurallyValid) {
    verdict = "MATRIX_PASS";
  } else if (!hardFail && allCases.length > 0) {
    verdict = "MATRIX_PARTIAL";
  }

  return {
    schemaVersion: 1,
    matrixId: input.plan.matrixId,
    mode: input.mode,
    plan: input.plan,
    readiness: {
      overall: input.readinessOverall,
      activated: false,
      secretsExposed: false,
    },
    privacy: input.privacy,
    callBudget: input.plan.callBudget,
    providerCallsAttempted: input.providerCallsAttempted,
    cells: input.cells,
    aggregate,
    verdict: input.refusalReason ? "MATRIX_FAIL" : verdict,
    mutatedStudio: false,
    secretsPresent: false,
    refusalReason: input.refusalReason,
    configVariableNames: GENERATOR_REVIEWER_MATRIX_CONFIG_VARIABLE_NAMES,
  };
}

/**
 * Run matrix evaluation. Defaults to offline/heuristic (no paid calls).
 */
export async function runGeneratorReviewerMatrixEvaluation(input?: {
  plan?: GeneratorReviewerMatrixPlan;
  forceOffline?: boolean;
  explicitGo?: boolean;
  /** Per-cell injectable transports (tests / live wiring). */
  transportsByCellId?: Record<string, ProfessionalAiTransport>;
  /** Single transport applied to all non-heuristic cells. */
  transport?: ProfessionalAiTransport;
  readinessOverride?: LiveProfessionalProviderReadinessReport;
  maxCalls?: number;
}): Promise<GeneratorReviewerMatrixEvalReport> {
  const plan = input?.plan ?? defaultOfflineGeneratorReviewerMatrixPlan();
  const privacy = validateSmallSmokePrivacy(buildSmallSmokePackage());
  const readiness =
    input?.readinessOverride ?? assessLiveProfessionalProviderReadiness();
  const forceOffline = input?.forceOffline === true || !input?.explicitGo;
  const planCeiling = plan.callBudget.totalCallCeiling;
  const requestedMax =
    typeof input?.maxCalls === "number" && Number.isFinite(input.maxCalls)
      ? Math.max(0, Math.floor(input.maxCalls))
      : planCeiling;
  const effectiveCeiling = Math.min(planCeiling, requestedMax);

  // Default / offline: heuristic or injected fake transports — never paid.
  if (forceOffline) {
    const cells: MatrixCellEvalResult[] = [];
    let used = 0;
    for (const cell of plan.cells) {
      const remaining = effectiveCeiling - used;
      if (remaining < 2) break;
      const transport =
        input?.transportsByCellId?.[cell.cellId] ?? input?.transport;
      const pair =
        transport != null
          ? resolveTransportPair(cell, transport)
          : resolveOfflinePair(cell);
      const cellResult = await evaluateCell({
        cell,
        generator: pair.generator,
        reviewer: pair.reviewer,
        callCeilingRemaining: remaining,
      });
      used += cellResult.providerCallsAttempted;
      cells.push(cellResult);
    }
    return finalizeReport({
      mode: "offline_scripted",
      plan,
      cells,
      providerCallsAttempted: used,
      readinessOverall: readiness.overall,
      privacy,
    });
  }

  const maxCalls = input.maxCalls ?? plan.callBudget.normalCallsTotal;
  const gate = refuseLiveMatrixIfNotReady({
    readiness,
    explicitGo: true,
    maxCalls,
    callCeiling: planCeiling,
    privacyOk: privacy.status === "PASS",
    cellCount: plan.cells.length,
  });
  if (!gate.ok) {
    return finalizeReport({
      mode: "live_refused",
      plan,
      cells: [],
      providerCallsAttempted: 0,
      readinessOverall: readiness.overall,
      privacy,
      refusalReason: gate.reason,
    });
  }

  const cells: MatrixCellEvalResult[] = [];
  let used = 0;
  for (const cell of plan.cells) {
    const remaining = effectiveCeiling - used;
    if (remaining < 2) break;
    const transport =
      input.transportsByCellId?.[cell.cellId] ?? input.transport;
    if (!transport) {
      return finalizeReport({
        mode: "live_refused",
        plan,
        cells,
        providerCallsAttempted: used,
        readinessOverall: readiness.overall,
        privacy,
        refusalReason: "live_transport_required",
      });
    }
    const pair = resolveTransportPair(cell, transport);
    const cellResult = await evaluateCell({
      cell,
      generator: pair.generator,
      reviewer: pair.reviewer,
      callCeilingRemaining: remaining,
    });
    used += cellResult.providerCallsAttempted;
    cells.push(cellResult);
  }

  return finalizeReport({
    mode: "live_ai_service",
    plan,
    cells,
    providerCallsAttempted: used,
    readinessOverall: readiness.overall,
    privacy,
  });
}

/** Sanitized operator surface — no source/candidate text, no secrets. */
export function toSanitizedMatrixEvalReport(
  report: GeneratorReviewerMatrixEvalReport
): Record<string, unknown> {
  return {
    type: "generator_reviewer_matrix_report",
    verdict: report.verdict,
    mode: report.mode,
    matrixId: report.matrixId,
    mutatedStudio: report.mutatedStudio,
    secretsPresent: report.secretsPresent,
    privacy: report.privacy.status,
    providerCallsAttempted: report.providerCallsAttempted,
    callBudget: report.callBudget,
    readiness: report.readiness,
    refusalReason: report.refusalReason,
    aggregate: report.aggregate,
    cells: report.cells.map((cell) => ({
      cellId: cell.cellId,
      label: cell.label,
      independent: cell.independent,
      generator: cell.generator,
      reviewer: cell.reviewer,
      providerCallsAttempted: cell.providerCallsAttempted,
      structuredGenerateValidCount: cell.structuredGenerateValidCount,
      structuredReviewValidCount: cell.structuredReviewValidCount,
      recommendationCounts: cell.recommendationCounts,
      disqualifierCounts: cell.disqualifierCounts,
      meanOverallScore: cell.meanOverallScore,
      cases: cell.cases.map((c) => ({
        caseId: c.caseId,
        locale: c.locale,
        structuredGenerateValid: c.structuredGenerateValid,
        structuredReviewValid: c.structuredReviewValid,
        recommendation: c.recommendation,
        humanReviewEnforced: c.humanReviewEnforced,
        placeholderIntact: c.placeholderIntact,
        dimensionScores: c.dimensionScores,
        overallScore: c.overallScore,
        disqualifiers: c.disqualifiers,
        generatorAttribution: c.generatorAttribution,
        reviewerAttribution: c.reviewerAttribution,
        generatorAttempted: c.generatorAttempted,
        reviewerAttempted: c.reviewerAttempted,
        providerCalls: c.providerCalls,
        generatorFailureDiagnostics: c.generatorFailureDiagnostics,
        reviewerFailureDiagnostics: c.reviewerFailureDiagnostics,
      })),
    })),
  };
}

export function buildLiveMatrixPlanFromRolePairs(
  pairs: Array<{ generator: MatrixRoleRef; reviewer: MatrixRoleRef; cellId?: string }>
): GeneratorReviewerMatrixPlan {
  return buildGeneratorReviewerMatrixPlan({ cells: pairs });
}
