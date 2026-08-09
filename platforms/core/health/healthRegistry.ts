/**
 * In-memory Health Declaration Catalog Foundation (UM Core P10).
 *
 * Pure catalog of platform manifest health declarations.
 * HEALTH DECLARATION REGISTRATION IS NOT HEALTH MONITORING.
 *
 * @see UM_CORE_SPECIFICATION_V1
 * @see UM_CORE_ENGINEERING_STANDARDS_V1 (§18 health)
 */

import type { UmPlatformRegistry } from "../registry/interfaces";
import { isNonEmptyTrimmed, isUmMachineId } from "../validation/naming";
import { UmHealthRegistryCode } from "./codes";
import type {
  UmHealthRecord,
  UmHealthRegistrationDeclaration,
  UmHealthRegistrationInput,
  UmHealthRegistrationResult,
  UmHealthRegistryDeps,
  UmHealthRegistryFinding,
  UmHealthRegistryFindingSeverity,
  UmInMemoryHealthRegistry,
} from "./types";

const SEVERITY_RANK: Record<UmHealthRegistryFindingSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

function finding(
  code: string,
  severity: UmHealthRegistryFindingSeverity,
  message: string,
  path: string | undefined,
  standardRef: string,
): UmHealthRegistryFinding {
  return { code, severity, message, path, standardRef };
}

function compareFindings(
  a: UmHealthRegistryFinding,
  b: UmHealthRegistryFinding,
): number {
  const sev = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
  if (sev !== 0) return sev;
  const code = a.code.localeCompare(b.code);
  if (code !== 0) return code;
  return (a.path ?? "").localeCompare(b.path ?? "");
}

function compareRecords(a: UmHealthRecord, b: UmHealthRecord): number {
  return a.platformId.localeCompare(b.platformId);
}

function sameOptionalString(
  a: string | undefined,
  b: string | undefined,
): boolean {
  return (a ?? undefined) === (b ?? undefined);
}

