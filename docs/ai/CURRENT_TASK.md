# Current Task

## Task title

AI Data Platform Workflow & Dataset Approval V1

## Status

`implementation-complete` — staged for manual commit (no trailers). Not pushed.

## Resume here (next session / next GO)

1. Worktree: `C:\Users\1\Desktop\umtuba\umtuba-web-ai-data-platform-workflow-v1`
2. Branch: `office/platform-ai-data-platform-workflow-v1`
3. Base: `b33054f` (AI Data Platform Foundation; requested `3b3054fa` was a typo)
4. Manual commit (no trailers) → push when approved
5. Do not train/fine-tune/infer; do not apply migrations remotely

## Branch

`office/platform-ai-data-platform-workflow-v1`

## Allowed scope

- `lib/aiDataPlatform/workflow/**`
- `lib/aiDataPlatform/index.ts` / workflow tests
- `app/admin/ai-data/**` (review, audit, shell nav)
- `supabase/migrations/20260878_ai_data_platform_workflow_approval_v1.sql` (local only)
- Handoff + architecture docs

## Forbidden scope

- Training / fine-tuning / inference / benchmark execution
- Dataset download / scraping / external integrations
- AI provider or runtime AI changes
- Commit / push / remote migration apply without GO
- Git trailers
- Switching unrelated branches or worktrees
