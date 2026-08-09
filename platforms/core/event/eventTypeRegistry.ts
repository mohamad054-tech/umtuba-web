/**
 * In-memory Event Type Registry Foundation (UM Core P6).
 *
 * Pure catalog of platform event TYPE definitions.
 * Does not emit, deliver, route, store, retry, or consume events.
 *
 * @see UM_CORE_SPECIFICATION_V1
 * @see UM_CORE_ENGINEERING_STANDARDS_V1 (§5 events)
 */

import type { UmArtifactStability } from "../identity/types";
import type { UmPlatformRegistry } from "../registry/interfaces";
import {
  isNonEmptyTrimmed,
  isScopedUnderPlatform,
  isUmMachineId,
  isUmVersionToken,
} from "../validation/naming";
import { UmEventTypeRegistryCode } from "./codes";
import type {
  UmEventCompatibilityPolicy,
  UmEventDeliveryExpectation,
  UmEventPiiClass,
  UmEventTypeDeclaration,
  UmEventTypeRecord,
  UmEventTypeRegistrationInput,
  UmEventTypeRegistrationResult,
  UmEventTypeRegistryFinding,
  UmEventTypeRegistryFindingSeverity,
  UmInMemoryEventTypeRegistry,
} from "./types";

const SEVERITY_RANK: Record<UmEventTypeRegistryFindingSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

const STABILITIES: ReadonlySet<string> = new Set([
  "experimental",
  "stable",
  "deprecated",
]);

const COMPATIBILITY: ReadonlySet<string> = new Set([
  "backward",
  "forward",
  "full",
  "none",
  "other",
]);

const PII_CLASSES: ReadonlySet<string> = new Set([
  "none",
  "minimized",
  "restricted",
]);

const DELIVERY: ReadonlySet<string> = new Set([
  "at_least_once",
  "best_effort",
  "other",
]);

export interface UmEventTypeRegistryDeps {
  /** Registered platforms catalog (P4). Required for producer checks. */
  readonly platforms: UmPlatformRegistry;
}

function finding(
  code: string,
  severity: UmEventTypeRegistryFindingSeverity,
  message: string,
  path: string | undefined,
  standardRef: string,
): UmEventTypeRegistryFinding {
  return { code, severity, message, path, standardRef };
}

function compareFindings(
  a: UmEventTypeRegistryFinding,
  b: UmEventTypeRegistryFinding,
): number {
  const sev = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
  if (sev !== 0) return sev;
  const code = a.code.localeCompare(b.code);
  if (code !== 0) return code;
  return (a.path ?? "").localeCompare(b.path ?? "");
}

function compareRecords(a: UmEventTypeRecord, b: UmEventTypeRecord): number {
  return a.eventType.localeCompare(b.eventType);
}

