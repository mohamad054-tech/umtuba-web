# Current Task

> 2026-09-05 PC2 isolated completion. OWNER GO to finish the existing UM Streak candidate. Do not restart. Do not touch the dirty Communications worktree.

## Task

```text
TASK_ID = PC2_UMTUBA_UM_STREAK_FINAL_COMPLETION_V1
STATUS = CANDIDATE_COMPLETE_LOCAL
PRIMARY_TARGET = ISOLATED_COMPLETION_BRANCH
PRODUCTION = STRICTLY_FORBIDDEN
DEVICE = PC2
OWNER_APPROVAL = YES
AUTHORITATIVE_BASE_REF = origin/alpha-0.2
AUTHORITATIVE_BASE_SHA = b5fbeff29cb0f308481b38c06500c572cd44a9c4
PRESERVED_STREAK_SHA = b0146a71fea108f0aeb2319f17b605c586069fac
COMPLETION_BRANCH = pc2/um-streak-final-completion-v1
COMPLETION_SHA = 7d5003d1b1a7efa27b37205c48d5323b5401e783
COMPLETION_WORKTREE = C:\Users\Giga store\Desktop\umtuba\umtuba-um-streak-final-completion-v1
FOUNDATION_BRANCH = pc2/umtuba-um-streak-social-camera-foundation-v1
FOUNDATION_WORKTREE = C:\Users\Giga store\Desktop\umtuba\umtuba-web-um-streak-social-camera-v1
MIGRATION_VERSION = 20260937
COMPLETION_MIGRATION_VERSION = 20260938
PUSH = NO
MERGE = NO
DEPLOY = NO
EAS_RUN = NO
READY_FOR_FOLD6_OWNER_GATE = NO
```

## Allowed scope

- Finish the existing UM Streak private visual loop on the isolated completion branch
- Communications-native camera / view-once / streak engine / badges / i18n / a11y / tests
- Candidate migration `20260938` only (does not steal `20260935` / `20260936`)
- Isolated-branch commit of completed UM Streak work

## Forbidden scope

- Production deploy, remote migration apply, EAS, Play, App Store
- Force push / hard reset / rebase / clean / stash of unrelated work
- Overwrite or amend `b0146a71`
- Touch the dirty Communications worktree
- Parallel messaging system
- Automatic UM Life public sharing
- Fake production users / monetary rewards
