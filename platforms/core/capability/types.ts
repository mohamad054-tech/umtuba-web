/**
 * Capability catalog contracts (Standards §4 / Spec §3.4, §6).
 */

import type {
  UmArtifactStability,
  UmCapabilityId,
  UmCapabilityIdentity,
  UmFlagId,
  UmModuleId,
  UmPlatformId,
} from "../identity/types";

/**
 * Capability catalog record (registry row shape — not storage).
 */
export interface UmCapabilityRecord extends UmCapabilityIdentity {
  readonly registeredAt?: string;
  readonly documentationRef?: string;
}

/**
 * Capability registry — interface only (Standards: no implementation in P1).
 */
export interface UmCapabilityRegistry {
  get(capabilityId: UmCapabilityId): UmCapabilityRecord | undefined;
  listByPlatform(platformId: UmPlatformId): readonly UmCapabilityRecord[];
  listByModule(moduleId: UmModuleId): readonly UmCapabilityRecord[];
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
