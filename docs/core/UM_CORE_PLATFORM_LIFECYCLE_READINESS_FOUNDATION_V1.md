# UM Core — Platform Lifecycle Readiness Foundation V1 (P23)

**Status:** Implemented (pure in-process readiness gate only)
**Branch:** `office/um-core-platform-lifecycle-readiness-foundation-v1`
**Base:** `origin/alpha-0.2` @ `0011fe6cf2a66b997ebe0d993ed92cdd7ca47754`
**Normative base:** UM_CORE_SPECIFICATION_V1 · UM_CORE_ENGINEERING_STANDARDS_V1
**Canonical identity:** `um.core.platform_lifecycle_readiness_foundation_v1`
**Task ID:** `UM_CORE_PLATFORM_LIFECYCLE_READINESS_FOUNDATION_V1`
**CONTRACT_SOURCE:** `derived_from_central_assignment_plus_gap_audit`

## Goal

Provide a pure **deterministic**, **side-effect-free**, **in-process** platform
lifecycle readiness evaluator over supplied Core state only (P4 + P10 + P17).

## Architectural rules

**HEALTH STATUS TOKEN `ready` IS NOT LIFECYCLE READINESS.**
**READINESS IS NOT PROBE EXECUTION / MONITORING / POLLING.**
**READINESS IS NOT DIAGNOSTICS JOIN / FLEET AGGREGATION.**
**ABSENCE OF OBSERVATION IS NOT UNAVAILABLE** — when a reporter is declared,
absence yields explicit `NOT_READY` (`readiness.health_unobserved`).

## Explicit vocabulary

| Term | Meaning in Core |
| --- | --- |
| **REGISTRATION** | Platform identity admitted into the P4 catalog |
| **VALIDITY** | Stored P2 validation on the record is `ok: true` |
| **COMPLIANCE** | Stored P3 `complianceStatus === "compliant"` |
| **HEALTH** | P10 declaration (intent) + P17 observation (§18.3 status token) |
| **READINESS** | Fail-closed `READY` / `NOT_READY` gate with explicit reasons |

## Responsibility split

| Layer | Role |
| --- | --- |
| **P4** | Registered platform identity + stored validation/compliance |
| **P10** | Health *declaration* catalog (untouched) |
| **P17** | Last-snapshot observation SoT (untouched) |
| **P18/P20** | Diagnostics join / fleet aggregation (orthogonal; unused here) |
| **P23** | Lifecycle readiness gate (this foundation) |

## API

```ts
createPlatformReadinessEvaluator({
  platforms: UmPlatformRegistry,                 // P4
  declarations: UmHealthRegistry,                // P10
  observations: UmHealthObservationReadSource,   // P17
}): UmPlatformReadinessEvaluator

evaluate(): UmPlatformReadinessView
evaluatePlatform(platformId): UmPlatformReadinessRow
```

## READY gates (all required)

1. Registered in P4
2. Stored validation ok
3. `complianceStatus === "compliant"`
4. Health declaration present
5. If `reportsStatus: true`: observation present **and** observation status token
   is `ready` (input gate only — verdict remains separate `READY` / `NOT_READY`)

Silent declarers (`reportsStatus: false`) do not require an observation.

## Shared wiring deferred

- Root `platforms/core/index.ts` barrel export
- `packageIdentity.ts` phase constant (local `UM_CORE_PLATFORM_LIFECYCLE_READINESS_PHASE = "P23"`)
- SDK / aggregate facade slots

## Non-goals

- Probes / polling / networking / DB / migrations / schedulers
- Deployment orchestration
- Product platform wiring (Commerce / Learning / Collaboration / Translation)
- Alpha merge

## Proposed commit subject

`feat(core): add UM Core platform lifecycle readiness foundation v1`
