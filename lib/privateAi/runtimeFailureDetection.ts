import type {
  PrivateAiRuntimeRecord,
  RuntimeOpsPolicy,
} from "./types";

export type FailureDetectionResult = {
  missedHeartbeat: boolean;
  failureThresholdExceeded: boolean;
  lastSuccessStale: boolean;
  inMaintenance: boolean;
  overrideBlocksAuto: boolean;
  shouldMarkUnhealthy: boolean;
  shouldMarkOffline: boolean;
  reasons: string[];
};

/**
 * Pure failure evaluation — no cron / worker / network.
 */
export function evaluateRuntimeFailureDetection(
  runtime: PrivateAiRuntimeRecord,
  policy: RuntimeOpsPolicy,
  nowIso: string
): FailureDetectionResult {
  const reasons: string[] = [];
  const now = Date.parse(nowIso);

  const inMaintenance = runtime.ops.maintenance.active;
  const overrideBlocksAuto =
    runtime.ops.override.active &&
    (runtime.ops.override.mode === "force_ready" ||
      runtime.ops.override.mode === "pin_primary");

  const lastHb = runtime.health.lastHeartbeatAt
    ? Date.parse(runtime.health.lastHeartbeatAt)
    : null;
  const missedHeartbeat =
    runtime.deploymentState === "ready" &&
    (lastHb === null || now - lastHb > policy.missedHeartbeatMs);
  if (missedHeartbeat) reasons.push("missed_heartbeat");

  const failureThresholdExceeded =
    runtime.health.consecutiveFailures >= policy.consecutiveFailureThreshold;
  if (failureThresholdExceeded) reasons.push("consecutive_failure_threshold");

  const lastSuccess = runtime.health.lastSuccessAt
    ? Date.parse(runtime.health.lastSuccessAt)
    : null;
  const lastSuccessStale =
    runtime.deploymentState === "ready" &&
    (lastSuccess === null || now - lastSuccess > policy.missedHeartbeatMs * 2);
  if (lastSuccessStale) reasons.push("last_success_stale");

  if (inMaintenance) reasons.push("maintenance_mode");
  if (overrideBlocksAuto) reasons.push("manual_override_blocks_auto");

  const shouldMarkUnhealthy =
    !inMaintenance &&
    !overrideBlocksAuto &&
    runtime.deploymentState === "ready" &&
    (missedHeartbeat || failureThresholdExceeded);

  const shouldMarkOffline =
    !inMaintenance &&
    !overrideBlocksAuto &&
    runtime.deploymentState === "unhealthy" &&
    failureThresholdExceeded &&
    runtime.health.consecutiveFailures >= policy.consecutiveFailureThreshold + 2;

  return {
    missedHeartbeat,
    failureThresholdExceeded,
    lastSuccessStale,
    inMaintenance,
    overrideBlocksAuto,
    shouldMarkUnhealthy,
    shouldMarkOffline,
    reasons,
  };
}
