# UM Learning OS — Attempts Foundation V1

Status: implemented locally (migration **not** applied remotely in this phase)

Migration: `supabase/migrations/20260838_learning_attempts_foundation_v1.sql`

Depends on: `20260833_learning_activities_foundation_v1.sql` (Activities +
settings: `time_limit_seconds`, `max_attempts`),
`20260834_learning_enrollments_foundation_v1.sql` (entitlement),
`20260835_learning_progress_foundation_v1.sql`
(`has_learning_course_access`, denormalized scope + learner-ownership pattern,
`learning_progress_resolve_enrollment_id`),
`20260837_learning_questions_foundation_v1.sql` (published questions,
LEARNER-VISIBLE `content`, SECRET answer keys).

Constants / types: `lib/learning/attemptsFoundation.ts`

## Purpose

DB-authoritative foundation for **attempts** — a learner's server-owned session
against **exactly one published Activity**. An attempt captures a
LEARNER-SAFE **snapshot** of the activity's published questions at start,
accepts saved learner responses per question, and moves through a strict
lifecycle — **without** any scoring, correctness flags, points, grades,
pass/fail, partial credit, manual/AI grading, certificates, assignments,
question banks, randomization, adaptive delivery, analytics, offline sync,
background expiry jobs, UI/routes/components, Progress mutations, or answer-key
delivery.

An **Attempt is a session record**, not a result. V1 stores **no scoring of any
kind** and never evaluates correctness.

## Relationship — Activity → Attempt → Attempt Answers

```
Space → Program → Course → Section → Lesson → Activity → Attempt
```

- Each attempt has immutable, denormalized `space_id`, `course_id`, `lesson_id`,
  `activity_id`, and `user_id` — derived DB-authoritatively from the parent
  chain at start (never trusted from the client). This mirrors the **Progress**
  foundation's denormalization of `space_id`/`course_id` and is used for
  entitlement gating and scoped staff reads.
- Each saved response (`learning_attempt_answers`) belongs to exactly one
  attempt and one question, with `UNIQUE(attempt_id, question_id)`.

## Tables (exactly two)

### `learning_attempts`

`id`; immutable scope `space_id`/`course_id`/`lesson_id`/`activity_id` (FK
`RESTRICT`) + `user_id` (FK `RESTRICT`); optional `enrollment_id` (FK
`SET NULL`, attribution only); `status`
(`active|submitted|expired|cancelled`, **no `draft`**); `attempt_number`
(monotonic per user+activity); lifecycle timestamps `started_at`,
`last_activity_at`, `submitted_at`, `expired_at`, `cancelled_at`; immutable
`time_limit_seconds_snapshot` + `max_attempts_snapshot`; immutable
`questions_snapshot` (LEARNER-SAFE); `created_at`/`updated_at`.

There is **no** `score`/`passed`/`grade`/`points`/`correct` column — scoring is
entirely out of scope for V1.

- `UNIQUE(user_id, activity_id, attempt_number)`.
- **Partial unique** `learning_attempts_one_active_uidx` on
  `(user_id, activity_id) WHERE status = 'active'` → at most one active attempt
  per learner per activity.

### `learning_attempt_answers`

`id`; `attempt_id` (FK `ON DELETE CASCADE`); `question_id` (FK
`learning_questions ON DELETE RESTRICT`); `answer_payload` jsonb (learner
response only); `first_answered_at`, `last_saved_at`, `created_at`,
`updated_at`; `UNIQUE(attempt_id, question_id)`.

- Holds **only** the learner response — **no** answer key, correctness, score, or
  grade.
- No denormalized `user_id` — ownership derives from the parent attempt (RLS +
  RPC).
- The `question_id` must be part of the attempt's `questions_snapshot` (enforced
  by the save RPC).

## Lifecycle

```
active ──submit──▶ submitted   (terminal)
active ──expire──▶ expired      (terminal, lazy)
active ──cancel──▶ cancelled    (terminal)
```

- `active` is the only live state. `submitted`, `expired`, and `cancelled` are
  **terminal** — there is **no reopen** to `active` (no RPC ever sets
  `status = 'active'` on an existing row).
- **Cancelled and expired attempts COUNT toward `max_attempts`.** Submitted also
  counts. Only the single active attempt is *resumed* (returned), never
  double-created.

## Question delivery — LEARNER-SAFE snapshot (answer-key firewall)

