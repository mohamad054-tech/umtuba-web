/**
 * AI Core Routing Policy Engine V1.
 *
 * Selects which registered model to use. Independent of aiService.
 * Capabilities must never pick models directly — only via gateway → this layer.
 *
 * Uses Model Registry + Provider Foundation (adapter readiness).
 * Reuses fail-closed semantics; deterministic by priority then fallbackOrder.
 */

import { AiPlatformError } from "../contracts/errors";
import type { AiDataClassification } from "../contracts/types";
import type { AiProviderFoundation } from "../providers/foundation";
import {
  AiModelRegistry,
  type AiModelRegistryEntry,
} from "../models/modelRegistry";
import type { AiModelRef } from "../models/modelRegistryTypes";
import { modelRegistryKey } from "../models/modelRegistryTypes";
import type { RouteRequest } from "./router";
import {
  createNoopRoutingExtensionHooks,
  type AiRoutingExtensionHooks,
  type AiRoutingPolicyDecision,
  type AiRoutingPolicyRequest,
} from "./policyTypes";

const DATA_RANK = {
  public: 0,
  internal: 1,
  confidential: 2,
  restricted: 3,
} as const satisfies Record<AiDataClassification, number>;

export type AiRoutingPolicyEngineOptions = {
  foundation: AiProviderFoundation;
  registry?: AiModelRegistry;
  hooks?: AiRoutingExtensionHooks;
};

export class AiRoutingPolicyEngine {
  private readonly foundation: AiProviderFoundation;
  private readonly registry: AiModelRegistry;
  private readonly hooks: AiRoutingExtensionHooks;

  constructor(options: AiRoutingPolicyEngineOptions) {
    this.foundation = options.foundation;
    this.registry =
      options.registry ?? AiModelRegistry.fromFoundation(options.foundation);
    this.hooks = {
      ...createNoopRoutingExtensionHooks(),
      ...options.hooks,
    };
  }

  getRegistry(): AiModelRegistry {
    return this.registry;
  }

  /**
   * Fail-closed model selection for gateway runs.
   */
  resolve(request: AiRoutingPolicyRequest): AiRoutingPolicyDecision {
    if (this.foundation.snapshot().executableProviderIds.length === 0) {
      throw new AiPlatformError(
        "no_provider_configured",
        "No AI provider adapter is registered."
      );
    }

    const considered: string[] = [];
    let pool = this.registry.list().filter((model) => {
      considered.push(modelRegistryKey(model));
      return this.isExecutableCandidate(model);
    });

    pool = this.hooks.applyTenantOverrides?.(
      pool,
      request.routingHints?.tenantId
    ) ?? pool;

    const eligible = pool.filter((model) => this.isEligible(model, request));

    if (request.preferredModel) {
      const pref = this.requireKnownRef(request.preferredModel);
      if (!this.supportsRequest(pref, request)) {
        if (!request.allowFallback) {
          throw new AiPlatformError(
            "no_eligible_route",
            "Preferred model does not support this capability requirement."
          );
        }
      } else if (!pref.enabled || !pref.available) {
        if (!request.allowFallback) {
          throw new AiPlatformError(
            "model_unavailable",
            `Model is disabled or unavailable: ${modelRegistryKey(pref)}`
          );
        }
      } else if (!this.isExecutableCandidate(pref)) {
        if (!request.allowFallback) {
          throw new AiPlatformError(
            "no_provider_configured",
            `Provider adapter is not registered: ${pref.providerId}`
          );
        }
      } else if (eligible.some((m) => sameRef(m, pref))) {
        return decision(pref, "policy_preferred_model", false, considered);
      } else if (!request.allowFallback) {
        throw new AiPlatformError(
          "no_eligible_route",
          "Preferred model is not eligible for this request."
        );
      }
    }

    for (const ref of request.fallbackModels ?? []) {
      const fb = this.requireKnownRef(ref);
      if (
        fb.enabled &&
        fb.available &&
        this.isExecutableCandidate(fb) &&
        this.supportsRequest(fb, request) &&
        eligible.some((m) => sameRef(m, fb))
      ) {
        return decision(
          fb,
          "policy_explicit_fallback_model",
          Boolean(request.preferredModel),
          considered
        );
      }
    }

    if (eligible.length === 0) {
      throw new AiPlatformError(
        "no_eligible_route",
        "No eligible model for this capability and data classification."
      );
    }

    const ranked = this.rankDeterministic(eligible, request);
    const chosen = ranked[0]!;
    const fallbackUsed = Boolean(
      request.preferredModel &&
        (chosen.providerId !== request.preferredModel.providerId ||
          chosen.modelId !== request.preferredModel.modelId)
    );

    return decision(
      chosen,
      fallbackUsed
        ? "policy_deterministic_fallback"
        : "policy_deterministic_default",
      fallbackUsed,
      considered
    );
  }

