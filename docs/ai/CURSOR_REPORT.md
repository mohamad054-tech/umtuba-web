# CURSOR_REPORT — Instructor Program & Course Publish Controls V1

## Summary

**PASS** — Completed, committed, and pushed **`learning.instructor.program_course_publish_controls_v1`** on
`office/learning-ai-tutor-learner-ui-integration-v1` from SoT tip `c3168ef`.

- Reused existing program/course publish and archive RPCs (no migration / no new SQL).
- Instructor Program page and Course authoring page expose lifecycle controls.
- Fail-closed allowlisted authoring ops; sanitized errors; refresh after success.
- Invalid UI transitions disabled (publish only from draft; archive not for archived/suspended).

## Exact files changed

- `lib/learning/instructorAuthoring.ts`
- `lib/learning/instructorAuthoring.test.ts`
- `app/learning/instructor/actions.ts`
- `app/components/learning/instructor/InstructorActionForm.tsx`
- `app/learning/instructor/courses/[courseId]/page.tsx`
- `app/learning/instructor/programs/[programId]/page.tsx` (new)
- `app/learning/instructor/programs/[programId]/courses/new/page.tsx`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

None.

## Behavior implemented

- Ops `publish_program` / `archive_program` → `publish_learning_program` / `archive_learning_program`
- Ops `publish_course` / `archive_course` → `publish_learning_course` / `archive_learning_course`
- Auth remains DB-authoritative via SECURITY DEFINER RPCs
- UI shows Draft / Published / Archived
- Server actions revalidate program/course/hub paths

## Security review

- No service-role client; JWT user client only
- Input allowlists + UUID validation fail closed
- Status cannot be set by clients (forbidden field)
- RPC remains final authorization authority
- Error sanitization strips schema/permission internals for UI
- No secrets in diff

## Tests

`npx vitest run lib/learning/instructorAuthoring.test.ts` — **35 passed** / 0 failed

## TypeScript

`npx tsc --noEmit` — PASS (exit 0)

## Build

Not run (policy).

## git diff --check

PASS (exit 0)

## git status --short

Clean after commit + push (synced `0 0` with upstream).

## Open issues

- Remote Learning schema apply remains a separate ops concern (unchanged)
- Parent program must be draft|published for course publish (SQL); UI links to program page
