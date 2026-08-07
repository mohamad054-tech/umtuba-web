# Laptop Central Handoff Savepoint — 2026-08-07

**Purpose:** Clear Collaboration SoT ambiguity before central coordination / laptop restart.

## Collaboration SoT (canonical)

| Item | Value |
| --- | --- |
| Branch | `office/collaboration-workspace-settings-lifecycle-ui-v1` |
| Tip | `1d05d92` + SoT-clarify docs commit on same branch |
| Worktree | `C:\Users\Admin\Desktop\umtuba\umtuba-web-collaboration-workspace-settings-lifecycle-ui-v1` |
| Migration `20260917` | In git on SoT; **remote DB NOT APPLIED** |
| Flag | `COLLABORATION_PLATFORM_ENABLED` default false |

## Not SoT (accounted)

| Ref | SHA | Notes |
| --- | --- | --- |
| smoke-e2e branch | `850421d` | Ops only; stale `20260898` |
| keepalive branch | `807550e` | Ops only; local tracking `0 0` |
| gate-docs local branch | `807550e` | Duplicate of keepalive tip |
| `collaboration-settings-lifecycle-ui-v1` (no workspace) | `f5ab724` | Superseded divergent — unsafe |

## UM Core

| Item | Value |
| --- | --- |
| Branch | `office/um-core-platform-event-publisher-foundation-p16` |
| Tip | `3120432` |
| Status | CLOSED / READY; P17 not started |

## Do NOT without GO

- Apply `20260917` (or stale `20260898`) remotely
- Touch Commerce worktrees
- Merge smoke/keepalive into SoT
- Start UM Core P17

## After resume

```powershell
Set-Location "C:\Users\Admin\Desktop\umtuba\umtuba-web-collaboration-workspace-settings-lifecycle-ui-v1"
git fetch origin
git status -sb
git rev-parse HEAD
# expect SoT clarify tip on settings-lifecycle branch; ahead/behind 0 0
```
