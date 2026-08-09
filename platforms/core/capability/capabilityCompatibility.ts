/**
 * In-memory Capability Compatibility Matrix Foundation (UM Core P24).
 *
 * Pure deterministic declaration / presence review over P4 (+ optional P5/P9).
 * Read-only — never mutates injected stores.
 *
 * CAPABILITY COMPATIBILITY IS NOT RUNTIME HEALTH.
 * CAPABILITY COMPATIBILITY IS NOT LIFECYCLE READINESS.
 * CAPABILITY COMPATIBILITY IS NOT SERVICE DISCOVERY.
 * CAPABILITY COMPATIBILITY IS NOT P15 ASSERTION / FLAG EVALUATION.
 * minCompatibility is NEVER evaluated.
 *
 * @see UM_CORE_SPECIFICATION_V1
 * @see UM_CORE_ENGINEERING_STANDARDS_V1 (§4 / §7)
 */

import type { UmCapabilityId, UmPlatformId } from "../identity/types";
import type { UmPlatformRecord } from "../registry/interfaces";
import { isNonEmptyTrimmed, isUmMachineId } from "../validation/naming";
import { UmCapabilityCompatibilityCode } from "./compatibilityCodes";
import type {
  UmCapabilityCompatibilityDeps,
  UmCapabilityCompatibilityEvaluator,
  UmCapabilityCompatibilityFinding,
  UmCapabilityCompatibilityFindingSeverity,
  UmCapabilityCompatibilityMatrix,
  UmCapabilityCompatibilityMatrixCell,
  UmCapabilityCompatibilityResult,
} from "./compatibilityTypes";

const STANDARD_REF =
  "UM_CORE_PLATFORM_CAPABILITY_COMPATIBILITY_MATRIX_FOUNDATION_V1";

const SEVERITY_RANK: Record<UmCapabilityCompatibilityFindingSeverity, number> =
  {
    error: 0,
    warning: 1,
    info: 2,
  };

function finding(
  code: string,
  severity: UmCapabilityCompatibilityFindingSeverity,
  message: string,
  path?: string,
  capabilityId?: UmCapabilityId,
): UmCapabilityCompatibilityFinding {
  return {
    code,
    severity,
    message,
    ...(path !== undefined ? { path } : {}),
    ...(capabilityId !== undefined ? { capabilityId } : {}),
    standardRef: STANDARD_REF,
  };
}

function compareFindings(
  a: UmCapabilityCompatibilityFinding,
  b: UmCapabilityCompatibilityFinding,
): number {
  const sev = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
  if (sev !== 0) return sev;
  const code = a.code.localeCompare(b.code);
  if (code !== 0) return code;
  const cap = (a.capabilityId ?? "").localeCompare(b.capabilityId ?? "");
  if (cap !== 0) return cap;
  const path = (a.path ?? "").localeCompare(b.path ?? "");
  if (path !== 0) return path;
  return a.message.localeCompare(b.message);
}

function uniqueSortedIds(ids: readonly string[]): UmCapabilityId[] {
  return [...new Set(ids.filter((id) => isNonEmptyTrimmed(id)))].sort((a, b) =>
    a.localeCompare(b),
  ) as UmCapabilityId[];
}

function declaredCapabilityIds(
  record: UmPlatformRecord,
): readonly UmCapabilityId[] {
  return uniqueSortedIds(record.capabilities.map((c) => c.capabilityId));
}

function emptyResult(
  platformId: UmPlatformId,
  findings: readonly UmCapabilityCompatibilityFinding[],
  requiredCapabilityIds: readonly UmCapabilityId[] = [],
  missingRequiredCapabilityIds: readonly UmCapabilityId[] = [],
): UmCapabilityCompatibilityResult {
  return {
    platformId,
    status: "INCOMPATIBLE",
    registered: false,
    declaredCapabilityIds: [],
    requiredCapabilityIds,
    missingRequiredCapabilityIds,
    findings: [...findings].sort(compareFindings),
  };
}

