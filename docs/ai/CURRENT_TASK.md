# Current Task

## Task title

UMTUBA Learning — Learner Experience Foundation V1 — Slice 2

## Goal

Implement Next/Previous Lesson Navigation on branch
`office/learning-learner-experience-foundation-v1`: add
`resolveAdjacentLessonTargets()`, load ordered published lesson ids for a
course, enrich `loadLessonDelivery` with `previous_lesson` / `next_lesson`,
and surface Previous/Next links in `LessonViewer`. No migrations, no schema
changes, no instructor changes, no completion mutation on navigate.

## Allowed scope

- `lib/learning/learnerDelivery.ts`
- `lib/learning/learnerDelivery.test.ts`
- `app/components/learning/LessonViewer.tsx`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`
- `docs/learning/implementation/LEARNER_EXPERIENCE_FOUNDATION_V1.md`

## Forbidden scope

- Migrations / Supabase schema
- Unrelated Learning foundations
- Instructor flows
- Activity type routing / learner dashboard extras (later slices)
- Completion mutation on next/prev click
- Commit / push / merge / migration apply unless explicitly requested

## Branch

`office/learning-learner-experience-foundation-v1`

## Status

`complete` — PASS (not committed)
