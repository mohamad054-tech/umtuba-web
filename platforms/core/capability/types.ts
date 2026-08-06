/**
 * Capability catalog contracts (Standards §4 / Spec §3.4, §6).
 *
 * P1: interfaces only.
 * P5: pure in-memory capability registry (no execution/persistence).
 */

import type { UmComplianceStatus } from "../compliance/types";
import type {
  UmArtifactStability,
  UmAuthClass,
  UmCapabilityId,
  UmCapabilityIdentity,
  UmFlagId,
  UmModuleId,
  UmPlatformId,
  UmSideEffectClass,
} from "../identity/types";

export type UmCapabilityRegistryFindingSeverity = "error" | "warning" | "info";

export interface UmCapabilityRegistryFinding {
  readonly code: string;
  readonly severity: UmCapabilityRegistryFindingSeverity;
  readonly message: string;
  readonly path?: string;
  readonly standardRef?: string;
}

/**
 * Opaque string metadata for catalog rows (not executed).
 */
export type UmCapabilityMetadata = Readonly<Record<string, string>>;

/**
 * Capability catalog record (registry row shape — heap only in P5).
 */
export interface UmCapabilityRecord extends UmCapabilityIdentity {
  readonly registeredAt?: string;
  readonly documentationRef?: string;
  readonly metadata?: UmCapabilityMetadata;
  /** Compliance status of the owning registered platform at registration time. */
  readonly owningPlatformComplianceStatus?: UmComplianceStatus;
}

/**
 * Declaration used to register a capability into the catalog.
 */
export interface UmCapabilityDeclaration {
  readonly capabilityId: UmCapabilityId;
  readonly platformId: UmPlatformId;
  readonly moduleId: UmModuleId;
  readonly displayName: string;
  readonly description?: string;
  readonly sideEffectClasses: readonly UmSideEffectClass[];
  readonly authClass: UmAuthClass;
  readonly stability: UmArtifactStability;
  readonly version: string;
  readonly flagId?: UmFlagId;
  readonly documentationRef?: string;
  readonly metadata?: UmCapabilityMetadata;
}

export interface UmCapabilityRegistrationMetadata {
  readonly registeredAt?: string;
  readonly notes?: string;
}

export interface UmCapabilityRegistrationInput {
  readonly capability: UmCapabilityDeclaration;
  readonly registration?: UmCapabilityRegistrationMetadata;
}

export interface UmCapabilityRegistrationResult {
  readonly ok: boolean;
  readonly capabilityId: UmCapabilityId;
  readonly record?: UmCapabilityRecord;
  readonly findings: readonly UmCapabilityRegistryFinding[];
}

/**
 * Capability registry read surface (Standards §4).
 */
export interface UmCapabilityRegistry {
  get(capabilityId: UmCapabilityId): UmCapabilityRecord | undefined;
  list(): readonly UmCapabilityRecord[];
  listByPlatform(platformId: UmPlatformId): readonly UmCapabilityRecord[];
  listByModule(moduleId: UmModuleId): readonly UmCapabilityRecord[];
  listBySideEffectClass(
    sideEffectClass: UmSideEffectClass,
  ): readonly UmCapabilityRecord[];
  listByStability(
    stability: UmArtifactStability,
  ): readonly UmCapabilityRecord[];
  has(capabilityId: UmCapabilityId): boolean;
  size(): number;
}

/**
 * P5 writable in-memory capability registry.
 * Does not execute capabilities, evaluate flags, or persist.
 */
export interface UmInMemoryCapabilityRegistry extends UmCapabilityRegistry {
  register(
    input: UmCapabilityRegistrationInput,
  ): UmCapabilityRegistrationResult;
  /** Clears the in-memory catalog (test/dev helper; not persistence). */
  clear(): void;
}

/**
 * Capability assertion port (SDK-facing) — interface only.
 * Fail-closed semantics are required by Spec; enforcement is later phases.
 */
export interface UmCapabilityAsserter {
  /**
   * Assert a capability is lawfully usable in the current exposure context.
   * MUST fail closed when unknown/disabled/incompatible (Spec §2.5).
   */
  assertEnabled(capabilityId: UmCapabilityId): UmCapabilityAssertionResult;
}

export interface UmCapabilityAssertionResult {
  readonly capabilityId: UmCapabilityId;
  readonly enabled: boolean;
  readonly reasonCode?: string;
  readonly flagId?: UmFlagId;
  readonly stability?: UmArtifactStability;
}
