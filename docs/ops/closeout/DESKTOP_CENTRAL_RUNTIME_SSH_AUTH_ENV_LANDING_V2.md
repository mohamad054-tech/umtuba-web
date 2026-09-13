# DESKTOP_CENTRAL_RUNTIME_SSH_AUTH_ENV_LANDING_V2

**DEVICE:** DESKTOP  
**DEVICE_ROLE:** PRODUCTION_ACCESS_OPERATOR  
**CENTRAL_COORDINATOR:** SERVER  
**PRIORITY:** RELEASE_CRITICAL  
**DATE:** 2026-08-13  
**TASK_ID:** DESKTOP_CENTRAL_RUNTIME_SSH_AUTH_ENV_LANDING_V2  
**WEB:** `C:\Users\1\Desktop\umtuba\umtuba-web` `office/profile-hero-completeness-v1` @ `7ed9159`  
**MOBILE (preserved):** `C:\Users\1\Desktop\umtuba\umtuba-mobile` `master` @ `fe14a34` + uncommitted `eas.json` / `app.config.ts` / `release-artifacts/`  
**TARGET:** `origin/alpha-0.2` @ `2df90a29c338466e81e85e1685c3c6e9e0758fd3`

No product/runtime code changes. No git commit / push. No deploy of `2df90a29`. No live Stripe. No Play reviewer reuse. Private keys and Store QA password not written here.

Prior Desktop-local packet (still valid for **Desktop only**): `docs/ops/closeout/DESKTOP_PRODUCTION_SSH_AUTH_ENV_PROVISIONING_V1.md`. That packet’s `CENTRAL_DEPLOY_ACCESS_READY = YES` is **superseded** for Central runtime gates.

---

## Verdict

| Gate | Result |
|------|--------|
| CENTRAL_RUNTIME_REACHABLE_FROM_DESKTOP | **NO** (cannot execute on Central HOME / `.ssh` / checkout) |
| SSH_CONFIG_LANDED | **NO** (Central SSH config location unknown; Desktop has no `~/.ssh/config`) |
| IDENTITYFILE_REFERENCE_RESOLVED | **NO** (Central IdentityFile path not observable) |
| CENTRAL_SSH_HOST_REACHABLE | **NO** (not proven from Central; Desktop→production TCP/22 **is** open) |
| CENTRAL_SSH_KEY_AUTH | **FAIL** (not executed on Central) |
| CENTRAL_CAN_SSH_FROM_ITS_OWN_RUNTIME | **NO** |
| STORE_AUTH_ENV_LANDED | **NO** |
| CENTRAL_CAN_LOAD_STORE_QA_ENV | **NO** |
| CENTRAL_SSH_RUNTIME_READY | **NO** |
| CENTRAL_STORE_AUTH_ENV_READY | **NO** |
| TARGET_SHA | `2df90a29c338466e81e85e1685c3c6e9e0758fd3` |
| TARGET_SHA_RESOLVED | **YES** (`origin/alpha-0.2`) |
| CURRENT_PRODUCTION_SHA | `e84475a769c731bb7e1ad511b3543ee714d2feea` (release `e84475a-20260812000913`) |
| CENTRAL_DEPLOY_PRECONDITIONS_READY | **NO** |
| DEPLOY_PERFORMED_BY_DESKTOP | **NO** |
| SECRETS_EXPOSED | **NO** |
| ANDROID_WORK_PRESERVED | **YES** |
| PRIVATE_KEY_COPIED_TO_CENTRAL_OR_SHARE | **NO** |

Desktop-local SSH to production remains **PASS** (operator key). That is **not** Central-ready.

---

## ROOT CAUSES

### ROOT_CAUSE_CENTRAL_SSH_NOT_READY

Production `/root/.ssh/authorized_keys` contains **exactly 1** key. Fingerprint `SHA256:ZkFAfQaSIT9KM+9ZCFfy65sRRALEMDLXEd15MdKXLyE` matches the Desktop operator key (`umtuba-desktop-server`). Central’s runtime does **not** have that private key, and this session cannot install Central’s public key because:

1. Desktop cannot execute `ssh-keygen` (or any command) on Central’s filesystem.
2. Central has not deposited a public key for Desktop to append.
3. Copying Desktop’s **private** key to Central / LAN share / Git / chat / plain OUTBOX is forbidden (explicit recovery-pack rule).

Option evaluation:

| Option | Result this pass |
|--------|------------------|
| A) Copy Desktop private key onto Central | **Rejected.** No secure machine-to-machine channel into Central HOME. LAN share / Git / chat forbidden for private keys. |
| B) Central keypair on Central, Desktop appends `.pub` to production | **Preferred, blocked.** Cannot generate the key **on Central**. Pubkey-drop folder prepared (see Phase 2). |
| C) Fix Central SSH config / IdentityFile only | **Not applicable.** No evidence Central already has an authorized private key; Desktop `~/.ssh/config` is absent and would not apply to Central anyway. |

