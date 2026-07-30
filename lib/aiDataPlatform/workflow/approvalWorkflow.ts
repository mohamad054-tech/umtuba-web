import type { DatasetApprovalState } from "./types";

const FORWARD: Record<DatasetApprovalState, DatasetApprovalState[]> = {
  draft: ["review", "archived"],
  review: ["needs_changes", "approved", "rejected", "draft"],
  needs_changes: ["draft", "review", "archived"],
  approved: ["archived", "needs_changes"],
  rejected: ["draft", "archived"],
  archived: [],
};

export function canTransitionApproval(
  from: DatasetApprovalState,
  to: DatasetApprovalState
): boolean {
  if (from === to) return true;
  return FORWARD[from]?.includes(to) ?? false;
}

export function assertTransitionApproval(
  from: DatasetApprovalState,
  to: DatasetApprovalState
): void {
  if (!canTransitionApproval(from, to)) {
    throw new Error(`Invalid approval transition: ${from} → ${to}`);
  }
}
