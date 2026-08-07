/**
 * Human review escalation policy V1.
 */

import type { TranslationQualityFinding, TranslationQualityScore } from "./types";
import type { ProfessionalQualityProfile } from "./thresholds";
import type { TranslationContextPack } from "./contextPacks";

const FINANCIAL_RE =
  /\b(refund|payment|pay|invoice|charge|billing|tax|legal|terms|privacy|password|security|2fa|otp)\b/i;

export function requiresHumanReview(input: {
  sourceText: string;
  targetText?: string | null;
  score?: TranslationQualityScore | null;
  findings?: TranslationQualityFinding[];
  profile?: ProfessionalQualityProfile | null;
  contextPack?: TranslationContextPack | null;
  glossaryConflict?: boolean;
  brandSensitive?: boolean;
  highVisibilityMarketing?: boolean;
  ambiguousSource?: boolean;
  aiDisagreementCount?: number;
}): { required: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const findings = [
    ...(input.findings ?? []),
    ...(input.score?.findings ?? []),
  ];

  if (input.profile?.forceHumanReview) {
    reasons.push(`profile:${input.profile.id}`);
  }
  if (input.contextPack?.id === "commerce") {
    reasons.push("domain:commerce");
  }
  if (FINANCIAL_RE.test(input.sourceText)) {
    reasons.push("legal_financial_or_security_wording");
  }
  if (input.ambiguousSource) reasons.push("ambiguous_source");
  if (input.glossaryConflict) reasons.push("glossary_conflict");
  if (input.brandSensitive) reasons.push("brand_sensitive");
  if (input.highVisibilityMarketing) reasons.push("high_visibility_marketing");
  if ((input.aiDisagreementCount ?? 0) >= 2) {
    reasons.push("repeated_ai_disagreement");
  }

  const semantic =
    input.score?.dimensions.find((d) => d.dimension === "semantic_accuracy")
      ?.score ?? 100;
  if (semantic < 90) reasons.push("low_semantic_score");

  if (findings.some((f) => f.severity === "blocking")) {
    reasons.push("blocking_deterministic_finding");
  }
  if (
    findings.some(
      (f) =>
        f.code === "forbidden_glossary_alternative" ||
        f.code === "required_terminology_missing" ||
        f.code === "do_not_translate_altered"
    )
  ) {
    reasons.push("glossary_conflict");
  }

  return { required: reasons.length > 0, reasons: [...new Set(reasons)] };
}