### ROOT_CAUSE_CENTRAL_AUTH_ENV_NOT_READY

Store QA secret exists **only** as the gitignored Desktop file `umtuba-web/.env.store-qa.local` (present, gitignored via `.gitignore` `.env*`). Central’s checkout does not have this file. Production current tree correctly has **no** `.env.store-qa.local`. No approved secret transport from this session can land the password onto Central (Git / chat / documentation / plain OUTBOX / SMB intake all forbidden for passwords). Play reviewer credentials were not used.

### CENTRAL_RUNTIME_CONTEXT

Central/SERVER is a **separate coordinator execution environment**, not this Desktop Cursor session.

Observed from Desktop (`DESKTOP-844IU2G`, user `1`, Wi-Fi `192.168.88.4`):

| Probe | Result |
|-------|--------|
| This session OS | Windows NT 10.0.26200 |
| HOME / profile | `C:\Users\1` — **Desktop only**; do not assume for Central |
| Desktop SSH config | **absent** (`C:\Users\1\.ssh\config` missing) |
| Desktop IdentityFile | `C:\Users\1\.ssh\id_ed25519` (ED25519, comment `umtuba-desktop-server`) |
| CENTRAL_* env vars | **none** on Desktop |
| WSL | `docker-desktop` **Stopped** — not a Central runtime |
| Other local Windows users | `1`, `Public` only |
| Cursor cloud agent filesystem | **not reachable** from this session (no MCP/runtime handle) |
| Named OUTBOX / INBOX queues under Desktop umtuba | **not found** |
| Guardian localhost `:8787` | historical decide-oracle only; not a deploy/SSH runtime |

LAN hub (not proven to **be** the SERVER Cursor runtime):

| Field | Value |
|-------|--------|
| Host | `WIN-MJRKAKK2MEH` `192.168.88.11` (TTL=128 Windows) |
| TCP/22 | open |
| SSH with Desktop production key | **Permission denied** for `Administrator`, `root`, `1`, `umtuba`, `server`, `central`, `admin` (publickey + password + keyboard-interactive offered; BatchMode publickey fails) |
| WinRM identify | `Test-WSMan` responds (stack 3.0) |
| WinRM Invoke-Command | **FAIL** — workgroup; TrustedHosts not set; no credentials used; TrustedHosts **not** mutated |
| SMB `umtuba-multi-agent-desktop` | reachable; `intake\Desktop` **writable** |
| SMB contents | Guardian **Desktop/Laptop commerce-agent packages** (`repository_root` Desktop `C:/Users/1/...`, Laptop `C:/Users/Admin/Desktop/umtuba/umtuba-web`) — **not** Central `$HOME/.ssh` |
| `UMTUBA-SHARE` | access denied |

Conclusion: Desktop can deposit **non-secret** packets to SMB intake and can SSH to **production**, but cannot enter Central’s HOME, resolve Central’s IdentityFile, or load AUTH_ENV as Central.

---

## Phase 1 — identification (done)

Inspected before any secret landing attempt: both git repos, `git fetch --prune` (web + mobile in sync with remotes; no divergence), prior SSH closeout, Hetzner master info, SERVER_A3 archive handoffs, Guardian SMB packages, WSL, local users, SSH dir, env names, production authorized_keys.

Central expected AUTH_ENV (from Desktop gitignored file; **names only**):

| Name | Role |
|------|------|
| `STORE_QA_EMAIL` | `store-qa@umtuba.com` (non-secret identity; already in prior closeout) |
| `STORE_QA_USERNAME` | `storeqa` |
| `STORE_QA_PASSWORD` | secret — Desktop file only |
| `STORE_QA_USER_ID` | `e7654a61-c196-4a3e-b368-3c0cb684e434` (prior closeout) |
| `STORE_QA_AUTH_HOST` | production Auth host (name only) |

Landing path Central scripts should use: `<central-umtuba-web-checkout>/.env.store-qa.local` (same basename as Desktop; gitignored `.env*`). Do not use Google Play reviewer `.env.play-review.local`.

---

## Phase 2 — SSH landing (blocked; pubkey drop prepared)

Production SSH from **Desktop** (2026-08-13, redacted):

```
ssh -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes
    -o UserKnownHostsFile=%USERPROFILE%\.ssh\umtuba_hetzner_known_hosts
    -i %USERPROFILE%\.ssh\id_ed25519
    -p 22 root@178.104.196.2
```

Result: `SSH_OK`, `hostname=umtuba-production-1`, `whoami=root`, `authorized_keys` mode `600`, **count=1**, fingerprint matches Desktop operator, `current` → `/opt/umtuba/production/releases/e84475a-20260812000913`.

No second key added. Desktop key not rotated.

**Prepared (non-secret) Central pubkey intake:**

