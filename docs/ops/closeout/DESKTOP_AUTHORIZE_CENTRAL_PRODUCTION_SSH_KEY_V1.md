# DESKTOP_AUTHORIZE_CENTRAL_PRODUCTION_SSH_KEY_V1

**DEVICE:** DESKTOP  
**DEVICE_ROLE:** PRODUCTION_ACCESS_OPERATOR  
**CENTRAL_COORDINATOR:** SERVER  
**PRIORITY:** RELEASE_CRITICAL  
**DATE:** 2026-08-13  
**TASK_ID:** DESKTOP_AUTHORIZE_CENTRAL_PRODUCTION_SSH_KEY_V1  
**WEB:** `C:\Users\1\Desktop\umtuba\umtuba-web` `office/profile-hero-completeness-v1` (in sync with origin; account-deletion WIP preserved, not committed by this task)  
**TARGET SHA (unchanged, not deployed):** `2df90a29c338466e81e85e1685c3c6e9e0758fd3`

No product/runtime code changes. No git commit / push. No deploy of `2df90a29`. No key rotation. No `authorized_keys` replace. No private keys or Store QA password in this file.

Concurrent stream (do not interrupt): `DESKTOP_ACCOUNT_DELETION_WEB_FLOW_COMMIT_HANDOFF_V1`.

---

## Verdict

| Gate | Result |
|------|--------|
| CENTRAL_PUBLIC_KEY_FOUND | **YES** |
| CENTRAL_PUBLIC_KEY_VALID | **YES** |
| CENTRAL_PUBLIC_KEY_AUTHORIZED | **YES** |
| AUTHORIZED_KEYS_PRESERVED | **YES** |
| DESKTOP_EXISTING_KEY_PRESERVED | **YES** |
| PRODUCTION_SSH_HEALTH | **PASS** |
| DESKTOP_SSH_STILL_WORKS | **YES** |
| CENTRAL_KEY_SERVER_SIDE_READY | **YES** |
| CENTRAL_STORE_AUTH_ENV_READY | **NO** (not blocking this SSH append) |
| DEPLOY_PERFORMED_BY_DESKTOP | **NO** |
| SECRETS_EXPOSED | **NO** |
| CENTRAL_SSH_AUTH_FROM_CENTRAL | **NOT TESTED** (Desktop does not possess Central’s private key) |

SUCCESS: Central public key appended; Desktop operator key preserved; production SSH still accepts Desktop BatchMode.

---

## Phase 1 — public key verification

Expected drop path (empty / no `.pub`):

