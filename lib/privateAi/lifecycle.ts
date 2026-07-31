import type { PrivateAiLifecycle, PrivateAiWorkflowAction } from "./types";

/**
 * Legal admin workflow transitions only.
 * Training / fine-tuning / inference are never implied by these states.
 */
const FORWARD: Record<PrivateAiLifecycle, PrivateAiLifecycle[]> = {
  draft: ["submitted_for_review", "retired"],
  submitted_for_review: ["changes_requested", "rejected", "approved"],
  changes_requested: ["draft", "submitted_for_review"],
  rejected: ["draft", "retired"],
  approved: ["active", "deprecated", "retired"],
  active: ["deprecated", "retired"],
  deprecated: ["active", "retired"],
  retired: [],
};

export function canTransitionPrivateAiLifecycle(
  from: PrivateAiLifecycle,
  to: PrivateAiLifecycle
): boolean {
  if (from === to) return true;
  return FORWARD[from]?.includes(to) ?? false;
}

export function assertTransitionPrivateAiLifecycle(
  from: PrivateAiLifecycle,
  to: PrivateAiLifecycle
): void {
  if (!canTransitionPrivateAiLifecycle(from, to)) {
    throw new Error(`Invalid private AI lifecycle transition: ${from} → ${to}`);
  }
}

export function listAllowedPrivateAiTransitions(
  from: PrivateAiLifecycle
): PrivateAiLifecycle[] {
  return [...(FORWARD[from] ?? [])];
}

export function workflowActionForTransition(
  to: PrivateAiLifecycle
): PrivateAiWorkflowAction {
  switch (to) {
    case "submitted_for_review":
      return "submit_for_review";
    case "changes_requested":
      return "request_changes";
    case "rejected":
      return "reject";
    case "approved":
      return "approve";
    case "active":
      return "activate";
    case "deprecated":
      return "deprecate";
    case "retired":
      return "retire";
    case "draft":
      return "return_to_draft";
    default:
      return "lifecycle_update";
  }
}

/** Requires a non-empty operator reason. */
export function transitionRequiresReason(to: PrivateAiLifecycle): boolean {
  return to === "changes_requested" || to === "rejected";
}

/**
 * Lifecycle order for admin display (not a linear forced path).
 */
export const PRIVATE_AI_LIFECYCLE_ORDER: PrivateAiLifecycle[] = [
  "draft",
  "submitted_for_review",
  "changes_requested",
  "rejected",
  "approved",
  "active",
  "deprecated",
  "retired",
];
