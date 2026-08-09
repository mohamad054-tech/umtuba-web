/**
 * In-memory Capability Registry Foundation (UM Core P5).
 *
 * Pure catalog of capabilities owned by registered platforms.
 * No execution, AI, networking, persistence, flag evaluation, or event routing.
 *
 * @see UM_CORE_SPECIFICATION_V1
 * @see UM_CORE_ENGINEERING_STANDARDS_V1 (§4 capability)
 */

import type {
  UmArtifactStability,
  UmAuthClass,
  UmSideEffectClass,
} from "../identity/types";
import type { UmPlatformRegistry } from "../registry/interfaces";
import {
  isNonEmptyTrimmed,
  isScopedUnderPlatform,
  isUmMachineId,
  isUmVersionToken,
} from "../validation/naming";
import { UmCapabilityRegistryCode } from "./codes";
import type {
  UmCapabilityDeclaration,
  UmCapabilityRecord,
  UmCapabilityRegistrationInput,
  UmCapabilityRegistrationResult,
  UmCapabilityRegistryFinding,
  UmCapabilityRegistryFindingSeverity,
  UmInMemoryCapabilityRegistry,
} from "./types";

const SEVERITY_RANK: Record<UmCapabilityRegistryFindingSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

const SIDE_EFFECTS: ReadonlySet<string> = new Set([
  "read",
  "write",
  "money",
  "ai",
  "admin",
  "network_external",
]);

const STABILITIES: ReadonlySet<string> = new Set([
  "experimental",
  "stable",
  "deprecated",
]);

const AUTH_CLASSES: ReadonlySet<string> = new Set([
  "none",
  "authenticated",
  "platform_admin",
  "capability_scoped",
  "service_identity",
]);

export interface UmCapabilityRegistryDeps {
  /** Registered platforms catalog (P4). Required for ownership checks. */
  readonly platforms: UmPlatformRegistry;
}

function finding(
  code: string,
  severity: UmCapabilityRegistryFindingSeverity,
  message: string,
  path: string | undefined,
  standardRef: string,
): UmCapabilityRegistryFinding {
  return { code, severity, message, path, standardRef };
}

function compareFindings(
  a: UmCapabilityRegistryFinding,
  b: UmCapabilityRegistryFinding,
): number {
  const sev = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
  if (sev !== 0) return sev;
  const code = a.code.localeCompare(b.code);
  if (code !== 0) return code;
  return (a.path ?? "").localeCompare(b.path ?? "");
}

function compareRecords(a: UmCapabilityRecord, b: UmCapabilityRecord): number {
  return a.capabilityId.localeCompare(b.capabilityId);
}