At start, the server builds `questions_snapshot` from
`learning_attempt_build_questions_snapshot(activity_id)`: **published questions
only**, ordered by `position`, each carrying **only**
`{question_id, question_type, position, content}` where `content` is the
already-LEARNER-VISIBLE structure (prompt + options/blanks).

- The snapshot is **embedded on the attempt at start** and is **immutable**
  (guard trigger). A later live edit / unpublish / reorder / archive of a
  question **never** changes a started attempt's delivered payload.
- `get_my_learning_attempt` returns the snapshot directly, so there is **no need
  for a learner SELECT policy on `learning_questions`** (none is added, and the
  staff-only RLS from Questions V1 is preserved).
- **Answer-key firewall (critical):** this migration **never** references,
  reads, joins, or returns `learning_question_answer_keys`. No learner SELECT
  policy is added to `learning_questions` or `learning_question_answer_keys`.
  Correct answers are never leaked in delivery, saved responses, audit metadata,
  errors, or after submit.

## Lazy expiry (no background job)

`learning_attempt_expire_if_due(attempt_id)` locks the row `FOR UPDATE` and, if
it is `active` and `time_limit_seconds_snapshot` is set and
`now() > started_at + interval`, transitions it to `expired` (DB clock only) and
writes an `attempt.expire` audit event. It is called **first** in every
read/save/submit/cancel path. There is **no** `pg_cron`/scheduled sweep and **no**
background expiry job. Timestamps come from the DB only.

## RPCs (RPC-only writes)

No client `INSERT`/`UPDATE`/`DELETE` (revoked). All writes go through
`SECURITY DEFINER` RPCs with `SET search_path = public`, server-authoritative
identity (`auth.uid()` only), and audit. `EXECUTE` is revoked from
`public`/`anon` and granted to `authenticated`/`service_role`; internal
helpers/validators are revoked from all clients (including `authenticated`).

| RPC | Who | Notes |
| --- | --- | --- |
| `start_learning_attempt(activity_id)` | entitled learner (or admin/manager) | locks parent activity `FOR UPDATE`; requires active space + **fully published** program/course/section/lesson/activity; `has_learning_course_access` **before** reading settings; idempotent resume of a live active attempt (after lazy expiry); enforces `max_attempts` (live) by counting terminal attempts under the lock; rejects if no published questions; snapshots settings + questions; assigns monotonic `attempt_number` |
| `save_learning_attempt_answer(attempt_id, question_id, answer_payload)` | owner | lazy expiry first; owner + `active` only; question must be in snapshot; **structural** per-type validation (never compared to a key); upsert idempotent (preserves `first_answered_at`, updates `last_saved_at` + attempt `last_activity_at`); **safe audit only (never the payload)** |
| `get_my_learning_attempt(attempt_id)` | owner | lazy expiry first; own attempt only; returns lifecycle/timestamps, `remaining_seconds`, the LEARNER-SAFE snapshot, and the caller's saved answers; **never** answer keys |
| `submit_learning_attempt(attempt_id)` | owner | lazy expiry first; `active → submitted` once; `submitted_at` set once; idempotent re-submit returns same state; `expired`/`cancelled` cannot submit; **no scoring, no answer keys, no Progress mutation, no certificates** |
| `cancel_learning_attempt(attempt_id)` | owner | lazy expiry first; `active → cancelled` only; idempotent; keeps answers; no reopen; **counts toward `max_attempts`** |

### Concurrency contract

`start_learning_attempt` locks the parent **activity** row `FOR UPDATE`, so a
single learner's concurrent starts serialize and `max_attempts` is counted
race-free. The partial unique index `learning_attempts_one_active_uidx` is the
backstop that guarantees at most one active attempt per `(user, activity)`.
Read/save/submit/cancel each lock the attempt row `FOR UPDATE` (via
`learning_attempt_expire_if_due`) before mutating.

## Response validation (structural only — never a key)

`answer_payload` is object-only, `≤ 16384` bytes, with a **strict per-type key
allowlist**. It is validated purely by **structure** against the snapshot
content — it is **never** compared to any answer key, and correctness is out of
scope for V1.

| Question type | `answer_payload` | Rules |
| --- | --- | --- |
| `multiple_choice_single` | `{ selected_key }` | one string key; must exist among snapshot option keys |
| `multiple_choice_multiple` | `{ selected_keys[] }` | array; unique; all exist among snapshot option keys; ≤ number of options |
| `true_false` | `{ value }` | **boolean only** |
| `short_answer` | `{ text }` | string ≤ 5000 chars; safe-text (no raw HTML/JS/iframe) |
| `fill_blank` | `{ blanks: { key: text } }` | only declared blank keys; each a safe string ≤ 1000 chars (learner may leave blanks empty) |
| `numeric` | `{ value }` | valid JSON number only — **no expression/JS, no NaN/Infinity, no string coercion** |

