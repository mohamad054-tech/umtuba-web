# Session Handoff — UMTUBA Laptop Collaboration Platform

**Updated:** 2026-08-07 (central handoff SoT clarify)

## CURRENT COLLABORATION SOURCE OF TRUTH

| Item | Value |
| --- | --- |
| Remote | `origin/office/collaboration-workspace-settings-lifecycle-ui-v1` |
| Tip base | `1d05d92` + this clarify docs commit |
| Worktree | `C:\Users\Admin\Desktop\umtuba\umtuba-web-collaboration-workspace-settings-lifecycle-ui-v1` |
| Branch | `office/collaboration-workspace-settings-lifecycle-ui-v1` |
| Sync | expect `0 0` after push |

## CLOSED MILESTONES

1. Spine Foundation V1 — `321e7e8` (`20260896` applied remote)
2. Membership & Invitation Runtime V1 — `c3bf87e` (`20260897` applied remote)
3. UI Foundation V1 — `cfd8a28` (flag default=false)
4. Laptop handoff docs — `b002402`
5. Settings & Lifecycle UI V1 — `6b60205`
6. Migration reallocation to `20260917` — `1d05d92`

## OPS FORKS (NOT SoT)

- Smoke E2E readiness — `office/collaboration-smoke-e2e-on-settings-tip-v1` @ `850421d`
- Platform gate keepalive — `office/collaboration-platform-gate-keepalive-v1` @ `807550e` (local upstream set; `0 0`)
- Superseded alternate: `origin/office/collaboration-settings-lifecycle-ui-v1` @ `f5ab724` — **DO NOT USE**

## REMOTE MIGRATIONS

- Applied: `20260896`, `20260897`
- **NOT APPLIED (canonical):** `20260917`
- Stale name on ops forks only: `20260898` — do not apply

## COLLABORATION FLAG

default = **false**

## UM CORE

P16 @ `3120432` closed. P17 not started.

## COMMERCE

**LOCKED_FOR_DESKTOP** — do not touch on laptop.

## NEXT TASK

- Apply `20260917` remotely (explicit GO), **or**
- Gate/start next Collaboration milestone (TBD)
- Do not merge smoke/keepalive into SoT without explicit integration GO

## Resume commands

```powershell
Set-Location "C:\Users\Admin\Desktop\umtuba\umtuba-web-collaboration-workspace-settings-lifecycle-ui-v1"
git fetch origin
git status -sb
git rev-parse HEAD
git rev-list --left-right --count HEAD...origin/office/collaboration-workspace-settings-lifecycle-ui-v1
```
