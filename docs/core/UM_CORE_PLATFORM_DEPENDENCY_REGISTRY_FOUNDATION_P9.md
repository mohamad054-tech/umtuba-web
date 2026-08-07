# UM Core — Dependency Registry Foundation P9

**Status:** Closed (in-memory dependency edge catalog only)  
**Branch:** `office/um-core-platform-dependency-registry-foundation-p9`  
**Base:** `office/um-core-platform-feature-flag-registry-foundation-p8` @ `a335e397fd0780b11ef6df6a1b0b957c2f6dcb8b`  
**Normative base:** UM_CORE_SPECIFICATION_V1 · UM_CORE_ENGINEERING_STANDARDS_V1

## Goal

Provide a pure **in-process** catalog of declared dependency **edges** owned by
registered platforms. Edges must match the owner platform manifest
`requires[]` declaration.

## What dependency registration means

- Records an inspectable catalog row for a declared `requires[]` entry
- Captures target kind/id, strength, reason, optional `minCompatibility`
- Optionally cross-checks capability targets against the P5 registry

## What it does NOT mean

- Does **not** resolve dependencies at runtime
- Does **not** install, discover, probe, or orchestrate startup
- Does **not** evaluate version ranges / compatibility expressions
- Does **not** implement Health, Naming, SDK, or aggregate `UmCoreRegistry`

**DEPENDENCY REGISTRATION IS NOT DEPENDENCY RESOLUTION.**

## Registry

- `createInMemoryDependencyRegistry({ platforms, capabilities? })`
- `register` / `get` / `has` / `size` / `clear`
- `list` / `listRequirements` / `listDependents` / `listByTargetKind` /
  `listByStrength`
- Deterministic edge id: `${from}=>${kind}:${target}:${strength}`

## Target-kind semantics

1. `platform` — target MUST exist in P4
2. `capability` — when P5 provided, target MUST exist in P5; when omitted,
   in-platform targets must exist on the owner P4 capability catalog
3. `peer_kernel` — opaque declared dependency (e.g. `um.core`); not resolved

## Admission rules

1. Owner platform exists in P4
2. Edge matches owner manifest `requires[]`
3. Edge id is unique
4. Platform targets exist in P4
5. Capability integrity per target-kind rules above
6. Required platform→platform edges must not create a catalog cycle

Failed registration never mutates registry state.
`registeredAt` is pass-through only (no clock).
`minCompatibility` is pass-through only (not evaluated).

## Cycle policy

Detect/reject cycles only among cataloged **required** `platform→platform`
edges. Optional edges and `peer_kernel` / `capability` edges do not
participate. Catalog integrity only — not boot/runtime orchestration.

## Relationship

- P2 = single-manifest structural validation
- P3 = compliance scoring (unchanged)
- P9 = dependency catalog + cross-catalog referential admission

## Non-goals

- Runtime resolver / DI / discovery / startup orchestration
- Health / Naming / SDK / `UmCoreRegistry` facade
- Transitive or version solvers
- Persistence / networking / product integration / migrations

## Proposed commit subject

`feat(core): add UM Core dependency registry foundation P9`
