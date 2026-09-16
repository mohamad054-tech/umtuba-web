# Cursor Report — record 20260945–48 applied 2026-09-16

## Summary

Merged `ca80dc28` into `release/v1` with `--no-ff` (no conflicts). `origin/fix/record-unapplied-20260946-48-v1` was missing, so the local commit from `D:\umtuba-central\repos\umtuba-web-fix-unapplied-migrations-v1` was merged. Then updated headers so `20260945`–`20260948` read `APPLIED TO PRODUCTION 2026-09-16`, added the two production-apply notes, rephrased leftover `NOT APPLIED` comments on `20260844`–`20260847` so the required grep is empty, and aligned the 20260948 foundation test. No SQL applied. No deploy. No `supabase db push`. No force-push. `release/v1` was not pushed.

```
TASK_ID = CHORE_RECORD_20260945_48_APPLIED_HEADER_TRUTH_V1
BRANCH = release/v1
WORKTREE = D:\umtuba-central\repos\umtuba-web-release-v1-header-truth-v1
MERGE = 5b94f593 (no-ff of ca80dc28)
BASE = origin/release/v1 @ 8ff932aa
```

## Exact files changed

After the merge commit:

- `supabase/migrations/20260945_update_own_post_caption_v1.sql` (header only)
- `supabase/migrations/20260946_remove_sandbox_admin_and_lock_moderation_status_v1.sql` (header only)
- `supabase/migrations/20260947_posts_articles_rls_lockdown_v1.sql` (header comments only)
- `supabase/migrations/20260948_abuse_limits_v1.sql` (header/comments only; SQL body unchanged)
- `supabase/migrations/20260844_learning_result_policy_completion_v1.sql` (comment rephrase only)
- `supabase/migrations/20260845_learning_progress_mutations_v1.sql` (comment rephrase only)
- `supabase/migrations/20260846_games_platform_foundation_v1.sql` (comment rephrase only)
- `supabase/migrations/20260847_games_catalog_foundation_v1.sql` (comment rephrase only)
- `lib/security/abuseLimits.foundation.test.ts`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

none (existing files; comments only; not applied)

## Security review

- Headers now match the 2026-09-16 production truth: `20260945`–`20260948` are applied.
- `20260948` comments record that production was applied without the `event_type` CHECK replacement block (live constraint already equivalent).
- `20260947` comments record that the 20260943 policies `"Anon reads public posts"` and `"Authenticated reads posts"` were dropped as part of this apply.
- `20260947` SQL body from `ca80dc28` still keeps `post_is_visible_to_viewer` (20260944 visibility).
- `20260844`–`20260847` comments were rephrased only to remove the forbidden grep tokens; they remain Git-only until explicitly approved (historical meaning unchanged).
- No `supabase db push`. No remote SQL. No secrets / `.env` reads.

## Tests

Related vitest PASS (20 tests):

- `lib/security/abuseLimits.foundation.test.ts` (2)
- `lib/moderation/ugcPostVisibilityFoundation.test.ts` (4)
- `lib/supabase/postVisibility.test.ts` (14)

## TypeScript

`npx tsc --noEmit` PASS (project local TypeScript via worktree `node_modules` junction to the matching lockfile worktree).

## Build

Not run. No app UI / entry points changed.

## git diff --check

PASS (no whitespace errors)

## git status --short

(after this report is written; commit next)

```
M docs/ai/CURRENT_TASK.md
M docs/ai/CURSOR_REPORT.md
M lib/security/abuseLimits.foundation.test.ts
M supabase/migrations/20260844_learning_result_policy_completion_v1.sql
M supabase/migrations/20260845_learning_progress_mutations_v1.sql
M supabase/migrations/20260846_games_platform_foundation_v1.sql
M supabase/migrations/20260847_games_catalog_foundation_v1.sql
M supabase/migrations/20260945_update_own_post_caption_v1.sql
M supabase/migrations/20260946_remove_sandbox_admin_and_lock_moderation_status_v1.sql
M supabase/migrations/20260947_posts_articles_rls_lockdown_v1.sql
M supabase/migrations/20260948_abuse_limits_v1.sql
```

## Open issues

- `origin/fix/record-unapplied-20260946-48-v1` still does not exist on the remote. Merge used local `ca80dc28`. The fix branch was not pushed.
- `release/v1` was not pushed.
- `20260844`–`20260847` remain historically Git-only; only the `NOT APPLIED` token was removed so `git grep -l "NOT APPLIED\|ALREADY APPLIED" -- supabase/migrations/*.sql` is empty.
- `20260944` still says `PRINT / write only. Do not apply` in its header. That is not a forbidden grep phrase and was left alone per scope.
- A `node_modules` junction to the fix worktree exists in this worktree for local tsc/vitest only (gitignored).
