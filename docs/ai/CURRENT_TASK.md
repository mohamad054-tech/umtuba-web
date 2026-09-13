# Current Task

> **CENTRAL — owner-approved UMTUBA brand production release V1. Isolated worktree. Do not touch the dirty parent.**

## Result (2026-08-29)

```text
TASK_ID = CENTRAL_DEPLOY_OWNER_APPROVED_UMTUBA_BRAND_RELEASE_V1
STATUS = BLOCKED_NOT_FAST_FORWARD
SOURCE_BRANCH = origin/pc2/official-logo-from-approved-video-v1
SOURCE_SHA = 1c6b3fc5312d1c3ef0029785a39d5121de17b9e4
SOURCE_SHA_VERIFIED = YES
DIFF_SCOPE_VERIFIED = NO
FINAL_TYPECHECK = PASS
FINAL_TESTS = FAIL (metadata source-hygiene timeout)
FINAL_BUILD = NOT_RUN
MERGED = NO
PRODUCTION_DEPLOYED = NO
```

## Allowed scope

- Verify authorized SHA `1c6b3fc` and brand-only chrome vs production base `origin/alpha-0.2`
- Isolated worktree checks
- Fast-forward integrate that exact SHA onto the production branch, then deploy, only if workflow allows

## Forbidden scope

- Reset / clean / stash / checkout the dirty parent `office/profile-hero-completeness-v1` @ `380a366`
- Merge a different SHA or cherry-pick (would create a new SHA)
- Automatic merge commits when fast-forward is impossible
- Globe / Learning / Store / payments / video product changes
- Remote Supabase migrations
- Force push / hard reset
- Artifacts on the Windows Desktop
