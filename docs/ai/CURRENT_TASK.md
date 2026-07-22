# Current Task

## Task title

UM Learning OS — Progress Foundation V1

## Goal

DB-authoritative Progress foundation: lesson + course rollup for learners.
Writes gated by expanded `has_learning_course_access` (admin OR course manager OR
active course enrollment OR active parent program enrollment). Course progress
stores `completed_lessons_count`, `total_lessons_count`, and DB-computed
`percent_complete`. No Activity Progress / Attempts / Certificates / Payments / UI.

## Allowed scope

- `supabase/migrations/20260835_learning_progress_foundation_v1.sql`
- `lib/learning/progressFoundation.ts`
- `lib/learning/progressFoundation.test.ts`
- `docs/learning/implementation/PROGRESS_FOUNDATION_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Activity progress / Attempts / Submissions / Certificates / AI / Payments / UI
- Expanding draft activity settings read policies
- Accepting client `percent_complete` / forged `user_id` / `course_id`
- Applying migrations to remote Supabase without approval

## Branch

`office/learning-progress-foundation-v1`

## Status

`implemented — verify, commit, push feature branch (no remote migration apply).`
