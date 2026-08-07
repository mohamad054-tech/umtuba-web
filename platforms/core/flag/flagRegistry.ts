/**
 * In-memory Feature Flag Registry Foundation (UM Core P8).
 *
 * Pure catalog of flags owned by registered platforms.
 * FLAG REGISTRATION IS NOT FLAG EVALUATION.
 *
 * @see UM_CORE_SPECIFICATION_V1
 * @see UM_CORE_ENGINEERING_STANDARDS_V1 (§14 flags)
 */

import type { UmCapabilityRegistry } from "../capability/types";
import type { UmPlatformRegistry } from "../registry/interfaces";
import {
  isNonEmptyTrimmed,
  isScopedUnderPlatform,
  isUmMachineId,
} from "../validation/naming";
import { UmFlagRegistryCode } from "./codes";
import type {
  UmFlagDeclaration,
  UmFlagRecord,
  UmFlagRegistrationInput,
  UmFlagRegistrationResult,
  UmFlagRegistryDeps,
  UmFlagRegistryFinding,
  UmFlagRegistryFindingSeverity,
  UmInMemoryFlagRegistry,
} from "./types";

const SEVERITY_RANK: Record<UmFlagRegistryFindingSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

const DEFAULT_STATES = new Set(["on", "off"]);

function finding(
  code: string,
  severity: UmFlagRegistryFindingSeverity,
  message: string,
  path: string | undefined,
  standardRef: string,
): UmFlagRegistryFinding {
  return { code, severity, message, path, standardRef };
}

function compareFindings(
  a: UmFlagRegistryFinding,
  b: UmFlagRegistryFinding,
): number {
  const sev = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
  if (sev !== 0) return sev;
  const code = a.code.localeCompare(b.code);
  if (code !== 0) return code;
  return (a.path ?? "").localeCompare(b.path ?? "");
}

function compareRecords(a: UmFlagRecord, b: UmFlagRecord): number {
  return a.flagId.localeCompare(b.flagId);
}

function sameCapabilityIds(
  a: readonly string[],
  b: readonly string[],
): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x.localeCompare(y));
  const sb = [...b].sort((x, y) => x.localeCompare(y));
  return sa.every((id, i) => id === sb[i]);
}

