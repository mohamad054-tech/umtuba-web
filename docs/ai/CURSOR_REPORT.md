# CURSOR_REPORT — Instructor Course Enrollment Management V1

## Summary

**PASS** — Instructors can create course enrollments by learner user id and run
activate / suspend / reinstate / cancel from the learners page. Existing progress
read model preserved. Existing RPCs only; no migration.

## Exact files changed

- `lib/learning/enrollmentsFoundation.ts`
- `lib/learning/enrollmentsFoundation.test.ts`
- `app/learning/instructor/enrollmentActions.ts` (new)
- `app/learning/instructor/courses/[courseId]/learners/page.tsx`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

None.

## RPCs wired

- `create_learning_enrollment`
- `activate_learning_enrollment`
- `suspend_learning_enrollment`
- `reinstate_learning_enrollment`
- `cancel_learning_enrollment`
- RLS SELECT on `learning_enrollments` for lifecycle enrollment ids

## Security review

- Fail-closed UUID/source/status validation
- Manager sources only (no self_enrollment masquerade)
- Sanitized errors; JWT client; SQL auth/lifecycle authority
- No Commerce / Guardian / Tutor / ledger changes

## Tests

`npx vitest run lib/learning/enrollmentsFoundation.test.ts` — **50 passed**

## TypeScript

`npx tsc --noEmit` — PASS

## Build

Not run (policy).

## git diff --check

PASS

## git status --short

Local uncommitted changes (stop before commit).

## Open issues

- Program-target manager enroll UI not in this milestone
- Contact search / invitations deferred
- Remote schema apply remains ops GO
