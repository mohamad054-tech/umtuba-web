/**
 * In-memory Platform Lifecycle Readiness Foundation (UM Core P23).
 *
 * Pure deterministic readiness gate over supplied P4 + P10 + P17 state.
 * Read-only — never mutates injected stores.
 *
 * HEALTH STATUS TOKEN "ready" IS NOT LIFECYCLE READINESS.
 * READINESS IS NOT PROBE EXECUTION.
 * READINESS IS NOT DIAGNOSTICS JOIN / FLEET AGGREGATION.
 * ABSENCE OF OBSERVATION IS NOT UNAVAILABLE — it is NOT_READY when required.
 *
 * @see UM_CORE_SPECIFICATION_V1
 * @see UM_CORE_ENGINEERING_STANDARDS_V1
 */

import type { UmPlatformId } from "../identity/types";
import type { UmPlatformRecord } from "../registry/interfaces";
import { isNonEmptyTrimmed, isUmMachineId } from "../validation/naming";
import type {
  UmHealthRecord,
  UmHealthSnapshot,
  UmHealthStatus,
} from "../health/types";
import { UmPlatformReadinessCode } from "./codes";
import type {
  UmPlatformReadinessDeps,
  UmPlatformReadinessEvaluator,
  UmPlatformReadinessReason,
  UmPlatformReadinessRow,
  UmPlatformReadinessTally,
  UmPlatformReadinessView,
} from "./types";

function reason(
  code: string,
  message: string,
  path?: string,
): UmPlatformReadinessReason {
  return {
    code,
    message,
    ...(path !== undefined ? { path } : {}),
  };
}

function compareReasons(
  a: UmPlatformReadinessReason,
  b: UmPlatformReadinessReason,
): number {
  const code = a.code.localeCompare(b.code);
  if (code !== 0) return code;
  const path = (a.path ?? "").localeCompare(b.path ?? "");
  if (path !== 0) return path;
  return a.message.localeCompare(b.message);
}

function emptyRow(platformId: UmPlatformId): UmPlatformReadinessRow {
  return {
    platformId,
    status: "NOT_READY",
    registered: false,
    validationOk: null,
    complianceStatus: null,
    hasDeclaration: false,
    reportsStatus: null,
    hasObservation: false,
    observationStatus: null,
    reasons: [],
  };
}

/**
 * Fail-closed readiness derivation for one platform from supplied Core facts.
 *
 * Gates (all required for READY):
 * 1. REGISTRATION — P4 record present
 * 2. VALIDITY — stored validation.ok === true
 * 3. COMPLIANCE — stored complianceStatus === "compliant"
 * 4. HEALTH declared — P10 declaration present
 * 5. HEALTH observed (when reportsStatus:true) — P17 snapshot present and
 *    observation.status === "ready" (health token is an input gate only;
 *    readiness verdict remains the separate READY/NOT_READY result)
 *
 * Silent declarers (reportsStatus:false) do not require an observation.
 * Orphan observations (no P4 registration) are always NOT_READY.
 */
export function derivePlatformReadiness(input: {
  readonly platformId: UmPlatformId;
  readonly record: UmPlatformRecord | undefined;
  readonly declaration: UmHealthRecord | undefined;
  readonly observation: UmHealthSnapshot | undefined;
}): UmPlatformReadinessRow {
  const { platformId, record, declaration, observation } = input;
  const reasons: UmPlatformReadinessReason[] = [];
  const registered = record !== undefined;
  const hasDeclaration = declaration !== undefined;
  const hasObservation = observation !== undefined;
  const observationStatus: UmHealthStatus | null = observation?.status ?? null;

  if (!registered) {
    reasons.push(
      reason(
        UmPlatformReadinessCode.NOT_REGISTERED,
        `Platform "${platformId}" is not registered.`,
        "platforms",
      ),
    );
    if (hasObservation) {
      reasons.push(
        reason(
          UmPlatformReadinessCode.ORPHAN_OBSERVATION,
          `Observation exists for unregistered platform "${platformId}".`,
          "observations",
        ),
      );
    }
    return {
      ...emptyRow(platformId),
      hasObservation,
      observationStatus,
      reasons: [...reasons].sort(compareReasons),
    };
  }

  const validationOk = record.validation.ok === true;
  const complianceStatus = record.complianceStatus;

  if (!validationOk) {
    reasons.push(
      reason(
        UmPlatformReadinessCode.VALIDATION_NOT_OK,
        `Platform "${platformId}" stored validation is not ok.`,
        "validation.ok",
      ),
    );
  }

  if (complianceStatus !== "compliant") {
    reasons.push(
      reason(
        UmPlatformReadinessCode.NOT_COMPLIANT,
        `Platform "${platformId}" compliance status is "${complianceStatus}"; readiness requires compliant.`,
        "complianceStatus",
      ),
    );
  }

  if (!hasDeclaration) {
    reasons.push(
      reason(
        UmPlatformReadinessCode.HEALTH_UNDECLARED,
        `Platform "${platformId}" has no health declaration.`,
        "declarations",
      ),
    );
  } else if (declaration.reportsStatus === true) {
    if (!hasObservation) {
      reasons.push(
        reason(
          UmPlatformReadinessCode.HEALTH_UNOBSERVED,
          `Platform "${platformId}" declares reportsStatus but has no observation.`,
          "observations",
        ),
      );
    } else if (observationStatus === "degraded") {
      // Health token "ready" is required as an input gate — not equated to READY.
      reasons.push(
        reason(
          UmPlatformReadinessCode.HEALTH_DEGRADED,
          `Platform "${platformId}" observation status is degraded (health token ready is required; readiness remains a separate verdict).`,
          "observations.status",
        ),
      );
    } else if (observationStatus === "unavailable") {
      reasons.push(
        reason(
          UmPlatformReadinessCode.HEALTH_UNAVAILABLE,
          `Platform "${platformId}" observation status is unavailable.`,
          "observations.status",
        ),
      );
    } else if (observationStatus !== "ready") {
      // Fail-closed for any unexpected status shape that slipped past typing.
      reasons.push(
        reason(
          UmPlatformReadinessCode.HEALTH_UNAVAILABLE,
          `Platform "${platformId}" observation status is not a usable health signal for readiness.`,
          "observations.status",
        ),
      );
    }
  }

  const status = reasons.length === 0 ? "READY" : "NOT_READY";

  return {
    platformId,
    status,
    registered: true,
    validationOk,
    complianceStatus,
    hasDeclaration,
    reportsStatus: hasDeclaration ? declaration.reportsStatus : null,
    hasObservation,
    observationStatus,
    reasons: [...reasons].sort(compareReasons),
  };
}

