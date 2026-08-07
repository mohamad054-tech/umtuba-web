/**
 * In-memory Dependency Registry Foundation (UM Core P9).
 *
 * Pure catalog of declared dependency edges from registered platforms.
 * DEPENDENCY REGISTRATION IS NOT DEPENDENCY RESOLUTION.
 *
 * @see UM_CORE_SPECIFICATION_V1
 * @see UM_CORE_ENGINEERING_STANDARDS_V1 (§7 dependencies)
 */

import type { UmCapabilityRegistry } from "../capability/types";
import type { UmPlatformRegistry } from "../registry/interfaces";
import {
  isNonEmptyTrimmed,
  isScopedUnderPlatform,
  isUmMachineId,
} from "../validation/naming";
import { UmDependencyRegistryCode } from "./codes";
import type {
  UmDependencyDeclaration,
  UmDependencyEdge,
  UmDependencyEdgeId,
  UmDependencyRecord,
  UmDependencyRegistrationInput,
  UmDependencyRegistrationResult,
  UmDependencyRegistryDeps,
  UmDependencyRegistryFinding,
  UmDependencyRegistryFindingSeverity,
  UmDependencyRequirement,
  UmDependencyStrength,
  UmDependencyTargetKind,
  UmInMemoryDependencyRegistry,
} from "./types";

const SEVERITY_RANK: Record<UmDependencyRegistryFindingSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

const TARGET_KINDS = new Set<UmDependencyTargetKind>([
  "platform",
  "capability",
  "peer_kernel",
]);

const STRENGTHS = new Set<UmDependencyStrength>(["required", "optional"]);

/**
 * Deterministic edge id from the declared edge (no randomness).
 */
export function buildDependencyEdgeId(
  fromPlatformId: string,
  targetKind: string,
  targetId: string,
  strength: string,
): UmDependencyEdgeId {
  return `${fromPlatformId}=>${targetKind}:${targetId}:${strength}`;
}

function finding(
  code: string,
  severity: UmDependencyRegistryFindingSeverity,
  message: string,
  path: string | undefined,
  standardRef: string,
): UmDependencyRegistryFinding {
  return { code, severity, message, path, standardRef };
}

function compareFindings(
  a: UmDependencyRegistryFinding,
  b: UmDependencyRegistryFinding,
): number {
  const sev = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
  if (sev !== 0) return sev;
  const code = a.code.localeCompare(b.code);
  if (code !== 0) return code;
  return (a.path ?? "").localeCompare(b.path ?? "");
}

function compareRecords(a: UmDependencyRecord, b: UmDependencyRecord): number {
  return a.edgeId.localeCompare(b.edgeId);
}

function toRequirement(record: UmDependencyRecord): UmDependencyRequirement {
  return {
    targetKind: record.targetKind,
    targetId: record.targetId,
    strength: record.strength,
    reason: record.reason,
    ...(record.minCompatibility !== undefined
      ? { minCompatibility: record.minCompatibility }
      : {}),
  };
}

function toEdge(record: UmDependencyRecord): UmDependencyEdge {
  return {
    fromPlatformId: record.fromPlatformId,
    requirement: toRequirement(record),
  };
}

function sameOptionalString(
  a: string | undefined,
  b: string | undefined,
): boolean {
  return (a ?? undefined) === (b ?? undefined);
}

function findManifestRequirement(
  requires: readonly UmDependencyRequirement[],
  decl: UmDependencyDeclaration,
): UmDependencyRequirement | undefined {
  return requires.find(
    (req) =>
      req.targetKind === decl.targetKind &&
      req.targetId === decl.targetId &&
      req.strength === decl.strength &&
      req.reason === decl.reason &&
      sameOptionalString(req.minCompatibility, decl.minCompatibility),
  );
}

