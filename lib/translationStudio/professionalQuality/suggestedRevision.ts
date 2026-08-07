/**
 * Suggested revision handling — suggestion only; re-QA before surfacing.
 * Never directly replaces draft. Blocking revision is rejected.
 */

import { runDeterministicTranslationQa } from "./deterministicQa";
import type { ProfessionalTranslationRequestContext } from "./contextBuilder";
import { hasBlockingFindings, type TranslationQualityFinding } from "./types";
import type { TranslationQualityScore } from "./types";

export type SuggestedRevisionDecision = {
  accepted: boolean;
  suggestedRevision: string | null;
  revisionScore: TranslationQualityScore | null;
  rejectionFindings: TranslationQualityFinding[];
};

/**
 * Re-run deterministic QA on a reviewer suggested revision.
 * Reject if it introduces blockers (placeholders, glossary, etc.).
 */
export function evaluateSuggestedRevision(input: {
  context: ProfessionalTranslationRequestContext;
  suggestedRevision: string | null | undefined;
}): SuggestedRevisionDecision {
  const text = input.suggestedRevision?.trim() ?? "";
  if (!text) {
    return {
      accepted: false,
      suggestedRevision: null,
      revisionScore: null,
      rejectionFindings: [],
    };
  }

  const revisionScore = runDeterministicTranslationQa({
    sourceText: input.context.sourceText,
    targetText: text,
    sourceLocale: input.context.sourceLocale,
    targetLocale: input.context.targetLocale,
    glossaryTerms: input.context.glossaryTerms,
    styleGuide: input.context.styleGuide,
  });

  if (hasBlockingFindings(revisionScore.findings)) {
    return {
      accepted: false,
      suggestedRevision: null,
      revisionScore,
      rejectionFindings: [
        {
          code: "reviewer_finding",
          severity: "warning",
          dimension: "overall",
          message:
            "Suggested revision rejected: deterministic QA found blocking issues",
          detail: { reason: "revision_blocker" },
        },
        ...revisionScore.findings.filter((f) => f.severity === "blocking"),
      ],
    };
  }

  return {
    accepted: true,
    suggestedRevision: text,
    revisionScore,
    rejectionFindings: [],
  };
}
