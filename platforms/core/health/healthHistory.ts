/**
 * In-memory bounded health observation history foundation (UM Core P22).
 *
 * Pure deterministic per-platform ring of last-N successful snapshots.
 * Companion to P17 last-snapshot SoT — does not replace it.
 *
 * BOUNDED HISTORY IS NOT HEALTH DECLARATION REGISTRATION.
 * BOUNDED HISTORY IS NOT PROBE EXECUTION / MONITORING / POLLING.
 * BOUNDED HISTORY IS NOT DURABLE TELEMETRY / DB / EVENT STORE.
 * HISTORY ABSENCE ≠ LIFECYCLE READINESS.
 *
 * CONTRACT_SOURCE: derived_from_central_assignment_plus_gap_audit
 * (no accepted standalone bounded-history contract report found;
 *  semantics from Post-P17 gap audit P22 candidate + P17 snapshot rules +
 *  Central IMPLEMENT ONLY bullets).
 *
 * @see UM_CORE_SPECIFICATION_V1
 * @see UM_CORE_ENGINEERING_STANDARDS_V1 (§18 health)
 */

import type { UmPlatformId } from "../identity/types";
import type { UmPlatformRegistry } from "../registry/interfaces";
import { isNonEmptyTrimmed, isUmMachineId } from "../validation/naming";
import { UmHealthHistoryCode } from "./healthHistoryCodes";
import type {
  UmDependencyHealthStatus,
  UmHealthSnapshot,
  UmHealthStatus,
} from "./types";

const HEALTH_STATUSES: ReadonlySet<UmHealthStatus> = new Set([
  "ready",
  "degraded",
  "unavailable",
]);

export interface UmHealthHistoryFinding {
  readonly code: string;
  readonly message: string;
  readonly path?: string;
}

export interface UmHealthHistoryRecordResult {
  readonly ok: boolean;
  readonly platformId: UmPlatformId;
  readonly findings: readonly UmHealthHistoryFinding[];
  /** Entries retained for this platform after a successful record (0 on failure). */
  readonly retainedCount: number;
  /** True when an oldest entry was evicted to admit this record. */
  readonly evicted: boolean;
}

export interface UmHealthObservationHistoryDeps {
  readonly platforms: UmPlatformRegistry;
  /**
   * Explicit per-platform ring capacity (finite integer >= 1).
   * When full, oldest entry is evicted before the newest is appended.
   */
  readonly capacity: number;
}

/**
 * Bounded in-memory observation history port (heap only).
 * Insertion order: append-on-success. Query order: oldest → newest.
 */
export interface UmInMemoryHealthObservationHistory {
  /** Explicit configured capacity (per platform). */
  capacity(): number;
  record(snapshot: UmHealthSnapshot): UmHealthHistoryRecordResult;
  /** Oldest → newest clones; empty array when unknown / never recorded. */
  getHistory(platformId: UmPlatformId): readonly UmHealthSnapshot[];
  /** Newest snapshot, or undefined when history empty / unknown. */
  getLatest(platformId: UmPlatformId): UmHealthSnapshot | undefined;
  listPlatformIds(): readonly UmPlatformId[];
  has(platformId: UmPlatformId): boolean;
  /** Platforms with at least one retained entry. */
  platformCount(): number;
  /** Total retained entries across all platforms. */
  entryCount(): number;
  clear(): void;
  clearPlatform(platformId: UmPlatformId): void;
}

export type UmHealthObservationHistoryCreateResult =
  | {
      readonly ok: true;
      readonly history: UmInMemoryHealthObservationHistory;
      readonly findings: readonly UmHealthHistoryFinding[];
    }
  | {
      readonly ok: false;
      readonly history?: undefined;
      readonly findings: readonly UmHealthHistoryFinding[];
    };

function finding(
  code: string,
  message: string,
  path?: string,
): UmHealthHistoryFinding {
  return {
    code,
    message,
    ...(path !== undefined ? { path } : {}),
  };
}

function compareFindings(
  a: UmHealthHistoryFinding,
  b: UmHealthHistoryFinding,
): number {
  const code = a.code.localeCompare(b.code);
  if (code !== 0) return code;
  const path = (a.path ?? "").localeCompare(b.path ?? "");
  if (path !== 0) return path;
  return a.message.localeCompare(b.message);
}

