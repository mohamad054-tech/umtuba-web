# Cursor Execution Report

## Task

UM Learning OS — Questions Foundation V1 (feature branch
`office/learning-questions-foundation-v1`, **not** merged into `alpha-0.2`, **no**
remote Supabase migration applied).

## Summary

Implemented a DB-authoritative Questions foundation as an additive slice after
`20260836` (Lesson Content Blocks). A Question is an authored assessment
definition belonging to **exactly one Activity** (Activity → Question only — no
banks, joins, shared/reused questions, cross-activity reuse, or pools). Two new
tables were added:

- `learning_questions` — immutable `activity_id`/`question_type`/`created_by`,
  `draft|published|suspended|archived` lifecycle, non-negative per-activity
  `position` with **no** `UNIQUE(activity_id, position)` (Plan-B compatible),
  per-type validated **LEARNER-VISIBLE** `content` (prompt + options/blanks, **no
  correctness flags**), and an optional **inert** `points` weight.
- `learning_question_answer_keys` — 1:1 (`question_id` PK FK `ON DELETE CASCADE`),
  secret `answer_key` jsonb holding correct answers/criteria only (never learner
  results).

Six creatable types (`multiple_choice_single`, `multiple_choice_multiple`,
`true_false`, `short_answer`, `fill_blank`, `numeric`); two reserved
(`long_answer`, `essay`) enum-only with create rejected; all other types
(matching, ordering, file_upload, code_execution, audio/video_response,
composite, adaptive, AI) fully deferred and fail closed (not in the allowlist).
No matching/ordering validators were implemented.

Writes are RPC-only (`SECURITY DEFINER` + `SET search_path = public`), authority
inherits from the Activity → Lesson → Section → Course → Space chain (no question
staff table; course staff revalidated for active space membership), and every
mutation revalidates the full parent chain with the parent activity locked
`FOR UPDATE` on create/reorder. **Reads are STAFF-ONLY**: no learner SELECT
policy on either table, no learner-facing read RPC, and answer keys are never
returned from non-key RPCs and never exposed to learners. No anon SELECT, no anon
grants; FORCE + ENABLE RLS on both tables.

## Exact files changed

- `supabase/migrations/20260837_learning_questions_foundation_v1.sql` (added)
- `lib/learning/questionsFoundation.ts` (added)
- `lib/learning/questionsFoundation.test.ts` (added)
- `docs/learning/implementation/QUESTIONS_FOUNDATION_V1.md` (added)
- `docs/ai/CURRENT_TASK.md` (updated)
- `docs/ai/CURSOR_REPORT.md` (updated — this file)

## Migrations created

- `supabase/migrations/20260837_learning_questions_foundation_v1.sql`
  - Tables: `learning_questions`, `learning_question_answer_keys`
  - Helpers: `can_manage_learning_question`, `can_create_learning_question`
  - Guard trigger: `learning_question_guard_immutable`
    (activity_id/question_type/created_by/created_at immutable)
  - Internal validators (revoked from public/anon/authenticated):
    `learning_question_assert_safe_text`, `learning_question_validate_type`,
    `learning_question_validate_options`, `learning_question_validate_content`,
    `learning_question_validate_answer_key`,
    `learning_question_require_mutable_status`,
    `learning_question_require_parent_{program,course,section,lesson,activity}_status`
  - RPCs (authenticated + service_role): `create_learning_question`,
    `update_learning_question`, `set_learning_question_answer_key`,
    `publish_learning_question`, `unpublish_learning_question`,
    `archive_learning_question`, `moderate_learning_question`,
    `reorder_learning_questions`
  - **Not applied to remote Supabase.** No prior migration (20260828–20260836)
    modified.

## Security review

- FORCE + ENABLE RLS on `learning_questions` and
  `learning_question_answer_keys`; client `INSERT/UPDATE/DELETE` revoked
  (RPC-only writes); `SELECT` granted to `authenticated` only; `service_role`
  full.
- **Staff-only reads**: question and answer-key SELECT policies are limited to
  space/program/course managers, course staff, and platform admins. No learner
  policy, no `is_learning_space_member`, no `has_learning_course_access`, no anon
  policy/grant. `is_platform_admin()` is only reached from authenticated
  policies. Activities M1 draft surface is not widened.
- **Answer-key secrecy**: written only via `set_learning_question_answer_key`
  (single INSERT path, upsert), validated against the immutable type + current
  content; never returned from any non-key RPC (create/update/publish/unpublish/
  archive/moderate) and never exposed to learners; no learner-facing read RPC.
- SECURITY DEFINER + `search_path = public` on all functions; EXECUTE revoked
  from public/anon and granted to authenticated/service_role; internal
  validators revoked from authenticated too.
- Server-authoritative identity via `auth.uid()`; `created_by`/`updated_by` and
  all scope ids (`course_id`/`space_id`/`lesson_id`) are never client-supplied;
  scope derived from the locked parent chain.
- Immutability enforced by guard trigger + no RPC assigning identity columns; a
  question can never be moved to another activity; reorder requires the full
  unique per-activity id set and is two-phase (no `UNIQUE(activity_id,
  position)`).
- Fail-closed validation: type allowlist (reserved rejected on create; deferred
  absent), per-type `content` (object-only ≤ 16384 bytes, key allowlist, bounded
  prompt/options/blanks, safe-text rejecting HTML/JS/iframe), per-type
  `answer_key` (object-only ≤ 16384 bytes, key allowlist, cross-checked against
  content; boolean-only true/false; non-negative numeric tolerance; **no client
  regex; no equation/expression evaluator**).
- Append-only audit via `learning_audit_write` for all lifecycle actions
  (payloads not copied into the trail).

## Tests

- New: `lib/learning/questionsFoundation.test.ts` — **67 passed**.
- Full learning suite (`npx vitest run lib/learning`): **10 files, 382 tests,
  all passed** (prior learning tests still pass).
- Coverage includes: both tables schema; Activity→Question only; no
  move/banks/pools; V1 types only; reserved rejected; deferred fail-closed
  (no matching/ordering validators); per-type payload; duplicate option keys;
  single one-correct; multiple existing keys; true_false boolean;
  short_answer limits + normalization allowlist; fill_blank completeness;
  numeric tolerance; staff-only visibility; ordinary space member gets nothing;
  no learner SELECT; answer keys never in non-key RPCs; publish/unpublish
  idempotent lifecycle; safe two-phase reorder; RPC-only writes; FORCE RLS;
  SECURITY DEFINER grants; no attempts/grades/banks tables; documentation.

## TypeScript

- `npx tsc --noEmit` — **passed** (no errors).

## Build

- `npm run build` — **passed** (compiled successfully; 59/59 static pages
  generated).

## git diff --check

- `git diff --cached --check` — **clean** (no whitespace/conflict errors).

## git status --short

Staged for the single feature commit:

```
M  docs/ai/CURRENT_TASK.md
M  docs/ai/CURSOR_REPORT.md
A  docs/learning/implementation/QUESTIONS_FOUNDATION_V1.md
A  lib/learning/questionsFoundation.test.ts
A  lib/learning/questionsFoundation.ts
A  supabase/migrations/20260837_learning_questions_foundation_v1.sql
```

(Untracked `.next/` build artifacts are gitignored and not part of the commit.)

## Open issues

- None blocking. Learner delivery (Attempts: responses + grading), and enabling
  the reserved `long_answer`/`essay` types, are the intended next slices.
- Migration `20260837` is committed but **not applied to remote Supabase** (per
  task constraints); apply via targeted migration later per
  `docs/DEVELOPMENT_WORKFLOW.md`.