Any unexpected key for a type is rejected. Reserved/deferred question types can
never appear in a snapshot (only published creatable questions are snapshotted).

## Read model (RLS) — authenticated only, no anon

Both tables have **FORCE + ENABLE** RLS, `SELECT` granted to `authenticated`
only, and **no anon policy or anon grant**. `is_platform_admin()` is only ever
evaluated on authenticated policies.

| Reader | Can read | Policy |
| --- | --- | --- |
| Learner (owner) | own attempts / own answers | `Learners read own attempts` / `Learners read own attempt answers` |
| Course manager (scoped) | attempts / answers in course scope | `Managers read scoped attempts` / `Managers read scoped attempt answers` (via `can_manage_learning_course`) |
| Platform admin | all | `Platform admins read all attempts` / `Platform admins read all attempt answers` |

- **Ordinary space members cannot see others' attempts** — `is_learning_space_member`
  is never called.
- Staff/manager reads exist for **future audit**. There are **no manual grading
  RPCs** and answer keys are never joined here.

## Progress is untouched

This slice performs **zero** mutations to `learning_lesson_progress` or
`learning_course_progress`, and never calls
`learning_progress_recompute_course` / `complete_learning_lesson`. Attempts are
completely separate from Progress in V1.

## Immutability

- Attempt identity/snapshot columns (`space_id`, `course_id`, `lesson_id`,
  `activity_id`, `user_id`, `attempt_number`, `started_at`,
  `time_limit_seconds_snapshot`, `max_attempts_snapshot`, `questions_snapshot`,
  `created_at`) are guarded by `learning_attempt_guard_immutable`.
- Answer identity columns (`attempt_id`, `question_id`, `first_answered_at`,
  `created_at`) are guarded by `learning_attempt_answer_guard_immutable`.
- Clients cannot write either table directly (RLS revokes I/U/D).

## Audit actions

`attempt.start`, `attempt.answer_save`, `attempt.submit`, `attempt.expire`,
`attempt.cancel` — all via `learning_audit_write` with actor / space / activity /
course attribution and **SAFE metadata only** (never the answer payload, never a
question's content, never an answer key).

## Exclusions (out of scope for V1)

Does **not** include scoring, correctness flags, points, grades, pass/fail,
partial credit, manual/AI grading, certificates, assignments, question banks,
randomization, adaptive delivery, analytics, offline sync, background expiry
jobs, UI / routes / React components, Progress mutations, or answer-key
delivery. There is **no** separate attempt-events table (audit-only).

**Next slices = grading/scoring (correctness evaluation against answer keys, kept
in a separate table that is never joined into learner delivery), result
visibility policies, and Progress/Activity completion integration — as
prioritized.**

## Security summary

- FORCE + ENABLE RLS on both tables; client I/U/D revoked (RPC-only writes).
- **Answer-key firewall:** never references/reads/joins/returns
  `learning_question_answer_keys`; learner delivery uses an immutable
  LEARNER-SAFE snapshot; no learner SELECT policy added to questions/answer keys;
  response validation is structural (never compared to a key); no correctness is
  ever computed, stored, delivered, or logged.
- **No anonymous SELECT policy and no `anon` table grant.**
  `is_platform_admin()` only ever called from authenticated policies.
- SECURITY DEFINER + `search_path = public` on all functions; EXECUTE revoked
  from `public`/`anon` and granted to `authenticated`/`service_role`; internal
  helpers/validators revoked from all clients.
- Server-authoritative identity (`auth.uid()`); `user_id` and all scope ids are
  never client-supplied; `max_attempts`/`time_limit` are never client-supplied.
- Immutable scope + snapshots (guard triggers + no RPC reassignment) so a live
  question edit can never rewrite a started attempt.
- Ownership-scoped learner reads; scoped manager/admin reads for future audit;
  ordinary space members get nothing.
- Lazy expiry from the DB clock only (no background job); each mutation locks the
  attempt row `FOR UPDATE`; start locks the parent activity `FOR UPDATE` and the
  partial unique index guarantees ≤ 1 active attempt.
- Append-only audit via `learning_audit_write` with safe metadata only.
