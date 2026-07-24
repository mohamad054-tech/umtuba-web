# Current Task

## Task title

UM Learning — Instructor Authoring Foundation V1 (Phase 0–3)

## Goal

Ship instructor surface under `/learning/instructor` for Learning space
create/publish/archive using existing RPCs. No migrations. No RPC redesign.

## Allowed scope

- `lib/learning/instructorAuthoring.ts`
- `lib/learning/instructorAuthoring.test.ts`
- `app/learning/instructor/**`
- `app/components/learning/instructor/**`
- `docs/learning/implementation/INSTRUCTOR_AUTHORING_FOUNDATION_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Migrations / Supabase schema / RPC redesign
- Learner route changes under `/learning` (non-instructor)
- Service role
- Program → activity curriculum UI (later phases)
- Content blocks / questions / enrollments UI
- Commit/push outside current branch without approval

## Branch

`office/learning-progress-mutations-v1`

## Status

`complete` — Phase 0–3 PASS (commit/push pending)
