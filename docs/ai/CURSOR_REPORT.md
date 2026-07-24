# CURSOR_REPORT

## Summary

Implemented **Instructor Authoring Foundation V1 — Phase 4B** (Course
authoring under Program) on `office/learning-progress-mutations-v1`.
No migrations. No Section/Lesson/Activity UI.

## Exact files changed

- `lib/learning/instructorAuthoring.ts`
- `lib/learning/instructorAuthoring.test.ts`
- `app/learning/instructor/actions.ts`
- `app/learning/instructor/programs/[programId]/page.tsx`
- `app/learning/instructor/programs/[programId]/courses/new/page.tsx` (new)
- `app/learning/instructor/courses/[courseId]/page.tsx` (new)
- `app/components/learning/instructor/InstructorCourseList.tsx` (new)
- `app/components/learning/instructor/CreateCourseForm.tsx` (new)
- `app/components/learning/instructor/CourseLifecycleActions.tsx` (new)
- `app/components/learning/instructor/CourseStatusChip.tsx` (new)
- `docs/learning/implementation/INSTRUCTOR_AUTHORING_FOUNDATION_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

None

## Security review

- JWT + existing `LEARNING_COURSE_RPCS`
- Parent gates: program draft|published; space active
- RLS list/get; RPC errors surfaced

## Tests

`npx vitest run lib/learning/instructorAuthoring.test.ts` — see run output

## TypeScript

Instructor files clean (pre-existing unrelated `.next` games noise may remain)

## Build

Not run

## git diff --check

See run output

## git status --short

See post-commit

## Open issues

- Phase 4C+: Section → Lesson → Activity
