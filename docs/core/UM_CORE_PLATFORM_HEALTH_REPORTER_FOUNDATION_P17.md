# UM Core — Health Reporter Foundation P17

**Status:** Closed (in-memory observation admission/store only)
**Branch:** `office/um-core-platform-health-reporter-foundation-p17`
**Base:** `origin/alpha-0.2` @ `0999fc1d5f1ec5a7db0c3c2e614bd10e67bc87a2`
**Normative base:** UM_CORE_SPECIFICATION_V1 · UM_CORE_ENGINEERING_STANDARDS_V1
**Canonical identity:** `um.core.health_reporter_foundation_p17`

## Goal

Provide a pure **deterministic**, **in-process** `UmHealthReporter` that admits
and stores caller-supplied health observation snapshots for platforms already
registered in P4.

## Architectural rules

**HEALTH REPORTING IS NOT HEALTH DECLARATION REGISTRATION.**
**HEALTH REPORTING IS NOT PROBE EXECUTION.**

P10 remains the declaration catalog Source of Truth. P17 never mutates it and
never treats a declaration as evidence that a platform is healthy.

## Responsibility split

| Layer | Role |
| --- | --- |
| **P4** | Registered platform identity SoT |
| **P10** | Health *declaration* catalog (intent/metadata only) |
| **P17** | Health *observation* admission + last-snapshot store |

## API

```ts
createInMemoryHealthReporter({
  platforms: UmPlatformRegistry,
}): UmInMemoryHealthReporter

report(snapshot): UmHealthReportResult
getSnapshot(platformId): UmHealthSnapshot | undefined
list() / has() / size() / clear()
```

Result-returning only — **does not throw**. No probes, polling, networking,
alerting, or remediation.

## Status taxonomy

Standards §18.3 only:

- `ready`
- `degraded`
- `unavailable`

No `healthy` / `unhealthy` / `unknown` statuses are accepted. Absence of an
observation is represented by `getSnapshot` returning `undefined`.

## Report admission policy

| Case | `ok` | finding code |
| --- | --- | --- |
| Missing/empty platformId | `false` | `health.report.platform_id_required` |
| Invalid platformId machine id | `false` | `health.report.platform_id_naming` |
| Platform not registered in P4 | `false` | `health.report.unknown_platform` |
| Invalid status value | `false` | `health.report.status_invalid` |
| Invalid snapshot structure | `false` | `health.report.snapshot_invalid` |
| Valid snapshot + registered platform | `true` | (empty findings) |

Failed reports never mutate reporter state. Successful reports replace the prior
snapshot for that `platformId`. `checkedAt` is caller-supplied (no clock).

## P10 → P17 boundary

- P10 rows declare whether a platform *intends* to report (`reportsStatus`) and
  optional opaque `probeRef` metadata
- P17 stores actual observation snapshots only after explicit `report(...)`
- A P10 declaration alone never creates a snapshot / ready status
- P17 does not read or write the P10 catalog

## Deferred

- Probe execution / scheduling / polling
- Networking / HTTP health checks
- Alerting / notifications / remediation
- SDK client/factory wiring
- Aggregate facade slot changes

## Non-goals

- Networking / persistence / migrations / product wiring
- Mutating P4/P10 catalogs
- Broad observability platform

## Proposed commit subject

`feat(core): add UM Core health reporter foundation P17`
