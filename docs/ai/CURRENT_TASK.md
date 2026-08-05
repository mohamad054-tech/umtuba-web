# Current Task

## Task title

AI Core Data Platform Foundation onto Alpha V1 (clean port)

## Status

`implementation-in-progress`

## Branch

`office/ai-core-data-platform-foundation-onto-alpha-v1`

## Worktree

`D:\umtuba-central\repos\umtuba-web-ai-core-data-platform-foundation-onto-alpha-v1`

## Base

`origin/office/ai-core-private-ai-foundation-onto-alpha-v1` @ `e8f2e4b`

## Scope

- `lib/aiDataPlatform/**`
- `app/admin/ai-data/**`
- `supabase/migrations/20260877_ai_data_platform_foundation_v1.sql` (local only)
- `docs/architecture/AI_DATA_PLATFORM_FOUNDATION_V1.md`
- Minimal KA support modules required by Data Platform:
  - `lib/knowledgeAcquisition/types.ts`
  - `lib/knowledgeAcquisition/rightsEngine.ts`
  - `lib/knowledgeAcquisition/qualityEngine.ts`
- `vitest.config.ts` include `lib/aiDataPlatform/**/*.test.ts`
- AI handoff docs

## Forbidden

- Commerce / Learning / Collaboration / Mobile / Guardian
- Full Knowledge Acquisition admin/migration (separate milestone)
- Remote migration apply
- Alpha merge without GO
