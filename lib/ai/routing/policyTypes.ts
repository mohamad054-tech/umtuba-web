/**
 * Routing Policy types — what model to use and when.
 * Independent of aiService; gateway is the consumer.
 *
 * Extension hooks reserve cost/latency/region/tenant policies for later
 * without implementing them in V1.
 */

import type {
  AiCostClass,
  AiDataClassification,
  AiLatencyClass,
  AiModality,
  AiRouteDecision,
} from "../contracts/types";
import type { AiModelCapabilityClass } from "../models/registry";
import type {
  AiModelRef,
  AiModelRegistryEntry,
} from "../models/modelRegistryTypes";

export type AiRoutingPolicyRequest = {
  capabilityId: string;
  requiredModality: AiModality;
  requiresStructuredOutput: boolean;
  requiresTools: boolean;
  estimatedContextTokens: number;
  dataClassification: AiDataClassification;
  /** Optional capability class gate (e.g. structured / tools). */
  requiredCapabilityClass?: AiModelCapabilityClass;
  preferredModel?: AiModelRef;
  /** Explicit fallback chain (tried in order after preferred miss). */
  fallbackModels?: AiModelRef[];
  allowFallback: boolean;
  /**
   * Soft ranking hints — V1 may pass through to reserved hooks only.
   * Deterministic priority/fallbackOrder remains authoritative until hooks activate.
   */
  routingHints?: {
    preferCost?: AiCostClass;
    preferLatency?: AiLatencyClass;
    region?: string;
    tenantId?: string;
  };
};

/**
 * Reserved extension points for future routing policies.
 * V1 default hooks are no-ops (return null / identity).
 */
export type AiRoutingExtensionHooks = {
  /** Future: cost-aware scoring. Return null to skip. */
  scoreCost?: (
    model: AiModelRegistryEntry,
    preferCost?: AiCostClass
  ) => number | null;
  /** Future: latency-aware scoring. Return null to skip. */
  scoreLatency?: (
    model: AiModelRegistryEntry,
    preferLatency?: AiLatencyClass
  ) => number | null;
  /** Future: region-aware scoring. Return null to skip. */
  scoreRegion?: (
    model: AiModelRegistryEntry,
    region?: string
  ) => number | null;
  /** Future: tenant override filter/reorder. Identity in V1. */
  applyTenantOverrides?: (
    models: AiModelRegistryEntry[],
    tenantId?: string
  ) => AiModelRegistryEntry[];
};

export type AiRoutingPolicyDecision = AiRouteDecision & {
  policyId: "default_v1";
};

export function createNoopRoutingExtensionHooks(): AiRoutingExtensionHooks {
  return {
    scoreCost: () => null,
    scoreLatency: () => null,
    scoreRegion: () => null,
    applyTenantOverrides: (models) => models,
  };
}
