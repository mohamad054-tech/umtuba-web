# Current Task

## CURRENT LAPTOP SOURCE OF TRUTH (2026-08-03 reboot save)

- **Remote tip:** `origin/office/collaboration-workspace-settings-lifecycle-ui-v1` @ `6b60205dfb01168552ff6344523ec3e8b22eb70e`
- **CURRENT WORKTREE:** `C:\Users\Admin\Desktop\umtuba\umtuba-web-collaboration-workspace-settings-lifecycle-ui-v1`
- **CURRENT BRANCH:** `office/collaboration-workspace-settings-lifecycle-ui-v1`
- **Sync:** `0 0` with origin (verified at closeout)

## CLOSED MILESTONES (laptop)

| Milestone | Commit |
| --- | --- |
| Learning AI Tutor Learner UI Integration V1 | `c3168eff3a324979efa5cab694e294c4daeeb4da` |
| Collaboration Workspace Spine Foundation V1 | `321e7e8de95d81efecfa423b7c515d36afa84a75` |
| Collaboration Workspace Membership & Invitation Runtime V1 | `c3bf87e7f6ec2cbcb0b8e1812c0cac58b20594af` |
| Collaboration Workspace UI Foundation V1 | `cfd8a2889edab7a1767fba8716cce975ffe75def` |
| Collaboration laptop handoff docs V1 | `b00240226b274c479dddd081da2332fd1f956145` |
| Collaboration Workspace Settings & Lifecycle UI V1 | `6b60205dfb01168552ff6344523ec3e8b22eb70e` |

## REMOTE MIGRATIONS

| Migration | Remote DB |
| --- | --- |
| `20260896` spine foundation | **APPLIED** |
| `20260897` membership runtime | **APPLIED** |
| `20260898` settings lifecycle UI | **NOT APPLIED** (file is in git; do not apply until explicit GO) |

## COLLABORATION FLAG

- Default **`false`** (`COLLABORATION_PLATFORM_ENABLED`)
- Routes/actions/menu remain fail-closed when disabled

## COMMERCE

- Owned by **desktop** — do not touch on laptop

## NEXT TASK (after reboot)

Decide with human:

1. **Apply** migration `20260898` remotely (explicit GO required), **or**
2. Gate / start the **next Collaboration milestone** after Settings & Lifecycle UI V1 (TBD — do not invent without docs/approval)

## Pre-reboot dirty leftovers (not Collaboration SoT)

| Worktree | Notes |
| --- | --- |
| `umtuba-web-collaboration-workspace-ui-foundation-v1` | Dirty `app/workspaces/layout.tsx` (likely line-ending noise); tip `b002402` synced |
| `umtuba-mobile` | Dirty/untracked docs + `build.json*`; `master` @ `fe14a34` synced otherwise |
| `umtuba-web` | Clean tree; branch `office/learning-ai-tutor-thread-lesson-binding-v1` @ `b85081b` **no upstream** (laptop-only tracking risk) |

## Status

**SAFE_TO_REBOOT** for Collaboration feature tip (`6b60205` pushed). Migration `20260898` remains **NOT APPLIED**.
