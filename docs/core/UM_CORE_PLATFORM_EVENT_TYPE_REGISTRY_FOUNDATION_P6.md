# UM Core — Event Type Registry Foundation P6

**Status:** Implemented (in-memory type catalog only)  
**Branch:** `office/um-core-platform-event-type-registry-foundation-p6`  
**Base:** `office/um-core-platform-capability-registry-foundation-p5` @ `d57e481`  
**Normative base:** UM_CORE_SPECIFICATION_V1 · UM_CORE_ENGINEERING_STANDARDS_V1

## Goal

Provide the lawful **in-process** catalog of platform **event TYPES**.

This is a **type catalog only**.

## What registration means

- Records the identity and contract of an event type
- Ownership remains with the **producer platform**
- Core owns event identity / catalog law only

## What registration does NOT mean

- Does **not** authorize emission
- Does **not** authorize consumption
- Does **not** create runtime bindings, subscriptions, or transport
- Does **not** imply an event bus, outbox, queue, or delivery engine

## Engine

- `createInMemoryEventTypeRegistry({ platforms })`
- `register` / `get` / `has` / `size` / `clear`
- `list` / `listByProducer` / `listBySchemaVersion` /
  `listByStability` / `listByPiiClass` / `listByDeliveryExpectation`

## Admission rules

1. Producer platform exists in P4 Platform Registry
2. Event type is declared in the producer manifest (`providesEvents`)
3. Schema version + stability match the manifest declaration
4. Event type id is unique and namespaced under the producer
5. Schema version, stability, compatibility, PII, delivery, payload schema
   ref, and subject-ref expectations are valid
6. Producer ownership declarations are present

Failed registration never mutates registry state.

## Non-goals

- Event publisher / consumer runtime
- Event bus / outbox / retry / DLQ / subscriptions
- Transport adapters / networking / persistence
- Database schema / migrations
- Product-platform integration

## Proposed commit subject

`feat(core): add UM Core event type registry foundation P6`
