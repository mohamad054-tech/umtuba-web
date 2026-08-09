# UM Core — Dependency Validator Foundation P19

**Status:** Closed (pure in-memory requirement validation only)  
**Branch:** `office/um-core-platform-dependency-validator-foundation-p19`  
**Base:** `origin/alpha-0.2` @ `ffce2c084c99546c07c3a1067c07c3cd107aac2c`  
**Normative base:** UM_CORE_SPECIFICATION_V1 · UM_CORE_ENGINEERING_STANDARDS_V1  
**Canonical identity:** `um.core.dependency_validator_foundation_p19`  
**TASK_ID:** `UM_CORE_PLATFORM_DEPENDENCY_VALIDATOR_FOUNDATION_P19`

## Goal

Fill the P18→P20 phase hole with a pure **deterministic**, **in-process**
`UmDependencyValidator` that reviews a candidate `requires[]` for referential
integrity and required-platform cycle SoT policy.

## Architectural rules

**DEPENDENCY VALIDATION IS NOT DEPENDENCY RESOLUTION.**  
**DEPENDENCY VALIDATION IS NOT P13 COMPLETENESS/DRIFT REVIEW.**  
**DEPENDENCY VALIDATION IS NOT CATALOG REFERENTIAL INTEGRITY.**

## Responsibility split

| Layer | Role |
| --- | --- |
| **P2** | Single-manifest structural validation of `requires[]` |
| **P9** | Edge catalog admission + required platform cycle rejection on write |
| **P13** | Post-admission completeness / stale / drift vs current catalog |
| **RI** | Cross-catalog missing-reference review (`referential.*`) |
| **P19** | Candidate `requires[]` review (structure + targets + cycle SoT) |

## API

```ts
createInMemoryDependencyValidator({
  platforms: UmPlatformRegistry,
  capabilities?: UmCapabilityRegistry,
  dependencies?: UmDependencyRegistry,
}): UmDependencyValidator

validateRequirements(
  platformId,
  requirements,
): UmDependencyValidationResult

// Free-function form (same semantics):
validateDependencyRequirements(platformId, requirements, deps)
```

Result-returning only — **does not throw**. No network, resolver, DI container,
version solver, Dependency Graph, or Configuration Validation.

## Validation policy

| Case | `ok` | finding code |
| --- | --- | --- |
| Unknown owner platform in P4 | `false` | `dependency.validator.unknown_platform` |
| Invalid `targetKind` | `false` | `dependency.validator.target_kind_invalid` |
| Missing `targetId` | `false` | `dependency.validator.target_id_required` |
| Invalid `targetId` machine id | `false` | `dependency.validator.target_id_naming` |
| Invalid `strength` | `false` | `dependency.validator.strength_invalid` |
| Missing/blank `reason` | `false` | `dependency.validator.reason_required` |
| Duplicate `targetKind:targetId:strength` | `false` | `dependency.validator.duplicate_requirement` |
| Unknown platform target | `false` | `dependency.validator.unknown_platform_target` |
| Unknown capability target | `false` | `dependency.validator.unknown_capability_target` |
| Required platform cycle (SoT) | `false` | `dependency.validator.required_platform_cycle` |
| Valid requirements | `true` | (empty findings) |

Additional rules:

- `peer_kernel` is opaque — never resolved against P4
- `minCompatibility` is never evaluated
- Optional platform edges do not participate in required-cycle detection
- When `dependencies` is provided, cycle checks use catalog edges with this
  owner's required-platform edges replaced by the candidate set (re-validation
  safe)
- When P5 is omitted, in-platform capability targets fall back to P4 embedded
  capability declarations (same pattern as P9/P13)
- `ok === (findings.length === 0)`; findings sorted by code, then targetId,
  then relatedCapabilityId

## Code namespace boundary

| Surface | Namespace |
| --- | --- |
| P13 completeness/drift | `dependency.validation.*` |
| Catalog RI | `referential.*` |
| P9 registry admission | `dependency.registry.*` |
| **P19 requirement validator** | **`dependency.validator.*`** |

## Unused by default (P14–P17 / SDK)

P19 is optional and **not** auto-wired into:

- P14 flag evaluator
- P15 capability asserter
- P16 event publisher
- P17 health reporter
- P21 SDK factory deps / client facade

Callers may compose it explicitly; ports above remain unchanged.

## Deferred / non-goals

- Dependency injection frameworks
- Runtime dependency resolver / installer
- Version / compatibility solver
- Dependency Graph foundation
- Configuration Validation foundation
- Networking / persistence / migrations / product wiring
- Mutating P4/P5/P9 catalogs
- Rewriting P13 or RI

## Proposed commit subject

`feat(core): add UM Core dependency validator foundation P19`
