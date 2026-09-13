# DESKTOP_PRODUCTION_SSH_AUTH_ENV_PROVISIONING_V1

**DEVICE:** DESKTOP  
**DEVICE_ROLE:** ANDROID_RELEASE_OPERATOR / PRODUCTION_ACCESS_OPERATOR  
**CENTRAL_COORDINATOR:** SERVER  
**PRIORITY:** RELEASE_CRITICAL  
**MODE:** VERIFY ACCESS → PROVISION SAFELY → TEST CONNECTIVITY → HANDOFF TO CENTRAL  
**DATE:** 2026-08-13  
**TASK_ID:** DESKTOP_PRODUCTION_SSH_AUTH_ENV_PROVISIONING_V1  
**WEB:** `C:\Users\1\Desktop\umtuba\umtuba-web` `office/profile-hero-completeness-v1` @ `7ed9159`  
**MOBILE (preserved):** `C:\Users\1\Desktop\umtuba\umtuba-mobile` `master` @ `fe14a34` + uncommitted `eas.json` / `app.config.ts` / `release-artifacts/`  
**TARGET:** `origin/alpha-0.2` @ `2df90a29c338466e81e85e1685c3c6e9e0758fd3`

No product/runtime code changes. No git commit / push. No deploy of `2df90a29`. No live Stripe charge. No auth bypass. No Play review account reuse/reset. Secrets not written to this file.

Concurrent stream (preserve): `DESKTOP_GOOGLE_PLAY_REVIEW_ACCOUNT_PROVISION_V1` — `google-play-review@umtuba.com` remains the Play reviewer fixture.

---

## Verdict

| Gate | Result |
|------|--------|
| SSH_CONNECTIVITY | **PASS** |
| SSH_KEY_AUTH | **PASS** |
| SSH_HOST_VERIFIED | **YES** (`umtuba-production-1`, fingerprint match) |
| SSH_USER_VERIFIED | **YES** (`root`) |
| CENTRAL_DEPLOY_ACCESS_READY | **YES** |
| TARGET_SHA | `2df90a29` |
| TARGET_SHA_RESOLVED | **YES** — `2df90a29c338466e81e85e1685c3c6e9e0758fd3` |
| SERVER_DEPLOY_PATH_READY | **YES** |
| CURRENT_PRODUCTION_SHA | `e84475a769c731bb7e1ad511b3543ee714d2feea` (release dir `e84475a-20260812000913`) |
| ROLLBACK_READY | **YES** (release symlink; current `e84475a-…` is the rollback target after a new release) |
| DEPLOY_PERFORMED | **NO** |
| DEPLOY_RESULT | **N/A** |
| AUTH_ENV_FOUND | **YES** (dedicated Store QA created this task; Store E2E sandbox contract exists but `config.local.sql` is absent) |
| AUTH_ENV_TYPE | dedicated production Auth email/password Store QA fixture |
| AUTH_ENV_READY | **YES** |
| AUTHENTICATED_TEST_ACCOUNT_READY | **YES** |
| STORE_AUTH_QA_READY | **YES** |
| UAF05_RUNTIME_QA_READY | **YES** (ready to run **after** Central deploys `2df90a29`; not claimed fixed) |
| UAF-05 FIXED | **NOT CLAIMED** (runtime evidence required post-deploy) |
| SECRETS_EXPOSED | **NO** |
| ANDROID_WORK_PRESERVED | **YES** |
| PLAY_REVIEW_ACCOUNT_REUSED | **NO** |

---

## 1 — Repository state (pre-change)

Inspected before docs writes. No product files touched. No merge / rebase / reset / stash / force.

### umtuba-web

- Branch: `office/profile-hero-completeness-v1` @ `7ed9159f62d6a82d1999b19ef9d1df9a63c09de9`
- Upstream: in sync after `git fetch --prune`
- Dirty before this task: prior `docs/ai/*` + untracked `docs/ops/closeout/` and `worktrees/`
- `git fetch --prune`: `origin/alpha-0.2` advanced `0f0fb0a` → `2df90a2`

### umtuba-mobile

- Branch: `master` @ `fe14a34e7d5d10f8fd6fe2f1845e3bd81ffe2f99` = `origin/master` after fetch
- Uncommitted **kept**: `eas.json`, `app.config.ts`, `release-artifacts/`, gitignored `.env.play-review.local`
- This task did **not** modify mobile product/runtime files

### Target SHA

```
origin/alpha-0.2 = 2df90a29c338466e81e85e1685c3c6e9e0758fd3
subject: fix(auth,i18n): land Central UAF-02/03/06/08 shared auth and landing fixes
parent:  0f0fb0a1242ad597eb37f25100af38b75ce4753c
```

