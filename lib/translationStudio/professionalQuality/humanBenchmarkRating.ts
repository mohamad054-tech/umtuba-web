/**
 * Human benchmark evaluation format (JSON/report — no UI required in V1).
 */

export type HumanBenchmarkRatingLabel =
  | "excellent"
  | "acceptable"
  | "needs_edit"
  | "wrong";

export type HumanBenchmarkRating = {
  schemaVersion: 1;
  caseId: string;
  locale: string;
  matrixSlotId: string;
  rating: HumanBenchmarkRatingLabel;
  notes?: string;
  ratedAt: string;
  raterId?: string;
};

export const HUMAN_RATING_SCORE: Record<HumanBenchmarkRatingLabel, number> = {
  excellent: 100,
  acceptable: 80,
  needs_edit: 45,
  wrong: 0,
};

export function createHumanBenchmarkRating(input: {
  caseId: string;
  locale: string;
  matrixSlotId: string;
  rating: HumanBenchmarkRatingLabel;
  notes?: string;
  raterId?: string;
}): HumanBenchmarkRating {
  return {
    schemaVersion: 1,
    caseId: input.caseId,
    locale: input.locale,
    matrixSlotId: input.matrixSlotId,
    rating: input.rating,
    notes: input.notes?.slice(0, 500),
    ratedAt: new Date().toISOString(),
    raterId: input.raterId,
  };
}

/**
 * Combine automated composite with optional human ratings (equal weight when present).
 */
export function combineAutomatedAndHumanScores(input: {
  automatedComposite: number;
  humanRatings: HumanBenchmarkRating[];
}): number {
  if (input.humanRatings.length === 0) {
    return input.automatedComposite;
  }
  const humanAvg =
    input.humanRatings.reduce(
      (s, r) => s + HUMAN_RATING_SCORE[r.rating],
      0
    ) / input.humanRatings.length;
  return Math.round(((input.automatedComposite + humanAvg) / 2) * 10) / 10;
}
