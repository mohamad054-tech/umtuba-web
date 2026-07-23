# UM Learning — Learner Result Delivery V1

Status: **implemented locally** (migration not applied remotely)

Migration: `supabase/migrations/20260841_learning_learner_result_delivery_v1.sql`

Depends on: Activities settings (`show_result_policy`, `evaluation_mode`),
Attempts (`submit_learning_attempt`), Scoring Foundation V1 (result tables +
evaluate helpers), Read Model Hardening, Learner Delivery UI.

Constants / types: `lib/learning/learnerResultDelivery.ts`

---

## Locked decisions

1. **Aggregate only** — no per-question correctness, earned points, or correct
   answers on the learner path.
2. **Active policies:** `immediately` and `after_submit` (identical V1
   semantics: show aggregate only when attempt is `submitted` **and** a
   `scored` result row exists).
3. **Fail-closed:** `never`, `after_close`, `manual` → `visibility = hidden`.
4. **No learner SELECT** on `learning_attempt_results` /
   `learning_attempt_answer_results`.
5. **Do not modify** `get_my_learning_attempt` — separate RPC
   `get_my_learning_attempt_result`.
6. Learners **never** EXECUTE `score_learning_attempt` or internal scoring
   helpers.

## Purpose

Expose a learner-safe aggregate score for the learner’s own submitted attempt,
gated by `show_result_policy`, without leaking answer keys, per-question
results, or staff grading metadata.

## RPC

### `get_my_learning_attempt_result(attempt_id)`

- `SECURITY DEFINER`, `search_path = public`
- `auth.uid()` required; attempt **owner** + live `has_learning_course_access`
- Missing attempt and non-owner share the same deny message (IDOR-safe)
- EXECUTE: `authenticated`, `service_role` (revoked from `public`/`anon`)
- Reads result rows **inside** the definer function only (no learner RLS widen)

Uniform payload:

| Field | Notes |
| --- | --- |
| `attempt_id` | uuid |
| `activity_id` | uuid |
| `attempt_status` | attempt lifecycle |
| `visibility` | `hidden` \| `pending_score` \| `available` |
| `result` | null, or aggregate when `available` |
| `message` | generic learner copy |

When `available`, `result` contains only:
`status=scored`, `score_earned`, `score_max`, `percentage`, `passed`,
`scored_at`.

`percentage` = `0` when `score_max = 0`; otherwise
`round((earned/max)*100, 2)`.

Never returns: keys, accepted answers, tolerances, answer payloads,
answer-result rows, `is_correct`, per-question points, `scored_by`,
evaluation/passing/max snapshots.

## Visibility matrix

| Attempt status | Policy | Result row | visibility |
| --- | --- | --- | --- |
| `active` / `expired` / `cancelled` | any | — | `hidden` |
| `submitted` | `never` / `after_close` / `manual` | any | `hidden` |
| `submitted` | `immediately` / `after_submit` | none | `pending_score` |
| `submitted` | `immediately` / `after_submit` | scored | `available` |

## Auto-score on submit

Internal helpers (EXECUTE revoked from `authenticated`):

- `learning_scoring_apply_attempt_result(attempt_id, scored_by)` — shared
  Scoring V1 algorithm (uses `learning_scoring_evaluate_answer`).
- `learning_scoring_try_auto_score_submitted_attempt(attempt_id, actor)` —
  best-effort; skips if `evaluation_mode <> auto` or a scored result already
  exists; swallows failures and audits `attempt.auto_score_failed` with safe
  metadata only.

`submit_learning_attempt` (replaced additively in this migration):

- Return payload remains lifecycle-only (`attempt_id`, `status`, `submitted_at`).
- After a successful submit (and on idempotent re-submit), calls try-auto.
- Scoring failure **does not** roll back submission → learner sees
  `pending_score` until staff re-score or a later successful auto-score.

`score_learning_attempt` still staff-only; refactored to call the shared apply
helper (behavior preserved).

## UI

- Attempt page loads result view when status is `submitted` (`force-dynamic`).
- `AttemptStatusBanner` + `LearnerResultSummary` show pending / hidden /
  aggregate available states.
- No optimistic scores; no shared CDN cache; no `dangerouslySetInnerHTML`.

## Out of scope

Per-question results, correct answers, manual/AI grading, certificates,
assignments, analytics, instructor UI, Progress mutations, `after_close` /
manual release, `after_all_attempts`, remote Supabase apply.

## Deliverables

- `supabase/migrations/20260841_learning_learner_result_delivery_v1.sql`
- `lib/learning/learnerResultDelivery.ts`
- `lib/learning/learnerResultDelivery.test.ts`
- Attempt page / banner / `LearnerResultSummary`
- this document
