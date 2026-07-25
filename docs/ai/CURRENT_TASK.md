# Current Task

## Task title

UMTUBA Learning — Learner Experience Foundation V1 — Slice 3

## Goal

Implement Learner Activity Routing on branch
`office/learning-learner-experience-foundation-v1`: add
`resolveLearnerActivityTarget()`, wire `ActivityList` and the generic activity
gate so `quiz` opens assessment, `assignment` opens assignment, and other
types keep the generic gate. Fix assessment/assignment back links to the
lesson to avoid redirect loops. No migrations, no instructor changes, no
engine changes, no completion mutations.

## Allowed scope

- `lib/learning/learnerDelivery.ts`
- `lib/learning/learnerDelivery.test.ts`
- `app/components/learning/ActivityList.tsx`
- `app/learning/activities/[activityId]/page.tsx`
- `app/learning/activities/[activityId]/assessment/page.tsx` (back links only)
- `app/learning/activities/[activityId]/assignment/page.tsx` (back links only)
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`
- `docs/learning/implementation/LEARNER_EXPERIENCE_FOUNDATION_V1.md`

## Forbidden scope

- Migrations / Supabase schema
- Assessment / assignment engine modules (RPCs, adapters, attempt logic)
- Instructor flows
- Completion mutation changes
- Unrelated Learning foundations / learner dashboard extras
- Commit / push / merge / migration apply unless explicitly requested

## Branch

`office/learning-learner-experience-foundation-v1`

## Status

`complete` — PASS (not committed)
