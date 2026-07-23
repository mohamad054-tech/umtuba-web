# Cursor Execution Report

## Task

UM Learning OS — Scoring Foundation V1
(`office/learning-scoring-foundation-v1` rebased onto `origin/alpha-0.2` @
`485fa0a1f15ce433b222ddcb10c9460474819a0d`).

## Summary

Closing rebase of Scoring Foundation V1 onto latest `origin/alpha-0.2` (Ads
Internal Delivery Pilot V1 @ `485fa0a`). Scoring implementation unchanged:

- Migration `20260839`: tables `learning_attempt_results` +
  `learning_attempt_answer_results`; additive REPLACE of
  `learning_attempt_build_questions_snapshot` (points only); helpers
  `learning_scoring_normalize_short_answer` /
  `learning_scoring_evaluate_answer`; staff-only RLS; RPC
  `score_learning_attempt` (fail closed, exact match, auto only, submitted
  only, no Progress, no learner delivery).
- Constants/types + contract tests in `lib/learning/scoringFoundation*.ts`.
- Docs updated for closing handoff (Learning current + Ads Internal Delivery
  Pilot retained).

Conflicts limited to `docs/ai/CURRENT_TASK.md` and `docs/ai/CURSOR_REPORT.md`.
Migration `20260839` and Scoring/Ads code paths had no content conflicts. No
prior migrations modified. No remote Supabase apply.

### Ads base retained from alpha (do not lose)

Alpha HEAD `485fa0a` Internal Delivery Pilot V1 (foundation split + test gap
closure) remains on this branch unchanged. Prior Ads slices on the same line
(Execution Layer, Render Descriptor, Candidate Selection) remain present. No
Learning↔Ads code overlap.

## Exact files changed

- `supabase/migrations/20260839_learning_scoring_foundation_v1.sql` (created)
- `lib/learning/scoringFoundation.ts` (created)
- `lib/learning/scoringFoundation.test.ts` (created)
- `docs/learning/implementation/SCORING_FOUNDATION_V1.md` (updated)
- `docs/ai/CURRENT_TASK.md` (updated — Scoring current + Ads retained)
- `docs/ai/CURSOR_REPORT.md` (this report)

## Migrations created

- `supabase/migrations/20260839_learning_scoring_foundation_v1.sql`
  (**not** applied remotely — Git-only with `20260828`–`20260838`)

### Tables

1. `learning_attempt_results` — 1:1 with scored attempt; denormalized scope;
   `score_earned` / `score_max` / `passed`; settings snapshots; staff-only RLS
2. `learning_attempt_answer_results` — per snapshotted question exact-match
   row (`is_correct`, `points_possible`, `points_earned`)

### RPCs / helpers

- `score_learning_attempt(uuid)` — sole Scoring RPC (staff only)
- `learning_scoring_evaluate_answer` — exact-match evaluator (revoked)
- `learning_scoring_normalize_short_answer` — trim/case_sensitive (revoked)
- `learning_attempt_build_questions_snapshot` — additive REPLACE adds `points`

## Security review

- Separate result tables; RPC-only writes; ENABLE + FORCE RLS; staff SELECT only
  (managers + platform admins); **no** learner owner policy; no anon.
- Answer keys read only inside SECURITY DEFINER score path; never snapshotted,
  returned, or audited as payloads.
- Fail closed: missing keys, non-`auto` mode, non-`submitted`, pre-extension
  snapshots missing `points`.
- No Progress mutations; no learner result delivery RPC.
- Ads Internal Delivery Pilot remains internal/contract-only (kill switches
  false; no production delivery).

## Tests

- Scoring: `44/44` passed (`lib/learning/scoringFoundation.test.ts`)
- All Learning: `498/498` passed (`npx vitest run lib/learning`)
- Ads platform: revalidated after rebase (`npx vitest run lib/ads/platform`)

## TypeScript

- `npx tsc --noEmit` — passed

## Build

- `npm run build` — passed

## git diff --check

- Clean (no whitespace errors)

## git status --short

(Filled after FF merge + push to `alpha-0.2`.)

## Open issues

- Migration `20260839` (and Learning `20260828`–`20260838`) remain Git-only
  until explicitly applied remotely.
- Pre-extension attempts (snapshots without `points`) remain unscoreable until
  learners start new attempts after the migration is applied.
