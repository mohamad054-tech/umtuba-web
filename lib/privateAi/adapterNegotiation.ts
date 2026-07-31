import { adapterLifecycleAllowsResolution } from "./adapterLifecycle";
import type {
  AdapterNegotiationRequest,
  AdapterNegotiationResult,
  AdapterRejection,
  ProviderAdapterContract,
} from "./types";

function rejectionReasons(
  adapter: ProviderAdapterContract,
  req: AdapterNegotiationRequest
): string[] {
  const reasons: string[] = [];

  if (!adapter.enabled) reasons.push("disabled");
  if (adapter.lifecycle === "retired") reasons.push("lifecycle_retired");
  if (adapter.lifecycle === "disabled") reasons.push("lifecycle_disabled");
  if (!adapter.available) reasons.push("unavailable");
  if (!adapterLifecycleAllowsResolution(adapter.lifecycle)) {
    reasons.push(`lifecycle_${adapter.lifecycle}`);
  }
  if (!adapter.readiness.ready) {
    reasons.push("not_ready");
    reasons.push(
      ...adapter.readiness.blockers.map((b) => `readiness_${b}`)
    );
  }
  if (
    adapter.adapterKind === "contract_test" &&
    req.allowContractTest !== true
  ) {
    reasons.push("contract_test_not_allowed");
  }
  if (!adapter.productionEnabled && req.allowContractTest !== true) {
    reasons.push("not_production_enabled");
  }
  if (req.providerId && adapter.providerId !== req.providerId) {
    reasons.push("provider_mismatch");
  }
  if (!adapter.supportedCapabilities.includes(req.capabilityId)) {
    reasons.push("capability_unsupported");
  }
  if (
    req.modelId &&
    adapter.supportedModels.length > 0 &&
    !adapter.supportedModels.includes(req.modelId) &&
    !adapter.supportedModels.includes("*")
  ) {
    reasons.push("model_unsupported");
  }
  if (
    req.runtimeKind &&
    !adapter.supportedRuntimeKinds.includes(req.runtimeKind)
  ) {
    reasons.push("runtime_kind_unsupported");
  }
  if (req.requireStreaming && !adapter.supportsStreaming) {
    reasons.push("streaming_unsupported");
  }
  if (req.requireStructuredOutput && !adapter.supportsStructuredOutput) {
    reasons.push("structured_output_unsupported");
  }
  if (req.requireCancellation && !adapter.supportsCancellation) {
    reasons.push("cancellation_unsupported");
  }
  if (req.requireTimeout && !adapter.supportsTimeout) {
    reasons.push("timeout_unsupported");
  }
  if (
    req.policyVersion &&
    adapter.minPolicyVersion &&
    req.policyVersion < adapter.minPolicyVersion
  ) {
    reasons.push("policy_version_incompatible");
  }

  return reasons;
}

/**
 * Capability negotiation — fail-closed; no network / inference.
 */
export function negotiateAdapter(
  adapters: ProviderAdapterContract[],
  req: AdapterNegotiationRequest
): AdapterNegotiationResult {
  const now = req.now ?? new Date().toISOString();
  const rejected: AdapterRejection[] = [];
  const eligible: ProviderAdapterContract[] = [];

  for (const adapter of adapters) {
    const reasons = rejectionReasons(adapter, req);
    if (reasons.length > 0) {
      rejected.push({
        adapterId: adapter.adapterId,
        providerId: adapter.providerId,
        reasons,
      });
    } else {
      eligible.push(adapter);
    }
  }

  if (eligible.length === 0) {
    return {
      ok: false,
      selectedAdapterId: null,
      rejected,
      reasons: ["no_eligible_adapter"],
      evaluatedAt: now,
    };
  }

  const preferred =
    (req.providerId
      ? eligible.find((a) => a.providerId === req.providerId)
      : null) ?? eligible[0]!;

  return {
    ok: true,
    selectedAdapterId: preferred.adapterId,
    rejected,
    reasons: [],
    evaluatedAt: now,
  };
}
