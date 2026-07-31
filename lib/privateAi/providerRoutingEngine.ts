import { deploymentStateIsRoutable } from "./deploymentState";
import { isCooldownActive, resolveRuntimeOpsPolicy } from "./runtimeOpsPolicy";
import { evaluateRuntimeReadiness } from "./runtimeReadiness";
import { resolveProviderRoutingPolicy } from "./providerRoutingPolicy";
import type {
  AiCapabilityId,
  PersistedPrivateAiState,
  PrivateAiRuntimeRecord,
  ProviderCatalogEntry,
  ProviderRoutingCriteria,
  ProviderRoutingRejection,
  ProviderRoutingResult,
  RuntimeCostTier,
} from "./types";

const COST_RANK: Record<RuntimeCostTier, number> = {
  low: 0,
  standard: 1,
  high: 2,
  premium: 3,
};

type Candidate = {
  provider: ProviderCatalogEntry;
  runtime: PrivateAiRuntimeRecord | null;
};

function findRuntimeForProvider(
  state: PersistedPrivateAiState,
  providerId: string,
  capabilityId: AiCapabilityId
): PrivateAiRuntimeRecord | null {
  const matches = state.runtimes.filter(
    (r) =>
      r.providerHint === providerId && r.capabilityIds.includes(capabilityId)
  );
  if (matches.length === 0) {
    return (
      state.runtimes.find((r) => r.providerHint === providerId) ?? null
    );
  }
  return (
    [...matches].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id))[0] ??
    null
  );
}

function rejectionReasons(
  provider: ProviderCatalogEntry,
  runtime: PrivateAiRuntimeRecord | null,
  state: PersistedPrivateAiState,
  policy: ReturnType<typeof resolveProviderRoutingPolicy>,
  criteria: ProviderRoutingCriteria,
  now: string
): string[] {
  const reasons: string[] = [];

  if (!provider.enabled) reasons.push("provider_disabled");
  if (policy.blacklist.includes(provider.id)) reasons.push("blacklisted");
  if (policy.whitelist && !policy.whitelist.includes(provider.id)) {
    reasons.push("not_whitelisted");
  }
  if (!provider.capabilities.includes(criteria.capabilityId)) {
    reasons.push("capability_mismatch");
  }

  const region = criteria.region ?? policy.preferRegion;
  if (region && provider.regions.length > 0 && !provider.regions.includes(region)) {
    reasons.push("region_mismatch");
  }
  if (!policy.allowPremiumCost && provider.costTier === "premium") {
    reasons.push("cost_tier_blocked");
  }
  if (
    policy.maxCostTier &&
    COST_RANK[provider.costTier] > COST_RANK[policy.maxCostTier]
  ) {
    reasons.push("budget_policy_cost_exceeded");
  }

  if (!runtime) {
    reasons.push("no_runtime_for_provider");
    return reasons;
  }

  if (!deploymentStateIsRoutable(runtime.deploymentState)) {
    reasons.push(`deployment_${runtime.deploymentState}`);
  }
  if (runtime.deploymentState === "offline") {
    reasons.push("runtime_offline");
  }
  if (policy.respectMaintenance && runtime.ops.maintenance.active) {
    reasons.push("maintenance");
  }
  if (
    policy.respectCooldown &&
    isCooldownActive(runtime.ops.cooldownUntil, now)
  ) {
    reasons.push("cooldown_active");
  }
  if (policy.respectFailureSuppression && runtime.ops.lastFailoverAt) {
    const opsPolicy = resolveRuntimeOpsPolicy(state.runtimeOpsPolicy);
    const elapsed =
      Date.parse(now) - Date.parse(runtime.ops.lastFailoverAt);
    if (elapsed < opsPolicy.failoverSuppressionMs) {
      reasons.push("failure_suppressed");
    }
  }
  if (policy.respectHealth && runtime.availability === "unavailable") {
    reasons.push("unhealthy_unavailable");
  }
  if (policy.respectHealth && runtime.health.status === "unhealthy") {
    reasons.push("health_unhealthy");
  }
  const readiness = evaluateRuntimeReadiness(runtime, state);
  if (!readiness.ready) {
    reasons.push(...readiness.blockers.map((b) => `readiness_${b}`));
  }
  if (region && runtime.region && runtime.region !== region) {
    reasons.push("runtime_region_mismatch");
  }

  return reasons;
}

