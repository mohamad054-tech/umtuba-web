# UM Core — Event Publisher Foundation P16

**Status:** Closed (P6-backed publish admission only)  
**Branch:** `office/um-core-platform-event-publisher-foundation-p16`  
**Base:** `office/um-core-platform-capability-asserter-foundation-p15` @ `8302dcca372734a33ed570fc75d4597d2686d5de`  
**Normative base:** UM_CORE_SPECIFICATION_V1 · UM_CORE_ENGINEERING_STANDARDS_V1  
**Canonical identity:** `um.core.event_publisher_foundation_p16`

## Goal

Provide a pure **deterministic**, **in-process** `UmEventPublisher` that admits
platform event envelopes against the P6 event type catalog.

## Architectural rules

**EVENT PUBLISHING IS NOT EVENT DELIVERY.**  
**EVENT PUBLISHING IS NOT AN EVENT BUS.**

## Responsibility split

| Layer | Role |
| --- | --- |
| **P6** | Event type catalog SoT |
| **P7** | Routing catalog (rules only; not used by publish) |
| **P16** | Publish admission over P6 only |

## API

```ts
createInMemoryEventPublisher({
  eventTypes: UmEventTypeRegistry,
}): UmEventPublisher

publish(event): UmEventPublishResult
```

Result-returning only — **does not throw**. No delivery side effects.

## Publish admission policy

| Case | `ok` | finding code |
| --- | --- | --- |
| Unknown event type | `false` | `event.publish.unknown_type` |
| Producer ≠ catalog owner | `false` | `event.publish.producer_mismatch` |
| schemaVersion ≠ catalog | `false` | `event.publish.schema_version_mismatch` |
| Missing/empty required envelope fields | `false` | `event.publish.envelope_invalid` |
| subject kind not in expectations (when defined) | `false` | `event.publish.subject_kind_unexpected` |
| Valid envelope + catalog match | `true` | (empty findings) |

### Field rules

- Required non-empty strings: `eventId`, `eventType`, `occurredAt`,
  `producerPlatformId`, `correlationId`, `idempotencyKey`, `schemaVersion`,
  `subjectRef.kind`, `subjectRef.id`
- `subjectRef` object required
- When catalog `subjectRefExpectations` is non-empty, kind must be listed
- When expectations are empty, kind is not constrained beyond non-empty
- Payload is opaque — no JSON-schema fetch/execution
- Caller supplies `eventId` / `occurredAt` (and correlation/idempotency keys);
  publisher never generates clock/UUID values

## P7 relationship

Publish success is **independent** of routing. P16 does not inspect or require
routes. Routing remains a separate catalog concern.

## Deferred

- Event delivery / bus / consumer dispatch
- Queue / outbox / retry / DLQ
- Payload schema runtime
- SDK client/factory
- Health reporter / dependency validator

## Non-goals

- Networking / persistence / migrations / product wiring
- Mutating P6/P7 catalogs
- Generating ids or timestamps

## Proposed commit subject

`feat(core): add UM Core event publisher foundation P16`
