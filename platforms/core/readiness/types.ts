/**
 * Platform lifecycle readiness contracts (UM Core P23).
 *
 * HEALTH STATUS TOKEN "ready" IS NOT LIFECYCLE READINESS.
 * READINESS IS NOT PROBE EXECUTION / MONITORING / POLLING.
 * READINESS IS NOT DIAGNOSTICS JOIN / FLEET AGGREGATION.
 *
 * Explicit vocabulary (do not collapse these concerns):
 *
 * REGISTRATION — Platform identity admitted into the P4 catalog.
 * VALIDITY — Stored P2 manifest validation on the registered record is ok.
 * COMPLIANCE — Stored P3 compliance status on the record is "compliant".
 * HEALTH — Split into declaration (P10 intent) and observation (P17 snapshot).
 *   Observation statuses use §18.3 tokens: ready | degraded | unavailable.
 *   The observation token "ready" is a health signal only.
 * READINESS — Fail-closed lifecycle gate over supplied Core state that yields
 *   READY | NOT_READY with explicit reasons. Distinct from UmHealthStatus.
 *
 * @see UM_CORE_SPECIFICATION_V1
 * @see UM_CORE_ENGINEERING_STANDARDS_V1
 */

import type { UmComplianceStatus } from "../compliance/types";
import type { UmPlatformId } from "../identity/types";
import type { UmPlatformRegistry } from "../registry/interfaces";
import type {
  UmHealthObservationReadSource,
  UmHealthRegistry,
  UmHealthStatus,
} from "../health/types";

/** Lifecycle readiness verdict — intentionally uppercase to avoid §18.3 clash. */
export type UmPlatformReadinessStatus = "READY" | "NOT_READY";

/**
 * Foundation phase for this module (local constant only).
 * Not mirrored into packageIdentity — P23 remains intentionally not root-public.
 */
export const UM_CORE_PLATFORM_LIFECYCLE_READINESS_PHASE = "P23" as const;

export interface UmPlatformReadinessReason {
  readonly code: string;
  readonly message: string;
  readonly path?: string;
}

/**
 * One deterministic readiness row derived from supplied Core state.
 */
export interface UmPlatformReadinessRow {
  readonly platformId: UmPlatformId;
  readonly status: UmPlatformReadinessStatus;
  readonly registered: boolean;
  readonly validationOk: boolean | null;
  readonly complianceStatus: UmComplianceStatus | null;
  readonly hasDeclaration: boolean;
  readonly reportsStatus: boolean | null;
  readonly hasObservation: boolean;
  /** Observation §18.3 token when present — never remapped into readiness. */
  readonly observationStatus: UmHealthStatus | null;
  readonly reasons: readonly UmPlatformReadinessReason[];
}

export interface UmPlatformReadinessTally {
  readonly ready: number;
  readonly notReady: number;
}

/**
 * Pure readiness view — no store mutation, no probes, no clock.
 */
export interface UmPlatformReadinessView {
  readonly rows: readonly UmPlatformReadinessRow[];
  readonly tally: UmPlatformReadinessTally;
  readonly readyPlatformIds: readonly UmPlatformId[];
  readonly notReadyPlatformIds: readonly UmPlatformId[];
}

/**
 * Dependencies for readiness evaluation (P4 + P10 + P17 observation reads).
 * Evaluator only reads; never mutates catalogs/stores.
 */
export interface UmPlatformReadinessDeps {
  readonly platforms: UmPlatformRegistry;
  readonly declarations: UmHealthRegistry;
  readonly observations: UmHealthObservationReadSource;
}

/**
 * Pure in-process readiness evaluator port.
 */
export interface UmPlatformReadinessEvaluator {
  evaluate(): UmPlatformReadinessView;
  evaluatePlatform(platformId: string): UmPlatformReadinessRow;
}
