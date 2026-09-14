# Current Task

> 2026-09-02 PC2. Owner GO: SOCIAL COMMUNICATIONS RICH PROFILE SOURCE PROMOTION + WEB DEPLOY V1.

**Isolated worktree docs.** Candidate `3ccc164f` is FF-safe from current `origin/alpha-0.2` `b5fbeff2`. Typecheck and production build passed. Relevant candidate tests passed. Live DB tip is still `20260936`. **Stopped before push/deploy** because PC2 has no authorized rollback-capable web-release mechanism. Main dirty checkout was not reset. UM Streak was not touched.

```text
TASK_ID = SOCIAL_COMMUNICATIONS_RICH_PROFILE_SOURCE_PROMOTION_WEB_DEPLOY_V1
STATUS = BLOCKED
DEVICE = PC2
CANDIDATE_SHA = 3ccc164f02ccb8e54cb978bc3620d907038e64a4
PREVIOUS_ALPHA_SHA = b5fbeff29cb0f308481b38c06500c572cd44a9c4
FAST_FORWARD_VERIFIED = YES
UM_STREAK_INCLUDED = NO
TYPECHECK = PASS
TESTS = PASS_RELEVANT_CANDIDATE
PRODUCTION_BUILD = PASS
PUBLIC_SUPABASE_ENV_INCLUDED = YES_EXISTING_ENV_LOCAL
ORIGIN_ALPHA_SHA_AFTER = b5fbeff29cb0f308481b38c06500c572cd44a9c4
DEPLOYED = NO
ORIGIN_ALPHA_PUSHED = NO
DATABASE_CHANGED_DURING_DEPLOY = NO
MIGRATION_20260934_APPLIED = NO
MIGRATION_20260937_APPLIED = NO
PLAY_TOUCHED = NO
APP_STORE_TOUCHED = NO
ROLLBACK_REQUIRED = NO
BLOCKERS = NO_AUTHORIZED_ROLLBACK_CAPABLE_WEB_DEPLOY_MECHANISM_ON_PC2; PREVIOUS_LIVE_RELEASE_SHA_UNPROVEN
NEXT_RECOMMENDED_STEP = CENTRAL_PROVIDE_EXISTING_NGINX_NEXT_RELEASE_PATH_THEN_FF_ALPHA_AND_CUTOVER
```

## Allowed scope

- `git fetch --prune`
- Prove alpha SHA / FF-safety / final diff / no UM Streak
- Read-only live `schema_migrations`
- Typecheck, relevant tests, production build from exact `3ccc164f`
- Include `NEXT_PUBLIC` via existing `.env.local` (do not print values)
- Fast-forward `origin/alpha-0.2` only if all pre-deploy gates pass
- New rollback-capable web release only via the existing documented mechanism
- Isolated-worktree docs

## Forbidden scope

- Force push
- `db push` / apply migrations / apply `20260934` or `20260937`
- Merge UM Streak
- Play Store or App Store / TestFlight
- Invent Vercel / SSH / a new env method
- Delete the current live release before smoke
- Reset the dirty primary checkout
- Print secrets / `.env` values
