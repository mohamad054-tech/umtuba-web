# Current Task

## Task title

CENTRAL_UMTUBA_SECURITY_BATCH3_V1

## Status

Signed URL leak fix + abuse-limit migration (not applied) + app-level action throttles. Not deployed. SQL not applied.

```
TASK_ID = CENTRAL_UMTUBA_SECURITY_BATCH3_V1
STATUS = COMPLETE
DATE = 2026-09-15
BRANCH = fix/security-batch3-v1
BASE = origin/release/v1 @ 79b2676c
PRODUCTION_DB = DO_NOT_TOUCH
SUPABASE_DB_PUSH = FORBIDDEN
DEPLOY = FORBIDDEN
```

## Allowed scope

- SSR signed `post-videos` URL leak (home/Discover, Watch, Life, profile, other SSR feeds).
- Reuse `refreshWatchPlaybackAction` for on-demand / neighbor remint.
- New migration `20260948_abuse_limits_v1.sql` only (do not apply).
- In-memory server-action rate limits for view/share/watch-signal/commerce/report/caption.
- Docs note that 20260948 is not applied.
- Related tests.

## Forbidden scope

- Do not deploy.
- Do not apply Supabase migrations or run `supabase db push`.
- Do not merge into other branches.
