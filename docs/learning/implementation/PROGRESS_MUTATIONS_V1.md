# UM Learning — Progress Mutations After Scored Attempts V1

Status: **implemented locally** (migration not applied remotely)

Migration: `supabase/migrations/20260845_learning_progress_mutations_v1.sql`

Depends on: Progress Foundation (`20260835`), Activities settings
(`completion_mode`, `passing_score`), Attempts, Scoring / Result Delivery
(`learning_scoring_apply_attempt_result`).

Constants / types: `lib/learning/progressMutations.ts`  
Shared progress types: `lib/learning/progressFoundation.ts` (`scored_attempt`)

---

## Locked decisions

1. **`passing_score IS NULL` + `completion_mode='score'`** → a **scored**
   result is enough to complete (no pass %). When `passing_score` is set,
   require `passed = true`.
2. **Lesson-level progress only** — no `learning_activity_progress` table.
   A qualifying scored activity completes the **parent lesson**.
3. **First qualifying attempt wins** per `(user_id, activity_id)`. Later
   attempts do not re-apply progress.
4. **Transactional** — application insert + lesson update + course rollup in
   the same transaction as score write. Any failure → full rollback (no
   orphan applications).
5. **Applications append-only** — insert-once; update/delete blocked.
6. **DB-only scope** — lesson/activity/user/course/space come from the
   attempt row, never from the client.
7. **`completion_mode` `view` | `submit` | `manual` unchanged** in this slice.

## Purpose

After a trusted scored attempt (via internal
`learning_scoring_apply_attempt_result`), apply lesson progress when the
activity’s `completion_mode` is `score` and the pass gate is met.

## Schema

### `learning_attempt_progress_applications`

| Column | Notes |
| --- | --- |
| `attempt_id` | PK → attempt |
| `user_id`, `activity_id` | unique together (first win) |
| `lesson_id`, `course_id`, `space_id` | from attempt |
| `applied_at`, `applied_by` | audit |

FORCE RLS; learners/managers read; writes only via DEFINER helpers.

### `completion_source`

Expanded check: `'manual' | 'scored_attempt'`.

## Internal helpers (EXECUTE revoked from authenticated)

### `learning_progress_try_apply_from_scored_attempt(attempt_id, actor_id)`

Gates (skip, no raise):

| Reason | When |
| --- | --- |
| `attempt_not_submitted` | attempt status ≠ submitted |
| `completion_mode_not_score` | mode ≠ score |
| `attempt_not_scored` | no scored result row |
| `passing_score_not_met` | passing_score set and passed ≠ true |
| `activity_already_applied` | another attempt already applied |
| `activity_already_applied_concurrent` | unique race |

Statuses: `applied` | `idempotent` | `skipped`.

### `learning_progress_complete_lesson_from_scored_attempt(...)`

Completes lesson with `completion_source='scored_attempt'`, then
`learning_progress_recompute_course`, optionally sets
`learning_course_progress.last_activity_id`.

Does **not** enforce `min_completion_seconds` (that gate remains for
manual `complete_learning_lesson`).

## Hook

`learning_scoring_apply_attempt_result` (REPLACE in `20260845` only) calls
`learning_progress_try_apply_from_scored_attempt` after the score write /
audit, before return. Staff score and submit auto-score paths both inherit
the hook.

## Out of scope

UM Points, certificates, badges, AI/manual grading UI, Games, Ads,
analytics dashboards, per-question learner exposure, activity-level
progress rows, un-apply / reopen from score.

## Migration apply

**Git-only until explicitly approved.** Do not apply to remote Supabase
without human approval.
