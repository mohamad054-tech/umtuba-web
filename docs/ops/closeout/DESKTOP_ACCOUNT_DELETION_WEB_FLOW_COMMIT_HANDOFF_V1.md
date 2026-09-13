# DESKTOP_ACCOUNT_DELETION_WEB_FLOW_COMMIT_HANDOFF_V1

**DEVICE:** DESKTOP  
**DEVICE_ROLE:** ANDROID_RELEASE_OPERATOR / WEB_HANDOFF_PREPARER  
**PRIORITY:** RELEASE_CRITICAL  
**MODE:** COMMIT_AND_HANDOFF_ONLY  
**DATE:** 2026-08-13  
**TASK_ID:** DESKTOP_ACCOUNT_DELETION_WEB_FLOW_COMMIT_HANDOFF_V1  
**WEB:** `C:\Users\1\Desktop\umtuba\umtuba-web`  
**BRANCH:** `office/profile-hero-completeness-v1`  
**BASE_SHA:** `7ed9159f62d6a82d1999b19ef9d1df9a63c09de9`  
**COMMIT_SHA:** `5f0b6f151100401af3fab2d06ccaa5255540dbcd`  
**COMMIT_MESSAGE:** `feat(account): add web account deletion request flow`  
**PUSH_PERFORMED:** NO  
**PRODUCTION_DEPLOY_PERFORMED:** NO  
**MOBILE:** not modified (`C:\Users\1\Desktop\umtuba\umtuba-mobile`)

This packet commits the completed `/account-deletion` web request flow and prepares Central integration. It does **not** push, deploy, apply remote migrations, mutate Play Console, or rebuild Android.

Do **not** hijack Central’s existing obligation to deploy exactly `2df90a29c338466e81e85e1685c3c6e9e0758fd3`.

---

## Verdict

| Field | Result |
|------|--------|
| ACCOUNT_DELETION_IMPLEMENTATION_COMMITTED | **YES** |
| PUSH_PERFORMED | **NO** |
| ACCOUNT_DELETION_TESTS | **PASS** (35/35) |
| TYPECHECK | **PASS** |
| BUILD | **PASS** (`ƒ /account-deletion`) |
| SERVICE_ROLE_EXPOSED | **NO** |
| MIGRATION_TARGETED_APPLY_READY | **YES** (file committed; remote apply is Central) |
| ACCOUNT_DELETION_URL | `https://umtuba.com/account-deletion` |
| ACCOUNT_DELETION_URL_PUBLICLY_REACHABLE | **PENDING_DEPLOY** |
| GOOGLE_PLAY_ACCOUNT_DELETION_REQUIREMENT_READY | **PENDING_DEPLOY** |
| VERDICT | **COMMITTED_LOCAL / AWAITING_AUTHORIZED_PUSH_THEN_CENTRAL_INTEGRATE_AFTER_2df90a29** |

---

## Central integration source

- **Branch:** `office/profile-hero-completeness-v1`
- **Full SHA:** `5f0b6f151100401af3fab2d06ccaa5255540dbcd`
- **Parent:** `7ed9159f62d6a82d1999b19ef9d1df9a63c09de9`
- **Remote:** this commit is **ahead 1** of `origin/office/profile-hero-completeness-v1` and is **not on the shared remote**.
- Central **cannot** integrate until an authorized operator pushes (or otherwise transfers) this SHA.

Follow-up push command (not executed by this task):

```
git push origin office/profile-hero-completeness-v1
```

This branch is **not** the production deploy source. After the SHA is on origin, Central must integrate it onto the intended deploy line **after** `2df90a29`, not instead of it.

---

## Central action order (required)

1. Complete existing deployment of `2df90a29c338466e81e85e1685c3c6e9e0758fd3`.
2. Complete that deploy’s required runtime QA separately.
3. Integrate `5f0b6f151100401af3fab2d06ccaa5255540dbcd` (after it is on the shared remote).
4. Apply targeted migration `20260872_account_deletion_requests_v1` only. **Never** `supabase db push` unless Central independently authorizes it.
5. Deploy the integrated account-deletion web change.
6. Verify `GET https://umtuba.com/account-deletion`.
7. Confirm HTTP success, page renders, unauthenticated visitors can view instructions, submission requires auth, no secret exposure.
8. Only then `ACCOUNT_DELETION_URL_PUBLICLY_REACHABLE = YES`.

Do **not** claim Google Play account-deletion requirement ready before step 8. Do **not** paste `https://umtuba.com/privacy`.

---

## Migration safety (`20260872`)

| Item | Value |
|------|--------|
| File | `supabase/migrations/20260872_account_deletion_requests_v1.sql` |
| Version | `20260872` (unique locally; reserved; do not reuse/renumber) |
| Purpose | Additive request queue table only. Does **not** delete users. |
| Idempotent | `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `CREATE OR REPLACE` trigger function, `DROP TRIGGER/POLICY IF EXISTS` then recreate |
| Prerequisites | Supabase Auth (`auth.users`); targeted apply per `docs/DEVELOPMENT_WORKFLOW.md` |
| Remote apply from Desktop | **NO** |
| `supabase db push` | **PROHIBITED** unless Central independently authorizes |

**Verification (after Central apply):**

```sql
select c.relname, c.relrowsecurity as rls, c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'account_deletion_requests';

select polname, polcmd from pg_policy
where polrelid = 'public.account_deletion_requests'::regclass;
```

Expect: table exists; RLS + FORCE RLS; SELECT + INSERT policies for `authenticated` only; no authenticated UPDATE/DELETE policies.

**Rollback / compensation:**

- Before any production requests exist: drop trigger, function, then table (additive reverse).
- After requests exist: do **not** drop; operator compensation is `cancelled`/`rejected` on rows. Fulfillment is a later controlled cleanup, not this commit.
- Do not `db reset`.

---

## Files in the feature commit

See `git show --name-only 5f0b6f151100401af3fab2d06ccaa5255540dbcd`. Product page, action, lib, tests, legal/privacy, sitemap/metadata, vitest include, migration, and the implementation closeout.

AI state docs (`CURRENT_TASK`, `PROJECT_STATE`, `SESSION_HANDOFF`, `CURSOR_REPORT`) and this handoff closeout were written **after** the feature commit and remain unstaged so the one commit stays focused.

---

## Preserved unrelated WIP

- Other `docs/ops/closeout/DESKTOP_ANDROID_*`, SSH, Play, Store-QA, commerce packets
- `docs/ai/*` mixed state docs
- `worktrees/`
- `umtuba-mobile` `eas.json` / `app.config.ts` / `release-artifacts/`
- gitignored `.env.store-qa.local` / `.env.play-review.local`
