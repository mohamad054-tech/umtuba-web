/**
 * AI Core Provider Foundation V1 — central provider + model registries
 * and fail-closed selection.
 *
 * Extends existing buildProviderRegistry / routeModel / adapters without
 * replacing them. Capabilities never talk to providers by name.
 */

import { AiPlatformError } from "../contracts/errors";
import type { AiRouteDecision } from "../contracts/types";
import type { AiPlatformConfig } from "../config";
import {
  buildProviderRegistry,
  type AiModelDefinition,
  type AiProviderDefinition,
} from "../models/registry";
import { type RouteRequest } from "../routing/router";
import { createRoutingPolicyEngine } from "../routing/policyEngine";
import {
  resolveProviderAdapters,
  type AiProviderAdapter,
} from "./adapters";
import type {
  AiModelFoundationDescriptor,
  AiProviderFoundationDescriptor,
  AiProviderFoundationSnapshot,
  AiProviderRegistration,
} from "./foundationTypes";

function modelKey(providerId: string, modelId: string): string {
  return `${providerId}/${modelId}`;
}

function toFoundationModel(
  model: AiModelDefinition,
  enabled = true
): AiModelFoundationDescriptor {
  return {
    ...model,
    enabled,
  };
}

export class AiProviderFoundation {
  private readonly providers = new Map<string, AiProviderFoundationDescriptor>();
  private readonly models = new Map<string, AiModelFoundationDescriptor>();
  private readonly adapters = new Map<string, AiProviderAdapter>();

  registerProvider(registration: AiProviderRegistration): void {
    const { descriptor, adapter, models } = registration;
    const id = descriptor.providerId.trim();
    if (!id) {
      throw new AiPlatformError("invalid_input", "providerId is required.");
    }
    if (this.providers.has(id)) {
      throw new AiPlatformError(
        "invalid_input",
        `Provider already registered: ${id}`
      );
    }
    this.providers.set(id, {
      providerId: id,
      displayName: descriptor.displayName,
      enabled: descriptor.enabled,
      available: descriptor.available,
    });
    if (adapter) {
      if (adapter.providerId !== id) {
        throw new AiPlatformError(
          "invalid_input",
          "Adapter providerId must match registration."
        );
      }
      this.adapters.set(id, adapter);
    }
    for (const model of models ?? []) {
      this.registerModel(model);
    }
  }

  registerModel(model: AiModelFoundationDescriptor): void {
    const providerId = model.providerId.trim();
    const modelId = model.modelId.trim();
    if (!providerId || !modelId) {
      throw new AiPlatformError(
        "invalid_input",
        "providerId and modelId are required."
      );
    }
    if (!this.providers.has(providerId)) {
      throw new AiPlatformError(
        "invalid_input",
        `Unknown provider for model registration: ${providerId}`
      );
    }
    const key = modelKey(providerId, modelId);
    if (this.models.has(key)) {
      throw new AiPlatformError(
        "invalid_input",
        `Model already registered: ${key}`
      );
    }
    this.models.set(key, {
      ...model,
      providerId,
      modelId,
      enabled: model.enabled,
      available: model.available,
    });
  }

  getProvider(providerId: string): AiProviderFoundationDescriptor | null {
    return this.providers.get(providerId) ?? null;
  }

  requireProvider(providerId: string): AiProviderFoundationDescriptor {
    const provider = this.getProvider(providerId);
    if (!provider) {
      throw new AiPlatformError(
        "invalid_input",
        `Unknown provider: ${providerId}`
      );
    }
    return provider;
  }

  getModel(
    providerId: string,
    modelId: string
  ): AiModelFoundationDescriptor | null {
    return this.models.get(modelKey(providerId, modelId)) ?? null;
  }

  requireModel(
    providerId: string,
    modelId: string
  ): AiModelFoundationDescriptor {
    const model = this.getModel(providerId, modelId);
    if (!model) {
      throw new AiPlatformError(
        "invalid_input",
        `Unknown model: ${providerId}/${modelId}`
      );
    }
    return model;
  }

