/**
 * Cost + privacy preflight for future live benchmarks (no paid calls).
 */

import {
  listBenchmarkCases,
  type BenchmarkCase,
} from "./benchmarkCorpus";
import type { BenchmarkMatrixSlot } from "./benchmarkMatrix";
import type { LiveBenchmarkPhasePlan } from "./benchmarkPhases";
import { LIVE_FAILURE_RETRY_POLICY } from "./acceptanceBars";

export type BenchmarkCostPreflight = {
  phaseId: string;
  caseCount: number;
  matrixSlots: number;
  generatorCalls: number;
  reviewerCalls: number;
  retryCeilingCalls: number;
  totalCallCeiling: number;
  requiresExplicitGo: true;
  estimatedNotes: string;
};

export function calculateBenchmarkCostPreflight(input: {
  phase: LiveBenchmarkPhasePlan;
  matrixSlots: BenchmarkMatrixSlot[];
  caseCount?: number;
}): BenchmarkCostPreflight {
  const caseCount = Math.min(
    input.caseCount ?? input.phase.maxCases,
    input.phase.maxCases
  );
  const slots = Math.max(1, input.matrixSlots.length);
  const generatorCalls = caseCount * slots;
  const reviewerCalls = caseCount * slots;
  const base = generatorCalls + reviewerCalls;
  const retryCeilingCalls =
    base * LIVE_FAILURE_RETRY_POLICY.maxRetries;
  return {
    phaseId: input.phase.id,
    caseCount,
    matrixSlots: slots,
    generatorCalls,
    reviewerCalls,
    retryCeilingCalls,
    totalCallCeiling: base + retryCeilingCalls,
    requiresExplicitGo: true,
    estimatedNotes:
      "Token/cost estimation requires provider usage metadata at runtime; require explicit GO before paid run.",
  };
}

const FORBIDDEN_CORPUS_PATTERNS = [
  /password\s*[:=]/i,
  /api[_-]?key/i,
  /bearer\s+[a-z0-9]/i,
  /authorization:/i,
  /\b\d{3}-\d{2}-\d{4}\b/, // SSN-like
  /@gmail\.com/i,
];

export function validateBenchmarkCorpusPrivacy(
  cases: BenchmarkCase[] = listBenchmarkCases()
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const c of cases) {
    const blob = `${c.sourceText} ${c.context} ${JSON.stringify(c.referenceHints ?? {})}`;
    for (const re of FORBIDDEN_CORPUS_PATTERNS) {
      if (re.test(blob)) {
        errors.push(`${c.id}: privacy pattern ${re}`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}
