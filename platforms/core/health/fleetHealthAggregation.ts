/**
 * In-memory Fleet Health Aggregation Foundation (UM Core P20).
 *
 * Pure deterministic rollup over supplied P4 membership + P17 observations
 * (+ optional P10 declarations / A1 diagnostics join view).
 *
 * FLEET AGGREGATION IS NOT HEALTH MONITORING.
 * FLEET AGGREGATION IS NOT PROBE EXECUTION.
 * FLEET AGGREGATION IS NOT HEALTH REPORT ADMISSION.
 * FLEET AGGREGATION IS NOT HEALTH DECLARATION REGISTRATION.
 * ABSENCE OF OBSERVATION IS NOT UNAVAILABLE.
 *
 * Assignment wording maps at boundaries only:
 * healthy → ready, unhealthy → unavailable, unknown → observation absence.
 * Core exports only §18.3 tokens: ready | degraded | unavailable.
 *
 * @see UM_CORE_SPECIFICATION_V1
 * @see UM_CORE_ENGINEERING_STANDARDS_V1 (§18 health)
 */

import type { UmPlatformId } from "../identity/types";
import { isNonEmptyTrimmed, isUmMachineId } from "../validation/naming";
import { UmFleetHealthAggregationCode } from "./fleetCodes";
import type {
  UmFleetHealthAggregation,
  UmFleetHealthAggregationDeps,
  UmFleetHealthAggregationFinding,
  UmFleetHealthAggregationResult,
  UmFleetHealthCoverage,
  UmFleetHealthMemberInput,
  UmFleetHealthMemberView,
  UmFleetHealthStatusCounts,
  UmHealthStatus,
} from "./types";

const HEALTH_STATUSES: ReadonlySet<UmHealthStatus> = new Set([
  "ready",
  "degraded",
  "unavailable",
]);

/** Higher numeric rank = worse observed status (unavailable > degraded > ready). */
const STATUS_RANK: Readonly<Record<UmHealthStatus, number>> = {
  ready: 0,
  degraded: 1,
  unavailable: 2,
};

function finding(
  code: string,
  message: string,
  path?: string,
): UmFleetHealthAggregationFinding {
  return {
    code,
    message,
    ...(path !== undefined ? { path } : {}),
  };
}

