/**
 * In-memory Event Routing Foundation (UM Core P7).
 *
 * Pure catalog of event-type → destination-platform routing rules.
 * Does not publish, consume, deliver, queue, retry, or transport events.
 *
 * @see UM_CORE_SPECIFICATION_V1
 * @see UM_CORE_ENGINEERING_STANDARDS_V1 (§5 events)
 */

import type { UmEventTypeRegistry } from "./types";
import type { UmPlatformRegistry } from "../registry/interfaces";
import { isNonEmptyTrimmed, isUmMachineId } from "../validation/naming";
import { UmEventRoutingCode } from "./routingCodes";
import type {
  UmEventRouteDeclaration,
  UmEventRouteId,
  UmEventRouteRecord,
  UmEventRouteRegistrationInput,
  UmEventRouteRegistrationResult,
  UmEventRoutingFinding,
  UmEventRoutingFindingSeverity,
  UmInMemoryEventRoutingRegistry,
} from "./types";

const SEVERITY_RANK: Record<UmEventRoutingFindingSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

export interface UmEventRoutingRegistryDeps {
  readonly platforms: UmPlatformRegistry;
  readonly eventTypes: UmEventTypeRegistry;
}

/** Deterministic route id from event type + destination. */
export function buildEventRouteId(
  eventType: string,
  destinationPlatformId: string,
): UmEventRouteId {
  return `${eventType}=>${destinationPlatformId}`;
}

function finding(
  code: string,
  severity: UmEventRoutingFindingSeverity,
  message: string,
  path: string | undefined,
  standardRef: string,
): UmEventRoutingFinding {
  return { code, severity, message, path, standardRef };
}

function compareFindings(
  a: UmEventRoutingFinding,
  b: UmEventRoutingFinding,
): number {
  const sev = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
  if (sev !== 0) return sev;
  const code = a.code.localeCompare(b.code);
  if (code !== 0) return code;
  return (a.path ?? "").localeCompare(b.path ?? "");
}

function compareRecords(a: UmEventRouteRecord, b: UmEventRouteRecord): number {
  const byRoute = a.routeId.localeCompare(b.routeId);
  if (byRoute !== 0) return byRoute;
  return a.destinationPlatformId.localeCompare(b.destinationPlatformId);
}

function evaluateRegistration(
  input: UmEventRouteRegistrationInput,
  platforms: UmPlatformRegistry,
  eventTypes: UmEventTypeRegistry,
  existing: ReadonlyMap<string, UmEventRouteRecord>,
): UmEventRouteRegistrationResult {
  const decl = input.route;
  const findings: UmEventRoutingFinding[] = [];

  if (!isNonEmptyTrimmed(decl.eventType)) {
    findings.push(
      finding(
        UmEventRoutingCode.EVENT_TYPE_REQUIRED,
        "error",
        "Event type id is required for a route.",
        "route.eventType",
        "Standards §5 / P7",
      ),
    );
  }

  if (!isNonEmptyTrimmed(decl.destinationPlatformId)) {
    findings.push(
      finding(
        UmEventRoutingCode.DESTINATION_REQUIRED,
        "error",
        "Destination platform id is required.",
        "route.destinationPlatformId",
        "Standards §5 / P7",
      ),
    );
  } else if (!isUmMachineId(decl.destinationPlatformId)) {
    findings.push(
      finding(
        UmEventRoutingCode.DESTINATION_NAMING,
        "error",
        `Destination platform id "${decl.destinationPlatformId}" is not a valid machine id.`,
        "route.destinationPlatformId",
        "Standards §2 / P7",
      ),
    );
  }

  const routeId =
    isNonEmptyTrimmed(decl.eventType) &&
    isNonEmptyTrimmed(decl.destinationPlatformId)
      ? buildEventRouteId(decl.eventType, decl.destinationPlatformId)
      : "";

  if (routeId && existing.has(routeId)) {
    findings.push(
      finding(
        UmEventRoutingCode.DUPLICATE_ROUTE,
        "error",
        `Route "${routeId}" is already registered.`,
        "route",
        "Standards §5 / P7",
      ),
    );
    return {
      ok: false,
      routeId,
      findings: [...findings].sort(compareFindings),
    };
  }

  const eventTypeRecord = isNonEmptyTrimmed(decl.eventType)
    ? eventTypes.get(decl.eventType)
    : undefined;

  if (isNonEmptyTrimmed(decl.eventType) && !eventTypeRecord) {
    findings.push(
      finding(
        UmEventRoutingCode.UNKNOWN_EVENT_TYPE,
        "error",
        `Event type "${decl.eventType}" is not registered in the event type catalog.`,
        "route.eventType",
        "Standards §5 / P6→P7",
      ),
    );
  }

  let producerPlatformId = "";
  if (eventTypeRecord) {
    producerPlatformId = eventTypeRecord.producerPlatformId;
    if (!platforms.get(producerPlatformId)) {
      findings.push(
        finding(
          UmEventRoutingCode.PRODUCER_INVALID,
          "error",
          `Producer platform "${producerPlatformId}" for event type "${decl.eventType}" is not registered.`,
          "route.eventType",
          "Standards §15 / P7",
        ),
      );
    }
  }

  if (
    isNonEmptyTrimmed(decl.destinationPlatformId) &&
    isUmMachineId(decl.destinationPlatformId) &&
    !platforms.get(decl.destinationPlatformId)
  ) {
    findings.push(
      finding(
        UmEventRoutingCode.UNKNOWN_DESTINATION,
        "error",
        `Destination platform "${decl.destinationPlatformId}" is not registered.`,
        "route.destinationPlatformId",
        "Standards §15 / P7",
      ),
    );
  }

  const errors = findings.filter((f) => f.severity === "error");
  if (errors.length > 0) {
    return {
      ok: false,
      routeId: routeId || "",
      findings: [...findings].sort(compareFindings),
    };
  }

  const record = buildRecord(decl, input, producerPlatformId, routeId);
  findings.push(
    finding(
      UmEventRoutingCode.REGISTERED,
      "info",
      `Route "${routeId}" registered in the in-memory routing catalog.`,
      "route",
      "Standards §5 / P7",
    ),
  );

  return {
    ok: true,
    routeId,
    record,
    findings: [...findings].sort(compareFindings),
  };
}

