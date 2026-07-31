import { isCooldownActive } from "./runtimeOpsPolicy";
import { eligibilityReasonsForOps } from "./runtimeSelection";
import type {
  AiCapabilityId,
  PersistedPrivateAiState,
  PrivateAiRuntimeRecord,
  RuntimeOpsPolicy,
  RuntimeSelectionCriteria,
} from "./types";

export type FailoverDecision = {
  ok: boolean;
  target: PrivateAiRuntimeRecord | null;
  reason: string;
  rejected: Array<{ runtimeId: string; reasons: string[] }>;
};

/**
 * Choose a failover target using existing routing eligibility + ops guards.
 * No inference / network.
 */
export function decideRuntimeFailover(
  state: PersistedPrivateAiState,
  source: PrivateAiRuntimeRecord,
  policy: RuntimeOpsPolicy,
  nowIso: string,
  criteria?: Partial<RuntimeSelectionCriteria>
): FailoverDecision {
  if (source.ops.override.active && source.ops.override.mode === "block_failover") {
    return {
      ok: false,
      target: null,
      reason: "override_block_failover",
      rejected: [],
    };
  }

  if (isCooldownActive(source.ops.cooldownUntil, nowIso)) {
    return {
      ok: false,
      target: null,
      reason: "cooldown_active",
      rejected: [],
    };
  }

  if (
    source.ops.lastFailoverAt &&
    Date.parse(nowIso) - Date.parse(source.ops.lastFailoverAt) <
      policy.failoverSuppressionMs
  ) {
    return {
      ok: false,
      target: null,
      reason: "failover_suppressed",
      rejected: [],
    };
  }

  const capabilityId =
    criteria?.capabilityId ??
    (source.capabilityIds[0] as AiCapabilityId | undefined);
  if (!capabilityId) {
    return {
      ok: false,
      target: null,
      reason: "no_capability",
      rejected: [],
    };
  }

  const baseCriteria: RuntimeSelectionCriteria = {
    capabilityId,
    providerHint: criteria?.providerHint ?? source.providerHint,
    hardwareContractId:
      criteria?.hardwareContractId ?? source.hardwareContractId,
    region: criteria?.region ?? null,
    preferCostTier: criteria?.preferCostTier ?? source.costTier,
    requireAvailable: true,
  };

  const rejected: FailoverDecision["rejected"] = [];
  const orderedIds = [
    ...source.failoverRuntimeIds,
    ...state.runtimes.map((r) => r.id),
  ];
  const seen = new Set<string>([source.id]);

  for (const id of orderedIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const candidate = state.runtimes.find((r) => r.id === id);
    if (!candidate) continue;
    if (candidate.ops.maintenance.active) {
      rejected.push({ runtimeId: id, reasons: ["maintenance"] });
      continue;
    }
    if (candidate.deploymentState !== "ready") {
      rejected.push({
        runtimeId: id,
        reasons: [`deployment_${candidate.deploymentState}`],
      });
      continue;
    }
    const reasons = eligibilityReasonsForOps(candidate, state, baseCriteria);
    if (reasons.length > 0) {
      rejected.push({ runtimeId: id, reasons });
      continue;
    }
    return {
      ok: true,
      target: candidate,
      reason: "eligible_fallback",
      rejected,
    };
  }

  return {
    ok: false,
    target: null,
    reason: "no_fallback",
    rejected,
  };
}