function resolvePlatformId(platformId: string): {
  ok: true;
  platformId: UmPlatformId;
} | {
  ok: false;
  row: UmPlatformReadinessRow;
} {
  if (!isNonEmptyTrimmed(platformId)) {
    return {
      ok: false,
      row: {
        ...emptyRow("" as UmPlatformId),
        platformId: "" as UmPlatformId,
        reasons: [
          reason(
            UmPlatformReadinessCode.PLATFORM_ID_REQUIRED,
            'Platform id is required and must be a non-empty string.',
            "platformId",
          ),
        ],
      },
    };
  }

  const trimmed = platformId.trim();
  if (!isUmMachineId(trimmed)) {
    return {
      ok: false,
      row: {
        ...emptyRow(trimmed as UmPlatformId),
        platformId: trimmed as UmPlatformId,
        reasons: [
          reason(
            UmPlatformReadinessCode.PLATFORM_ID_NAMING,
            `Platform id "${trimmed}" must be a valid machine id.`,
            "platformId",
          ),
        ],
      },
    };
  }

  return { ok: true, platformId: trimmed as UmPlatformId };
}

/**
 * Create a pure readiness evaluator over P4 + P10 + P17 read surfaces.
 * Does not probe, poll, network, schedule, persist, or mutate deps.
 */
export function createPlatformReadinessEvaluator(
  deps: UmPlatformReadinessDeps,
): UmPlatformReadinessEvaluator {
  if (deps == null || typeof deps !== "object") {
    return {
      evaluate(): UmPlatformReadinessView {
        return {
          rows: [],
          tally: { ready: 0, notReady: 0 },
          readyPlatformIds: [],
          notReadyPlatformIds: [],
        };
      },
      evaluatePlatform(platformId: string): UmPlatformReadinessRow {
        const resolved = resolvePlatformId(platformId);
        if (!resolved.ok) return resolved.row;
        return {
          ...emptyRow(resolved.platformId),
          reasons: [
            reason(
              UmPlatformReadinessCode.INPUT_INVALID,
              "Readiness dependencies are invalid.",
              "deps",
            ),
          ],
        };
      },
    };
  }

  function evaluateOne(platformId: UmPlatformId): UmPlatformReadinessRow {
    return derivePlatformReadiness({
      platformId,
      record: deps.platforms.get(platformId),
      declaration: deps.declarations.get(platformId),
      observation: deps.observations.getSnapshot(platformId),
    });
  }

  return {
    evaluatePlatform(platformId: string): UmPlatformReadinessRow {
      const resolved = resolvePlatformId(platformId);
      if (!resolved.ok) return resolved.row;
      return evaluateOne(resolved.platformId);
    },

    evaluate(): UmPlatformReadinessView {
      const platformIds = new Set<string>();
      for (const record of deps.platforms.list()) {
        platformIds.add(record.platformId);
      }
      for (const snapshot of deps.observations.list()) {
        platformIds.add(snapshot.platformId);
      }

      const sortedIds = [...platformIds].sort((a, b) => a.localeCompare(b));
      const rows: UmPlatformReadinessRow[] = [];
      const readyPlatformIds: UmPlatformId[] = [];
      const notReadyPlatformIds: UmPlatformId[] = [];
      let ready = 0;
      let notReady = 0;

      for (const id of sortedIds) {
        const row = evaluateOne(id as UmPlatformId);
        rows.push(row);
        if (row.status === "READY") {
          ready += 1;
          readyPlatformIds.push(row.platformId);
        } else {
          notReady += 1;
          notReadyPlatformIds.push(row.platformId);
        }
      }

      const tally: UmPlatformReadinessTally = { ready, notReady };

      return {
        rows,
        tally,
        readyPlatformIds,
        notReadyPlatformIds,
      };
    },
  };
}
