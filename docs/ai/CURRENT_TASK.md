# Current Task

## CURRENT COLLABORATION SOURCE OF TRUTH (2026-08-07 remote apply verify closeout)

- **Remote tip:** `origin/office/collaboration-workspace-settings-lifecycle-ui-v1` @ `8b7ee1ee0bb79680bfb947ab240479a1338e5bdc` (+ this closeout docs commit)
- **CURRENT WORKTREE:** `C:\Users\Admin\Desktop\umtuba\umtuba-web-collaboration-workspace-settings-lifecycle-ui-v1`
- **CURRENT BRANCH:** `office/collaboration-workspace-settings-lifecycle-ui-v1`
- **Sync:** expect `0 0` after closeout push

### Tip meaning

| SHA | Role |
| --- | --- |
| `6b60205` | Feature close — Workspace Settings & Lifecycle UI V1 |
| `6ea0634` | Reboot handoff docs on settings branch |
| `1d05d92` | Migration renamed `20260898` → `20260917` (central realloc) |
| `8b7ee1e` | SoT clarify handoff docs |
| (this commit) | Remote apply **verify/closeout** — `20260917` APPLIED + VERIFIED |

## LINE CLASSIFICATION (do not confuse)

| Ref | Class |
| --- | --- |
| `office/collaboration-workspace-settings-lifecycle-ui-v1` | **CANONICAL FEATURE SoT** |
| `office/collaboration-smoke-e2e-on-settings-tip-v1` | Ops / smoke — **NOT SoT** (stale `20260898` filename) |
| `office/collaboration-platform-gate-keepalive-v1` | Keepalive — **NOT SoT** (stale `20260898` filename) |
| `origin/office/collaboration-settings-lifecycle-ui-v1` @ `f5ab724` | **SUPERSEDED / UNSAFE** — do not use |

## CLOSED MILESTONES (Collaboration)

| Milestone | Commit / note |
| --- | --- |
| Workspace Spine Foundation V1 | `321e7e8` |
| Membership & Invitation Runtime V1 | `c3bf87e` |
| UI Foundation V1 | `cfd8a28` |
| Settings & Lifecycle UI V1 | `6b60205` |
| Settings migration reallocation (`20260917`) | `1d05d92` |
| SoT clarify docs | `8b7ee1e` |
| Settings Lifecycle remote apply verify/closeout | this docs commit |

## REMOTE MIGRATIONS

| Version | Status | Notes |
| --- | --- | --- |
| `20260917` | **APPLIED + VERIFIED** | Remote name `collaboration_workspace_settings_lifecycle_ui_v1`. RPC `update_collaboration_workspace_settings` present (SECURITY DEFINER, `search_path=public`, EXECUTE authenticated+service_role; no anon/public). **No further apply required.** |
| Collaboration `20260898` filename | **STALE / NON-SOT / DO NOT APPLY** | Exists only on smoke/keepalive forks |
| Remote `20260898` | Commerce | Remote history name `store_seller_live_payout_provider_v1` — do not treat as Collaboration |
| `20260896` / `20260897` | Do **not** re-apply | Remote history row names may differ from Collaboration git filenames; that is **not** a reason to re-apply. Do not repair history in this closeout. |

## Settings & Lifecycle remote dependency

**CLOSED** — canonical `20260917` verified on remote; settings write RPC available.

## COLLABORATION FLAG

- Default **`false`** (`COLLABORATION_PLATFORM_ENABLED`)
- Unchanged by this closeout

## UM CORE (separate)

- P16 @ `3120432` closed; do **not** start P17 from this handoff

## COMMERCE

- Owned by **desktop** — do not touch

## NEXT TASK

**Single recommended product milestone:** Collaboration Workspace Member Role Management UI V1  
(expose existing spine RPC `update_collaboration_workspace_member_role`; no Learning/Commerce/UEOS bindings; not keepalive/smoke based)

Do **not** merge smoke/keepalive into SoT without explicit integration GO.

## Status

**COLLABORATION_SETTINGS_LIFECYCLE_REMOTE_CLOSEOUT_CLOSED**
