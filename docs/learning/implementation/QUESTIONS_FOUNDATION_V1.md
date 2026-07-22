# UM Learning OS — Questions Foundation V1

Status: implemented locally (migration **not** applied remotely in this phase)

Migration: `supabase/migrations/20260837_learning_questions_foundation_v1.sql`

Depends on: `20260833_learning_activities_foundation_v1.sql` (Activities,
`can_manage`/`can_create_learning_activity`, ordering pattern),
`20260836_learning_lesson_content_blocks_foundation_v1.sql` (guard trigger,
safe-text, per-type validator + dispatcher template).

Constants / types: `lib/learning/questionsFoundation.ts`

## Purpose

DB-authoritative foundation for **questions** — authored assessment definitions
belonging to **exactly one Activity**. A question is a single, ordered, typed
unit with a draft/published lifecycle, RPC-only writes, RLS, bounded per-type
payload validation, a separate secret answer key, and audit — **without** any
attempts, learner responses, grades, scores, pass/fail, certificates,
assignments, question banks, join/reuse tables, pools, randomization, time
limits, adaptive delivery, analytics, AI generation/grading, media uploads,
UI/routes/components, or block/question-level progress.

A **Question is an authored definition**, not an interaction result. It is
**not** an attempt, a learner response, a grade, a score, a certificate, or an
assignment.

## Relationship — Activity → Question only

```
Space → Program → Course → Section → Lesson → Activity → Question
```

- Each question has a required, **immutable** `activity_id`
  (`ON DELETE RESTRICT`) and belongs to **exactly one Activity**.
- There are **NO banks, NO joins, NO shared/reused questions, NO cross-activity
  reuse, and NO pools.** A question can **never** be moved to another activity
  (no RPC assigns `activity_id`; reorder is single-activity scoped).
- `activity_id`, `question_type`, and `created_by` are **immutable** — enforced
  by a guard trigger (`learning_question_guard_immutable`) and never assigned by
  any RPC.
- **Course/space/lesson scope is derived DB-authoritatively** from the parent
  chain and is never stored on the question or trusted from the client. Only
  `activity_id` is stored (matching the Content Blocks parent-FK-only pattern —
  no denormalized `course_id`/`space_id`/`lesson_id`).
- **Authority is inherited** from the Activity → Lesson → Section → Course chain.
  There is **no** question staff table. Space remains the hard authority
  boundary; course authority stays membership-revalidated (a stale course staff
  row grants nothing).

## Tables (exactly two)

### `learning_questions`

`id`, `activity_id` (immutable FK RESTRICT), `question_type` (immutable),
`status` (`draft|published|suspended|archived`), `position` (`≥ 0`, **no**
`UNIQUE(activity_id, position)` — Plan-B compatible like Activities/Content
Blocks), `content` (validated jsonb, **LEARNER-VISIBLE structure only**),
`points` (optional **inert** definition weight), `created_by` (immutable),
`updated_by`, `created_at`/`updated_at`, `published_at`/`suspended_at`/
`archived_at`.

`content` carries **only learner-visible structure** (prompt + options/blanks).
**There are NO correctness flags in this table** — correct answers/criteria live
in `learning_question_answer_keys`. `points` drives **no** scoring/grading/
pass-fail behavior in V1 (deferred to Attempts).

### `learning_question_answer_keys` (1:1)

`question_id` (PK, FK `ON DELETE CASCADE`), `answer_key` jsonb (correct answers /
criteria only), `created_by`, `updated_by`, `created_at`/`updated_at`.

- **NO attempt grades or user results** — correct answers/criteria only.
- **STAFF/PLATFORM-ONLY**: never in any learner SELECT policy; **never returned
  from public display RPCs**; **no learner-facing read RPC in V1.**
- Written only through `set_learning_question_answer_key`.

## Question types

### V1 creatable (6)

```
multiple_choice_single | multiple_choice_multiple | true_false |
short_answer | fill_blank | numeric
```

### Reserved (enum-only; create REJECTED in V1) (2)

```
long_answer | essay
```

In the DB allowlist/`CHECK` (8 total) so a later slice can enable them without a
destructive migration, but `create` **rejects** them today (`... is reserved and
cannot be created in V1`).

### Fully deferred (fail closed — NOT in the allowlist)

```
matching | ordering | file_upload | code_execution | audio_response |
video_response | composite | adaptive | AI types (ai_generated, ai_graded)
```

Intentionally **absent** from the allowlist → fail closed at both the `CHECK`
constraint and the type validator (`Invalid question type`). **No
matching/ordering validators are implemented** — they are deferred completely.

## Payload contracts (strict, per type)

