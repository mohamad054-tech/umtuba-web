import type { InferenceRequestLifecycle } from "./types";

const FORWARD: Record<InferenceRequestLifecycle, InferenceRequestLifecycle[]> = {
  pending: ["validated", "rejected"],
  validated: ["accepted", "rejected"],
  accepted: ["queued", "running", "rejected", "cancelled"],
  queued: ["running", "cancelled", "timed_out", "rejected"],
  running: ["completed", "failed", "cancelled", "timed_out"],
  completed: [],
  /** Contract retry may re-queue without executing inference. */
  failed: ["queued"],
  cancelled: [],
  rejected: [],
  timed_out: ["queued"],
};

export const INFERENCE_REQUEST_LIFECYCLE_ORDER: InferenceRequestLifecycle[] = [
  "pending",
  "validated",
  "accepted",
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
  "rejected",
  "timed_out",
];

export function canTransitionInferenceRequest(
  from: InferenceRequestLifecycle,
  to: InferenceRequestLifecycle
): boolean {
  if (from === to) return true;
  return FORWARD[from]?.includes(to) ?? false;
}

export function assertTransitionInferenceRequest(
  from: InferenceRequestLifecycle,
  to: InferenceRequestLifecycle
): void {
  if (!canTransitionInferenceRequest(from, to)) {
    throw new Error(`Invalid inference request transition: ${from} → ${to}`);
  }
}

export function listAllowedInferenceRequestTransitions(
  from: InferenceRequestLifecycle
): InferenceRequestLifecycle[] {
  return [...(FORWARD[from] ?? [])];
}

/** Truly terminal — no further contract transitions. */
export function isTerminalInferenceLifecycle(
  state: InferenceRequestLifecycle
): boolean {
  return (
    state === "completed" || state === "cancelled" || state === "rejected"
  );
}

/** Closed for cancel/advance except explicit retry re-queue. */
export function isClosedInferenceLifecycle(
  state: InferenceRequestLifecycle
): boolean {
  return (
    state === "completed" ||
    state === "cancelled" ||
    state === "rejected" ||
    state === "failed" ||
    state === "timed_out"
  );
}
