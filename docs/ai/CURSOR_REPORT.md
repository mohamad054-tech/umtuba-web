# CURSOR_REPORT

## Summary

Implemented **UM Learning Instructor Authoring Foundation V1 — Phase 0–3**
on `office/learning-progress-mutations-v1`. Instructor surface under
`/learning/instructor` with space list, create, publish, and archive via
existing `LEARNING_SPACE_RPCS`. No migrations. No learner route changes.
No service role.

## Exact files changed

- `docs/learning/implementation/INSTRUCTOR_AUTHORING_FOUNDATION_V1.md` (new)
- `lib/learning/instructorAuthoring.ts` (new)
- `lib/learning/instructorAuthoring.test.ts` (new)
- `app/learning/instructor/page.tsx` (new)
- `app/learning/instructor/actions.ts` (new)
- `app/learning/instructor/spaces/new/page.tsx` (new)
- `app/learning/instructor/spaces/[spaceId]/page.tsx` (new)
- `app/components/learning/instructor/InstructorShell.tsx` (new)
- `app/components/learning/instructor/InstructorSpaceList.tsx` (new)
- `app/components/learning/instructor/CreateSpaceForm.tsx` (new)
- `app/components/learning/instructor/SpaceLifecycleActions.tsx` (new)
- `app/components/learning/instructor/SpaceStatusChip.tsx` (new)
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

None

## Security review

- User JWT `createClient` / `getServerUser` only
- Mutations via existing security-definer RPCs
- Reads via RLS (`Members read own spaces`)
- No service role; no TS auth substitute
- Learner `/learning` pages untouched

## Tests

`npx vitest run lib/learning/instructorAuthoring.test.ts` — **8 passed**

## TypeScript

`npx tsc --noEmit` — no errors in instructor files.
Pre-existing unrelated: `.next/types/validator.ts` missing `app/games/page.js`.

## Build

Not run (UI slice; tsc + focused tests)

## git diff --check

Pending at commit time

## git status --short

See post-commit status

## Open issues

- Phase 4+ still open: program → activity curriculum tree UI
- No `update_learning_space` RPC (create-time metadata only)
- Optional instructor link from learner hub / global nav deferred
