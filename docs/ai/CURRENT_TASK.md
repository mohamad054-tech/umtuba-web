# Current Task

## CURRENT COLLABORATION SOURCE OF TRUTH (2026-08-07 central handoff clarify)

- **Remote tip:** `origin/office/collaboration-workspace-settings-lifecycle-ui-v1` @ `1d05d92cfc1e207124c56479127e09ba3275109f`
- **CURRENT WORKTREE:** `C:\Users\Admin\Desktop\umtuba\umtuba-web-collaboration-workspace-settings-lifecycle-ui-v1`
- **CURRENT BRANCH:** `office/collaboration-workspace-settings-lifecycle-ui-v1`
- **Sync:** `0 0` with origin (after migration reallocation + handoff clarify)

### Tip meaning

| SHA | Role |
| --- | --- |
| `6b60205` | Feature close — Workspace Settings & Lifecycle UI V1 |
| `6ea0634` | Reboot handoff docs on settings branch |
| `1d05d92` | **Canonical tip** — migration renamed `20260898` → `20260917` (central realloc) |

## LINE CLASSIFICATION (do not confuse)

| Ref | SHA | Class |
| --- | --- | --- |
| `office/collaboration-workspace-settings-lifecycle-ui-v1` | `1d05d92` | **CANONICAL FEATURE SoT** |
| `office/collaboration-smoke-e2e-on-settings-tip-v1` | `850421d` | Ops / smoke readiness — **NOT SoT** (forked from `6ea0634`; still carries stale `20260898` filename) |
| `office/collaboration-platform-gate-keepalive-v1` | `807550e` | Keepalive gate verification — **NOT SoT** (on top of smoke; stale `20260898`) |
| `office/collaboration-workspace-settings-gate-docs-v1` (local) | `807550e` | Duplicate checkout of keepalive tip — **NOT SoT**; no unique commits |
| `origin/office/collaboration-settings-lifecycle-ui-v1` | `f5ab724` | **SUPERSEDED / UNSAFE** divergent alternate name — do not use |

## CLOSED MILESTONES (laptop Collaboration)

| Milestone | Commit |
| --- | --- |
| Collaboration Workspace Spine Foundation V1 | `321e7e8` |
| Collaboration Workspace Membership & Invitation Runtime V1 | `c3bf87e` |
| Collaboration Workspace UI Foundation V1 | `cfd8a28` |
| Collaboration laptop handoff docs V1 | `b002402` |
| Collaboration Workspace Settings & Lifecycle UI V1 | `6b60205` |
| Settings migration reallocation (`20260917`) | `1d05d92` |
| Smoke E2E readiness on settings tip (ops) | `850421d` — not SoT |
| Platform gate keepalive (ops) | `807550e` — not SoT |

## REMOTE MIGRATIONS

| Migration | Remote DB |
| --- | --- |
| `20260896` spine foundation | **APPLIED** |
| `20260897` membership runtime | **APPLIED** |
| `20260917` settings lifecycle UI | **NOT APPLIED** (canonical filename on SoT tip; do not apply until explicit GO) |
| `20260898` | **STALE name** on smoke/keepalive forks only — do **not** apply; SoT uses `20260917` |

## COLLABORATION FLAG

- Default **`false`** (`COLLABORATION_PLATFORM_ENABLED`)
- Routes/actions/menu remain fail-closed when disabled

## UM CORE (separate track)

- Closed tip: `office/um-core-platform-event-publisher-foundation-p16` @ `3120432`
- Worktree: `C:\Users\Admin\Desktop\umtuba\umtuba-web-um-core-platform-event-publisher-foundation-p16`
- Do **not** start P17 from Collaboration handoff

## COMMERCE

- Owned by **desktop** — do not touch on laptop

## NEXT TASK

Decide with human:

1. **Apply** migration `20260917` remotely (explicit GO required), **or**
2. Gate / start the **next Collaboration milestone** after Settings & Lifecycle UI V1 (TBD — do not invent without docs/approval)

Do **not** merge smoke/keepalive into SoT without an explicit integration GO (they diverge after `6ea0634` and still reference `20260898`).

## Status

**COLLABORATION_SOT_CLARIFIED** for central control. Canonical tip `1d05d92` pushed. Migration `20260917` remains **NOT APPLIED**.
