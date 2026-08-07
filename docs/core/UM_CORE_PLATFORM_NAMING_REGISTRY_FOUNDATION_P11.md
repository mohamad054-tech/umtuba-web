# UM Core — Naming Registry Foundation P11

**Status:** Closed (deterministic derived naming index only)  
**Branch:** `office/um-core-platform-naming-registry-foundation-p11`  
**Base:** `office/um-core-platform-health-declaration-catalog-foundation-p10` @ `951fc552a344acdb3cd94cfd0aacc426affbf5c5`  
**Normative base:** UM_CORE_SPECIFICATION_V1 · UM_CORE_ENGINEERING_STANDARDS_V1

## Goal

Provide a pure **in-process**, **read-only** cross-kind naming **index** over
identities already admitted by specialized Core registries.

## What naming indexing means

- Deterministic lookup of named artifacts by `(kind, id)`
- Indexes platforms/modules from P4; capabilities from P5 (or P4 fallback);
  event types from P6; flags from P8
- Optional `rebuild()` refreshes the snapshot from current deps

## What it does NOT mean

- Does **not** author, reserve, or invent names
- Does **not** replace `validation/naming.ts` policy helpers
- Does **not** replace specialized registry SoT
- Does **not** discover, route, resolve packages, or network

**NAMING INDEXING IS NOT NAME AUTHORING.**

## Registry

- `createInMemoryNamingRegistry({ platforms, capabilities?, eventTypes?, flags? })`
- `get` / `has` / `size` / `list` / `listByKind` / `listByPlatform`
- `rebuild()` on the in-memory extension (snapshot refresh only)

## Supported kinds

| Kind | Source |
| --- | --- |
| `platform` | P4 |
| `module` | P4 modules |
| `capability` | P5 preferred; else P4 embedded capability catalog |
| `event_type` | P6 (empty if omitted) |
| `flag` | P8 (empty if omitted) |

Deferred (empty): `job`, `contract`, `extension`, `service`, `runtime`.

Out of scope kinds: dependency edges, event routes, health declarations.

## Contract evolution

`UmNamedArtifact.stability` is **optional**. Stability is mapped only when the
source catalog provides it (capabilities, event types). Platforms, modules,
and flags leave `stability` absent — no fabricated defaults.

`displayName` is mapped only when the source provides a display name field.
Event/flag `description` is not treated as `displayName`.

## Snapshot semantics

The index is built at construction from current deps. Source mutations after
construction are invisible until `rebuild()`. No watchers/polling/subscriptions.

## Relationship

- Specialized registries = identity SoT
- `validation/naming.ts` + P2 = naming policy SoT
- P11 = derived cross-kind lookup/index only

## Non-goals

- Independent name registration / writable naming SoT
- DNS / discovery / routing / package resolution
- SDK / `UmCoreRegistry` facade / validator aggregate completion
- Persistence / networking / product integration / migrations

## Proposed commit subject

`feat(core): add UM Core naming registry foundation P11`
