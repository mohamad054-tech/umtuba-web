# DESKTOP_CENTRAL_STORE_AUTH_ENV_SECURE_LANDING_V3

**DEVICE:** DESKTOP  
**DEVICE_ROLE:** PRODUCTION_ACCESS_OPERATOR / AUTH_ENV_OWNER  
**CENTRAL_COORDINATOR:** SERVER  
**PRIORITY:** HIGH  
**DATE:** 2026-08-13 (late evening)  
**TASK_ID:** DESKTOP_CENTRAL_STORE_AUTH_ENV_SECURE_LANDING_V3  
**WEB:** `C:\Users\1\Desktop\umtuba\umtuba-web` `office/profile-hero-completeness-v1` @ `5f0b6f15…` (in sync with origin)  
**MOBILE (preserved, not mutated):** `C:\Users\1\Desktop\umtuba\umtuba-mobile` `master` @ `3b33561` **behind** `origin/master` `db7f927` by 2 + uncommitted UGC / `eas.json` / `app.config.ts` / `release-artifacts/`  
**VERDICT:** **BLOCKED_OPERATOR_SECURE_TRANSFER** — Desktop-local AUTH_ENV is present; Central runtime load was **not** proven. Do **not** treat `CENTRAL_STORE_AUTH_ENV_READY` as YES.

No product/runtime code changes. No git commit --trailer "Co-authored-by: Cursor <cursoragent@cursor.com>" / push. No production deploy. No Android build. No Play Console mutation. Store QA password, SSH private keys, and service-role values are **not** in this file.

Prior packets (still valid for their original gates):

- `docs/ops/closeout/DESKTOP_CENTRAL_RUNTIME_SSH_AUTH_ENV_LANDING_V2.md`
- `docs/ops/closeout/DESKTOP_PRODUCTION_SSH_AUTH_ENV_PROVISIONING_V1.md`
- `docs/ops/closeout/DESKTOP_AUTHORIZE_CENTRAL_PRODUCTION_SSH_KEY_V1.md`

---

## Verdict

| Gate | Result |
|------|--------|
| DESKTOP_STORE_AUTH_ENV_PRESENT | **YES** |
| STORE_QA_IDENTITY_CONFIRMED | **YES** (`store-qa@umtuba.com`) |
| GOOGLE_PLAY_REVIEW_ACCOUNT_USED | **NO** |
| SERVICE_ROLE_IN_SOURCE | **NO** |
| SOURCE_GITIGNORED | **YES** (`.gitignore` `.env*` → `!!`; `git ls-files` untracked) |
| APPROVED_SECRET_MANAGER_IN_DOCS | **NO** (no 1Password / Bitwarden / operator vault) |
| DESKTOP_TO_CENTRAL_SSH | **FAIL** (TCP/22 open; BatchMode publickey denied for all probed users) |
| WINRM_INVOKE | **FAIL** (workgroup; TrustedHosts **not** mutated) |
| SECURE_TRANSFER_METHOD | **NONE this session** |
| STORE_AUTH_ENV_LANDED_ON_CENTRAL | **NO** |
| CENTRAL_AUTH_ENV_GITIGNORED | **UNKNOWN** (Central checkout not reachable) |
| CENTRAL_CAN_LOAD_STORE_QA_ENV | **NO** (not validated from Central runtime) |
| CENTRAL_STORE_AUTH_ENV_READY | **NO** |
| PRODUCTION_DEPLOY_PERFORMED | **NO** |
| ANDROID_BUILD_PERFORMED | **NO** |
| SECRETS_EXPOSED | **NO** |
| ANDROID_WORK_PRESERVED | **YES** |
| SECRET_COPIED_TO_SMB | **NO** |

SUCCESS requires `CENTRAL_STORE_AUTH_ENV_READY = YES`. This session does **not** claim that.

---

## Phase 1 — Desktop source (done)

Inspected `umtuba-web/.env.store-qa.local` without printing secret values.

