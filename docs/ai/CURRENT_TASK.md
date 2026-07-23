# Current Task

## Task title

UM Learning OS — Attempts Foundation V1

## Goal

DB-authoritative foundation for **learner attempts** against an authored Activity
(Activity → Attempt → Attempt Answers; no scoring, grading, or correctness in
V1). Exactly TWO tables:

- `learning_attempts` — a learner's server-owned session against exactly one
  **published** Activity. Denormalizes immutable `space_id`/`course_id`/
  `lesson_id`/`activity_id` (mirroring Progress) for entitlement gating + scoped
  staff reads. Lifecycle `active → submitted|expired|cancelled` (terminal; no
  reopen; **no draft**). Immutable identity + snapshots (`attempt_number`,
  `started_at`, `time_limit_seconds_snapshot`, `max_attempts_snapshot`,
  `questions_snapshot`, `created_at`). A server-generated **LEARNER-SAFE**
  `questions_snapshot` (published questions only, ordered, prompt +
  options/blanks) is embedded at start and is immutable, so live question edits
  never rewrite a started attempt. **No** score/passed/grade columns.
- `learning_attempt_answers` — one saved learner response per
  `(attempt_id, question_id)`, `answer_payload` jsonb (learner response only,
  per-type structural validation). Immutable `attempt_id`/`question_id`/
  `first_answered_at`/`created_at`. **No** answer key / correctness / score.

RPC-only writes (`SECURITY DEFINER` + `search_path = public`), ENABLE + FORCE
RLS both tables, server identity via `auth.uid()`. RPCs: `start_learning_attempt`,
`save_learning_attempt_answer`, `get_my_learning_attempt`,
`submit_learning_attempt`, `cancel_learning_attempt`. Lazy expiry (no background
job). **Answer-key firewall**: never reads/joins/returns
`learning_question_answer_keys`; no learner SELECT policy added to
`learning_questions` or the keys table. Zero Progress mutations. No remote
Supabase apply.

## Allowed scope

- `supabase/migrations/20260838_learning_attempts_foundation_v1.sql`
- `lib/learning/attemptsFoundation.ts`
- `lib/learning/attemptsFoundation.test.ts`
- `docs/learning/implementation/ATTEMPTS_FOUNDATION_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Scoring, correctness flags, points, grades, pass/fail, partial credit,
  manual/AI grading, certificates, assignments, question banks, randomization,
  adaptive delivery, analytics, offline sync, background expiry jobs
- UI / routes / React components; any Progress mutation
  (`learning_lesson_progress` / `learning_course_progress`)
- Answer-key delivery: reading/joining/returning
  `learning_question_answer_keys`; learner SELECT policy on `learning_questions`
  or the keys table; leaking keys in RPCs/audit/errors
- A separate events table (audit only via `learning_audit_write`)
- Accepting client-forged `user_id` / `course_id` / `space_id` / `lesson_id` /
  `max_attempts` / `time_limit`; reopening a terminal attempt
- Modifying prior migrations (`20260828`–`20260837`)
- Applying migrations to remote Supabase

## Branch

`office/learning-attempts-foundation-v1`

## Status

`implemented — verified (attempts tests 72/72, all learning tests 454/454, tsc,
build, git diff --check clean); committed + pushed feature branch, then rebased
onto origin/alpha-0.2 (no remote migration apply, not merged into alpha-0.2).`

---

## Prior task on alpha-0.2 (retained from rebase — do not lose)

### Task title

UMTUBA Ads Platform — Ads Measurement Pipeline V1 Final Hardening

### Goal

Close medium findings from the Measurement Pipeline V1 final review: stale
foundation header comment, focused qualified_view / dedupe / resolution /
event-report tests, and an explicit Internal Measurement Pipeline V1 section in
platform measurement docs. Internal / contract-only — no production delivery.

### Allowed scope

- `lib/ads/platform/measurementPipeline.ts`
- `lib/ads/platform/measurementPipeline.test.ts`
- `lib/ads/platform/measurementFoundation.ts`
- `lib/ads/platform/measurementFoundation.test.ts`
- `lib/ads/platform/measurementEventFlow.ts`
- `lib/ads/platform/measurementEventFlow.test.ts`
- `lib/ads/platform/reportingHandleResolution.ts`
- `lib/ads/platform/reportingHandleResolution.test.ts`
- `lib/ads/platform/reportingHandle.ts`
- `lib/ads/platform/reportingHandle.test.ts`
- `lib/ads/platform/eventReportContracts.ts`
- `lib/ads/platform/eventReportContracts.test.ts`
- `lib/ads/platform/index.ts`
- `docs/ads/platform/05_MEASUREMENT_AND_REPORTING.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

### Forbidden scope

- `app/discover/components/DiscoverShell.tsx` (unrelated local changes — do not touch)
- Billing / auction / bidding / payments / production delivery / fraud / AI ranking
- Migrations / remote Supabase apply
- Enabling `ADS_DELIVERY_ENABLED` or placement flags
- Event storage, network, Supabase imports, product surface wiring
- Unrelated refactors outside the measurement pipeline contracts
- Commit / push without explicit approval

### Branch

`alpha-0.2`

### Status

`hardened locally — verified (tsc, platform tests 384/384, build); no commit/push.`
