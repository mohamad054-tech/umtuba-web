/**
 * Non-mutating professional provider benchmark runner.
 * Never creates suggestions, mutates store.json, shadows DB, publishes, or approves.
 */

import type { StudioLanguageCode } from "../types";
import {
  listBenchmarkCases,
  BENCHMARK_CORPUS_VERSION,
  type BenchmarkCase,
  type BenchmarkLocale,
} from "./benchmarkCorpus";
import type { BenchmarkMatrixSlot } from "./benchmarkMatrix";
import { defaultOfflineBenchmarkMatrix } from "./benchmarkMatrix";
import {
  scoreBenchmarkCase,
  aggregateProviderMatrixScores,
  type BenchmarkCaseScore,
  type ProviderMatrixAggregate,
} from "./benchmarkScoring";
import { getLocaleBenchmarkRubric } from "./benchmarkRubrics";
import { runProfessionalGenerateAndReview } from "./twoPassOrchestrator";
import { createGlossaryAwareProfessionalGenerator } from "./glossaryAwareGenerator";
import { createHeuristicProfessionalReviewer } from "./heuristicReviewer";
import {
  createTransportBackedProfessionalGenerator,
  createTransportBackedProfessionalReviewer,
} from "./transportAdapters";
import type { ProfessionalAiTransport } from "./providerTransport";
import type { ProfessionalTranslationGenerator } from "./aiContracts";
import type { ProfessionalTranslationReviewer } from "./aiContracts";
import { seedUmtubaOfficialTerminologyCatalog } from "./terminologySeed";
import type {
  HumanBenchmarkRating,
} from "./humanBenchmarkRating";
import { combineAutomatedAndHumanScores } from "./humanBenchmarkRating";

export type BenchmarkGuardrails = {
  maxCases: number;
  maxProviderCalls: number;
  /** Soft estimated budget USD — informational only. */
  maxEstimatedBudgetUsd?: number;
};

export const DEFAULT_BENCHMARK_GUARDRAILS: BenchmarkGuardrails = {
  maxCases: 50,
  maxProviderCalls: 120,
  maxEstimatedBudgetUsd: 5,
};

export type BenchmarkCaseResult = {
  caseId: string;
  locale: BenchmarkLocale;
  matrixSlotId: string;
  providerGeneratorLabel: string;
  providerReviewerLabel: string;
  candidateText: string;
  recommendation: string;
  overallScore: number;
  dimensionScores: Array<{ dimension: string; score: number }>;
  hardQaFindings: Array<{ code: string; severity: string; message: string }>;
  humanReviewRequired: boolean;
  latencyMs: number;
  failureCategory: string | null;
  structuredResponseValid: boolean;
  caseScore: BenchmarkCaseScore;
  usage?: { inputTokens?: number; outputTokens?: number; estimatedCostUsd?: number };
};

export type BenchmarkRunReport = {
  schemaVersion: 1;
  corpusVersion: string;
  matrixSlotId: string;
  matrixLabel: string;
  independentGeneratorReviewer: boolean;
  guardrails: BenchmarkGuardrails;
  providerCalls: number;
  results: BenchmarkCaseResult[];
  aggregate: ProviderMatrixAggregate;
  combinedWithHuman?: number;
  mutatedStudio: false;
  secretsPresent: false;
};

function resolveGenerators(slot: BenchmarkMatrixSlot, transport?: ProfessionalAiTransport): {
  generator: ProfessionalTranslationGenerator;
  reviewer: ProfessionalTranslationReviewer;
} {
  if (slot.generator.providerId === "heuristic" || !transport) {
    return {
      generator: createGlossaryAwareProfessionalGenerator(),
      reviewer: createHeuristicProfessionalReviewer(),
    };
  }
  return {
    generator: createTransportBackedProfessionalGenerator(transport),
    reviewer: createTransportBackedProfessionalReviewer(transport),
  };
}

function domainHintForCase(c: BenchmarkCase): string | null {
  switch (c.domain) {
    case "commerce":
    case "sensitive":
      return "commerce";
    case "learning":
      return "learning";
    case "collaboration":
      return "collaboration";
    default:
      return null;
  }
}

/**
 * Run a pure evaluation benchmark for one matrix slot.
 * Injectable transport optional — default offline heuristic path.
 */