/**
 * True if a path of required platform→platform edges exists from `from`
 * to `to` in the current catalog (including a prospective edge via visited).
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
  existing: ReadonlyMap<string, UmDependencyRecord>,
): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const record of existing.values()) {
    if (
      record.targetKind === "platform" &&
      record.strength === "required"
    ) {
      const list = adj.get(record.fromPlatformId) ?? [];
      list.push(record.targetId);
      adj.set(record.fromPlatformId, list);
    }
  }
  return adj;
}

function evaluateRegistration(
  input: UmDependencyRegistrationInput,
  platforms: UmPlatformRegistry,
  capabilities: UmCapabilityRegistry | undefined,
  existing: ReadonlyMap<string, UmDependencyRecord>,
): UmDependencyRegistrationResult {
  const decl = input.dependency;
  const findings: UmDependencyRegistryFinding[] = [];

  if (!isNonEmptyTrimmed(decl.fromPlatformId)) {
    findings.push(
      finding(
        UmDependencyRegistryCode.FROM_PLATFORM_REQUIRED,
        "error",
        "Dependency fromPlatformId is required.",
        "dependency.fromPlatformId",
        "Standards §7",
      ),
    );
  } else if (!isUmMachineId(decl.fromPlatformId)) {
    findings.push(
      finding(
        UmDependencyRegistryCode.FROM_PLATFORM_NAMING,
        "error",
        `fromPlatformId "${decl.fromPlatformId}" is not a valid machine id.`,
        "dependency.fromPlatformId",
        "Standards §2 / §7",
      ),
    );
  }

  if (!TARGET_KINDS.has(decl.targetKind)) {
    findings.push(
      finding(
        UmDependencyRegistryCode.TARGET_KIND_INVALID,
        "error",
        `Dependency targetKind "${String(decl.targetKind)}" is invalid.`,
        "dependency.targetKind",
        "Standards §7.4",
      ),
    );
  }

  if (!isNonEmptyTrimmed(decl.targetId)) {
    findings.push(
      finding(
        UmDependencyRegistryCode.TARGET_ID_REQUIRED,
        "error",
        "Dependency targetId is required.",
        "dependency.targetId",
        "Standards §7.4",
      ),
    );
  } else if (!isUmMachineId(decl.targetId)) {
    findings.push(
      finding(
        UmDependencyRegistryCode.TARGET_ID_NAMING,
        "error",
        `Dependency targetId "${decl.targetId}" is not a valid machine id.`,
        "dependency.targetId",
        "Standards §2 / §7",
      ),
    );
  }

  if (!STRENGTHS.has(decl.strength)) {
    findings.push(
      finding(
        UmDependencyRegistryCode.STRENGTH_INVALID,
        "error",
        `Dependency strength "${String(decl.strength)}" is invalid.`,
        "dependency.strength",
        "Standards §7.4",
      ),
    );
  }

  if (!isNonEmptyTrimmed(decl.reason)) {
    findings.push(
      finding(
        UmDependencyRegistryCode.REASON_REQUIRED,
        "error",
        "Dependency reason is required.",
        "dependency.reason",
        "Standards §7.4",
      ),
    );
  }

  const edgeId =
    isNonEmptyTrimmed(decl.fromPlatformId) &&
    isNonEmptyTrimmed(decl.targetId) &&
    TARGET_KINDS.has(decl.targetKind) &&
    STRENGTHS.has(decl.strength)
      ? buildDependencyEdgeId(
          decl.fromPlatformId,
          decl.targetKind,
          decl.targetId,
          decl.strength,
        )
      : "";

  if (edgeId && existing.has(edgeId)) {
    findings.push(
      finding(
        UmDependencyRegistryCode.DUPLICATE_EDGE,
        "error",
        `Dependency edge "${edgeId}" is already registered.`,
        "dependency",
        "Standards §7 / §15",
      ),
    );
    return {
      ok: false,
      edgeId,
      findings: [...findings].sort(compareFindings),
    };
  }

  const owner = isNonEmptyTrimmed(decl.fromPlatformId)
    ? platforms.get(decl.fromPlatformId)
    : undefined;

  if (isNonEmptyTrimmed(decl.fromPlatformId) && !owner) {
    findings.push(
      finding(
        UmDependencyRegistryCode.UNKNOWN_OWNER_PLATFORM,
        "error",
        `Owner platform "${decl.fromPlatformId}" is not registered.`,
        "dependency.fromPlatformId",
        "Standards §7 / §15",
      ),
    );
  } else if (owner) {
    const matched = findManifestRequirement(owner.manifest.requires, decl);
    if (!matched) {
      findings.push(
        finding(
          UmDependencyRegistryCode.MANIFEST_MISMATCH,
          "error",
          `Dependency is not declared in owner platform "${decl.fromPlatformId}" manifest requires[].`,
          "dependency",
          "Standards §3.4 / §7",
        ),
      );
    }
  }

  if (decl.targetKind === "platform" && isNonEmptyTrimmed(decl.targetId)) {
    if (!platforms.get(decl.targetId)) {
      findings.push(
        finding(
          UmDependencyRegistryCode.UNKNOWN_PLATFORM_TARGET,
          "error",
          `Required platform target "${decl.targetId}" is not registered in the platform registry.`,
          "dependency.targetId",
          "Standards §7 / §15",
        ),
      );
    }
  }

  if (decl.targetKind === "capability" && isNonEmptyTrimmed(decl.targetId)) {
    if (capabilities) {
      if (!capabilities.get(decl.targetId)) {
        findings.push(
          finding(
            UmDependencyRegistryCode.UNKNOWN_CAPABILITY_TARGET,
            "error",
            `Capability target "${decl.targetId}" is not present in the capability registry.`,
            "dependency.targetId",
            "Standards §4 / §7",
          ),
        );
      }
    } else if (
      owner &&
      isNonEmptyTrimmed(decl.fromPlatformId) &&
      isScopedUnderPlatform(decl.targetId, decl.fromPlatformId)
    ) {
      const known = owner.capabilities.some(
        (c) => c.capabilityId === decl.targetId,
      );
      if (!known) {
        findings.push(
          finding(
            UmDependencyRegistryCode.UNKNOWN_CAPABILITY_TARGET,
            "error",
            `In-platform capability target "${decl.targetId}" is not declared on owner platform "${decl.fromPlatformId}".`,
            "dependency.targetId",
            "Standards §7.1 consistency",
          ),
        );
      }
    }
  }

  // peer_kernel: opaque catalog only — no resolution checks.

  if (
    decl.targetKind === "platform" &&
    decl.strength === "required" &&
    isNonEmptyTrimmed(decl.fromPlatformId) &&
    isNonEmptyTrimmed(decl.targetId) &&
    platforms.get(decl.fromPlatformId) &&
    platforms.get(decl.targetId)
  ) {
    const adj = buildRequiredPlatformAdjacency(existing);
    // Prospective edge fromPlatform → targetId
    const list = adj.get(decl.fromPlatformId) ?? [];
    adj.set(decl.fromPlatformId, [...list, decl.targetId]);
    if (hasRequiredPlatformPath(decl.targetId, decl.fromPlatformId, adj)) {
      findings.push(
        finding(
          UmDependencyRegistryCode.REQUIRED_PLATFORM_CYCLE,
          "error",
          `Required platform dependency "${decl.fromPlatformId}" → "${decl.targetId}" would create a cycle.`,
          "dependency",
          "Standards §7.3 / Spec §8.2",
        ),
      );
    }
  }

  const errors = findings.filter((f) => f.severity === "error");
  if (errors.length > 0) {
    return {
      ok: false,
      edgeId: edgeId || "",
      findings: [...findings].sort(compareFindings),
    };
  }

  const record = buildRecord(decl, input, edgeId);
  findings.push(
    finding(
      UmDependencyRegistryCode.REGISTERED,
      "info",
      `Dependency edge "${edgeId}" registered in the in-memory catalog.`,
      "dependency",
      "Standards §7 / §15",
    ),
  );

  return {
    ok: true,
    edgeId,
    record,
    findings: [...findings].sort(compareFindings),
  };
}

function buildRecord(
  decl: UmDependencyDeclaration,
  input: UmDependencyRegistrationInput,
  edgeId: UmDependencyEdgeId,
): UmDependencyRecord {
  return {
    edgeId,
    fromPlatformId: decl.fromPlatformId,
    targetKind: decl.targetKind,
    targetId: decl.targetId,
    strength: decl.strength,
    reason: decl.reason.trim(),
    ...(decl.minCompatibility !== undefined
      ? { minCompatibility: decl.minCompatibility }
      : {}),
    ...(input.registration?.registeredAt !== undefined
      ? { registeredAt: input.registration.registeredAt }
      : {}),
  };
}

/**
 * Create a pure in-memory dependency registry.
 * Does not resolve dependencies at runtime.
 */
