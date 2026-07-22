# Current Task

## Task title

UM Learning OS — Questions Foundation V1

## Goal

DB-authoritative foundation for **questions** — authored assessment definitions
belonging to **exactly one Activity** (Activity → Question only; no banks, joins,
shared/reused questions, cross-activity reuse, or pools). Two tables:
`learning_questions` (LEARNER-VISIBLE structure in a validated `content` jsonb,
immutable `activity_id`/`question_type`/`created_by`, draft/published lifecycle,
non-negative per-activity ordering with no `UNIQUE(activity_id, position)`,
optional inert `points`) and `learning_question_answer_keys` (1:1, secret correct
answers/criteria only — never learner results). Six creatable types
(`multiple_choice_single`, `multiple_choice_multiple`, `true_false`,
`short_answer`, `fill_blank`, `numeric`), two reserved (`long_answer`, `essay` —
create rejected), all other types fully deferred/fail-closed (no matching/ordering
validators). RPC-only writes (SECURITY DEFINER + `search_path = public`),
FORCE RLS, and audit. **Reads are STAFF-ONLY**: no learner SELECT policy on either
table, no learner-facing RPC, and answer keys are never returned from non-key
RPCs and never exposed to learners. No anon SELECT. No remote Supabase apply.

## Allowed scope

- `supabase/migrations/20260837_learning_questions_foundation_v1.sql`
- `lib/learning/questionsFoundation.ts`
- `lib/learning/questionsFoundation.test.ts`
- `docs/learning/implementation/QUESTIONS_FOUNDATION_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Attempts, learner responses, grades, scores, pass/fail, certificates,
  assignments, question banks, join/reuse tables, pools, randomization, time
  limits, adaptive, analytics, AI generation/grading, media uploads
- UI / routes / React components; block/question-level progress
- matching/ordering validators (deferred completely)
- Modifying prior migrations (`20260828`–`20260836`)
- Learner SELECT policies / learner-facing RPCs / any anon draft access;
  returning answer keys from non-key RPCs or to learners
- Accepting client-forged `course_id` / `space_id` / `lesson_id` / creator
  identity / publish timestamps / illegal status transitions; moving a question
  to another activity
- Applying migrations to remote Supabase

## Branch

`office/learning-questions-foundation-v1`

## Status

`implemented — verified (questions tests 67/67, all learning tests 382/382, tsc,
build); committed + pushed feature branch (no remote migration apply, not merged
into alpha-0.2).`
