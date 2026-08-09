/**
 * In-memory Platform Registry Foundation (UM Core P4).
 *
 * Pure catalog of platforms that pass P2 validation and P3 compliance.
 * No persistence, networking, discovery, plugin loading, or runtime execution.
 *
 * @see UM_CORE_SPECIFICATION_V1
 * @see UM_CORE_ENGINEERING_STANDARDS_V1 (§15 registration)
 */

import { assessPlatformCompliance } from "../compliance";
import type { UmComplianceResult } from "../compliance/types";
import type { UmPlatformManifest } from "../manifest/types";
import {
  validateManifestAdmission,
  validatePlatformManifest,
} from "../validation/interfaces";
import type { UmValidationResult } from "../validation/interfaces";
import { UmRegistryCode } from "./codes";
import type {
  UmInMemoryPlatformRegistry,
  UmPlatformRecord,
  UmPlatformRegistrationInput,
  UmPlatformRegistrationResult,
  UmRegisteredCapabilityCatalogEntry,
  UmRegisteredModuleCatalogEntry,
  UmRegistryFinding,
  UmRegistryFindingSeverity,
  UmRegistrationMetadata,
} from "./interfaces";

const SEVERITY_RANK: Record<UmRegistryFindingSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

function finding(
  code: string,
  severity: UmRegistryFindingSeverity,
  message: string,
  path: string | undefined,
  standardRef: string,
): UmRegistryFinding {
  return { code, severity, message, path, standardRef };
}

function compareFindings(a: UmRegistryFinding, b: UmRegistryFinding): number {
  const sev = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
  if (sev !== 0) return sev;
  const code = a.code.localeCompare(b.code);
  if (code !== 0) return code;
  return (a.path ?? "").localeCompare(b.path ?? "");
}

