import type {
  ModelLifecycle,
  PromotionGateChecklist,
  PromotionQueueEntry,
} from "./types";

const FORWARD: Record<ModelLifecycle, ModelLifecycle[]> = {
  draft: ["candidate", "archived"],
  candidate: ["internal_testing", "draft", "archived"],
  internal_testing: ["approved", "candidate", "deprecated"],
  approved: ["production", "internal_testing", "deprecated"],
  production: ["deprecated", "archived"],
  deprecated: ["archived", "production"],
  archived: [],
};

export function canPromoteModel(
  from: ModelLifecycle,
  to: ModelLifecycle
): boolean {
  if (from === to) return true;
  return FORWARD[from]?.includes(to) ?? false;
}

/**
 * Promotion is never automatic. All checklist flags must be true.
 */
export function evaluatePromotionGates(input: {
  fromStatus: ModelLifecycle;
  toStatus: ModelLifecycle;
  checklist: PromotionGateChecklist;
}): { eligible: boolean; blockers: string[] } {
  const blockers: string[] = [];
  if (!canPromoteModel(input.fromStatus, input.toStatus)) {
    blockers.push(`invalid_transition_${input.fromStatus}_to_${input.toStatus}`);
  }
  if (!input.checklist.datasetApproved) blockers.push("dataset_approval_required");
  if (!input.checklist.rightsApproved) blockers.push("rights_approval_required");
  if (!input.checklist.qualityApproved) blockers.push("quality_approval_required");
  if (!input.checklist.evaluationApproved) {
    blockers.push("evaluation_approval_required");
  }
  if (!input.checklist.humanApproved) blockers.push("human_approval_required");

  return { eligible: blockers.length === 0, blockers };
}

export function createPromotionQueueEntry(input: {
  id: string;
  modelId: string;
  fromStatus: ModelLifecycle;
  toStatus: ModelLifecycle;
  checklist: PromotionGateChecklist;
  requestedBy?: string | null;
  notes?: string;
  now?: string;
}): PromotionQueueEntry {
  const now = input.now ?? new Date().toISOString();
  const gate = evaluatePromotionGates({
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    checklist: input.checklist,
  });
  return {
    id: input.id,
    modelId: input.modelId,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    checklist: input.checklist,
    eligible: gate.eligible,
    blockers: gate.blockers,
    requestedBy: input.requestedBy ?? null,
    notes: input.notes ?? "",
    createdAt: now,
    updatedAt: now,
  };
}

export const EMPTY_PROMOTION_CHECKLIST: PromotionGateChecklist = {
  datasetApproved: false,
  rightsApproved: false,
  qualityApproved: false,
  evaluationApproved: false,
  humanApproved: false,
};
