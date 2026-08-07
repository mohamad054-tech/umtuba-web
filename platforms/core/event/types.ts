/**
 * Platform event contracts (Standards §5 / Spec Ch.10).
 *
 * P1: interfaces only (transport-agnostic).
 * P6: pure in-memory event TYPE catalog (no bus, publish, or consume).
 * P16: pure deterministic P6-backed UmEventPublisher (admission only).
 *
 * EVENT PUBLISHING IS NOT EVENT DELIVERY.
 * EVENT PUBLISHING IS NOT AN EVENT BUS.
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
 * Deterministic finding for publish admission (P16).
 */
export interface UmEventPublishFinding {
  readonly code: string;
  readonly message: string;
  readonly path?: string;
}

/**
 * Result of a publish admission attempt (P16).
 * Valid publish → ok: true with empty findings.
 */
export interface UmEventPublishResult {
  readonly ok: boolean;
  readonly eventId: string;
  readonly eventType: string;
  readonly findings: readonly UmEventPublishFinding[];
}

/**
 * Dependencies for the in-memory event publisher (P16).
 * P7 routing is intentionally excluded from the publish path.
 */
export interface UmEventPublisherDeps {
  readonly eventTypes: UmEventTypeRegistry;
}

/**
 * Event publisher port — P6-backed admission only (no bus/delivery).
 * P16 returns a deterministic result instead of void.
 */
export interface UmEventPublisher {
  publish<TPayload>(
    event: UmPlatformEventEnvelope<TPayload>,
  ): UmEventPublishResult;
}

/**
 * Event consumer handler contract — interface only.
 * Consumers MUST be idempotent (Standards §5.3). Not implemented in P16.
 */
export interface UmEventConsumer<TPayload = unknown> {
  readonly consumerId: string;
  readonly eventType: UmEventTypeId;
  onEvent(event: UmPlatformEventEnvelope<TPayload>): void;
}

/* -------------------------------------------------------------------------- */
/* P7 — Event routing catalog (rules only; no delivery runtime)               */
/* -------------------------------------------------------------------------- */

export type UmEventRoutingFindingSeverity = "error" | "warning" | "info";

export interface UmEventRoutingFinding {
  readonly code: string;
  readonly severity: UmEventRoutingFindingSeverity;
  readonly message: string;
  readonly path?: string;
  readonly standardRef?: string;
}

export type UmEventRouteMetadata = Readonly<Record<string, string>>;

/**
 * Deterministic route identity: `${eventType}=>${destinationPlatformId}`.
 */
export type UmEventRouteId = string;

/**
 * Declared route from an event type to a destination platform.
 * Catalog only — does not deliver or authorize consumption.
 */
export interface UmEventRouteRecord {
  readonly routeId: UmEventRouteId;
  readonly eventType: UmEventTypeId;
  readonly producerPlatformId: UmPlatformId;
  readonly destinationPlatformId: UmPlatformId;
  readonly metadata?: UmEventRouteMetadata;
  readonly notes?: string;
  readonly registeredAt?: string;
}

export interface UmEventRouteDeclaration {
  readonly eventType: UmEventTypeId;
  readonly destinationPlatformId: UmPlatformId;
  readonly metadata?: UmEventRouteMetadata;
  readonly notes?: string;
}

export interface UmEventRouteRegistrationMetadata {
  readonly registeredAt?: string;
}

export interface UmEventRouteRegistrationInput {
  readonly route: UmEventRouteDeclaration;
  readonly registration?: UmEventRouteRegistrationMetadata;
}

export interface UmEventRouteRegistrationResult {
  readonly ok: boolean;
  readonly routeId: UmEventRouteId;
  readonly record?: UmEventRouteRecord;
  readonly findings: readonly UmEventRoutingFinding[];
}

/**
 * Event routing catalog (P7) — rule lookup only.
 */
export interface UmEventRoutingRegistry {
  get(routeId: UmEventRouteId): UmEventRouteRecord | undefined;
  list(): readonly UmEventRouteRecord[];
  listByEventType(eventType: UmEventTypeId): readonly UmEventRouteRecord[];
  listByProducer(platformId: UmPlatformId): readonly UmEventRouteRecord[];
  listByDestination(platformId: UmPlatformId): readonly UmEventRouteRecord[];
  has(routeId: UmEventRouteId): boolean;
  size(): number;
}

/**
 * P7 writable in-memory event routing registry.
 * No bus, publish, consume, transport, outbox, or retry.
 */
export interface UmInMemoryEventRoutingRegistry extends UmEventRoutingRegistry {
  register(input: UmEventRouteRegistrationInput): UmEventRouteRegistrationResult;
  clear(): void;
}
