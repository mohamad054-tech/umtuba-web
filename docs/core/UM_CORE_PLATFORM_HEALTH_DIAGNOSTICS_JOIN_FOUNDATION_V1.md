# UM Core — Health Diagnostics Join Foundation V1 (P18)

**Status:** Closed (pure in-process read-model join only)
**Branch:** `office/um-core-platform-health-diagnostics-join-foundation-v1`
**Base:** `origin/alpha-0.2` @ `dc6797e73c08b0403782884ad7a8a699e94ead5e` (P17 integrated)
**Normative base:** UM_CORE_SPECIFICATION_V1 · UM_CORE_ENGINEERING_STANDARDS_V1
**Canonical identity:** `um.core.health_diagnostics_join_foundation_v1`
**Task ID:** `UM_CORE_PLATFORM_HEALTH_DIAGNOSTICS_JOIN_FOUNDATION_V1`

## Goal

Provide a pure **deterministic**, **side-effect-free**, **in-process** diagnostics
join that composes existing Core health information only:

| Source | Role |
| --- | --- |
| **P4** | Registered platform identity SoT |
| **P10** | Health declaration catalog (`reportsStatus`, opaque `probeRef`) |
| **P17** | Last-snapshot observation store |

## Architectural rules

**DIAGNOSTICS JOIN IS NOT PROBE EXECUTION.**
**DIAGNOSTICS JOIN IS NOT NETWORK / SERVICE DISCOVERY.**
**DIAGNOSTICS JOIN IS NOT DISTRIBUTED JOIN / SCHEDULER / DB JOIN.**
**ABSENCE OF OBSERVATION IS NOT UNAVAILABLE.**

The join never invents health status, never executes probes, and never mutates
P4/P10/P17 stores.

## API

```ts
createHealthDiagnosticsJoin({
  platforms: UmPlatformRegistry,       // P4
  declarations: UmHealthRegistry,      // P10
  observations: UmHealthObservationReadSource, // P17 list+getSnapshot
}): UmHealthDiagnosticsJoin

evaluate(): UmHealthDiagnosticsJoinView
```

## Join classes

| Class | Meaning |
| --- | --- |
| `declared_and_observed` | P10 `reportsStatus:true` + P17 snapshot |
| `declared_unobserved` | P10 `reportsStatus:true` + no snapshot |
| `declared_silent` | P10 `reportsStatus:false` + no snapshot |
| `declared_silent_but_observed` | P10 `reportsStatus:false` + snapshot (allowed; P17 orthogonal) |
| `observed_undeclared` | P17 snapshot + no P10 row |
| `registered_only` | P4 only |
| `orphan_observation` | Observation without P4 registration (fail-closed visibility) |

## Determinism

- Platform id union from `platforms.list()` ∪ `observations.list()`
- Rows sorted by `platformId` (`localeCompare`)
- Status tallies counted from observation statuses only
- `unobservedReporters` counts only `declared_unobserved`
- Repeated `evaluate()` with unchanged deps returns equal views

## Deferred / non-goals

- Probe execution / polling / scheduling / networking
- Fleet aggregation / alerting / remediation
- Freshness / TTL / wall-clock
- History ring / persistence / migrations
- P12 facade slot changes
- SDK client/factory wiring
- Product domain wiring

## Proposed commit subject

`feat(core): add UM Core health diagnostics join foundation v1`
