# Current Task

> 2026-09-05 PC2 isolated local DB + two-account runtime gate for the completed UM Streak candidate.

## Task

```text
TASK_ID = PC2_UMTUBA_UM_STREAK_LOCAL_DB_TWO_ACCOUNT_GATE_V1
STATUS = LOCAL_GATE_COMPLETE
PRIMARY_TARGET = ISOLATED_COMPLETION_BRANCH
PRODUCTION = STRICTLY_FORBIDDEN
DEVICE = PC2
OWNER_APPROVAL = YES
COMPLETION_BRANCH = pc2/um-streak-final-completion-v1
PRODUCT_SHA = 7d5003d1b1a7efa27b37205c48d5323b5401e783
STARTING_SHA = 091095d64c797b92fce7d0b4831cdae54ceb7019
COMPLETION_WORKTREE = C:\Users\Giga store\Desktop\umtuba\umtuba-um-streak-final-completion-v1
MIGRATION_VERSION = 20260937
COMPLETION_MIGRATION_VERSION = 20260938
LOCAL_DATABASE = ONLY
LOCAL_DB_HOST = 127.0.0.1:54322
PUSH = NO
MERGE = NO
DEPLOY = NO
EAS_RUN = NO
PHYSICAL_CAMERA_TESTED = NO
READY_FOR_FOLD6_OWNER_GATE = YES
```

## Allowed scope

- Local-only Supabase start/status and local apply of `20260937` then `20260938`
- Disposable local two-account SQL/RPC/API and browser against local Supabase
- UM Streak contract checks and regression gates
- Update `docs/ai/CURRENT_TASK.md` and `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Production / remote Supabase
- `--linked`, remote `db push`, production credentials against remote
- Deploy, EAS, Play, TestFlight, push
- Touch the dirty Communications checkout
- Fold6 / physical-camera owner gate (report only)
