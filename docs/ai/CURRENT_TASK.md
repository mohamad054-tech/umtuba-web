# Current Task

## CURRENT COLLABORATION SOURCE OF TRUTH (2026-08-07)

- **Branch:** `office/collaboration-workspace-settings-lifecycle-ui-v1`
- **Tip base:** `2f6516f1b29f72d4ff88c12a6963c2fc15b5f6f2` (+ this integration docs commit)
- **Worktree:** `C:\Users\Admin\Desktop\umtuba\umtuba-web-collaboration-workspace-settings-lifecycle-ui-v1`
- **Sync:** expect `0 0` after push

## CLOSED ON SoT

| Milestone | Status |
| --- | --- |
| Settings & Lifecycle UI V1 | CLOSED |
| Settings Lifecycle remote apply (`20260917`) | APPLIED + VERIFIED / CLOSED |
| Member Role Management UI V1 | **INTEGRATED / CLOSED** on SoT (FF from `office/collaboration-workspace-member-role-management-ui-v1` @ `2f6516f`) |

## Notes

- No migration required for Member Role Management (uses spine RPC `update_collaboration_workspace_member_role`)
- Platform flag remains default **`false`**
- Stale Collaboration `20260898` on smoke/keepalive = DO NOT APPLY
- Remote `20260898` = Commerce only
- smoke/keepalive = NOT SoT

## Deferred

- Resource-link product bindings
- Invite system expansion
- Credentialed E2E role-update smoke (future validation gap)

## NEXT

Defer Resource Link / invite expansion until explicit GO. Do not start from keepalive/smoke.