function compareFindings(
  a: UmFleetHealthAggregationFinding,
  b: UmFleetHealthAggregationFinding,
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

function emptyStatusCounts(): UmFleetHealthStatusCounts {
  return { ready: 0, degraded: 0, unavailable: 0 };
}

function failClosed(
  findings: UmFleetHealthAggregationFinding[],
): UmFleetHealthAggregationResult {
  return {
    ok: false,
    fleetSize: 0,
    observedCount: 0,
    unobservedCount: 0,
    statusCounts: emptyStatusCounts(),
    expectedReporterUnobservedIds: [],
    undeclaredObservationIds: [],
    observedWorstStatus: undefined,
    coverage: "none",
    members: [],
    findings: [...findings].sort(compareFindings),
  };
}

function coverageOf(fleetSize: number, observedCount: number): UmFleetHealthCoverage {
  if (fleetSize === 0 || observedCount === 0) return "none";
  if (observedCount === fleetSize) return "full";
  return "partial";
}

function worseStatus(
  current: UmHealthStatus | undefined,
  next: UmHealthStatus,
): UmHealthStatus {
  if (current === undefined) return next;
  return STATUS_RANK[next] > STATUS_RANK[current] ? next : current;
}

export interface UmFleetHealthBagOptions {
  /**
   * When true, compute expected-unobserved / undeclared id lists from
   * per-member declaration presence. Port-backed path sets this when a P10
   * catalog is supplied (even if empty). Otherwise lists stay empty.
   */
  readonly declarationAware?: boolean;
}

/**
 * Pure bag aggregation over already-normalized member inputs.
 * Fail-closed on invalid ids, duplicates, or non-§18.3 observation statuses.
 * Does not coerce foreign tokens (healthy/unhealthy/unknown/…).
 */
export function aggregateFleetHealthFromMembers(
  members: readonly UmFleetHealthMemberInput[],
  options?: UmFleetHealthBagOptions,
): UmFleetHealthAggregationResult {
  if (!Array.isArray(members)) {
    return failClosed([
      finding(
        UmFleetHealthAggregationCode.INPUT_INVALID,
        "Fleet members input must be an array.",
        "members",
      ),
    ]);
  }

  const findings: UmFleetHealthAggregationFinding[] = [];
  const seen = new Set<string>();

  members.forEach((member, index) => {
    const pathPrefix = `members[${index}]`;
    if (member == null || typeof member !== "object") {
      findings.push(
        finding(
          UmFleetHealthAggregationCode.INPUT_INVALID,
          `Fleet member at ${pathPrefix} must be an object.`,
          pathPrefix,
        ),
      );
      return;
    }

    const platformId = member.platformId;
    if (!isNonEmptyTrimmed(platformId)) {
      findings.push(
        finding(
          UmFleetHealthAggregationCode.PLATFORM_ID_REQUIRED,
          `Fleet member "${pathPrefix}.platformId" is required and must be a non-empty string.`,
          `${pathPrefix}.platformId`,
        ),
      );
    } else if (!isUmMachineId(platformId.trim())) {
      findings.push(
        finding(
          UmFleetHealthAggregationCode.PLATFORM_ID_NAMING,
          `Fleet member "${pathPrefix}.platformId" must be a valid machine id.`,
          `${pathPrefix}.platformId`,
        ),
      );
    } else {
      const normalizedId = platformId.trim();
      if (seen.has(normalizedId)) {
        findings.push(
          finding(
            UmFleetHealthAggregationCode.DUPLICATE_PLATFORM,
            `Duplicate fleet platformId "${normalizedId}".`,
            `${pathPrefix}.platformId`,
          ),
        );
      } else {
        seen.add(normalizedId);
      }
    }

    if (member.observation !== undefined) {
      if (member.observation == null || typeof member.observation !== "object") {
        findings.push(
          finding(
            UmFleetHealthAggregationCode.INPUT_INVALID,
            `Fleet member "${pathPrefix}.observation" must be an object when provided.`,
            `${pathPrefix}.observation`,
          ),
        );
      } else if (!isHealthStatus(member.observation.status)) {
        findings.push(
          finding(
            UmFleetHealthAggregationCode.STATUS_INVALID,
            `Fleet member "${pathPrefix}.observation.status" must be ready, degraded, or unavailable (no coercion of healthy/unhealthy/unknown).`,
            `${pathPrefix}.observation.status`,
          ),
        );
      }
    }
  });

  if (findings.length > 0) {
    return failClosed(findings);
  }

  const sorted = [...members].sort((a, b) =>
    a.platformId.trim().localeCompare(b.platformId.trim()),
  );

  const memberViews: UmFleetHealthMemberView[] = [];
  const statusCounts = { ready: 0, degraded: 0, unavailable: 0 };
  const expectedReporterUnobservedIds: UmPlatformId[] = [];
  const undeclaredObservationIds: UmPlatformId[] = [];
  let observedCount = 0;
  let observedWorstStatus: UmHealthStatus | undefined;

  for (const member of sorted) {
    const platformId = member.platformId.trim() as UmPlatformId;
    const observation = member.observation;
    const declaration = member.declaration;
    const observationStatus: UmHealthStatus | undefined =
      observation !== undefined && isHealthStatus(observation.status)
        ? observation.status
        : undefined;

    if (observationStatus !== undefined) {
      observedCount += 1;
      statusCounts[observationStatus] += 1;
      observedWorstStatus = worseStatus(observedWorstStatus, observationStatus);
      if (declaration === undefined) {
        undeclaredObservationIds.push(platformId);
      }
    } else if (declaration?.reportsStatus === true) {
      expectedReporterUnobservedIds.push(platformId);
    }

    const view: UmFleetHealthMemberView = {
      platformId,
      observationStatus,
      ...(declaration !== undefined
        ? { reportsStatus: declaration.reportsStatus }
        : {}),
      ...(observation?.checkedAt !== undefined
        ? { checkedAt: observation.checkedAt }
        : {}),
      ...(declaration?.probeRef !== undefined
        ? { probeRef: declaration.probeRef }
        : {}),
    };
    memberViews.push(view);
  }

  // Coverage lists that depend on P10/A1 remain empty unless declaration-aware.
  const declarationAware =
    options?.declarationAware === true ||
    sorted.some((m) => m.declaration !== undefined);
  const fleetSize = memberViews.length;
  const unobservedCount = fleetSize - observedCount;

  return {
    ok: true,
    fleetSize,
    observedCount,
    unobservedCount,
    statusCounts: {
      ready: statusCounts.ready,
      degraded: statusCounts.degraded,
      unavailable: statusCounts.unavailable,
    },
    expectedReporterUnobservedIds: declarationAware
      ? expectedReporterUnobservedIds
      : [],
    undeclaredObservationIds: declarationAware
      ? undeclaredObservationIds
      : [],
    observedWorstStatus,
    coverage: coverageOf(fleetSize, observedCount),
    members: memberViews,
    findings: [],
  };
}

/**
 * Port-backed fleet aggregation over P4 membership + P17 observations
 * (+ optional P10 declarations / precomputed A1 diagnostics view).
 */
export function aggregateFleetHealth(
  deps: UmFleetHealthAggregationDeps,
): UmFleetHealthAggregationResult {
  if (deps == null || typeof deps !== "object") {
    return failClosed([
      finding(
        UmFleetHealthAggregationCode.INPUT_INVALID,
        "Fleet aggregation deps must be an object.",
        "deps",
      ),
    ]);
  }
  if (deps.platforms == null || typeof deps.platforms.list !== "function") {
    return failClosed([
      finding(
        UmFleetHealthAggregationCode.INPUT_INVALID,
        'Fleet aggregation deps require "platforms" with list().',
        "deps.platforms",
      ),
    ]);
  }
  if (
    deps.observations == null ||
    typeof deps.observations.getSnapshot !== "function" ||
    typeof deps.observations.list !== "function"
  ) {
    return failClosed([
      finding(
        UmFleetHealthAggregationCode.INPUT_INVALID,
        'Fleet aggregation deps require "observations" with getSnapshot() and list().',
        "deps.observations",
      ),
    ]);
  }

  const registeredIds = new Set<string>();
  for (const record of deps.platforms.list()) {
    registeredIds.add(record.platformId);
  }

  const unknownFindings: UmFleetHealthAggregationFinding[] = [];
  for (const snapshot of deps.observations.list()) {
    if (!registeredIds.has(snapshot.platformId)) {
      unknownFindings.push(
        finding(
          UmFleetHealthAggregationCode.UNKNOWN_PLATFORM,
          `Observation platformId "${snapshot.platformId}" is not in P4 fleet membership.`,
          `observations.${snapshot.platformId}`,
        ),
      );
    }
  }
  if (unknownFindings.length > 0) {
    return failClosed(unknownFindings);
  }

  const sortedPlatformIds = [...registeredIds].sort((a, b) =>
    a.localeCompare(b),
  ) as UmPlatformId[];

  const bagMembers: UmFleetHealthMemberInput[] = sortedPlatformIds.map(
    (platformId) => {
      const observation = deps.observations.getSnapshot(platformId);
      const declaration = deps.declarations?.get(platformId);
      return {
        platformId,
        ...(observation !== undefined ? { observation } : {}),
        ...(declaration !== undefined
          ? {
              declaration: {
                reportsStatus: declaration.reportsStatus,
                ...(declaration.probeRef !== undefined
                  ? { probeRef: declaration.probeRef }
                  : {}),
              },
            }
          : {}),
      };
    },
  );

  const base = aggregateFleetHealthFromMembers(bagMembers, {
    declarationAware: deps.declarations !== undefined,
  });
  if (!base.ok) {
    return base;
  }

  // Prefer A1 diagnostics lists when supplied; else keep bag-derived lists
  // (empty when declarations were not provided).
  if (deps.diagnostics !== undefined) {
    return {
      ...base,
      expectedReporterUnobservedIds: [
        ...deps.diagnostics.unobservedReporterPlatformIds,
      ].sort((a, b) => a.localeCompare(b)),
      undeclaredObservationIds: [
        ...deps.diagnostics.observedUndeclaredPlatformIds,
      ].sort((a, b) => a.localeCompare(b)),
    };
  }

  return base;
}

/**
 * Create a pure fleet health aggregation port over injected Core state.
 * Does not probe, poll, network, schedule, persist, or mutate deps.
 */
export function createFleetHealthAggregation(
  deps: UmFleetHealthAggregationDeps,
): UmFleetHealthAggregation {
  return {
    evaluate(): UmFleetHealthAggregationResult {
      return aggregateFleetHealth(deps);
    },
  };
}
