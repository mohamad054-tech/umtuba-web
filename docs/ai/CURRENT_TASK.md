# Current Task

> 2026-09-02 PC2. Owner GO: SOCIAL + COMMUNICATIONS + RICH PROFILE — MIGRATION RENUMBER AND SOURCE INTEGRATION V1.

**Authoritative stop before this GO:** `docs/ai/PC2_2026_08_31_END_OF_DAY_PRESERVATION.md` (SOURCE_PASS_MIGRATION_HOLD).

**This worktree only.** Isolated from the dirty primary checkout and from UM Streak.

```text
TASK_ID = PC2_SOCIAL_COMM_RICH_PROFILE_RENUMBER_INTEGRATE_V1
STATUS = SOURCE_INTEGRATED_RENUMBERED_LOCAL_ONLY
PRIMARY_TARGET = LOCAL_INTEGRATION_BRANCH
PRODUCTION = STRICTLY_FORBIDDEN
DEVICE = PC2
AUTHORITATIVE_BASE_REF = origin/alpha-0.2
AUTHORITATIVE_BASE_SHA = b5fbeff29cb0f308481b38c06500c572cd44a9c4
BASE_MOVED = NO
CANDIDATE_SHA = 75b3896c6a3852258f4e303c4cb54c17d1da5836
PC2_CANDIDATE_PRODUCT_SHA = 814226776ced7325b174665f773906e163efcb2d
LOCAL_REVIEW_FIX_INCLUDED = YES
INTEGRATION_BRANCH = pc2/social-comm-rich-profile-renumber-integrate-v1
INTEGRATION_WORKTREE = C:\Users\Giga store\Desktop\umtuba\umtuba-web-social-comm-rich-profile-renumber-integrate-v1
RICH_PROFILE_MIGRATION = 20260935
COMMUNICATIONS_MIGRATION = 20260936
OLD_RICH_PROFILE = 20260915_rich_personal_profile_foundation_v1.sql
NEW_RICH_PROFILE = 20260935_rich_personal_profile_foundation_v1.sql
OLD_COMMUNICATIONS = 20260916_communications_identity_discovery_v1.sql
NEW_COMMUNICATIONS = 20260936_communications_identity_discovery_v1.sql
SQL_SEMANTICS_CHANGED = NO
ON_CONFLICT_USER_ID_PRESERVED = YES
UM_STREAK_20260937_INCLUDED = NO
PRODUCTION_DB_TOUCHED = NO
PRODUCTION_DEPLOYED = NO
ORIGIN_ALPHA_PUSHED = NO
FORCE_PUSH = NO
PUSH = NO
MERGE_TO_ALPHA = NO
READY_FOR_MIGRATION_APPLICATION = NO
READY_FOR_PRODUCTION_DEPLOY = NO
NEXT_REQUIRED_GATE = TARGETED_MIGRATION_APPLY_GO
```

## Allowed scope

- Isolated worktree/branch from `origin/alpha-0.2`
- Source-merge candidate `75b3896c` (includes product `81422677` + welcome-nav fix)
- Renumber `20260915` → `20260935` and `20260916` → `20260936`
- Filename reference updates
- Local typecheck / tests / build / commit on this branch only

## Forbidden scope

- Apply `20260935` / `20260936` to production
- `db push` / `--linked` write / any hosted SQL write
- Deploy
- Force push
- Push or fast-forward `origin/alpha-0.2`
- Include UM Streak `20260937`
- Reset / clean the dirty primary checkout
- Expose secrets

## STOP

Live DB apply and deploy need separate GOs. Do not start them.
