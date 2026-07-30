/**
 * AI Core Model Registry V1 — formal catalog for Shared AI Core.
 *
 * Built from Provider Foundation descriptors; adds priority + fallbackOrder.
 * Does not execute providers — Routing Policy selects; adapters execute.
 */

import { AiPlatformError } from "../contracts/errors";
import type { AiModelFoundationDescriptor } from "../providers/foundationTypes";
import type { AiProviderFoundation } from "../providers/foundation";
import type { AiCostClass } from "../contracts/types";
import type {
  AiModelRef,
  AiModelRegistryEntry,
} from "./modelRegistryTypes";
import { modelRegistryKey } from "./modelRegistryTypes";

function defaultPriority(costClass: AiCostClass): number {
  switch (costClass) {
    case "economy":
      return 10;
    case "standard":
      return 20;
    case "premium":
      return 40;
    default:
      return 50;
  }
}

function defaultFallbackOrder(
  costClass: AiCostClass,
  fallbackEligible: boolean
): number {
  if (!fallbackEligible) return 1_000;
  switch (costClass) {
    case "economy":
      return 10;
    case "standard":
      return 20;
    case "premium":
      return 80;
    default:
      return 100;
  }
}

export function toModelRegistryEntry(
  model: AiModelFoundationDescriptor,
  overrides?: Partial<
    Pick<AiModelRegistryEntry, "priority" | "fallbackOrder" | "outputLimitTokens">
  >
): AiModelRegistryEntry {
  return {
    providerId: model.providerId,
    modelId: model.modelId,
    displayName: model.displayName,
    supportedCapabilities: [...model.capabilityClasses],
    inputModalities: [...model.inputModalities],
    outputModalities: [...model.outputModalities],
    enabled: model.enabled,
    available: model.available,
    priority: overrides?.priority ?? defaultPriority(model.costClass),
    fallbackOrder:
      overrides?.fallbackOrder ??
      defaultFallbackOrder(model.costClass, model.fallbackEligible),
    contextLimitTokens: model.contextLimitTokens,
    outputLimitTokens: overrides?.outputLimitTokens ?? null,
    structuredOutputSupport: model.structuredOutputSupport,
    toolCallSupport: model.toolCallSupport,
    streamingSupport: model.streamingSupport,
    costClass: model.costClass,
    latencyClass: model.latencyClass,
    dataHandlingMax: model.dataHandlingMax,
    fallbackEligible: model.fallbackEligible,
    defaultTimeoutMs: model.defaultTimeoutMs,
    inputCostPer1M: model.inputCostPer1M,
    outputCostPer1M: model.outputCostPer1M,
  };
}

export class AiModelRegistry {
  private readonly models = new Map<string, AiModelRegistryEntry>();

  register(entry: AiModelRegistryEntry): void {
    const providerId = entry.providerId.trim();
    const modelId = entry.modelId.trim();
    if (!providerId || !modelId) {
      throw new AiPlatformError(
        "invalid_input",
        "providerId and modelId are required."
      );
    }
    const key = modelRegistryKey({ providerId, modelId });
    if (this.models.has(key)) {
      throw new AiPlatformError(
        "invalid_input",
        `Model already registered: ${key}`
      );
    }
    this.models.set(key, {
      ...entry,
      providerId,
      modelId,
    });
  }

  get(providerId: string, modelId: string): AiModelRegistryEntry | null {
    return this.models.get(modelRegistryKey({ providerId, modelId })) ?? null;
  }

  require(providerId: string, modelId: string): AiModelRegistryEntry {
    const entry = this.get(providerId, modelId);
    if (!entry) {
      throw new AiPlatformError(
        "invalid_input",
        `Unknown model: ${providerId}/${modelId}`
      );
    }
    return entry;
  }

  list(): AiModelRegistryEntry[] {
    return [...this.models.values()].sort((a, b) =>
      modelRegistryKey(a).localeCompare(modelRegistryKey(b))
    );
  }

  listEnabled(): AiModelRegistryEntry[] {
    return this.list().filter((m) => m.enabled && m.available);
  }

  static fromFoundation(foundation: AiProviderFoundation): AiModelRegistry {
    const registry = new AiModelRegistry();
    for (const model of foundation.listModels()) {
      registry.register(toModelRegistryEntry(model));
    }
    return registry;
  }
}

export type { AiModelRef, AiModelRegistryEntry };
