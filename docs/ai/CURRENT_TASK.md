# Current Task

## Task title

CENTRAL_UMTUBA_MODERATION_FOUNDATION_V1

## Status

**LOCAL FILE ONLY.** Additive migration written. Not applied. Not pushed. No app code changed.

```
TASK_ID = CENTRAL_UMTUBA_MODERATION_FOUNDATION_V1
STATUS = MIGRATION_WRITTEN_NOT_APPLIED
DATE = 2026-09-13
FILE = supabase/migrations/20260939_moderation_foundation_v1.sql
PRODUCTION_DB = DO_NOT_TOUCH
SUPABASE_DB_PUSH = FORBIDDEN
COMMIT = USER_REQUESTED_REPORT_AND_MIGRATION_DOCS
PUSH = USER_REQUESTED_SAME_BRANCH
APP_CODE = UNTOUCHED
```

## Allowed scope

- Additive-only migration `20260939_moderation_foundation_v1.sql`.
- No revoke, no policy drop/alter, no access restriction.

## Forbidden scope

- Do not connect to the production database.
- Do not run `supabase db push`.
- Do not commit or push.
- Do not modify application code in this task.

## Residual

Live already has 20260935–20260938 (not in this branch). This file is 20260939 so it will not collide when applied. Signup still queries `profiles` directly until a later GO.