function evaluateRegistration(
  input: UmEventTypeRegistrationInput,
  platforms: UmPlatformRegistry,
  existing: ReadonlyMap<string, UmEventTypeRecord>,
): UmEventTypeRegistrationResult {
  const decl = input.eventType;
  const eventType = decl.eventType;
  const findings: UmEventTypeRegistryFinding[] = [];

  if (!isNonEmptyTrimmed(eventType)) {
    findings.push(
      finding(
        UmEventTypeRegistryCode.EVENT_TYPE_REQUIRED,
        "error",
        "Event type id is required.",
        "eventType.eventType",
        "Standards §2 / §5",
      ),
    );
  } else if (!isUmMachineId(eventType)) {
    findings.push(
      finding(
        UmEventTypeRegistryCode.EVENT_TYPE_NAMING,
        "error",
        `Event type id "${eventType}" is not a valid machine id.`,
        "eventType.eventType",
        "Standards §2 / §5",
      ),
    );
  }

  if (isNonEmptyTrimmed(eventType) && existing.has(eventType)) {
    findings.push(
      finding(
        UmEventTypeRegistryCode.DUPLICATE_EVENT_TYPE,
        "error",
        `Event type "${eventType}" is already registered.`,
        "eventType.eventType",
        "Standards §5 / §15",
      ),
    );
    return {
      ok: false,
      eventType,
      findings: [...findings].sort(compareFindings),
    };
  }

  const platform = platforms.get(decl.producerPlatformId);
  if (!platform) {
    findings.push(
      finding(
        UmEventTypeRegistryCode.UNKNOWN_PRODUCER,
        "error",
        `Producer platform "${decl.producerPlatformId}" is not registered.`,
        "eventType.producerPlatformId",
        "Standards §5 / §15",
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
          UmEventTypeRegistryCode.OWNERSHIP_MISSING,
          "error",
          "Producer platform lacks valid ownership declarations.",
          "eventType.producerPlatformId",
          "Standards §3.4 / §5",
        ),
      );
    }

    const declared = platform.manifest.providesEvents.find(
      (e) => e.eventType === eventType,
    );
    if (!declared) {
      findings.push(
        finding(
          UmEventTypeRegistryCode.MANIFEST_MISMATCH,
          "error",
          `Event type "${eventType}" is not declared in the producer manifest.`,
          "eventType.eventType",
          "Standards §3.4 / §5",
        ),
      );
    } else if (
      isNonEmptyTrimmed(decl.schemaVersion) &&
      declared.schemaVersion !== decl.schemaVersion
    ) {
      findings.push(
        finding(
          UmEventTypeRegistryCode.MANIFEST_MISMATCH,
          "error",
          `Schema version "${decl.schemaVersion}" does not match manifest declaration "${declared.schemaVersion}".`,
          "eventType.schemaVersion",
          "Standards §3.4 / §5",
        ),
      );
    } else if (declared.stability !== decl.stability) {
      findings.push(
        finding(
          UmEventTypeRegistryCode.MANIFEST_MISMATCH,
          "error",
          `Stability "${decl.stability}" does not match manifest declaration "${declared.stability}".`,
          "eventType.stability",
          "Standards §3.4 / §5",
        ),
      );
    }
  }

  if (
    isNonEmptyTrimmed(eventType) &&
    isNonEmptyTrimmed(decl.producerPlatformId) &&
    !isScopedUnderPlatform(eventType, decl.producerPlatformId)
  ) {
    findings.push(
      finding(
        UmEventTypeRegistryCode.PLATFORM_NAMESPACE,
        "error",
        `Event type "${eventType}" is outside producer namespace "${decl.producerPlatformId}".`,
        "eventType.eventType",
        "Standards §2 / §5",
      ),
    );
  }

  if (!isNonEmptyTrimmed(decl.schemaVersion)) {
    findings.push(
      finding(
        UmEventTypeRegistryCode.SCHEMA_VERSION_REQUIRED,
        "error",
        "Schema version is required.",
        "eventType.schemaVersion",
        "Standards §5",
      ),
    );
  } else if (!isUmVersionToken(decl.schemaVersion)) {
    findings.push(
      finding(
        UmEventTypeRegistryCode.SCHEMA_VERSION_INVALID,
        "error",
        `Schema version "${decl.schemaVersion}" is invalid.`,
        "eventType.schemaVersion",
        "Standards §5",
      ),
    );
  }

  if (!STABILITIES.has(decl.stability)) {
    findings.push(
      finding(
        UmEventTypeRegistryCode.STABILITY_INVALID,
        "error",
        `Stability "${String(decl.stability)}" is invalid.`,
        "eventType.stability",
        "Standards §2.4 / §5",
      ),
    );
  }

  if (!COMPATIBILITY.has(decl.compatibilityPolicy)) {
    findings.push(
      finding(
        UmEventTypeRegistryCode.COMPATIBILITY_INVALID,
        "error",
        `Compatibility policy "${String(decl.compatibilityPolicy)}" is invalid.`,
        "eventType.compatibilityPolicy",
        "Standards §5",
      ),
    );
  }

  if (!PII_CLASSES.has(decl.piiClass)) {
    findings.push(
      finding(
        UmEventTypeRegistryCode.PII_CLASS_INVALID,
        "error",
        `PII class "${String(decl.piiClass)}" is invalid.`,
        "eventType.piiClass",
        "Standards §5",
      ),
    );
  }

  if (!DELIVERY.has(decl.deliveryExpectation)) {
    findings.push(
      finding(
        UmEventTypeRegistryCode.DELIVERY_EXPECTATION_INVALID,
        "error",
        `Delivery expectation "${String(decl.deliveryExpectation)}" is invalid.`,
        "eventType.deliveryExpectation",
        "Standards §5",
      ),
    );
  }

  if (!isNonEmptyTrimmed(decl.payloadSchemaRef)) {
    findings.push(
      finding(
        UmEventTypeRegistryCode.PAYLOAD_SCHEMA_REF_REQUIRED,
        "error",
        "Payload schema reference is required.",
        "eventType.payloadSchemaRef",
        "Standards §5.4",
      ),
    );
  }

  const subjectExpect = decl.subjectRefExpectations ?? [];
  if (subjectExpect.length === 0) {
    findings.push(
      finding(
        UmEventTypeRegistryCode.SUBJECT_REF_EXPECTATIONS_REQUIRED,
        "error",
        "At least one subject reference expectation kind is required.",
        "eventType.subjectRefExpectations",
        "Standards §5",
      ),
    );
  } else {
    for (let i = 0; i < subjectExpect.length; i += 1) {
      if (!isNonEmptyTrimmed(subjectExpect[i])) {
        findings.push(
          finding(
            UmEventTypeRegistryCode.SUBJECT_REF_EXPECTATION_INVALID,
            "error",
            `Subject reference expectation at index ${i} is empty.`,
            `eventType.subjectRefExpectations[${i}]`,
            "Standards §5",
          ),
        );
      }
    }
  }

  const errors = findings.filter((f) => f.severity === "error");
  if (errors.length > 0) {
    return {
      ok: false,
      eventType: eventType || "",
      findings: [...findings].sort(compareFindings),
    };
  }

  const record = buildRecord(decl, input, platform!.complianceStatus);
  findings.push(
    finding(
      UmEventTypeRegistryCode.REGISTERED,
      "info",
      `Event type "${eventType}" registered in the in-memory catalog.`,
      "eventType.eventType",
      "Standards §5 / §15",
    ),
  );

  return {
    ok: true,
    eventType,
    record,
    findings: [...findings].sort(compareFindings),
  };
}

