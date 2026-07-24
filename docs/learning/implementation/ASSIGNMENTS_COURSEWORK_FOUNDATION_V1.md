# UM Learning — Assignments & Coursework Foundation V1

Status: **implemented** (migration created, **not applied**)

Branch: `office/learning-assignments-coursework-foundation-v1`

Migration: `supabase/migrations/20260857_learning_assignments_coursework_foundation_v1.sql`

## Scope

Assignment authoring · learner delivery · text/link/file-reference submissions · instructor queue · manual review · learner results · score-mode progress apply

## Architecture

Parallel coursework vertical for `learning_activities.type = 'assignment'`.

Reuses activities/settings, course access, instructor manage auth, URL safety helper, lesson progress rollup.

Separate from question-assessment attempt/answer/review tables.

## Storage

Private bucket `learning-assignment-files` — references only, no processing.

## No remote apply

Git-only until explicitly applied.
