# Current Task

## COLLABORATION SoT — Learning Link/Unlink E2E Provisioning V1

- **Milestone:** `COLLABORATION_WORKSPACE_LEARNING_RESOURCE_LINK_UNLINK_E2E_PROVISIONING_V1`
- **SoT branch:** `office/collaboration-workspace-settings-lifecycle-ui-v1`
- **Starting HEAD:** `50fc34e8e0270f7e2ee46e0b710f670d51a044ae`
- **Worktree:** `C:\Users\Admin\Desktop\umtuba\umtuba-web-collaboration-workspace-settings-lifecycle-ui-v1`

## Status

**HARNESS SHIPPED · BLOCKED_FOR_OPERATOR_PROVISIONING**

SoT now owns an opt-in Learning link/unlink E2E foundation (templates,
Playwright specs, structural tests, operator checklist).

Credentialed smoke was **not** executed: dedicated Auth identities and
SoT-local credentials remain operator-provisioned. Automatic Auth creation
against the only available remote Supabase host is blocked by the production
safety gate.

## Do NOT start automatically

- Commerce / advertiser bindings
- Creating Auth users on production
- Fabricating passwords / JWTs
