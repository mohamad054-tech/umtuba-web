# Current Task

> **CENTRAL — sync official git ref `origin/alpha-0.2` to live brand release `b5fbeff`.**

## Result (2026-08-29)

```text
TASK_ID = CENTRAL_SYNC_OFFICIAL_GIT_REF_TO_LIVE_BRAND_RELEASE_V1
STATUS = COMPLETE
PREVIOUS_REMOTE_ALPHA_SHA = b2c0bbd1aeb423c4f5aa7410c48c407989f30d1c
TARGET_SHA = b5fbeff29cb0f308481b38c06500c572cd44a9c4
FAST_FORWARD_VERIFIED = YES
BRAND_ONLY_SCOPE_REVERIFIED = YES
REMOTE_CHANGED_SINCE_GATE = NO
PUSHED = YES
FORCE_PUSH_USED = NO
FINAL_ORIGIN_ALPHA_SHA = b5fbeff29cb0f308481b38c06500c572cd44a9c4
PRODUCTION_DEPLOYED = NO
PRODUCTION_RESTARTED = NO
LIVE_SOURCE_SHA = b5fbeff29cb0f308481b38c06500c572cd44a9c4
LIVE_HEALTH = PASS
ORIGINAL_DIRTY_CHECKOUT_PRESERVED = YES
BLOCKERS = NONE
```

Note: `docs/ops/central-umtuba-brand-rebase-deploy-v1/OFFICIAL_GIT_REF_SYNC_V1.md`.

## Allowed scope

- Fetch, verify ancestry + brand-only range, fast-forward push exact SHA to `refs/heads/alpha-0.2`
- Read-only live healthz / welcome check
- Isolated worktree docs only

## Forbidden scope

- Force / reset / rebase / new commits / code changes
- Production deploy or restart
- Dirty-parent mutation of `office/profile-hero-completeness-v1` @ `380a366`
