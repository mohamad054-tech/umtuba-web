# UM Core — Platform Registry Foundation P4

**Status:** Implemented (in-memory catalog only)  
**Branch:** `office/um-core-platform-registry-foundation-p4`  
**Base:** `office/um-core-platform-compliance-engine-p3` @ `cfc0d26`  
**Normative base:** UM_CORE_SPECIFICATION_V1 · UM_CORE_ENGINEERING_STANDARDS_V1

## Goal

Provide the first lawful **in-process** Platform Registry — a memory-only
catalog of compliant platforms. Nothing more.

## Engine

- `createInMemoryPlatformRegistry`
- `register` / `get` / `list` / `has` / `size` / `clear`

## Admission rules

A platform may register only when all hold:

1. Platform id is not already present
2. P2 manifest validation passes
3. Ownership declarations are present (owners, SoT, non-ownership)
4. Maturity ≥ 1
5. P3 compliance status is `compliant`
6. Core Certified eligibility is true

If validation/compliance inputs are omitted, P2/P3 engines run in-process.

## Stored record

- Platform identity + version + maturity + compliance status
- Full manifest
- Validation result
- Compliance result
- Module catalog
- Capability catalog
- Registration metadata (pass-through timestamps only)

## Non-goals

- Persistence / database / migrations
- Networking / discovery services / plugin loading
- Runtime execution / capability invocation
- Feature-flag evaluation / health checks
- Product-platform integration
- Full `UmCoreRegistry` aggregate implementation (capabilities/events/flags/…)

## Diagnostics

Registration findings are deterministic: severity → code → path.

## Proposed commit subject

`feat(core): add UM Core platform registry foundation P4`
