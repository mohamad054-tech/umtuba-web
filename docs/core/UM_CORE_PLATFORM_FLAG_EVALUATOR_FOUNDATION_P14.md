# UM Core — Flag Evaluator Foundation P14

**Status:** Closed (catalog-backed default-state evaluation only)  
**Branch:** `office/um-core-platform-flag-evaluator-foundation-p14`  
**Base:** `office/um-core-platform-validator-composition-foundation-p13` @ `a16d2ccf9d16d67ef5ed8e5005f030ad60773442`  
**Normative base:** UM_CORE_SPECIFICATION_V1 · UM_CORE_ENGINEERING_STANDARDS_V1  
**Canonical identity:** `um.core.flag_evaluator_foundation_p14`

## Context

**UM Core Control-Plane Foundation is complete as of P13.**  
P14 begins the **runtime-port** layer with the first evaluator.

## Goal

Provide a pure **deterministic**, **in-process** `UmFlagEvaluator` that reads the
P8 flag catalog and returns fail-closed evaluation results.

## Architectural rules

**FLAG EVALUATION IS NOT FLAG REGISTRATION.**  
**FLAG EVALUATION IS NOT CAPABILITY AUTHORIZATION.**

P8 remains the flag catalog Source of Truth. P14 never mutates it.

## API

```ts
createInMemoryFlagEvaluator({ flags: UmFlagRegistry }): UmFlagEvaluator
```

- `evaluate(request)`
- `evaluateBatch(requests)` — preserves input order and cardinality

## Evaluation policy (P14)

| Case | `enabled` | `source` |
| --- | --- | --- |
| Unknown flag id | `false` | `"unknown"` |
| Catalog `defaultState: "on"` | `true` | `"default"` |
| Catalog `defaultState: "off"` | `false` | `"default"` |

- Evaluation context is accepted but **ignored** (no cohort/env sensitivity)
- Known elevated/danger flags use catalog default only
- `killSwitch: true` remains **metadata only** — no `"kill_switch"` source
- `"override"` source is never produced

## Deferred

- Overrides / cohorts / percentages / remote config
- Kill-switch execution
- `UmCapabilityAsserter` (P15 expected)
- SDK client/factory
- `UmDependencyValidator`
- Event publisher / health reporter

## Non-goals

- Networking / persistence / migrations / product wiring
- Capability authorization inside the evaluator
- Mutating or repairing the flag catalog

## Proposed commit subject

`feat(core): add UM Core flag evaluator foundation P14`
