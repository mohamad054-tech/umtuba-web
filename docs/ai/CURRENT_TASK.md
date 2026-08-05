# Current Task

## Task title

UM Learning — Instructor Course Enrollment Management V1

## Status

`verification-pass` — implementation complete locally; **not committed** (stop before commit).

## Milestone id

`learning.instructor.course_enrollment_management_v1`

## Branch

`office/learning-ai-tutor-learner-ui-integration-v1`

## Base

`644969b7ca113d12173f5cba39031c2456faaf1f`

## Worktree

`C:\Users\Admin\Desktop\umtuba\umtuba-web-learning-ai-tutor-learner-ui-integration-v1`

## Delivered

- Typed enrollment adapters: create / activate / suspend / reinstate / cancel
- Instructor enroll-by-user-id form on learners page (assignable sources only)
- Lifecycle controls by status; SQL remains authoritative
- Existing progress filters/list preserved
- Duplicate live enrollment → sanitized non-destructive message
- No migration; no complete/moderate in this UI

## Verification (local)

- `npx vitest run lib/learning/enrollmentsFoundation.test.ts` — **50 passed**
- `npx tsc --noEmit` — PASS
- `git diff --check` — PASS

## Next

Await commit/push GO.
