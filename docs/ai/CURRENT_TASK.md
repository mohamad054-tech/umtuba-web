# Current Task

## Task title

CHORE_RECORD_20260948_APPLIED

## Status

Record that `20260948_abuse_limits_v1` was applied manually on production 2026-09-16. Docs/comments/tests only. SQL body unchanged. Not deployed. No SQL applied from this machine.

```
TASK_ID = CHORE_RECORD_20260948_APPLIED
STATUS = COMPLETE
DATE = 2026-09-16
BRANCH = chore/record-20260948-applied
BASE = origin/release/v1 @ af28f5ea
PRODUCTION_DB = DO_NOT_TOUCH
SUPABASE_DB_PUSH = FORBIDDEN
DEPLOY = FORBIDDEN
```

## Allowed scope

- Header comment on `supabase/migrations/20260948_abuse_limits_v1.sql` only (not the SQL body).
- `docs/audit/PROD_SECURITY_SQL_2026-09-15.md` applied-list + cleanup note.
- Tests that asserted `20260948` said `NOT APPLIED`.
- Handoff docs.

## Forbidden scope

- Do not change application code.
- Do not change the SQL body of 20260948.
- Do not deploy.
- Do not apply Supabase migrations or run `supabase db push`.