function isHealthStatus(value: unknown): value is UmHealthStatus {
  return typeof value === "string" && HEALTH_STATUSES.has(value as UmHealthStatus);
}

function cloneSnapshot(snapshot: UmHealthSnapshot): UmHealthSnapshot {
  return {
    platformId: snapshot.platformId,
    status: snapshot.status,
    checkedAt: snapshot.checkedAt,
    affectedCapabilityIds: [...snapshot.affectedCapabilityIds],
    dependencyStatuses: snapshot.dependencyStatuses.map((dep) => ({
      targetId: dep.targetId,
      status: dep.status,
    })),
    ...(snapshot.detail !== undefined ? { detail: snapshot.detail } : {}),
  };
}

function validateDependencyStatuses(
  dependencyStatuses: unknown,
  findings: UmHealthHistoryFinding[],
): void {
  if (!Array.isArray(dependencyStatuses)) {
    findings.push(
      finding(
        UmHealthHistoryCode.SNAPSHOT_INVALID,
        'Snapshot field "dependencyStatuses" must be an array.',
        "dependencyStatuses",
      ),
    );
    return;
  }

  dependencyStatuses.forEach((dep: UmDependencyHealthStatus, index) => {
    const pathPrefix = `dependencyStatuses[${index}]`;
    if (dep == null || typeof dep !== "object") {
      findings.push(
        finding(
          UmHealthHistoryCode.SNAPSHOT_INVALID,
          `Dependency status at ${pathPrefix} must be an object.`,
          pathPrefix,
        ),
      );
      return;
    }
    if (!isNonEmptyTrimmed(dep.targetId)) {
      findings.push(
        finding(
          UmHealthHistoryCode.SNAPSHOT_INVALID,
          `Dependency status "${pathPrefix}.targetId" is required and must be a non-empty string.`,
          `${pathPrefix}.targetId`,
        ),
      );
    }
    if (!isHealthStatus(dep.status)) {
      findings.push(
        finding(
          UmHealthHistoryCode.STATUS_INVALID,
          `Dependency status "${pathPrefix}.status" must be ready, degraded, or unavailable.`,
          `${pathPrefix}.status`,
        ),
      );
    }
  });
}

function validateSnapshotStructure(
  snapshot: UmHealthSnapshot,
): UmHealthHistoryFinding[] {
  const findings: UmHealthHistoryFinding[] = [];

  if (!isNonEmptyTrimmed(snapshot.platformId)) {
    findings.push(
      finding(
        UmHealthHistoryCode.PLATFORM_ID_REQUIRED,
        "Snapshot platformId is required.",
        "platformId",
      ),
    );
  } else if (!isUmMachineId(snapshot.platformId)) {
    findings.push(
      finding(
        UmHealthHistoryCode.PLATFORM_ID_NAMING,
        `platformId "${snapshot.platformId}" is not a valid machine id.`,
        "platformId",
      ),
    );
  }

  if (!isHealthStatus(snapshot.status)) {
    findings.push(
      finding(
        UmHealthHistoryCode.STATUS_INVALID,
        'Snapshot field "status" must be ready, degraded, or unavailable.',
        "status",
      ),
    );
  }

  if (!isNonEmptyTrimmed(snapshot.checkedAt)) {
    findings.push(
      finding(
        UmHealthHistoryCode.SNAPSHOT_INVALID,
        'Snapshot field "checkedAt" is required and must be a non-empty string.',
        "checkedAt",
      ),
    );
  }

  if (!Array.isArray(snapshot.affectedCapabilityIds)) {
    findings.push(
      finding(
        UmHealthHistoryCode.SNAPSHOT_INVALID,
        'Snapshot field "affectedCapabilityIds" must be an array.',
        "affectedCapabilityIds",
      ),
    );
  } else {
    snapshot.affectedCapabilityIds.forEach((capabilityId, index) => {
      if (!isNonEmptyTrimmed(capabilityId)) {
        findings.push(
          finding(
            UmHealthHistoryCode.SNAPSHOT_INVALID,
            `affectedCapabilityIds[${index}] must be a non-empty string.`,
            `affectedCapabilityIds[${index}]`,
          ),
        );
      } else if (!isUmMachineId(capabilityId)) {
        findings.push(
          finding(
            UmHealthHistoryCode.SNAPSHOT_INVALID,
            `affectedCapabilityIds[${index}] "${capabilityId}" is not a valid machine id.`,
            `affectedCapabilityIds[${index}]`,
          ),
        );
      }
    });
  }

  validateDependencyStatuses(snapshot.dependencyStatuses, findings);

  if (snapshot.detail !== undefined && typeof snapshot.detail !== "string") {
    findings.push(
      finding(
        UmHealthHistoryCode.SNAPSHOT_INVALID,
        'Snapshot field "detail" must be a string when provided.',
        "detail",
      ),
    );
  }

  return findings;
}

