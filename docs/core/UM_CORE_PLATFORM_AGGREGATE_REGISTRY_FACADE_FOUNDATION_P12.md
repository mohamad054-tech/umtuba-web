# UM Core — Aggregate Registry Facade Foundation P12

**Status:** Closed (Model A composition facade only)  
**Branch:** `office/um-core-platform-aggregate-registry-facade-foundation-p12`  
**Base:** `office/um-core-platform-naming-registry-foundation-p11` @ `0516eceff8e62c5af6b1a446889f4282d21cef3b`  
**Normative base:** UM_CORE_SPECIFICATION_V1 · UM_CORE_ENGINEERING_STANDARDS_V1  
**Canonical identity:** `um.core.aggregate_registry_facade_foundation_p12`

## Goal

Provide a pure **in-process** **Model A** facade that groups already-created
specialized Core registries under one `UmCoreRegistry`.

## What aggregate composition means

- Accepts caller-owned registry instances via `UmCoreRegistryDeps`
- Exposes seven readonly slots with **exact object identity** of the deps
- Freezes the facade object (not the specialized registries)
- Order-agnostic at facade construction time

## What it does NOT mean

- Does **not** construct specialized registries (no mega-wire factory)
- Does **not** own startup/lifecycle or mutate catalogs
- Does **not** auto-rebuild naming, watch, poll, or subscribe
- Does **not** implement validators, SDK, or runtime ports

**AGGREGATE REGISTRY COMPOSITION IS NOT RUNTIME ORCHESTRATION.**

## Selected model

**Model A only** — pure composition facade over already-created registries.  
Model B / Model C (constructing or mega-wiring registries) are rejected.

## Exact seven slots

| Slot | Source |
| --- | --- |
| `platforms` | P4 |
| `capabilities` | P5 |
| `events` | P6 event type registry |
| `flags` | P8 |
| `health` | P10 |
| `dependencies` | P9 |
| `naming` | P11 |

### Explicitly excluded

- Event routing (P7) — remains outside `UmCoreRegistry`
- Validators / compliance / SDK / runtime ports / persistence / product registries

## Ownership / lifecycle

- **Caller owns** create, register, clear, naming `rebuild()`, and specialized lifecycle
- Facade **borrows** references; does not deep-copy or re-own
- Mutable `UmInMemory*` APIs remain on caller-held typed instances
- Facade slots stay typed as the existing read registry interfaces

## Recommended caller recipe (documentation only)

1. create platforms  
2. create capabilities  
3. create events  
4. create flags  
5. create dependencies  
6. create health  
7. populate source registries as needed  
8. create naming after desired snapshot, or call caller-owned `naming.rebuild()`  
9. `createUmCoreRegistry(deps)`

The facade does **not** encode this sequence.

## Naming semantics

P11 naming remains a construction-time snapshot with caller-owned `rebuild()`.
The facade holds the same naming instance; it never auto-refreshes.

## Deferred

- `UmCoreValidator.validateDependencies(platformId)`
- `UmDependencyValidator`
- SDK client/factory and all runtime ports (`UmFlagEvaluator`,
  `UmEventPublisher`, `UmHealthReporter`, `UmCapabilityAsserter`, …)

## API

```ts
createUmCoreRegistry(deps: UmCoreRegistryDeps): UmCoreRegistry
```

## Non-goals

- DI container / service locator / startup orchestrator
- Specialized mega-factory
- Event bus / flag evaluation / health monitoring / capability authorization
- Dependency resolution / SDK runtime / validator completion
- Persistence / networking / product integration / migrations

## Proposed commit subject

`feat(core): add UM Core aggregate registry facade foundation P12`
