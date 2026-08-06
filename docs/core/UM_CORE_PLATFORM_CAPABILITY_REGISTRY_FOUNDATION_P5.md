# UM Core — Capability Registry Foundation P5

**Status:** Implemented (in-memory catalog only)  
**Branch:** `office/um-core-platform-capability-registry-foundation-p5`  
**Base:** `office/um-core-platform-registry-foundation-p4` @ `5215e15`  
**Normative base:** UM_CORE_SPECIFICATION_V1 · UM_CORE_ENGINEERING_STANDARDS_V1

## Goal

Provide the lawful **in-process** catalog of capabilities owned by
registered platforms. Catalog only — no execution.

## Engine

- `createInMemoryCapabilityRegistry({ platforms })`
- `register` / `get` / `has` / `size` / `clear`
- `list` / `listByPlatform` / `listByModule` /
  `listBySideEffectClass` / `listByStability`

## Admission rules

A capability may register only when all hold:

1. Owning platform is present in the P4 platform registry
2. Module exists on that registered platform
3. Module declares the capability id
4. Capability id is unique
5. Capability id is scoped under the platform namespace
6. Version / stability / auth class / side-effects are valid
7. Owning platform has ownership declarations

## Stored record

- Capability identity (id, platform, module, display name)
- Version, stability, auth class, side-effect classes
- Optional flag reference, documentation, metadata
- Owning platform compliance status (snapshot)
- Optional pass-through `registeredAt`

## Non-goals

- Capability invocation / AI / event routing
- Feature-flag evaluation / health runtime / SDK runtime
- Persistence / networking / product integration
- Database / migrations

## Proposed commit subject

`feat(core): add UM Core capability registry foundation P5`
