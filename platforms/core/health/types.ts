/**
 * Health declaration and runtime reporting contracts (Standards §18 / Spec Ch.15).
 *
 * P1: interfaces/types.
 * P10: pure in-memory health declaration catalog (no monitoring runtime).
 * P17: pure deterministic in-memory UmHealthReporter (observation admission/store).
 *
 * HEALTH DECLARATION REGISTRATION IS NOT HEALTH MONITORING.
 * HEALTH REPORTING IS NOT HEALTH DECLARATION REGISTRATION.
 * HEALTH REPORTING IS NOT PROBE EXECUTION.
 *
 * P1 originally shaped `UmHealthRegistry` toward snapshots/probes. P10 evolves
 * that registry surface into a declaration catalog for `UmCoreRegistry.health`.
 * P17 implements the reporter observation port over registered platforms.
 */

import type { UmCapabilityId, UmPlatformId } from "../identity/types";
import type { UmPlatformRegistry } from "../registry/interfaces";

/**
 * Base health status taxonomy (Standards §18.3).
 * Richer taxonomies MUST map to these three.
 * Produced by P17 observation snapshots — not by P10 declarations.
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
 * Point-in-time health observation snapshot.
 * P10 does not produce or store snapshots.
 * P17 admits and stores caller-supplied snapshots (no probe execution).
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
 * P10/P17 do not register or schedule probes.
 */
export interface UmHealthProbeRegistration {
  readonly platformId: UmPlatformId;
  readonly probeId: string;
  readonly description?: string;
}

export interface UmHealthReportFinding {
  readonly code: string;
  readonly message: string;
  readonly path?: string;
}

/**
 * Result of a health report admission attempt (P17).
 * Valid report → ok: true with empty findings.
 */
export interface UmHealthReportResult {
  readonly ok: boolean;
  readonly platformId: UmPlatformId;
  readonly findings: readonly UmHealthReportFinding[];
}

/**
 * Dependencies for the in-memory health reporter (P17).
 * P10 declaration catalog is intentionally excluded from the report path.
 */
export interface UmHealthReporterDeps {
  readonly platforms: UmPlatformRegistry;
}

/**
 * Health reporter port — observation admission/query only.
 * P17 returns a deterministic result instead of void.
 * Does not probe, poll, schedule, network, or alert.
 */
export interface UmHealthReporter {
  report(snapshot: UmHealthSnapshot): UmHealthReportResult;
  getSnapshot(platformId: UmPlatformId): UmHealthSnapshot | undefined;
}

/**
 * P17 writable in-memory health observation store.
 */
export interface UmInMemoryHealthReporter extends UmHealthReporter {
  list(): readonly UmHealthSnapshot[];
  has(platformId: UmPlatformId): boolean;
  size(): number;
  clear(): void;
}