function buildRecord(
  decl: UmEventRouteDeclaration,
  input: UmEventRouteRegistrationInput,
  producerPlatformId: string,
  routeId: UmEventRouteId,
): UmEventRouteRecord {
  return {
    routeId,
    eventType: decl.eventType,
    producerPlatformId,
    destinationPlatformId: decl.destinationPlatformId,
    ...(decl.metadata !== undefined ? { metadata: { ...decl.metadata } } : {}),
    ...(decl.notes !== undefined ? { notes: decl.notes } : {}),
    ...(input.registration?.registeredAt !== undefined
      ? { registeredAt: input.registration.registeredAt }
      : {}),
  };
}

function cloneRecord(record: UmEventRouteRecord): UmEventRouteRecord {
  return {
    ...record,
    ...(record.metadata !== undefined ? { metadata: { ...record.metadata } } : {}),
  };
}

/**
 * Create a pure in-memory event routing registry.
 */
export function createInMemoryEventRoutingRegistry(
  deps: UmEventRoutingRegistryDeps,
): UmInMemoryEventRoutingRegistry {
  const store = new Map<string, UmEventRouteRecord>();
  const { platforms, eventTypes } = deps;

  const sortedValues = (): UmEventRouteRecord[] =>
    [...store.values()].sort(compareRecords);

  return {
    register(input: UmEventRouteRegistrationInput): UmEventRouteRegistrationResult {
      const result = evaluateRegistration(input, platforms, eventTypes, store);
      if (result.ok && result.record) {
        const stored = cloneRecord(result.record);
        store.set(result.routeId, stored);
        return { ...result, record: cloneRecord(stored) };
      }
      return result;
    },

    get(routeId) {
      const stored = store.get(routeId);
      return stored === undefined ? undefined : cloneRecord(stored);
    },

    list() {
      return sortedValues().map(cloneRecord);
    },

    listByEventType(eventType) {
      return sortedValues()
        .filter((r) => r.eventType === eventType)
        .map(cloneRecord);
    },

    listByProducer(platformId) {
      return sortedValues()
        .filter((r) => r.producerPlatformId === platformId)
        .map(cloneRecord);
    },

    listByDestination(platformId) {
      return sortedValues()
        .filter((r) => r.destinationPlatformId === platformId)
        .map(cloneRecord);
    },

    has(routeId) {
      return store.has(routeId);
    },

    size() {
      return store.size;
    },

    clear() {
      store.clear();
    },
  };
}