function isNonEmpty(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasOwnership(manifest: UmPlatformManifest): boolean {
  if (!manifest.owners || manifest.owners.length === 0) return false;
  if (!isNonEmpty(manifest.soTStatement)) return false;
  if (!isNonEmpty(manifest.nonOwnershipStatement)) return false;
  return true;
}

function buildModuleCatalog(
  manifest: UmPlatformManifest,
): readonly UmRegisteredModuleCatalogEntry[] {
  return manifest.modules.map((m) => ({
    moduleId: m.moduleId,
    displayName: m.displayName,
    capabilityIds: [...m.capabilityIds],
  }));
}

function buildCapabilityCatalog(
  manifest: UmPlatformManifest,
): readonly UmRegisteredCapabilityCatalogEntry[] {
  return manifest.capabilities.map((c) => ({
    capabilityId: c.capabilityId,
    moduleId: c.moduleId,
    displayName: c.displayName,
    version: c.version,
    stability: c.stability,
    sideEffectClasses: [...c.sideEffectClasses],
    ...(c.flagId !== undefined ? { flagId: c.flagId } : {}),
  }));
}

/** Defensive deep clone for external catalog consumption (plain data only). */
function cloneRecord(record: UmPlatformRecord): UmPlatformRecord {
  return structuredClone(record);
}

function resolveValidation(
  manifest: UmPlatformManifest,
  provided?: UmValidationResult,
): UmValidationResult {
  return provided ?? validatePlatformManifest(manifest);
}

function resolveCompliance(
  manifest: UmPlatformManifest,
  validation: UmValidationResult,
  provided?: UmComplianceResult,
): UmComplianceResult {
  if (provided) return provided;
  const admission = validateManifestAdmission(manifest);
  return assessPlatformCompliance({
    manifest,
    validation,
    admission,
  });
}

function evaluateRegistration(
  input: UmPlatformRegistrationInput,
  existing: ReadonlyMap<string, UmPlatformRecord>,
): UmPlatformRegistrationResult {
  const { manifest } = input;
  const platformId = manifest.platformId;
  const findings: UmRegistryFinding[] = [];

  if (existing.has(platformId)) {
    findings.push(
      finding(
        UmRegistryCode.DUPLICATE_PLATFORM_ID,
        "error",
        `Platform id "${platformId}" is already registered.`,
        "platformId",
        "Standards §15",
      ),
    );
    return {
      ok: false,
      platformId,
      findings: [...findings].sort(compareFindings),
    };
  }

  const validation = resolveValidation(manifest, input.validation);
  if (!validation.ok) {
    findings.push(
      finding(
        UmRegistryCode.MANIFEST_INVALID,
        "error",
        "Manifest failed P2 validation and cannot be registered.",
        "manifest",
        "Standards §3 / §15",
      ),
    );
    findings.push(
      finding(
        UmRegistryCode.VALIDATION_FAILED,
        "error",
        `Validation reported ${validation.findings.filter((f) => f.severity === "error").length} error(s).`,
        "validation",
        "Standards §3 / Spec §7",
      ),
    );
  }

  if (!hasOwnership(manifest)) {
    findings.push(
      finding(
        UmRegistryCode.OWNERSHIP_MISSING,
        "error",
        "Registration requires owners, SoT statement, and non-ownership statement.",
        "owners",
        "Standards §3.4 / §15",
      ),
    );
  }

  if (manifest.maturityLevel < 1) {
    findings.push(
      finding(
        UmRegistryCode.MATURITY_TOO_LOW,
        "error",
        "Registration requires maturityLevel ≥ 1 (Registered).",
        "maturityLevel",
        "Standards §15 / §24",
      ),
    );
  }

  const compliance = resolveCompliance(manifest, validation, input.compliance);
  if (compliance.status !== "compliant") {
    findings.push(
      finding(
        UmRegistryCode.COMPLIANCE_FAILED,
        "error",
        `Compliance status is "${compliance.status}"; only compliant platforms may register.`,
        "compliance.status",
        "Standards §25 / §15",
      ),
    );
  }

  const coreCert = compliance.certificationStatus.find(
    (c) => c.kind === "core_certified",
  );
  if (!coreCert?.eligible) {
    findings.push(
      finding(
        UmRegistryCode.CERTIFICATION_INELIGIBLE,
        "error",
        "Core Certified eligibility is required for registration.",
        "compliance.certificationStatus.core_certified",
        "Standards §26 / §15",
      ),
    );
  }

  const errors = findings.filter((f) => f.severity === "error");
  if (errors.length > 0) {
    return {
      ok: false,
      platformId,
      findings: [...findings].sort(compareFindings),
    };
  }

  const registration: UmRegistrationMetadata = {
    ...(input.registration?.registeredAt !== undefined
      ? { registeredAt: input.registration.registeredAt }
      : {}),
    ...(input.registration?.registrationSource !== undefined
      ? { registrationSource: input.registration.registrationSource }
      : {}),
    ...(input.registration?.notes !== undefined
      ? { notes: input.registration.notes }
      : {}),
  };

  const record: UmPlatformRecord = {
    platformId,
    displayName: manifest.displayName,
    platformVersion: manifest.platformVersion,
    maturityLevel: manifest.maturityLevel,
    complianceStatus: compliance.status,
    manifest: structuredClone(manifest),
    validation: structuredClone(validation),
    compliance: structuredClone(compliance),
    modules: buildModuleCatalog(manifest),
    capabilities: buildCapabilityCatalog(manifest),
    registration: { ...registration },
    ...(registration.registeredAt !== undefined
      ? { registeredAt: registration.registeredAt }
      : {}),
  };

  findings.push(
    finding(
      UmRegistryCode.REGISTERED,
      "info",
      `Platform "${platformId}" registered in the in-memory catalog.`,
      "platformId",
      "Standards §15",
    ),
  );

  return {
    ok: true,
    platformId,
    record,
    findings: [...findings].sort(compareFindings),
  };
}

/**
 * Create a pure in-memory platform registry.
 * State lives only in this process heap — never persisted.
 * Catalog records are defensively cloned on admit and on every read surface.
 */
export function createInMemoryPlatformRegistry(): UmInMemoryPlatformRegistry {
  const store = new Map<string, UmPlatformRecord>();

  return {
    register(input: UmPlatformRegistrationInput): UmPlatformRegistrationResult {
      const result = evaluateRegistration(input, store);
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
      return [...store.values()]
        .sort((a, b) => a.platformId.localeCompare(b.platformId))
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