`e84475a769c731bb7e1ad511b3543ee714d2feea` **is an ancestor** of the target (forward deploy; no rewrite of `2df90a29`).

Desktop workspace remains on `office/profile-hero-completeness-v1` (Discover-default callback in this working tree). **Do not treat local HEAD as the deploy source.** Central must deploy **exactly** `origin/alpha-0.2` @ `2df90a29c338466e81e85e1685c3c6e9e0758fd3`.

---

## 2 — Phase 1: existing SSH verified

Used the already-approved production operator path from `DESKTOP_HETZNER_PRODUCTION_SECURITY_HARDENING_V1`. No new keys created. No credential rotation.

### Safe connection metadata (non-secret)

| Field | Value |
|-------|--------|
| Host (IP) | `178.104.196.2` |
| Hostname | `umtuba-production-1` |
| SSH user | `root` |
| SSH port | `22` |
| Auth | public-key only (`PasswordAuthentication no`; `PermitRootLogin without-password` / prohibit-password) |
| Key alias | `umtuba-desktop-server` (comment on Desktop public key) |
| Key path (Desktop) | `%USERPROFILE%\.ssh\id_ed25519` (private key **not** copied, not printed) |
| Operator public fingerprint | `SHA256:ZkFAfQaSIT9KM+9ZCFfy65sRRALEMDLXEd15MdKXLyE` (ED25519) |
| Host identity (ED25519) | `SHA256:qXJL/K4UkuUuhMv3WJRfzcma/GPjISfZy4O05vSj8A8` |
| Known-hosts file | `%USERPROFILE%\.ssh\umtuba_hetzner_known_hosts` (also present in `known_hosts`) |
| SSH config | **none** (`~/.ssh/config` absent) — use explicit `-i` + `IdentitiesOnly=yes` |
| authorized_keys on host | **1** key; fingerprint **matches** Desktop operator key |

Approved invocation pattern:

```text
ssh -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes
    -o UserKnownHostsFile=%USERPROFILE%\.ssh\umtuba_hetzner_known_hosts
    -i %USERPROFILE%\.ssh\id_ed25519
    -p 22
    root@178.104.196.2
```

### Connectivity evidence (2026-08-13)

- BatchMode key auth: **PASS** (`SSH_OK`, `hostname=umtuba-production-1`, `whoami=root`)
- Host fingerprint vs hardening report trusted value: **MATCH**
- Disk: `/` ~282G free (3% used)
- systemd: `umtuba-production`, `umtuba-staging`, `nginx`, `ssh`, `fail2ban` **active**
- Public healthz: `https://umtuba.com/healthz` → `200 umtuba-production-ok`; staging `200 umtuba-staging-ok`
- Local app ports remain loopback (`next start` 127.0.0.1:3001 production / :3000 staging); nginx `/healthz` is the public probe (direct `:3001/healthz` is 404 by app, expected)

SSH_CONNECTIVITY = PASS  
SSH_KEY_AUTH = PASS  
CENTRAL_DEPLOY_ACCESS_READY = YES

**Central key note:** the host currently authorizes **only** this operator key. Desktop did **not** invent a second key and did **not** copy the private key. If Central’s coordinator host already has this same key material, use it. If it does not, the operator must either install this existing key through a secure non-git channel **or** provide Central’s **public** key for Desktop to append to `/root/.ssh/authorized_keys`. Do not paste private keys into Git, chat, or OUTBOX plaintext.

Named Desktop `OUTBOX` / intake: **not found** (same as prior waves). Canonical handoff is this repo closeout.

---

## 3 — Phase 3: deployment readiness for `2df90a29`

DEPLOY_PERFORMED = **NO**. `docs/DEVELOPMENT_WORKFLOW.md` does not authorize Desktop to deploy this SHA. Existing host scripts under `/opt/umtuba/staging/logs/` are staging-oriented. This task is provisioning/handoff.

### Server layout (healthy)

| Item | Status |
|------|--------|
| Production current | `/opt/umtuba/production/current` → `/opt/umtuba/production/releases/e84475a-20260812000913` |
| Staging current | `/opt/umtuba/staging/current` → `…/e84475a-supabase-public-20260811231102` |
| Production unit | `umtuba-production.service` — `WorkingDirectory=/opt/umtuba/production/current`; `EnvironmentFile=/etc/umtuba/production/umtuba.env` (mode 600); `npx next start --hostname 127.0.0.1 --port 3001` |
| Runtime | Node v22.23.2, npm 10.9.8, git 2.43.0; **no** Docker / Caddy / PM2 |
| Reverse proxy | nginx (not Caddy); `/healthz` on production + staging vhosts |
| Git in production current | **none** (release trees, not `git pull` on the live dir) |
| Deploy analog | `/opt/umtuba/staging/logs/build-release.sh`, `runtime-config.sh`, `smoke.sh` |
| Persistent data | `/mnt/umtuba-data` present |

