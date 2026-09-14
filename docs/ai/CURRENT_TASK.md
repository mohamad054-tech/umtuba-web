# Current Task

## Task title

CENTRAL_UMTUBA_UGC_POST_VIEWER_VISIBILITY_V1

## Status

**IN PROGRESS → LOCAL COMPLETE after quality gates.** Migrations written, not applied. Do not commit until the owner asks.

```
TASK_ID = CENTRAL_UMTUBA_UGC_POST_VIEWER_VISIBILITY_V1
STATUS = LOCAL_COMPLETE
DATE = 2026-09-14
BRANCH = feat/legal-pages-v1
BASE_HEAD = c7dd4d68af428f59790fa026b371c8906157e2f8
PRODUCTION_DB = DO_NOT_TOUCH
SUPABASE_DB_PUSH = FORBIDDEN
MIGRATION = supabase/migrations/20260944_ugc_post_viewer_visibility_v1.sql
PRIOR_MIGRATION = supabase/migrations/20260943_ugc_moderation_operator_actions_v1.sql
COMMIT = FORBIDDEN_UNLESS_USER_ASKS
```

## Allowed scope

- Shared helper `lib/supabase/postVisibility.ts` (`applyViewerVisibility`, `isPostVisibleToViewer`).
- Wire every listed public post surface through that helper.
- Additive print-only migration `20260944` (profile stats, interaction RPCs, journey).
- Owner "removed" state on Watch / Discover / Life / profile grid.
- i18n key `feed.postRemoved`.
- Tests for the helper + SQL/surface contract.

## Forbidden scope

- Do not touch RLS.
- Do not widen any public surface for platform admins.
- Do not filter `/admin/moderation`.
- Do not connect to production or run `supabase db push`.
- Do not apply `20260943` or `20260944`.
- Do not commit or push unless the owner asks.
