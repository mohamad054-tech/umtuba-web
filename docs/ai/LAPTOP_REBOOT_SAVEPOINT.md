# Laptop Central Handoff Savepoint — 2026-08-07

**Purpose:** Settings Lifecycle remote dependency closed via verify/closeout (no SQL re-apply).

## Collaboration SoT (canonical)

| Item | Value |
| --- | --- |
| Branch | `office/collaboration-workspace-settings-lifecycle-ui-v1` |
| Tip | `8b7ee1e` + remote-apply verify/closeout docs commit |
| Worktree | `C:\Users\Admin\Desktop\umtuba\umtuba-web-collaboration-workspace-settings-lifecycle-ui-v1` |
| Migration `20260917` | **APPLIED + VERIFIED** — no further apply |
| Flag | `COLLABORATION_PLATFORM_ENABLED` default false |

## Not SoT (accounted)

| Ref | Notes |
| --- | --- |
| smoke / keepalive | NOT SoT; stale Collaboration `20260898` filename = **DO NOT APPLY** |
| remote `20260898` | Commerce `store_seller_live_payout_provider_v1` |
| `collaboration-settings-lifecycle-ui-v1` (no workspace) @ `f5ab724` | Superseded — unsafe |

## Do NOT

- Re-apply `20260917`
- Apply stale Collaboration `20260898` from ops forks
- Repair/re-apply `20260896`/`20260897` due to remote history name drift
- Touch Commerce / start UM Core P17 / use keepalive as SoT

## Next product milestone

Collaboration Workspace Member Role Management UI V1
