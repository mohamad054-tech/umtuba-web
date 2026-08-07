/**
 * Platform event contracts (Standards §5 / Spec Ch.10).
 *
 * P1: interfaces only (transport-agnostic).
 * P6: pure in-memory event TYPE catalog (no bus, publish, or consume).
 */

import type { UmComplianceStatus } from "../compliance/types";
import type {
  UmArtifactStability,
  UmEventTypeId,
  UmPlatformId,
} from "../identity/types";

export type UmEventPiiClass = "none" | "minimized" | "restricted";

export type UmEventDeliveryExpectation =
  | "at_least_once"
  | "best_effort"
  | "other";

/**
 * Compatibility policy for event schema evolution (catalog vocabulary).
 */
export type UmEventCompatibilityPolicy =
  | "backward"
  | "forward"
  | "full"
  | "none"
  | "other";

export type UmEventTypeRegistryFindingSeverity = "error" | "warning" | "info";

export interface UmEventTypeRegistryFinding {
  readonly code: string;
  readonly severity: UmEventTypeRegistryFindingSeverity;
  readonly message: string;
  readonly path?: string;
  readonly standardRef?: string;
}

export type UmEventTypeMetadata = Readonly<Record<string, string>>;

/**
 * Event type catalog entry (Standards §5.4) — type definition only.
 * Registration does not authorize emission or consumption.
 */
export interface UmEventTypeRecord {
  readonly eventType: UmEventTypeId;
  readonly producerPlatformId: UmPlatformId;
  readonly schemaVersion: string;
  readonly compatibilityPolicy: UmEventCompatibilityPolicy;
  readonly payloadSchemaRef: string;
  readonly piiClass: UmEventPiiClass;
  readonly deliveryExpectation: UmEventDeliveryExpectation;
  readonly stability: UmArtifactStability;
  readonly subjectRefExpectations: readonly string[];
  readonly documentationRefs: readonly string[];
  readonly description?: string;
  readonly metadata?: UmEventTypeMetadata;
  readonly registeredAt?: string;
  /** Compliance status of the producer platform at registration time. */
  readonly owningPlatformComplianceStatus?: UmComplianceStatus;
}

/**
 * Declaration used to register an event type into the catalog.
 */
export interface UmEventTypeDeclaration {
  readonly eventType: UmEventTypeId;
  readonly producerPlatformId: UmPlatformId;
  readonly schemaVersion: string;
  readonly compatibilityPolicy: UmEventCompatibilityPolicy;
  readonly payloadSchemaRef: string;
  readonly piiClass: UmEventPiiClass;
  readonly deliveryExpectation: UmEventDeliveryExpectation;
  readonly stability: UmArtifactStability;
  readonly subjectRefExpectations: readonly string[];
  readonly documentationRefs?: readonly string[];
  readonly description?: string;
  readonly metadata?: UmEventTypeMetadata;
}

export interface UmEventTypeRegistrationMetadata {
  readonly registeredAt?: string;
  readonly notes?: string;
}

export interface UmEventTypeRegistrationInput {
  readonly eventType: UmEventTypeDeclaration;
  readonly registration?: UmEventTypeRegistrationMetadata;
}

export interface UmEventTypeRegistrationResult {
  readonly ok: boolean;
  readonly eventType: UmEventTypeId;
  readonly record?: UmEventTypeRecord;
  readonly findings: readonly UmEventTypeRegistryFinding[];
}

/**
 * Event type catalog registry (Standards §5).
 */
export interface UmEventTypeRegistry {
  get(eventType: UmEventTypeId): UmEventTypeRecord | undefined;
  list(): readonly UmEventTypeRecord[];
  listByProducer(platformId: UmPlatformId): readonly UmEventTypeRecord[];
  listBySchemaVersion(schemaVersion: string): readonly UmEventTypeRecord[];
  listByStability(stability: UmArtifactStability): readonly UmEventTypeRecord[];
  listByPiiClass(piiClass: UmEventPiiClass): readonly UmEventTypeRecord[];
  listByDeliveryExpectation(
    deliveryExpectation: UmEventDeliveryExpectation,
  ): readonly UmEventTypeRecord[];
  has(eventType: UmEventTypeId): boolean;
  size(): number;
}

/**
 * P6 writable in-memory event type registry.
 * Catalog only — no publish, consume, bus, or transport.
 */
export interface UmInMemoryEventTypeRegistry extends UmEventTypeRegistry {
  register(input: UmEventTypeRegistrationInput): UmEventTypeRegistrationResult;
  /** Clears the in-memory catalog (test/dev helper; not persistence). */
  clear(): void;
}

/**
 * Typed subject reference without prescribing ID formats of domains.
 */
export interface UmSubjectRef {
  readonly kind: string;
  readonly id: string;
}

/**
 * Event instance envelope (Standards §5.5 / Spec §10.2).
 * Payload is opaque to Core. Not used by the P6 type catalog.
 */
export interface UmPlatformEventEnvelope<TPayload = unknown> {
  readonly eventId: string;
  readonly eventType: UmEventTypeId;
  readonly occurredAt: string;
  readonly producerPlatformId: UmPlatformId;
  readonly producerModuleId?: string;
  readonly subjectRef: UmSubjectRef;
  readonly correlationId: string;
  readonly causationId?: string;
  readonly idempotencyKey: string;
  readonly schemaVersion: string;
  readonly payload: TPayload;
}

/**
 * Event publisher port — interface only (no bus). Not implemented in P6.
 */
export interface UmEventPublisher {
  publish<TPayload>(event: UmPlatformEventEnvelope<TPayload>): void;
}

/**
 * Event consumer handler contract — interface only.
 * Consumers MUST be idempotent (Standards §5.3). Not implemented in P6.
 */
export interface UmEventConsumer<TPayload = unknown> {
  readonly consumerId: string;
  readonly eventType: UmEventTypeId;
  onEvent(event: UmPlatformEventEnvelope<TPayload>): void;
}
