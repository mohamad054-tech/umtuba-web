/**
 * Professional quality gates + domain profiles (configurable policy objects).
 */

import type { StudioLanguageCode } from "../types";
import {
  clampScore100,
  hasBlockingFindings,
  type TranslationQualityDimension,
  type TranslationQualityFinding,
  type TranslationQualityGateDecision,
  type TranslationQualityScore,
} from "./types";

export type ProfessionalQualityProfileId =
  | "standard_ui"
  | "commerce_sensitive"
  | "learning_content"
  | "legal_financial"
  | "marketing";

export type ProfessionalQualityThresholds = {
  overallMin: number;
  semanticAccuracyMin: number;
  /** Protected glossary terms must score exactly this (typically 100). */
  terminologyComplianceMin: number;
  placeholderIntegrityMin: number;
  formattingIntegrityMin: number;
  /** Soft dimensions that trigger review when below (not block alone). */
  fluencyReviewBelow?: number;
  contextualFitReviewBelow?: number;
};

export type ProfessionalQualityProfile = {
  id: ProfessionalQualityProfileId;
  label: string;
  thresholds: ProfessionalQualityThresholds;
  /** Always escalate to human when profile applies. */
  forceHumanReview?: boolean;
};

export const STANDARD_UI_THRESHOLDS: ProfessionalQualityThresholds = {
  overallMin: 90,
  semanticAccuracyMin: 90,
  terminologyComplianceMin: 100,
  placeholderIntegrityMin: 100,
  formattingIntegrityMin: 100,
  fluencyReviewBelow: 85,
  contextualFitReviewBelow: 85,
};

export const COMMERCE_SENSITIVE_THRESHOLDS: ProfessionalQualityThresholds = {
  overallMin: 93,
  semanticAccuracyMin: 95,
  terminologyComplianceMin: 100,
  placeholderIntegrityMin: 100,
  formattingIntegrityMin: 100,
  fluencyReviewBelow: 90,
  contextualFitReviewBelow: 90,
};

export const LEGAL_FINANCIAL_THRESHOLDS: ProfessionalQualityThresholds = {
  overallMin: 95,
  semanticAccuracyMin: 97,
  terminologyComplianceMin: 100,
  placeholderIntegrityMin: 100,
  formattingIntegrityMin: 100,
  fluencyReviewBelow: 92,
  contextualFitReviewBelow: 92,
};

export const LEARNING_CONTENT_THRESHOLDS: ProfessionalQualityThresholds = {
  overallMin: 90,
  semanticAccuracyMin: 92,
  terminologyComplianceMin: 100,
  placeholderIntegrityMin: 100,
  formattingIntegrityMin: 100,
  fluencyReviewBelow: 88,
  contextualFitReviewBelow: 88,
};

export const MARKETING_THRESHOLDS: ProfessionalQualityThresholds = {
  overallMin: 92,
  semanticAccuracyMin: 92,
  terminologyComplianceMin: 100,
  placeholderIntegrityMin: 100,
  formattingIntegrityMin: 100,
  fluencyReviewBelow: 90,
  contextualFitReviewBelow: 90,
};

export const PROFESSIONAL_QUALITY_PROFILES: Record<
  ProfessionalQualityProfileId,
  ProfessionalQualityProfile
> = {
  standard_ui: {
    id: "standard_ui",
    label: "Standard UI",
    thresholds: STANDARD_UI_THRESHOLDS,
  },
  commerce_sensitive: {
    id: "commerce_sensitive",
    label: "Commerce sensitive",
    thresholds: COMMERCE_SENSITIVE_THRESHOLDS,
    forceHumanReview: true,
  },
  learning_content: {
    id: "learning_content",
    label: "Learning content",
    thresholds: LEARNING_CONTENT_THRESHOLDS,
  },
  legal_financial: {
    id: "legal_financial",
    label: "Legal / financial",
    thresholds: LEGAL_FINANCIAL_THRESHOLDS,
    forceHumanReview: true,
  },
  marketing: {
    id: "marketing",
    label: "Marketing / high-visibility",
    thresholds: MARKETING_THRESHOLDS,
    forceHumanReview: true,
  },
};

function dimScore(
  score: TranslationQualityScore,
  dim: TranslationQualityDimension
): number {
  return (
    score.dimensions.find((d) => d.dimension === dim)?.score ??
    clampScore100(0)
  );
}

