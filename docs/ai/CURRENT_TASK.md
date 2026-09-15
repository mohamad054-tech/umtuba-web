# Current Task

## Task title

CENTRAL_UMTUBA_VIDEO_MORE_MENU_V1

## Status

Implementing video More menu on Home Discover and Watch feeds. Do not deploy. Do not apply SQL.

```
TASK_ID = CENTRAL_UMTUBA_VIDEO_MORE_MENU_V1
STATUS = IN_PROGRESS
DATE = 2026-09-15
BRANCH = feat/video-more-menu-v1
BASE = origin/release/v1 @ cd3a479e
PRODUCTION_DB = DO_NOT_TOUCH
SUPABASE_DB_PUSH = FORBIDDEN
DEPLOY = FORBIDDEN
```

## Allowed scope

- Home Discover rail + Watch rail More menu (copy link, edit caption, not interested, report, delete).
- i18n keys for all 13 locales.
- New caption RPC migration file only (do not apply).

## Forbidden scope

- Do not deploy.
- Do not apply Supabase migrations or run `supabase db push`.
- Do not merge into other branches.
