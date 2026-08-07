/**
 * Health declaration and future monitoring contracts (Standards §18 / Spec Ch.15).
 *
 * P1: interfaces/types.
 * P10: pure in-memory health declaration catalog (no monitoring runtime).
 *
 * HEALTH DECLARATION REGISTRATION IS NOT HEALTH MONITORING.
 *
 * P1 originally shaped `UmHealthRegistry` toward snapshots/probes. P10 evolves
 * that registry surface into a declaration catalog for `UmCoreRegistry.health`.
 * Snapshot/probe/reporter types remain for later runtime milestones.
 */

import type { UmCapabilityId, UmPlatformId } from "../identity/types";
import type { UmPlatformRegistry } from "../registry/interfaces";

/**
 * Base health status taxonomy (Standards §18.3).
 * Richer taxonomies MUST map to these three.
 * Used by future snapshot/runtime contracts — not produced by P10.
 */
export type UmHealthStatus = "ready" | "degraded" | "unavailable";

/**
 * Manifest-level health declaration (what a platform promises to report).
 */
export interface UmHealthDeclaration {
  readonly reportsStatus: boolean;
  /** Opaque probe reference — not a URL scheme assumption; never executed in P10. */
  readonly probeRef?: string;
  readonly notes?: string;
}

/**
 * Catalog row for a platform health declaration (heap only in P10).
 * Identity is `platformId` — one row per registered platform.
 */
export interface UmHealthRecord {
  readonly platformId: UmPlatformId;
  readonly reportsStatus: boolean;
  readonly probeRef?: string;
  readonly notes?: string;
  readonly registeredAt?: string;
}

/**
 * Declaration used to register health into the catalog.
 */
export interface UmHealthRegistrationDeclaration {
  readonly platformId: UmPlatformId;
  readonly reportsStatus: boolean;
  readonly probeRef?: string;
  readonly notes?: string;
}

export interface UmHealthRegistrationMetadata {
  readonly registeredAt?: string;
}

export interface UmHealthRegistrationInput {
  readonly health: UmHealthRegistrationDeclaration;
  readonly registration?: UmHealthRegistrationMetadata;
}

export type UmHealthRegistryFindingSeverity = "error" | "warning" | "info";

export interface UmHealthRegistryFinding {
  readonly code: string;
  readonly severity: UmHealthRegistryFindingSeverity;
  readonly message: string;
  readonly path?: string;
  readonly standardRef?: string;
}

export interface UmHealthRegistrationResult {
  readonly ok: boolean;
  readonly platformId: UmPlatformId;
  readonly record?: UmHealthRecord;
  readonly findings: readonly UmHealthRegistryFinding[];
}

/**
 * Health declaration catalog read surface (Standards §18).
 *
 * Evolved in P10 from the P1 probe/snapshot-shaped port into a declaration
 * catalog suitable for `UmCoreRegistry.health`.
 */
export interface UmHealthRegistry {
  get(platformId: UmPlatformId): UmHealthRecord | undefined;
  list(): readonly UmHealthRecord[];
  listByReportsStatus(reportsStatus: boolean): readonly UmHealthRecord[];
  has(platformId: UmPlatformId): boolean;
  size(): number;
}

/**
 * P10 writable in-memory health declaration catalog.
 * Does not probe, poll, schedule, network, or report live status.
 */
export interface UmInMemoryHealthRegistry extends UmHealthRegistry {
  register(input: UmHealthRegistrationInput): UmHealthRegistrationResult;
  clear(): void;
}

export interface UmHealthRegistryDeps {
  readonly platforms: UmPlatformRegistry;
}

/**
 * Point-in-time health snapshot (logical) — retained for later runtime.
 * P10 does not produce or store snapshots.
 */
export interface UmHealthSnapshot {
  readonly platformId: UmPlatformId;
  readonly status: UmHealthStatus;
  readonly checkedAt: string;
  readonly affectedCapabilityIds: readonly UmCapabilityId[];
  readonly dependencyStatuses: readonly UmDependencyHealthStatus[];
  readonly detail?: string;
}

export interface UmDependencyHealthStatus {
  readonly targetId: string;
  readonly status: UmHealthStatus;
}

/**
 * Declared probe metadata for a future monitoring runtime — interface types only.
 * P10 does not register or schedule probes.
 */
export interface UmHealthProbeRegistration {
  readonly platformId: UmPlatformId;
  readonly probeId: string;
  readonly description?: string;
}

/**
 * Health reporting port used by runtimes — interface only (not implemented in P10).
 */
export interface UmHealthReporter {
  report(snapshot: UmHealthSnapshot): void;
}
