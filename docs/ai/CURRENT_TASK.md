# Current Task

## Task title

UM Learning — Lesson Unlock Fail-Closed Hardening V1

## Status

`verification-pass` — implementation complete locally; **not committed** (stop before commit).

## Milestone id

`learning.lesson_unlock.fail_closed_hardening_v1`

## Branch

`office/learning-ai-tutor-learner-ui-integration-v1`

## Base

`d71745925e1bbeae79dde402186ae89ebf6986e3` (`feat(learning): add instructor program and course publish controls v1`)

## Worktree

`C:\Users\Admin\Desktop\umtuba\umtuba-web-learning-ai-tutor-learner-ui-integration-v1`

## Delivered

- `resolveLessonContentAccess` fail-closed gate on `get_my_learning_lesson_engine` result
- Typed states: `verified_unlocked` / `locked` / `engine_unavailable` / `access_unverified`
- `LessonViewer` renders protected blocks/activities only when access is positively verified
- Lesson page strips delivery SELECT blocks/activities before RSC props
- Free + instructor/manage paths remain accessible when engine proves `unlock_required === false`
- No migration

## Verification (local)

- `npx vitest run lib/learning/lessonContentAccess.test.ts lib/learning/lessonEngineFoundation.test.ts lib/learning/learnerDelivery.test.ts` — **68 passed**
- `npx tsc --noEmit` — PASS
- `git diff --check` — PASS
- Build: not required (policy)

## Machine policy

Laptop only. Do not touch Commerce / Collaboration / Guardian / AI Tutor. No remote migration apply. No commit / no push until asked.

## Next

Await commit/push GO.
