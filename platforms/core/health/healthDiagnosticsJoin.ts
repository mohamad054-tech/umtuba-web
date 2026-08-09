/**
 * In-memory Health Diagnostics Join Foundation (UM Core P18 / DJ1).
 *
 * Pure deterministic composition of P4 registration, P10 declarations, and
 * P17 observation snapshots. Read-only — never mutates injected stores.
 *
 * DIAGNOSTICS JOIN IS NOT PROBE EXECUTION.
 * DIAGNOSTICS JOIN IS NOT NETWORK / SERVICE DISCOVERY.
 * DIAGNOSTICS JOIN IS NOT FLEET AGGREGATION / ALERTING.
 * ABSENCE OF OBSERVATION IS NOT UNAVAILABLE.
 *
 * @see UM_CORE_SPECIFICATION_V1
 * @see UM_CORE_ENGINEERING_STANDARDS_V1 (§18 health)
 */

import type { UmPlatformId } from "../identity/types";
import type {
  UmHealthDiagnosticsJoin,
  UmHealthDiagnosticsJoinClass,
  UmHealthDiagnosticsJoinDeps,
  UmHealthDiagnosticsJoinRow,
  UmHealthDiagnosticsJoinView,
  UmHealthDiagnosticsStatusTally,
  UmHealthRecord,
  UmHealthSnapshot,
  UmHealthStatus,
} from "./types";

function classifyRow(input: {
  readonly registered: boolean;
  readonly declaration: UmHealthRecord | undefined;
  readonly observation: UmHealthSnapshot | undefined;
}): UmHealthDiagnosticsJoinClass {
  const { registered, declaration, observation } = input;
  const hasDeclaration = declaration !== undefined;
  const hasObservation = observation !== undefined;

  if (!registered && hasObservation) {
    return "orphan_observation";
  }

  if (hasDeclaration && hasObservation) {
    return declaration.reportsStatus
      ? "declared_and_observed"
      : "declared_silent_but_observed";
  }

  if (hasDeclaration && !hasObservation) {
    return declaration.reportsStatus
      ? "declared_unobserved"
      : "declared_silent";
  }

  if (!hasDeclaration && hasObservation) {
    return "observed_undeclared";
  }

  return "registered_only";
}

function buildRow(
  platformId: UmPlatformId,
  registered: boolean,
  declaration: UmHealthRecord | undefined,
  observation: UmHealthSnapshot | undefined,
): UmHealthDiagnosticsJoinRow {
  const status: UmHealthStatus | null = observation?.status ?? null;
  return {
    platformId,
    registered,
    hasDeclaration: declaration !== undefined,
    reportsStatus: declaration !== undefined ? declaration.reportsStatus : null,
    hasObservation: observation !== undefined,
    status,
    joinClass: classifyRow({ registered, declaration, observation }),
    checkedAt: observation?.checkedAt ?? null,
  };
}

interface MutableStatusTally {
  ready: number;
  degraded: number;
  unavailable: number;
  unobservedReporters: number;
}

function emptyTally(): MutableStatusTally {
  return {
    ready: 0,
    degraded: 0,
    unavailable: 0,
    unobservedReporters: 0,
  };
}

/**
 * Create a pure diagnostics join over P4 + P10 + P17 read surfaces.
 * Does not probe, poll, network, schedule, persist, or mutate deps.
 */
export function createHealthDiagnosticsJoin(
  deps: UmHealthDiagnosticsJoinDeps,
): UmHealthDiagnosticsJoin {
  return {
    evaluate(): UmHealthDiagnosticsJoinView {
      const platformIds = new Set<string>();
      for (const record of deps.platforms.list()) {
        platformIds.add(record.platformId);
      }
      for (const snapshot of deps.observations.list()) {
        platformIds.add(snapshot.platformId);
      }

      const sortedIds = [...platformIds].sort((a, b) => a.localeCompare(b));
      const rows: UmHealthDiagnosticsJoinRow[] = [];
      const statusTally = emptyTally();
      const unobservedReporterPlatformIds: UmPlatformId[] = [];
      const observedUndeclaredPlatformIds: UmPlatformId[] = [];
      const declaredAndObservedPlatformIds: UmPlatformId[] = [];
      const orphanObservationPlatformIds: UmPlatformId[] = [];

      for (const platformId of sortedIds) {
        const registered = deps.platforms.get(platformId) !== undefined;
        const declaration = deps.declarations.get(platformId);
        const observation = deps.observations.getSnapshot(platformId);
        const row = buildRow(platformId, registered, declaration, observation);
        rows.push(row);

        if (row.status === "ready") statusTally.ready += 1;
        if (row.status === "degraded") statusTally.degraded += 1;
        if (row.status === "unavailable") statusTally.unavailable += 1;

        if (row.joinClass === "declared_unobserved") {
          statusTally.unobservedReporters += 1;
          unobservedReporterPlatformIds.push(platformId);
        }
        if (row.joinClass === "observed_undeclared") {
          observedUndeclaredPlatformIds.push(platformId);
        }
        if (row.joinClass === "declared_and_observed") {
          declaredAndObservedPlatformIds.push(platformId);
        }
        if (row.joinClass === "orphan_observation") {
          orphanObservationPlatformIds.push(platformId);
        }
      }

      const frozenTally: UmHealthDiagnosticsStatusTally = {
        ready: statusTally.ready,
        degraded: statusTally.degraded,
        unavailable: statusTally.unavailable,
        unobservedReporters: statusTally.unobservedReporters,
      };

      return {
        rows,
        statusTally: frozenTally,
        unobservedReporterPlatformIds,
        observedUndeclaredPlatformIds,
        declaredAndObservedPlatformIds,
        orphanObservationPlatformIds,
      };
    },
  };
}