function isValidCapacity(capacity: unknown): capacity is number {
  return (
    typeof capacity === "number" &&
    Number.isInteger(capacity) &&
    Number.isFinite(capacity) &&
    capacity >= 1
  );
}

function admitOne(
  platforms: UmPlatformRegistry,
  snapshot: UmHealthSnapshot,
): UmHealthHistoryRecordResult {
  const platformId =
    typeof snapshot.platformId === "string" ? snapshot.platformId : "";
  const findings: UmHealthHistoryFinding[] = [
    ...validateSnapshotStructure(snapshot),
  ];

  if (
    isNonEmptyTrimmed(platformId) &&
    isUmMachineId(platformId) &&
    !platforms.get(platformId)
  ) {
    findings.push(
      finding(
        UmHealthHistoryCode.UNKNOWN_PLATFORM,
        `Platform "${platformId}" is not registered.`,
        "platformId",
      ),
    );
  }

  const sorted = [...findings].sort(compareFindings);
  return {
    ok: sorted.length === 0,
    platformId,
    findings: sorted,
    retainedCount: 0,
    evicted: false,
  };
}

/**
 * Create a pure in-memory bounded observation history ring.
 * Fail-closed on invalid capacity — no store is created.
 */
export function createInMemoryHealthObservationHistory(
  deps: UmHealthObservationHistoryDeps,
): UmHealthObservationHistoryCreateResult {
  if (!isValidCapacity(deps.capacity)) {
    return {
      ok: false,
      findings: [
        finding(
          UmHealthHistoryCode.CAPACITY_INVALID,
          'History "capacity" must be a finite integer >= 1.',
          "capacity",
        ),
      ].sort(compareFindings),
    };
  }

  const capacity = deps.capacity;
  const { platforms } = deps;
  /** Per-platform rings; arrays are oldest → newest. */
  const rings = new Map<string, UmHealthSnapshot[]>();

  const history: UmInMemoryHealthObservationHistory = {
    capacity() {
      return capacity;
    },

    record(snapshot) {
      const admitted = admitOne(platforms, snapshot);
      if (!admitted.ok) {
        return admitted;
      }

      const platformId = admitted.platformId;
      let ring = rings.get(platformId);
      if (ring === undefined) {
        ring = [];
        rings.set(platformId, ring);
      }

      let evicted = false;
      if (ring.length >= capacity) {
        ring.shift();
        evicted = true;
      }
      ring.push(cloneSnapshot(snapshot));

      return {
        ok: true,
        platformId,
        findings: [],
        retainedCount: ring.length,
        evicted,
      };
    },

    getHistory(platformId) {
      const ring = rings.get(platformId);
      if (ring === undefined || ring.length === 0) {
        return [];
      }
      return ring.map(cloneSnapshot);
    },

    getLatest(platformId) {
      const ring = rings.get(platformId);
      if (ring === undefined || ring.length === 0) {
        return undefined;
      }
      return cloneSnapshot(ring[ring.length - 1]!);
    },

    listPlatformIds() {
      return [...rings.keys()]
        .filter((id) => (rings.get(id)?.length ?? 0) > 0)
        .sort((a, b) => a.localeCompare(b));
    },

    has(platformId) {
      return (rings.get(platformId)?.length ?? 0) > 0;
    },

    platformCount() {
      let count = 0;
      for (const ring of rings.values()) {
        if (ring.length > 0) count += 1;
      }
      return count;
    },

    entryCount() {
      let count = 0;
      for (const ring of rings.values()) {
        count += ring.length;
      }
      return count;
    },

    clear() {
      rings.clear();
    },

    clearPlatform(platformId) {
      rings.delete(platformId);
    },
  };

  return {
    ok: true,
    history,
    findings: [],
  };
}