function evaluateRegistration(
  input: UmFlagRegistrationInput,
  platforms: UmPlatformRegistry,
  capabilities: UmCapabilityRegistry | undefined,
  existing: ReadonlyMap<string, UmFlagRecord>,
): UmFlagRegistrationResult {
  const decl = input.flag;
  const flagId = decl.flagId;
  const findings: UmFlagRegistryFinding[] = [];

  if (!isNonEmptyTrimmed(flagId)) {
    findings.push(
      finding(
        UmFlagRegistryCode.FLAG_ID_REQUIRED,
        "error",
        "Flag id is required.",
        "flag.flagId",
        "Standards §2 / §14",
      ),
    );
  } else if (!isUmMachineId(flagId)) {
    findings.push(
      finding(
        UmFlagRegistryCode.FLAG_ID_NAMING,
        "error",
        `Flag id "${flagId}" is not a valid machine id.`,
        "flag.flagId",
        "Standards §2 / §14",
      ),
    );
  }

  if (isNonEmptyTrimmed(flagId) && existing.has(flagId)) {
    findings.push(
      finding(
        UmFlagRegistryCode.DUPLICATE_FLAG_ID,
        "error",
        `Flag id "${flagId}" is already registered.`,
        "flag.flagId",
        "Standards §14 / §15",
      ),
    );
    return {
      ok: false,
      flagId,
      findings: [...findings].sort(compareFindings),
    };
  }

  if (!isNonEmptyTrimmed(decl.ownerRef)) {
    findings.push(
      finding(
        UmFlagRegistryCode.OWNER_REF_REQUIRED,
        "error",
        "Flag ownerRef is required.",
        "flag.ownerRef",
        "Standards §14",
      ),
    );
  }

  if (!DEFAULT_STATES.has(decl.defaultState)) {
    findings.push(
      finding(
        UmFlagRegistryCode.DEFAULT_STATE_INVALID,
        "error",
        `Default state "${String(decl.defaultState)}" is invalid.`,
        "flag.defaultState",
        "Standards §14",
      ),
    );
  }

  if (
    isNonEmptyTrimmed(flagId) &&
    isNonEmptyTrimmed(decl.ownerPlatformId) &&
    !isScopedUnderPlatform(flagId, decl.ownerPlatformId)
  ) {
    findings.push(
      finding(
        UmFlagRegistryCode.PLATFORM_NAMESPACE,
        "error",
        `Flag id "${flagId}" is outside owner platform namespace "${decl.ownerPlatformId}".`,
        "flag.flagId",
        "Standards §2 / §14",
      ),
    );
  }

  const platform = platforms.get(decl.ownerPlatformId);
  if (!platform) {
    findings.push(
      finding(
        UmFlagRegistryCode.UNKNOWN_PLATFORM,
        "error",
        `Owner platform "${decl.ownerPlatformId}" is not registered.`,
        "flag.ownerPlatformId",
        "Standards §14 / §15",
      ),
    );
  } else if (isNonEmptyTrimmed(flagId)) {
    const declared = platform.manifest.flags.find((f) => f.flagId === flagId);
    if (!declared) {
      findings.push(
        finding(
          UmFlagRegistryCode.MANIFEST_MISMATCH,
          "error",
          `Flag "${flagId}" is not declared in the owner platform manifest.`,
          "flag.flagId",
          "Standards §3.4 / §14",
        ),
      );
    } else {
      if (declared.defaultState !== decl.defaultState) {
        findings.push(
          finding(
            UmFlagRegistryCode.MANIFEST_MISMATCH,
            "error",
            `Default state "${decl.defaultState}" does not match manifest "${declared.defaultState}".`,
            "flag.defaultState",
            "Standards §3.4 / §14",
          ),
        );
      }
      if (declared.dangerElevated !== decl.dangerElevated) {
        findings.push(
          finding(
            UmFlagRegistryCode.MANIFEST_MISMATCH,
            "error",
            `dangerElevated ${String(decl.dangerElevated)} does not match manifest ${String(declared.dangerElevated)}.`,
            "flag.dangerElevated",
            "Standards §3.4 / §14",
          ),
        );
      }
      if (
        !sameCapabilityIds(
          declared.linkedCapabilityIds,
          decl.linkedCapabilityIds,
        )
      ) {
        findings.push(
          finding(
            UmFlagRegistryCode.MANIFEST_MISMATCH,
            "error",
            "linkedCapabilityIds do not match the owner platform manifest declaration.",
            "flag.linkedCapabilityIds",
            "Standards §3.4 / §14",
          ),
        );
      }
    }

    const manifestCapIds = new Set(
      platform.manifest.capabilities.map((c) => c.capabilityId),
    );
    for (let i = 0; i < decl.linkedCapabilityIds.length; i += 1) {
      const capId = decl.linkedCapabilityIds[i]!;
      if (!manifestCapIds.has(capId)) {
        findings.push(
          finding(
            UmFlagRegistryCode.LINKED_CAPABILITY_UNKNOWN,
            "error",
            `Linked capability "${capId}" is not declared on owner platform "${decl.ownerPlatformId}".`,
            `flag.linkedCapabilityIds[${i}]`,
            "Standards §4 / §14",
          ),
        );
        continue;
      }
      if (capabilities) {
        const cap = capabilities.get(capId);
        if (!cap) {
          findings.push(
            finding(
              UmFlagRegistryCode.LINKED_CAPABILITY_UNKNOWN,
              "error",
              `Linked capability "${capId}" is not present in the capability registry.`,
              `flag.linkedCapabilityIds[${i}]`,
              "Standards §4 / §14",
            ),
          );
        } else if (cap.platformId !== decl.ownerPlatformId) {
          findings.push(
            finding(
              UmFlagRegistryCode.LINKED_CAPABILITY_OWNERSHIP,
              "error",
              `Linked capability "${capId}" is owned by "${cap.platformId}", not "${decl.ownerPlatformId}".`,
              `flag.linkedCapabilityIds[${i}]`,
              "Standards §4 / §14",
            ),
          );
        }
      }
    }
  }

  if (decl.dangerElevated && decl.defaultState === "on") {
    findings.push(
      finding(
        UmFlagRegistryCode.ELEVATED_DEFAULT_ON,
        "error",
        "Elevated/danger flags must default off in the catalog.",
        "flag.defaultState",
        "Standards §14 / §16",
      ),
    );
  }

  if (decl.dangerElevated && !decl.auditRequired) {
    findings.push(
      finding(
        UmFlagRegistryCode.ELEVATED_AUDIT_REQUIRED,
        "error",
        "Elevated/danger flags require auditRequired=true in the catalog.",
        "flag.auditRequired",
        "Standards §14",
      ),
    );
  }

  const errors = findings.filter((f) => f.severity === "error");
  if (errors.length > 0) {
    return {
      ok: false,
      flagId: flagId || "",
      findings: [...findings].sort(compareFindings),
    };
  }

  const record = buildRecord(decl, input);
  findings.push(
    finding(
      UmFlagRegistryCode.REGISTERED,
      "info",
      `Flag "${flagId}" registered in the in-memory catalog.`,
      "flag.flagId",
      "Standards §14 / §15",
    ),
  );

  return {
    ok: true,
    flagId,
    record,
    findings: [...findings].sort(compareFindings),
  };
}

