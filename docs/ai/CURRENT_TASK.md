# Current Task

## Task title

UM Learning — Learner Delivery V1

## Goal

Build the learner experience on top of approved architecture (readiness audit)
and Read Model Hardening: My Learning hub, accessible programs/courses, course
outline, lesson page, published content blocks & activities, start/resume
attempt with immutable learner-safe snapshot, save/submit/cancel, read progress
and attempt status — without exposing keys, scores, correctness, drafts, or
staff metadata, and without activating `show_result_policy`.

## Allowed scope

- `app/learning/**`
- `app/components/learning/**`
- `lib/learning/learnerDelivery.ts`
- `lib/learning/learnerDelivery.test.ts`
- `lib/learning/contentBlockRender.ts`
- `docs/learning/implementation/LEARNER_DELIVERY_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Migrations / remote Supabase apply
- Instructor UI, authoring, grading, certificates, assignments, analytics
- Learner result delivery / `show_result_policy` activation
- Service role usage
- Duplicate authorization in TypeScript
- Modules outside allowed scope (including `app/lib/nav`)
- Merge into `alpha-0.2` unless explicitly requested

## Branch

`alpha-0.2` (rebasing Learner Delivery onto `origin/alpha-0.2` @
`f8f10c3f98592de63efe56b70801a1370fa53871` Auction Foundation V1 Test Hardening)

## Status

`implemented — verified (learner-delivery 15/15, all learning 537/537, tsc, build,
git diff --check clean); rebasing onto alpha-0.2 after Ads Auction; no migrations;
not applied to Supabase.`

---

## Prior completed (Ads — preserved from alpha-0.2 @ f8f10c3)

### Ads Platform — Auction Foundation V1 Test Hardening

`completed — tip f8f10c3 on alpha-0.2; closed Final Review gaps (invalid-number,
duplicate-rank, auctionWinner-injection tests; defensive same-rank comparator;
removed inputIndex sort fallback). DiscoverShell untouched. No migrations.`

### Ads Platform — Frequency Capping Foundation V1 Test Hardening

`completed — tip 8eeb05b on alpha-0.2; closed Final Review gaps (count-above-cap,
invalid counters/caps, input immutability). DiscoverShell untouched. No migrations.`

---

## Prior completed Learning features (retained — do not lose)

### Read Model Hardening V1

`complete — tip de40a5d on alpha-0.2 lineage; migration 20260840 Git-only.`

### Scoring Foundation V1

`complete — migration 20260839 in Git only, not applied remotely.`

### Ads Platform — Ranking & Scoring Foundation V1 Test Hardening

`completed — tip 231a04a on alpha-0.2; closed Final Review gaps (edge-case tests, input immutability, reachable tie-breaks, cast reduction). DiscoverShell untouched. No migrations.`
