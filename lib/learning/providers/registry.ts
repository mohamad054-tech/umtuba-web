import type { LearningProvider } from "./types";

export type LearningProviderRegistry = {
  providers: Map<string, LearningProvider>;
};

export function createLearningProviderRegistry(): LearningProviderRegistry {
  return { providers: new Map() };
}

export function registerLearningProvider(
  registry: LearningProviderRegistry,
  provider: LearningProvider
): { ok: true } | { ok: false; message: string } {
  if (registry.providers.has(provider.id)) {
    return { ok: false, message: "Provider id already registered." };
  }
  if ([...registry.providers.values()].some((p) => p.slug === provider.slug)) {
    return { ok: false, message: "Provider slug already registered." };
  }
  registry.providers.set(provider.id, provider);
  return { ok: true };
}

export function getLearningProvider(
  registry: LearningProviderRegistry,
  providerId: string
): LearningProvider | null {
  return registry.providers.get(providerId) ?? null;
}

export function disableLearningProvider(
  provider: LearningProvider,
  at: string
): LearningProvider {
  return { ...provider, status: "DISABLED", updatedAt: at, disabledAt: at };
}

export function removeLearningProvider(
  provider: LearningProvider,
  at: string
): LearningProvider {
  return { ...provider, status: "REMOVED", updatedAt: at, removedAt: at };
}

export function replaceLearningProvider(
  registry: LearningProviderRegistry,
  provider: LearningProvider
): void {
  registry.providers.set(provider.id, provider);
}
