# UM Learning OS — Scoring Foundation V1

Status: **implemented locally** (migration not applied remotely; feature branch
only — not merged into `alpha-0.2`)

Migration: `supabase/migrations/20260839_learning_scoring_foundation_v1.sql`

Depends on: `20260833_learning_activities_foundation_v1.sql` (settings:
`evaluation_mode`, `max_score`, `passing_score`),
`20260837_learning_questions_foundation_v1.sql` (inert `points`, STAFF-ONLY
`learning_question_answer_keys`),
`20260838_learning_attempts_foundation_v1.sql` (attempts, answers, LEARNER-SAFE
`questions_snapshot`, `submit_learning_attempt`).

Constants / types: `lib/learning/scoringFoundation.ts`

---

## Decision Log (locked)

All decisions below are **approved** for Scoring Foundation V1. Implementation
must not reopen them without an explicit new decision lock.

| # | Decision | Lock |
| --- | --- | --- |
| D1 | **Separate result tables** | Scores/correctness live in new tables only — never as columns on `learning_attempts` / `learning_attempt_answers`. |
| D2 | **`score_learning_attempt` RPC** | Scoring is a dedicated RPC, not folded into `submit_learning_attempt`. |
| D3 | **Snapshot includes `points` only (no answer keys)** | Extend the LEARNER-SAFE `questions_snapshot` element with snapshotted `points`. Answer keys are **never** snapshotted or learner-visible. |
| D4 | **Fail closed if answer key missing** | If any snapshotted question lacks a usable `learning_question_answer_keys` row at score time → abort the whole score (no partial writes). |
| D5 | **Exact match only** | No partial credit. Per-type exact-match rules only (see Scoring algorithm). |
| D6 | **Staff-only result visibility** | ENABLE + FORCE RLS; SELECT for course managers / platform admins only. No learner SELECT policy on result tables. |
| D7 | **Auto evaluation only** | `score_learning_attempt` requires activity `evaluation_mode = 'auto'`. `none` / `manual` / `hybrid` are rejected. |
| D8 | **No Progress mutations** | Zero reads/writes of `learning_lesson_progress` / `learning_course_progress`; no completion coupling. |
| D9 | **No learner result delivery** | No learner-facing score/correctness RPC; do not extend `get_my_learning_attempt` with results; never return answer keys. |
| D10 | **Submitted attempts only** | Only `status = 'submitted'` is scoreable. `active` / `expired` / `cancelled` are rejected. |

---

## Purpose

DB-authoritative foundation for **auto-scoring** a submitted Attempt against
STAFF-ONLY answer keys — producing immutable-scoped **result records** separate
from the attempt session — **without** learner result delivery, Progress
mutations, partial credit, manual/AI grading, certificates, UI/routes/components,
or remote migration apply in this slice.

A **Score/Result is an evaluation record**, not a session. The Attempt remains
the session; Scoring reads the attempt + answers + secret keys and writes only
to result tables.

## Relationship

```
Space → Program → Course → Section → Lesson → Activity → Attempt
                                                      ↘ Attempt Answers
                                                      ↘ Attempt Result
                                                         ↘ Answer Results
```

- Results are keyed by `attempt_id` (and per-question for answer results).
- Scope for RLS (`space_id` / `course_id`) is derived from the parent attempt
  (denormalized onto result rows for scoped staff reads — same pattern as
  Attempts), never trusted from the client.
- Answer keys remain in `learning_question_answer_keys` and are read **only**
  inside `SECURITY DEFINER` scoring helpers. They are never joined into learner
  delivery and never returned from any Scoring RPC response.

## Tables (exactly two — separate result tables)

### `learning_attempt_results`

1:1 with a scored attempt (`attempt_id` PK, FK → `learning_attempts`
`ON DELETE CASCADE`).

Columns (final design):

- `attempt_id` (PK)
- Denormalized immutable scope for staff RLS: `space_id`, `course_id`,
  `activity_id`, `user_id` (copied from the attempt at score time; never
  client-supplied)
- `status` — `scored` only in V1 (single successful outcome state)
- `score_earned` `numeric` — sum of per-answer `points_earned`
- `score_max` `numeric` — sum of snapshotted question `points` (null points
  count as `0`)
