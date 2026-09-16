# Cursor Report — unapplied 20260946–48 headers + 20260947 visibility

## Summary

Corrected `20260947` posts SELECT so it keeps the applied `20260944` `post_is_visible_to_viewer` rule (author moderation hide) and still requires `visibility = 'public'` for non-owners. Marked first-line headers on `20260946`, `20260947`, and `20260948` as `NOT APPLIED TO PRODUCTION`. Updated the 20260948 foundation test. No SQL applied. No deploy. No push.

```
TASK_ID = FIX_RECORD_UNAPPLIED_20260946_48_V1
BRANCH = fix/record-unapplied-20260946-48-v1
WORKTREE = D:\umtuba-central\repos\umtuba-web-fix-unapplied-migrations-v1
BASE = origin/release/v1 @ 8ff932aac4280a0c232ceb50ea53286bc249ea8d
```

## Exact files changed

- `supabase/migrations/20260946_remove_sandbox_admin_and_lock_moderation_status_v1.sql` (header only)
- `supabase/migrations/20260947_posts_articles_rls_lockdown_v1.sql` (header + posts SELECT policy)
- `supabase/migrations/20260948_abuse_limits_v1.sql` (header only)
- `lib/security/abuseLimits.foundation.test.ts`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

none (existing 20260946–48 files edited; not applied)

## Security review

- `20260947` SELECT now calls `public.post_is_visible_to_viewer(deleted_at, user_id, profiles.moderation_status, auth.uid())` with the same argument order as `20260944`. Non-owners still need `visibility = 'public'`. Owners still pass the extra visibility clause.
- This restores suspended / banned / shadowbanned author hiding that the previous `deleted_at is null AND (public OR owner)` policy would have undone.
- `post_is_interactable` and the rest of 20260947 (insert policy, column guard, articles revoke) are unchanged.
- 20260946 and 20260948 SQL bodies are unchanged.
- No `supabase db push`. No remote SQL. No secrets / `.env` reads.

## Tests

Related vitest PASS (20 tests):

- `lib/security/abuseLimits.foundation.test.ts` (2)
- `lib/moderation/ugcPostVisibilityFoundation.test.ts` (4)
- `lib/supabase/postVisibility.test.ts` (14)

## TypeScript

Not run. No TypeScript application code changed (test assertion strings only).

## Build

Not run. No app UI / entry points changed.

## git diff --check

PASS (no whitespace errors)

## git status --short

```
M docs/ai/CURRENT_TASK.md
M docs/ai/CURSOR_REPORT.md
M lib/security/abuseLimits.foundation.test.ts
M supabase/migrations/20260946_remove_sandbox_admin_and_lock_moderation_status_v1.sql
M supabase/migrations/20260947_posts_articles_rls_lockdown_v1.sql
M supabase/migrations/20260948_abuse_limits_v1.sql
```

## Open issues

- `20260946`, `20260947`, and `20260948` remain unapplied on production. Do not apply from this machine unless explicitly requested.
- `docs/audit/PROD_SECURITY_SQL_2026-09-15.md` still describes these files as already applied. Not rewritten (no test failed on it).
