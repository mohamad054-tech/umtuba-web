import type { RuntimeOpsPolicy } from "./types";

/** Default ops policy — evaluated in-process; no cron/worker. */
export const DEFAULT_RUNTIME_OPS_POLICY: RuntimeOpsPolicy = {
  missedHeartbeatMs: 60_000,
  consecutiveFailureThreshold: 3,
  consecutiveSuccessThreshold: 2,
  maxRetries: 3,
  retryDelayMs: 5_000,
  cooldownMs: 30_000,
  recoveryGraceMs: 15_000,
  failoverSuppressionMs: 30_000,
};

export function resolveRuntimeOpsPolicy(
  policy?: Partial<RuntimeOpsPolicy> | null
): RuntimeOpsPolicy {
  return { ...DEFAULT_RUNTIME_OPS_POLICY, ...(policy ?? {}) };
}

export function isCooldownActive(
  cooldownUntil: string | null,
  nowIso: string
): boolean {
  if (!cooldownUntil) return false;
  return Date.parse(cooldownUntil) > Date.parse(nowIso);
}

export function cooldownUntilFrom(
  nowIso: string,
  cooldownMs: number
): string {
  return new Date(Date.parse(nowIso) + cooldownMs).toISOString();
}
