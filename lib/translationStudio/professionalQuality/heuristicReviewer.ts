/**
 * Heuristic / scripted professional reviewer for tests and offline demos.
 * Not a live model — produces structured scores from deterministic signals + light heuristics.
 */

import type {
  ProfessionalTranslationReviewer,
  ProfessionalTranslationReviewResult,
} from "./aiContracts";
import type { TranslationQualityDimension, TranslationQualityFinding } from "./types";

/**
 * Scripted reviewer that reacts to known patterns (Arabic calques, commerce, etc.).
 * Remains independent from generator (different kind + model id).
 */
export function createHeuristicProfessionalReviewer(options?: {
  providerId?: string;
  modelId?: string;
}): ProfessionalTranslationReviewer {
  const providerId = options?.providerId ?? "heuristic";
  const modelId = options?.modelId ?? "heuristic-reviewer-v1";

  return {
    kind: "professional_reviewer",
    async review(input): Promise<ProfessionalTranslationReviewResult> {
      const findings: TranslationQualityFinding[] = [];
      const scores: Partial<Record<TranslationQualityDimension, number>> = {
        semantic_accuracy: 92,
        terminology_compliance: 100,
        contextual_fit: 90,
        fluency_naturalness: 90,
        ui_conciseness: 92,
        consistency: 90,
        grammar_spelling: 92,
        locale_conventions: 90,
        placeholder_integrity: 100,
        formatting_integrity: 100,
      };

      // Preserve absolute integrity from deterministic findings.
      if (
        input.deterministicFindings.some(
          (f) =>
            f.severity === "blocking" &&
            (f.dimension === "placeholder_integrity" ||
              f.code.startsWith("placeholder"))
        )
      ) {
        scores.placeholder_integrity = 0;
      }
      if (
        input.deterministicFindings.some(
          (f) =>
            f.severity === "blocking" &&
            (f.code.includes("glossary") ||
              f.code.includes("terminology") ||
              f.code.includes("do_not_translate"))
        )
      ) {
        scores.terminology_compliance = 0;
      }

      const target = input.targetText;
      const source = input.sourceText;

      // Arabic literal-sounding calque heuristic (safe, limited).
      if (input.targetLocale === "ar") {
        const literalMarkers = [
          /من فضلك انقر هنا/i,
          /اضغط هنا من أجل/i,
          /الريفند/,
          /الداشبورد/,
        ];
        if (literalMarkers.some((re) => re.test(target))) {
          scores.fluency_naturalness = 55;
          scores.semantic_accuracy = 70;
          findings.push({
            code: "reviewer_finding",
            severity: "warning",
            dimension: "fluency_naturalness",
            message:
              "Arabic sounds literal / calqued; prefer natural MSA UI phrasing",
          });
        }
        // Natural short UI Arabic — accept.
        if (
          target.length <= 24 &&
          /[\u0600-\u06FF]/.test(target) &&
          !literalMarkers.some((re) => re.test(target))
        ) {
          scores.fluency_naturalness = Math.max(
            scores.fluency_naturalness ?? 90,
            93
          );
        }
      }

      // Semantic mismatch toy signal: empty or identical when locales differ.
      if (!target.trim()) {
        scores.semantic_accuracy = 0;
        findings.push({
          code: "reviewer_finding",
          severity: "blocking",
          dimension: "semantic_accuracy",
          message: "Missing target translation",
        });
      } else if (
        input.sourceLocale !== input.targetLocale &&
        target.trim() === source.trim()
      ) {
        scores.semantic_accuracy = 35;
        findings.push({
          code: "reviewer_finding",
          severity: "error",
          dimension: "semantic_accuracy",
          message: "Target appears to be an untranslated source copy",
        });
      }

      // Learning clarity nudge.
      if (input.context.contextPack.id === "learning") {
        scores.contextual_fit = Math.min(scores.contextual_fit ?? 90, 88);
        findings.push({
          code: "reviewer_finding",
          severity: "info",
          dimension: "contextual_fit",
          message:
            "Learning content: verify pedagogical clarity and factual meaning",
        });
      }

      // Never echo generator confidence — independent fixed band.
      const confidence = 0.55;

      return {
        dimensionScores: scores,
        findings,
        confidence,
        provider: { providerId, modelId },
      };
    },
  };
}
