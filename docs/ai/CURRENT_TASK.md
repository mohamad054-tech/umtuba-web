# Current Task

## Task title

UM Learning — Learner Result Delivery V1

## Goal

Expose learner-safe **aggregate** attempt results gated by
`show_result_policy` (`never` fail-closed; `immediately` ≡ `after_submit`
when submitted + scored). Auto-score on submit when `evaluation_mode = auto`
via internal helpers (learners never EXECUTE `score_learning_attempt`). No
per-question correctness, keys, or learner SELECT on result tables. Separate
RPC `get_my_learning_attempt_result` — do not extend `get_my_learning_attempt`.

## Allowed scope

- `supabase/migrations/20260841_learning_learner_result_delivery_v1.sql`
- `lib/learning/learnerResultDelivery.ts`
- `lib/learning/learnerResultDelivery.test.ts`
- `app/learning/attempts/[attemptId]/page.tsx`
- `app/components/learning/AttemptStatusBanner.tsx`
- `app/components/learning/AttemptPlayer.tsx`
- `app/components/learning/LearnerResultSummary.tsx`
- `lib/learning/learnerDelivery.ts` (only if wiring requires)
- `lib/learning/learnerDelivery.test.ts` (denylist alignment)
- `docs/learning/implementation/LEARNER_RESULT_DELIVERY_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Edit migrations `20260828`–`20260840`
- Learner SELECT policies on result tables
- Extending `get_my_learning_attempt` with scores
- Per-question results / correct answers / keys
- `after_close` / `manual` release behavior
- Manual/AI grading, certificates, assignments, analytics, instructor UI
- Progress mutations
- Remote Supabase apply
- Commit / push / merge into `alpha-0.2` unless explicitly requested

## Branch

`office/learning-learner-result-delivery-v1` from `alpha-0.2` @
`489688c6744f5466e65682d56863b2267f54f7cb` (rebase base; Ads Fraud/IVT
hardening on alpha)

## Status

`implemented — verified (result delivery 23/23, learner delivery 16/16, all
learning 561/561, tsc, build, git diff --check clean); migration 20260841
Git-only; not applied to Supabase; not committed/pushed/merged.`

---

## Prior completed (alpha-0.2 latest)

### Ads Platform — Fraud & Invalid Traffic Foundation V1 Hardening

**Goal (completed on alpha):** Close Final Review findings for Fraud & Invalid
Traffic Foundation V1: explicit non-boolean / trust-level fail-closed tests,
rejectionReason ↔ classification consistency in result validators, and
crafted-result coverage. Preserve runtime first-match IVT order and kill
switches off.

**Allowed scope (Ads slice):** `lib/ads/platform/fraud*`,
`lib/ads/platform/invalidTraffic*`, `lib/ads/platform/index.ts` (unchanged
unless required), AI handoff docs.

**Forbidden (Ads slice):** `DiscoverShell.tsx`; Learning / Store / World /
Messages / Live; unrelated Ads modules; migrations / remote apply; commit /
push unless requested.

**Status:** `implemented — verified (fraud 12/12, invalidTraffic 12/12,
lib/ads/platform 649/649, tsc, build, git diff --check clean); Final Review
gaps closed; DiscoverShell untouched; no migrations.`

---

## Prior completed

### Learner Delivery V1

`complete on alpha-0.2 lineage; no migrations; show_result_policy inert until
this Result Delivery slice.`

### Read Model Hardening V1 / Scoring Foundation V1

`complete — migrations 20260839–20260840 Git-only.`
