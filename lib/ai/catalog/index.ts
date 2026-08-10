export type {
  AiCapabilityCatalogEntry,
  AiCapabilityCategory,
  AiCapabilityExecutionSurface,
  AiCapabilityLifecycle,
  AiCapabilityStability,
  AiCapabilityVisibility,
  CapabilityCompatibilityResult,
  CapabilityLookupQuery,
  CapabilityValidationResult,
  CapabilityVersionNegotiation,
} from "./types";

export {
  buildBuiltinCapabilityCatalogEntries,
  listExecutableSharedCapabilityIds,
} from "./definitions";

export {
  checkCapabilityCompatibility,
  validateCapabilityEntry,
  versionsCompatible,
} from "./validation";

export {
  AiCapabilityServiceRegistry,
  createCapabilityCatalogRegistry,
  getCapabilityCatalogRegistry,
  resetCapabilityCatalogRegistryForTests,
} from "./registry";
