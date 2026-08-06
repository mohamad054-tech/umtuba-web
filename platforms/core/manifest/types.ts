/**
 * Manifest model — legal identity document of a platform (Standards §3).
 *
 * Spec §7 — Manifest and Registration Law.
 * Contracts only — no persistence or validation runtime.
 */

import type {
  UmArtifactStability,
  UmCapabilityId,
  UmEventTypeId,
  UmFlagId,
  UmModuleId,
  UmPlatformId,
  UmSideEffectClass,
} from "../identity/types";
import type { UmMaturityLevel } from "../maturity/types";
import type { UmDependencyRequirement } from "../dependency/types";
import type { UmHealthDeclaration } from "../health/types";

/** Accountable owner reference (human or role handle — opaque string). */
export interface UmOwnerRef {
  readonly id: string;
  readonly displayName: string;
  readonly contactRef?: string;
}

/**
 * Module entry inside a platform manifest.
 */
export interface UmManifestModule {
  readonly moduleId: UmModuleId;
  readonly displayName: string;
  readonly description?: string;
  readonly capabilityIds: readonly UmCapabilityId[];
}

/**
 * Capability entry inside a platform manifest.
 */
export interface UmManifestCapability {
  readonly capabilityId: UmCapabilityId;
  readonly moduleId: UmModuleId;
  readonly displayName: string;
  readonly description?: string;
  readonly sideEffectClasses: readonly UmSideEffectClass[];
  readonly stability: UmArtifactStability;
  readonly version: string;
  readonly flagId?: UmFlagId;
}

/**
 * Event type contribution declared by a platform.
 */
export interface UmManifestEventType {
  readonly eventType: UmEventTypeId;
  readonly schemaVersion: string;
  readonly stability: UmArtifactStability;
  readonly description?: string;
}

/**
 * Flag contribution declared by a platform (meaning owned by platform; policy law by Core).
 */
export interface UmManifestFlag {
  readonly flagId: UmFlagId;
  readonly defaultState: "on" | "off";
  readonly linkedCapabilityIds: readonly UmCapabilityId[];
  readonly dangerElevated: boolean;
  readonly description?: string;
}

/**
 * Navigation contribution declaration (Spec Ch.12) — structural only in P1.
 */
export interface UmManifestNavContribution {
  readonly contributionId: string;
  readonly navClass:
    | "discovery"
    | "destination"
    | "creator_hub"
    | "domain_hub"
    | "workspace"
    | "internal"
    | "admin"
    | "other";
  readonly hrefHint?: string;
  readonly capabilityId?: UmCapabilityId;
}

/**
 * Full platform manifest (Standards §3.4 required fields).
 */
export interface UmPlatformManifest {
  readonly platformId: UmPlatformId;
  readonly platformVersion: string;
  readonly displayName: string;
  readonly owners: readonly UmOwnerRef[];
  readonly modules: readonly UmManifestModule[];
  readonly capabilities: readonly UmManifestCapability[];
  readonly providesEvents: readonly UmManifestEventType[];
  readonly requires: readonly UmDependencyRequirement[];
  readonly flags: readonly UmManifestFlag[];
  readonly health: UmHealthDeclaration;
  readonly sideEffectSummary: readonly UmSideEffectClass[];
  readonly maturityLevel: UmMaturityLevel;
  readonly documentationRefs: readonly string[];
  readonly soTStatement: string;
  readonly nonOwnershipStatement: string;
  readonly navContributions?: readonly UmManifestNavContribution[];
}
