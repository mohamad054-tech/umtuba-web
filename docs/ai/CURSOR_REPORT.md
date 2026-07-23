# Cursor Execution Report

## Task

UM Learning OS — Attempts Foundation V1 (feature branch
`office/learning-attempts-foundation-v1`, **not** merged into `alpha-0.2`, **no**
remote Supabase migration applied). Rebased onto `origin/alpha-0.2` (Ads
Measurement Pipeline V1); the retained Ads report is preserved below.

## Summary

Implemented a DB-authoritative Attempts foundation as an additive slice after
`20260837` (Questions). An Attempt is a learner's server-owned session against
**exactly one published Activity** (Activity → Attempt → Attempt Answers). Two
new tables were added:

- `learning_attempts` — denormalized immutable scope
  (`space_id`/`course_id`/`lesson_id`/`activity_id`, mirroring Progress), learner
  `user_id` (server identity only), optional `enrollment_id` attribution,
  lifecycle `active|submitted|expired|cancelled` (**no draft**; terminal states
  never reopen), `attempt_number`, lifecycle timestamps, immutable
  `time_limit_seconds_snapshot`/`max_attempts_snapshot`, and an immutable,
  server-generated **LEARNER-SAFE** `questions_snapshot`. **No**
  score/passed/grade columns.
- `learning_attempt_answers` — one saved learner response per
  `(attempt_id, question_id)`; `answer_payload` jsonb holds the learner response
  only (per-type structural validation). **No** answer key/correctness/score.
  Ownership derives from the parent attempt (no denormalized `user_id`).

Writes are RPC-only (`SECURITY DEFINER` + `SET search_path = public`), identity is
server-authoritative via `auth.uid()`, and scope is derived from the locked
Activity → Lesson → Section → Course → Program → Space chain (never
client-supplied). Lifecycle transitions are terminal-safe and idempotent. Lazy
expiry (no background job) transitions `active → expired` on the next
read/save/submit/cancel when the snapshot time limit has elapsed (DB clock only).
Zero mutations to Progress; no certificates; no scoring.

**Answer-key firewall (critical):** the migration never reads, joins, or returns
`learning_question_answer_keys`; learner delivery uses the embedded LEARNER-SAFE
`questions_snapshot` (published questions only, ordered, prompt + options/blanks).
No learner SELECT policy is added to `learning_questions` or the keys table, and
answer payloads are never copied into the audit trail.

## Exact files changed

- `supabase/migrations/20260838_learning_attempts_foundation_v1.sql` (added)
- `lib/learning/attemptsFoundation.ts` (added)
- `lib/learning/attemptsFoundation.test.ts` (added)
- `docs/learning/implementation/ATTEMPTS_FOUNDATION_V1.md` (added)
- `docs/ai/CURRENT_TASK.md` (updated)
- `docs/ai/CURSOR_REPORT.md` (updated — this file)

## Migrations created

- `supabase/migrations/20260838_learning_attempts_foundation_v1.sql`
  - Tables: `learning_attempts`, `learning_attempt_answers`
  - Indexes: one-active partial unique
    (`learning_attempts_one_active_uidx` on `(user_id, activity_id) WHERE status =
    'active'`), `(user_id, activity_id, attempt_number)` unique, plus
    user/activity/status, activity/status, course/status, user/status, started_at,
    last_activity_at, enrollment, and attempt/question indexes
  - Guard triggers: `learning_attempt_guard_immutable`
    (scope/user/attempt_number/started_at/snapshots/created_at immutable),
    `learning_attempt_answer_guard_immutable`
    (attempt_id/question_id/first_answered_at/created_at immutable)
  - Internal helpers/validators (revoked from public/anon/authenticated):
    `learning_attempt_assert_safe_text`,
    `learning_attempt_build_questions_snapshot`,
    `learning_attempt_snapshot_option_keys`,
    `learning_attempt_snapshot_blank_keys`,
    `learning_attempt_validate_answer`, `learning_attempt_expire_if_due`
  - RPCs (authenticated + service_role): `start_learning_attempt`,
    `save_learning_attempt_answer`, `get_my_learning_attempt`,
    `submit_learning_attempt`, `cancel_learning_attempt`
  - **Not applied to remote Supabase.** No prior migration (20260828–20260837)
    modified.

## Security review

