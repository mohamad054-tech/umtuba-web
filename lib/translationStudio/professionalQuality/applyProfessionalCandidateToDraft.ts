/**
 * Apply a professional candidate suggestion into draft text only.
 * Never approve / submit / publish.
 */

import type { TranslationStudioWorkflow } from "../workflow/workflowService";
import type { StudioTranslationValue } from "../types";

export type ApplyProfessionalCandidateResult =
  | {
      ok: true;
      suggestionId: string;
      valueId: string;
      keyId: string;
      previousStatus: StudioTranslationValue["status"];
      nextStatus: "draft";
      candidateLength: number;
    }
  | { ok: false; reason: string };

/**
 * Copy professional suggestion candidateText into the value as a draft.
 * Fail-closed if suggestion missing or not professional-tagged.
 */
export function applyProfessionalCandidateToDraft(input: {
  workflow: TranslationStudioWorkflow;
  suggestionId: string;
  actorUserId: string;
}): ApplyProfessionalCandidateResult {
  const snap = input.workflow.getSnapshot();
  const suggestion = snap.suggestions.find((s) => s.id === input.suggestionId);
  if (!suggestion) {
    return { ok: false, reason: "suggestion_not_found" };
  }
  const pq = suggestion.quality.professionalQuality;
  if (!pq || pq.tag !== "professional_quality_v1") {
    return { ok: false, reason: "not_professional_candidate" };
  }
  const candidate = suggestion.candidateText?.trim() ?? "";
  if (!candidate) {
    return { ok: false, reason: "empty_candidate" };
  }
  const value = snap.values.find((v) => v.id === suggestion.valueId);
  if (!value) {
    return { ok: false, reason: "value_not_found" };
  }
  const previousStatus = value.status;
  const updated = input.workflow.saveDraft({
    valueId: value.id,
    text: suggestion.candidateText,
    actor: { userId: input.actorUserId },
    note: "apply_professional_candidate_to_draft",
  });
  if (updated.status !== "draft") {
    return { ok: false, reason: "unexpected_status_after_draft_write" };
  }
  return {
    ok: true,
    suggestionId: suggestion.id,
    valueId: value.id,
    keyId: value.keyId,
    previousStatus,
    nextStatus: "draft",
    candidateLength: candidate.length,
  };
}