### Current production revision (pre-deploy record)

- Release directory name: `e84475a-20260812000913`
- Resolved SHA: `e84475a769c731bb7e1ad511b3543ee714d2feea` (`merge(ai): reconcile shared AI core catalog+metering onto alpha Games tip`)
- BUILD_ID in current `.next`: `0jrYYr2WBhh1KT5Ny_JJS`

### Rollback mechanism

Existing procedure: keep previous release directory; `ln -sfn <previous-release> /opt/umtuba/production/current`; `systemctl restart umtuba-production.service`. After Central deploys `2df90a29` into a **new** release directory, rollback is flipping `current` back to `e84475a-20260812000913`. Today there is **one** production release (that directory is the known-good target). Do not delete it.

### Central deploy path (non-destructive; Desktop did not execute)

1. Confirm `origin/alpha-0.2` still `2df90a29c338466e81e85e1685c3c6e9e0758fd3`.
2. Create `/opt/umtuba/production/releases/2df90a29-<timestamp>` from that exact SHA (do not deploy Desktop `office/profile-hero-completeness-v1`).
3. Follow the existing staging build analog (`npm ci --include=dev`, `npm run build`) against **production** env file names only — do not print `/etc/umtuba/production/umtuba.env`.
4. Symlink `current`, restart `umtuba-production.service`, probe `https://umtuba.com/healthz` and login/callback.
5. Keep `e84475a-20260812000913` for symlink rollback.

Do not `git push --force`. Do not rewrite `2df90a29`.

SERVER_DEPLOY_PATH_READY = YES

---

## 4 — Phase 4: AUTH_ENV for Store QA

### Search order

1. **Existing dedicated Store E2E Auth users** (`docs/store/operations/STORE_REMOTE_E2E_SANDBOX_V1.md`, namespace `UMTUBA_E2E_20260721`): contract exists; `scripts/store-e2e/config.local.sql` is **gitignored and absent** on Desktop. No usable passwords/UUIDs on this operator. Not consumed.
2. **Learning E2E fixtures:** Learning-only; Learning V1 frozen; not used for Store QA.
3. **Google Play reviewer** `google-play-review@umtuba.com`: **exists and must be preserved**. **Not reused** for Store QA (overlap warning).
4. **Operator personal account:** not used.

No existing dedicated Store QA login file was present. Admin `createUser` was **not** used (`SUPABASE_SERVICE_ROLE_KEY` empty/unusable; never printed). Safe fallback: public `signUp` on production Auth host `tgucwnjwoyeqoxqaxmew.supabase.co` with the **mobile publishable key** (same project as the app). Production `mailer_autoconfirm: true`; signup disabled = false; external provider = email only.

### Dedicated Store QA fixture (created this task)

| Field | Value |
|-------|--------|
| Identifier | `store-qa@umtuba.com` |
| Username | `storeqa` |
| Display name | `UMTUBA Store QA` |
| Auth user id | `e7654a61-c196-4a3e-b368-3c0cb684e434` |
| Role | `authenticated` (normal user; not platform admin) |
| Email/password login | **PASS** (`signInWithPassword`, persistSession false) |
| Email verification | **NOT_REQUIRED** (`email_confirmed_at` set; autoconfirm) |
| MFA | **NOT_REQUIRED** (totp=0, phone=0) |
| Password location | `umtuba-web/.env.store-qa.local` (gitignored `.env*`; `git check-ignore` → `!!`) |
| Password in Git / this closeout / docs/ai | **NO** |
| Play reviewer reused | **NO** |

Central: read the password from the gitignored local file on Desktop (or operator-secure copy). Do not commit it. Do not write it into OUTBOX plaintext.

### Store surfaces (auth-gated; no live charge)

After login at `https://umtuba.com/login`, Central can inspect:

| Surface | Path | Signed-out behavior |
|---------|------|---------------------|
| Wishlist / Favorites | `/store/wishlist` | redirect `/login?next=/store/wishlist` |
| Cart | `/store/cart` | redirect `/login?next=/store/cart` |
| Checkout UI | `/store/checkout` | redirect `/login?next=/store/checkout` (deferred/none; **no live Stripe**) |
| Orders / history | `/store/orders` | redirect `/login?next=/store/orders` |
| Store home | `/store` | public catalog; account surfaces remain gated |

Commerce confirm gate remains default **OFF**. Do not enable it for this QA. Do not execute a real payment.

