/**
 * In-memory Event Publisher Foundation (UM Core P16).
 *
 * Pure deterministic P6-backed publish admission.
 * EVENT PUBLISHING IS NOT EVENT DELIVERY.
 * EVENT PUBLISHING IS NOT AN EVENT BUS.
 *
 * @see UM_CORE_SPECIFICATION_V1
 * @see UM_CORE_ENGINEERING_STANDARDS_V1 (§5)
 */

import { isNonEmptyTrimmed } from "../validation/naming";
import { UmEventPublishCode } from "./publishCodes";
import type {
  UmEventPublishFinding,
  UmEventPublishResult,
  UmEventPublisher,
  UmEventPublisherDeps,
  UmEventTypeRecord,
  UmEventTypeRegistry,
  UmPlatformEventEnvelope,
} from "./types";

function finding(
  code: string,
  message: string,
  path?: string,
): UmEventPublishFinding {
  return {
    code,
    message,
    ...(path !== undefined ? { path } : {}),
  };
}

function compareFindings(
  a: UmEventPublishFinding,
  b: UmEventPublishFinding,
): number {
  const code = a.code.localeCompare(b.code);
  if (code !== 0) return code;
  const path = (a.path ?? "").localeCompare(b.path ?? "");
  if (path !== 0) return path;
  return a.message.localeCompare(b.message);
}

function requireNonEmpty(
  value: unknown,
  path: string,
  findings: UmEventPublishFinding[],
): void {
  if (!isNonEmptyTrimmed(typeof value === "string" ? value : "")) {
    findings.push(
      finding(
        UmEventPublishCode.ENVELOPE_INVALID,
        `Envelope field "${path}" is required and must be a non-empty string.`,
        path,
      ),
    );
  }
}

function validateEnvelopeStructure(
  event: UmPlatformEventEnvelope<unknown>,
): UmEventPublishFinding[] {
  const findings: UmEventPublishFinding[] = [];
  requireNonEmpty(event.eventId, "eventId", findings);
  requireNonEmpty(event.eventType, "eventType", findings);
  requireNonEmpty(event.occurredAt, "occurredAt", findings);
  requireNonEmpty(event.producerPlatformId, "producerPlatformId", findings);
  requireNonEmpty(event.correlationId, "correlationId", findings);
  requireNonEmpty(event.idempotencyKey, "idempotencyKey", findings);
  requireNonEmpty(event.schemaVersion, "schemaVersion", findings);

  if (event.subjectRef == null || typeof event.subjectRef !== "object") {
    findings.push(
      finding(
        UmEventPublishCode.ENVELOPE_INVALID,
        'Envelope field "subjectRef" is required.',
        "subjectRef",
      ),
    );
  } else {
    requireNonEmpty(event.subjectRef.kind, "subjectRef.kind", findings);
    requireNonEmpty(event.subjectRef.id, "subjectRef.id", findings);
  }

  return findings;
}

function validateAgainstCatalog(
  event: UmPlatformEventEnvelope<unknown>,
  record: UmEventTypeRecord,
): UmEventPublishFinding[] {
  const findings: UmEventPublishFinding[] = [];

  if (event.producerPlatformId !== record.producerPlatformId) {
    findings.push(
      finding(
        UmEventPublishCode.PRODUCER_MISMATCH,
        `Producer platform "${event.producerPlatformId}" does not match catalog owner "${record.producerPlatformId}".`,
        "producerPlatformId",
      ),
    );
  }

  if (event.schemaVersion !== record.schemaVersion) {
    findings.push(
      finding(
        UmEventPublishCode.SCHEMA_VERSION_MISMATCH,
        `Schema version "${event.schemaVersion}" does not match catalog version "${record.schemaVersion}".`,
        "schemaVersion",
      ),
    );
  }

  if (
    record.subjectRefExpectations.length > 0 &&
    event.subjectRef != null &&
    isNonEmptyTrimmed(event.subjectRef.kind) &&
    !record.subjectRefExpectations.includes(event.subjectRef.kind)
  ) {
    findings.push(
      finding(
        UmEventPublishCode.SUBJECT_KIND_UNEXPECTED,
        `Subject kind "${event.subjectRef.kind}" is not in catalog subjectRefExpectations.`,
        "subjectRef.kind",
      ),
    );
  }

  return findings;
}

function publishOne(
  eventTypes: UmEventTypeRegistry,
  event: UmPlatformEventEnvelope<unknown>,
): UmEventPublishResult {
  const eventId =
    typeof event.eventId === "string" ? event.eventId : "";
  const eventType =
    typeof event.eventType === "string" ? event.eventType : "";

  const findings: UmEventPublishFinding[] = [
    ...validateEnvelopeStructure(event),
  ];

  const record =
    isNonEmptyTrimmed(eventType) ? eventTypes.get(eventType) : undefined;

  if (isNonEmptyTrimmed(eventType) && !record) {
    findings.push(
      finding(
        UmEventPublishCode.UNKNOWN_TYPE,
        `Event type "${eventType}" is not registered.`,
        "eventType",
      ),
    );
  } else if (record) {
    findings.push(...validateAgainstCatalog(event, record));
  }

  const sorted = [...findings].sort(compareFindings);
  return {
    ok: sorted.length === 0,
    eventId,
    eventType,
    findings: sorted,
  };
}

/**
 * Create a pure in-memory event publisher over the P6 event type catalog.
 * Validates/accepts envelopes only — no delivery, bus, routing, or storage.
 */
export function createInMemoryEventPublisher(
  deps: UmEventPublisherDeps,
): UmEventPublisher {
  const { eventTypes } = deps;

  return {
    publish(event) {
      return publishOne(eventTypes, event);
    },
  };
}
