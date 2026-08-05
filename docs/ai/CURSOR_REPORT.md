# CURSOR_REPORT — Instructor Lesson Point-Cost Controls V1

## Summary

**PASS** — Instructors can enable/update/disable lesson UM Points unlock costs via
existing `set_learning_lesson_point_cost`. Unlock adapter now fail-closes unless
`success === true` and `unlocked === true`. No migration; no platform ledger work.

## Exact files changed

- `lib/learning/lessonUnlockFoundation.ts`
- `lib/learning/lessonUnlockFoundation.test.ts`
- `app/learning/instructor/actions.ts`
- `app/learning/instructor/courses/[courseId]/lessons/[lessonId]/page.tsx`
- `app/learning/firstCourseActions.ts`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

None.

## RPCs used

- `set_learning_lesson_point_cost`
- `get_my_learning_lesson_unlock_state` (unchanged load path)
- `unlock_my_learning_lesson_with_um_points` (adapter contract only)
- Direct SELECT `learning_lesson_point_costs` for instructor saved-state display (RLS)

## Behavior

- Instructor UI: current cost / free / disabled; enable+update form; disable paid unlock
- Disable = `enabled=false` with retained `unlock_cost > 0` (RPC contract)
- Unlock adapter: PostgREST error / null / malformed / `success !== true` /
  `unlocked !== true` → `ok: false`
- Learner action: only redirects `?unlocked=1` on adapter ok; else `?error=` sanitized

## Security review

- No service-role; JWT + existing SECURITY DEFINER RPCs
- No client-side authorization duplicate
- Sanitized errors; no ledger / Commerce / Guardian / Tutor changes
- No secrets

## Tests

`npx vitest run lib/learning/lessonUnlockFoundation.test.ts` — **24 passed** / 0 failed

## TypeScript

`npx tsc --noEmit` — PASS

## Build

Not run (policy).

## git diff --check

PASS

## git status --short

Local uncommitted changes (stop before commit).

## Open issues

- Platform Single Ledger still deferred
- Remote Learning schema apply remains ops GO