`\\192.168.88.11\umtuba-multi-agent-desktop\intake\Desktop\DESKTOP_CENTRAL_RUNTIME_SSH_AUTH_ENV_LANDING_V2\`  
contained only `README_PUBKEY_DROP.md` and the prior landing closeout.

**Found at nearby inbox path:**

`\\192.168.88.11\umtuba-multi-agent-desktop\inbox\Desktop\DESKTOP_CENTRAL_RUNTIME_SSH_AUTH_ENV_LANDING_V2\umtuba-central-server.pub`

Also searched: share-wide `*.pub`, Desktop/Documents UMTUBA trees, `docs/ops`, `%USERPROFILE%\.ssh`. Only this one matching filename.

| Check | Result |
|------|--------|
| File exists | YES (103 bytes, 2026-08-13 18:17:56 local) |
| Exactly one nonempty line | YES |
| Type | `ssh-ed25519` |
| Comment | `umtuba-central-server` |
| Blob shape | starts `AAAA…`, length 68, last-4 `dwoa` |
| Private-key markers | NONE (`BEGIN OPENSSH PRIVATE KEY` / other PEM private headers absent) |
| `ssh-keygen -lf` | `256 SHA256:aq486t4kSI5p20YjBCnBY+RfjUYBBVxQj8U7C6EmVc0 umtuba-central-server (ED25519)` |

CENTRAL_PUBLIC_KEY_VALID = YES  
Full public key material is **not** copied here.

---

## Phase 2 — preserve existing access (pre-append)

Desktop BatchMode SSH to `root@178.104.196.2:22` using `%USERPROFILE%\.ssh\id_ed25519` and `%USERPROFILE%\.ssh\umtuba_hetzner_known_hosts`.

Pre-change inventory:

| Field | Value |
|------|--------|
| Host | `umtuba-production-1` |
| User | `root` |
| `/root/.ssh` | `700` `root:root` |
| `authorized_keys` | `600` `root:root` size 81 |
| Key count | **1** |
| Existing fingerprint | `SHA256:ZkFAfQaSIT9KM+9ZCFfy65sRRALEMDLXEd15MdKXLyE` (ED25519) |
| Matches Desktop operator | **YES** (`umtuba-desktop-server` local `.pub`) |
| sshd | listening on `:22`, unit active |

Backup created **without deleting original:** `/root/.ssh/authorized_keys.bak-20260813` (`600` `root:root` size 81).

No sshd config change. No key rotation. No Desktop key removal.

---

## Phase 3 — append Central public key

Incoming file copied to `/tmp/umtuba-central-server.pub.incoming`, validated (type/comment/fingerprint), then **appended** with `cat >>` (not `cat >`). Incoming temp removed after append.

Post-change inventory:

| Field | Value |
|------|--------|
| `authorized_keys` | `600` `root:root` size 184 |
| `/root/.ssh` | `700` `root:root` |
| Key count | **2** |
| Key 1 | `SHA256:ZkFAfQaSIT9KM+9ZCFfy65sRRALEMDLXEd15MdKXLyE` (Desktop operator; preserved) |
| Key 2 | `SHA256:aq486t4kSI5p20YjBCnBY+RfjUYBBVxQj8U7C6EmVc0` comment `umtuba-central-server` |
| Duplicate skip | not needed (Central fingerprint was absent before append) |

CENTRAL_PUBLIC_KEY_AUTHORIZED = YES  
DESKTOP_EXISTING_KEY_PRESERVED = YES  
AUTHORIZED_KEYS_PRESERVED = YES

---

## Phase 4 — server-side validation

New BatchMode SSH sessions **after** append:

- `SSH_OK` `hostname=umtuba-production-1` `whoami=root`
- `test -d /opt/umtuba/production/current` → YES  
  current → `/opt/umtuba/production/releases/e84475a-20260812000913` (unchanged; still `e84475a…`)
- sshd listening `0.0.0.0:22` and `[::]:22`
- Desktop second probe: `DESKTOP_SSH_STILL_WORKS=YES`

PRODUCTION_SSH_HEALTH = PASS  
DESKTOP_SSH_STILL_WORKS = YES  
CENTRAL_KEY_SERVER_SIDE_READY = YES  

Desktop **cannot** claim Central-side authentication PASS.

---

## Store AUTH_ENV

CENTRAL_STORE_AUTH_ENV_READY = **NO**

Store QA secret remains Desktop-local gitignored `umtuba-web/.env.store-qa.local`. No approved operator transfer in this session. This does **not** block the SSH public-key append.

---

## Deploy

DEPLOY_PERFORMED_BY_DESKTOP = **NO**  
Target remains `2df90a29c338466e81e85e1685c3c6e9e0758fd3`. Production current still `e84475a-20260812000913`.

---

## What Desktop did / did not do

**Did**

- `git fetch --prune` (branch already in sync with origin; no ff needed; no divergence stop for SSH work)
- Located and validated Central `.pub` (inbox path)
- Backed up production `authorized_keys` then appended Central key
- Reconfirmed Desktop BatchMode SSH after mutation
- Wrote this closeout

**Did not**

- Deploy `2df90a29` or any SHA
- Rotate / replace / overwrite `authorized_keys`
- Remove Desktop key
- Change sshd configuration
- Copy or print private keys / Store QA password
- Interrupt account-deletion git commit / stash / reset
- Commit / push
- Write artifacts to the Windows Desktop or `_port_extract`

---

## BLOCKERS

1. CENTRAL_STORE_AUTH_ENV_READY = NO (separate; not blocking SSH).
2. Central-side SSH auth not proven from Desktop (expected).

## CENTRAL_ACTION_REQUIRED

On the **Central/SERVER runtime**, using Central’s private key (`IdentityFile` for `umtuba-central-server`), run BatchMode SSH to `root@178.104.196.2:22` and confirm public-key auth. Pin host ED25519 `SHA256:qXJL/K4UkuUuhMv3WJRfzcma/GPjISfZy4O05vSj8A8`. Do not ask Desktop to transfer Central’s private key.

AUTH_ENV remains a separate operator-secure copy of `.env.store-qa.local` (never Git/chat/SMB).

After Central SSH auth PASS, Central may proceed with authorized deploy of `2df90a29`. Desktop will not start that deploy.

## NEXT_ACTION_REQUIRED

Central: verify SSH authentication from Central runtime, then deploy `2df90a29` when that gate is green. Desktop account-deletion commit stream is independent and must not be discarded.

---

## FILES_CHANGED (docs only; uncommitted by this task)

- `docs/ops/closeout/DESKTOP_AUTHORIZE_CENTRAL_PRODUCTION_SSH_KEY_V1.md`
- `docs/ai/CURRENT_TASK.md` (this task complete; account-deletion concurrent preserved)
- `docs/ai/PROJECT_STATE.md`
- `docs/ai/SESSION_HANDOFF.md`
- `docs/ai/CURSOR_REPORT.md`
