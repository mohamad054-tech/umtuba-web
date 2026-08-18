/**
 * In-memory store provider registry + adapter interface.
 */

import type { StoreCapabilityMatrix, StoreProvider, StoreProviderAdapter } from "./types";
import { STORE_PROVIDER_MODES } from "./types";

export type StoreProviderRegistry = {
  providers: Map<string, StoreProvider>;
  adapters: Map<string, StoreProviderAdapter>;
};

export function createStoreProviderRegistry(): StoreProviderRegistry {
  return { providers: new Map(), adapters: new Map() };
}

export function registerStoreProvider(
  registry: StoreProviderRegistry,
  provider: StoreProvider,
  adapter?: StoreProviderAdapter
): { ok: true } | { ok: false; message: string } {
  if (registry.providers.has(provider.id)) {
    return { ok: false, message: "Provider id already registered." };
  }
  if (![...registry.providers.values()].every((p) => p.slug !== provider.slug)) {
    return { ok: false, message: "Provider slug already registered." };
  }
  if (adapter && adapter.mode !== provider.mode) {
    return { ok: false, message: "Adapter mode must match provider mode." };
  }
  registry.providers.set(provider.id, provider);
  if (adapter) registry.adapters.set(provider.id, adapter);
  return { ok: true };
}

export function getStoreProvider(
  registry: StoreProviderRegistry,
  providerId: string
): StoreProvider | null {
  return registry.providers.get(providerId) ?? null;
}

export function listStoreCapabilityMatrix(
  provider: StoreProvider
): StoreCapabilityMatrix {
  return {
    modes: STORE_PROVIDER_MODES.filter((mode) => mode === provider.mode),
    rights: provider.rights,
    ownership: provider.ownership,
  };
}

export function disableStoreProvider(
  provider: StoreProvider,
  at: string
): StoreProvider {
  return {
    ...provider,
    status: "DISABLED",
    updatedAt: at,
    disabledAt: at,
  };
}

export function removeStoreProvider(
  provider: StoreProvider,
  at: string
): StoreProvider {
  return {
    ...provider,
    status: "REMOVED",
    updatedAt: at,
    removedAt: at,
  };
}

export function replaceStoreProvider(
  registry: StoreProviderRegistry,
  provider: StoreProvider
): void {
  registry.providers.set(provider.id, provider);
}
