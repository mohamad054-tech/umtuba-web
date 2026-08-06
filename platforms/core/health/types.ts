/**
 * Health declaration and probe contracts (Standards §18 / Spec Ch.15).
 */

import type { UmCapabilityId, UmPlatformId } from "../identity/types";

/**
 * Base health status taxonomy (Standards §18.3).
 * Richer taxonomies MUST map to these three.
 */
export type UmHealthStatus = "ready" | "degraded" | "unavailable";

/**
 * Manifest-level health declaration (what a platform promises to report).
 */
export interface UmHealthDeclaration {
  readonly reportsStatus: boolean;
  /** Opaque probe reference — not a URL scheme assumption. */
  readonly probeRef?: string;
  readonly notes?: string;
}

/**
 * Point-in-time health snapshot (logical).
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
 * Health registry / probe registration — interface only.
 */
export interface UmHealthRegistry {
  getSnapshot(platformId: UmPlatformId): UmHealthSnapshot | undefined;
  registerProbe(declaration: UmHealthProbeRegistration): void;
}

export interface UmHealthProbeRegistration {
  readonly platformId: UmPlatformId;
  readonly probeId: string;
  readonly description?: string;
}

/**
 * Health reporting port used by runtimes — interface only.
 */
export interface UmHealthReporter {
  report(snapshot: UmHealthSnapshot): void;
}
