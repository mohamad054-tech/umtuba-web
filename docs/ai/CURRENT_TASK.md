# Current Task

## COLLABORATION SoT — Learning Resource Link/Unlink UI V1

- **Milestone:** `COLLABORATION_WORKSPACE_LEARNING_RESOURCE_LINK_UNLINK_UI_V1`
- **SoT branch:** `office/collaboration-workspace-settings-lifecycle-ui-v1`
- **Base HEAD:** `f687641e0147a29feb50f0a912cdfb0280da9b30`
- **Worktree:** `C:\Users\Admin\Desktop\umtuba\umtuba-web-collaboration-workspace-settings-lifecycle-ui-v1`

## Status

- Implementing / closing Learning link/unlink UI on workspace settings
- Reuses Learning Resource Binding V1 contracts (no backend redesign)
- No migration; platform flag remains default `false`
- Commerce / advertiser bindings remain deferred

## Allowed scope

- Collaboration Learning link/unlink UI surface + wiring
- Binding list helpers needed by the UI
- Focused tests + AI handoff docs

## Forbidden scope

- New Commerce / advertiser bindings
- Speculative schema / migrations (unless contract-required — STOP first)
- Learning lifecycle mutation / Learning internals beyond existing boundary
- Platform flag enablement
- Unrelated Collaboration features

## CLOSED ON SoT (do not redo)

- Workspace Spine / Membership / Settings Lifecycle UI
- Member Role Management UI V1
- Resource Link Foundation V1
- Resource Link Mutation Runtime V1 + `20260919`
- Learning Resource Binding V1
