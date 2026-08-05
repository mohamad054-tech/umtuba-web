# Current Task

## Task title

AI Core Private AI Foundation onto Alpha V1 (clean port)

## Status

`implementation-in-progress` — scoped port from `office/platform-private-ai-foundation-v1` onto streaming tip; excluding Learning / Translation / Knowledge / AI Data Platform.

## Branch

`office/ai-core-private-ai-foundation-onto-alpha-v1`

## Worktree

`D:\umtuba-central\repos\umtuba-web-ai-core-private-ai-foundation-onto-alpha-v1`

## Base

`origin/office/ai-core-provider-streaming-foundation-v1` @ `0a04d59` (stacks on streaming; alpha ancestor)

## Scope (allowed)

- `lib/privateAi/**`
- `app/admin/private-ai/**`
- `supabase/migrations/20260879_private_ai_foundation_v1.sql` (local only; not remote-applied)
- `docs/architecture/PRIVATE_AI_FOUNDATION_V1.md`
- `vitest.config.ts` include `lib/privateAi/**/*.test.ts`
- AI handoff docs

## Forbidden

- Learning / Commerce / Collaboration / Mobile / Guardian
- Translation Studio / Knowledge Acquisition / AI Data Platform trees
- Other migrations (`20260872`–`20260878`)
- Live inference / weights / remote migration apply
- Alpha merge without explicit GO
