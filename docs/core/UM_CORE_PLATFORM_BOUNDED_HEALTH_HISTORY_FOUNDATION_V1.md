# UM Core — Bounded Health Observation History Foundation V1 (P22)

**Status:** Implemented (in-memory bounded ring only)
**Branch:** `office/um-core-platform-bounded-health-history-foundation-v1`
**Base:** `origin/alpha-0.2` @ `c8f5c9657ab4670d676f7ce6640ea30fd837890d`
**Normative base:** UM_CORE_SPECIFICATION_V1 · UM_CORE_ENGINEERING_STANDARDS_V1
**Canonical identity:** `um.core.bounded_health_history_foundation_v1`
**CONTRACT_SOURCE:** `derived_from_central_assignment_plus_gap_audit`

## Goal

Provide a pure **deterministic**, **in-process**, **explicitly bounded**
per-platform observation history ring (last-N successful snapshots) as a
companion to P17’s last-snapshot Source of Truth.

## Architectural rules

**BOUNDED HISTORY IS NOT LAST-SNAPSHOT SoT.**
**BOUNDED HISTORY IS NOT HEALTH DECLARATION REGISTRATION.**
**BOUNDED HISTORY IS NOT PROBE EXECUTION / MONITORING / POLLING.**
**BOUNDED HISTORY IS NOT DURABLE TELEMETRY / DB / EVENT STORE.**
**HISTORY ABSENCE ≠ LIFECYCLE READINESS.**

P17 remains the last-write-wins observation map. This foundation does not mutate
P17 reporter state and does not replace `getSnapshot`.

## Contract source note

No accepted standalone `*BOUNDED*HISTORY*` / `*HEALTH_HISTORY*` contract report
was found under worktrees. Semantics are derived from:

1. Post-P17 gap audit candidate `UM_CORE_PLATFORM_HEALTH_OBSERVATION_HISTORY_RING_P22`
   (last-N successful snapshots per platform; no persistence / time-series DB /
   alerting; history ≠ lifecycle readiness)
2. P17 snapshot admission / identity / taxonomy rules
3. Central assignment IMPLEMENT ONLY bullets (capacity, insertion, eviction,
   identity, query, empty-state, invalid rejection, duplicate semantics, tests)

## Responsibility split

| Layer | Role |
| --- | --- |
| **P4** | Registered platform identity SoT |
| **P10** | Health *declaration* catalog (untouched) |
| **P17** | Last-snapshot observation SoT (untouched) |
| **P22** | Bounded in-memory history ring (this foundation) |

## API

```ts
createInMemoryHealthObservationHistory({
  platforms: UmPlatformRegistry,
  capacity: number, // finite integer >= 1, per-platform
}): UmHealthObservationHistoryCreateResult

history.record(snapshot): UmHealthHistoryRecordResult
history.getHistory(platformId) // oldest → newest clones
history.getLatest(platformId)
history.listPlatformIds() / has() / platformCount() / entryCount()
history.capacity() / clear() / clearPlatform(platformId)
```

Result-returning only — **does not throw**. No probes, polling, networking,
alerting, persistence, or schedulers.

## Capacity & eviction

- Capacity is **explicit** and **per-platform**
- Invalid capacity (`<1`, non-integer, non-finite) → create `ok:false`,
  code `health.history.capacity_invalid`, **no store**
- On successful `record` when ring length == capacity: **evict oldest**
  (FIFO / ring head), then append newest
- `evicted: true` on the record result when eviction occurred

## Insertion & duplicate semantics

- Successful records **append** in call order (deterministic)
- Failed records never mutate history
- **Duplicates are retained**: identical payloads append as distinct entries
  (no dedupe / replace). This differs from P17 last-snapshot replace-on-success
  by design — history records sequence, not latest-only SoT

## Platform identity

Same gate family as P17, under `health.history.*` codes:

| Case | `ok` | finding code |
| --- | --- | --- |
| Missing/empty platformId | `false` | `health.history.platform_id_required` |
| Invalid machine id | `false` | `health.history.platform_id_naming` |
| Not registered in P4 | `false` | `health.history.unknown_platform` |
| Invalid status | `false` | `health.history.status_invalid` |
| Invalid snapshot structure | `false` | `health.history.snapshot_invalid` |
| Valid + registered | `true` | (empty findings) |

## Query & empty-state

- Unknown / never-recorded platform → `getHistory` `[]`, `getLatest` `undefined`,
  `has` `false`
- Fresh store → zero platform/entry counts, empty `listPlatformIds`
- Query results are **defensive clones**
- `listPlatformIds` sorted via `localeCompare`

## Export wiring

Implementation files live under `platforms/core/health/healthHistory*.ts`.
Shared `health/index.ts`, `health/types.ts`, `packageIdentity.ts`, and README
export wiring are **intentionally omitted** in this lane to avoid colliding with
parallel PC2-A1 SDK/factory work. Central may wire exports after integration.

## Non-goals

- DB / migrations / event store / analytics / monitoring
- Network / probes / polling / scheduler
- Product domains (Translation / Commerce / Learning / Collaboration)
- Paid AI
- Alpha merge
- Reimplementation of P17 / P18 / P19–P20 fleet aggregation

## Proposed commit subject

`feat(core): add UM Core bounded health observation history foundation v1`
