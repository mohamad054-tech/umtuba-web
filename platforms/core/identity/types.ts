/**
 * Formal identity vocabulary for UM Core.
 *
 * Spec Ch.3 — Platform Identity.
 * Standards §2 Naming, §4 Capability, §24 Maturity.
 *
 * Contracts only — no runtime.
 */

/** Durable machine identifier string (opaque to Core semantics beyond uniqueness rules). */
export type UmCoreId = string;

/** Platform machine ID (e.g. hypothetical "commerce"). */
export type UmPlatformId = UmCoreId;

/** Module machine ID scoped under a platform. */
export type UmModuleId = UmCoreId;

/** Capability machine ID. */
export type UmCapabilityId = UmCoreId;

/** Event type machine ID. */
export type UmEventTypeId = UmCoreId;

/** Feature flag machine ID. */
export type UmFlagId = UmCoreId;

/** Extension machine ID. */
export type UmExtensionId = UmCoreId;

/** Contract machine ID. */
export type UmContractId = UmCoreId;

/** Job / async work type machine ID. */
export type UmJobTypeId = UmCoreId;

/** Runtime environment machine ID. */
export type UmRuntimeId = UmCoreId;

/** Service provider machine ID. */
export type UmServiceId = UmCoreId;

/**
 * Artifact kind catalog (Standards §2.4).
 */
export type UmNamedArtifactKind =
  | "platform"
  | "module"
  | "capability"
  | "event_type"
  | "flag"
  | "job"
  | "contract"
  | "extension"
  | "service"
  | "runtime";

/**
 * Stability channel for named artifacts (Standards §2.4).
 */
export type UmArtifactStability = "experimental" | "stable" | "deprecated";

/**
 * Capability side-effect classes (Spec §6.3 / Standards §4.4).
 * Combinations are represented as a readonly list.
 */
export type UmSideEffectClass =
  | "read"
  | "write"
  | "money"
  | "ai"
  | "admin"
  | "network_external";

/**
 * Authentication expectation class (logical — not an auth implementation).
 */
export type UmAuthClass =
  | "none"
  | "authenticated"
  | "platform_admin"
  | "capability_scoped"
  | "service_identity";

/**
 * A Platform is a sovereign product or foundational domain (Spec §3.2).
 */
export interface UmPlatformIdentity {
  readonly platformId: UmPlatformId;
  readonly displayName: string;
  readonly description?: string;
}

/**
 * A Module is a named subunit of a platform (Spec §3.3).
 */
export interface UmModuleIdentity {
  readonly moduleId: UmModuleId;
  readonly platformId: UmPlatformId;
  readonly displayName: string;
  readonly description?: string;
}

/**
 * A Capability is a stable unit of behavior identity (Spec §3.4).
 * Execution remains with the providing platform — Core only names it.
 */
export interface UmCapabilityIdentity {
  readonly capabilityId: UmCapabilityId;
  readonly platformId: UmPlatformId;
  readonly moduleId: UmModuleId;
  readonly displayName: string;
  readonly description?: string;
  readonly sideEffectClasses: readonly UmSideEffectClass[];
  readonly authClass: UmAuthClass;
  readonly stability: UmArtifactStability;
  readonly flagId?: UmFlagId;
  readonly version: string;
}

/**
 * A Service implements capabilities at runtime (Spec §3.5).
 * Replaceable; ownership is not casually replaceable.
 */
export interface UmServiceIdentity {
  readonly serviceId: UmServiceId;
  readonly platformId: UmPlatformId;
  readonly providesCapabilityIds: readonly UmCapabilityId[];
  readonly displayName: string;
}

/**
 * A Runtime is an execution environment (Spec §3.6).
 */
export interface UmRuntimeIdentity {
  readonly runtimeId: UmRuntimeId;
  readonly displayName: string;
  readonly kind: "web" | "worker" | "mobile" | "private_host" | "edge" | "other";
}

/**
 * An Extension contributes through Core extension law (Spec §3.7).
 */
export interface UmExtensionIdentity {
  readonly extensionId: UmExtensionId;
  readonly displayName: string;
  readonly trustTier: UmExtensionTrustTier;
}

/**
 * Trust tiers (Standards §8.4).
 */
export type UmExtensionTrustTier = "first_party" | "third_party";

/**
 * Peer kernel marker — specialized foundational platform (Spec §3.12 / Ch.18).
 * Informational in P1; Core does not absorb peer truth.
 */
export type UmPeerKernelKind = "ueos" | "ai_execution" | "translation" | "unified_content" | "other";

export interface UmPeerKernelAnnotation {
  readonly platformId: UmPlatformId;
  readonly peerKernelKind: UmPeerKernelKind;
}