export function createInMemoryDependencyRegistry(
  deps: UmDependencyRegistryDeps,
): UmInMemoryDependencyRegistry {
  const store = new Map<string, UmDependencyRecord>();
  const { platforms, capabilities } = deps;

  const sortedValues = (): UmDependencyRecord[] =>
    [...store.values()].sort(compareRecords);

  return {
    register(input: UmDependencyRegistrationInput): UmDependencyRegistrationResult {
      const result = evaluateRegistration(
        input,
        platforms,
        capabilities,
        store,
      );
      if (result.ok && result.record) {
        store.set(result.edgeId, result.record);
      }
      return result;
    },

    get(edgeId) {
      return store.get(edgeId);
    },

    list() {
      return sortedValues();
    },

    listRequirements(platformId) {
      return sortedValues()
        .filter((r) => r.fromPlatformId === platformId)
        .map(toRequirement);
    },

    listDependents(targetId) {
      return sortedValues()
        .filter((r) => r.targetId === targetId)
        .map(toEdge);
    },

    listByTargetKind(targetKind) {
      return sortedValues().filter((r) => r.targetKind === targetKind);
    },

    listByStrength(strength) {
      return sortedValues().filter((r) => r.strength === strength);
    },

    has(edgeId) {
      return store.has(edgeId);
    },

    size() {
      return store.size;
    },

    clear() {
      store.clear();
    },
  };
}
