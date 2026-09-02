# PC2 — Communications identity pepper Vault adaptation V1

```text
TASK_ID = COMMUNICATIONS_IDENTITY_PEPPER_VAULT_ADAPTATION_V1
STATUS = COMPLETE
DEVICE = PC2
DATE = 2026-09-02
BRANCH = pc2/social-comm-rich-profile-renumber-integrate-v1
WORKTREE = C:\Users\Giga store\Desktop\umtuba\umtuba-web-social-comm-rich-profile-renumber-integrate-v1
BASE_SHA = 4eb8e91aff6310d243547790d867690663a6827d
VAULT_METHOD = vault.decrypted_secrets
SECRET_NAME = communications_identity_pepper
MISSING_SECRET_FAIL_CLOSED = PASS
PUBLIC_VAULT_ACCESS = DENIED
AUTH_UID_ENFORCED = YES
SECURITY_DEFINER_REVIEW = PASS
SEARCH_PATH_FIXED = YES
PUBLIC_EXECUTE_REVOKED = YES
LOCAL_PHONE_HASH = PASS
LOCAL_PHONE_DISCOVERY = PASS
LOCAL_EMAIL_DISCOVERY = PASS
BLOCKED_USER_TEST = PASS
ANON_TEST = PASS
SECRET_EXPOSED = NO
SECURITY_ADVISORS = PASS_FOR_SCOPE
TYPECHECK = PASS
TESTS = PASS
WEB_BUILD = PASS
PRODUCTION_CHANGED = NO
```

Isolated worktree only. Dirty primary checkout was **not** reset. UM Streak worktree was **not** touched. No `db push`. No `--linked`. No hosted Vault write. No apply of `20260935` / `20260936` to production. Local supabase was reused. `.env` not printed. No secret value appears in Git, docs, notices, or RPC results.

---

## Decision implemented

Pepper is no longer a Postgres GUC (`app.settings.comms_identity_pepper` / `ALTER DATABASE`). The digest reads the **named** Vault secret `communications_identity_pepper` from `vault.decrypted_secrets` inside `public.comms_identity_digest`.

The migration creates the **name** as a reference only. It never inserts a pepper value. Operators must create the named secret out-of-band.

## SQL change (20260936 only)

- `comms_identity_digest` is now `STABLE` `SECURITY DEFINER` PL/pgSQL with `set search_path = public, extensions`.
- Requires `auth.uid()`.
- Reads `vault.decrypted_secrets` where `name = 'communications_identity_pepper'`.
- Missing or empty secret raises `Communications identity pepper is not configured` and writes **no** hash.
- Public domain-separator fallback (`umtuba-comms-identity-v1`) **removed**.
- Digest `REVOKE`d from `PUBLIC`, `anon`, `authenticated`, and `service_role`. Other DEFINER helpers still call it as the owner.
- Vault schema usage + `vault.decrypted_secrets` / `vault.secrets` + `vault.create_secret` / `vault.update_secret` revoked from `public`, `anon`, `authenticated`. pgsodium internals left alone (revoke denied on those).
- `discover_user_by_phone` fail-closes for missing pepper (via digest), blocked pairs (`ugc_users_are_blocked` → generic empty), and uses `on conflict on constraint communication_privacy_settings_pkey` so `RETURNS TABLE (user_id …)` is not ambiguous.
- Email discovery unchanged except that it continues to work without a pepper.

`20260934` / `20260935` / `20260937`: **not modified**. `20260937` does not exist in this tree.

## Local tests

Reused local supabase (`project_id = umtuba-web`, `127.0.0.1:54322`). Re-applied the updated `20260936` file locally (idempotent `CREATE OR REPLACE`). Disposable local Vault secret created with `gen_random_bytes`, never selected, then deleted.

Gate: `docs/ai/pc2-communications-identity-pepper-vault-local-gate-v1.sql`

| Check | Result |
|---|---|
| Vault present → bind hash + retry one row | PASS |
| Vault present → verified + everyone phone discovery | PASS |
| Email discovery (no pepper) | PASS |
| Blocked pair → phone discovery empty | PASS |
| Unauthenticated → `Authentication required` | PASS |
| `anon` cannot read `vault.decrypted_secrets` or call protected RPC | PASS |
| Vault secret deleted → bind fails closed, no hash row | PASS |
| Secret value in notices / results | NO |
| Local secret leftover after gate | NO (`local_pepper_present = false`) |

## Quality gates

- `npx tsc --noEmit` = PASS
- `npx vitest run lib/content/communicationsDiscovery.v1.test.ts` = PASS (10)
- Full `npx vitest run` = 4541 passed; 29 failed in unrelated pre-existing files (Learning / i18n / landing / media). None in the communications Vault contract file.
- `npm run build` = PASS
- `git diff --check` = PASS
- `npx supabase db advisors --local --type security` = no findings on `comms_identity_*`, `discover_user_by_*`, `bind_own_phone`, or Vault. Pre-existing `function_search_path_mutable` WARN on older unrelated functions only.

## Production

**NO.** Hosted Vault untouched. Hosted SQL untouched. `20260935` / `20260936` not applied remotely.

## Next recommended step

Owner creates the named Vault secret `communications_identity_pepper` out-of-band (not in Git). Then a **separate GO** to apply `20260935` then `20260936`. Do not reuse the old `ALTER DATABASE` GUC path.