`\\192.168.88.11\umtuba-multi-agent-desktop\intake\Desktop\DESKTOP_CENTRAL_RUNTIME_SSH_AUTH_ENV_LANDING_V2\README_PUBKEY_DROP.md`

Central must drop **only** `umtuba-central-server.pub` there. Desktop will then append it to production `authorized_keys` on a follow-up GO. Private keys must never be placed in that folder.

Suggested Central SSH snippet (Central HOME, after its own key exists) — **template only**:

```
Host umtuba-production
    HostName 178.104.196.2
    User root
    Port 22
    IdentityFile ~/.ssh/umtuba-central-server
    IdentitiesOnly yes
    StrictHostKeyChecking yes
```

Host ED25519 fingerprint to pin: `SHA256:qXJL/K4UkuUuhMv3WJRfzcma/GPjISfZy4O05vSj8A8`.

---

## Phase 3 — AUTH_ENV landing (blocked)

Desktop file exists (`umtuba-web/.env.store-qa.local`, gitignored). Contents not printed. Not copied to SMB, Git, archive, production app tree, or this report.

No Central checkout path is writable from this session except SMB intake (forbidden for this secret).

---

## Phase 4 — Central-side validation

**Not executed.** Commands on Central are required for YES. Desktop-only SSH/AUTH_ENV checks do not satisfy this task.

---

## Phase 5 — deploy readiness

`origin/alpha-0.2` = `2df90a29c338466e81e85e1685c3c6e9e0758fd3` (`fix(auth,i18n): land Central UAF-02/03/06/08 shared auth and landing fixes`). Production still `e84475a…`. Desktop did **not** deploy. `CENTRAL_DEPLOY_PRECONDITIONS_READY = NO` because Phase 4 gates remain NO.

---

## What Desktop did / did not do

**Did**

- Fetched both repos (ff-only not needed; already in sync).
- Identified Central access gap (runtime not on this session).
- Reconfirmed production key inventory (count=1, Desktop fingerprint).
- Prepared non-secret pubkey-drop folder + this closeout.
- Preserved Android uncommitted work and prior closeouts.

**Did not**

- Deploy `2df90a29`
- Copy or print private keys / Store QA password
- Rotate production credentials
- Mutate TrustedHosts / WinRM
- Touch Store/Learning UX, Android product files, `_port_extract`
- Commit / push / force / reset / stash
- Write artifacts to the Windows Desktop

---

## BLOCKERS

1. Cannot execute on Central/SERVER runtime (no SSH key auth to `WIN-MJRKAKK2MEH`, no WinRM session, no WSL Central, no cloud-agent FS, SMB is agent-package intake not `$HOME`).
2. Production authorizes only the Desktop operator key.
3. Store QA AUTH_ENV is Desktop-local gitignored only; no approved secret transport into Central checkout.

## CENTRAL_ACTION_REQUIRED (ONE operator action)

On the **Central/SERVER Cursor runtime** (not Desktop): generate `ssh-keygen -t ed25519 -C umtuba-central-server` under Central `$HOME/.ssh`, deposit **only** the `.pub` file as `\\192.168.88.11\umtuba-multi-agent-desktop\intake\Desktop\DESKTOP_CENTRAL_RUNTIME_SSH_AUTH_ENV_LANDING_V2\umtuba-central-server.pub`, and operator-secure-copy Desktop `umtuba-web/.env.store-qa.local` onto Central’s `umtuba-web` checkout as `.env.store-qa.local` with owner-only permissions (USB / password manager / physical operator copy — **never** Git, chat, or SMB). Then notify Desktop to append the public key to production `authorized_keys`. After that append, Central re-runs BatchMode SSH to `root@178.104.196.2` and AUTH_ENV load (print key **names** / PASS/FAIL only).

## NEXT_ACTION_REQUIRED

Central: perform the action above, then re-run deploy preconditions for `2df90a29`. Desktop stands by to append the public key only — Desktop will not deploy.

---

## FILES_CHANGED

- `docs/ai/CURRENT_TASK.md`
- `docs/ai/PROJECT_STATE.md`
- `docs/ai/SESSION_HANDOFF.md`
- `docs/ai/CURSOR_REPORT.md`
- `docs/ops/closeout/DESKTOP_CENTRAL_RUNTIME_SSH_AUTH_ENV_LANDING_V2.md`

External (non-git, non-secret):

- `\\192.168.88.11\umtuba-multi-agent-desktop\intake\Desktop\DESKTOP_CENTRAL_RUNTIME_SSH_AUTH_ENV_LANDING_V2\README_PUBKEY_DROP.md`
- `C:\Users\1\Documents\UMTUBA\Desktop-Agent-Archive\2026-08-13\Handoffs\DESKTOP_CENTRAL_RUNTIME_SSH_AUTH_ENV_LANDING_V2\`
