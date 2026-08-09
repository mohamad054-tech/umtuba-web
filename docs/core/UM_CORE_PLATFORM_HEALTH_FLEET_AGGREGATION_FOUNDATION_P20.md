# UM Core — Health Fleet Aggregation Foundation (P20)

**Status:** Closed (pure in-process fleet rollup only)
**Branch:** `office/um-core-platform-fleet-health-aggregation-foundation-v1`
**Base:** `origin/alpha-0.2` @ `c8f5c9657ab4670d676f7ce6640ea30fd837890d` (P17 + P18 diagnostics join)
**Normative base:** UM_CORE_SPECIFICATION_V1 · UM_CORE_ENGINEERING_STANDARDS_V1
**Canonical identity:** `um.core.health_fleet_aggregation_foundation_p20`
**Task ID:** `UM_CORE_PLATFORM_FLEET_HEALTH_AGGREGATION_FOUNDATION_V1`

## Goal

Provide a pure **deterministic**, **fail-closed**, **read-only** fleet health
aggregation over already-admitted Core state:

| Source | Role |
| --- | --- |
| **P4** | Fleet membership SoT |
| **P17** | Observation snapshots (consumer only) |
| **P10** (optional) | Declaration intent for expected-unobserved / undeclared lists |
| **A1 / P18** (optional) | Preferred pre-joined diagnostics lists |

## Architectural rules

**FLEET AGGREGATION IS NOT HEALTH MONITORING.**
**FLEET AGGREGATION IS NOT PROBE EXECUTION.**
**FLEET AGGREGATION IS NOT HEALTH REPORT ADMISSION.**
**FLEET AGGREGATION IS NOT HEALTH DECLARATION REGISTRATION.**
**ABSENCE OF OBSERVATION IS NOT UNAVAILABLE.**

Aggregation never invents §18.3 status, never mutates stores, and never
executes probes / polls / network / schedulers.

## Status taxonomy

Core tokens only: `ready | degraded | unavailable`.

Assignment wording maps at boundaries only (not exported as Core statuses):

| Assignment wording | Core representation |
| --- | --- |
| healthy | `ready` |
| unhealthy | `unavailable` |
| unknown | observation absence (`undefined`) |

## API

```ts
createFleetHealthAggregation({
  platforms,       // P4
  observations,    // P17 getSnapshot + list
  declarations?,   // optional P10
  diagnostics?,    // optional A1 join view
}): UmFleetHealthAggregation

evaluate(): UmFleetHealthAggregationResult

aggregateFleetHealthFromMembers(members): UmFleetHealthAggregationResult
```

## Output invariants

- Result-returning; does not throw
- `ok: false` ⇒ no members emitted
- `statusCounts.*` sum equals `observedCount`
- `unobservedCount + observedCount === fleetSize` when `ok: true`
- `observedWorstStatus` uses §18.3 only, or `undefined` when none observed
- Members / id lists / findings sorted deterministically (`localeCompare`)
- Empty fleet ⇒ `ok: true`, `coverage: "none"`, zeros, no synthetic rows

## Deferred / non-goals

- Probe execution / polling / scheduling / networking / discovery
- Alerting / remediation / history storage
- Freshness / TTL / wall-clock interpretation of `checkedAt`
- P12 facade 8th slot
- Product domain health taxonomies
- DB / migrations

## Proposed commit subject

`feat(core): add UM Core fleet health aggregation foundation v1`
