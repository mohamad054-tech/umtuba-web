# CURSOR_REPORT — COMMUNICATIONS_IDENTITY_PEPPER_VAULT_ADAPTATION_V1

## Summary

PC2 adapted `20260936` on isolated branch `pc2/social-comm-rich-profile-renumber-integrate-v1` so phone identity hashing reads the named Vault secret `communications_identity_pepper` from `vault.decrypted_secrets` inside SECURITY DEFINER helpers. The public domain-separator fallback is gone. Missing secret fails closed and writes no hash. Local supabase reused; disposable local test secret inserted then deleted. Secret value never printed. Production unchanged. `20260934` / `20260935` / `20260937` not edited.

Authoritative report: `docs/ai/PC2_COMMUNICATIONS_IDENTITY_PEPPER_VAULT_ADAPTATION_V1.md`.

```text
TASK_ID = COMMUNICATIONS_IDENTITY_PEPPER_VAULT_ADAPTATION_V1
STATUS = COMPLETE
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
BLOCKERS = NONE
NEXT_RECOMMENDED_STEP = OWNER_CREATE_NAMED_VAULT_SECRET_OUT_OF_BAND_THEN_SEPARATE_GO_APPLY_35_THEN_36
```

## Exact files changed

- `supabase/migrations/20260936_communications_identity_discovery_v1.sql`
- `lib/content/communicationsDiscovery.v1.test.ts`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`
- `docs/ai/PC2_COMMUNICATIONS_IDENTITY_PEPPER_VAULT_ADAPTATION_V1.md`
- `docs/ai/pc2-communications-identity-pepper-vault-local-gate-v1.sql`

Not edited: `20260934`, `20260935`, `20260937` (file absent).

## Migrations created

None. Existing `20260936` adapted in place. Not applied to production. Re-applied locally only via `psql` `CREATE OR REPLACE` (no `db push`, no `--linked`).

## Security review

- Pepper source is Vault name `communications_identity_pepper` via `vault.decrypted_secrets`. No value in migration, Git, docs, or notices.
- No public fallback. Missing/empty secret raises a clear error; `bind_own_phone` inserts nothing.
- `comms_identity_digest`: `SECURITY DEFINER`, fixed `search_path = public, extensions`, `auth.uid()` required, `REVOKE` from `PUBLIC` / `anon` / `authenticated` / `service_role`.
- Client Vault access revoked (schema usage + secrets tables + `create_secret` / `update_secret`). `anon` local read of `vault.decrypted_secrets` denied.
- Phone discovery fail-closes for blocked pairs via existing `ugc_users_are_blocked` (generic empty). Email discovery unchanged and still works without pepper.
- Phone `ON CONFLICT` uses `communication_privacy_settings_pkey` (same class of PL/pgSQL `user_id` ambiguity previously fixed for email).
- Local test secret deleted after the fail-closed path. Hosted Vault not written.

## Tests

- Local SQL gate: all required phone/email/block/anon/unauth/missing-secret checks PASS. `SECRET_EXPOSED = NO`.
- `npx vitest run lib/content/communicationsDiscovery.v1.test.ts` = PASS (10).
- Full `npx vitest run` = 4541 passed; 29 failed in unrelated pre-existing files. Changed-area contract is green.

## TypeScript

`npx tsc --noEmit` = PASS

## Build

`npm run build` = PASS

## git diff --check

PASS (no whitespace errors on files touched in this task)

## git status --short

Isolated branch `pc2/social-comm-rich-profile-renumber-integrate-v1`. Candidate files listed above. Older leftover untracked preflight docs from prior GOs were left uncommitted.

## Open issues

1. Production Vault secret `communications_identity_pepper` is still **not** created. That is a separate Owner GO. Do not put the value in Git.
2. Do **not** apply `20260935` then `20260936` to hosted until that secret exists and a separate apply GO is issued.
3. Full vitest suite still has pre-existing unrelated failures (Learning / i18n / landing / media). Out of scope.
