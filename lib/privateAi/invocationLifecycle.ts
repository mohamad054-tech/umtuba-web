import type { InvocationLifecycle } from "./types";

const FORWARD: Record<InvocationLifecycle, InvocationLifecycle[]> = {
  created: ["validating", "blocked", "cancelled"],
  validating: ["ready", "blocked", "cancelled", "timed_out"],
  ready: ["invoking", "blocked", "cancelled", "timed_out", "retry_scheduled"],
  invoking: ["awaiting_result", "failed", "cancelled", "timed_out", "blocked"],
  awaiting_result: ["succeeded", "failed", "cancelled", "timed_out"],
  failed: ["retry_scheduled", "exhausted", "cancelled"],
  retry_scheduled: ["ready", "exhausted", "cancelled", "timed_out"],
  succeeded: [],
  cancelled: [],
  timed_out: ["retry_scheduled", "exhausted"],
  exhausted: [],
  blocked: [],
};

export function canTransitionInvocationLifecycle(
  from: InvocationLifecycle,
  to: InvocationLifecycle
): boolean {
  if (from === to) return true;
  return FORWARD[from]?.includes(to) ?? false;
}

export function assertTransitionInvocationLifecycle(
  from: InvocationLifecycle,
  to: InvocationLifecycle
): void {
  if (!canTransitionInvocationLifecycle(from, to)) {
    throw new Error(
      `Invalid invocation lifecycle transition: ${from} → ${to}`
    );
  }
}

export function listAllowedInvocationTransitions(
  from: InvocationLifecycle
): InvocationLifecycle[] {
  return [...(FORWARD[from] ?? [])];
}

export const INVOCATION_LIFECYCLE_ORDER: InvocationLifecycle[] = [
  "created",
  "validating",
  "ready",
  "invoking",
  "awaiting_result",
  "succeeded",
  "failed",
  "cancelled",
  "timed_out",
  "retry_scheduled",
  "exhausted",
  "blocked",
];

export function isTerminalInvocationLifecycle(
  lifecycle: InvocationLifecycle
): boolean {
  return (
    lifecycle === "succeeded" ||
    lifecycle === "cancelled" ||
    lifecycle === "exhausted" ||
    lifecycle === "blocked"
  );
}

export function isActiveInvocationLifecycle(
  lifecycle: InvocationLifecycle
): boolean {
  return (
    lifecycle === "created" ||
    lifecycle === "validating" ||
    lifecycle === "ready" ||
    lifecycle === "invoking" ||
    lifecycle === "awaiting_result" ||
    lifecycle === "retry_scheduled"
  );
}