AUTH_ENV_READY = YES  
STORE_AUTH_QA_READY = YES  
AUTHENTICATED_TEST_ACCOUNT_READY = YES

---

## 5 — Phase 5: UAF-05 / AUTH_CALLBACK_P0 reproduction (not a fix claim)

`2df90a29` lands UAF-02/03/06/08 (default post-auth `/profile`, signup steps, i18n CTAs) on top of `0f0fb0a` (callback origin when proxy Host is loopback). **UAF-05 remains the critical runtime finding until Central proves it on the deployed SHA.**

Desktop workspace still has Discover-default callback — **irrelevant** to production QA. QA must run against **deployed** `2df90a29`.

UAF05_RUNTIME_QA_READY = **YES** meaning: SSH + AUTH_ENV + checklist below are ready **after** Central deploys. Not a claim that UAF-05 is fixed.

### Reproduction checklist (Central, post-deploy)

Use `store-qa@umtuba.com` (password from gitignored file). Browser: production `https://umtuba.com`. Do not use live Stripe.

1. **Normal password login**  
   Open `https://umtuba.com/login`. Sign in. With no `?next=`, expect default destination **`/profile`** (resolver may then send the owner to `/profile/storeqa` or Settings). `router.refresh()` / session cookie present.

2. **Protected-route continuation**  
   Sign out. Visit `/store/cart` (or `/messages`, `/settings`). Expect `/login?next=/store/cart`. Sign in. Expect return to the safe `next` path, not an open redirect.

3. **Auth callback — code exchange**  
   Hit `/auth/callback` with a real PKCE `?code=` (password-recovery email or confirm link if one is generated). Expect server-side `exchangeCodeForSession`, **no tokens in the page URL**, then redirect to safe `next` (default `/profile` on this SHA). Invalid/missing code → `/login?error=…` (or forgot-password for reset `next`).

4. **UAF-05 P0 — public origin, not loopback**  
   After deploy, capture `Location` on callback success/failure. Must be `https://umtuba.com/…`, **not** `http://127.0.0.1:3001` / `localhost` (nginx may present loopback Host to Next; `resolveAuthRedirectOrigin` on this SHA is the intended fix — **verify at runtime**).

5. **Session restoration / refresh**  
   After successful login or callback: reload the page; session remains. `router.refresh()` after password login does not bounce to `/login`.

6. **Redirect behavior / open-redirect reject**  
   `?next=//evil.example` and scheme tricks must fall back to `/profile` (this SHA). Explicit safe `next` such as `/discover?post=` or `/messages` must be preserved.

7. **Default Profile destination**  
   Password login and callback without `next` → `/profile` (not Discover). Confirm owner resolver (`/profile` → `/profile/storeqa` when username exists).

8. **Mobile / browser**  
   Browser: steps 1–7 on `https://umtuba.com`. Mobile: do **not** rebuild Android; optional smoke that production Auth host still accepts this user via email/password (same project). App scheme allowlist remains operator Auth dashboard (`umtuba://**`, `https://umtuba.com/**`) — do not claim mobile callback P0 pass without a device run.

9. **Store authenticated QA (same session)**  
   While signed in: open Wishlist, Cart, Checkout UI, Orders. Confirm pages render for `authenticated` user. **Stop before any live payment.**

**Do not declare UAF-05 fixed from this packet.** Record PASS/FAIL per step after deploy.

---

## 6 — What Desktop did not do

- No deploy of `2df90a29`
- No commit / push / force / reset / stash
- No remote Supabase migration
- No service-role use or print
- No Store / Learning UX changes
- No Android rebuild / versionCode bump / Play Console mutation
- No Play reviewer password reset
- No live Stripe charge
- No private key copied into repo, chat, or archive

---

## 7 — Operator / Central next actions

1. Central: deploy **exactly** `2df90a29c338466e81e85e1685c3c6e9e0758fd3` using the SSH metadata above; keep `e84475a-20260812000913` for rollback.
2. Central: run UAF-05 checklist + Store authenticated QA with `store-qa@umtuba.com`.
3. Operator (parallel, not this task): paste Play reviewer login into Play Console from `umtuba-mobile/.env.play-review.local`.
4. If Central’s host lacks the operator SSH key, use the existing key via a secure channel or append Central’s **public** key — do not put the private key in Git.

---

## Open issues

- Production is still `e84475a…` until Central deploys.
- UAF-05 not runtime-verified (deploy pending).
- Store E2E `config.local.sql` still absent (sandbox SQL users not wired on Desktop; Store QA uses the dedicated `store-qa@` account instead).
- Named OUTBOX not found; Central receipt not independently verifiable from Desktop.
- Android Play production Console completeness and Closed Testing tester-count remain operator items from the other stream.
