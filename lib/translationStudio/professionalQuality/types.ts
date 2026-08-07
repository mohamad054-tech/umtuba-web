/**
 * Professional Translation Quality Model V1 — dimensions, scores, findings.
 * Deterministic 0–100 scores. AI confidence ≠ correctness.
 */

export const TRANSLATION_QUALITY_DIMENSIONS = [
  "semantic_accuracy",
  "terminology_compliance",
  "contextual_fit",
  "fluency_naturalness",
  "ui_conciseness",
  "consistency",
  "grammar_spelling",
  "locale_conventions",
  "placeholder_integrity",
  "formatting_integrity",
] as const;

export type TranslationQualityDimension =
  (typeof TRANSLATION_QUALITY_DIMENSIONS)[number];

export type TranslationQualitySeverity =
  | "info"
  | "warning"
  | "error"
  | "blocking";

export type TranslationQualityFindingCode =
  | "missing_translation"
  | "source_copy"
  | "placeholder_missing"
  | "placeholder_extra"
  | "html_tag_mismatch"
  | "whitespace_leading_trailing"
  | "forbidden_glossary_alternative"
  | "required_terminology_missing"
  | "do_not_translate_altered"
  | "punctuation_duplication"
  | "casing_violation"
  | "ui_length_warning"
  | "newline_structure_mismatch"
  | "arabic_ltr_punct_anomaly"
  | "arabic_untranslated_token"
  | "number_placeholder_corruption"
  | "reviewer_finding"
  | "generator_invalid"
  | "reviewer_invalid"
  | "human_review_required"
  | "policy_threshold";

export type TranslationQualityFinding = {
  code: TranslationQualityFindingCode;
  severity: TranslationQualitySeverity;
  dimension: TranslationQualityDimension | "overall";
  message: string;
  /** Optional machine-readable detail (no secrets / full payloads). */
  detail?: Record<string, string | number | boolean | null>;
};

export type TranslationQualityDimensionScore = {
  dimension: TranslationQualityDimension;
  score: number; // 0–100
  weight: number;
};

export type TranslationQualityScore = {
  overall: number; // 0–100 weighted
  dimensions: TranslationQualityDimensionScore[];
  findings: TranslationQualityFinding[];
};

export type TranslationQualityGateDecision =
  | "QUALITY_PASS"
  | "QUALITY_REVIEW_REQUIRED"
  | "QUALITY_BLOCKED";

export type ProfessionalQualityRecommendation =
  | "PASS"
  | "HUMAN_REVIEW"
  | "BLOCK";

/** Default dimension weights for overall score (sum need not be 1; normalized). */
export const DEFAULT_QUALITY_DIMENSION_WEIGHTS: Record<
  TranslationQualityDimension,
  number
> = {
  semantic_accuracy: 1.4,
  terminology_compliance: 1.3,
  contextual_fit: 1.0,
  fluency_naturalness: 1.0,
  ui_conciseness: 0.8,
  consistency: 0.9,
  grammar_spelling: 0.9,
  locale_conventions: 0.7,
  placeholder_integrity: 1.5,
  formatting_integrity: 1.2,
};

export function clampScore100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function computeOverallQualityScore(
  dimensions: TranslationQualityDimensionScore[]
): number {
  let wSum = 0;
  let sSum = 0;
  for (const d of dimensions) {
    const w = d.weight > 0 ? d.weight : 0;
    wSum += w;
    sSum += clampScore100(d.score) * w;
  }
  if (wSum <= 0) return 0;
  return clampScore100(sSum / wSum);
}

export function hasBlockingFindings(
  findings: TranslationQualityFinding[]
): boolean {
  return findings.some((f) => f.severity === "blocking");
}