export async function runProfessionalProviderBenchmark(input: {
  matrixSlot?: BenchmarkMatrixSlot;
  locales?: BenchmarkLocale[];
  caseIds?: string[];
  guardrails?: Partial<BenchmarkGuardrails>;
  /** Optional live transport — still non-mutating. */
  transport?: ProfessionalAiTransport;
  humanRatings?: HumanBenchmarkRating[];
}): Promise<BenchmarkRunReport> {
  const guardrails: BenchmarkGuardrails = {
    ...DEFAULT_BENCHMARK_GUARDRAILS,
    ...input.guardrails,
  };
  const slot = input.matrixSlot ?? defaultOfflineBenchmarkMatrix()[0]!;
  const { generator, reviewer } = resolveGenerators(slot, input.transport);
  const catalog = seedUmtubaOfficialTerminologyCatalog();

  let cases = listBenchmarkCases();
  if (input.caseIds?.length) {
    cases = cases.filter((c) => input.caseIds!.includes(c.id));
  }
  const locales = input.locales ?? (["ar"] as BenchmarkLocale[]);
  const work: Array<{ c: BenchmarkCase; locale: BenchmarkLocale }> = [];
  for (const c of cases) {
    for (const locale of locales) {
      if (!c.targetLocales.includes(locale)) continue;
      work.push({ c, locale });
    }
  }
  if (work.length > guardrails.maxCases) {
    work.length = guardrails.maxCases;
  }

  const results: BenchmarkCaseResult[] = [];
  let providerCalls = 0;

  for (const { c, locale } of work) {
    if (providerCalls + 2 > guardrails.maxProviderCalls) {
      break;
    }
    // Ensure rubric exists for locale (used by docs/operators).
    void getLocaleBenchmarkRubric(locale);

    const started = Date.now();
    providerCalls += 2; // generate + review
    let structuredResponseValid = true;
    let failureCategory: string | null = null;

    const out = await runProfessionalGenerateAndReview({
      sourceText: c.sourceText,
      sourceLocale: "en",
      targetLocale: locale as StudioLanguageCode,
      keyStableId: `benchmark:${c.id}`,
      domainHint: domainHintForCase(c),
      terminologyCatalog: catalog,
      generator,
      reviewer,
    });

    if (!out.candidateText || !out.report) {
      structuredResponseValid = false;
      failureCategory = out.failure?.code ?? "generation_unavailable";
    }

    const recommendation = out.recommendation;
    const overallScore = out.report?.overallScore ?? 0;
    const findings = [
      ...(out.report?.deterministicFindings ?? []),
      ...(out.report?.reviewerFindings ?? []),
    ];
    const humanReviewRequired =
      recommendation !== "PASS" ||
      (out.report?.humanReviewReasons?.length ?? 0) > 0 ||
      c.sensitive;

    const caseScore = scoreBenchmarkCase({
      overallScore,
      recommendation,
      findings,
      humanReviewRequired,
      sensitiveCase: c.sensitive,
      structuredResponseValid,
      latencyMs: Date.now() - started,
    });

    results.push({
      caseId: c.id,
      locale,
      matrixSlotId: slot.id,
      providerGeneratorLabel: `${slot.generator.providerId}/${slot.generator.modelId || "default"}`,
      providerReviewerLabel: `${slot.reviewer.providerId}/${slot.reviewer.modelId || "default"}`,
      candidateText: out.candidateText,
      recommendation,
      overallScore,
      dimensionScores: out.report?.dimensionScores ?? [],
      hardQaFindings: findings
        .filter((f) => f.severity === "blocking" || f.severity === "error")
        .map((f) => ({
          code: f.code,
          severity: f.severity,
          message: f.message.slice(0, 200),
        })),
      humanReviewRequired,
      latencyMs: Date.now() - started,
      failureCategory,
      structuredResponseValid,
      caseScore,
    });
  }

  const aggregate = aggregateProviderMatrixScores(
    results.map((r) => r.caseScore)
  );
  const humanForSlot = (input.humanRatings ?? []).filter(
    (h) => h.matrixSlotId === slot.id
  );

  return {
    schemaVersion: 1,
    corpusVersion: BENCHMARK_CORPUS_VERSION,
    matrixSlotId: slot.id,
    matrixLabel: slot.label,
    independentGeneratorReviewer: slot.independent,
    guardrails,
    providerCalls,
    results,
    aggregate,
    combinedWithHuman:
      humanForSlot.length > 0
        ? combineAutomatedAndHumanScores({
            automatedComposite: aggregate.meanComposite,
            humanRatings: humanForSlot,
          })
        : undefined,
    mutatedStudio: false,
    secretsPresent: false,
  };
}
