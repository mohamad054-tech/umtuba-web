# Current Task

## Task title

UM Learning OS — Read Model Hardening V1

## Goal

Align learner-facing SELECT on the course tree and settings with
`has_learning_course_access` / `has_learning_program_access`, removing plain
space-membership over-grant (and enrolled non-member under-grant), while keeping
program catalog browse for space members.

Locked decisions:

1. Keep space-member published program catalog (not entitlement-only)
2. Course tree learner SELECT via `has_learning_course_access`
3. Full published parent chain required for learner reads
4. Settings SELECT: staff or entitled only
5. Additive migration `20260840` only (no edits to `20260828`–`20260839`)

## Allowed scope

- `supabase/migrations/20260840_learning_read_model_hardening_v1.sql`
- `lib/learning/readModelHardening.ts`
- `lib/learning/readModelHardening.test.ts`
- `docs/learning/implementation/READ_MODEL_HARDENING_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Modifying prior migrations (`20260828`–`20260839`)
- Attempts / Scoring / Questions / Progress
- UI / routes / React components
- TypeScript authorization substitute for RLS
- Applying migrations to remote Supabase
- Merge into `alpha-0.2` unless explicitly requested

## Branch

`office/learning-read-model-hardening-v1` (from `origin/alpha-0.2` @
`23f272832faab629bc11b49e0176fe539486f2fd`)

## Status

`implemented — verified (read-model 24/24, all learning 522/522, tsc, build,
git diff --check clean); committed + pushed feature branch only; migration not
applied remotely; not merged to alpha-0.2.`

---

## Prior completed Learning feature (retained — do not lose)

### Task title

UM Learning OS — Scoring Foundation V1

### Status

`complete — on alpha-0.2 @ 23f2728; migration 20260839 in Git only, not applied
remotely.`