function resolveMachineId(
  value: string,
  kind: "platform" | "capability",
):
  | { ok: true; id: string }
  | { ok: false; findings: UmCapabilityCompatibilityFinding[] } {
  const requiredCode =
    kind === "platform"
      ? UmCapabilityCompatibilityCode.PLATFORM_ID_REQUIRED
      : UmCapabilityCompatibilityCode.CAPABILITY_ID_REQUIRED;
  const namingCode =
    kind === "platform"
      ? UmCapabilityCompatibilityCode.PLATFORM_ID_NAMING
      : UmCapabilityCompatibilityCode.CAPABILITY_ID_NAMING;
  const path = kind === "platform" ? "platformId" : "capabilityId";
  const label = kind === "platform" ? "Platform" : "Capability";

  if (!isNonEmptyTrimmed(value)) {
    return {
      ok: false,
      findings: [
        finding(
          requiredCode,
          "error",
          `${label} id is required and must be a non-empty string.`,
          path,
        ),
      ],
    };
  }

  const trimmed = value.trim();
  if (!isUmMachineId(trimmed)) {
    return {
      ok: false,
      findings: [
        finding(
          namingCode,
          "error",
          `${label} id "${trimmed}" must be a valid machine id.`,
          path,
        ),
      ],
    };
  }

  return { ok: true, id: trimmed };
}

function capabilityExistsInCatalogs(
  capabilityId: UmCapabilityId,
  deps: UmCapabilityCompatibilityDeps,
): boolean {
  if (deps.capabilities) {
    return deps.capabilities.has(capabilityId);
  }

  for (const platform of deps.platforms.list()) {
    if (
      platform.capabilities.some((c) => c.capabilityId === capabilityId)
    ) {
      return true;
    }
  }
  return false;
}

function requiredCapabilityTargets(
  requirements: readonly {
    readonly targetKind: string;
    readonly targetId: string;
    readonly strength: string;
  }[],
): readonly UmCapabilityId[] {
  return uniqueSortedIds(
    requirements
      .filter(
        (req) =>
          req.targetKind === "capability" && req.strength === "required",
      )
      .map((req) => req.targetId),
  );
}

/**
 * Prefer P9 catalog requirements when the platform has any registered edges;
 * otherwise fall back to manifest.requires (declaration-time consumer deps).
 */
function consumerRequiredCapabilityIds(
  platformId: UmPlatformId,
  deps: UmCapabilityCompatibilityDeps,
  record: UmPlatformRecord,
): readonly UmCapabilityId[] {
  if (deps.dependencies) {
    const registered = deps.dependencies.listRequirements(platformId);
    if (registered.length > 0) {
      return requiredCapabilityTargets(registered);
    }
  }

  return requiredCapabilityTargets(record.manifest.requires);
}

function evaluateProvides(
  platformId: UmPlatformId,
  record: UmPlatformRecord,
  requiredCapabilityIds: readonly UmCapabilityId[],
): UmCapabilityCompatibilityResult {
  const declared = declaredCapabilityIds(record);
  const declaredSet = new Set<string>(declared);
  const findings: UmCapabilityCompatibilityFinding[] = [];
  const missing: UmCapabilityId[] = [];

  for (const capabilityId of requiredCapabilityIds) {
    if (declaredSet.has(capabilityId)) {
      findings.push(
        finding(
          UmCapabilityCompatibilityCode.PLATFORM_DECLARES_CAPABILITY,
          "info",
          `Platform "${platformId}" declares capability "${capabilityId}".`,
          `platforms[${platformId}].capabilities`,
          capabilityId,
        ),
      );
    } else {
      missing.push(capabilityId);
      findings.push(
        finding(
          UmCapabilityCompatibilityCode.REQUIRED_CAPABILITY_UNDECLARED,
          "error",
          `Platform "${platformId}" does not declare required capability "${capabilityId}".`,
          `platforms[${platformId}].capabilities`,
          capabilityId,
        ),
      );
    }
  }

  const status = missing.length === 0 ? "COMPATIBLE" : "INCOMPATIBLE";
  if (status === "COMPATIBLE") {
    findings.push(
      finding(
        UmCapabilityCompatibilityCode.COMPATIBLE,
        "info",
        `Platform "${platformId}" satisfies all required capability declarations.`,
        `platforms[${platformId}]`,
      ),
    );
  }

  return {
    platformId,
    status,
    registered: true,
    declaredCapabilityIds: declared,
    requiredCapabilityIds,
    missingRequiredCapabilityIds: missing,
    findings: [...findings].sort(compareFindings),
  };
}

