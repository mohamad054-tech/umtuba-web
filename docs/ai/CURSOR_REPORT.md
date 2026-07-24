# Cursor Report

## Summary

Phase 4E (Activity authoring under Lesson) implemented on
`office/learning-progress-mutations-v1`. Typed wrappers for list/get/create/
update/settings/publish/archive, activity server actions, lesson activity list +
create/detail UI with completion_mode display and settings editing. Parent gates
match SQL. No migrations, no content-block/question/grading/attempts UI.
JWT + RLS only.

## Exact files changed

- `lib/learning/instructorAuthoring.ts` — activity wrappers + settings
- `lib/learning/instructorAuthoring.test.ts` — Phase 4E tests
- `app/learning/instructor/actions.ts` — activity create/update/settings/publish/archive
- `app/learning/instructor/lessons/[lessonId]/page.tsx` — activity list
- `app/learning/instructor/lessons/[lessonId]/activities/new/page.tsx` — create
- `app/learning/instructor/activities/[activityId]/page.tsx` — detail + edit
- `app/components/learning/instructor/InstructorActivityList.tsx` (new)
- `app/components/learning/instructor/CreateActivityForm.tsx` (new)
- `app/components/learning/instructor/UpdateActivityForm.tsx` (new)
- `app/components/learning/instructor/ActivityLifecycleActions.tsx` (new)
- `app/components/learning/instructor/ActivityStatusChip.tsx` (new)
- `docs/learning/implementation/INSTRUCTOR_AUTHORING_FOUNDATION_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

None.

## Security review

- User JWT client only; no service role.
- Mutations via existing `LEARNING_ACTIVITY_RPCS` only.
- Reads via RLS `from("learning_activities")` (+ settings embed).
- Parent gates: lesson/section/course/program draft|published, space active.
- RPC errors passed through to UI query params.

## Tests

`npx vitest run lib/learning/instructorAuthoring.test.ts` — **41 passed**.

Coverage: routes/files, RPC contracts, create/update/publish success,
completion_mode + config validation, parent-gate failures, RPC error passthrough.

## TypeScript

`npx tsc --noEmit` — fails only on pre-existing unrelated
`.next/types/validator.ts` missing `app/games/page.js`.

## Build

Not required for this slice (same bar as Phase 4D).

## git diff --check

PASS (exit 0).

## git status --short

Clean on `office/learning-progress-mutations-v1` (in sync with origin after push).

## Commit / push

- Commit: `bc4c4b9289eab0de1187d66d779114b5f1cbed16`
  (`feat(learning): add instructor activity authoring`)
- Push: `b0d420b..bc4c4b9` → `origin/office/learning-progress-mutations-v1`
- Merge: none

## Open issues

- Content-block / question / grading / attempts UI deferred.
- Pre-existing `tsc` noise from `.next/types/validator.ts` / missing games page.
