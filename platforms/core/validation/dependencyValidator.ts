/**
 * In-memory Dependency Validator Foundation (UM Core P19).
 *
 * Pure deterministic requirement review over P4 (+ optional P5 / P9).
 * DEPENDENCY VALIDATION IS NOT DEPENDENCY RESOLUTION.
 * DEPENDENCY VALIDATION IS NOT P13 COMPLETENESS/DRIFT REVIEW.
 * DEPENDENCY VALIDATION IS NOT CATALOG REFERENTIAL INTEGRITY.
 *
 * @see UM_CORE_SPECIFICATION_V1
 * @see UM_CORE_ENGINEERING_STANDARDS_V1 (§7 dependencies)
 */

import type { UmCapabilityRegistry } from "../capability/types";
import type {
  UmDependencyRecord,
  UmDependencyRequirement,
  UmDependencyStrength,
  UmDependencyTargetKind,
  UmDependencyValidationFinding,
  UmDependencyValidationResult,
  UmDependencyValidator,
  UmDependencyValidatorDeps,
} from "../dependency/types";
import type { UmPlatformId } from "../identity/types";
import type { UmPlatformRegistry } from "../registry/interfaces";
import { UmDependencyValidatorCode } from "./dependencyValidatorCodes";
import { isNonEmptyTrimmed, isScopedUnderPlatform, isUmMachineId } from "./naming";

const TARGET_KINDS = new Set<UmDependencyTargetKind>([
  "platform",
  "capability",
  "peer_kernel",
]);

const STRENGTHS = new Set<UmDependencyStrength>(["required", "optional"]);

function finding(
  code: string,
  message: string,
  targetId?: string,
  relatedCapabilityId?: string,
): UmDependencyValidationFinding {
  return {
    code,
    message,
    ...(targetId !== undefined ? { targetId } : {}),
    ...(relatedCapabilityId !== undefined ? { relatedCapabilityId } : {}),
  };
}

function compareFindings(
  a: UmDependencyValidationFinding,
  b: UmDependencyValidationFinding,
): number {
  const code = a.code.localeCompare(b.code);
  if (code !== 0) return code;
  const target = (a.targetId ?? "").localeCompare(b.targetId ?? "");
  if (target !== 0) return target;
  return (a.relatedCapabilityId ?? "").localeCompare(
    b.relatedCapabilityId ?? "",
  );
}

function requirementEdgeKey(req: UmDependencyRequirement): string {
  return `${req.targetKind}:${req.targetId}:${req.strength}`;
}

/**
 * True if a path of required platform→platform edges exists from `from`
 * to `to` (including the trivial self-path when from === to).
 */
function hasRequiredPlatformPath(
  from: string,
  to: string,
  adjacency: ReadonlyMap<string, readonly string[]>,
): boolean {
  if (from === to) return true;
  const stack = [from];
  const seen = new Set<string>();
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (seen.has(node)) continue;
    seen.add(node);
    const next = adjacency.get(node) ?? [];
    for (const dest of next) {
      if (dest === to) return true;
      if (!seen.has(dest)) stack.push(dest);
    }
  }
  return false;
}

function buildRequiredPlatformAdjacency(
  existing: readonly UmDependencyRecord[],
): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const record of existing) {
    if (record.targetKind === "platform" && record.strength === "required") {
      const list = adj.get(record.fromPlatformId) ?? [];
      list.push(record.targetId);
      adj.set(record.fromPlatformId, list);
    }
  }
  return adj;
}

function checkCapabilityTarget(
  platformId: UmPlatformId,
  targetId: string,
  platforms: UmPlatformRegistry,
  capabilities: UmCapabilityRegistry | undefined,
): UmDependencyValidationFinding | undefined {
  if (capabilities) {
    if (!capabilities.get(targetId)) {
      return finding(
        UmDependencyValidatorCode.UNKNOWN_CAPABILITY_TARGET,
        `Capability target "${targetId}" is not present in the current capability registry.`,
        targetId,
        targetId,
      );
    }
    return undefined;
  }

  if (isScopedUnderPlatform(targetId, platformId)) {
    const owner = platforms.get(platformId);
    const known = owner?.capabilities.some((c) => c.capabilityId === targetId);
    if (!known) {
      return finding(
        UmDependencyValidatorCode.UNKNOWN_CAPABILITY_TARGET,
        `In-platform capability target "${targetId}" is not declared on owner platform "${platformId}".`,
        targetId,
        targetId,
      );
    }
  }

  return undefined;
}

function validateOneRequirementStructure(
  req: UmDependencyRequirement,
): UmDependencyValidationFinding[] {
  const findings: UmDependencyValidationFinding[] = [];

  if (!TARGET_KINDS.has(req.targetKind)) {
    findings.push(
      finding(
        UmDependencyValidatorCode.TARGET_KIND_INVALID,
        `Dependency targetKind "${String(req.targetKind)}" is invalid.`,
        typeof req.targetId === "string" ? req.targetId : undefined,
      ),
    );
  }

  if (!isNonEmptyTrimmed(req.targetId)) {
    findings.push(
      finding(
        UmDependencyValidatorCode.TARGET_ID_REQUIRED,
        "Dependency targetId is required.",
      ),
    );
  } else if (!isUmMachineId(req.targetId)) {
    findings.push(
      finding(
        UmDependencyValidatorCode.TARGET_ID_NAMING,
        `Dependency targetId "${req.targetId}" is not a valid machine id.`,
        req.targetId,
      ),
    );
  }

  if (!STRENGTHS.has(req.strength)) {
    findings.push(
      finding(
        UmDependencyValidatorCode.STRENGTH_INVALID,
        `Dependency strength "${String(req.strength)}" is invalid.`,
        typeof req.targetId === "string" ? req.targetId : undefined,
      ),
    );
  }

  if (!isNonEmptyTrimmed(req.reason)) {
    findings.push(
      finding(
        UmDependencyValidatorCode.REASON_REQUIRED,
        "Dependency reason is required.",
        typeof req.targetId === "string" && isNonEmptyTrimmed(req.targetId)
          ? req.targetId
          : undefined,
      ),
    );
  }

  return findings;
}