  /**
   * Adapter from legacy RouteRequest (Provider Foundation / router).
   */
  resolveFromRouteRequest(request: RouteRequest): AiRoutingPolicyDecision {
    return this.resolve({
      capabilityId: request.capabilityId,
      requiredModality: request.requiredModality,
      requiresStructuredOutput: request.requiresStructuredOutput,
      requiresTools: request.requiresTools,
      estimatedContextTokens: request.estimatedContextTokens,
      dataClassification: request.dataClassification,
      requiredCapabilityClass: request.requiresStructuredOutput
        ? "structured"
        : request.requiresTools
          ? "tools"
          : undefined,
      preferredModel:
        request.preferredProviderId && request.preferredModelId
          ? {
              providerId: request.preferredProviderId,
              modelId: request.preferredModelId,
            }
          : undefined,
      allowFallback: request.allowFallback,
      routingHints: {
        preferCost: request.preferredCost,
        preferLatency: request.preferredLatency,
      },
    });
  }

  private requireKnownRef(ref: AiModelRef): AiModelRegistryEntry {
    this.foundation.requireProvider(ref.providerId);
    return this.registry.require(ref.providerId, ref.modelId);
  }

  private isExecutableCandidate(model: AiModelRegistryEntry): boolean {
    const provider = this.foundation.getProvider(model.providerId);
    if (!provider?.enabled || !provider.available) return false;
    if (!this.foundation.getAdapter(model.providerId)) return false;
    return model.enabled && model.available;
  }

  private supportsRequest(
    model: AiModelRegistryEntry,
    request: AiRoutingPolicyRequest
  ): boolean {
    if (!model.inputModalities.includes(request.requiredModality)) return false;
    if (
      request.requiredCapabilityClass &&
      !model.supportedCapabilities.includes(request.requiredCapabilityClass)
    ) {
      return false;
    }
    if (request.requiresStructuredOutput && !model.structuredOutputSupport) {
      return false;
    }
    if (request.requiresTools && !model.toolCallSupport) return false;
    if (model.contextLimitTokens < request.estimatedContextTokens) return false;
    if (!canHandleData(model, request.dataClassification)) return false;
    return true;
  }

  private isEligible(
    model: AiModelRegistryEntry,
    request: AiRoutingPolicyRequest
  ): boolean {
    return this.supportsRequest(model, request);
  }

  private rankDeterministic(
    eligible: AiModelRegistryEntry[],
    request: AiRoutingPolicyRequest
  ): AiModelRegistryEntry[] {
    return [...eligible].sort((a, b) => {
      // Reserved hooks: only applied when they return a number.
      const hint = request.routingHints;
      const costA = this.hooks.scoreCost?.(a, hint?.preferCost);
      const costB = this.hooks.scoreCost?.(b, hint?.preferCost);
      if (costA != null && costB != null && costA !== costB) return costA - costB;

      const latA = this.hooks.scoreLatency?.(a, hint?.preferLatency);
      const latB = this.hooks.scoreLatency?.(b, hint?.preferLatency);
      if (latA != null && latB != null && latA !== latB) return latA - latB;

      const regA = this.hooks.scoreRegion?.(a, hint?.region);
      const regB = this.hooks.scoreRegion?.(b, hint?.region);
      if (regA != null && regB != null && regA !== regB) return regA - regB;

      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.fallbackOrder !== b.fallbackOrder) {
        return a.fallbackOrder - b.fallbackOrder;
      }
      return modelRegistryKey(a).localeCompare(modelRegistryKey(b));
    });
  }
}

function canHandleData(
  model: AiModelRegistryEntry,
  classification: AiDataClassification
): boolean {
  return DATA_RANK[classification] <= DATA_RANK[model.dataHandlingMax];
}

function sameRef(a: AiModelRef, b: AiModelRef): boolean {
  return a.providerId === b.providerId && a.modelId === b.modelId;
}

function decision(
  model: AiModelRegistryEntry,
  reason: string,
  fallbackUsed: boolean,
  candidatesConsidered: string[]
): AiRoutingPolicyDecision {
  return {
    providerId: model.providerId,
    modelId: model.modelId,
    reason,
    fallbackUsed,
    candidatesConsidered,
    policyId: "default_v1",
  };
}

export function createRoutingPolicyEngine(
  foundation: AiProviderFoundation,
  options?: Omit<AiRoutingPolicyEngineOptions, "foundation">
): AiRoutingPolicyEngine {
  return new AiRoutingPolicyEngine({ foundation, ...options });
}
