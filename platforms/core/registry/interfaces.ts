/**
 * Core registries — control-plane contracts + P4 in-memory platform registry.
 *
 * P1: interfaces only.
 * P4: pure in-process platform catalog (no persistence/networking/runtime).
 */

import type { UmCapabilityRegistry } from "../capability/types";
import type { UmComplianceResult, UmComplianceStatus } from "../compliance/types";
import type { UmDependencyRegistry } from "../dependency/types";
import type { UmEventTypeRegistry } from "../event/types";
import type { UmFlagRegistry } from "../flag/types";
import type { UmHealthRegistry } from "../health/types";
import type {
  UmArtifactStability,
  UmCapabilityId,
  UmFlagId,
  UmModuleId,
  UmPlatformId,
  UmSideEffectClass,
} from "../identity/types";
import type { UmPlatformManifest } from "../manifest/types";
import type { UmMaturityLevel } from "../maturity/types";
import type { UmNamingRegistry } from "../naming/types";
import type { UmValidationResult } from "../validation/interfaces";

export type UmRegistryFindingSeverity = "error" | "warning" | "info";

export interface UmRegistryFinding {
  readonly code: string;
  readonly severity: UmRegistryFindingSeverity;
  readonly message: string;
  readonly path?: string;
  readonly standardRef?: string;
}

/**
 * Module catalog row derived from a registered manifest (in-memory only).
 */
export interface UmRegisteredModuleCatalogEntry {
  readonly moduleId: UmModuleId;
  readonly displayName: string;
  readonly capabilityIds: readonly UmCapabilityId[];
}

/**
 * Capability catalog row derived from a registered manifest (in-memory only).
 */
export interface UmRegisteredCapabilityCatalogEntry {
  readonly capabilityId: UmCapabilityId;
  readonly moduleId: UmModuleId;
  readonly displayName: string;
  readonly version: string;
  readonly stability: UmArtifactStability;
  readonly sideEffectClasses: readonly UmSideEffectClass[];
  readonly flagId?: UmFlagId;
}

/**
 * Registration metadata — pass-through only (no clock in the registry).
 */
export interface UmRegistrationMetadata {
  readonly registeredAt?: string;
  readonly registrationSource?: string;
  readonly notes?: string;
}

/**
 * Platform catalog record stored by the in-memory registry.
 */
export interface UmPlatformRecord {
  readonly platformId: UmPlatformId;
  readonly displayName: string;
  readonly platformVersion: string;
  readonly maturityLevel: UmMaturityLevel;
  readonly complianceStatus: UmComplianceStatus;
  readonly manifest: UmPlatformManifest;
  readonly validation: UmValidationResult;
  readonly compliance: UmComplianceResult;
  readonly modules: readonly UmRegisteredModuleCatalogEntry[];
  readonly capabilities: readonly UmRegisteredCapabilityCatalogEntry[];
  readonly registration: UmRegistrationMetadata;
  /** Convenience mirror of `registration.registeredAt` when provided. */
  readonly registeredAt?: string;
}

/**
 * Input to register a platform into the in-memory catalog.
 * If validation/compliance are omitted, P2/P3 engines run in-process.
 */
export interface UmPlatformRegistrationInput {
  readonly manifest: UmPlatformManifest;
  readonly validation?: UmValidationResult;
  readonly compliance?: UmComplianceResult;
  readonly registration?: UmRegistrationMetadata;
}

export interface UmPlatformRegistrationResult {
  readonly ok: boolean;
  readonly platformId: UmPlatformId;
  readonly record?: UmPlatformRecord;
  readonly findings: readonly UmRegistryFinding[];
}

/**
 * Platform registry read surface (Standards §15).
 */
export interface UmPlatformRegistry {
  get(platformId: UmPlatformId): UmPlatformRecord | undefined;
  list(): readonly UmPlatformRecord[];
}

/**
 * P4 writable in-memory platform registry.
 * Does not persist, network, discover, or execute.
 */
export interface UmInMemoryPlatformRegistry extends UmPlatformRegistry {
  register(input: UmPlatformRegistrationInput): UmPlatformRegistrationResult;
  has(platformId: UmPlatformId): boolean;
  size(): number;
  /** Clears the in-memory catalog (test/dev helper; not persistence). */
  clear(): void;
}

/**
 * Aggregate Core registry facade — interface only.
 * Implementations MUST NOT import product platforms (Spec §5.3).
 */
export interface UmCoreRegistry {
  readonly platforms: UmPlatformRegistry;
  readonly capabilities: UmCapabilityRegistry;
  readonly events: UmEventTypeRegistry;
  readonly flags: UmFlagRegistry;
  readonly health: UmHealthRegistry;
  readonly dependencies: UmDependencyRegistry;
  readonly naming: UmNamingRegistry;
}
