import type {
  AiCostClass,
  AiDataClassification,
  AiLatencyClass,
  AiModality,
  AiRouteDecision,
} from "./types";
import type { AiModelDefinition, AiProviderDefinition } from "./providers/registry";
import { findModel, listAvailableModels } from "./providers/registry";
import { AiPlatformError } from "./errors";

export type RouteRequest = {
  capabilityId: string;
  requiredModality: AiModality;
  requiresStructuredOutput: boolean;
  requiresTools: boolean;
  estimatedContextTokens: number;
  preferredLatency?: AiLatencyClass;
  preferredCost?: AiCostClass;
  dataClassification: AiDataClassification;
  preferredProviderId?: string;
  preferredModelId?: string;
  allowFallback: boolean;
};

const DATA_RANK = {
  public: 0,
  internal: 1,
  confidential: 2,
  restricted: 3,
} as const satisfies Record<AiDataClassification, number>;

const COST_RANK = {
  economy: 0,
  standard: 1,
  premium: 2,
} as const satisfies Record<AiCostClass, number>;

const LATENCY_RANK = {
  low: 0,
  standard: 1,
  batch: 2,
} as const satisfies Record<AiLatencyClass, number>;

function canHandleData(
  model: AiModelDefinition,
  classification: AiDataClassification
): boolean {
  return DATA_RANK[classification] <= DATA_RANK[model.dataHandlingMax];
}

export function routeModel(
  providers: AiProviderDefinition[],
  request: RouteRequest
): AiRouteDecision {
  const available = listAvailableModels(providers);
  const considered: string[] = [];

  if (available.length === 0) {
    throw new AiPlatformError(
      "no_provider_configured",
      "No AI provider is configured."
    );
  }

  const eligible = available.filter((model) => {
    const key = `${model.providerId}/${model.modelId}`;
    considered.push(key);
    if (!model.inputModalities.includes(request.requiredModality)) return false;
    if (
      request.requiresStructuredOutput &&
      !model.structuredOutputSupport
    ) {
      return false;
    }
    if (request.requiresTools && !model.toolCallSupport) return false;
    if (model.contextLimitTokens < request.estimatedContextTokens) return false;
    if (!canHandleData(model, request.dataClassification)) return false;
    return true;
  });

  if (eligible.length === 0) {
    throw new AiPlatformError(
      "no_eligible_route",
      "No eligible model for this capability and data classification."
    );
  }

  if (request.preferredProviderId && request.preferredModelId) {
    const preferred = findModel(
      providers,
      request.preferredProviderId,
      request.preferredModelId
    );
    if (
      preferred &&
      preferred.available &&
      eligible.some(
        (m) =>
          m.providerId === preferred.providerId &&
          m.modelId === preferred.modelId
      )
    ) {
      return {
        providerId: preferred.providerId,
        modelId: preferred.modelId,
        reason: "explicit_allowlisted_preference",
        fallbackUsed: false,
        candidatesConsidered: considered,
      };
    }
    if (!request.allowFallback) {
      throw new AiPlatformError(
        "model_unavailable",
        "Preferred model is unavailable and fallback is disabled."
      );
    }
  }

  const ranked = [...eligible].sort((a, b) => {
    const costA = COST_RANK[a.costClass];
    const costB = COST_RANK[b.costClass];
    if (request.preferredCost) {
      const prefer = COST_RANK[request.preferredCost];
      const da = Math.abs(costA - prefer);
      const db = Math.abs(costB - prefer);
      if (da !== db) return da - db;
    } else if (costA !== costB) {
      return costA - costB;
    }
    if (request.preferredLatency) {
      const prefer = LATENCY_RANK[request.preferredLatency];
      const da = Math.abs(LATENCY_RANK[a.latencyClass] - prefer);
      const db = Math.abs(LATENCY_RANK[b.latencyClass] - prefer);
      if (da !== db) return da - db;
    }
    return a.modelId.localeCompare(b.modelId);
  });

  const chosen = ranked[0]!;
  const fallbackUsed = Boolean(
    request.preferredProviderId &&
      request.preferredModelId &&
      (chosen.providerId !== request.preferredProviderId ||
        chosen.modelId !== request.preferredModelId)
  );

  return {
    providerId: chosen.providerId,
    modelId: chosen.modelId,
    reason: fallbackUsed
      ? "deterministic_fallback_after_preference_miss"
      : "deterministic_default_rank",
    fallbackUsed,
    candidatesConsidered: considered,
  };
}
