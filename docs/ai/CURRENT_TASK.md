# Current Task

## Task title

UM Core Aggregate Registry Facade Foundation P12

## Status

`closed` — committed and pushed on milestone branch.

## Branch

`office/um-core-platform-aggregate-registry-facade-foundation-p12`

## Base HEAD

`0516eceff8e62c5af6b1a446889f4282d21cef3b` (Naming Registry Foundation P11 close)

## Worktree

`C:\Users\Admin\Desktop\umtuba\umtuba-web-um-core-platform-aggregate-registry-facade-foundation-p12`

## Milestone

`um.core.aggregate_registry_facade_foundation_p12`

## Allowed scope

- `platforms/core/registry/**`
- `platforms/core/packageIdentity.ts`
- `platforms/core/coreFoundationContracts.test.ts`
- `platforms/core/README.md`
- `docs/core/**`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Model B/C mega-wire factory / DI / startup orchestration
- Event routing slot on `UmCoreRegistry`
- Validator completion / SDK / runtime ports
- Persistence / networking / product integration / migrations
- P13 and later milestones

## Delivered

Model A pure composition facade `createUmCoreRegistry(deps)` exposing the
existing seven `UmCoreRegistry` slots by borrowed reference. Caller retains
ownership. No runtime orchestration, SDK, or validator completion.
Committed and pushed on `office/um-core-platform-aggregate-registry-facade-foundation-p12`.
Do not start P13 from this handoff.
