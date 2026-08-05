# CURSOR_REPORT — AI Core Data Platform Workflow & Dataset Approval onto Alpha V1

## Summary

Clean port of AI Data Platform Workflow & Dataset Approval onto the Knowledge
Acquisition tip. Adds dataset approval lifecycle, fail-closed validation
gates, audit trail, and read-only review/audit admin pages. Preserves Data
Platform foundation and Knowledge Acquisition behavior.

## Exact refs

| Ref | Value |
|-----|-------|
| Worktree | `D:\umtuba-central\repos\umtuba-web-ai-core-data-platform-workflow-dataset-approval-onto-alpha-v1` |
| Branch | `office/ai-core-data-platform-workflow-dataset-approval-onto-alpha-v1` |
| Base | `c2f30e9` |
| Source | `origin/office/platform-ai-data-platform-workflow-v1` |

## Feature files

- `lib/aiDataPlatform/workflow/**`
- `lib/aiDataPlatform/aiDataPlatformWorkflow.test.ts`
- `lib/aiDataPlatform/index.ts`
- `app/admin/ai-data/AiDataPlatformShell.tsx`
- `app/admin/ai-data/review/page.tsx`
- `app/admin/ai-data/audit/page.tsx`
- `supabase/migrations/20260878_ai_data_platform_workflow_approval_v1.sql` (not remote-applied)
- `docs/architecture/AI_DATA_PLATFORM_WORKFLOW_APPROVAL_V1.md`
- `docs/architecture/AI_DATA_PLATFORM_FOUNDATION_V1.md` (workflow pointer)

## Migrations inventory (AI local lineage)

- `20260876` knowledge acquisition
- `20260877` AI data platform
- `20260878` workflow approval — this milestone
- `20260879` private AI

## Security

- Approval never automatic; fail-closed rights/privacy/quality gates
- Audit trail records actor, states, reason
- Admin platform-admin gated
