# Current Task

## Task title

Collaboration Platform Workspace Spine Foundation V1

## Status

`pass-local` — implementation complete; **no commit / no push**

## Milestone id

`learning.collaboration.workspace_spine_foundation_v1`

## Branch

`office/learning-collaboration-workspace-spine-foundation-v1`

## Base

`origin/office/learning-ai-tutor-learner-ui-integration-v1` @ `c3168eff3a324979efa5cab694e294c4daeeb4da`

## Worktree

`C:\Users\1\Desktop\umtuba\umtuba-web-learning-collaboration-workspace-spine-foundation-v1`

## Desktop role

Desktop is the active Learning workstation. Commerce is closed on this machine.

## Allowed scope

- Derive-first workspace identity `(spaceId, courseId)`
- Course entitlement access + parent Space context
- Route `/learning/courses/[courseId]/workspace`
- Shell + attachment slots (empty/unavailable only)
- Docs + focused tests
- No migration (derive-first)

## Forbidden scope

- Commerce / Stripe / payouts / refunds
- Realtime chat / presence / shared files
- Assignment bucket reuse / AI shared memory
- Second membership system
- Commit / push / remote migration apply

## Done

- Spine contract + load fail-closed path
- Workspace route + shell + nav
- Attachment slots explicit empty/unavailable
- SSOT doc + handoffs updated for this tip

## Next (human)

1. Review local diff; commit/push only with explicit GO
2. Later: attach real payloads behind the same slot ids (separate milestone)
