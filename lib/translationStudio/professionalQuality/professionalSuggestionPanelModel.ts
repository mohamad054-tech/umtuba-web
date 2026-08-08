/**
 * Pure view-model for ProfessionalSuggestionPanel (testable without DOM).
 */

import { TRANSLATION_QUALITY_DIMENSIONS } from "./types";
import type { SuggestionQualityMetadata } from "../types";

const DIMENSION_LABELS: Record<string, string> = {
  semantic_accuracy: "Semantic",
  terminology_compliance: "Terminology",
  contextual_fit: "Context",
  fluency_naturalness: "Fluency",
  ui_conciseness: "UI length",
  consistency: "Consistency",
  grammar_spelling: "Grammar",
  locale_conventions: "Locale",
  placeholder_integrity: "Placeholders",
  formatting_integrity: "Formatting",
};

export type ProfessionalSuggestionPanelViewModel = {
  recommendation: "PASS" | "HUMAN_REVIEW" | "BLOCK";
  humanReviewRequired: boolean;
  overallScore: number | null;
  providerId: string | null;
  modelId: string | null;
  dimensions: Array<{
    id: string;
    label: string;
    score: number | null;
    integrityCritical: boolean;
    blocking: boolean;
  }>;
  placeholderIntegrityBlocking: boolean;
  formattingIntegrityBlocking: boolean;
  findings: Array<{ code: string; severity: string; message: string }>;
  disqualifierCodes: string[];
  suggestedRevision: string | null;
  safetyCopy: string;
};

export function buildProfessionalSuggestionPanelViewModel(
  quality: SuggestionQualityMetadata
): ProfessionalSuggestionPanelViewModel | null {
  const pq = quality.professionalQuality;
  if (!pq || pq.tag !== "professional_quality_v1") return null;

  const report = (pq.report ?? {}) as {
    deterministicFindings?: Array<{
      code: string;
      severity: string;
      message: string;
      dimension?: string;
    }>;
    reviewerFindings?: Array<{
      code: string;
      severity: string;
      message: string;
      dimension?: string;
    }>;
    dimensionScores?: Array<{ dimension: string; score: number }>;
  };

  const scoreByDim = new Map(
    (report.dimensionScores ?? []).map((d) => [d.dimension, d.score])
  );

  const findings = [
    ...(report.deterministicFindings ?? []),
    ...(report.reviewerFindings ?? []),
  ];

  const dimensions = TRANSLATION_QUALITY_DIMENSIONS.map((id) => {
    const score = scoreByDim.has(id) ? scoreByDim.get(id)! : null;
    const integrityCritical =
      id === "placeholder_integrity" || id === "formatting_integrity";
    const blocking = findings.some(
      (f) =>
        (f.dimension === id ||
          f.code.toLowerCase().includes(id) ||
          (id === "placeholder_integrity" &&
            /placeholder/i.test(f.code + f.message)) ||
          (id === "formatting_integrity" &&
            /format/i.test(f.code + f.message))) &&
        (f.severity === "blocking" || f.severity === "error")
    );
    return {
      id,
      label: DIMENSION_LABELS[id] ?? id,
      score,
      integrityCritical,
      blocking:
        blocking ||
        (integrityCritical && typeof score === "number" && score < 100),
    };
  });

  const placeholderIntegrityBlocking = Boolean(
    dimensions.find((d) => d.id === "placeholder_integrity")?.blocking
  );
  const formattingIntegrityBlocking = Boolean(
    dimensions.find((d) => d.id === "formatting_integrity")?.blocking
  );

  const disqualifierCodes = findings
    .filter((f) => f.severity === "blocking" || f.severity === "error")
    .map((f) => f.code)
    .slice(0, 12);

  return {
    recommendation: pq.recommendation,
    humanReviewRequired: Boolean(pq.humanReviewRequired),
    overallScore: typeof pq.overallScore === "number" ? pq.overallScore : null,
    providerId: pq.providerId,
    modelId: pq.modelId,
    dimensions,
    placeholderIntegrityBlocking,
    formattingIntegrityBlocking,
    findings: findings
      .filter(
        (f) =>
          f.severity === "blocking" ||
          f.severity === "error" ||
          f.severity === "warning"
      )
      .slice(0, 8)
      .map((f) => ({
        code: f.code,
        severity: f.severity,
        message: f.message.slice(0, 200),
      })),
    disqualifierCodes,
    suggestedRevision: pq.suggestedRevision ?? null,
    safetyCopy:
      "AI output is NOT applied, approved, or published automatically. Use Apply candidate to draft, then existing Submit / Approve / Publish controls.",
  };
}
