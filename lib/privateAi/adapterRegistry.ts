import { assertTransitionAdapterLifecycle } from "./adapterLifecycle";
import { negotiateAdapter } from "./adapterNegotiation";
import type {
  AdapterLifecycle,
  AdapterNegotiationRequest,
  AdapterNegotiationResult,
  PersistedPrivateAiState,
  ProviderAdapterContract,
} from "./types";

export function evaluateAdapterReadiness(
  adapter: ProviderAdapterContract
): ProviderAdapterContract["readiness"] {
  const blockers: string[] = [];
  if (!adapter.enabled) blockers.push("disabled");
  if (!adapter.available) blockers.push("unavailable");
  if (adapter.lifecycle === "retired") blockers.push("retired");
  if (adapter.lifecycle === "disabled") blockers.push("lifecycle_disabled");
  if (adapter.lifecycle === "unavailable") blockers.push("lifecycle_unavailable");
  if (adapter.lifecycle === "registered" || adapter.lifecycle === "validating") {
    blockers.push(`lifecycle_${adapter.lifecycle}`);
  }
  if (adapter.supportedCapabilities.length < 1) {
    blockers.push("no_capabilities");
  }
  return {
    ready: blockers.length === 0,
    blockers,
    evaluatedAt: new Date().toISOString(),
  };
}

export function registerProviderAdapter(
  state: PersistedPrivateAiState,
  adapter: ProviderAdapterContract
): PersistedPrivateAiState {
  const existing = state.providerAdapters ?? [];
  if (existing.some((a) => a.adapterId === adapter.adapterId)) {
    throw new Error(`Duplicate adapter registration: ${adapter.adapterId}`);
  }
  const withReadiness: ProviderAdapterContract = {
    ...adapter,
    readiness: evaluateAdapterReadiness(adapter),
  };
  return {
    ...state,
    schemaVersion: 9,
    providerAdapters: [...existing, withReadiness],
    updatedAt: withReadiness.updatedAt,
  };
}

export function lookupAdapterById(
  state: PersistedPrivateAiState,
  adapterId: string
): ProviderAdapterContract | null {
  return (state.providerAdapters ?? []).find((a) => a.adapterId === adapterId) ?? null;
}

export function lookupAdapters(state: PersistedPrivateAiState, query: {
  providerId?: string | null;
  capabilityId?: string | null;
  runtimeKind?: string | null;
}): ProviderAdapterContract[] {
  return (state.providerAdapters ?? []).filter((a) => {
    if (query.providerId && a.providerId !== query.providerId) return false;
    if (
      query.capabilityId &&
      !a.supportedCapabilities.includes(
        query.capabilityId as ProviderAdapterContract["supportedCapabilities"][number]
      )
    ) {
      return false;
    }
    if (
      query.runtimeKind &&
      !a.supportedRuntimeKinds.includes(
        query.runtimeKind as ProviderAdapterContract["supportedRuntimeKinds"][number]
      )
    ) {
      return false;
    }
    return true;
  });
}

export function advanceAdapterLifecycle(
  state: PersistedPrivateAiState,
  adapterId: string,
  to: AdapterLifecycle,
  now = new Date().toISOString()
): PersistedPrivateAiState {
  const current = lookupAdapterById(state, adapterId);
  if (!current) throw new Error(`Unknown adapter: ${adapterId}`);
  assertTransitionAdapterLifecycle(current.lifecycle, to);
  const next: ProviderAdapterContract = {
    ...current,
    lifecycle: to,
    enabled: to === "disabled" || to === "retired" ? false : current.enabled,
    available: to === "unavailable" || to === "retired" ? false : current.available,
    updatedAt: now,
  };
  next.readiness = evaluateAdapterReadiness(next);
  return {
    ...state,
    schemaVersion: 9,
    providerAdapters: (state.providerAdapters ?? []).map((a) =>
      a.adapterId === adapterId ? next : a
    ),
    updatedAt: now,
  };
}

export function resolveAdapterForNegotiation(
  state: PersistedPrivateAiState,
  req: AdapterNegotiationRequest
): {
  negotiation: AdapterNegotiationResult;
  adapter: ProviderAdapterContract | null;
} {
  const negotiation = negotiateAdapter(state.providerAdapters ?? [], req);
  const adapter = negotiation.selectedAdapterId
    ? lookupAdapterById(state, negotiation.selectedAdapterId)
    : null;
  return { negotiation, adapter };
}
