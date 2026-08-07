# UM Core — Feature Flag Registry Foundation P8

**Status:** Closed (in-memory flag catalog only)  
**Branch:** `office/um-core-platform-feature-flag-registry-foundation-p8`  
**Base:** `office/um-core-platform-event-routing-foundation-p7` @ `7e1dc2541662305276d5796e9851e8a2dfc7037f`  
**Normative base:** UM_CORE_SPECIFICATION_V1 · UM_CORE_ENGINEERING_STANDARDS_V1

## Goal

Provide a pure **in-process** catalog of feature **flags** owned by
registered platforms. Flags must match the owner platform manifest
`flags[]` declaration.

## What flag registration means

- Records an inspectable catalog row for a declared platform flag
- Captures default state, linked capabilities, elevated/danger metadata
- Optionally cross-checks linked capabilities against the P5 registry

## What it does NOT mean

- Does **not** evaluate flags at runtime
- Does **not** apply overrides, cohorts, or rollout percentages
- Does **not** execute kill-switches or authorize capability use
- Does **not** create an event bus or deliver events

**FLAG REGISTRATION IS NOT FLAG EVALUATION.**

## Engine

- `createInMemoryFlagRegistry({ platforms, capabilities? })`
- `register` / `get` / `has` / `size` / `clear`
- `list` / `listByPlatform` / `listByLinkedCapability` / `listByDangerElevated`
- `UmFlagEvaluator` remains interface-only (not implemented)

## Admission rules

1. Owner platform exists in P4 registry
2. Flag id is declared on that platform’s manifest `flags[]`
3. Catalog fields match manifest (defaultState, dangerElevated, linkedCapabilityIds)
4. Flag id is unique and namespaced under the owner platform
5. Linked capabilities exist on the owner manifest
6. If P5 `capabilities` is provided: linked caps exist and ownership matches
7. Elevated/danger flags default off and require `auditRequired=true`
8. Catalog rows always set `killSwitch: true` (metadata only)

Failed registration never mutates registry state.
`registeredAt` is pass-through only (no clock).

## Non-goals

- Flag evaluation / overrides / cohorts / kill-switch execution
- Event bus / publish / consume / outbox / transport
- Persistence / networking / product integration / migrations
- Dependency engine / health runtime / SDK runtime

## Proposed commit subject

`feat(core): add UM Core feature flag registry foundation P8`
