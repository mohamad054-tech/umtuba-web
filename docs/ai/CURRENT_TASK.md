# Current Task

## Task title

UM Core Capability Asserter Foundation P15

## Status

`closed` — committed and pushed on milestone branch.

## Branch

`office/um-core-platform-capability-asserter-foundation-p15`

## Base HEAD

`7fd4f8e56a533f49e152901a2705b2c41fbe5a0f` (Flag Evaluator Foundation P14 close)

## Worktree

`C:\Users\Admin\Desktop\umtuba\umtuba-web-um-core-platform-capability-asserter-foundation-p15`

## Milestone

`um.core.capability_asserter_foundation_p15`

## Allowed scope

- `platforms/core/capability/**`
- `platforms/core/packageIdentity.ts`
- `platforms/core/coreFoundationContracts.test.ts`
- `platforms/core/README.md`
- `docs/core/**`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- User/RBAC/permissions authorization
- SDK / Event Publisher / Health Reporter / Dependency Validator
- P14 evaluator behavior changes / P8 registry changes
- Persistence / networking / migrations / product wiring
- P16 and later milestones

## Delivered

Pure deterministic `createInMemoryCapabilityAsserter` composing P5 + P14 with
fail-closed unknown/unresolved cases and catalog-enabled ungated capabilities.
Committed and pushed on `office/um-core-platform-capability-asserter-foundation-p15`.
Do not start P16 from this handoff.
