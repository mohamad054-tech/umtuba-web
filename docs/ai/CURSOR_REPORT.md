# CURSOR_REPORT

## Summary

Implemented **Instructor Authoring Foundation V1 — Phase 4A** (Program
authoring under active Space) on `office/learning-progress-mutations-v1`.
No migrations. No Course/Section/Lesson/Activity UI.

## Exact files changed

- `lib/learning/instructorAuthoring.ts`
- `lib/learning/instructorAuthoring.test.ts`
- `app/learning/instructor/actions.ts`
- `app/learning/instructor/spaces/[spaceId]/page.tsx`
- `app/learning/instructor/spaces/[spaceId]/programs/new/page.tsx` (new)
- `app/learning/instructor/programs/[programId]/page.tsx` (new)
- `app/components/learning/instructor/InstructorProgramList.tsx` (new)
- `app/components/learning/instructor/CreateProgramForm.tsx` (new)
- `app/components/learning/instructor/ProgramLifecycleActions.tsx` (new)
- `app/components/learning/instructor/ProgramStatusChip.tsx` (new)
- `docs/learning/implementation/INSTRUCTOR_AUTHORING_FOUNDATION_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

None

## Security review

- JWT client only; existing `LEARNING_PROGRAM_RPCS`
- Parent gate: space must be `active` before program create
- RLS list/get for programs; RPC errors surfaced to UI

## Tests

`npx vitest run lib/learning/instructorAuthoring.test.ts` — **12 passed**

## TypeScript

Instructor files clean. Pre-existing unrelated `.next/types` games page error.

## Build

Not run

## git diff --check

Pass (after trailing-whitespace fix)

## git status --short

See post-commit

## Open issues

- Phase 4B+: Course → Section → Lesson → Activity