function evaluateRegistration(
  input: UmCapabilityRegistrationInput,
  platforms: UmPlatformRegistry,
  existing: ReadonlyMap<string, UmCapabilityRecord>,
): UmCapabilityRegistrationResult {
  const cap = input.capability;
  const capabilityId = cap.capabilityId;
  const findings: UmCapabilityRegistryFinding[] = [];

  if (!isNonEmptyTrimmed(capabilityId)) {
    findings.push(
      finding(
        UmCapabilityRegistryCode.CAPABILITY_ID_REQUIRED,
        "error",
        "Capability id is required.",
        "capability.capabilityId",
        "Standards §2 / §4",
      ),
    );
  } else if (!isUmMachineId(capabilityId)) {
    findings.push(
      finding(
        UmCapabilityRegistryCode.CAPABILITY_ID_NAMING,
        "error",
        `Capability id "${capabilityId}" is not a valid machine id.`,
        "capability.capabilityId",
        "Standards §2 / §4",
      ),
    );
  }

  if (isNonEmptyTrimmed(capabilityId) && existing.has(capabilityId)) {
    findings.push(
      finding(
        UmCapabilityRegistryCode.DUPLICATE_CAPABILITY_ID,
        "error",
        `Capability id "${capabilityId}" is already registered.`,
        "capability.capabilityId",
        "Standards §4 / §15",
      ),
    );
    return {
      ok: false,
      capabilityId,
      findings: [...findings].sort(compareFindings),
    };
  }

  const platform = platforms.get(cap.platformId);
  if (!platform) {
    findings.push(
      finding(
        UmCapabilityRegistryCode.UNKNOWN_PLATFORM,
        "error",
        `Platform "${cap.platformId}" is not registered.`,
        "capability.platformId",
        "Standards §4 / §15",
      ),
    );
  } else {
    const owners = platform.manifest.owners ?? [];
    if (
      owners.length === 0 ||
      !isNonEmptyTrimmed(platform.manifest.soTStatement) ||
      !isNonEmptyTrimmed(platform.manifest.nonOwnershipStatement)
    ) {
      findings.push(
        finding(
          UmCapabilityRegistryCode.OWNERSHIP_INVALID,
          "error",
          "Owning platform lacks valid ownership declarations.",
          "capability.platformId",
          "Standards §3.4 / §4",
        ),
      );
    }

    const moduleEntry = platform.modules.find((m) => m.moduleId === cap.moduleId);
    if (!moduleEntry) {
      findings.push(
        finding(
          UmCapabilityRegistryCode.UNKNOWN_MODULE,
          "error",
          `Module "${cap.moduleId}" is not in the registered platform catalog.`,
          "capability.moduleId",
          "Standards §3.3 / §4",
        ),
      );
    } else if (
      isNonEmptyTrimmed(capabilityId) &&
      !moduleEntry.capabilityIds.includes(capabilityId)
    ) {
      findings.push(
        finding(
          UmCapabilityRegistryCode.MODULE_CAPABILITY_REF_MISMATCH,
          "error",
          `Module "${cap.moduleId}" does not declare capability "${capabilityId}".`,
          "capability.moduleId",
          "Standards §3.3 / §4",
        ),
      );
    }
  }

  if (
    isNonEmptyTrimmed(capabilityId) &&
    isNonEmptyTrimmed(cap.platformId) &&
    !isScopedUnderPlatform(capabilityId, cap.platformId)
  ) {
    findings.push(
      finding(
        UmCapabilityRegistryCode.PLATFORM_NAMESPACE,
        "error",
        `Capability id "${capabilityId}" is outside platform namespace "${cap.platformId}".`,
        "capability.capabilityId",
        "Standards §2 / §4",
      ),
    );
  }

  if (!isNonEmptyTrimmed(cap.displayName)) {
    findings.push(
      finding(
        UmCapabilityRegistryCode.DISPLAY_NAME_REQUIRED,
        "error",
        "Capability display name is required.",
        "capability.displayName",
        "Standards §4",
      ),
    );
  }

  if (!isNonEmptyTrimmed(cap.version)) {
    findings.push(
      finding(
        UmCapabilityRegistryCode.VERSION_REQUIRED,
        "error",
        "Capability version is required.",
        "capability.version",
        "Standards §4",
      ),
    );
  } else if (!isUmVersionToken(cap.version)) {
    findings.push(
      finding(
        UmCapabilityRegistryCode.VERSION_INVALID,
        "error",
        `Capability version "${cap.version}" is invalid.`,
        "capability.version",
        "Standards §4",
      ),
    );
  }

  if (!STABILITIES.has(cap.stability)) {
    findings.push(
      finding(
        UmCapabilityRegistryCode.STABILITY_INVALID,
        "error",
        `Stability "${String(cap.stability)}" is invalid.`,
        "capability.stability",
        "Standards §2.4 / §4",
      ),
    );
  }

  if (!AUTH_CLASSES.has(cap.authClass)) {
    findings.push(
      finding(
        UmCapabilityRegistryCode.AUTH_CLASS_INVALID,
        "error",
        `Auth class "${String(cap.authClass)}" is invalid.`,
        "capability.authClass",
        "Standards §4",
      ),
    );
  }

  const sideEffects = cap.sideEffectClasses ?? [];
  if (sideEffects.length === 0) {
    findings.push(
      finding(
        UmCapabilityRegistryCode.SIDE_EFFECT_REQUIRED,
        "error",
        "At least one side-effect class is required.",
        "capability.sideEffectClasses",
        "Standards §4.4",
      ),
    );
  } else {
    const seen = new Set<string>();
    for (let i = 0; i < sideEffects.length; i += 1) {
      const se = sideEffects[i]!;
      if (!SIDE_EFFECTS.has(se)) {
        findings.push(
          finding(
            UmCapabilityRegistryCode.SIDE_EFFECT_INVALID,
            "error",
            `Side-effect class "${String(se)}" is invalid.`,
            `capability.sideEffectClasses[${i}]`,
            "Standards §4.4",
          ),
        );
      } else if (seen.has(se)) {
        findings.push(
          finding(
            UmCapabilityRegistryCode.SIDE_EFFECT_DUPLICATE,
            "error",
            `Duplicate side-effect class "${se}".`,
            `capability.sideEffectClasses[${i}]`,
            "Standards §4.4",
          ),
        );
      } else {
        seen.add(se);
      }
    }
  }

  const errors = findings.filter((f) => f.severity === "error");
  if (errors.length > 0) {
    return {
      ok: false,
      capabilityId: capabilityId || "",
      findings: [...findings].sort(compareFindings),
    };
  }

  const record = buildRecord(cap, input, platform!.complianceStatus);
  findings.push(
    finding(
      UmCapabilityRegistryCode.REGISTERED,
      "info",
      `Capability "${capabilityId}" registered in the in-memory catalog.`,
      "capability.capabilityId",
      "Standards §4 / §15",
    ),
  );

  return {
    ok: true,
    capabilityId,
    record,
    findings: [...findings].sort(compareFindings),
  };
}