- `passed` `boolean null` — `null` when activity `passing_score` is null at
  score time; otherwise `score_earned >= passing_score`
- Snapshots of settings used for the pass decision (immutable on the result
  row): `max_score_snapshot`, `passing_score_snapshot`,
  `evaluation_mode_snapshot` (must be `'auto'`)
- `scored_at`, `scored_by` (actor `auth.uid()` or null for service_role-only
  paths if ever used), `created_at`, `updated_at`

**No** grade letters, rubrics, manual override columns, or AI fields in V1.

### `learning_attempt_answer_results`

One row per `(attempt_id, question_id)` for every question in the attempt’s
`questions_snapshot` (including unanswered).

- `id`
- `attempt_id` (FK CASCADE), `question_id` (FK RESTRICT)
- `UNIQUE(attempt_id, question_id)`
- `is_correct` `boolean not null`
- `points_possible` `numeric not null` — from snapshotted `points` (null → `0`)
- `points_earned` `numeric not null` — `points_possible` if correct else `0`
- `created_at`, `updated_at`

**No** answer key copy, no learner payload copy, no partial-credit fraction.

## Snapshot extension (points only — answer-key firewall)

`learning_attempt_build_questions_snapshot` (owned by Attempts; updated
additively in this Scoring migration) emits, for each published question:

```json
{
  "question_id": "<uuid>",
  "question_type": "<creatable type>",
  "position": 0,
  "content": { },
  "points": null
}
```

- `points` is copied from `learning_questions.points` at attempt **start**
  (may be JSON `null`).
- **Never** includes `answer_key`, `correct_*`, `accepted`, `tolerance`, or any
  key material.
- Existing Attempts immutability of `questions_snapshot` remains: once started,
  points weights do not change for that attempt.
- Attempts whose snapshot elements lack a `points` key (pre-extension rows) are
  **not scoreable** — `score_learning_attempt` fail-closes.

Answer keys are evaluated **live** at score time from
`learning_question_answer_keys` (not snapshotted). Combined with D4: a missing
key aborts scoring.

## Scoreable attempts (D10)

| Attempt status | Scoreable? |
| --- | --- |
| `submitted` | **Yes** |
| `active` | No |
| `expired` | No |
| `cancelled` | No |

Lazy expiry still runs first on the attempt row where applicable; an attempt
that flips to `expired` before scoring is not scoreable.

## Evaluation gate (D7)

`score_learning_attempt` loads live `learning_activity_settings` for the
attempt’s `activity_id` and requires:

- `evaluation_mode = 'auto'`

Otherwise raise (e.g. `evaluation_mode must be auto`). Snapshot
`evaluation_mode_snapshot = 'auto'` on the result row.

`max_score` / `passing_score` are read live at score time for pass/fail and
stored as snapshots on `learning_attempt_results`. They do **not** rescale
`score_earned` / `score_max` in V1 (`score_max` always = sum of snapshotted
points).

## RPC

### `score_learning_attempt(attempt_id)`

- **Who:** course manager for the attempt’s `course_id`
  (`can_manage_learning_course`) or platform admin. **Not** the learner.
  `EXECUTE` granted to `authenticated` / `service_role`; authority enforced
  inside the RPC. Learners always get “Not allowed…”.
- **Writes:** RPC-only (`SECURITY DEFINER`, `search_path = public`). Client
  I/U/D on result tables revoked.
- **Flow:**
  1. Auth required (`auth.uid()`).
  2. Lock attempt `FOR UPDATE` (via existing expire-if-due path where safe;
     then require `submitted`).
  3. Authorize staff on `course_id`.
  4. Require `evaluation_mode = 'auto'`.
  5. Require every snapshot element has a `points` key.
  6. For every snapshotted `question_id`, require an answer-key row — **fail
     closed** if any missing (D4); no result rows written.
  7. For each snapshotted question: load optional `learning_attempt_answers`
     row; evaluate exact-match (D5); write/replace answer result.
  8. Aggregate attempt result; upsert 1:1 `learning_attempt_results`.
  9. Audit `attempt.score` (safe metadata only — never keys, never payloads).
- **Idempotency:** re-score by staff **replaces** answer results + attempt
  result atomically (same `attempt_id`). Prior result rows for that attempt are
  overwritten, not versioned in V1.