`content` and `answer_key` are each object-only, `≤ 16384` bytes serialized, with
a **strict per-type key allowlist**, byte caps, and fail-closed length/enum/count
checks. All display text is scanned by `learning_question_assert_safe_text`,
which **rejects raw HTML/JS/iframe**, `javascript:`/`vbscript:` schemes,
`data:text/html`, and inline event handlers. Correctness **never** appears in
`content`.

| Type | `content` (learner-visible) | `answer_key` (secret) |
| --- | --- | --- |
| `multiple_choice_single` | `prompt`, `options[]` (ordered `{key,text}`, stable unique keys `^[A-Za-z0-9_-]{1,64}$`, ≥ 2, ≤ 26, text 1–1000, no dup keys) | `correct_key` — exactly one; must exist among option keys |
| `multiple_choice_multiple` | `prompt`, `options[]` (same rules) | `correct_keys[]` — ≥ 1, unique, all must exist among option keys |
| `true_false` | `prompt` | `correct` — **boolean only** |
| `short_answer` | `prompt` | `accepted[]` (1–20 entries, 1–200 chars), optional `normalization` (allowlist: `trim`, `case_sensitive` booleans only — **NO client regex**) |
| `fill_blank` | `prompt`, `blanks[]` (`{key}`, 1–20, unique keys) | `answers` (object keyed by blank key; each an array 1–20 of 1–200-char strings) — must **cover all** blanks and reference only declared blanks |
| `numeric` | `prompt`, optional `unit` (≤ 64) | `value` (number), optional `tolerance` (number ≥ 0) — **NO equation/expression evaluator** |

Any unexpected key for a type is rejected (`content contains unexpected key …` /
`answer_key contains unexpected key …`). Answer-key validation cross-checks the
current `content` (e.g. MCQ correct keys must exist; fill-blank answers must
cover every blank).

## Publishing

- **Block-level-style draft on the question.** New questions are created
  `draft`.
- **Activity / Lesson / Course publish does NOT auto-publish questions** — each
  question is published explicitly.
- Explicit, **idempotent** lifecycle RPCs:
  - `publish` on an already-`published` question → no-op success; otherwise
    `draft → published` (`published_at` set **from the DB** via
    `coalesce(published_at, now())`).
  - `unpublish` on an already-`draft` question → no-op success; otherwise
    `published → draft` (clears `published_at`).
  - `archive` is idempotent and **blocked while suspended** (platform
    moderation only).
- `published_at` is DB-managed only; clients never supply it.
- **Editing a published question in-place is allowed for staff in V1.** There is
  no versioning/revisions. Because there are no Attempts yet, there is no learner
  delivery snapshot to protect — **learner delivery (and any
  publish-time-locking of the definition) is deliberately deferred to the future
  Attempts slice.**

## Read model (RLS) — STAFF-ONLY in V1

Both tables have **FORCE + ENABLE** RLS, `SELECT` granted to `authenticated`
only, and **no anon policy or anon grant**. `is_platform_admin()` is only ever
evaluated on authenticated policies.

| Reader | Can read | Policy |
| --- | --- | --- |
| Space/Program/Course manager or course staff | questions + answer keys in scope | `Course staff read scoped questions` / `Course staff read scoped answer keys` |
| Question manager | via `can_manage_learning_question` | `Question managers read questions` / `Question managers read answer keys` |
| Platform admin | all | `Platform admins read all questions` / `Platform admins read all answer keys` |

### Deliberate divergences

- **No learner SELECT policy** on questions or answer keys, and **no
  learner-facing RPC** returning a question or an answer key. Learner delivery is
  deferred to Attempts.
- **Ordinary space members get nothing** — `is_learning_space_member` is never
  called. This deliberately does **not** copy the Lessons "any space member"
  read and does **not** widen the Activities M1 draft-settings surface.
- **Answer keys are never widened** — they are never in a learner policy and are
  never returned by any non-key RPC.
- There is deliberately **no anonymous SELECT** in V1.

## Writes — RPC-only

No client `INSERT`/`UPDATE`/`DELETE` (revoked). All writes go through
`SECURITY DEFINER` RPCs with `SET search_path = public`, server-authoritative
identity (`auth.uid()`), full parent-chain revalidation, and audit. `EXECUTE` is
revoked from `public`/`anon` and granted to `authenticated`/`service_role`;
internal validators are revoked from all clients (including `authenticated`).

