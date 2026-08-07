# CURSOR_REPORT — Settings Lifecycle remote apply verify/closeout V1

## Summary

**CLOSED** — Verified (read-only) that canonical migration `20260917` is already
registered remotely and RPC `update_collaboration_workspace_settings` matches
expected signature/security/grants. Docs updated to APPLIED + VERIFIED.
**No SQL apply. No migration history mutation.**

## CURRENT COLLABORATION SOURCE OF TRUTH

- Branch: `office/collaboration-workspace-settings-lifecycle-ui-v1`
- Remote: `origin/office/collaboration-workspace-settings-lifecycle-ui-v1`
- Base HEAD before closeout: `8b7ee1ee0bb79680bfb947ab240479a1338e5bdc`
- Worktree: `C:\Users\Admin\Desktop\umtuba\umtuba-web-collaboration-workspace-settings-lifecycle-ui-v1`

## Verification (read-only)

- Remote `schema_migrations`: `20260917` / `collaboration_workspace_settings_lifecycle_ui_v1`
- RPC: `update_collaboration_workspace_settings(... ) → jsonb`
- Security: DEFINER + `search_path=public`
- Grants: authenticated + service_role EXECUTE; anon/public denied
- Remote `20260898` = Commerce `store_seller_live_payout_provider_v1`
- SoT has no Collaboration `20260898` file
- Platform flag default `false`

## Migrations status (docs truth)

- `20260917` = **APPLIED + VERIFIED** (no further apply)
- Collaboration stale `20260898` on ops forks = **DO NOT APPLY**
- Do not re-apply / repair `20260896`/`20260897` due to remote history name drift

## Non-SoT

- Smoke / keepalive = NOT SoT
- Superseded alternate `collaboration-settings-lifecycle-ui-v1` @ `f5ab724`

## FLAG

`COLLABORATION_PLATFORM_ENABLED` default **false**

## NEXT

Collaboration Workspace Member Role Management UI V1 (product).  
Do not start from keepalive/smoke. Do not start UM Core P17 here.
