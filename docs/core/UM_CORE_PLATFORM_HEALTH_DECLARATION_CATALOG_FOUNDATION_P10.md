# UM Core — Health Declaration Catalog Foundation P10

**Status:** Closed (in-memory health declaration catalog only)  
**Branch:** `office/um-core-platform-health-declaration-catalog-foundation-p10`  
**Base:** `office/um-core-platform-dependency-registry-foundation-p9` @ `0c05319776351b8cb648d269156fb8e900a497bd`  
**Normative base:** UM_CORE_SPECIFICATION_V1 · UM_CORE_ENGINEERING_STANDARDS_V1

## Goal

Provide a pure **in-process** catalog of platform **health declarations**
already present on registered platform manifests (`manifest.health`).

## What health declaration registration means

- Records one inspectable catalog row per platform for `manifest.health`
- Captures `reportsStatus`, optional opaque `probeRef`, optional `notes`
- Bound to the P4 platform registry

## What it does NOT mean

- Does **not** execute probes or call `probeRef`
- Does **not** poll, schedule, network, or alert
- Does **not** produce live liveness/readiness evaluations
- Does **not** implement `UmHealthReporter`

**HEALTH DECLARATION REGISTRATION IS NOT HEALTH MONITORING.**

## Registry

- `createInMemoryHealthRegistry({ platforms })`
- `register` / `get` / `has` / `size` / `clear`
- `list` / `listByReportsStatus`
- Identity: `platformId` (exactly one declaration row per platform)

## Admission rules

1. Owner platform exists in P4
2. Submitted declaration exactly matches owner `manifest.health`
3. Platform health row is unique
4. `reportsStatus` is a boolean

Failed registration never mutates registry state.
`registeredAt` is pass-through only (no clock).
`probeRef` is opaque metadata only.

## P1 contract evolution

P1 originally shaped `UmHealthRegistry` with `getSnapshot` / `registerProbe`
toward a future monitoring runtime. P10 evolves `UmHealthRegistry` into the
**declaration catalog** read surface required by `UmCoreRegistry.health`.

Retained as **future runtime contracts only** (unimplemented):

- `UmHealthSnapshot` / `UmDependencyHealthStatus`
- `UmHealthProbeRegistration`
- `UmHealthReporter`

## Relationship

- P2 = structural validation that `health` exists / `reportsStatus` is boolean
- P3 = compliance scoring of health reporting evidence (unchanged)
- P4 = registered platforms owning `manifest.health`
- P10 = declaration catalog + referential admission against P4

## Non-goals

- Probe execution / polling / scheduling / networking / alerting
- Live snapshots / `UmHealthReporter`
- Naming / SDK / aggregate `UmCoreRegistry`
- Persistence / product integration / migrations

## Proposed commit subject

`feat(core): add UM Core health declaration catalog foundation P10`
