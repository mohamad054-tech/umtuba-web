# UM Core — Event Routing Foundation P7

**Status:** Implemented (in-memory routing catalog only)  
**Branch:** `office/um-core-platform-event-routing-foundation-p7`  
**Base:** `office/um-core-platform-event-type-registry-foundation-p6` @ `1263091`  
**Normative base:** UM_CORE_SPECIFICATION_V1 · UM_CORE_ENGINEERING_STANDARDS_V1

## Goal

Provide a pure **in-process** catalog of event routing **rules**:
event type → destination platform(s).

## What routing registration means

- Records an inspectable rule linking a registered event type to a
  registered destination platform
- Captures producer platform from the P6 event type record

## What it does NOT mean

- Does **not** publish, consume, deliver, or transport events
- Does **not** create an event bus, outbox, queue, or retry engine
- Does **not** authorize emission or consumption

## Engine

- `createInMemoryEventRoutingRegistry({ platforms, eventTypes })`
- `register` / `get` / `has` / `size` / `clear`
- `list` / `listByEventType` / `listByProducer` / `listByDestination`
- `buildEventRouteId(eventType, destinationPlatformId)`

## Admission rules

1. Event type exists in P6 registry
2. Producer platform from that event type still exists in P4 registry
3. Destination platform exists in P4 registry
4. Route id (`eventType=>destination`) is unique

Failed registration never mutates registry state.

## Non-goals

- Event bus / publish / consume / outbox / retry / queues / transport
- Persistence / networking / product integration / migrations

## Proposed commit subject

`feat(core): add UM Core event routing foundation P7`