| RPC | Who | Notes |
| --- | --- | --- |
| `create_learning_question(activity_id, question_type, content, points?)` | activity manage / course staff ≥ instructor | locks parent activity; space active; program+course+section+lesson+activity `draft\|published`; type validated (reserved rejected); content validated; appends at `max(position)+1`; created `draft`; **never returns answer key** |
| `update_learning_question(question_id, content?, points?, clear_points?)` | question manage or course editor/instructor/lead | content/prompt/config + inert points only; re-validated against immutable `question_type`; sets `updated_by`; **no** ownership/type/activity change |
| `set_learning_question_answer_key(question_id, answer_key)` | question manage or course editor/instructor/lead | upsert (1:1); validates against immutable type + current content; **only** answer-key write path; returns a flag, **never** the payload |
| `publish_learning_question(question_id)` | `can_manage_…` | idempotent draft→published |
| `unpublish_learning_question(question_id)` | `can_manage_…` | idempotent published→draft |
| `archive_learning_question(question_id)` | `can_manage_…` | idempotent; blocked while suspended |
| `moderate_learning_question(question_id, status)` | **platform admin only** | `suspended\|published\|archived` |
| `reorder_learning_questions(activity_id, question_ids[])` | activity manage or space manage | two-phase, locks parent activity, full unique id set, cannot cross activities |

### Parent gates (full 6-level chain)

Every mutation revalidates: **Space** `active`; **Program**, **Course**,
**Section**, **Lesson**, **Activity** each `draft|published` (not
suspended/archived); plus actor authority inherited from Activity/Course
(delegated course staff need active space membership). The parent **activity is
locked `FOR UPDATE`** on create/reorder. A published question does **not** require
a *published* activity — only a mutable (`draft|published`) chain.

## Ordering — Plan-B compatibility

- `position` is a **non-negative** integer, **order within the parent activity's
  question list for V1**.
- There is intentionally **no `UNIQUE(activity_id, position)`** (Plan-B
  compatible, exactly like Activities/Content Blocks), so a future unified
  ordering spine can be introduced without a destructive migration.
- `reorder_learning_questions` rewrites positions to `0..n-1` transactionally: it
  locks the parent activity `FOR UPDATE`, requires the full **unique** set of the
  activity's question ids, rejects foreign/duplicate/incomplete ids, rejects
  reorder while any question is suspended/archived (documented, following the
  Content Blocks/Activities rule), and uses a **two-phase offset** update to
  avoid the non-negative check conflict during the swap.

## Immutability

- Identity columns `activity_id`, `question_type`, `created_by`, `created_at` are
  guarded by `learning_question_guard_immutable` (raises on change).
- No RPC assigns `activity_id`, `question_type`, or `created_by`.
- Publish timestamps and status transitions are server-managed; clients cannot
  write either table directly (RLS revokes I/U/D).

## Audit actions

`question.create`, `question.update`, `question.publish`, `question.unpublish`,
`question.archive`, `question.moderation`, `question.reorder`,
`question.answer_key_set` — all via `learning_audit_write` with actor / space /
program / course / section / lesson / activity / question attribution. Bounded
`content` and `answer_key` payloads are **not** copied into the audit trail.

## Exclusions (out of scope for V1)

Does **not** include attempts, learner responses, grades, scores, pass/fail,
certificates, assignments, question banks, join/reuse tables, pools,
randomization, time limits, adaptive delivery, analytics, AI generation/grading,
media uploads, UI / routes / React components, block/question-level progress, or
matching/ordering validators.

**Next slice = Attempts (learner delivery + responses + grading), or enabling the
reserved `long_answer` / `essay` types, as prioritized.**

## Security summary

- FORCE + ENABLE RLS on both tables; client I/U/D revoked (RPC-only writes).
- **STAFF-ONLY reads**: no learner SELECT policy, no learner-facing RPC, and no
  `is_learning_space_member` / `has_learning_course_access` widening. Answer keys
  are never in a learner policy and never returned from non-key RPCs.
- **No anonymous SELECT policy and no `anon` table grant.**
  `is_platform_admin()` only ever called from authenticated policies.
- SECURITY DEFINER + `search_path = public` on all functions; EXECUTE revoked
  from `public`/`anon` and granted to `authenticated`/`service_role`; internal
  validators revoked from all clients.
- Server-authoritative identity (`auth.uid()`); `created_by`/`updated_by` never
  client-supplied; scope ids never client-supplied.
- Authority inherited from Activity/Course with active space-membership
  revalidation (stale course staff row grants nothing).
- Fail-closed validation of `question_type` (immutable allowlist; reserved
  rejected; deferred not in allowlist), per-type `content` (object-only,
  ≤ 16384 bytes, key allowlist, bounded prompts/options/blanks, safe-text) and
  per-type `answer_key` (object-only, ≤ 16384 bytes, key allowlist, cross-checked
  against content; boolean-only for true/false; non-negative numeric tolerance;
  **no client regex; no equation/expression evaluator**).
- `activity_id`/`question_type`/`created_by` immutable (guard trigger + no RPC
  assignment); a question can never be moved across activities; reorder requires
  the full unique set and there is no `UNIQUE(activity_id, position)` (Plan-B
  compatible).
- Append-only audit trail via `learning_audit_write`.
