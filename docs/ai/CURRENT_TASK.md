# Current Task

## Task title

UM Learning — Instructor Lesson Point-Cost Controls V1

## Status

`verification-pass` — implementation complete locally; **not committed** (stop before commit).

## Milestone id

`learning.instructor.lesson_point_cost_controls_v1`

## Branch

`office/learning-ai-tutor-learner-ui-integration-v1`

## Base

`064e26a6480fb5efa921647975a04dd31b37f8ff`

## Worktree

`C:\Users\Admin\Desktop\umtuba\umtuba-web-learning-ai-tutor-learner-ui-integration-v1`

## Delivered

- Instructor UM Points unlock controls on lesson authoring page
- Server action `setLessonPointCostAction` (enable / update / disable)
- Foundation: typed set-cost + fail-closed unlock RPC parser (`success === true` && `unlocked === true`)
- Learner unlock action no longer treats soft `{success:false}` as success
- Existing RPCs only; no migration; no platform ledger

## Verification (local)

- `npx vitest run lib/learning/lessonUnlockFoundation.test.ts` — **24 passed**
- `npx tsc --noEmit` — PASS
- `git diff --check` — PASS

## Explicitly deferred

- Platform Single Ledger
- Commerce / Guardian / Collaboration / AI Tutor
- Remote migration apply

## Next

Await commit/push GO.