function buildRecord(
  cap: UmCapabilityDeclaration,
  input: UmCapabilityRegistrationInput,
  complianceStatus: UmCapabilityRecord["owningPlatformComplianceStatus"],
): UmCapabilityRecord {
  return {
    capabilityId: cap.capabilityId,
    platformId: cap.platformId,
    moduleId: cap.moduleId,
    displayName: cap.displayName,
    ...(cap.description !== undefined ? { description: cap.description } : {}),
    sideEffectClasses: [...cap.sideEffectClasses] as UmSideEffectClass[],
    authClass: cap.authClass as UmAuthClass,
    stability: cap.stability as UmArtifactStability,
    version: cap.version,
    ...(cap.flagId !== undefined ? { flagId: cap.flagId } : {}),
    ...(cap.documentationRef !== undefined
      ? { documentationRef: cap.documentationRef }
      : {}),
    ...(cap.metadata !== undefined ? { metadata: { ...cap.metadata } } : {}),
    ...(input.registration?.registeredAt !== undefined
      ? { registeredAt: input.registration.registeredAt }
      : {}),
    ...(complianceStatus !== undefined
      ? { owningPlatformComplianceStatus: complianceStatus }
      : {}),
  };
}

function cloneRecord(record: UmCapabilityRecord): UmCapabilityRecord {
  return {
    ...record,
    sideEffectClasses: [...record.sideEffectClasses],
    ...(record.metadata !== undefined ? { metadata: { ...record.metadata } } : {}),
  };
}

/**
 * Create a pure in-memory capability registry bound to a platform catalog.
 */
export function createInMemoryCapabilityRegistry(
  deps: UmCapabilityRegistryDeps,
): UmInMemoryCapabilityRegistry {
  const store = new Map<string, UmCapabilityRecord>();
  const { platforms } = deps;

  const sortedValues = (): UmCapabilityRecord[] =>
    [...store.values()].sort(compareRecords);

  return {
    register(input: UmCapabilityRegistrationInput): UmCapabilityRegistrationResult {
      const result = evaluateRegistration(input, platforms, store);
      if (result.ok && result.record) {
        const stored = cloneRecord(result.record);
        store.set(result.capabilityId, stored);
        return { ...result, record: cloneRecord(stored) };
      }
      return result;
    },

    get(capabilityId) {
      const stored = store.get(capabilityId);
      return stored === undefined ? undefined : cloneRecord(stored);
    },

    list() {
      return sortedValues().map(cloneRecord);
    },

    listByPlatform(platformId) {
      return sortedValues()
        .filter((r) => r.platformId === platformId)
        .map(cloneRecord);
    },

    listByModule(moduleId) {
      return sortedValues()
        .filter((r) => r.moduleId === moduleId)
        .map(cloneRecord);
    },

    listBySideEffectClass(sideEffectClass) {
      return sortedValues()
        .filter((r) => r.sideEffectClasses.includes(sideEffectClass))
        .map(cloneRecord);
    },

    listByStability(stability) {
      return sortedValues()
        .filter((r) => r.stability === stability)
        .map(cloneRecord);
    },

    has(capabilityId) {
      return store.has(capabilityId);
    },

    size() {
      return store.size;
    },

    clear() {
      store.clear();
    },
  };
}