- ENABLE + FORCE RLS on `learning_attempts` and `learning_attempt_answers`;
  client `INSERT/UPDATE/DELETE` revoked (RPC-only writes); `SELECT` granted to
  `authenticated` only; `service_role` full; **no anon** grant/policy.
- **Learner ownership**: learners read only their own attempts/answers
  (`user_id = auth.uid()`, answers via parent-attempt ownership). Authorized
  staff read within scope via `can_manage_learning_course(course_id)`; platform
  admins via `is_platform_admin()`. Ordinary space members see nothing.
- **Answer-key firewall**: no reference to `learning_question_answer_keys`
  anywhere in executable SQL; no learner SELECT policy on `learning_questions`
  or the keys table; the LEARNER-SAFE `questions_snapshot` is built server-side
  from published questions (prompt + options/blanks only) and never carries
  correct/accepted answers, numeric answer/tolerance, or grading metadata.
- **Server-authoritative identity**: `user_id`/`course_id`/`space_id`/
  `lesson_id`/`activity_id`, `attempt_number`, `time_limit`/`max_attempts`
  snapshots are all server-derived; never client-supplied.
- **Concurrency**: `start_learning_attempt` locks the parent activity (and
  settings) `FOR UPDATE`; `max_attempts` counted under the lock; at most one
  active attempt enforced by the partial unique index; mutating RPCs lock the
  attempt row (`learning_attempt_expire_if_due`) before acting.
- **Immutability**: guard triggers defend identity + snapshots even against
  DEFINER paths, so a live question edit can never rewrite a started attempt.
- **Fail-closed validation**: `answer_payload` is object-only ≤ 16384 bytes with
  a strict per-type key allowlist; MCQ keys must exist in the snapshot options;
  `true_false` boolean-only; `short_answer`/`fill_blank` bounded + safe-text
  (rejects HTML/JS/handlers/dangerous schemes); `fill_blank` keys must be
  declared; `numeric` valid JSON number only (no NaN/Infinity/expression). The
  response is **never** compared to any answer key (correctness out of scope).
- **Lazy expiry** uses the DB clock only (no background job); expired/cancelled
  attempts can never be submitted or reopened.
- **Audit**: `learning_audit_write` records `attempt.start`/`answer_save`/
  `submit`/`cancel`/`expire` with SAFE metadata only — never answer payloads or
  keys.
- **Progress untouched**: zero mutations to `learning_lesson_progress` /
  `learning_course_progress`; no certificates; no scoring.

## Tests

- New: `lib/learning/attemptsFoundation.test.ts` — **72 passed**.
- Full learning suite (`npx vitest run lib/learning`): **11 files, 454 tests,
  all passed** (prior learning tests still pass).
- Coverage includes: both tables schema + denormalized immutable scope; no
  scoring/correctness/grade columns; lifecycle enum (no draft) + terminal
  transitions; partial one-active unique + `(user, activity, attempt_number)`
  unique; immutability guards (identity + snapshots incl. `questions_snapshot` &
  `started_at`); answer-key firewall (never references the keys table in code;
  snapshot builder learner-safe); per-type answer validation
  (MCQ single/multiple, true_false, short_answer, fill_blank, numeric) with
  unknown-key/oversize/HTML/NaN rejection; `start` entitlement + published-chain
  gating, `FOR UPDATE` locking, max_attempts under lock, idempotent resume,
  reject when no published questions; lazy expiry (DB clock, no background job);
  save owner/active-only/snapshot-membership/first_answered_at preservation;
  submit/cancel idempotency + terminal safety; RLS learner/staff/admin reads,
  no anon; RPC-only writes + SECURITY DEFINER grants; Progress untouched;
  documentation.

## TypeScript

`npx tsc --noEmit` — **pass**.

## Build

- `npm run build` — **passed** (compiled successfully in ~53s; 59/59 static
  pages generated).

## git diff --check

- `git diff --check` — **clean** (no whitespace/conflict errors).

## git status --short

Files for the single feature commit (untracked before commit):

```
?? docs/learning/implementation/ATTEMPTS_FOUNDATION_V1.md
?? lib/learning/attemptsFoundation.test.ts
?? lib/learning/attemptsFoundation.ts
?? supabase/migrations/20260838_learning_attempts_foundation_v1.sql
```

