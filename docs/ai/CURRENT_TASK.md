# Current Task

## Task title

CENTRAL_UMTUBA_RELEASE_V1_LEARNING_HUB_MERGE_V1

## Status

**PUSH AUTHORIZED.** Local `release/v1` created from `origin/feat/legal-pages-v1` (`4cb958c5`) and merged only `origin/desktop/learning-hub-safe-integration-v1` (`8a592bb1`). Quality gates passed. Push `origin/release/v1` only. Do not merge into any other branch.

```
TASK_ID = CENTRAL_UMTUBA_RELEASE_V1_LEARNING_HUB_MERGE_V1
STATUS = LOCAL_COMPLETE
DATE = 2026-09-15
BRANCH = release/v1
HEAD = 9637960f320d897b86a64b5831a29d7a91b0cb33
BASE = origin/feat/legal-pages-v1 @ 4cb958c5
MERGED = origin/desktop/learning-hub-safe-integration-v1 @ 8a592bb1
DEFERRED = feat/store-catalog-540
EXCLUDED = fix/feed-audio-persistence
PRODUCTION_DB = DO_NOT_TOUCH
SUPABASE_DB_PUSH = FORBIDDEN
PUSH = ORIGIN_RELEASE_V1_ONLY
MERGE_ELSEWHERE = FORBIDDEN
```

## Allowed scope

- Create `release/v1` from `origin/feat/legal-pages-v1`.
- Merge only `origin/desktop/learning-hub-safe-integration-v1`.
- Resolve the 11 expected conflicts by keeping both sides (i18n catalogs + AppChrome SiteFooter + FeedMuteProvider).
- Verify the release checklist locally.

## Forbidden scope

- Do not merge `feat/store-catalog-540`.
- Do not merge `fix/feed-audio-persistence`.
- Do not merge `release/v1` into any other branch.
- Do not apply Supabase migrations.
- Do not connect to production or run `supabase db push`.