  requireEnabledModel(
    providerId: string,
    modelId: string
  ): AiModelFoundationDescriptor {
    const provider = this.requireProvider(providerId);
    if (!provider.enabled || !provider.available) {
      throw new AiPlatformError(
        "model_unavailable",
        `Provider is disabled or unavailable: ${providerId}`
      );
    }
    if (!this.adapters.has(providerId)) {
      throw new AiPlatformError(
        "no_provider_configured",
        `Provider has no executable adapter: ${providerId}`
      );
    }
    const model = this.requireModel(providerId, modelId);
    if (!model.enabled || !model.available) {
      throw new AiPlatformError(
        "model_unavailable",
        `Model is disabled or unavailable: ${providerId}/${modelId}`
      );
    }
    return model;
  }

  getAdapter(providerId: string): AiProviderAdapter | null {
    return this.adapters.get(providerId) ?? null;
  }

  requireAdapter(providerId: string): AiProviderAdapter {
    const adapter = this.getAdapter(providerId);
    if (!adapter) {
      throw new AiPlatformError(
        "no_provider_configured",
        `Provider adapter is not registered: ${providerId}`
      );
    }
    return adapter;
  }

  listProviders(): AiProviderFoundationDescriptor[] {
    return [...this.providers.values()].sort((a, b) =>
      a.providerId.localeCompare(b.providerId)
    );
  }

  listModels(): AiModelFoundationDescriptor[] {
    return [...this.models.values()].sort((a, b) =>
      modelKey(a.providerId, a.modelId).localeCompare(
        modelKey(b.providerId, b.modelId)
      )
    );
  }

  /**
   * Shape expected by the existing deterministic router.
   * Only enabled+available providers/models with adapters are exposed.
   */
  toRouterProviders(): AiProviderDefinition[] {
    const byProvider = new Map<string, AiProviderDefinition>();
    for (const provider of this.providers.values()) {
      const selectable =
        provider.enabled &&
        provider.available &&
        this.adapters.has(provider.providerId);
      byProvider.set(provider.providerId, {
        providerId: provider.providerId,
        displayName: provider.displayName,
        available: selectable,
        models: [],
      });
    }
    for (const model of this.models.values()) {
      const bucket = byProvider.get(model.providerId);
      if (!bucket) continue;
      bucket.models.push({
        ...model,
        available:
          bucket.available && model.enabled && model.available,
      });
    }
    return [...byProvider.values()];
  }

  /**
   * Fail-closed route resolution for the gateway.
   * Delegates to Routing Policy Engine (Model Registry + policies).
   * Capabilities must call this (via gateway) — never adapters by name.
   */
  resolveRoute(request: RouteRequest): AiRouteDecision {
    return createRoutingPolicyEngine(this).resolveFromRouteRequest(request);
  }

  snapshot(): AiProviderFoundationSnapshot {
    return {
      providers: this.listProviders(),
      models: this.listModels(),
      executableProviderIds: [...this.adapters.keys()].sort(),
    };
  }
}

/**
 * Seed the foundation from existing config-backed registries/adapters.
 * Registers Gemini/Anthropic/Local when configured.
 */
export function createProviderFoundation(
  config: AiPlatformConfig
): AiProviderFoundation {
  const foundation = new AiProviderFoundation();
  const localConfigured =
    Boolean(config.localBaseUrl) && Boolean(config.localDefaultModel);
  const seeded = buildProviderRegistry({
    openaiConfigured: Boolean(config.openaiApiKey),
    geminiConfigured: Boolean(config.geminiApiKey),
    anthropicConfigured: Boolean(config.anthropicApiKey),
    localConfigured,
    stubEligible: config.allowStub || config.mode === "stub",
    openaiDefaultModel: config.openaiDefaultModel,
    geminiDefaultModel: config.geminiDefaultModel,
    anthropicDefaultModel: config.anthropicDefaultModel,
    localDefaultModel: config.localDefaultModel,
    defaultTimeoutMs: config.defaultTimeoutMs,
  });
  const adapters = resolveProviderAdapters(config);

  for (const provider of seeded) {
    foundation.registerProvider({
      descriptor: {
        providerId: provider.providerId,
        displayName: provider.displayName,
        enabled: true,
        available: provider.available,
      },
      adapter: adapters.get(provider.providerId) ?? null,
      models: provider.models.map((m) => toFoundationModel(m, true)),
    });
  }

  return foundation;
}
