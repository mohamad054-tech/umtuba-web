# CURSOR_REPORT — AI Core Knowledge Acquisition Foundation onto Alpha V1

## Summary

Clean port of Knowledge Acquisition Platform Foundation onto the AI Data
Platform tip. Completes `lib/knowledgeAcquisition/**`, read-only
`/admin/knowledge` UI, and local migration `20260876`. Preserves existing
Data Platform / Private AI / Shared AI Core behavior.

## Exact refs

| Ref | Value |
|-----|-------|
| Worktree | `D:\umtuba-central\repos\umtuba-web-ai-core-knowledge-acquisition-onto-alpha-v1` |
| Branch | `office/ai-core-knowledge-acquisition-onto-alpha-v1` |
| Base | `a05e57e` |
| Source | `origin/office/platform-knowledge-acquisition-foundation-v1` |

## Feature files

- `lib/knowledgeAcquisition/**`
- `app/admin/knowledge/**`
- `supabase/migrations/20260876_knowledge_acquisition_foundation_v1.sql` (not remote-applied)
- `docs/architecture/KNOWLEDGE_ACQUISITION_PLATFORM_FOUNDATION_V1.md`
- `vitest.config.ts`

## Migrations inventory (AI local lineage)

- `20260876` knowledge acquisition — this milestone
- `20260877` AI data platform — prior
- `20260879` private AI — prior

## Security

- Admin platform-admin gated
- Fail-closed rights for training/customization
- No scraping / external download / training execution