function evaluateRegistration(
  input: UmHealthRegistrationInput,
  platforms: UmPlatformRegistry,
  existing: ReadonlyMap<string, UmHealthRecord>,
): UmHealthRegistrationResult {
  const decl = input.health;
  const findings: UmHealthRegistryFinding[] = [];

  if (!isNonEmptyTrimmed(decl.platformId)) {
    findings.push(
      finding(
        UmHealthRegistryCode.PLATFORM_ID_REQUIRED,
        "error",
        "Health declaration platformId is required.",
        "health.platformId",
        "Standards §18",
      ),
    );
  } else if (!isUmMachineId(decl.platformId)) {
    findings.push(
      finding(
        UmHealthRegistryCode.PLATFORM_ID_NAMING,
        "error",
        `platformId "${decl.platformId}" is not a valid machine id.`,
        "health.platformId",
        "Standards §2 / §18",
      ),
    );
  }

  if (typeof decl.reportsStatus !== "boolean") {
    findings.push(
      finding(
        UmHealthRegistryCode.REPORTS_STATUS_INVALID,
        "error",
        "health.reportsStatus must be a boolean.",
        "health.reportsStatus",
        "Standards §18.4",
      ),
    );
  }

  if (isNonEmptyTrimmed(decl.platformId) && existing.has(decl.platformId)) {
    findings.push(
      finding(
        UmHealthRegistryCode.DUPLICATE_PLATFORM,
        "error",
        `Health declaration for platform "${decl.platformId}" is already registered.`,
        "health.platformId",
        "Standards §18 / §15",
      ),
    );
    return {
      ok: false,
      platformId: decl.platformId,
      findings: [...findings].sort(compareFindings),
    };
  }

  const owner = isNonEmptyTrimmed(decl.platformId)
    ? platforms.get(decl.platformId)
    : undefined;

  if (isNonEmptyTrimmed(decl.platformId) && !owner) {
    findings.push(
      finding(
        UmHealthRegistryCode.UNKNOWN_PLATFORM,
        "error",
        `Owner platform "${decl.platformId}" is not registered.`,
        "health.platformId",
        "Standards §18 / §15",
      ),
    );
  } else if (owner) {
    const mh = owner.manifest.health;
    if (mh.reportsStatus !== decl.reportsStatus) {
      findings.push(
        finding(
          UmHealthRegistryCode.MANIFEST_MISMATCH,
          "error",
          `reportsStatus ${String(decl.reportsStatus)} does not match manifest ${String(mh.reportsStatus)}.`,
          "health.reportsStatus",
          "Standards §3.4 / §18",
        ),
      );
    }
    if (!sameOptionalString(mh.probeRef, decl.probeRef)) {
      findings.push(
        finding(
          UmHealthRegistryCode.MANIFEST_MISMATCH,
          "error",
          "probeRef does not match the owner platform manifest health declaration.",
          "health.probeRef",
          "Standards §3.4 / §18",
        ),
      );
    }
    if (!sameOptionalString(mh.notes, decl.notes)) {
      findings.push(
        finding(
          UmHealthRegistryCode.MANIFEST_MISMATCH,
          "error",
          "notes do not match the owner platform manifest health declaration.",
          "health.notes",
          "Standards §3.4 / §18",
        ),
      );
    }
  }

  const errors = findings.filter((f) => f.severity === "error");
  if (errors.length > 0) {
    return {
      ok: false,
      platformId: isNonEmptyTrimmed(decl.platformId) ? decl.platformId : "",
      findings: [...findings].sort(compareFindings),
    };
  }

  const record = buildRecord(decl, input);
  findings.push(
    finding(
      UmHealthRegistryCode.REGISTERED,
      "info",
      `Health declaration for platform "${decl.platformId}" registered in the in-memory catalog.`,
      "health.platformId",
      "Standards §18 / §15",
    ),
  );

  return {
    ok: true,
    platformId: decl.platformId,
    record,
    findings: [...findings].sort(compareFindings),
  };
}

function buildRecord(
  decl: UmHealthRegistrationDeclaration,
  input: UmHealthRegistrationInput,
): UmHealthRecord {
  return {
    platformId: decl.platformId,
    reportsStatus: decl.reportsStatus,
    ...(decl.probeRef !== undefined ? { probeRef: decl.probeRef } : {}),
    ...(decl.notes !== undefined ? { notes: decl.notes } : {}),
    ...(input.registration?.registeredAt !== undefined
      ? { registeredAt: input.registration.registeredAt }
      : {}),
  };
}

function cloneRecord(record: UmHealthRecord): UmHealthRecord {
  return { ...record };
}

/**
 * Create a pure in-memory health declaration catalog.
 * Does not monitor, probe, or evaluate live health.
 * Catalog records are defensively cloned on admit and on every read surface.
 */
export function createInMemoryHealthRegistry(
  deps: UmHealthRegistryDeps,
): UmInMemoryHealthRegistry {
  const store = new Map<string, UmHealthRecord>();
  const { platforms } = deps;

  const sortedValues = (): UmHealthRecord[] =>
    [...store.values()].sort(compareRecords);

  return {
    register(input: UmHealthRegistrationInput): UmHealthRegistrationResult {
      const result = evaluateRegistration(input, platforms, store);
      if (result.ok && result.record) {
        const stored = cloneRecord(result.record);
        store.set(result.platformId, stored);
        return { ...result, record: cloneRecord(stored) };
      }
      return result;
    },

    get(platformId) {
      const stored = store.get(platformId);
      return stored === undefined ? undefined : cloneRecord(stored);
    },

    list() {
      return sortedValues().map(cloneRecord);
    },

    listByReportsStatus(reportsStatus) {
      return sortedValues()
        .filter((r) => r.reportsStatus === reportsStatus)
        .map(cloneRecord);
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
