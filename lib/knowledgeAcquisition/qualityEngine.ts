import type {
  KnowledgeQualityReport,
  QualityDimensionScore,
} from "./types";

export type QualityScoreInput = {
  title: string;
  contentPreview: string;
  hasMetadata: boolean;
  languageCount: number;
  domainCount: number;
  freshnessDays: number | null;
  mediaHint?: boolean;
  humanReviewed?: boolean;
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function scoreKnowledgeQuality(
  input: QualityScoreInput
): KnowledgeQualityReport {
  const dimensions: QualityDimensionScore[] = [];
  const warnings: string[] = [];
  const blockingFindings: string[] = [];

  const completeness = clamp01(
    (input.title.trim() ? 0.4 : 0) +
      (input.contentPreview.trim().length > 20 ? 0.4 : 0.1) +
      (input.hasMetadata ? 0.2 : 0)
  );
  dimensions.push({
    id: "completeness",
    score: completeness,
    weight: 1,
    detail: "Title, preview body, and metadata presence.",
    blocking: completeness < 0.3,
  });
  if (completeness < 0.3) blockingFindings.push("completeness");

  const consistency =
    input.domainCount > 0 && input.languageCount > 0 ? 0.85 : 0.4;
  dimensions.push({
    id: "consistency",
    score: consistency,
    weight: 0.8,
    detail: "Domains and languages declared.",
    blocking: false,
  });

  const freshness =
    input.freshnessDays == null
      ? 0.6
      : clamp01(1 - Math.min(input.freshnessDays, 365) / 365);
  dimensions.push({
    id: "freshness",
    score: freshness,
    weight: 0.5,
    detail: "Age heuristic from freshnessDays.",
    blocking: false,
  });

  dimensions.push({
    id: "reliability",
    score: 0.75,
    weight: 0.7,
    detail: "Default reliability until human review.",
    blocking: false,
  });
  dimensions.push({
    id: "terminology_quality",
    score: 0.7,
    weight: 0.5,
    detail: "Placeholder until domain terminology pass.",
    blocking: false,
  });
  dimensions.push({
    id: "language_quality",
    score: input.languageCount > 0 ? 0.8 : 0.3,
    weight: 0.6,
    detail: "Language tags present.",
    blocking: input.languageCount === 0,
  });
  if (input.languageCount === 0) {
    blockingFindings.push("language_quality");
    warnings.push("No languages declared.");
  }

  dimensions.push({
    id: "technical_quality",
    score: 0.75,
    weight: 0.5,
    detail: "Structural/technical proxy for V1.",
    blocking: false,
  });
  dimensions.push({
    id: "media_quality",
    score: input.mediaHint ? 0.7 : 1,
    weight: input.mediaHint ? 0.6 : 0,
    detail: input.mediaHint ? "Media asset present." : "Not applicable.",
    blocking: false,
  });
  dimensions.push({
    id: "metadata_quality",
    score: input.hasMetadata ? 0.9 : 0.4,
    weight: 0.7,
    detail: "Required metadata fields.",
    blocking: !input.hasMetadata,
  });
  if (!input.hasMetadata) {
    blockingFindings.push("metadata_quality");
    warnings.push("Metadata incomplete.");
  }

  dimensions.push({
    id: "confidence",
    score: 0.7,
    weight: 0.4,
    detail: "Acquisition confidence proxy.",
    blocking: false,
  });
  dimensions.push({
    id: "human_review",
    score: input.humanReviewed ? 1 : 0.5,
    weight: 0.9,
    detail: "Human review completed?",
    blocking: false,
  });

  const weightSum = dimensions.reduce((s, d) => s + d.weight, 0) || 1;
  const overallScore = clamp01(
    dimensions.reduce((s, d) => s + d.score * d.weight, 0) / weightSum
  );

  return {
    overallScore,
    dimensions,
    warnings,
    blockingFindings,
    scoringMode: "deterministic_v1",
    notes: "Deterministic V1 quality — not a claim of perfect truthfulness.",
  };
}
