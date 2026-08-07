# UM Core — Capability Asserter Foundation P15

**Status:** Closed (availability assertion over P5 + P14 only)  
**Branch:** `office/um-core-platform-capability-asserter-foundation-p15`  
**Base:** `office/um-core-platform-flag-evaluator-foundation-p14` @ `7fd4f8e56a533f49e152901a2705b2c41fbe5a0f`  
**Normative base:** UM_CORE_SPECIFICATION_V1 · UM_CORE_ENGINEERING_STANDARDS_V1  
**Canonical identity:** `um.core.capability_asserter_foundation_p15`

## Goal

Provide a pure **deterministic**, **in-process** `UmCapabilityAsserter` that
reports whether a capability is currently available according to the P5 catalog
and, when linked, the P14 flag evaluator.

## Architectural rules

**CAPABILITY ASSERTION IS NOT USER AUTHORIZATION.**  
**CAPABILITY ASSERTION IS NOT FLAG EVALUATION.**

## Responsibility split

| Layer | Role |
| --- | --- |
| **P5** | Capability catalog SoT |
| **P14** | Flag evaluation SoT |
| **P15** | Capability availability result over P5 + P14 |

## API

```ts
createInMemoryCapabilityAsserter({
  capabilities: UmCapabilityRegistry,
  flags: UmFlagEvaluator,
}): UmCapabilityAsserter

assertEnabled(capabilityId): UmCapabilityAssertionResult
```

Result-returning only — **does not throw**. No batch API.

## Assertion policy

| Case | `enabled` | reason |
| --- | --- | --- |
| Unknown capability | `false` | `capability.assertion.unknown` |
| Known, no `flagId`, non-elevated | `true` | `capability.assertion.catalog_enabled` |
| Known elevated without `flagId` (defensive) | `false` | `capability.assertion.elevated_ungated` |
| Linked flag ON (P14) | `true` | `capability.assertion.flag_enabled` |
| Linked flag OFF (P14) | `false` | `capability.assertion.flag_disabled` |
| Linked flag unresolved (`source: "unknown"`) | `false` | `capability.assertion.flag_unresolved` |

- `authClass` is metadata only — never interpreted as RBAC/session auth
- No asserter-level user/workspace context
- Linked-flag evaluation calls P14 with `{ flagId }` only

## Deferred

- SDK client/factory
- Event publisher / health reporter
- `UmDependencyValidator`
- User authorization / permissions / entitlements

## Non-goals

- Networking / persistence / migrations / product wiring
- Mutating P5/P8
- Duplicating P14 evaluation logic

## Proposed commit subject

`feat(core): add UM Core capability asserter foundation P15`
