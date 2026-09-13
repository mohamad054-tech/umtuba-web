# Current Task

## Task title

DESKTOP_UMTUBA_PRODUCTION_HOME_SUPABASE_ENV_P0_RELEASE_V1

## Status

**COMPLETE.** Central-authorized same-SHA production rebuild and switch. Home no longer throws after hydration. Brand candidate not deployed. Parent dirty checkout preserved.

```
TASK_ID = DESKTOP_UMTUBA_PRODUCTION_HOME_SUPABASE_ENV_P0_RELEASE_V1
STATUS = COMPLETE
DATE = 2026-08-29
SOURCE_SHA = b2c0bbd1aeb423c4f5aa7410c48c407989f30d1c
SOURCE_SHA_VERIFIED = YES
PRODUCTION_PUBLIC_ENV_PRESENT_AT_BUILD = YES
PUBLIC_URL_INLINED_IN_CLIENT_BUNDLE = YES
BUILD = PASS
PRODUCTION_DEPLOYED = YES
LIVE_RELEASE = /opt/umtuba/production/releases/b2c0bbd1-20260829074010
LIVE_SOURCE_SHA = b2c0bbd1aeb423c4f5aa7410c48c407989f30d1c
POST_DEPLOY_HOME = PASS
NEXT_ERROR_GONE = YES
WATCH_SMOKE = PASS
WELCOME_SMOKE = PASS
LEARNING_SMOKE = PASS
STORE_SMOKE = PASS
BRAND_CANDIDATE_DEPLOYED = NO
BRAND_CANDIDATE_UNCHANGED = YES
CODE_CHANGED = NO
COMMIT = NO
PUSHED = NO
WORKTREE = C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-UMTUBA-PRODUCTION-HOME-SUPABASE-ENV-P0-V1
BRANCH = desktop/umtuba-production-home-supabase-env-p0-v1
PARENT_PRESERVED = YES
PARENT_BRANCH = office/profile-hero-completeness-v1
PARENT_HEAD = 380a36646d4de8a37c39a56ac3ccd449f6d8b20d
```

## Allowed scope

Same-SHA rebuild/redeploy of live `b2c0bbd` with public env present at `next build`. Docs/report in this worktree only.

## Forbidden scope

- Do not deploy brand `b5fbeff`.
- Do not modify product source.
- Do not rotate credentials.
- Do not print env values.
- Do not touch DB/migrations/payments.
- Do not reset/clean/stash the dirty parent.
- Do not write artifacts to the Windows Desktop. `_port_extract` protected.

## Owner / Central ask

None. Rollback target remains `/opt/umtuba/production/releases/b2c0bbd1-20260825100900`.
