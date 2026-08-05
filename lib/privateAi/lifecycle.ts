import type { PrivateAiLifecycle } from "./types";

const FORWARD: Record<PrivateAiLifecycle, PrivateAiLifecycle[]> = {
  draft: ["training_planned", "archived"],
  training_planned: ["training_running", "draft", "archived"],
  training_running: ["evaluation", "draft", "archived"],
  evaluation: ["candidate", "draft", "archived"],
  candidate: ["approved", "evaluation", "deprecated"],
  approved: ["production", "candidate", "deprecated"],
  production: ["deprecated", "archived"],
  deprecated: ["archived", "production"],
  archived: [],
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

/**
 * Lifecycle metadata only — never starts training or inference.
 */
export const PRIVATE_AI_LIFECYCLE_ORDER: PrivateAiLifecycle[] = [
  "draft",
  "training_planned",
  "training_running",
  "evaluation",
  "candidate",
  "approved",
  "production",
  "deprecated",
  "archived",
];
