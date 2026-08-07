/**
 * Safe operational metadata for professional AI review (no secrets / CoT).
 */

import type { ProfessionalQualityRecommendation } from "./types";
import type { ProfessionalReviewFailureCode } from "./reviewFailures";

export type ProfessionalReviewObservation = {
  schemaVersion: 1;
  role: "reviewer" | "generator" | "two_pass";
  providerId: string | null;
  modelId: string | null;
  profileId: string;
  locale: string;
  durationMs: number;
  success: boolean;
  failureCode?: ProfessionalReviewFailureCode;
  overallScore: number | null;
  findingCounts: {
    total: number;
    blocking: number;
    error: number;
    warning: number;
    info: number;
  };
  recommendation: ProfessionalQualityRecommendation | null;
  cacheKeyFingerprint?: string;
};

export function countFindingsBySeverity(
  findings: Array<{ severity: string }>
): ProfessionalReviewObservation["findingCounts"] {
  const counts = { total: 0, blocking: 0, error: 0, warning: 0, info: 0 };
  for (const f of findings) {
    counts.total += 1;
    if (f.severity === "blocking") counts.blocking += 1;
    else if (f.severity === "error") counts.error += 1;
    else if (f.severity === "warning") counts.warning += 1;
    else if (f.severity === "info") counts.info += 1;
  }
  return counts;
}

export function buildProfessionalReviewObservation(
  input: Omit<ProfessionalReviewObservation, "schemaVersion">
): ProfessionalReviewObservation {
  return { schemaVersion: 1, ...input };
}
