/**
 * In-memory Health Reporter Foundation (UM Core P17).
 *
 * Pure deterministic observation admission/store over registered platforms.
 * HEALTH REPORTING IS NOT HEALTH DECLARATION REGISTRATION.
 * HEALTH REPORTING IS NOT PROBE EXECUTION.
 *
 * @see UM_CORE_SPECIFICATION_V1
 * @see UM_CORE_ENGINEERING_STANDARDS_V1 (§18 health)
 */

import type { UmPlatformRegistry } from "../registry/interfaces";
import { isNonEmptyTrimmed, isUmMachineId } from "../validation/naming";
import { UmHealthReportCode } from "./reporterCodes";
import type {
  UmDependencyHealthStatus,
  UmHealthReportFinding,
  UmHealthReportResult,
  UmHealthReporterDeps,
  UmHealthSnapshot,
  UmHealthStatus,
  UmInMemoryHealthReporter,
} from "./types";

const HEALTH_STATUSES: ReadonlySet<UmHealthStatus> = new Set([
  "ready",
  "degraded",
  "unavailable",
]);

function finding(
  code: string,
  message: string,
  path?: string,
): UmHealthReportFinding {
  return {
    code,
    message,
    ...(path !== undefined ? { path } : {}),
  };
}

function compareFindings(
  a: UmHealthReportFinding,
  b: UmHealthReportFinding,
): number {
  const code = a.code.localeCompare(b.code);
  if (code !== 0) return code;
  const path = (a.path ?? "").localeCompare(b.path ?? "");
  if (path !== 0) return path;
  return a.message.localeCompare(b.message);
}

function compareSnapshots(a: UmHealthSnapshot, b: UmHealthSnapshot): number {
  return a.platformId.localeCompare(b.platformId);
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
  findings: UmHealthReportFinding[],
): void {
  if (!Array.isArray(dependencyStatuses)) {
    findings.push(
      finding(
        UmHealthReportCode.SNAPSHOT_INVALID,
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
          UmHealthReportCode.SNAPSHOT_INVALID,
          `Dependency status at ${pathPrefix} must be an object.`,
          pathPrefix,
        ),
      );
      return;
    }
    if (!isNonEmptyTrimmed(dep.targetId)) {
      findings.push(
        finding(
          UmHealthReportCode.SNAPSHOT_INVALID,
          `Dependency status "${pathPrefix}.targetId" is required and must be a non-empty string.`,
          `${pathPrefix}.targetId`,
        ),
      );
    }
    if (!isHealthStatus(dep.status)) {
      findings.push(
        finding(
          UmHealthReportCode.STATUS_INVALID,
          `Dependency status "${pathPrefix}.status" must be ready, degraded, or unavailable.`,
          `${pathPrefix}.status`,
        ),
      );
    }
  });
}

function validateSnapshotStructure(
  snapshot: UmHealthSnapshot,
): UmHealthReportFinding[] {
  const findings: UmHealthReportFinding[] = [];

  if (!isNonEmptyTrimmed(snapshot.platformId)) {
    findings.push(
      finding(
        UmHealthReportCode.PLATFORM_ID_REQUIRED,
        "Snapshot platformId is required.",
        "platformId",
      ),
    );
  } else if (!isUmMachineId(snapshot.platformId)) {
    findings.push(
      finding(
        UmHealthReportCode.PLATFORM_ID_NAMING,
        `platformId "${snapshot.platformId}" is not a valid machine id.`,
        "platformId",
      ),
    );
  }

  if (!isHealthStatus(snapshot.status)) {
    findings.push(
      finding(
        UmHealthReportCode.STATUS_INVALID,
        'Snapshot field "status" must be ready, degraded, or unavailable.',
        "status",
      ),
    );
  }

  if (!isNonEmptyTrimmed(snapshot.checkedAt)) {
    findings.push(
      finding(
        UmHealthReportCode.SNAPSHOT_INVALID,
        'Snapshot field "checkedAt" is required and must be a non-empty string.',
        "checkedAt",
      ),
    );
  }

  if (!Array.isArray(snapshot.affectedCapabilityIds)) {
    findings.push(
      finding(
        UmHealthReportCode.SNAPSHOT_INVALID,
        'Snapshot field "affectedCapabilityIds" must be an array.',
        "affectedCapabilityIds",
      ),
    );
  } else {
    snapshot.affectedCapabilityIds.forEach((capabilityId, index) => {
      if (!isNonEmptyTrimmed(capabilityId)) {
        findings.push(
          finding(
            UmHealthReportCode.SNAPSHOT_INVALID,
            `affectedCapabilityIds[${index}] must be a non-empty string.`,
            `affectedCapabilityIds[${index}]`,
          ),
        );
      } else if (!isUmMachineId(capabilityId)) {
        findings.push(
          finding(
            UmHealthReportCode.SNAPSHOT_INVALID,
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
        UmHealthReportCode.SNAPSHOT_INVALID,
        'Snapshot field "detail" must be a string when provided.',
        "detail",
      ),
    );
  }

  return findings;
}

function reportOne(
  platforms: UmPlatformRegistry,
  snapshot: UmHealthSnapshot,
): UmHealthReportResult {
  const platformId =
    typeof snapshot.platformId === "string" ? snapshot.platformId : "";
  const findings: UmHealthReportFinding[] = [
    ...validateSnapshotStructure(snapshot),
  ];

  if (
    isNonEmptyTrimmed(platformId) &&
    isUmMachineId(platformId) &&
    !platforms.get(platformId)
  ) {
    findings.push(
      finding(
        UmHealthReportCode.UNKNOWN_PLATFORM,
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
  };
}

/**
 * Create a pure in-memory health reporter over registered platforms.
 * Admits/stores snapshots only — no probes, polling, networking, or alerts.
 */
export function createInMemoryHealthReporter(
  deps: UmHealthReporterDeps,
): UmInMemoryHealthReporter {
  const store = new Map<string, UmHealthSnapshot>();
  const { platforms } = deps;

  const sortedValues = (): UmHealthSnapshot[] =>
    [...store.values()].sort(compareSnapshots);

  return {
    report(snapshot) {
      const result = reportOne(platforms, snapshot);
      if (result.ok) {
        store.set(result.platformId, cloneSnapshot(snapshot));
      }
      return result;
    },

    getSnapshot(platformId) {
      return store.get(platformId);
    },

    list() {
      return sortedValues();
    },

    has(platformId) {
      return store.has(platformId);
    },

    size() {
      return store.size;
    },

    clear() {
      store.clear();
    },
  };
}
