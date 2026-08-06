/**
 * Platform event contracts (Standards §5 / Spec Ch.10).
 *
 * Transport-agnostic. No bus implementation in P1.
 */

import type {
  UmArtifactStability,
  UmEventTypeId,
  UmPlatformId,
} from "../identity/types";

/**
 * Typed subject reference without prescribing ID formats of domains.
 */
export interface UmSubjectRef {
  readonly kind: string;
  readonly id: string;
}

/**
 * Event type catalog entry (Standards §5.4).
 */
export interface UmEventTypeRecord {
  readonly eventType: UmEventTypeId;
  readonly producerPlatformId: UmPlatformId;
  readonly schemaVersion: string;
  readonly compatibilityPolicy: string;
  readonly payloadSchemaRef: string;
  readonly piiClass: "none" | "minimized" | "restricted";
  readonly deliveryExpectation: "at_least_once" | "best_effort" | "other";
  readonly stability: UmArtifactStability;
  readonly description?: string;
}

/**
 * Event instance envelope (Standards §5.5 / Spec §10.2).
 * Payload is opaque to Core.
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
 * Event type catalog registry — interface only.
 */
export interface UmEventTypeRegistry {
  get(eventType: UmEventTypeId): UmEventTypeRecord | undefined;
  listByProducer(platformId: UmPlatformId): readonly UmEventTypeRecord[];
}

/**
 * Event publisher port — interface only (no bus).
 */
export interface UmEventPublisher {
  publish<TPayload>(event: UmPlatformEventEnvelope<TPayload>): void;
}

/**
 * Event consumer handler contract — interface only.
 * Consumers MUST be idempotent (Standards §5.3).
 */
export interface UmEventConsumer<TPayload = unknown> {
  readonly consumerId: string;
  readonly eventType: UmEventTypeId;
  onEvent(event: UmPlatformEventEnvelope<TPayload>): void;
}
