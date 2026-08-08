/**
 * Generator × reviewer evaluation matrix — deterministic format, non-mutating.
 * Default case set: locked 5-case small-smoke package.
 */

import type { ProfessionalLiveProviderId } from "./liveProviderConfig";
import {
  SMALL_SMOKE_CASE_COUNT,
  SMALL_SMOKE_LOCKED_CASE_IDS,
  SMALL_SMOKE_PACKAGE_ID,
  buildSmallSmokePackage,
  calculateSmallSmokeCallBudget,
} from "./smallSmokePackage";
import type { BenchmarkMatrixSlot } from "./benchmarkMatrix";

export const GENERATOR_REVIEWER_MATRIX_EVAL_ID =
  "generator_reviewer_matrix_eval_v1" as const;

/** Hard cap on matrix cells to bound paid cost if live is later authorized. */
export const GENERATOR_REVIEWER_MATRIX_MAX_CELLS = 4 as const;

export type MatrixRoleRef = {
  providerId: ProfessionalLiveProviderId;
  modelId: string;
};

export type GeneratorReviewerMatrixCell = {
  cellId: string;
  label: string;
  generator: MatrixRoleRef;
  reviewer: MatrixRoleRef;
  independent: boolean;
  caseSetId: typeof SMALL_SMOKE_PACKAGE_ID;
  caseIds: readonly string[];
  caseCount: typeof SMALL_SMOKE_CASE_COUNT;
};

export type GeneratorReviewerMatrixPlan = {
  schemaVersion: 1;
  matrixId: typeof GENERATOR_REVIEWER_MATRIX_EVAL_ID;
  cells: GeneratorReviewerMatrixCell[];
  caseSetId: typeof SMALL_SMOKE_PACKAGE_ID;
  caseIds: readonly string[];
  caseCount: typeof SMALL_SMOKE_CASE_COUNT;
  callBudget: GeneratorReviewerMatrixCallBudget;
  notes: string[];
};

export type GeneratorReviewerMatrixCallBudget = {
  caseCountPerCell: typeof SMALL_SMOKE_CASE_COUNT;
  /** Logical generate+review pairs per cell (no retries). */
  normalCallsPerCell: number;
  cellCount: number;
  normalCallsTotal: number;
  maxRetries: number;
  retryCeilingCalls: number;
  totalCallCeiling: number;
  maxCells: typeof GENERATOR_REVIEWER_MATRIX_MAX_CELLS;
  requiresExplicitGoForLive: true;
};

/**
 * Budget: each cell runs the locked 5-case package (10 normal calls).
 * Ceiling includes one retry layer (matches small-smoke policy).
 */
export function calculateGeneratorReviewerMatrixCallBudget(input: {
  cellCount: number;
  maxRetries?: number;
}): GeneratorReviewerMatrixCallBudget {
  const cellCount = Math.max(
    0,
    Math.min(GENERATOR_REVIEWER_MATRIX_MAX_CELLS, Math.floor(input.cellCount))
  );
  const perCell = calculateSmallSmokeCallBudget({
    maxRetries: input.maxRetries ?? 1,
  });
  return {
    caseCountPerCell: SMALL_SMOKE_CASE_COUNT,
    normalCallsPerCell: perCell.normalCalls,
    cellCount,
    normalCallsTotal: perCell.normalCalls * cellCount,
    maxRetries: perCell.maxRetries,
    retryCeilingCalls: perCell.retryCeilingCalls * cellCount,
    totalCallCeiling: perCell.totalCallCeiling * cellCount,
    maxCells: GENERATOR_REVIEWER_MATRIX_MAX_CELLS,
    requiresExplicitGoForLive: true,
  };
}

export function matrixCellFromSlot(
  slot: BenchmarkMatrixSlot,
  index: number
): GeneratorReviewerMatrixCell {
  return {
    cellId: slot.id || `cell_${index + 1}`,
    label: slot.label,
    generator: {
      providerId: slot.generator.providerId,
      modelId: slot.generator.modelId,
    },
    reviewer: {
      providerId: slot.reviewer.providerId,
      modelId: slot.reviewer.modelId,
    },
    independent: slot.independent,
    caseSetId: SMALL_SMOKE_PACKAGE_ID,
    caseIds: [...SMALL_SMOKE_LOCKED_CASE_IDS],
    caseCount: SMALL_SMOKE_CASE_COUNT,
  };
}

