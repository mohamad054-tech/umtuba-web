# PC2_UMTUBA_STORE_SELLER_A_LOGIN_CREDENTIAL_STALE_INVESTIGATION_V1

Machine: PC2  
Date: 2026-08-24  
Status: INVESTIGATE_ONLY — no reset, no impersonation, no product source change

## Operator report

Login at the local Store preview failed with **Invalid email or password** using:

- email `pc2.store.seller.a.20260823@example.com`
- secret from gitignored `.seller-runtime-gate.local.json` on the functional Seller Center worktree

## Field packet

```text
AUTH_USER_EXISTS = YES
AUTH_PROJECT_MATCHES_LOCAL_PREVIEW = YES
LOCAL_CREDENTIAL_FILE_PRESENT = YES
LOCAL_CREDENTIAL_STALE = YES
EMAIL_MATCHES_SIGNUP = YES
LIKELY_CAUSE = E_PASSWORD_CHANGED_AFTER_ORIGINAL_FILE_WRITE
PASSWORD_REVEALED = NO
IMPERSONATION = NO
CREDENTIAL_CHANGED = NO
MINIMUM_SAFE_CENTRAL_ACTION = AUTHORIZE_HOSTED_AUTH_PASSWORD_RESET_FOR_EXISTING_TEST_SELLER_A_ONLY
RESET_REQUIRES_CENTRAL_GO = YES
```

## Evidence (no secrets)

| Check | Result |
| --- | --- |
| Functional `.env.local` URL kind | HOSTED_SUPABASE |
| Productization `:3030` `.env.local` URL kind | HOSTED_SUPABASE |
| URL hash match (functional vs productization) | YES |
| Service-role present (either worktree) | NO — Auth Admin `getUserByEmail` not attempted |
| Public `profiles` row `username=pc2sellera0823` | YES on the productization/hosted project |
| Local creds file | Present; `createdAt=2026-08-23T15:58:51.641Z` |
| File mtime | `2026-08-23T15:58:51.642Z` (not rewritten later) |
| Gate `evidence.json` startedAt | `2026-08-23T15:58:50.228Z` |
| Gate signup A | same email + handle; `hasSession=true`; `userIdPresent=true` |
| Email in file vs evidence vs operator | EXACT MATCH |

Login UI maps Supabase `Invalid login credentials` to **Invalid email or password**. Email-not-confirmed would show a different sentence. So this is a credential mismatch, not a confirm-email gate.

The gate script generates one random password at signup, writes it once to the gitignored file, and the same-second evidence shows a real session. The file was **not** overwritten by a later script run. Therefore the file is not a “wrong-run” leftover; it is the original successful secret that **no longer authenticates**.

## Cause discrimination

| Hypothesis | Verdict |
| --- | --- |
| A) Wrong Supabase project (local vs hosted) | NO — both worktrees hosted; URL hashes match; `:3030` is productization `next start` |
| B) User deleted / never existed | NO — public profile `@pc2sellera0823` still present; 2026-08-23 signup session proven |
| C) File never matched hosted (stale other run) | NO — file timestamp equals successful signup write; evidence not a later failed rerun |
| D) Email typo / different signup email | NO — file, evidence, and operator email are identical |
| E) Account exists; password changed later | YES — best fit. Secondary: operator mistyped/copied the JSON secret |

Auth Admin existence was not confirmed by `getUserByEmail` (no service-role). Existence is inferred from the public profile row on the same hosted project.

## Minimum safe Central action

Authorize a **hosted Auth password reset for this existing TEST user only** (`pc2.store.seller.a.20260823@example.com` / `@pc2sellera0823`) on the umtuba.com Supabase project. Write the new secret only to the gitignored local file. Do **not**:

- create a new Auth user
- create a new seller application
- mint a session with service-role
- use Forgot password (example.com is not a deliverable inbox)

## Hard flags

```text
PASSWORD_REVEALED = NO
IMPERSONATION = NO
CREDENTIAL_CHANGED = NO
DEPLOYED = NO
COMMIT = NO
REAL_PAYMENT_CAPTURE = DISABLED
```
