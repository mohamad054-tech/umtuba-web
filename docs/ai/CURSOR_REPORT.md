# CURSOR_REPORT — Learning Instructor Browser E2E Foundation V1

## Summary

Added instructor browser E2E foundation on the existing Playwright Learning
harness. Navigation/auth/fail-closed contracts implemented. Assessment and
assignment happy paths remain env-blocked until an activity fixture ID exists.
No commit/push in this pass.

## Exact files changed

- `app/components/learning/LearningShell.tsx`
- `app/learning/instructor/page.tsx`
- `app/learning/instructor/courses/[courseId]/page.tsx`
- `app/learning/instructor/courses/[courseId]/lessons/[lessonId]/page.tsx`
- `app/learning/instructor/courses/[courseId]/activities/[activityId]/questions/page.tsx`
- `app/learning/instructor/courses/[courseId]/activities/[activityId]/assignment/page.tsx`
- `app/learning/instructor/review/page.tsx`
- `e2e/learning/instructor-authoring-journey.mjs` (new)
- `scripts/learning-e2e/run-instructor-foundation.mjs` (new)
- `scripts/learning-e2e/env.mjs`
- `scripts/learning-e2e/auth.mjs`
- `lib/learning/instructorBrowserE2eFoundation.test.ts` (new)
- `package.json`
- `docs/learning/implementation/LEARNING_INSTRUCTOR_BROWSER_E2E_FOUNDATION_V1.md` (new)
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/PROJECT_STATE.md`
- `docs/ai/SESSION_HANDOFF.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

None.

## Security review

- Credentials from env only; never logged
- Instructor runner does not provision or mutate remote data
- Anonymous fail-closed to `/login`
- No Commerce/money inputs asserted on instructor surfaces
- No production allow flag in instructor runner

## Tests

Harness + instructor UI contract + related instructor unit suites + `tsc`.
Browser runtime: see report classification (env-dependent).

## Build

Not required.

## git diff --check

PASS (expected)

## git status --short

Dirty working tree (uncommitted by design).

## Open issues

- Assessment/assignment happy paths need `LEARNING_E2E_ACTIVITY_ID` fixture seeding
- Live browser PASS requires local app + provisioned instructor fixtures
