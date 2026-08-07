# UM Core — Validator Composition Foundation P13

**Status:** Closed (Model C composition + completeness/drift review only)  
**Branch:** `office/um-core-platform-validator-composition-foundation-p13`  
**Base:** `office/um-core-platform-aggregate-registry-facade-foundation-p12` @ `6a7c0d60cfe895f5ca374e7524fcb859f6edb001`  
**Normative base:** UM_CORE_SPECIFICATION_V1 · UM_CORE_ENGINEERING_STANDARDS_V1  
**Canonical identity:** `um.core.validator_composition_foundation_p13`

## Goal

Complete `UmCoreValidator` by composing existing P2 validators with a pure
registry-backed dependency **completeness / drift** review over P4 + P9
(+ optional P5).

## Architectural rules

**VALIDATOR COMPOSITION IS NOT DEPENDENCY RESOLUTION.**  
**VALIDATOR COMPOSITION IS NOT A SECOND DEPENDENCY REGISTRY.**

## Responsibility split

| Layer | Owns |
| --- | --- |
| **P2** | Single-manifest structural validation of `requires[]` |
| **P9** | Edge catalog + registration admission + required platform cycle rejection |
| **P13** | Post-admission platform-scoped completeness, stale detection, referential drift; `createUmCoreValidator` |

## Selected model

**Model C** = A (pure `validatePlatformDependencies`) + B (`createUmCoreValidator`).

`UmDependencyValidator.validateRequirements` is **not** implemented (avoids
duplicating P9 admission).

## API

```ts
validatePlatformDependencies(platformId, {
  platforms,
  dependencies,
  capabilities?,
}): UmDependencyValidationResult

createUmCoreValidator({
  platforms,
  dependencies,
  capabilities?,
  manifests?,      // default createManifestValidator()
  registration?,   // default createRegistrationValidator()
}): UmCoreValidator
```

Minimal DI — do **not** require `UmCoreRegistry`.

## `validateDependencies(platformId)` semantics

1. Unknown platform in P4 → finding; `ok: false`
2. Compare CURRENT `manifest.requires[]` to CURRENT P9 edges for that platform
3. **Missing materialization** — requirement without matching catalog edge
4. **Stale catalog entry** — catalog edge without matching current requirement
5. **Referential drift** on matched edges:
   - `platform` target missing from current P4
   - `capability` missing from P5 (or P4 embedded fallback when P5 omitted)
6. `peer_kernel` — completeness/stale only; never resolve against P4
7. `minCompatibility` — never evaluated
8. **No cycle re-detection** — trust P9 admission
9. Read-only; `ok === (findings.length === 0)`; findings sorted by code, then targetId

Matching uses the same declaration fields P9 uses for manifest correspondence
(`targetKind`, `targetId`, `strength`, `reason`, `minCompatibility`).

## Non-goals

- `UmDependencyValidator` / dependency resolver / cycle solver / version solver
- Second dependency registry or dependency writes
- SDK / runtime ports / networking / persistence / migrations / product wiring

## Proposed commit subject

`feat(core): add UM Core validator composition foundation P13`