- **Return:** staff-safe summary only
  (`attempt_id`, `score_earned`, `score_max`, `passed`, `scored_at`,
  per-question `{ question_id, is_correct, points_earned, points_possible }`).
  **Never** answer keys, never raw `answer_payload`.

No other Scoring RPCs in V1 (no learner get-result, no manual grade, no
bulk rescore API beyond calling the same RPC again).

## Scoring algorithm (exact match only — D5)

Unanswered (`no learning_attempt_answers` row) → `is_correct = false`,
`points_earned = 0`.

| Type | Exact-match rule |
| --- | --- |
| `multiple_choice_single` | `selected_key` equals `answer_key.correct_key` |
| `multiple_choice_multiple` | set equality: `selected_keys` ≡ `correct_keys` (order irrelevant, duplicates already forbidden by Attempts validation) |
| `true_false` | `value` equals `answer_key.correct` (boolean) |
| `short_answer` | Apply key `normalization` (`trim` / `case_sensitive` booleans only — **no regex**); normalized text must equal **one** of `accepted[]` exactly |
| `fill_blank` | Every declared blank key: learner string equals **one** accepted string for that blank exactly (no per-blank partial credit; all blanks must match for `is_correct = true`) |
| `numeric` | `abs(learner.value - answer_key.value) <= coalesce(tolerance, 0)` |

Reserved / deferred question types never appear in a snapshot (Attempts rule).

**No partial credit** for MCQ-multi subsets, partial fill-blank sets, or
proportional numeric near-misses beyond tolerance.

## Read model (RLS) — staff only (D6, D9)

Both result tables: **FORCE + ENABLE** RLS; `SELECT` to `authenticated` only;
**no anon** grant/policy; **no learner owner policy**.

| Reader | Can read results? |
| --- | --- |
| Learner (attempt owner) | **No** |
| Course manager (scoped) | Yes — via `can_manage_learning_course(course_id)` |
| Platform admin | Yes |
| Ordinary space member | **No** |

`is_learning_space_member` / `has_learning_course_access` are never used to
widen result reads.

## Progress (D8)

Scoring performs **zero** mutations to Progress and does not call
`complete_learning_lesson` / `learning_progress_recompute_course`. Activity
`completion_mode` (including `'score'`) remains inert in this slice.

## Answer-key firewall (unchanged + scoring exception)

- Learner delivery paths (`start` snapshot, `get_my_learning_attempt`, save
  validation) still **must not** read/return keys.
- **Only** `score_learning_attempt` (and its revoked-from-client helpers) may
  `SELECT` from `learning_question_answer_keys`.
- Keys never appear in RPC returns, audit metadata, or error messages
  (fail-closed errors are generic: e.g. `Answer key missing for one or more
  questions`).

## Audit

`attempt.score` via `learning_audit_write` — actor, space, attempt, activity,
course, `score_earned`, `score_max`, `passed`. **Never** keys, payloads, or
per-answer accepted strings.

## Exclusions (out of scope for V1)

- Learner result delivery / extending `get_my_learning_attempt` with scores
- Honoring `show_result_policy` for learners
- Progress / `completion_mode` integration
- Partial credit, rubrics, manual grades, AI grading
- Scoring `expired` / `cancelled` / `active` attempts
- `evaluation_mode` other than `auto`
- Embedding answer keys in snapshots
- Certificates, analytics, UI/routes/components
- Modifying prior migration files `20260828`–`20260838` as rewrites (additive
  changes to shared helpers such as snapshot builder occur only inside the new
  Scoring migration)
- Remote Supabase migration apply

## Security summary

- Separate result tables; RPC-only writes; FORCE + ENABLE RLS; staff-only SELECT.
- Answer keys: server-side read in score path only; never learner-visible.
- Snapshot may gain `points` only; keys remain firewalled.
- Fail closed on missing keys or non-`auto` evaluation mode or non-`submitted`
  status or pre-extension snapshots missing `points`.
- Exact-match auto scoring only; no Progress coupling; no learner delivery.

## Deliverables

- `supabase/migrations/20260839_learning_scoring_foundation_v1.sql`
- `lib/learning/scoringFoundation.ts`
- `lib/learning/scoringFoundation.test.ts`
- this document
