import { deploymentStateIsRoutable } from "./deploymentState";
import { evaluateRuntimeReadiness } from "./runtimeReadiness";
import type {
  PersistedPrivateAiState,
  PrivateAiRuntimeRecord,
  RuntimeCostTier,
  RuntimeSelectionCriteria,
  RuntimeSelectionResult,
} from "./types";

const COST_RANK: Record<RuntimeCostTier, number> = {
  low: 0,
  standard: 1,
  high: 2,
  premium: 3,
};

function eligibilityReasons(
  runtime: PrivateAiRuntimeRecord,
  state: PersistedPrivateAiState,
  criteria: RuntimeSelectionCriteria
): string[] {
  const reasons: string[] = [];

  if (!runtime.capabilityIds.includes(criteria.capabilityId)) {
    reasons.push("capability_mismatch");
  }
  if (
    criteria.providerHint &&
    runtime.providerHint &&
    runtime.providerHint !== criteria.providerHint
  ) {
    reasons.push("provider_mismatch");
  }
  if (
    criteria.hardwareContractId &&
    runtime.hardwareContractId &&
    runtime.hardwareContractId !== criteria.hardwareContractId
  ) {
    reasons.push("hardware_mismatch");
  }
  if (criteria.region && runtime.region && runtime.region !== criteria.region) {
    reasons.push("region_mismatch");
  }
  if (!deploymentStateIsRoutable(runtime.deploymentState)) {
    reasons.push(`deployment_${runtime.deploymentState}`);
  }
  if (
    criteria.requireAvailable !== false &&
    runtime.availability === "unavailable"
  ) {
    reasons.push("unavailable");
  }
  const readiness = evaluateRuntimeReadiness(runtime, state);
  if (!readiness.ready) {
    reasons.push(...readiness.blockers.map((b) => `readiness_${b}`));
  }
  return reasons;
}

/**
 * Select a runtime by contract metadata only — no model execution.
 */
export function selectPrivateAiRuntime(
  state: PersistedPrivateAiState,
  criteria: RuntimeSelectionCriteria
): RuntimeSelectionResult {
  const rejected: RuntimeSelectionResult["rejected"] = [];
  const eligible: PrivateAiRuntimeRecord[] = [];

  for (const runtime of state.runtimes) {
    const reasons = eligibilityReasons(runtime, state, criteria);
    if (reasons.length > 0) {
      rejected.push({ runtimeId: runtime.id, reasons });
    } else {
      eligible.push(runtime);
    }
  }

  const candidates = [...eligible].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (criteria.preferCostTier) {
      const prefer = COST_RANK[criteria.preferCostTier];
      const da = Math.abs(COST_RANK[a.costTier] - prefer);
      const db = Math.abs(COST_RANK[b.costTier] - prefer);
      if (da !== db) return da - db;
    }
    if (COST_RANK[a.costTier] !== COST_RANK[b.costTier]) {
      return COST_RANK[a.costTier] - COST_RANK[b.costTier];
    }
    return a.id.localeCompare(b.id);
  });

  const selected = candidates[0] ?? null;
  const failoverChain = selected
    ? buildFailoverChain(selected, state, criteria)
    : [];

  return { selected, candidates, rejected, failoverChain };
}

function buildFailoverChain(
  primary: PrivateAiRuntimeRecord,
  state: PersistedPrivateAiState,
  criteria: RuntimeSelectionCriteria
): string[] {
  const chain: string[] = [];
  const seen = new Set<string>([primary.id]);
  const all = state.runtimes;

  for (const id of primary.failoverRuntimeIds) {
    if (seen.has(id)) continue;
    const rt = all.find((r) => r.id === id);
    if (!rt) continue;
    if (eligibilityReasons(rt, state, { ...criteria, requireAvailable: true }).length === 0) {
      chain.push(id);
      seen.add(id);
    }
  }

  for (const rt of all) {
    if (seen.has(rt.id)) continue;
    if (
      eligibilityReasons(rt, state, { ...criteria, requireAvailable: true }).length === 0
    ) {
      chain.push(rt.id);
      seen.add(rt.id);
    }
  }

  return chain;
}
