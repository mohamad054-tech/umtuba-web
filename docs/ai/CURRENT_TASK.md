# Current Task

## Task title

CENTRAL_UMTUBA_UGC_SIGNED_IN_VISIBILITY_POSTGREST_FIX_V1

## Status

**IN PROGRESS → LOCAL COMPLETE after quality gates.** TypeScript-only hotfix. Do not commit until the owner asks.

```
TASK_ID = CENTRAL_UMTUBA_UGC_SIGNED_IN_VISIBILITY_POSTGREST_FIX_V1
STATUS = LOCAL_COMPLETE
DATE = 2026-09-14
BRANCH = feat/legal-pages-v1
BASE_HEAD = e3431744996750301ea9545056fd804683343ed6
PRODUCTION_DB = DO_NOT_TOUCH
SUPABASE_DB_PUSH = FORBIDDEN
MIGRATION = NONE
COMMIT = FORBIDDEN_UNLESS_USER_ASKS
```

## Allowed scope

- Rewrite the signed-in branch of `applyViewerVisibility` so PostgREST accepts it.
- Keep the same visibility boolean as `post_is_visible_to_viewer` / `isPostVisibleToViewer`.
- Keep the anonymous path unchanged.
- Keep one shared helper. Do not inline the rule.
- Add PostgREST `code` + `message` to the Home/Discover server log in `videoPostsServer.ts`. Do not leak that to the client.
- Tests for signed-in and anonymous built query strings.

## Forbidden scope

- Do not change the visibility rule.
- Do not touch RLS.
- Do not filter `/admin/moderation`.
- Do not add or apply a migration.
- Do not connect to production or run `supabase db push`.
- Do not commit or push unless the owner asks.
