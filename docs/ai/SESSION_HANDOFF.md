# Session Handoff

## Active task

Translation Studio Persistence & Workflow V1

| Field | Value |
|-------|-------|
| Branch | `office/platform-translation-studio-persistence-workflow-v1` |
| Base | `aced43c844d93e0bae6cbb6a53cae25698c3cdad` (Foundation V1) |
| Worktree | `C:\Users\1\Desktop\umtuba\umtuba-web-translation-studio-persistence-workflow-v1` |
| Status | Implementation complete; staged for manual commit; not pushed |
| Migration | `supabase/migrations/20260874_translation_studio_persistence_workflow_v1.sql` — created, **not** remote-applied |

## Runtime persistence note

V1 durable store is a JSON file under `data/translation-studio/` (gitignored).
SQL migration is the future Supabase shape only.

## Next GO

1. Manual commit (no trailers)
2. Push when approved
3. Separate GO for remote migration apply
4. Separate GO for alpha merge

## Do not

- Commit/push without GO
- Apply migration remotely without GO
- Switch to other feature worktrees mid-task