function scoreCandidate(
  c: Candidate,
  policy: ReturnType<typeof resolveProviderRoutingPolicy>,
  criteria: ProviderRoutingCriteria
): number {
  let score = 1000 - c.provider.priority * 10;
  const preferCost = criteria.preferCostTier ?? policy.preferCostTier;
  if (preferCost) {
    score -= Math.abs(COST_RANK[c.provider.costTier] - COST_RANK[preferCost]) * 5;
  }
  if (c.runtime) score -= c.runtime.priority;
  return score;
}

/**
 * Provider Routing Policy Engine — decision contracts only.
 * Does not call Gemini or any live provider.
 */
export function evaluateProviderRouting(
  state: PersistedPrivateAiState,
  criteria: ProviderRoutingCriteria
): ProviderRoutingResult {
  const now = criteria.now ?? new Date().toISOString();
  const policy = resolveProviderRoutingPolicy(state.providerRoutingPolicy);
  const rejected: ProviderRoutingRejection[] = [];
  const eligible: Candidate[] = [];

  for (const provider of policy.providers) {
    const runtime = findRuntimeForProvider(
      state,
      provider.id,
      criteria.capabilityId
    );
    const reasons = rejectionReasons(
      provider,
      runtime,
      state,
      policy,
      criteria,
      now
    );
    if (reasons.length > 0) {
      rejected.push({
        providerId: provider.id,
        runtimeId: runtime?.id ?? null,
        reasons,
      });
    } else {
      eligible.push({ provider, runtime });
    }
  }

  const pickEligible = (providerId: string | null | undefined): Candidate | null => {
    if (!providerId) return null;
    return eligible.find((c) => c.provider.id === providerId) ?? null;
  };

  let selected: Candidate | null = null;
  let selectionReason = "none";

  // Manual override — fail-closed when set but ineligible (no silent fallback).
  let overrideBlocked = false;
  if (policy.manualOverrideProviderId) {
    const override = pickEligible(policy.manualOverrideProviderId);
    if (override) {
      selected = override;
      selectionReason = "manual_override";
    } else {
      overrideBlocked = true;
      rejected.push({
        providerId: policy.manualOverrideProviderId,
        runtimeId: null,
        reasons: ["manual_override_ineligible"],
      });
      selectionReason = "manual_override_blocked";
    }
  }

  if (!overrideBlocked && !selected && criteria.tenantId) {
    const tenantPref =
      policy.tenantPreferredProviders[criteria.tenantId] ?? null;
    const tenantPick = pickEligible(tenantPref);
    if (tenantPick) {
      selected = tenantPick;
      selectionReason = "tenant_policy";
    }
  }

  if (!overrideBlocked && !selected) {
    const preferred = pickEligible(
      criteria.preferredProviderId ?? policy.preferredProviderId
    );
    if (preferred) {
      selected = preferred;
      selectionReason = "preferred_provider";
    }
  }

  if (!overrideBlocked && !selected && eligible.length > 0) {
    selected = [...eligible].sort((a, b) => {
      const sa = scoreCandidate(a, policy, criteria);
      const sb = scoreCandidate(b, policy, criteria);
      if (sb !== sa) return sb - sa;
      return a.provider.id.localeCompare(b.provider.id);
    })[0];
    selectionReason = "priority_score";
  }

  const fallbackChain: string[] = [];
  const seen = new Set<string>();
  if (selected) seen.add(selected.provider.id);

  for (const id of policy.fallbackProviderIds) {
    if (seen.has(id)) continue;
    if (eligible.some((c) => c.provider.id === id)) {
      fallbackChain.push(id);
      seen.add(id);
    }
  }
  for (const c of eligible) {
    if (seen.has(c.provider.id)) continue;
    fallbackChain.push(c.provider.id);
    seen.add(c.provider.id);
  }

  let confidence = 0;
  if (selected) {
    confidence =
      selectionReason === "manual_override"
        ? 1
        : selectionReason === "tenant_policy"
          ? 0.9
          : selectionReason === "preferred_provider"
            ? 0.85
            : 0.7;
    if (fallbackChain.length > 0) confidence = Math.min(1, confidence + 0.05);
  }

  return {
    selectedProviderId: selected?.provider.id ?? null,
    selectedRuntimeId: selected?.runtime?.id ?? null,
    selectionReason,
    rejected,
    fallbackChain,
    policyVersion: policy.version,
    confidence,
    evaluatedAt: now,
  };
}
