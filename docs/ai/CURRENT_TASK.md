# Current Task

## Task title

FIX_RECORD_UNAPPLIED_20260946_48_V1

## Status

Correct 20260947 posts SELECT to keep 20260944 viewer visibility, and mark 20260946–48 headers as not applied. Do not apply SQL. Do not deploy.

```
TASK_ID = FIX_RECORD_UNAPPLIED_20260946_48_V1
STATUS = COMPLETE
DATE = 2026-09-16
BRANCH = fix/record-unapplied-20260946-48-v1
WORKTREE = D:\umtuba-central\repos\umtuba-web-fix-unapplied-migrations-v1
BASE = origin/release/v1 @ 8ff932aac4280a0c232ceb50ea53286bc249ea8d
PRODUCTION_DB = DO_NOT_TOUCH
SUPABASE_DB_PUSH = FORBIDDEN
DEPLOY = FORBIDDEN
PUSH = FORBIDDEN
```

## Allowed scope

- `supabase/migrations/20260947_posts_articles_rls_lockdown_v1.sql` SELECT policy + header.
- First-line headers on `20260946`, `20260947`, `20260948`.
- Tests that asserted `APPLIED MANUALLY TO PRODUCTION` on 20260948.
- Short handoff docs.

## Forbidden scope

- Do not change other SQL bodies.
- Do not apply SQL or run `supabase db push`.
- Do not deploy. Do not push.