Plus `docs/ai/CURRENT_TASK.md` and `docs/ai/CURSOR_REPORT.md` (updated).
(Untracked `.next/` build artifacts are gitignored and not part of the commit.)

## Open issues

- None blocking. Grading/scoring, learner Progress integration on submit, and
  enabling reserved question types are intended next slices.
- Migration `20260838` is committed but **not applied to remote Supabase** (per
  task constraints); apply via targeted migration later per
  `docs/DEVELOPMENT_WORKFLOW.md`.

---

## Prior report on alpha-0.2 (retained from rebase — do not lose)

### Summary

Hardened **UMTUBA Ads Platform — Ads Measurement Pipeline V1** on `alpha-0.2`
against medium findings from the final read-only review:

1. Fixed stale foundation header to include `qualified_view`
2. Added focused qualified_view signal / threshold tests
3. Added explicit dedupe namespace-separation test
4. Extended event-report contract tests for `qualified_view`
5. Extended reporting-handle resolution fail-closed lifecycle tests
6. Documented current V1 reality in
   `docs/ads/platform/05_MEASUREMENT_AND_REPORTING.md`

`productionEnabled` / `measurementEnabled` remain false. No storage, network,
Supabase, billing, auction, or product wiring.

**`app/discover/components/DiscoverShell.tsx` was not modified** (pre-existing
local dirty state left untouched).

**No commit, push, merge, or remote Supabase migration apply.**

### Exact files changed

| Path | Action |
| --- | --- |
| `lib/ads/platform/measurementFoundation.ts` | updated — header comment |
| `lib/ads/platform/measurementFoundation.test.ts` | updated — dedupe namespace test |
| `lib/ads/platform/measurementPipeline.test.ts` | updated — viewability validation tests |
| `lib/ads/platform/eventReportContracts.test.ts` | updated — qualified_view tests |
| `lib/ads/platform/reportingHandleResolution.test.ts` | updated — revoked/rotated/expired/unresolved |
| `docs/ads/platform/05_MEASUREMENT_AND_REPORTING.md` | updated — Internal Measurement Pipeline V1 section |
| `docs/ai/CURRENT_TASK.md` | updated |
| `docs/ai/CURSOR_REPORT.md` | updated |

Unrelated local dirty (untouched): `app/discover/components/DiscoverShell.tsx`

Also still dirty from the prior V1 implementation slice (unchanged in this
hardening pass except as listed above): measurement pipeline/event-flow/
resolution sources, `eventReportContracts.ts`, `reportingHandle.ts`,
`index.ts`, and related tests.

### Migrations created

None.

### Security review

- Fail-closed viewability signal validation retained (NaN / Infinity / ranges).
- Opaque handle resolution still rejects revoked / rotated / expired /
  unresolved handles without client fallback.
- Client-authoritative entity fields remain rejected on event reports.
- Flags remain disabled; no ingest / DB / network wiring added.

### Tests

Full `lib/ads/platform` suite: **21 files / 384 tests passed** (+7 vs prior 377).

### TypeScript

`npx tsc --noEmit` — **pass**.

### Build

`npm run build` — **pass**.

### git diff --check

**pass** (no whitespace errors).

### git status --short

```
 M app/discover/components/DiscoverShell.tsx
 M docs/ads/platform/05_MEASUREMENT_AND_REPORTING.md
 M docs/ai/CURRENT_TASK.md
 M docs/ai/CURSOR_REPORT.md
 M lib/ads/platform/eventReportContracts.test.ts
 M lib/ads/platform/eventReportContracts.ts
 M lib/ads/platform/index.ts
 M lib/ads/platform/measurementFoundation.test.ts
 M lib/ads/platform/measurementFoundation.ts
 M lib/ads/platform/measurementPipeline.test.ts
 M lib/ads/platform/measurementPipeline.ts
 M lib/ads/platform/reportingHandle.test.ts
 M lib/ads/platform/reportingHandle.ts
?? lib/ads/platform/measurementEventFlow.test.ts
?? lib/ads/platform/measurementEventFlow.ts
?? lib/ads/platform/reportingHandleResolution.test.ts
?? lib/ads/platform/reportingHandleResolution.ts
```

### Open issues

None for this hardening slice. DiscoverShell remains an unrelated exclusion
from any Ads commit.