| Check | Result |
|------|--------|
| File exists | YES (415 bytes) |
| `git check-ignore -v` | `.gitignore:41:.env*` |
| Tracked by git | NO |
| Keys present | `STORE_QA_EMAIL`, `STORE_QA_USERNAME`, `STORE_QA_PASSWORD`, `STORE_QA_USER_ID`, `STORE_QA_AUTH_HOST` |
| Email | equals `store-qa@umtuba.com` |
| Username | equals `storeqa` |
| Password present | YES |
| Password length > 0 | YES |
| `SERVICE_ROLE` / service-role key | absent (would not have been transferred even if present) |
| `google-play-review@umtuba.com` | absent |

DESKTOP_STORE_AUTH_ENV_PRESENT = YES  
STORE_QA_IDENTITY_CONFIRMED = YES  

Expected Central landing basename (same as Desktop; gitignored `.env*`):

`<central-umtuba-web-checkout>/.env.store-qa.local`

Repo search found **no** QA script that reads `STORE_QA_EMAIL` / `STORE_QA_PASSWORD` by those names. Store remote E2E sandbox uses gitignored `scripts/store-e2e/config.local.sql` (absent on Desktop; **not** this fixture). Central browser/Store QA from prior packet uses this env file directly. Do **not** use `umtuba-mobile/.env.play-review.local`.

---

## Phase 2 — secure transfer (blocked)

Allowed channels searched:

| Channel | Result |
|---------|--------|
| Direct operator-controlled secure copy | Not available inside this Cursor session (no physical USB / operator hands) |
| Encrypted removable media | Not attached / not used |
| Approved password/secret manager | **Not documented** in `docs/` (no 1Password / Bitwarden / LastPass / KeePass / operator vault) |
| Encrypted copy over Desktop to Central SSH | **Blocked** — see connectivity |
| Git / chat / docs / source-controlled `.env` | Forbidden; not used |
| Plaintext SMB / OUTBOX | Forbidden for this secret; **not used** |

### Desktop to Central connectivity (re-verified 2026-08-13)

This session OS: Windows NT 10.0.26200 (`DESKTOP-844IU2G`, user `1`). Central/SERVER is a **separate** coordinator host, not this Cursor runtime.

| Probe | Result |
|-------|--------|
| LAN hub | `192.168.88.11` (prior hostname `WIN-MJRKAKK2MEH`) |
| TCP/22 | **open** |
| Desktop SSH config | **absent** |
| Desktop IdentityFile | `%USERPROFILE%\.ssh\id_ed25519` comment `umtuba-desktop-server` fingerprint `SHA256:ZkFAfQaSIT9KM+9ZCFfy65sRRALEMDLXEd15MdKXLyE` |
| BatchMode publickey | **Permission denied** for `Administrator`, `root`, `1`, `umtuba`, `server`, `central`, `admin`, `Admin`, `user`, `operator`, `cursor`, `ssh` (server offers publickey + password + keyboard-interactive; no password attempted) |
| WinRM identify | responds (stack 3.0) |
| WinRM Invoke-Command | **FAIL** — workgroup; TrustedHosts not set; TrustedHosts **not** mutated |
| WSL | `docker-desktop` Stopped — not Central |
| Desktop `CENTRAL_*` env | none |
| SMB `umtuba-multi-agent-desktop` | reachable; `intake\Desktop` writable |
| Store QA file on SMB | **absent** (not copied) |
| `UMTUBA-SHARE` | not used |

Central SSH to **production** (Central pubkey already in production `authorized_keys`) does **not** put AUTH_ENV on Central HOME/checkout. Desktop did **not** copy the secret onto production.

`SECURE_TRANSFER_METHOD = NONE this session`

---

## Phase 3 — Central landing

STORE_AUTH_ENV_LANDED_ON_CENTRAL = **NO**  
CENTRAL_AUTH_ENV_GITIGNORED = **UNKNOWN** (cannot observe Central checkout)

