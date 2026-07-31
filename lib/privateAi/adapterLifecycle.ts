import type { AdapterLifecycle } from "./types";

const FORWARD: Record<AdapterLifecycle, AdapterLifecycle[]> = {
  registered: ["validating", "disabled", "retired"],
  validating: ["ready", "unavailable", "disabled", "retired"],
  ready: ["degraded", "unavailable", "disabled", "retired"],
  degraded: ["ready", "unavailable", "disabled", "retired"],
  unavailable: ["validating", "ready", "disabled", "retired"],
  disabled: ["registered", "validating", "retired"],
  retired: [],
};

export function canTransitionAdapterLifecycle(
  from: AdapterLifecycle,
  to: AdapterLifecycle
): boolean {
  if (from === to) return true;
  return FORWARD[from]?.includes(to) ?? false;
}

export function assertTransitionAdapterLifecycle(
  from: AdapterLifecycle,
  to: AdapterLifecycle
): void {
  if (!canTransitionAdapterLifecycle(from, to)) {
    throw new Error(`Invalid adapter lifecycle transition: ${from} → ${to}`);
  }
}

export function listAllowedAdapterTransitions(
  from: AdapterLifecycle
): AdapterLifecycle[] {
  return [...(FORWARD[from] ?? [])];
}

export const ADAPTER_LIFECYCLE_ORDER: AdapterLifecycle[] = [
  "registered",
  "validating",
  "ready",
  "degraded",
  "unavailable",
  "disabled",
  "retired",
];

export function adapterLifecycleAllowsResolution(
  lifecycle: AdapterLifecycle
): boolean {
  return lifecycle === "ready" || lifecycle === "degraded";
}
