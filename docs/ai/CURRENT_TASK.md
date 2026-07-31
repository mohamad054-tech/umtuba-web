# Current Task

## Task title

Private AI Workflow & Lifecycle V1

## Status

`implementation-complete` — uncommitted on clean final worktree; awaiting GO (no commit / no push)

## Resume here (next session / next GO)

1. Worktree: `C:\Users\1\Desktop\umtuba\umtuba-web-private-ai-workflow-lifecycle-v1-final`
2. Branch: `office/platform-private-ai-workflow-lifecycle-v1-final`
3. Base: `origin/office/platform-shared-ai-surface-integration-v1` @ `b0655bb`
4. Manual commit (no trailers) → push when approved → verify `0 0`
5. Do **not** apply migration `20260880` to remote without explicit approval

## Branch

`office/platform-private-ai-workflow-lifecycle-v1-final`

## Platform track (facts)

| Track | Status |
| --- | --- |
| Gemini Live Provider V1 | Complete & pushed (`30bda6a`) |
| Shared AI Surface Integration V1 | Complete & pushed (`b0655bb`) |
| Private AI Workflow & Lifecycle V1 | Current task (this worktree) |

## Allowed scope

- `app/admin/private-ai/**` (lifecycle UI + server actions)
- `lib/privateAi/**` (lifecycle, readiness, audit, permissions, tests)
- `docs/architecture/PRIVATE_AI_WORKFLOW_LIFECYCLE_V1.md`
- `supabase/migrations/20260880_private_ai_workflow_lifecycle_v1.sql` (local only)
- Handoff docs for this task

## Forbidden scope

- Commit / push / merge without GO
- Remote apply of `20260880`
- Training / fine-tuning / private inference / weights
- Reworking Gemini adapter or Shared AI surface wiring without need
- Cleaning / resetting mixed older worktrees
