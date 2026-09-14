# Current Task

> 2026-09-02 PC2 isolated candidate. OWNER GO for UM Streak source preservation + origin deposit. Product SHA must stay `b0146a71`.

## Task

```text
TASK_ID = PC2_UMTUBA_UM_STREAK_SOURCE_PRESERVATION_ORIGIN_DEPOSIT_V1
STATUS = BLOCKED_WORKTREE_NOT_CLEAN
PRIMARY_TARGET = origin/pc2/umtuba-um-streak-social-camera-foundation-v1 @ b0146a71
PRODUCTION = STRICTLY_FORBIDDEN
DEVICE = PC2
OWNER_APPROVAL = YES
CANDIDATE_BRANCH = pc2/umtuba-um-streak-social-camera-foundation-v1
CANDIDATE_WORKTREE = C:\Users\Giga store\Desktop\umtuba\umtuba-web-um-streak-social-camera-v1
CANDIDATE_SHA = b0146a71fea108f0aeb2319f17b605c586069fac
MIGRATION_VERSION = 20260937
PUSH = NO
MERGE = NO
DEPLOY = NO
PRODUCTION_TOUCHED = NO
```

## Allowed scope

- Verify isolated worktree / branch / SHA / remote
- Push only `pc2/umtuba-um-streak-social-camera-foundation-v1` if every required check PASSes
- Isolated-worktree docs for this gate

## Forbidden scope

- Source edits, rebase, merge, cherry-pick, new candidate commit
- Force push, alpha update
- Production, DB, migrations apply/rollback, Vault
- App Store / Play