function evaluateRequirements(
  platformId: UmPlatformId,
  record: UmPlatformRecord,
  deps: UmCapabilityCompatibilityDeps,
): UmCapabilityCompatibilityResult {
  const declared = declaredCapabilityIds(record);
  const requiredCapabilityIds = consumerRequiredCapabilityIds(
    platformId,
    deps,
    record,
  );
  const findings: UmCapabilityCompatibilityFinding[] = [];
  const missing: UmCapabilityId[] = [];

  for (const capabilityId of requiredCapabilityIds) {
    if (capabilityExistsInCatalogs(capabilityId, deps)) {
      findings.push(
        finding(
          UmCapabilityCompatibilityCode.REQUIRED_CAPABILITY_EXISTS,
          "info",
          `Required capability "${capabilityId}" exists for platform "${platformId}".`,
          `requires[${capabilityId}]`,
          capabilityId,
        ),
      );
    } else {
      missing.push(capabilityId);
      findings.push(
        finding(
          UmCapabilityCompatibilityCode.REQUIRED_CAPABILITY_MISSING,
          "error",
          `Required capability "${capabilityId}" is missing for platform "${platformId}".`,
          `requires[${capabilityId}]`,
          capabilityId,
        ),
      );
    }
  }

  const status = missing.length === 0 ? "COMPATIBLE" : "INCOMPATIBLE";
  if (status === "COMPATIBLE") {
    findings.push(
      finding(
        UmCapabilityCompatibilityCode.COMPATIBLE,
        "info",
        `Platform "${platformId}" required capability dependencies are satisfied.`,
        `platforms[${platformId}]`,
      ),
    );
  }

  return {
    platformId,
    status,
    registered: true,
    declaredCapabilityIds: declared,
    requiredCapabilityIds,
    missingRequiredCapabilityIds: missing,
    findings: [...findings].sort(compareFindings),
  };
}

/**
 * Create a pure capability compatibility evaluator over P4 (+ optional P5/P9).
 * Does not mutate catalogs, evaluate flags, probe health, or network.
 */