No Central HOME / checkout path is writable from this session except SMB intake, which is **forbidden** for this password.

Non-secret helper deposited (public key only — **not** AUTH_ENV):

`\\192.168.88.11\umtuba-multi-agent-desktop\intake\Desktop\DESKTOP_CENTRAL_STORE_AUTH_ENV_SECURE_LANDING_V3\`

Contains `README.md` + `umtuba-desktop-server.pub` so Central **may** authorize Desktop for a later encrypted copy over SSH. Private key was **not** copied.

---

## Phase 4 — Central-side proof

**Not executed.** This session cannot run commands on Central checkout. Desktop-only presence of `.env.store-qa.local` does **not** satisfy `CENTRAL_CAN_LOAD_STORE_QA_ENV`.

CENTRAL_CAN_LOAD_STORE_QA_ENV = **NO**  
CENTRAL_STORE_AUTH_ENV_READY = **NO**

---

## Production note (observe only; Desktop did not deploy)

Desktop BatchMode SSH to `root@178.104.196.2` (operator key, known-hosts pin) — **PASS**:

| Field | Value |
|-------|--------|
| hostname | `umtuba-production-1` |
| current | `/opt/umtuba/production/releases/76598e7-20260813172814` |
| `.env.store-qa.local` in current | **NO** (correct; do not land AUTH_ENV on production app tree) |
| `authorized_keys` nonempty lines | **2** (Desktop + Central pubkeys from prior append) |
| `umtuba-production.service` | active |

`origin/alpha-0.2` on Desktop after `git fetch --prune` = `76598e7fc0f8f93ee27f5be58792c2a289b7cf31`. Host release directory name matches that tip. Earlier Desktop packets recorded `e84475a` then target `2df90a29`; a later deploy **appears** to have landed `76598e7`. Desktop **did not** perform that deploy in this task.

---

## Git (both repos)

### umtuba-web

- `git fetch --prune`: branch already even with `origin/office/profile-hero-completeness-v1` (`5f0b6f15…`). No ff needed. No divergence stop.
- Dirty: prior `docs/ai/*` + untracked `docs/ops/closeout/` + concurrent UGC SQL. This task adds this closeout + light AI-doc notes.
- No commit.

### umtuba-mobile

- `git fetch --prune`: `master` **behind 2** vs `origin/master` (`3b33561` → `db7f927`) **and dirty**. Per task: stop for git, **do not** ff/stash/reset. AUTH_ENV landing continued.
- Uncommitted WIP **not touched** (`eas.json`, `app.config.ts`, `src`, `release-artifacts/`, UGC files).

---

## What Desktop did / did not do

**Did**

- Verified Desktop Store QA source (keys/identity/gitignore only).
- Re-probed Central SSH/WinRM/SMB.
- Confirmed no approved secret-manager channel in project docs.
- Observed production current release name `76598e7-…` without deploying.
- Wrote this closeout + non-secret SMB pubkey helper.
- Preserved Android WIP.

**Did not**

- Print or copy Store QA password / private keys / service-role
- Copy AUTH_ENV to SMB, Git, chat, OUTBOX, docs, production tree, or Windows Desktop
- Deploy production / build Android / mutate Play Console
- Commit / push / force / reset / stash
- Mutate TrustedHosts / WinRM
- Touch `_port_extract`

---

## BLOCKERS

1. **BLOCKED_OPERATOR_SECURE_TRANSFER** — Desktop cannot write Central HOME/checkout. LAN SSH publickey denied; WinRM invoke blocked; no documented secret manager; SMB forbidden for this secret.
2. Central-side AUTH_ENV load cannot be proven from this session.

## CENTRAL_ACTION_REQUIRED

On the **Central/SERVER Cursor runtime** (not Desktop), pick **one** of the following. Never Git, chat, plaintext SMB, or OUTBOX for the password.

### Path A — operator-secure copy (fastest)

1. On Desktop, the gitignored source is `C:\Users\1\Desktop\umtuba\umtuba-web\.env.store-qa.local` (email `store-qa@umtuba.com`, username `storeqa`). Do not open it in chat.
2. Copy that file onto Central `umtuba-web` checkout as `.env.store-qa.local` via USB, encrypted removable media, or an operator password manager. Owner-only permissions (`icacls` inheritance-remove + current user Read/Write, or `chmod 600` if using Git Bash).
3. Confirm `git check-ignore .env.store-qa.local` matches `.env*` and `git status` does **not** stage it.
4. From Central checkout, prove load **without printing the password** (PowerShell example):

```powershell
$p = Join-Path (Get-Location) '.env.store-qa.local'
$lines = Get-Content -LiteralPath $p | Where-Object { $_ -match '\S' -and $_ -notmatch '^\s*#' }
$emailOk = $false; $pwGt0 = $false; $keys = @()
foreach ($line in $lines) {
  if ($line -match '^\s*([A-Za-z0-9_]+)\s*=') {
    $k = $Matches[1]; $keys += $k
    $v = ($line -replace '^\s*[A-Za-z0-9_]+\s*=\s*', '').Trim().Trim('"').Trim("'")
    if ($k -eq 'STORE_QA_EMAIL' -and $v -eq 'store-qa@umtuba.com') { $emailOk = $true }
    if ($k -eq 'STORE_QA_PASSWORD' -and $v.Length -gt 0) { $pwGt0 = $true }
  }
}
Write-Host "KEYS=$($keys -join ',')"
Write-Host "EMAIL_EQUALS_STORE_QA=$emailOk"
Write-Host "PASSWORD_LEN_GT_0=$pwGt0"
Write-Host "CENTRAL_CAN_LOAD_STORE_QA_ENV=$($emailOk -and $pwGt0)"
```

Expected: `EMAIL_EQUALS_STORE_QA=True`, `PASSWORD_LEN_GT_0=True`. Then set `CENTRAL_STORE_AUTH_ENV_READY = YES` on Central.

### Path B — authorize Desktop SSH, then Desktop copies over SSH

1. On Central, append Desktop operator **public** key from  
   `\\192.168.88.11\umtuba-multi-agent-desktop\intake\Desktop\DESKTOP_CENTRAL_STORE_AUTH_ENV_SECURE_LANDING_V3\umtuba-desktop-server.pub`  
   (fingerprint `SHA256:ZkFAfQaSIT9KM+9ZCFfy65sRRALEMDLXEd15MdKXLyE`) to the SSH user’s `authorized_keys`. Do **not** request Desktop’s private key.
2. Tell Desktop the SSH username and the absolute Central checkout path.
3. Desktop will copy the gitignored file over SSH (not SMB) with owner-only mode, then Central runs the proof command above.

Do **not** use `google-play-review@umtuba.com`. Do not land this file under production `/opt/umtuba/production/current`.

## NEXT_ACTION_REQUIRED

Central: perform Path A or Path B, run the proof command, then continue Store QA / deploy gates on Central. Desktop AUTH_ENV owner stands by for Path B copy only. Desktop will not deploy.

---

## FILES_CHANGED

- `docs/ops/closeout/DESKTOP_CENTRAL_STORE_AUTH_ENV_SECURE_LANDING_V3.md` (this file)
- `docs/ai/CURRENT_TASK.md` (light concurrent-stream note; Android allowed scope preserved)
- `docs/ai/PROJECT_STATE.md`
- `docs/ai/SESSION_HANDOFF.md`
- `docs/ai/CURSOR_REPORT.md`

External (non-git, **non-secret**):

- `\\192.168.88.11\umtuba-multi-agent-desktop\intake\Desktop\DESKTOP_CENTRAL_STORE_AUTH_ENV_SECURE_LANDING_V3\README.md`
- `\\192.168.88.11\umtuba-multi-agent-desktop\intake\Desktop\DESKTOP_CENTRAL_STORE_AUTH_ENV_SECURE_LANDING_V3\umtuba-desktop-server.pub`