function buildRecord(
  decl: UmEventTypeDeclaration,
  input: UmEventTypeRegistrationInput,
  complianceStatus: UmEventTypeRecord["owningPlatformComplianceStatus"],
): UmEventTypeRecord {
  return {
    eventType: decl.eventType,
    producerPlatformId: decl.producerPlatformId,
    schemaVersion: decl.schemaVersion,
    compatibilityPolicy: decl.compatibilityPolicy as UmEventCompatibilityPolicy,
    payloadSchemaRef: decl.payloadSchemaRef.trim(),
    piiClass: decl.piiClass as UmEventPiiClass,
    deliveryExpectation: decl.deliveryExpectation as UmEventDeliveryExpectation,
    stability: decl.stability as UmArtifactStability,
    subjectRefExpectations: [...decl.subjectRefExpectations],
    documentationRefs: [...(decl.documentationRefs ?? [])],
    ...(decl.description !== undefined ? { description: decl.description } : {}),
    ...(decl.metadata !== undefined ? { metadata: { ...decl.metadata } } : {}),
    ...(input.registration?.registeredAt !== undefined
      ? { registeredAt: input.registration.registeredAt }
      : {}),
    ...(complianceStatus !== undefined
      ? { owningPlatformComplianceStatus: complianceStatus }
      : {}),
  };
}

function cloneRecord(record: UmEventTypeRecord): UmEventTypeRecord {
  return {
    ...record,
    subjectRefExpectations: [...record.subjectRefExpectations],
    documentationRefs: [...record.documentationRefs],
    ...(record.metadata !== undefined ? { metadata: { ...record.metadata } } : {}),
  };
}

/**
 * Create a pure in-memory event type registry bound to a platform catalog.
 * Catalog records are defensively cloned on admit and on every read surface.
 */
export function createInMemoryEventTypeRegistry(
  deps: UmEventTypeRegistryDeps,
): UmInMemoryEventTypeRegistry {
  const store = new Map<string, UmEventTypeRecord>();
  const { platforms } = deps;

  const sortedValues = (): UmEventTypeRecord[] =>
    [...store.values()].sort(compareRecords);

  return {
    register(input: UmEventTypeRegistrationInput): UmEventTypeRegistrationResult {
      const result = evaluateRegistration(input, platforms, store);
      if (result.ok && result.record) {
        const stored = cloneRecord(result.record);
        store.set(result.eventType, stored);
        return { ...result, record: cloneRecord(stored) };
      }
      return result;
    },

    get(eventType) {
      const stored = store.get(eventType);
      return stored === undefined ? undefined : cloneRecord(stored);
    },

    list() {
      return sortedValues().map(cloneRecord);
    },

    listByProducer(platformId) {
      return sortedValues()
        .filter((r) => r.producerPlatformId === platformId)
        .map(cloneRecord);
    },

    listBySchemaVersion(schemaVersion) {
      return sortedValues()
        .filter((r) => r.schemaVersion === schemaVersion)
        .map(cloneRecord);
    },

    listByStability(stability) {
      return sortedValues()
        .filter((r) => r.stability === stability)
        .map(cloneRecord);
    },

    listByPiiClass(piiClass) {
      return sortedValues()
        .filter((r) => r.piiClass === piiClass)
        .map(cloneRecord);
    },

    listByDeliveryExpectation(deliveryExpectation) {
      return sortedValues()
        .filter((r) => r.deliveryExpectation === deliveryExpectation)
        .map(cloneRecord);
    },

    has(eventType) {
      return store.has(eventType);
    },

    size() {
      return store.size;
    },

    clear() {
      store.clear();
    },
  };
}