export function createCapabilityCompatibilityEvaluator(
  deps: UmCapabilityCompatibilityDeps,
): UmCapabilityCompatibilityEvaluator {
  if (deps == null || typeof deps !== "object" || deps.platforms == null) {
    return {
      platformDeclaresCapability() {
        return false;
      },
      requiredCapabilityExists() {
        return false;
      },
      evaluatePlatformProvides(platformId) {
        const resolved = resolveMachineId(platformId, "platform");
        if (!resolved.ok) {
          return emptyResult("" as UmPlatformId, resolved.findings);
        }
        return emptyResult(resolved.id as UmPlatformId, [
          finding(
            UmCapabilityCompatibilityCode.INPUT_INVALID,
            "error",
            "Capability compatibility dependencies are invalid.",
            "deps",
          ),
        ]);
      },
      evaluatePlatformRequirements(platformId) {
        const resolved = resolveMachineId(platformId, "platform");
        if (!resolved.ok) {
          return emptyResult("" as UmPlatformId, resolved.findings);
        }
        return emptyResult(resolved.id as UmPlatformId, [
          finding(
            UmCapabilityCompatibilityCode.INPUT_INVALID,
            "error",
            "Capability compatibility dependencies are invalid.",
            "deps",
          ),
        ]);
      },
      evaluateMatrix() {
        return {
          platformIds: [],
          capabilityIds: [],
          cells: [],
          rows: [],
        };
      },
    };
  }

  return {
    platformDeclaresCapability(platformId, capabilityId) {
      const platformResolved = resolveMachineId(platformId, "platform");
      const capabilityResolved = resolveMachineId(capabilityId, "capability");
      if (!platformResolved.ok || !capabilityResolved.ok) return false;
      const record = deps.platforms.get(
        platformResolved.id as UmPlatformId,
      );
      if (!record) return false;
      return record.capabilities.some(
        (c) => c.capabilityId === capabilityResolved.id,
      );
    },

    requiredCapabilityExists(capabilityId) {
      const resolved = resolveMachineId(capabilityId, "capability");
      if (!resolved.ok) return false;
      return capabilityExistsInCatalogs(
        resolved.id as UmCapabilityId,
        deps,
      );
    },

    evaluatePlatformProvides(platformId, requiredCapabilityIds) {
      const resolved = resolveMachineId(platformId, "platform");
      if (!resolved.ok) {
        return emptyResult(
          (isNonEmptyTrimmed(platformId) ? platformId.trim() : "") as UmPlatformId,
          resolved.findings,
          uniqueSortedIds(requiredCapabilityIds ?? []),
          uniqueSortedIds(requiredCapabilityIds ?? []),
        );
      }

      const required = uniqueSortedIds(requiredCapabilityIds ?? []);
      const record = deps.platforms.get(resolved.id as UmPlatformId);
      if (!record) {
        return emptyResult(
          resolved.id as UmPlatformId,
          [
            finding(
              UmCapabilityCompatibilityCode.UNKNOWN_PLATFORM,
              "error",
              `Platform "${resolved.id}" is not registered.`,
              "platforms",
            ),
          ],
          required,
          required,
        );
      }

      return evaluateProvides(resolved.id as UmPlatformId, record, required);
    },

    evaluatePlatformRequirements(platformId) {
      const resolved = resolveMachineId(platformId, "platform");
      if (!resolved.ok) {
        return emptyResult(
          (isNonEmptyTrimmed(platformId) ? platformId.trim() : "") as UmPlatformId,
          resolved.findings,
        );
      }

      const record = deps.platforms.get(resolved.id as UmPlatformId);
      if (!record) {
        return emptyResult(resolved.id as UmPlatformId, [
          finding(
            UmCapabilityCompatibilityCode.UNKNOWN_PLATFORM,
            "error",
            `Platform "${resolved.id}" is not registered.`,
            "platforms",
          ),
        ]);
      }

      return evaluateRequirements(
        resolved.id as UmPlatformId,
        record,
        deps,
      );
    },

    evaluateMatrix(): UmCapabilityCompatibilityMatrix {
      const platforms = [...deps.platforms.list()].sort((a, b) =>
        a.platformId.localeCompare(b.platformId),
      );
      const platformIds = platforms.map((p) => p.platformId);

      const capabilityIdSet = new Set<string>();
      for (const platform of platforms) {
        for (const cap of platform.capabilities) {
          capabilityIdSet.add(cap.capabilityId);
        }
      }
      if (deps.capabilities) {
        for (const record of deps.capabilities.list()) {
          capabilityIdSet.add(record.capabilityId);
        }
      }
      const capabilityIds = [...capabilityIdSet].sort((a, b) =>
        a.localeCompare(b),
      ) as UmCapabilityId[];

      const cells: UmCapabilityCompatibilityMatrixCell[] = [];
      for (const platform of platforms) {
        const declared = new Set(
          platform.capabilities.map((c) => c.capabilityId),
        );
        for (const capabilityId of capabilityIds) {
          cells.push({
            platformId: platform.platformId,
            capabilityId,
            declared: declared.has(capabilityId),
          });
        }
      }

      const rows = platforms.map((platform) =>
        evaluateRequirements(platform.platformId, platform, deps),
      );

      return {
        platformIds,
        capabilityIds,
        cells,
        rows,
      };
    },
  };
}