/**
 * Validate a candidate requires[] for one platform.
 * Read-only: does not mutate registries, resolve/install dependencies,
 * evaluate minCompatibility, or review catalog completeness/drift.
 */
export function validateDependencyRequirements(
  platformId: UmPlatformId,
  requirements: readonly UmDependencyRequirement[],
  deps: UmDependencyValidatorDeps,
): UmDependencyValidationResult {
  const { platforms, capabilities, dependencies } = deps;
  const findings: UmDependencyValidationFinding[] = [];

  if (!isNonEmptyTrimmed(platformId) || !platforms.get(platformId)) {
    findings.push(
      finding(
        UmDependencyValidatorCode.UNKNOWN_PLATFORM,
        `Platform "${String(platformId)}" is not registered.`,
        typeof platformId === "string" ? platformId : undefined,
      ),
    );
    return {
      ok: false,
      findings: [...findings].sort(compareFindings),
    };
  }

  if (!Array.isArray(requirements)) {
    // Fail closed on non-array input (defensive; TS callers pass readonly arrays).
    findings.push(
      finding(
        UmDependencyValidatorCode.TARGET_KIND_INVALID,
        "Requirements must be a readonly array of dependency requirements.",
      ),
    );
    return {
      ok: false,
      findings: [...findings].sort(compareFindings),
    };
  }

  const seenKeys = new Map<string, number>();

  for (const req of requirements) {
    findings.push(...validateOneRequirementStructure(req));

    if (
      TARGET_KINDS.has(req.targetKind) &&
      isNonEmptyTrimmed(req.targetId) &&
      STRENGTHS.has(req.strength)
    ) {
      const key = requirementEdgeKey(req);
      const prior = seenKeys.get(key);
      if (prior !== undefined) {
        findings.push(
          finding(
            UmDependencyValidatorCode.DUPLICATE_REQUIREMENT,
            `Duplicate requirement ${key} (first seen at index ${prior}).`,
            req.targetId,
            req.targetKind === "capability" ? req.targetId : undefined,
          ),
        );
      } else {
        seenKeys.set(key, seenKeys.size);
      }
    }
  }

  // Referential checks only for structurally sound requirement rows.
  for (const req of requirements) {
    if (!TARGET_KINDS.has(req.targetKind)) continue;
    if (!isNonEmptyTrimmed(req.targetId) || !isUmMachineId(req.targetId)) {
      continue;
    }
    if (!STRENGTHS.has(req.strength)) continue;

    if (req.targetKind === "platform") {
      if (!platforms.get(req.targetId)) {
        findings.push(
          finding(
            UmDependencyValidatorCode.UNKNOWN_PLATFORM_TARGET,
            `Platform dependency target "${req.targetId}" is not present in the current platform registry.`,
            req.targetId,
          ),
        );
      }
      continue;
    }

    if (req.targetKind === "capability") {
      const capFinding = checkCapabilityTarget(
        platformId,
        req.targetId,
        platforms,
        capabilities,
      );
      if (capFinding) findings.push(capFinding);
      continue;
    }

    // peer_kernel: opaque — never resolve against P4.
  }

  // Required-platform cycle SoT (P9 policy), read-only prospective check.
  const catalogRecords: readonly UmDependencyRecord[] = dependencies
    ? dependencies.list()
    : [];
  const adj = buildRequiredPlatformAdjacency(catalogRecords);

  // Replace this owner's existing required-platform edges with the candidate set
  // so re-validation of the current requires[] does not false-positive on itself.
  adj.set(platformId, []);
  for (const req of requirements) {
    if (
      req.targetKind === "platform" &&
      req.strength === "required" &&
      isNonEmptyTrimmed(req.targetId) &&
      isUmMachineId(req.targetId) &&
      platforms.get(req.targetId)
    ) {
      const list = adj.get(platformId) ?? [];
      list.push(req.targetId);
      adj.set(platformId, list);
    }
  }

  for (const req of requirements) {
    if (
      req.targetKind !== "platform" ||
      req.strength !== "required" ||
      !isNonEmptyTrimmed(req.targetId) ||
      !isUmMachineId(req.targetId) ||
      !platforms.get(req.targetId)
    ) {
      continue;
    }
    if (hasRequiredPlatformPath(req.targetId, platformId, adj)) {
      findings.push(
        finding(
          UmDependencyValidatorCode.REQUIRED_PLATFORM_CYCLE,
          `Required platform dependency "${platformId}" → "${req.targetId}" would create a cycle.`,
          req.targetId,
        ),
      );
    }
  }

  const sorted = [...findings].sort(compareFindings);
  return {
    ok: sorted.length === 0,
    findings: sorted,
  };
}

/**
 * Create a pure in-memory dependency validator over P4 (+ optional P5 / P9).
 * Does not mutate registries, resolve dependencies, or wire SDK/ports.
 */
export function createInMemoryDependencyValidator(
  deps: UmDependencyValidatorDeps,
): UmDependencyValidator {
  return {
    validateRequirements(platformId, requirements) {
      return validateDependencyRequirements(platformId, requirements, deps);
    },
  };
}