export function evaluateQualityGate(input: {
  score: TranslationQualityScore;
  thresholds?: ProfessionalQualityThresholds;
  profile?: ProfessionalQualityProfile;
  extraFindings?: TranslationQualityFinding[];
}): {
  decision: TranslationQualityGateDecision;
  findings: TranslationQualityFinding[];
} {
  const thresholds =
    input.thresholds ??
    input.profile?.thresholds ??
    STANDARD_UI_THRESHOLDS;
  const findings = [
    ...input.score.findings,
    ...(input.extraFindings ?? []),
  ];

  if (hasBlockingFindings(findings)) {
    return { decision: "QUALITY_BLOCKED", findings };
  }

  const overall = clampScore100(input.score.overall);
  const semantic = dimScore(input.score, "semantic_accuracy");
  const terminology = dimScore(input.score, "terminology_compliance");
  const placeholders = dimScore(input.score, "placeholder_integrity");
  const formatting = dimScore(input.score, "formatting_integrity");

  const hardFails: TranslationQualityFinding[] = [];
  if (overall < thresholds.overallMin) {
    hardFails.push({
      code: "policy_threshold",
      severity: "error",
      dimension: "overall",
      message: `Overall score ${overall} below minimum ${thresholds.overallMin}`,
      detail: { overall, min: thresholds.overallMin },
    });
  }
  if (semantic < thresholds.semanticAccuracyMin) {
    hardFails.push({
      code: "policy_threshold",
      severity: "error",
      dimension: "semantic_accuracy",
      message: `Semantic accuracy ${semantic} below minimum ${thresholds.semanticAccuracyMin}`,
    });
  }
  if (terminology < thresholds.terminologyComplianceMin) {
    hardFails.push({
      code: "policy_threshold",
      severity: "blocking",
      dimension: "terminology_compliance",
      message: `Terminology compliance ${terminology} below required ${thresholds.terminologyComplianceMin}`,
    });
  }
  if (placeholders < thresholds.placeholderIntegrityMin) {
    hardFails.push({
      code: "policy_threshold",
      severity: "blocking",
      dimension: "placeholder_integrity",
      message: `Placeholder integrity ${placeholders} below required ${thresholds.placeholderIntegrityMin}`,
    });
  }
  if (formatting < thresholds.formattingIntegrityMin) {
    hardFails.push({
      code: "policy_threshold",
      severity: "blocking",
      dimension: "formatting_integrity",
      message: `Formatting integrity ${formatting} below required ${thresholds.formattingIntegrityMin}`,
    });
  }

  const merged = [...findings, ...hardFails];
  if (hasBlockingFindings(merged) || hardFails.some((f) => f.severity === "blocking")) {
    return { decision: "QUALITY_BLOCKED", findings: merged };
  }
  if (hardFails.length > 0 || input.profile?.forceHumanReview) {
    return { decision: "QUALITY_REVIEW_REQUIRED", findings: merged };
  }

  const fluency = dimScore(input.score, "fluency_naturalness");
  const contextual = dimScore(input.score, "contextual_fit");
  if (
    (thresholds.fluencyReviewBelow != null &&
      fluency < thresholds.fluencyReviewBelow) ||
    (thresholds.contextualFitReviewBelow != null &&
      contextual < thresholds.contextualFitReviewBelow)
  ) {
    return {
      decision: "QUALITY_REVIEW_REQUIRED",
      findings: [
        ...merged,
        {
          code: "policy_threshold",
          severity: "warning",
          dimension: "overall",
          message: "Soft dimension below review threshold",
        },
      ],
    };
  }

  return { decision: "QUALITY_PASS", findings: merged };
}

export function resolveQualityProfileForDomain(
  domainScope: string | null | undefined
): ProfessionalQualityProfile {
  const s = (domainScope ?? "").toLowerCase();
  if (
    s.includes("legal") ||
    s.includes("refund") ||
    s.includes("payment") ||
    s.includes("financial")
  ) {
    return PROFESSIONAL_QUALITY_PROFILES.legal_financial;
  }
  if (s.includes("commerce") || s.includes("store") || s.includes("seller")) {
    return PROFESSIONAL_QUALITY_PROFILES.commerce_sensitive;
  }
  if (s.includes("learning") || s.includes("course") || s.includes("lesson")) {
    return PROFESSIONAL_QUALITY_PROFILES.learning_content;
  }
  if (s.includes("marketing") || s.includes("promo")) {
    return PROFESSIONAL_QUALITY_PROFILES.marketing;
  }
  return PROFESSIONAL_QUALITY_PROFILES.standard_ui;
}

export function isSupportedQualityLocale(
  code: string
): code is StudioLanguageCode {
  return ["ar", "en", "fr", "es", "de", "pt"].includes(code);
}
