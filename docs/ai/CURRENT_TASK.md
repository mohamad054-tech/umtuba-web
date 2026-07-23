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

`office/learning-learner-delivery-v1` (rebasing onto `alpha-0.2` @
`8eeb05b9f636ed2dfe90b3a4651d88ed529eba0c`)

## Status

`implemented — verified (learner-delivery 15/15, all learning 537/537, tsc, build,
git diff --check clean); committed + pushed feature branch only; no migrations;
not applied to Supabase; not merged to alpha-0.2.`

---

## Prior completed (Ads — preserved from alpha-0.2 @ 8eeb05b)

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