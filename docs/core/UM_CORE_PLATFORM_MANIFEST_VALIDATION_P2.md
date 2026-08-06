# UM Core — Manifest Validation Foundation P2

**Status:** Implemented (pure validation)  
**Branch:** `office/um-core-platform-foundation-p1`  
**Normative base:** UM_CORE_SPECIFICATION_V1 · UM_CORE_ENGINEERING_STANDARDS_V1

## Goal

Validate platform manifests before they can become legal Core citizens.

P2 **validates**. It does **not** register, persist, discover, or execute.

## Engine

- `validatePlatformManifest` / `createManifestValidator`
- `validateManifestAdmission` / `createRegistrationValidator`

## Covered rules

- Platform / module / capability / event / flag identity + naming
- Ownership + SoT / non-ownership statements
- Manifest completeness (version, docs, health, maturity)
- Duplicate IDs
- Manifest consistency (module↔capability, flags, nav)
- Side-effect declarations + summary consistency
- Elevated side-effects require `flagId`
- Dependency declarations + single-manifest self-cycle detection
- Admission requires valid manifest and maturity ≥ 1

## Non-goals

- Registry / runtime / event bus / flag engine / health engine / SDK behavior
- Cross-platform dependency graph persistence
- Product-platform integration
- Database / migrations

## Diagnostics

Findings are deterministic:

1. severity (`error` → `warning` → `info`)
2. `code`
3. `path`

Each finding includes human-readable `message` and optional `standardRef`.
