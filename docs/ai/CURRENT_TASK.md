# Current Task

## Task title

UM Learning OS — Scoring Foundation V1

## Goal

Implement the approved Scoring Foundation V1 architecture
(`docs/learning/implementation/SCORING_FOUNDATION_V1.md`): separate result
tables, `score_learning_attempt` RPC, points-only snapshot extension, fail-closed
exact-match auto scoring for submitted attempts, staff-only RLS — without
Progress mutations, learner result delivery, or remote migration apply.

Locked decisions (Decision Log D1–D10):

1. Separate result tables (`learning_attempt_results` +
   `learning_attempt_answer_results`)
2. Dedicated `score_learning_attempt` RPC (not inside submit)
3. Snapshot gains `points` only — never answer keys
4. Fail closed when any answer key is missing at score time
5. Exact match only (no partial credit)
6. Staff-only result visibility (RLS)
7. Auto evaluation only (`evaluation_mode = 'auto'`)
8. No Progress mutations
9. No learner result delivery
10. Submitted attempts only are scoreable

## Allowed scope

- `supabase/migrations/20260839_learning_scoring_foundation_v1.sql`
- `lib/learning/scoringFoundation.ts`
- `lib/learning/scoringFoundation.test.ts`
- `docs/learning/implementation/SCORING_FOUNDATION_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Modifying prior migrations (`20260828`–`20260838`)
- UI / routes / React components
- Progress mutations; learner result delivery; answer-key delivery to learners
- Partial credit, manual/AI grading, certificates, analytics, assignments
- Applying migrations to remote Supabase
- Merge into `alpha-0.2` unless explicitly requested

## Branch

`office/learning-scoring-foundation-v1` (rebased onto `origin/alpha-0.2` @
`485fa0a1f15ce433b222ddcb10c9460474819a0d`)

## Status

`implemented — rebased onto origin/alpha-0.2 @ 485fa0a; verified; FF merge +
push to alpha-0.2 in closing session; migration not applied remotely.`

---

## Prior Ads work on alpha-0.2 (retained from rebase — do not lose)

### Task title

UMTUBA Ads Platform — Internal Delivery Pilot V1

### Goal

Implement Internal Delivery Pilot V1 as an internal orchestration layer that sits
after the Execution Layer:

Candidate Selection → Render Descriptor Pipeline → Execution Layer →
Internal Delivery Pilot

Accept a validated execution internal result, perform internal delivery
validation, emit a typed internal delivery result with diagnostics, fail
closed, and freeze immutable outputs. No production ad delivery.

### Allowed scope

- `lib/ads/platform/internalDeliveryPilot*`
- `lib/ads/platform/index.ts`
- Direct supporting contracts only if strictly required (imports only)
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

### Forbidden scope

- `app/discover/components/DiscoverShell.tsx` (unrelated local changes — do not touch)
- Learning / Store / World / Messages / Live
- Unrelated Ads module modifications
- Production delivery / rendering / auction / ranking / billing / payments
- Network / database / Supabase / feature flags
- Migrations / remote Supabase apply
- Commit / push without explicit approval

### Branch

`alpha-0.2` (present on rebase base `485fa0a`)

### Status

`complete — V1 test gap closure: identity_incomplete + placement_incompatible
soft-reject tests added; V1 18/18, foundation 12/12, platform 466/466; tsc,
build, diff --check clean; production code unchanged; retained intact under
Scoring rebase.`

---

## Prior completed Learning feature (retained — do not lose)

### Task title

UM Learning OS — Attempts Foundation V1

### Goal

DB-authoritative foundation for learner attempts (Activity → Attempt → Attempt
Answers; no scoring in that slice). Migration `20260838`, constants in
`lib/learning/attemptsFoundation.ts`, doc
`docs/learning/implementation/ATTEMPTS_FOUNDATION_V1.md`.

### Status

`implemented — verified (attempts tests 72/72, all learning tests 454/454, tsc,
build, git diff --check clean); committed + pushed feature branch, then rebased
onto origin/alpha-0.2 (no remote migration apply). Merged into Learning backbone
on alpha-0.2 per product handoff.`
