# Cursor Execution Report

## Task

UM Learning OS — Read Model Hardening V1
(`office/learning-read-model-hardening-v1` from `origin/alpha-0.2` @
`23f272832faab629bc11b49e0176fe539486f2fd`).

## Summary

Additive RLS hardening so learner-facing course-tree and settings SELECT use
`has_learning_course_access` / `has_learning_program_access` with a full
published parent chain. Plain space-membership learner policies dropped.
Program catalog browse for space members retained. Staff-scoped SELECT policies
added so instructors retain draft-in-scope reads. No schema/RPC/UI changes. No
edits to `20260828`–`20260839`. No remote Supabase apply. No merge to
`alpha-0.2`.

## Exact files changed

- `supabase/migrations/20260840_learning_read_model_hardening_v1.sql` (created)
- `lib/learning/readModelHardening.ts` (created)
- `lib/learning/readModelHardening.test.ts` (created)
- `docs/learning/implementation/READ_MODEL_HARDENING_V1.md` (created)
- `docs/ai/CURRENT_TASK.md` (updated)
- `docs/ai/CURSOR_REPORT.md` (updated)

## Migrations created

- `20260840_learning_read_model_hardening_v1.sql` — policy DROP/CREATE only
  (not applied remotely)

## Policies dropped

- `Space members read accessible courses|sections|lessons|activities`
- `Members read course|section|lesson|activity|program settings`

## Policies added

- Entitled learners read published courses/sections/lessons/activities (+ settings)
- Entitled learners read published program settings (`has_learning_program_access`)
- Course staff read scoped courses/sections/lessons/activities
- Staff read * settings

## Policies retained (unchanged)

- Public discovery (programs/courses/sections/lessons)
- `Space members read accessible programs` (catalog)
- Manager / platform-admin tree policies
- Activities: no anon SELECT

## Security review

- Auth remains DB RLS only; no TypeScript authorization substitute
- Learner path does not use `is_learning_space_member` as entitlement
- Settings no longer readable by plain space members
- Prior Questions / content blocks / attempts / scoring / progress untouched

## Tests

- Read Model Hardening: **24/24** passed
- All Learning (`lib/learning`): **522/522** passed (13 files)

## TypeScript

- `npx tsc --noEmit` — **pass** (exit 0)

## Build

- `npm run build` — **pass** (exit 0)

## git diff --check

- clean (verified at close)

## git status --short

- clean after commit (feature branch pushed; not merged)

## Open issues

- Migration `20260840` (and Learning `20260828`–`20260839`) not applied to remote
  Supabase — requires explicit human approval
- Feature branch not merged into `alpha-0.2`
