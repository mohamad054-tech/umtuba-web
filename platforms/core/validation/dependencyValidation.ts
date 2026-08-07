/**
 * Pure registry-backed dependency completeness / drift review (UM Core P13).
 *
 * VALIDATOR COMPOSITION IS NOT DEPENDENCY RESOLUTION.
 * VALIDATOR COMPOSITION IS NOT A SECOND DEPENDENCY REGISTRY.
 *
 * P9 remains admission/cycle SoT. This helper only reviews CURRENT
 * manifest ↔ catalog completeness and referential drift.
 */

import type { UmCapabilityRegistry } from "../capability/types";
import type {
  UmDependencyRecord,
  UmDependencyRegistry,
  UmDependencyRequirement,
  UmDependencyValidationFinding,
  UmDependencyValidationResult,
} from "../dependency/types";
import type { UmPlatformId } from "../identity/types";
import type { UmPlatformRegistry } from "../registry/interfaces";
import { UmDependencyValidationCode } from "./dependencyValidationCodes";
import { isScopedUnderPlatform } from "./naming";

export interface UmPlatformDependencyValidationDeps {
  readonly platforms: UmPlatformRegistry;
  readonly dependencies: UmDependencyRegistry;
  readonly capabilities?: UmCapabilityRegistry;
}

function sameOptionalString(
  a: string | undefined,
  b: string | undefined,
): boolean {
  return (a ?? undefined) === (b ?? undefined);
}

/** Full declaration correspondence (same fields P9 uses for manifest match). */
function requirementMatchesRecord(
  req: UmDependencyRequirement,
  record: UmDependencyRecord,
): boolean {
  return (
    req.targetKind === record.targetKind &&
    req.targetId === record.targetId &&
    req.strength === record.strength &&
    req.reason === record.reason &&
    sameOptionalString(req.minCompatibility, record.minCompatibility)
  );
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

function checkCapabilityTarget(
  platformId: UmPlatformId,
  targetId: string,
  platforms: UmPlatformRegistry,
  capabilities: UmCapabilityRegistry | undefined,
): UmDependencyValidationFinding | undefined {
  if (capabilities) {
    if (!capabilities.get(targetId)) {
      return finding(
        UmDependencyValidationCode.UNKNOWN_CAPABILITY_TARGET,
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
        UmDependencyValidationCode.UNKNOWN_CAPABILITY_TARGET,
        `In-platform capability target "${targetId}" is not declared on owner platform "${platformId}".`,
        targetId,
        targetId,
      );
    }
  }

  return undefined;
}

/**
 * Review catalog completeness and referential drift for one platform.
 * Read-only: does not mutate registries or resolve/install dependencies.
 */
export function validatePlatformDependencies(
  platformId: UmPlatformId,
  deps: UmPlatformDependencyValidationDeps,
): UmDependencyValidationResult {
  const { platforms, dependencies, capabilities } = deps;
  const findings: UmDependencyValidationFinding[] = [];

  const platform = platforms.get(platformId);
  if (!platform) {
    findings.push(
      finding(
        UmDependencyValidationCode.UNKNOWN_PLATFORM,
        `Platform "${platformId}" is not registered.`,
        platformId,
      ),
    );
    return {
      ok: false,
      findings: [...findings].sort(compareFindings),
    };
  }

  const requires = platform.manifest.requires ?? [];
  const cataloged = dependencies
    .list()
    .filter((record) => record.fromPlatformId === platformId);

  const matchedRecords = new Set<UmDependencyRecord>();

  for (const req of requires) {
    const match = cataloged.find((record) =>
      requirementMatchesRecord(req, record),
    );
    if (!match) {
      findings.push(
        finding(
          UmDependencyValidationCode.MISSING_CATALOG_EDGE,
          `Manifest requirement ${req.targetKind}:${req.targetId}:${req.strength} is not materialized in the dependency catalog.`,
          req.targetId,
          req.targetKind === "capability" ? req.targetId : undefined,
        ),
      );
      continue;
    }
    matchedRecords.add(match);
  }

  for (const record of cataloged) {
    if (matchedRecords.has(record)) continue;
    findings.push(
      finding(
        UmDependencyValidationCode.STALE_CATALOG_EDGE,
        `Dependency catalog edge "${record.edgeId}" is not declared in the current platform manifest requires[].`,
        record.targetId,
        record.targetKind === "capability" ? record.targetId : undefined,
      ),
    );
  }

  for (const record of matchedRecords) {
    if (record.targetKind === "platform") {
      if (!platforms.get(record.targetId)) {
        findings.push(
          finding(
            UmDependencyValidationCode.UNKNOWN_PLATFORM_TARGET,
            `Platform dependency target "${record.targetId}" is not present in the current platform registry.`,
            record.targetId,
          ),
        );
      }
      continue;
    }

    if (record.targetKind === "capability") {
      const capFinding = checkCapabilityTarget(
        platformId,
        record.targetId,
        platforms,
        capabilities,
      );
      if (capFinding) findings.push(capFinding);
      continue;
    }

    // peer_kernel: opaque — completeness/stale only; never resolve against P4.
  }

  const sorted = [...findings].sort(compareFindings);
  return {
    ok: sorted.length === 0,
    findings: sorted,
  };
}
