# Current Task

## Task title

UM Learning OS — Lesson Content Blocks Foundation V1

## Goal

DB-authoritative foundation for lesson **content blocks** (the display content
body of a Lesson): a single `learning_lesson_content_blocks` table scoped to
exactly one Lesson, with an immutable typed `block_type` (10 creatable + 2
reserved), a block-level draft/published lifecycle, non-negative per-lesson
ordering (no `UNIQUE(lesson_id, position)`; reserved `learning_lesson_items`),
bounded per-type payload validation (no raw HTML/JS/iframe; opaque http(s) media
references only), RPC-only writes (SECURITY DEFINER + `search_path = public`),
FORCE RLS, and audit. Learner content-body reads gate on
`has_learning_course_access(course_id)` + published lesson + published block —
NOT plain space membership. No anon SELECT. No remote Supabase apply.

## Allowed scope

- `supabase/migrations/20260836_learning_lesson_content_blocks_foundation_v1.sql`
- `lib/learning/lessonContentBlocksFoundation.ts`
- `lib/learning/lessonContentBlocksFoundation.test.ts`
- `docs/learning/implementation/LESSON_CONTENT_BLOCKS_FOUNDATION_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- `learning_lesson_items`, activity progress, block-level progress, questions,
  attempts, submissions, assignments, certificates, AI, grades, analytics
- Media upload / storage buckets / signed URLs; offline sync; UI / routes /
  React components
- Modifying prior migrations (`20260828`–`20260835`)
- Widening space-member draft access / any anon draft access
- Accepting client-forged `course_id` / `space_id` / creator identity / publish
  timestamps / illegal status transitions
- Applying migrations to remote Supabase

## Branch

`office/learning-lesson-content-blocks-foundation-v1`

## Status

`implemented — verified (learning tests, tsc, build); commit + push feature branch (no remote migration apply).`