function buildRecord(
  decl: UmFlagDeclaration,
  input: UmFlagRegistrationInput,
): UmFlagRecord {
  return {
    flagId: decl.flagId,
    ownerPlatformId: decl.ownerPlatformId,
    ownerRef: decl.ownerRef.trim(),
    defaultState: decl.defaultState,
    linkedCapabilityIds: [...decl.linkedCapabilityIds],
    dangerElevated: decl.dangerElevated,
    killSwitch: true,
    auditRequired: decl.auditRequired,
    ...(decl.description !== undefined ? { description: decl.description } : {}),
    ...(input.registration?.registeredAt !== undefined
      ? { registeredAt: input.registration.registeredAt }
      : {}),
  };
}

/**
 * Create a pure in-memory feature flag registry.
 * Does not evaluate flags.
 */
export function createInMemoryFlagRegistry(
  deps: UmFlagRegistryDeps,
): UmInMemoryFlagRegistry {
  const store = new Map<string, UmFlagRecord>();
  const { platforms, capabilities } = deps;

  const sortedValues = (): UmFlagRecord[] =>
    [...store.values()].sort(compareRecords);

  return {
    register(input: UmFlagRegistrationInput): UmFlagRegistrationResult {
      const result = evaluateRegistration(
        input,
        platforms,
        capabilities,
        store,
      );
      if (result.ok && result.record) {
        store.set(result.flagId, result.record);
      }
      return result;
    },

    get(flagId) {
      return store.get(flagId);
    },

    list() {
      return sortedValues();
    },

    listByPlatform(platformId) {
      return sortedValues().filter((r) => r.ownerPlatformId === platformId);
    },

    listByLinkedCapability(capabilityId) {
      return sortedValues().filter((r) =>
        r.linkedCapabilityIds.includes(capabilityId),
      );
    },

    listByDangerElevated(dangerElevated) {
      return sortedValues().filter((r) => r.dangerElevated === dangerElevated);
    },

    has(flagId) {
      return store.has(flagId);
    },

    size() {
      return store.size;
    },

    clear() {
      store.clear();
    },
  };
}
