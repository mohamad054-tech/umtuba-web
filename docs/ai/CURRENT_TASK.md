# Current Task

## ACTIVE FEATURE BRANCH (not SoT)

- **Milestone:** `COLLABORATION_WORKSPACE_RESOURCE_LINK_LEARNING_BINDING_V1`
- **Branch:** `office/collaboration-workspace-resource-link-learning-binding-v1`
- **Base SoT HEAD:** `fd1ff049bde3e8d22f0227e6354671c063cf69f4`
- **Worktree:** `C:\Users\Admin\Desktop\umtuba\umtuba-web-collaboration-workspace-settings-lifecycle-ui-v1`
- **Do not merge to SoT in this task.**

## Goal

First product binding: Collaboration Workspace → Learning Space reference only.
Uses existing resource-link mutation runtime. No Learning lifecycle mutation.
No migration. Platform flag stays `false`.

## Selected identity

- Learning: `public.learning_spaces.id` (UUID)
- Collaboration `resource_type`: `learning_space` (already reserved)
- Auth dependency: `can_manage_learning_space` (existing)

## Allowed scope

- `lib/collaboration/learningWorkspaceResourceBinding.ts` (+ tests)
- docs task/report only as needed
- minimal optional UI only if already-suitable surface exists (prefer runtime-only)

## Forbidden scope

- Learning lifecycle / enrollment / publish / lesson mutations
- Commerce / advertiser binding
- Platform flag enablement
- Remote migration apply
- SoT merge
- smoke/keepalive / UM Core P17
