import type {
  ProviderCatalogEntry,
  ProviderRoutingPolicy,
} from "./types";

export const DEFAULT_PROVIDER_CATALOG: ProviderCatalogEntry[] = [
  {
    id: "external-provider-contract",
    label: "External Provider Contract",
    priority: 10,
    capabilities: ["reasoning", "tool_use", "coding", "commerce", "creator"],
    regions: ["eu-central", "eu-west", "us-east"],
    costTier: "standard",
    enabled: true,
    notes: "Catalog entry only — no live provider calls.",
  },
  {
    id: "umtuba-private",
    label: "UMTUBA Private",
    priority: 20,
    capabilities: ["translation", "moderation", "learning"],
    regions: ["eu-central"],
    costTier: "low",
    enabled: true,
    notes: "Private catalog entry — no weights/inference.",
  },
  {
    id: "umtuba-local",
    label: "UMTUBA Local",
    priority: 30,
    capabilities: ["retrieval"],
    regions: ["eu-central"],
    costTier: "low",
    enabled: true,
    notes: "Local catalog entry — no local LLM execution.",
  },
];

export const DEFAULT_PROVIDER_ROUTING_POLICY: ProviderRoutingPolicy = {
  version: "provider-routing-v1",
  providers: DEFAULT_PROVIDER_CATALOG,
  whitelist: null,
  blacklist: [],
  preferredProviderId: "external-provider-contract",
  fallbackProviderIds: ["umtuba-private", "umtuba-local"],
  tenantPreferredProviders: {},
  manualOverrideProviderId: null,
  preferCostTier: "standard",
  maxCostTier: "premium",
  preferRegion: null,
  respectMaintenance: true,
  respectCooldown: true,
  respectHealth: true,
  respectFailureSuppression: true,
  allowPremiumCost: true,
};

export function resolveProviderRoutingPolicy(
  policy?: Partial<ProviderRoutingPolicy> | null
): ProviderRoutingPolicy {
  const base = DEFAULT_PROVIDER_ROUTING_POLICY;
  return {
    ...base,
    ...(policy ?? {}),
    providers: policy?.providers ?? base.providers,
    blacklist: policy?.blacklist ?? base.blacklist,
    fallbackProviderIds:
      policy?.fallbackProviderIds ?? base.fallbackProviderIds,
    tenantPreferredProviders:
      policy?.tenantPreferredProviders ?? base.tenantPreferredProviders,
  };
}
