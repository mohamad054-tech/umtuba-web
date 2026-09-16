# Current Task

## Task title

CHORE_RECORD_20260945_48_APPLIED_HEADER_TRUTH_V1

## Status

Merged the unapplied-header correction into `release/v1`, then recorded that `20260945`–`20260948` ARE applied on production as of 2026-09-16. Comments/tests/handoff only. SQL bodies unchanged. Not deployed. No SQL applied from this machine.

```
TASK_ID = CHORE_RECORD_20260945_48_APPLIED_HEADER_TRUTH_V1
STATUS = COMPLETE
DATE = 2026-09-16
BRANCH = release/v1
WORKTREE = D:\umtuba-central\repos\umtuba-web-release-v1-header-truth-v1
BASE = origin/release/v1 @ 8ff932aa
MERGED = ca80dc28 (no-ff; origin/fix/record-unapplied-20260946-48-v1 was missing)
PRODUCTION_DB = DO_NOT_TOUCH
SUPABASE_DB_PUSH = FORBIDDEN
DEPLOY = FORBIDDEN
PUSH = FORBIDDEN
```

## Allowed scope

- Merge `ca80dc28` into `release/v1`.
- Header/comment updates on `20260945`–`20260948` (SQL bodies unchanged).
- Comment-only rephrase of leftover `NOT APPLIED` / `ALREADY APPLIED` strings in other `supabase/migrations/*.sql` files so that grep is empty.
- Tests that asserted `NOT APPLIED TO PRODUCTION` on 20260948.
- Handoff docs.

## Forbidden scope

- Do not change application code.
- Do not change SQL bodies.
- Do not deploy.
- Do not apply Supabase migrations or run `supabase db push`.
- Do not push `release/v1`.
