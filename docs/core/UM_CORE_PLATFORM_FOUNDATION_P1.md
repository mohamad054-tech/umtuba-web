# UM Core Platform — Foundation P1

**Status:** Contracts-only skeleton  
**Branch:** `office/um-core-platform-foundation-p1`  
**Normative base:** UM_CORE_SPECIFICATION_V1 · UM_CORE_ENGINEERING_STANDARDS_V1

## Goal

Create the first isolated Core package structure: namespaces, manifest model, and interfaces for registries, capabilities, events, flags, health, dependencies, validation, and SDK — with **no** runtime behavior and **no** product-platform integration.

## Isolation

`platforms/core` does not import or modify:

- Commerce / Store
- Learning
- AI / Private AI
- UEOS
- Ads
- Collaboration
- any other product platform

## Package tree

See `platforms/core/README.md` and the repository tree under `platforms/core/`.

## Layout note (P1.1)

Core lives under `platforms/core/**` (independent platform root), not under `lib/`.

## Non-goals (enforced)

- No database schema
- No migrations
- No registry/event/flag/health/SDK implementations
- No plugins / workflows
- No executable business logic

## Next phases (not this deliverable)

P2+ may add validation helpers, in-memory fakes for tests, and later runtimes — still without absorbing product SoT.