/**
 * Build a bounded matrix plan from role pairs (generator × reviewer).
 * Caps at GENERATOR_REVIEWER_MATRIX_MAX_CELLS.
 */
export function buildGeneratorReviewerMatrixPlan(input: {
  cells: Array<{
    cellId?: string;
    generator: MatrixRoleRef;
    reviewer: MatrixRoleRef;
  }>;
  maxRetries?: number;
}): GeneratorReviewerMatrixPlan {
  const pkg = buildSmallSmokePackage();
  const limited = input.cells.slice(0, GENERATOR_REVIEWER_MATRIX_MAX_CELLS);
  const cells: GeneratorReviewerMatrixCell[] = limited.map((c, i) => {
    const independent =
      c.generator.providerId !== c.reviewer.providerId ||
      c.generator.modelId !== c.reviewer.modelId;
    return {
      cellId: c.cellId ?? `G${i + 1}_R${i + 1}`,
      label: `${c.generator.providerId}/${c.generator.modelId || "unset"} × ${c.reviewer.providerId}/${c.reviewer.modelId || "unset"}`,
      generator: c.generator,
      reviewer: c.reviewer,
      independent,
      caseSetId: SMALL_SMOKE_PACKAGE_ID,
      caseIds: [...SMALL_SMOKE_LOCKED_CASE_IDS],
      caseCount: SMALL_SMOKE_CASE_COUNT,
    };
  });

  return {
    schemaVersion: 1,
    matrixId: GENERATOR_REVIEWER_MATRIX_EVAL_ID,
    cells,
    caseSetId: SMALL_SMOKE_PACKAGE_ID,
    caseIds: [...SMALL_SMOKE_LOCKED_CASE_IDS],
    caseCount: pkg.caseCount,
    callBudget: calculateGeneratorReviewerMatrixCallBudget({
      cellCount: cells.length,
      maxRetries: input.maxRetries,
    }),
    notes: [
      "Non-mutating evaluation only — no Studio save/approve/publish",
      "Default case set is the locked five-case small-smoke package",
      "Live paid matrix requires explicit GO + LIVE_BENCHMARK_READY",
      "JSON remains authoritative; dual_read stays OFF",
    ],
  };
}

/** Offline baseline: single heuristic×heuristic cell (deterministic, unpaid). */
export function defaultOfflineGeneratorReviewerMatrixPlan(): GeneratorReviewerMatrixPlan {
  return buildGeneratorReviewerMatrixPlan({
    cells: [
      {
        cellId: "offline_heuristic_x_heuristic",
        generator: {
          providerId: "heuristic",
          modelId: "glossary-aware-generator-v1",
        },
        reviewer: {
          providerId: "heuristic",
          modelId: "heuristic-reviewer-v1",
        },
      },
    ],
  });
}

/**
 * Minimal offline comparison matrix: baseline + labeled independent fake pair
 * for structure/tests (still heuristic transports unless injected).
 */
export function defaultOfflineComparisonMatrixPlan(): GeneratorReviewerMatrixPlan {
  return buildGeneratorReviewerMatrixPlan({
    cells: [
      {
        cellId: "offline_heuristic_x_heuristic",
        generator: {
          providerId: "heuristic",
          modelId: "glossary-aware-generator-v1",
        },
        reviewer: {
          providerId: "heuristic",
          modelId: "heuristic-reviewer-v1",
        },
      },
      {
        cellId: "offline_independent_labels",
        generator: {
          providerId: "heuristic",
          modelId: "glossary-aware-generator-v1",
        },
        reviewer: {
          providerId: "heuristic",
          modelId: "heuristic-reviewer-alt-v1",
        },
      },
    ],
  });
}

export const GENERATOR_REVIEWER_MATRIX_CONFIG_VARIABLE_NAMES = [
  "UMTUBA_AI_MODE",
  "PROFESSIONAL_TRANSLATION_GENERATOR_PROVIDER",
  "PROFESSIONAL_TRANSLATION_GENERATOR_MODEL",
  "PROFESSIONAL_TRANSLATION_REVIEWER_PROVIDER",
  "PROFESSIONAL_TRANSLATION_REVIEWER_MODEL",
  "UMTUBA_PROFESSIONAL_MATRIX_EXPLICIT_GO",
  "UMTUBA_PROFESSIONAL_MATRIX_MAX_CELLS",
  "UMTUBA_PROFESSIONAL_MATRIX_MAX_CALLS",
] as const;
